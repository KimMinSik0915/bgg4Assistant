/**
 * @Author : 김민식
 * multiplayerService : 2인 협동 세션의 게임 로직 레이어
 *  - firebaseClient.js(저수준 DB IO) + geminiService.js(GM 호출)를 엮어서
 *    "누가 행동을 보내면 그 사람 API 키로 GM을 호출하고 결과를 방에 기록한다"를 구현한다.
 *  - 솔로 모드(CharacterSheetManager.buildGmSystemInstruction/sendGmMessage)와 정확히 같은
 *    규칙(GM_STATIC_RULES)과 구조화 응답 스키마(GM_RESPONSE_SCHEMA)를 사용해서, "혼자 할 때"와
 *    "같이 할 때" GM의 행동 방식이 어긋나지 않게 한다.
 *  - 동시에 두 명이 보내도 turnLock 트랜잭션 덕분에 한 번에 한 명의 요청만 실제로 GM을 호출한다.
 */

import { callGemini, splitResponseParts, userTextPart } from './geminiService';
import { GM_STATIC_RULES, GM_RESPONSE_SCHEMA } from '../resource/dataSet/gmConfig';
import { parseGridLabel, gridIndexToPixel } from '../util/gridCoords';
import { acquireTurnLock, releaseTurnLock, updateRoom, pushChatLog } from './firebaseClient';
import { buildScenarioContext } from "../util/scenarioContext";

const DEFAULT_GRID_SIZE = 56;

// 솔로 모드의 getCompressedMapText/getCompressedPinsText와 동일한 포맷 (mapState를 인자로 받는 순수 함수 버전)
const getCompressedMapText = (mapState) => {
    const tokens = (mapState?.tokens || []).filter(t => !t.isPin);
    if (tokens.length === 0) return '배치된 토큰 없음';
    return `전투지도 좌표: [ ${tokens.map(t => `${t.name || '토큰'}(${t.gridPos || `${t.x},${t.y}`}${t.hp ? `, HP:${t.hp}` : ''})`).join(', ')} ]`;
};

const getCompressedPinsText = (mapState) => {
    const pins = (mapState?.tokens || []).filter(t => t.isPin);
    if (pins.length === 0) return null;
    return pins.map(p => `${p.name || '핀'}(${p.gridPos || `${p.x},${p.y}`})`).join(', ');
};

// 솔로 모드의 applyTokenMoves와 동일한 로직 (this.setState 대신 순수 함수로 다음 mapState를 반환)
const applyTokenMoves = (mapState, moves) => {
    if (!mapState || !Array.isArray(mapState.tokens) || mapState.tokens.length === 0) return mapState;
    if (!Array.isArray(moves) || moves.length === 0) return mapState;

    const gridSize = Math.max(10, mapState.gridSize || DEFAULT_GRID_SIZE);
    const nextTokens = mapState.tokens.map(t => ({ ...t }));
    let changed = false;

    moves.forEach(move => {
        const targetName = String(move?.token || move?.name || '').trim();
        const targetPos = String(move?.to || move?.gridPos || '').trim();
        if (!targetName || !targetPos) return;

        const parsedPos = parseGridLabel(targetPos);
        if (!parsedPos) return;

        const lowerName = targetName.toLowerCase();
        const movable = nextTokens.filter(t => !t.isPin);
        let token = movable.find(t => (t.name || '').toLowerCase() === lowerName);
        if (!token) token = movable.find(t => (t.name || '').toLowerCase().includes(lowerName));
        if (!token) return;

        const size = token.size ?? gridSize;
        token.x = parsedPos.col * gridSize + Math.max(0, (gridSize - size) / 2);
        token.y = (parsedPos.row - 1) * gridSize + Math.max(0, (gridSize - size) / 2);
        token.gridPos = targetPos.toUpperCase();
        changed = true;
    });

    if (!changed) return mapState;
    return { ...mapState, tokens : nextTokens, aiTokenUpdateAt : Date.now() };
};

// 솔로 모드의 applyTokenSpawns와 동일한 로직 (순수 함수 버전)
const applyTokenSpawns = (mapState, spawns) => {
    if (!mapState) return mapState;
    if (!Array.isArray(spawns) || spawns.length === 0) return mapState;

    const gridSize = Math.max(10, mapState.gridSize || DEFAULT_GRID_SIZE);
    const newTokens = [];

    spawns.forEach(spawn => {
        const name = String(spawn?.name || '').trim();
        const atLabel = String(spawn?.at || spawn?.gridPos || spawn?.to || '').trim();
        if (!name || !atLabel) return;

        const parsedPos = parseGridLabel(atLabel);
        if (!parsedPos) return;

        const rawMaxHp = Number(spawn?.maxHp);
        const maxHp = Number.isFinite(rawMaxHp) && rawMaxHp > 0 ? rawMaxHp : 30;
        const rawHp = Number(spawn?.hp);
        const hp = Number.isFinite(rawHp) ? Math.max(0, Math.min(maxHp, rawHp)) : maxHp;

        const { x, y } = gridIndexToPixel(parsedPos.col, parsedPos.row, gridSize);

        newTokens.push({
            id : Date.now() + Math.random()
          , name, x, y
          , gridPos : atLabel.toUpperCase()
          , size : gridSize
          , hp, maxHp
        });
    });

    if (newTokens.length === 0) return mapState;
    return { ...mapState, tokens : [...(mapState.tokens || []), ...newTokens], aiTokenUpdateAt : Date.now() };
};

const buildMultiplayerSystemInstruction = ({ scenarioData, mapUrl1, mapUrl2, sessionState, mapState, players }) => {
    const playerList = Object.values(players || {});
    const playersSummary = playerList.length
        ? playerList.map(p => `- ${p.name}${p.characterSummary ? ` : ${p.characterSummary}` : ''}`).join('\n')
        : '(파티원 정보 없음)';

    const parts = [GM_STATIC_RULES];

    if ((mapUrl1 || '').trim() || (mapUrl2 || '').trim()) {
        parts.push('', '## 7. 공간 구조 지도 참조 URL');
        if ((mapUrl1 || '').trim()) parts.push(`- 지도 1: ${mapUrl1.trim()}`);
        if ((mapUrl2 || '').trim()) parts.push(`- 지도 2: ${mapUrl2.trim()}`);
    }

    parts.push('', '## 현재 파티 구성 (2인 협동 플레이)', playersSummary);
    parts.push('- 이 세션은 2명이 함께 플레이하는 협동 모드다. 메시지 앞의 "[이름]" 표기로 누가 행동했는지 구분하되, 임의로 다른 플레이어의 행동/대사를 대신 지어내지 마라.');

    if (sessionState) {
        parts.push('', '## 현재 세션 진행 누적 요약 (sessionState)', JSON.stringify(sessionState));
    }

    if (mapState?.tokens?.length > 0) {
        const pinsText = getCompressedPinsText(mapState);
        parts.push('', `## ${getCompressedMapText(mapState)}`);
        parts.push('- 위 좌표는 "열알파벳+행숫자"(예: C4 = C열 4행) 격자 표기이며, 지도 이미지가 아니라 이 텍스트가 곧 현재 지도 상태다.');
        parts.push('- 전투/이동으로 위 토큰 중 하나가 실제로 자리를 옮기면, 응답 JSON의 token_moves에 { "token": "위 목록의 이름과 일치", "to": "새 격자 좌표" }를 담아 알려라.');
        if (pinsText) {
            parts.push('', `## 지도 표식(핀) 좌표: [ ${pinsText} ]`);
        }
    }

    if (scenarioData) {
        const scenarioContext = buildScenarioContext(scenarioData, sessionState?.loc);
        parts.push('', '## 세션 진행 시나리오 데이터 (JSON) - 현재 위치한 방(current_room) + 몬스터 스탯(bestiary) 전체');
        parts.push('- current_room은 지금 있는 장소의 상세 정보다. bestiary의 AC/HP/피해 주사위는 실제 수치이니 임의로 지어내지 않는다.');
        parts.push(JSON.stringify(scenarioContext ?? scenarioData));
    }

    return parts.join('\n');
};

/**
 * 플레이어 1명의 행동을 처리한다.
 * - 잠금을 못 얻으면 즉시 { queued: true } 반환 (호출부가 대기 UI를 띄우면 됨)
 * - 잠금을 얻으면 "이 함수를 호출한 사람"의 apiKey/model로 GM을 호출하고, 결과를 방 상태에 반영한다.
 *
 * @param {object} params
 * @param {string} params.roomId
 * @param {string} params.playerId
 * @param {string} params.playerName
 * @param {string} params.text          플레이어가 입력한 행동/대사
 * @param {string} params.apiKey        이 요청을 보내는 사람 본인의 Gemini API 키
 * @param {string} params.model
 * @param {object} params.roomSnapshot  현재 구독 중인 방 데이터 스냅샷
 * @param {Function} [params.onRetryNotice]  429 재시도 알림 콜백
 */
export const sendMultiplayerAction = async ({
    roomId, playerId, playerName, text, apiKey, model, roomSnapshot, onRetryNotice
}) => {
    await pushChatLog(roomId, { senderId : playerId, senderName : playerName, text, type : 'player' });

    const gotLock = await acquireTurnLock(roomId, playerId);
    if (!gotLock) {
        return { queued : true };
    }

    try {
        const recentHistory = (roomSnapshot.gmHistory || []).slice(-6);
        const requestContents = [
            ...recentHistory.map(turn => ({
                role : turn.role === 'assistant' ? 'model' : 'user', parts : [{ text : turn.text }]
            }))
          , userTextPart(`[${playerName}] ${text}`)
        ];
        const systemInstruction = buildMultiplayerSystemInstruction(roomSnapshot);

        const data = await callGemini(
            { apiKey, model, systemInstruction, contents : requestContents, responseSchema : GM_RESPONSE_SCHEMA }
          , onRetryNotice
        );
        const { text : rawText } = splitResponseParts(data);

        let narrativeText = rawText;
        let nextSessionState = roomSnapshot.sessionState || {};
        let nextMapState = roomSnapshot.mapState || { tokens : [] };
        let locationLookupName = null;

        try {
            const cleanJsonStr = rawText.replace(/```json|```/g, '').trim();
            const parsed = JSON.parse(cleanJsonStr);

            if (parsed.narrative) narrativeText = parsed.narrative;
            if (parsed.session_state) nextSessionState = { ...nextSessionState, ...parsed.session_state };
            if (Array.isArray(parsed.token_moves) && parsed.token_moves.length > 0) {
                nextMapState = applyTokenMoves(nextMapState, parsed.token_moves);
            }
            if (Array.isArray(parsed.token_spawns) && parsed.token_spawns.length > 0) {
                nextMapState = applyTokenSpawns(nextMapState, parsed.token_spawns);
            }
            if (typeof parsed.location_lookup === 'string' && parsed.location_lookup.trim()) {
                locationLookupName = parsed.location_lookup.trim();
            }
        } catch (e) {
            // JSON이 아니면 원문 그대로 서사로 사용 (대화가 끊기지 않도록)
        }

        const newHistory = [
            ...recentHistory
          , { role : 'user', text : `[${playerName}] ${text}` }
          , { role : 'assistant', text : rawText || '' }
        ].slice(-6);

        await updateRoom(roomId, {
            gmHistory : newHistory
          , sessionState : nextSessionState
          , mapState : nextMapState
        });
        await pushChatLog(roomId, { senderId : 'gm', senderName : 'AI GM', text : narrativeText, type : 'gm' });

        // 🔭 location_lookup(지도 이미지를 직접 봐야 하는 드문 경우)은 협동 세션에서는 자동 처리하지
        // 않는다 - 방에는 지도 "이미지"가 아니라 좌표 텍스트만 있고, 비전 조회는 각자 로컬 mapState의
        // base64 이미지가 필요해서 공유 상태만으로는 재현이 어렵다. 대신 안내만 남긴다.
        if (locationLookupName) {
            await pushChatLog(roomId, {
                senderId : 'system', senderName : 'System'
              , text : `📍 "${locationLookupName}"의 좌표를 찾지 못했어요. 지도에서 [📍 핀 찍기]로 직접 위치를 표시해주면 이후로는 정확히 인식해요.`
              , type : 'system'
            });
        }

        return { queued : false, narrative : narrativeText };
    } finally {
        await releaseTurnLock(roomId);
    }
};

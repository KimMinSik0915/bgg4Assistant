/**
 * @Author : 김민식
 * MultiplayerRoomPanel : Firebase Realtime Database 기반 2인 협동 GM 세션 패널
 *  - 방 만들기 / 방 참가하기
 *  - 참가 후에는 두 사람의 화면에 같은 채팅 로그가 실시간으로 뜬다.
 *  - 메시지를 보낸 사람의 API 키로 GM을 호출하므로, 각자 자기 키를 설정에 넣어두면 된다.
 */
import { useState, useEffect, useRef, useCallback } from 'react';
import {
    generateRoomCode, roomExists, createRoom, subscribeRoom, setRoomPlayer, removeRoomPlayer
  , updateRoom
} from '../service/firebaseClient';
import { sendMultiplayerAction } from '../service/multiplayerService';
// 🖼️ 전투지도/토큰 이미지는 Firebase Storage(요금제 전환이 필요할 수 있음) 대신, 솔로 모드와 똑같이
// 로컬에서 압축한 base64를 그대로 Realtime Database(무료 Spark 플랜)에 저장한다 - 별도 설정/카드 등록 없이
// 바로 동작하게 하기 위함. BattleMapPanel에 uploadImage prop을 넘기지 않으면 자동으로 이 방식이 된다.

const PLAYER_ID_STORAGE = 'cs_mp_player_id';

const getOrCreatePlayerId = () => {
    let id = localStorage.getItem(PLAYER_ID_STORAGE);
    if (!id) {
        id = `p_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
        localStorage.setItem(PLAYER_ID_STORAGE, id);
    }
    return id;
};

const MultiplayerRoomPanel = ({
    apiKey, model, scenarioData, mapUrl1, mapUrl2, charData
    // 🗺️ onRoomStateChange: 방 접속 상태가 바뀔 때마다(입장/퇴장/방 데이터 갱신) 상위(CharacterSheetManager)에게
    // 알려서, 메인 화면의 전투지도(BattleMapPanel)가 "혼자 하는 로컬 지도" 대신 "이 방의 공유 지도"를
    // 그리도록 넘겨준다. 방 밖에 있을 땐 null로 알린다.
  , onRoomStateChange
}) => {
    const [playerId] = useState(getOrCreatePlayerId);
    const [playerName, setPlayerName] = useState('');
    const [joinCodeInput, setJoinCodeInput] = useState('');
    const [roomId, setRoomId] = useState(null);
    const [roomData, setRoomData] = useState(null);
    const [inputText, setInputText] = useState('');
    const [waiting, setWaiting] = useState(false);
    const [statusMsg, setStatusMsg] = useState('');
    const chatEndRef = useRef(null);
    const unsubscribeRef = useRef(null);

    // 방의 다른 플레이어가 시스템 프롬프트에서 "누구랑 같이 하는지" 알 수 있도록, 내 캐릭터 요약을
    // 한 줄로 압축해둔다 (예: "감쟈 (팔라딘 3레벨, HP 13/13)"). GM_STATIC_RULES가 기대하는 형식과
    // 맞추기 위해 CharacterSheetManager.buildGmSystemInstruction의 summary와 같은 필드를 쓴다.
    const characterSummary = charData
        ? `${charData.class || '?'} ${charData.level || '?'}레벨, HP ${charData.hp?.current ?? '?'}/${charData.hp?.max ?? '?'}`
        : '';

    useEffect(() => () => { if (unsubscribeRef.current) unsubscribeRef.current(); }, []);

    useEffect(() => {
        chatEndRef.current?.scrollIntoView({ behavior : 'smooth' });
    }, [roomData?.chatLog]);

    const joinExistingRoom = useCallback((id) => {
        if (unsubscribeRef.current) unsubscribeRef.current();
        unsubscribeRef.current = subscribeRoom(id, setRoomData);
        setRoomId(id);
    }, []);

    const handleCreateRoom = async () => {
        if (!playerName.trim()) { setStatusMsg('⚠️ 먼저 이름을 입력해주세요'); return; }
        setStatusMsg('방 생성 중...');
        try {
            let code = generateRoomCode();
            while (await roomExists(code)) code = generateRoomCode(); // 코드 중복 방지 (희박하지만 재생성)

            await createRoom(code, {
                hostId : playerId // 🗺️ 이 방을 만든 사람 = 방장. 전투지도 배경 업로드 권한을 여기에 묶는다.
              , sessionState : {}
              , mapState : { tokens : [] }
              , gmHistory : []
              , chatLog : {}
              , scenarioData : scenarioData || null
              , mapUrl1 : mapUrl1 || ''
              , mapUrl2 : mapUrl2 || ''
              , players : { [playerId] : { name : playerName.trim(), connected : true, characterSummary } }
            });

            joinExistingRoom(code);
            setStatusMsg('');
        } catch (e) {
            setStatusMsg(`⚠️ 방 생성 실패: ${e.message}`);
        }
    };

    const handleJoinRoom = async () => {
        const code = joinCodeInput.trim().toUpperCase();
        if (!playerName.trim()) { setStatusMsg('⚠️ 먼저 이름을 입력해주세요'); return; }
        if (!code) { setStatusMsg('⚠️ 방 코드를 입력해주세요'); return; }

        setStatusMsg('방 확인 중...');
        try {
            const exists = await roomExists(code);
            if (!exists) { setStatusMsg('⚠️ 존재하지 않는 방 코드예요'); return; }

            await setRoomPlayer(code, playerId, { name : playerName.trim(), connected : true, characterSummary });
            joinExistingRoom(code);
            setStatusMsg('');
        } catch (e) {
            setStatusMsg(`⚠️ 참가 실패: ${e.message}`);
        }
    };

    const handleLeaveRoom = async () => {
        if (roomId) await removeRoomPlayer(roomId, playerId);
        if (unsubscribeRef.current) unsubscribeRef.current();
        setRoomId(null);
        setRoomData(null);
    };

    // 🗺️ 방장(hostId === 나) 여부 - 전투지도 배경 업로드 권한을 여기에 묶는다.
    const isHost = !!roomId && roomData?.hostId === playerId;

    // 지도 상태를 이 방의 mapState 노드에 그대로 기록 - Realtime Database의 update()는 지정한
    // 키 전체를 덮어쓰므로(부분 병합이 아님), BattleMapPanel이 매번 완전한 mapState를 통째로 넘겨준다.
    const updateMapState = useCallback((nextMapState) => {
        if (!roomId) return;
        updateRoom(roomId, { mapState : nextMapState });
    }, [roomId]);

    // 📡 방 접속 상태가 바뀔 때마다(입장/퇴장/다른 사람이 지도를 바꿔서 roomData가 갱신될 때마다)
    // 상위에 알려서, 메인 화면의 전투지도가 이 방의 공유 mapState를 그리도록 한다.
    // uploadImage를 넘기지 않으므로 BattleMapPanel은 솔로 모드와 동일하게 로컬 base64 압축만 쓴다
    // (Firebase Storage/Blaze 요금제 없이도 바로 동작하게 하기 위함 - 대신 이미지가 Realtime Database에
    // base64로 그대로 저장되니, 아주 큰 지도를 자주 바꾸는 용도로는 안 맞을 수 있다).
    useEffect(() => {
        if (typeof onRoomStateChange !== 'function') return;
        if (!roomId) { onRoomStateChange(null); return; }
        onRoomStateChange({
            roomId
          , playerId
          , isHost
          , mapState : roomData?.mapState || { tokens : [] }
          , updateMapState
        });
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [roomId, playerId, isHost, roomData?.mapState, updateMapState]);

    // 🚪 이 패널이 언마운트되면(예: "🎲 혼자 플레이"로 전환) 상위에 더는 방에 없다고 알린다
    useEffect(() => () => {
        if (typeof onRoomStateChange === 'function') onRoomStateChange(null);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const handleSend = async () => {
        const text = inputText.trim();
        if (!text || !roomId || waiting) return;
        if (!apiKey) { setStatusMsg('⚠️ 설정에서 본인 Gemini API 키를 먼저 입력해주세요'); return; }

        setInputText('');
        setWaiting(true);
        setStatusMsg('');

        try {
            const result = await sendMultiplayerAction({
                roomId
              , playerId
              , playerName : playerName.trim()
              , text
              , apiKey
              , model
              , roomSnapshot : roomData
              , onRetryNotice : (sec) => setStatusMsg(`⏳ API 제한으로 ${sec}초 후 재시도합니다...`)
            });

            if (result.queued) {
                setStatusMsg('⌛ 상대방이 GM과 대화 중이에요. 잠시 후 다시 시도해주세요.');
            }
        } catch (e) {
            setStatusMsg(`⚠️ 오류: ${e.message}`);
        } finally {
            setWaiting(false);
        }
    };

    const handleKeyDown = (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    };

    // ── 방 입장 전 화면: 이름 입력 + 방 만들기/참가하기 ──
    if (!roomId) {
        return (
            <div className="p-3.5 rounded-xl border bg-[var(--card-bg)] flex flex-col gap-3" style={{ borderColor : 'var(--border-color)' }}>
                <div className="text-base font-bold" style={{ color : 'var(--accent-color)' }}>🤝 2인 협동 세션</div>
                <p className="text-xs" style={{ color : 'var(--text-muted)' }}>
                    같은 시나리오를 다른 사람과 실시간으로 함께 플레이해요. 각자 설정에 자기 Gemini API 키를 넣어두면, 본인이 보낸 메시지는 본인 키로 처리돼요.
                    방을 만든 사람(방장)이 [🗺️ 전투 지도]에서 지도를 올리면 같은 방의 모든 참가자 화면에 실시간으로 함께 보여요.
                </p>

                <label className="text-xs font-bold" style={{ color : 'var(--text-muted)' }}>
                    내 이름 (파티에 표시될 이름)
                    <input
                        type="text"
                        value={playerName}
                        onChange={(e) => setPlayerName(e.target.value)}
                        placeholder="예: 감쟈"
                        className="w-full mt-1 rounded-md p-2 text-xs border bg-[var(--input-bg)] text-[var(--input-text)]"
                        style={{ borderColor : 'var(--border-color)' }}
                    />
                </label>

                <div className="flex gap-2">
                    <button
                        onClick={handleCreateRoom}
                        className="flex-1 text-xs font-bold px-3 py-2 rounded-md hover:opacity-80 transition-opacity"
                        style={{ backgroundColor : 'var(--accent-color)', color : '#fff' }}
                    >
                        ➕ 새 방 만들기
                    </button>
                </div>

                <div className="flex gap-2 items-center">
                    <input
                        type="text"
                        value={joinCodeInput}
                        onChange={(e) => setJoinCodeInput(e.target.value)}
                        placeholder="방 코드 입력 (예: A3F9K2)"
                        className="flex-1 rounded-md p-2 text-xs border bg-[var(--input-bg)] text-[var(--input-text)] uppercase"
                        style={{ borderColor : 'var(--border-color)' }}
                    />
                    <button
                        onClick={handleJoinRoom}
                        className="text-xs font-bold px-3 py-2 rounded-md hover:opacity-80 transition-opacity border"
                        style={{ borderColor : 'var(--border-color)', color : 'var(--text-main)' }}
                    >
                        참가하기
                    </button>
                </div>

                {statusMsg && <div className="text-xs" style={{ color : 'var(--accent-color)' }}>{statusMsg}</div>}
            </div>
        );
    }

    // ── 방 입장 후 화면: 실시간 채팅 ──
    const chatEntries = roomData?.chatLog
        ? Object.entries(roomData.chatLog).sort(([, a], [, b]) => (a.ts || 0) - (b.ts || 0))
        : [];
    const players = Object.values(roomData?.players || {});

    return (
        <div className="p-3.5 rounded-xl border bg-[var(--card-bg)] h-full flex flex-col min-h-0 overflow-hidden" style={{ borderColor : 'var(--border-color)' }}>
            <div className="text-base font-bold pb-1.5 mb-2 flex justify-between items-center border-b-2 shrink-0" style={{ color : 'var(--accent-color)', borderColor : 'var(--border-color)' }}>
                <span>🤝 협동 세션 - 방 코드: {roomId}</span>
                <button
                    onClick={handleLeaveRoom}
                    className="text-xs font-normal px-2 py-1 rounded hover:opacity-80 transition-opacity"
                    style={{ color : 'var(--text-muted)', border : '1px solid var(--border-color)' }}
                >
                    나가기
                </button>
            </div>

            <div className="text-xs mb-2 shrink-0" style={{ color : 'var(--text-muted)' }}>
                파티: {players.map(p => p.name).join(', ') || '(아직 없음)'} · 코드를 상대방에게 공유하세요
                {isHost && <span className="ml-1 font-bold" style={{ color : 'var(--accent-color)' }}>· 👑 방장(전투지도 업로드 가능)</span>}
            </div>

            <div className="cs-scroll flex-1 min-h-0 overflow-y-auto flex flex-col gap-2 mb-3 pr-1">
                {chatEntries.map(([id, entry]) => (
                    <div
                        key={id}
                        className="text-sm p-2 rounded-lg"
                        style={{
                            backgroundColor : entry.type === 'gm' ? 'rgba(0,0,0,0.25)' : 'rgba(255,255,255,0.05)'
                          , color : 'var(--text-main)'
                          , alignSelf : entry.senderId === playerId ? 'flex-end' : 'flex-start'
                          , maxWidth : '85%'
                        }}
                    >
                        <div className="text-[10px] font-bold mb-0.5" style={{ color : 'var(--accent-color)' }}>
                            {entry.type === 'gm' ? '🎲 AI GM' : entry.senderName}
                        </div>
                        <div className="whitespace-pre-wrap">{entry.text}</div>
                    </div>
                ))}
                <div ref={chatEndRef} />
            </div>

            {statusMsg && <div className="text-xs mb-2 shrink-0" style={{ color : 'var(--accent-color)' }}>{statusMsg}</div>}

            <div className="flex gap-2 shrink-0">
                <textarea
                    value={inputText}
                    onChange={(e) => setInputText(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder={waiting ? 'GM 응답을 기다리는 중...' : '행동이나 대사를 입력하세요'}
                    disabled={waiting}
                    rows={2}
                    className="flex-1 rounded-md p-2 text-sm border bg-[var(--input-bg)] text-[var(--input-text)] resize-none"
                    style={{ borderColor : 'var(--border-color)' }}
                />
                <button
                    onClick={handleSend}
                    disabled={waiting || !inputText.trim()}
                    className="text-xs font-bold px-3 py-2 rounded-md hover:opacity-80 transition-opacity disabled:opacity-40"
                    style={{ backgroundColor : 'var(--accent-color)', color : '#fff' }}
                >
                    {waiting ? '전송 중' : '보내기'}
                </button>
            </div>
        </div>
    );
};

export default MultiplayerRoomPanel;

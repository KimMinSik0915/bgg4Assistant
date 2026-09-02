import { Component } from "react";
import { BookOpenIcon, ChevronUpIcon, ChevronDownIcon, UploadCloudIcon, ArrowLeft, DownloadIcon, RotateCcw } from "lucide-react";
import withNavigate from "../../utils/withNavigate";
import { normalizeCharacterData } from "../util/normalizeCharacterData";
import { buildExportJson, downloadJson, sanitizeFileName } from "../util/exportCharacterData";
import { THEME_KEYS, themeToCssVars } from "../resource/dataSet/themes";
import { gmTools } from "../resource/dataSet/gmTools";
import { callGemini, splitResponseParts, userContent } from "../service/geminiService";
import SheetLoader from "../component/SheetLoader";
import CharacterHeaderCard from "../component/CharacterHeaderCard";
import HpCard from "../component/HpCard";
import AbilitiesCard from "../component/AbilitiesCard";
import SpellsAndFeaturesCard from "../component/SpellsAndFeaturesCard";
import SkillsCard from "../component/SkillsCard";
import EquipmentCard from "../component/EquipmentCard";
import BattleMapPanel from "../component/BattleMapPanel";
import GmChatPanel from "../component/GmChatPanel";
import { rollPhysicalDie, DICE_BOX_SELECTOR, announceDiceResult } from "../service/dice3DEngine";
import "../resource/CSS/characterSheet.css";
import TraitsCard from "../component/TraitsCard";
import InventoryCard from "../component/InventoryCard";

const GEMINI_KEY_STORAGE = 'cs_gemini_api_key';
const GEMINI_MODEL_STORAGE = 'cs_gemini_model';
const SESSION_STORAGE_KEY = 'cs_trpg_session_data';
const DEFAULT_GEMINI_MODEL = 'gemini-3.6-flash';

/**
 * @Author : 김민식
 * CharacterSheetManager : D&D 5e 동적 캐릭터 시트 & 무료 계정 최적화 VTT/GM 세션
 */
class CharacterSheetManager extends Component {

    state = {
        activeTab: 'chat'
      , sheetSubTab: 'abilities'
      , isUploadActive : false
      , originalRawJson : null
      , rawInput : ''
      , charData : null
      , themeKey : THEME_KEYS.CLASSIC
      , inspiration : false
      , usedFeatures : {}
      , usedSpellSlots : {}
      , selectedSides : 20
      , diceValue : 20
      , isRolling : false
      , resultText : '파일을 업로드하여 시작하세요!'
      , hitEffectKey : 0
      , geminiApiKey : ''
      , geminiModel : DEFAULT_GEMINI_MODEL
      , showGmSettings : false
      , gmMessages : []
      , gmInput : ''
      , isGmLoading : false
      , gmAttachments : []
      , scenarioUrl: ''
      , mapUrl1: ''
      , mapUrl2: ''
      , scenarioData: null
      , sessionState: null // 백그라운드 장기 기억 스냅샷 (clues, quests 포함)
      , mapState: null     // 전투지도 저장소
      , isFetchLoading: false
      , fetchError: null
    }

    constructor(props) {
        super(props);
        this.gmHistory = [];
    }

    rollTimer = null;

    componentDidMount() {
        const savedKey = window.localStorage.getItem(GEMINI_KEY_STORAGE);
        let savedModel = window.localStorage.getItem(GEMINI_MODEL_STORAGE);
        if (savedModel === 'gemini-3.6-flash') savedModel = null;

        const savedSession = window.localStorage.getItem(SESSION_STORAGE_KEY);
        if (savedSession) {
            try {
                const parsed = JSON.parse(savedSession);
                this.gmHistory = parsed.gmHistory || [];
                this.setState({
                    geminiApiKey: savedKey || '',
                    geminiModel: savedModel || DEFAULT_GEMINI_MODEL,
                    charData: parsed.charData || null,
                    originalRawJson: parsed.originalRawJson || null,
                    gmMessages: parsed.gmMessages || [],
                    sessionState: parsed.sessionState || null,
                    mapState: parsed.mapState || null,
                    inspiration: !!parsed.inspiration,
                    usedFeatures: parsed.usedFeatures || {},
                    usedSpellSlots: parsed.usedSpellSlots || {},
                    scenarioData: parsed.scenarioData || null,
                    scenarioUrl: parsed.scenarioUrl || '',
                    mapUrl1: parsed.mapUrl1 || '',
                    mapUrl2: parsed.mapUrl2 || ''
                });
                return;
            } catch (e) {
                console.error("세션 복원 중 오류 발생:", e);
            }
        }

        if (savedKey || savedModel) {
            this.setState({
                geminiApiKey : savedKey || ''
              , geminiModel : savedModel || DEFAULT_GEMINI_MODEL
            });
        }
    }

    componentWillUnmount() {
        if (this.rollTimer) clearInterval(this.rollTimer);
    }

    saveSession = () => {
        const {
            charData, originalRawJson, gmMessages, inspiration,
            usedFeatures, usedSpellSlots, scenarioData, scenarioUrl, mapUrl1, mapUrl2,
            sessionState, mapState
        } = this.state;

        if (!charData) return;

        const sessionPayload = {
            charData,
            originalRawJson,
            gmMessages,
            gmHistory: this.gmHistory,
            sessionState,
            mapState,
            inspiration,
            usedFeatures,
            usedSpellSlots,
            scenarioData,
            scenarioUrl,
            mapUrl1,
            mapUrl2
        };

        try {
            window.localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(sessionPayload));
        } catch (e) {
            if (
                e instanceof DOMException &&
                (e.code === 22 || e.code === 1014 || e.name === 'QuotaExceededError' || e.name === 'NS_ERROR_DOM_QUOTA_REACHED')
            ) {
                if (this.state.gmMessages.length > 50) {
                    console.warn("⚠️ localStorage 용량 초과: 이전 대화록을 최근 50개로 자르고 재저장합니다.");
                    const trimmedMessages = this.state.gmMessages.slice(-50);
                    this.setState({ gmMessages: trimmedMessages }, () => {
                        this.saveSession();
                    });
                } else {
                    alert("⚠️ 저장 공간이 부족합니다. [대화 로그 추출] 후 세션을 비워주세요.");
                }
            } else {
                console.error("세션 저장 중 오류 발생:", e);
            }
        }
    };

    getCompressedMapText = () => {
        const { mapState } = this.state;
        if (!mapState || !mapState.tokens || mapState.tokens.length === 0) return '배치된 토큰 없음';

        const tokenSummary = mapState.tokens
            .map((t) => `${t.name || '토큰'}(${t.gridPos || `${t.x},${t.y}`}${t.hp ? `, HP:${t.hp}` : ''})`)
            .join(', ');

        return `전투지도 좌표: [ ${tokenSummary} ]`;
    };

    handler = {
        changeTab : (tab) => {
            this.setState({ activeTab : tab });
        }
      , changeSheetSubTab : (subTab) => {
            this.setState({ sheetSubTab : subTab });
        }
      , toggleUploadActive : () => {
            this.setState(prev => ({ isUploadActive : !prev.isUploadActive }));
        }
      , exportCharacter : () => {
            const { originalRawJson, charData, inspiration, usedFeatures, usedSpellSlots } = this.state;
            if (!charData) return;
            const exportData = buildExportJson(originalRawJson, charData, { inspiration, usedFeatures, usedSpellSlots });
            downloadJson(exportData, `${sanitizeFileName(charData.name)}_시트.json`);
        }
      // 💾 [수정] 전체 세션 백업 내보내기 (시트 + 대화 + 지도 + 스탯 모두 포함)
      , exportSessionState : () => {
            const {
                charData, originalRawJson, gmMessages, inspiration,
                usedFeatures, usedSpellSlots, scenarioData, scenarioUrl, mapUrl1, mapUrl2,
                sessionState, mapState
            } = this.state;

            if (!charData) {
                alert("저장할 세션 데이터(캐릭터 시트)가 없습니다.");
                return;
            }

            const sessionPayload = {
                charData,
                originalRawJson,
                gmMessages,
                gmHistory: this.gmHistory,
                sessionState,
                mapState,
                inspiration,
                usedFeatures,
                usedSpellSlots,
                scenarioData,
                scenarioUrl,
                mapUrl1,
                mapUrl2
            };

            const fileName = charData.name ? `${sanitizeFileName(charData.name)}_세션_백업.json` : 'TRPG_Session_Backup.json';
            downloadJson(sessionPayload, fileName);
        }
      , resetSession : () => {
            if (window.confirm("정말 초기화 하시겠습니까? (캐릭터 시트, 대화 기록, 전투지도가 모두 삭제됩니다)")) {
                window.localStorage.removeItem(SESSION_STORAGE_KEY);
                this.gmHistory = [];
                this.setState({
                    charData : null
                  , originalRawJson : null
                  , rawInput : ''
                  , isUploadActive : false
                  , gmMessages : []
                  , sessionState : null
                  , mapState : null
                  , inspiration : false
                  , usedFeatures : {}
                  , usedSpellSlots : {}
                  , scenarioData : null
                  , scenarioUrl : ''
                  , mapUrl1 : ''
                  , mapUrl2 : ''
                  , resultText : '초기화되었습니다. 파일을 업로드하여 시작하세요!'
                });
                alert("초기화가 완료되었습니다.");
            }
        }
      , changeRawInput : (value) => {
            this.setState({ rawInput : value });
        }
      , changeTheme : (themeKey) => {
            this.setState({ themeKey });
        }
      , renderFromInput : () => {
            try {
                const parsed = JSON.parse(this.state.rawInput);
                this.applyCharData(parsed);
            } catch (e) {
                alert('데이터 파싱 오류: 올바른 JSON/TXT 형식인지 확인해주세요.');
            }
        }
      , uploadFile : (event) => {
            const file = event.target.files[0];
            if (!file) return;

            const reader = new FileReader();
            reader.onload = (e) => {
                const content = e.target.result.trim();
                try {
                    const parsed = JSON.parse(content);
                    this.setState({ rawInput : JSON.stringify(parsed, null, 2) });
                    this.applyCharData(parsed);
                } catch (err) {
                    try {
                        const fixedContent = content.replace(/("playerName"\s*:\s*)([^"\s,{][^,}]*)"/g, '$1"$2"');
                        const parsed = JSON.parse(fixedContent);
                        this.setState({ rawInput : JSON.stringify(parsed, null, 2) });
                        this.applyCharData(parsed);
                    } catch (e2) {
                        alert('.txt 파일 내부에 올바른 JSON 구문 구조가 없습니다.');
                    }
                }
            };
            reader.readAsText(file, 'UTF-8');
            event.target.value = '';
        }
      , toggleInspiration : () => {
            this.setState(prev => ({ inspiration : !prev.inspiration }), this.saveSession);
        }
      , toggleUsedFeature : (index) => {
            this.setState(prev => ({
                usedFeatures : { ...prev.usedFeatures, [index] : !prev.usedFeatures[index] }
            }), this.saveSession);
        }
      , toggleSpellSlot : (index) => {
            this.setState(prev => ({
                usedSpellSlots : { ...prev.usedSpellSlots, [index] : !prev.usedSpellSlots[index] }
            }), this.saveSession);
        }
      , changeHp : (amount) => {
            this.setState(prev => {
                if (!prev.charData?.hp) return null;
                const { current, max } = prev.charData.hp;
                const nextCurrent = Math.max(0, Math.min(max, current + amount));
                return {
                    charData : { ...prev.charData, hp : { ...prev.charData.hp, current : nextCurrent } }
                  , resultText : nextCurrent <= 0 ? '💀 체력이 0이 되었습니다! (의식 불명 상태)' : prev.resultText
                };
            }, this.saveSession);
        }
      , takeDamagePrompt : () => {
            const input = window.prompt('입은 피해량을 입력하세요:', '3');
            if (input !== null && !isNaN(input) && input.trim() !== '') {
                const damage = parseInt(input, 10);
                if (damage > 0) {
                    this.handler.changeHp(-damage);
                    this.setState(prev => ({
                        hitEffectKey : prev.hitEffectKey + 1
                      , resultText : `💥 ${damage}의 피해를 입었습니다!`
                    }));
                }
            }
        }
      , shortRest : () => {
            const { charData } = this.state;
            if (!charData?.hp) return;

            const hitDiceMatch = String(charData.hp.hitDice || '1d6').match(/d(\d+)/i);
            const sides = hitDiceMatch ? parseInt(hitDiceMatch[1], 10) : 6;
            const dieRoll = Math.floor(Math.random() * sides) + 1;
            const conMod = charData.hp.conMod || 0;
            const healAmount = dieRoll + conMod;

            this.handler.changeHp(healAmount);
            this.setState({
                selectedSides : sides
              , diceValue : healAmount
              , resultText : `☕ 짧은 휴식: 1d${sides}(${dieRoll}) + 건강(${conMod}) = ${healAmount} HP 회복! (주문 슬롯·특성은 유지됩니다)`
            });
        }
      , longRest : () => {
            this.setState(prev => {
                if (!prev.charData?.hp) return null;
                return {
                    charData : { ...prev.charData, hp : { ...prev.charData.hp, current : prev.charData.hp.max } }
                  , inspiration : false
                  , usedFeatures : {}
                  , usedSpellSlots : {}
                  , resultText : '⛺ 긴 휴식 완료: HP, 주문 슬롯 및 특성이 모두 회복되었습니다!'
                };
            }, this.saveSession);
        }
      , rollCheck : (label, sides, mod) => {
            this.setState({ selectedSides : sides, diceValue : sides });
            this.executeRoll(label, sides, mod);
        }
      , rollWeaponDamage : (item) => {
            this.handler.rollCheck(`${item.name} 피해`, item.dice, 0);
        }
      , rollSpell : (name, dice, consumesSlot) => {
            if (consumesSlot) {
                const totalSlots = this.state.charData?.spellSlots || 0;
                const used = this.state.usedSpellSlots || {};
                let freeIndex = null;
                for (let i = 0; i < totalSlots; i++) {
                    if (!used[i]) { freeIndex = i; break; }
                }
                if (totalSlots > 0 && freeIndex === null) {
                    alert(`⚠️ ${name}: 사용 가능한 주문 슬롯이 없습니다! (휴식으로 회복하세요)`);
                    return;
                }
                if (freeIndex !== null) {
                    this.setState(prev => ({ usedSpellSlots : { ...prev.usedSpellSlots, [freeIndex] : true } }), this.saveSession);
                }
            }
            this.handler.rollCheck(name, dice || 20, 0);
        }
      , showEquipInfo : (slotName, item) => {
            this.setState({ resultText : `[${slotName}] ${item.name}: ${item.desc}` });
        }
      , changeScenarioUrl : (value) => {
            this.setState({ scenarioUrl : value });
        }
      , changeMapUrl1 : (value) => {
            this.setState({ mapUrl1 : value });
        }
      , changeMapUrl2 : (value) => {
            this.setState({ mapUrl2 : value });
        }
      , handleLoadScenario : async () => {
            let { scenarioUrl } = this.state;
            if (!scenarioUrl.trim()) return;

            let targetUrl = scenarioUrl.trim();
            if (targetUrl.includes('github.com') && targetUrl.includes('/blob/')) {
                targetUrl = targetUrl
                    .replace('github.com', 'raw.githubusercontent.com')
                    .replace('/blob/', '/');
            }

            this.setState({ isFetchLoading : true, fetchError : null, scenarioUrl : targetUrl });

            try {
                const res = await fetch(targetUrl);
                if (!res.ok) throw new Error(`시나리오를 불러올 수 없습니다. (HTTP ${res.status})`);

                const data = await res.json();
                this.setState({ scenarioData : data, isFetchLoading : false }, this.saveSession);
                alert('✅ 시나리오 JSON 데이터를 성공적으로 불러왔습니다!');
            } catch (err) {
                console.error(err);
                this.setState({ isFetchLoading : false, fetchError : err.message });
                alert(`⚠️ 시나리오 로드 실패: ${err.message}\n(올바른 JSON 데이터 URL인지 확인해주세요.)`);
            }
        }
      , changeGeminiApiKey : (value) => {
            this.setState({ geminiApiKey : value });
            window.localStorage.setItem(GEMINI_KEY_STORAGE, value);
        }
      , changeGeminiModel : (value) => {
            this.setState({ geminiModel : value });
            window.localStorage.setItem(GEMINI_MODEL_STORAGE, value);
        }
      , toggleGmSettings : () => {
            this.setState(prev => ({ showGmSettings : !prev.showGmSettings }));
        }
      , changeGmInput : (value) => {
            this.setState({ gmInput : value });
        }
      , attachGmFile : (event) => {
            const files = Array.from(event.target.files || []);
            event.target.value = '';
            if (files.length === 0) return;

            const oversized = files.filter(f => f.size > 15 * 1024 * 1024);
            if (oversized.length > 0) {
                alert(`다음 파일은 15MB를 초과해 첨부할 수 없습니다: ${oversized.map(f => f.name).join(', ')}`);
            }

            const validFiles = files.filter(f => f.size <= 15 * 1024 * 1024);
            const readOne = (file) => new Promise(resolve => {
                const reader = new FileReader();
                reader.onload = (e) => {
                    const base64 = String(e.target.result).split(',')[1] || '';
                    resolve({ name : file.name, mimeType : file.type, base64 });
                };
                reader.readAsDataURL(file);
            });

            Promise.all(validFiles.map(readOne)).then(newAttachments => {
                this.setState(prev => ({ gmAttachments : [...prev.gmAttachments, ...newAttachments] }));
            });
        }
      , removeGmAttachment : (index) => {
            this.setState(prev => ({ gmAttachments : prev.gmAttachments.filter((_, i) => i !== index) }));
        }
      , exportChatLogs : () => {
            const { gmMessages, charData } = this.state;
            if (!gmMessages || gmMessages.length === 0) {
                alert('추출할 대화 내역이 없습니다.');
                return;
            }

            const charName = charData?.name || '캐릭터';
            const today = new Date().toISOString().slice(0, 10);

            let content = `=========================================\n`;
            content += ` TRPG Session Log - ${charName}\n`;
            content += ` Date: ${today}\n`;
            content += `=========================================\n\n`;

            gmMessages.forEach((msg) => {
                let sender = 'SYSTEM';
                if (msg.role === 'user') sender = `PLAYER (${charName})`;
                else if (msg.role === 'gm') sender = 'AI GM';

                content += `[${sender}]\n${msg.text}\n\n`;
            });

            const blob = new Blob(['\uFEFF' + content], { type: 'text/plain;charset=utf-8;' });
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = `TRPG_Log_${charName}_${today}.txt`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);
        }
    }

    // 🔄 [수정] 일반 시트 JSON과 세션 백업 JSON 파일 모두 호환하여 로드
    applyCharData = (parsed) => {
        const isSessionBackup = parsed && parsed.charData && Array.isArray(parsed.gmMessages);
        const targetCharData = isSessionBackup ? parsed.charData : parsed;

        const charData = normalizeCharacterData(targetCharData);
        const uiState = targetCharData?._sheetUiState || {};

        if (isSessionBackup) {
            this.gmHistory = parsed.gmHistory || [];
            this.setState({
                charData,
                originalRawJson: parsed.originalRawJson || targetCharData,
                gmMessages: parsed.gmMessages || [],
                sessionState: parsed.sessionState || null,
                mapState: parsed.mapState || null,
                inspiration: parsed.inspiration ?? !!uiState.inspiration,
                usedFeatures: parsed.usedFeatures || uiState.usedFeatures || {},
                usedSpellSlots: parsed.usedSpellSlots || uiState.usedSpellSlots || {},
                scenarioData: parsed.scenarioData || null,
                scenarioUrl: parsed.scenarioUrl || '',
                mapUrl1: parsed.mapUrl1 || '',
                mapUrl2: parsed.mapUrl2 || '',
                resultText: `${charData.name || '캐릭터'} 세션 복원 완료!`,
                isUploadActive: false
            }, this.saveSession);
        } else {
            this.gmHistory = [];
            this.setState({
                charData,
                originalRawJson: parsed,
                inspiration: !!uiState.inspiration,
                usedFeatures: uiState.usedFeatures || {},
                usedSpellSlots: uiState.usedSpellSlots || {},
                resultText: `${charData.name || '캐릭터'} 시트 렌더링 완료!`,
                gmMessages: [],
                sessionState: null,
                mapState: null,
                isUploadActive: false
            }, this.saveSession);
        }
    }

    executeRoll = async (label, sides, mod) => {
        if (this.rollTimer) clearInterval(this.rollTimer);
        this.setState({ isRolling : true, resultText : '굴리는 중...' });

        const rawRoll = await this.rollDiePhysically(sides);

        const total = rawRoll + mod;
        const modStr = mod > 0 ? ` (+${mod})` : (mod < 0 ? ` (${mod})` : '');

        let resultText;
        if (sides === 20 && rawRoll === 20) {
            resultText = `🎉 ${label}: 20! (대성공!)`;
        } else if (sides === 20 && rawRoll === 1) {
            resultText = `💀 ${label}: 1... (대실패!)`;
        } else {
            resultText = `${label}: ${total} [주사위 ${rawRoll}${modStr}]`;
        }

        this.setState({ diceValue : total, isRolling : false, resultText });
        announceDiceResult({ mode : 'single', sides, value : total, text : resultText });
    }

    rollDiePhysically = (sides) => new Promise((resolve) => {
        rollPhysicalDie(DICE_BOX_SELECTOR, sides).then((value) => {
            if (typeof value === 'number') resolve(value);
            else this.rollWithFallback(sides, resolve);
        }).catch(() => this.rollWithFallback(sides, resolve));
    });

    rollWithFallback = (sides, resolve) => {
        let counter = 0;
        this.rollTimer = setInterval(() => {
            this.setState({ diceValue : Math.floor(Math.random() * sides) + 1 });
            counter++;
            if (counter > 10) {
                clearInterval(this.rollTimer);
                resolve(Math.floor(Math.random() * sides) + 1);
            }
        }, 50);
    }

    runGmTool = (name, args = {}) => {
        switch (name) {
            case 'update_session_state': {
                this.setState({ sessionState: args }, () => {
                    this.saveSession();
                });
                return null;
            }
            case 'apply_damage' : {
                const amount = Math.abs(Number(args.amount) || 0);
                this.handler.changeHp(-amount);
                this.setState(prev => ({ hitEffectKey : prev.hitEffectKey + 1 }));
                return `💥 [시트 업데이트] ${amount} 피해 적용 완료`;
            }
            case 'heal_hp' : {
                const amount = Math.abs(Number(args.amount) || 0);
                this.handler.changeHp(amount);
                return `💚 [시트 업데이트] HP ${amount} 회복 완료`;
            }
            case 'short_rest' : {
                this.handler.shortRest();
                return '☕ [시트 업데이트] 짧은 휴식 처리 완료';
            }
            case 'long_rest' : {
                this.handler.longRest();
                return '⛺ [시트 업데이트] 긴 휴식 처리 완료';
            }
            case 'roll_dice' : {
                const sides = Number(args.sides) || 20;
                const modifier = Number(args.modifier) || 0;
                const raw = Math.floor(Math.random() * sides) + 1;
                const total = raw + modifier;
                const modStr = modifier > 0 ? ` (+${modifier})` : (modifier < 0 ? ` (${modifier})` : '');
                const resultText = `${args.label || '굴림'}: ${total} [주사위 ${raw}${modStr}]`;
                this.setState({ selectedSides : sides, diceValue : total, resultText });
                announceDiceResult({ mode : 'single', sides, value : total, text : resultText });
                return `🎲 [주사위 굴림] ${args.label || '굴림'} → ${total} (주사위 ${raw}${modStr})`;
            }
            default :
                return `⚠️ 알 수 없는 도구 호출: ${name}`;
        }
    }

    buildGmSystemInstruction = () => {
        const c = this.state.charData;
        const { mapUrl1, mapUrl2, scenarioData, sessionState, activeTab } = this.state;
        if (!c) return '';

        const summary = {
            name : c.name, class : c.class, race : c.race, level : c.level
            , hp : c.hp, stats : c.stats, skills : c.skills
        };

        const instructionParts = [
            '너는 아래 업로드/연결된 자료를 기반으로 D&D 세션을 진행하는 GM이다.'
          , ''
          , '## 1. 캐논 규칙 - 절대 변경 불가'
          , '- JSON에 명시된 몬스터 스탯, DC, 데미지, NPC 정보, 보상, 캐릭터 능력치는 절대 바꾸지 않는다.'
          , '- 판정이 필요한 모든 상황은 JSON에 있는 수치를 우선 사용한다.'
          , '- 공간 배치, 거리, 방 구조는 전달된 레이아웃 및 지도를 기준으로 하며 이와 모순되는 구도를 지어내지 않는다.'
          , ''
          , '## 2. 응답 포맷 및 상태 저장 규칙 (1회 호출 최적화)'
          , '모든 응답은 반드시 아래 JSON 형식을 엄격히 지켜서 반환하십시오.'
          , '```json'
          , '{'
          , '  "narrative": "플레이어에게 전달할 상황 묘사, NPC 대사, 판정 결과 (2~3문장 이내)",'
          , '  "session_state": {'
          , '    "loc": "현재 위치 ID",'
          , '    "clues": ["플레이어가 알게 된 핵심 단서 및 NPC 대화 내용 1줄 요약 누적"],'
          , '    "quests": ["현재 진행 중인 퀘스트/목표"]'
          , '  }'
          , '}'
          , '```'
          , '- 플레이어가 탐색, NPC 대화 등을 통해 중요 시나리오 정보/단서를 얻으면 session_state.clues 배열에 1줄 요약으로 누적 기록하십시오.'
          , ''
          , '## 3. 진행 방식 규칙 - 자유 서술 및 주사위 판정 수칙'
          , '- 매 턴 끝에 "1번, 2번" 같은 선택지를 나열하지 않는다.'
          , '- "어떻게 하시겠어요?"처럼 열린 질문으로 마무리하거나, 아무것도 묻지 않고 다음 반응을 기다린다.'
          , '- 플레이어가 어떤 행동을 하든(대사, 이동, 조사, 전투 등) 그대로 받아서 진행한다.'
          , '- 플레이어의 행동 판정이 필요할 때는 먼저 "어떤 판정(예: 운동 DC 15)을 해주세요"라고 굴림을 요청하고 대화를 멈춘다.'
          , ''
          , '## 4. 오라클 규칙 - 예상 밖 행동 판정'
          , '플레이어가 JSON에 없는 창의적 행동을 시도하면:'
          , '1. Yes/No 질문으로 변환'
          , '2. 상황에 맞는 개연성(10/35/50/65/90%) 판단'
          , '3. d100을 굴려 결과 결정'
          , '4. 결과가 이후 JSON 내용과 모순되면 JSON을 우선'
          , ''
          , '## 5. 하우스룰 - 1인 플레이 보정'
          , '- 필요 시 몬스터 수를 인원에 맞게 조정한다 (예: 8마리 → 3마리).'
          , '- 그 외 수치는 원본 그대로 유지한다.'
          , ''
          , '## 6. 세션 상태 관리 규칙'
          , '- 세션 시작 시 session_state가 함께 제공되면 그 지점부터 이어서 진행한다.'
          , '- 대화 내용 및 단서는 session_state.clues 배열에 요약 저장되므로 과거 메시지 없이도 연속성이 유지된다.'
        ];

        if (mapUrl1.trim() || mapUrl2.trim()) {
            instructionParts.push('');
            instructionParts.push('## 7. 공간 구조 지도 참조 URL');
            if (mapUrl1.trim()) instructionParts.push(`- 지도 1: ${mapUrl1.trim()}`);
            if (mapUrl2.trim()) instructionParts.push(`- 지도 2: ${mapUrl2.trim()}`);
        }

        instructionParts.push('');
        instructionParts.push('## 현재 플레이어 캐릭터 요약');
        instructionParts.push(JSON.stringify(summary));

        if (sessionState) {
            instructionParts.push('');
            instructionParts.push('## 현재 세션 진행 누적 요약 (sessionState)');
            instructionParts.push(JSON.stringify(sessionState));
        }

        if (activeTab === 'map' || this.state.mapState?.tokens?.length > 0) {
            instructionParts.push('');
            instructionParts.push(`## ${this.getCompressedMapText()}`);
        }

        if (scenarioData) {
            instructionParts.push('');
            instructionParts.push('## 세션 진행 시나리오 데이터 (JSON)');
            const jsonStr = JSON.stringify(scenarioData);
            instructionParts.push(jsonStr.length > 3000 ? jsonStr.substring(0, 3000) + '\n...[생략]' : jsonStr);
        }

        return instructionParts.join('\n');
    }

    sendGmMessage = async () => {
        const { gmInput, geminiApiKey, geminiModel, charData, gmAttachments } = this.state;
        if ((!gmInput.trim() && gmAttachments.length === 0) || !geminiApiKey || !charData || this.state.isGmLoading) return;

        const userMessage = gmInput.trim();
        const currentTurnContent = userContent(userMessage, gmAttachments);

        const historyText = gmAttachments.length > 0
            ? `${userMessage}\n[첨부 파일: ${gmAttachments.map(f => f.name).join(', ')}]`
            : userMessage;

        const recentHistory = this.gmHistory.slice(-6);
        const requestContents = [...recentHistory, currentTurnContent];

        const displayText = gmAttachments.length > 0
            ? `${userMessage}\n${gmAttachments.map(f => `📎 ${f.name}`).join('\n')}`
            : userMessage;

        this.setState(prev => ({
            gmMessages : [...prev.gmMessages, { role : 'user', text : displayText }]
          , gmInput : ''
          , gmAttachments : []
          , isGmLoading : true
        }));

        const handleRetryNotice = (seconds) => {
            this.setState(prev => ({
                gmMessages : [
                    ...prev.gmMessages
                  , { role : 'system', text : `⏳ API 제한으로 인해 ${seconds}초 후 재시도합니다.` }
                ]
            }));
        };

        try {
            const systemInstruction = this.buildGmSystemInstruction();

            const data = await callGemini({
                apiKey : geminiApiKey, model : geminiModel || DEFAULT_GEMINI_MODEL
              , systemInstruction, contents : requestContents
            }, handleRetryNotice);

            this.gmHistory.push({ role: 'user', parts: [{ text: historyText }] });

            const { text, functionCalls, modelContent } = splitResponseParts(data);

            this.gmHistory.push(modelContent || { role : 'model', parts : [{ text }] });

            if (this.gmHistory.length > 6) {
                this.gmHistory = this.gmHistory.slice(-6);
            }

            const newMessages = [];

            if (functionCalls && functionCalls.length > 0) {
                functionCalls.forEach(call => {
                    const summaryText = this.runGmTool(call.name, call.args || {});
                    if (summaryText !== null) {
                        newMessages.push({ role : 'system', text : summaryText });
                    }
                });
            }

            if (text) {
                let parsedNarrative = text;

                try {
                    const cleanJsonStr = text.replace(/```json|```/g, "").trim();
                    if (cleanJsonStr.startsWith('{') && cleanJsonStr.endsWith('}')) {
                        const parsed = JSON.parse(cleanJsonStr);

                        if (parsed.narrative) {
                            parsedNarrative = parsed.narrative;
                        }

                        if (parsed.session_state) {
                            this.setState(prev => ({
                                sessionState: {
                                    ...prev.sessionState,
                                    ...parsed.session_state
                                }
                            }), this.saveSession);
                        }
                    }
                } catch (e) {
                    parsedNarrative = text;
                }

                newMessages.push({ role : 'gm', text : parsedNarrative });
            }

            this.setState(prev => ({
                gmMessages : [...prev.gmMessages, ...newMessages]
              , isGmLoading : false
            }), this.saveSession);
        } catch (err) {
            this.setState(prev => ({
                gmMessages : [...prev.gmMessages, { role : 'system', text : `⚠️ 오류: ${err.message}` }]
              , isGmLoading : false
            }));
        }
    }

    render() {
        const {
            activeTab, sheetSubTab, isUploadActive, rawInput, charData, themeKey, inspiration, usedFeatures, usedSpellSlots
          , hitEffectKey, mapState
          , geminiApiKey, geminiModel, showGmSettings, gmMessages, gmInput, isGmLoading, gmAttachments
          , scenarioUrl, mapUrl1, mapUrl2, isFetchLoading, scenarioData
        } = this.state;
        const themeVars = themeToCssVars(themeKey);

        const subTabList = [
            { id: 'abilities', label: '🏋️ 능력치' },
            { id: 'spells', label: '✨ 주문 & 특성' },
            { id: 'skills', label: '🎯 숙련 기술' },
            { id: 'equipment', label: '⚔️ 장비 착용' },
            { id: 'traits', label: '🧬 종족 & 배경 특성' },
            { id: 'inventory', label: '🎒 소지품 & 결점' },
        ];

        return (
            <div
                key={`hit-${hitEffectKey}`}
                className={`p-3 bg-[var(--bg-color)] ${hitEffectKey > 0 ? 'cs-hit-effect' : ''}`}
                style={themeVars}
            >
                <div className="max-w-[650px] mx-auto flex flex-col gap-3">
                    <div className="flex items-center justify-between gap-2">
                        <button
                            type="button"
                            onClick={() => this.props.navigate('/')}
                            className="flex items-center gap-1.5 text-xs font-semibold shrink-0"
                            style={{ color : 'var(--text-muted)' }}
                        >
                            <ArrowLeft size={14}/> 홈
                        </button>

                        <div className="flex min-w-0 flex-1 items-center justify-center gap-2">
                            <div
                                className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg"
                                style={{ background : 'linear-gradient(135deg, var(--header-from) 0%, var(--header-to) 100%)' }}
                            >
                                <BookOpenIcon size={14} className="text-white"/>
                            </div>
                            <span className="truncate text-sm font-bold" style={{ color : 'var(--text-main)' }}>
                                {charData ? (charData.name || 'D&D 캐릭터 시트') : 'D&D 캐릭터 시트'}
                            </span>
                        </div>

                        <div className="flex items-center gap-1.5 shrink-0">
                            {/* 저장하기 버튼 */}
                            <button
                                type="button"
                                onClick={this.handler.exportSessionState}
                                className="px-3 py-1.5 text-xs font-semibold rounded-lg text-white hover:opacity-90 transition-all flex items-center gap-1.5 shadow-sm"
                                style={{ background : 'linear-gradient(135deg, var(--header-from) 0%, var(--header-to) 100%)' }}
                            >
                                <DownloadIcon size={14}/>
                                <span>저장하기</span>
                            </button>

                            {/* 초기화 버튼 */}
                            <button
                                type="button"
                                onClick={this.handler.resetSession}
                                className="px-3 py-1.5 text-xs font-semibold rounded-lg text-white transition-all flex items-center gap-1.5 shadow-sm bg-rose-600 hover:bg-rose-700 active:scale-95"
                                title="세션 데이터 초기화 (API Key 제외)"
                            >
                                <RotateCcw size={14}/>
                                <span>초기화</span>
                            </button>

                            {/* 업로드 버튼 */}
                            <button
                                type="button"
                                onClick={this.handler.toggleUploadActive}
                                className="px-3 py-1.5 text-xs font-semibold rounded-lg text-white hover:opacity-90 transition-all flex items-center gap-1.5 shadow-sm"
                                style={{ background : 'linear-gradient(135deg, var(--header-from) 0%, var(--header-to) 100%)' }}
                            >
                                <UploadCloudIcon size={14}/>
                                <span>업로드</span>
                                {isUploadActive ? <ChevronUpIcon size={13}/> : <ChevronDownIcon size={13}/>}
                            </button>
                        </div>
                    </div>

                    {isUploadActive && (
                        <SheetLoader
                            rawInput={rawInput}
                            onChangeRawInput={this.handler.changeRawInput}
                            onRender={this.handler.renderFromInput}
                            onFileUpload={this.handler.uploadFile}
                            themeKey={themeKey}
                            onChangeTheme={this.handler.changeTheme}
                            onExport={this.handler.exportCharacter}
                            canExport={!!charData}
                        />
                    )}

                    {!charData && !isUploadActive && (
                        <div
                            className="flex flex-col items-center gap-4 rounded-2xl border border-dashed px-6 py-16 text-center"
                            style={{ borderColor : 'var(--border-color)' }}
                        >
                            <div
                                className="flex h-16 w-16 items-center justify-center rounded-2xl shadow-lg"
                                style={{ background : 'linear-gradient(135deg, var(--header-from) 0%, var(--header-to) 100%)' }}
                            >
                                <BookOpenIcon size={28} className="text-white"/>
                            </div>
                            <div>
                                <h2 className="text-base font-bold" style={{ color : 'var(--text-main)' }}>캐릭터 시트를 불러와 주세요</h2>
                                <p className="mt-1.5 max-w-xs text-sm leading-relaxed" style={{ color : 'var(--text-muted)' }}>
                                    JSON/TXT 파일을 업로드하면 시트, 주사위, AI 게임 마스터 대화가 모두 활성화돼요.
                                </p>
                            </div>
                            <button
                                type="button"
                                onClick={this.handler.toggleUploadActive}
                                className="flex items-center gap-1.5 rounded-full px-5 py-2.5 text-sm font-bold text-white shadow-lg transition-transform hover:scale-105 active:scale-95"
                                style={{ background : 'linear-gradient(135deg, var(--header-from) 0%, var(--header-to) 100%)' }}
                            >
                                <UploadCloudIcon size={16}/> 지금 불러오기
                            </button>
                        </div>
                    )}

                    {charData && (
                        <>
                            {/* 📌 메인 탭 */}
                            <div className="flex gap-1 rounded-xl p-1 mb-1" style={{ backgroundColor : 'var(--tag-bg)' }}>
                                {[
                                    { id : 'chat', icon : '🎲', label : 'GM 과의 대화' }
                                  , { id : 'sheet', icon : '📜', label : '캐릭터 시트' }
                                  , { id : 'map', icon : '🗺️', label : '전투 지도' }
                                ].map(tab => (
                                    <button
                                        key={tab.id}
                                        type="button"
                                        onClick={() => this.handler.changeTab(tab.id)}
                                        className={`flex-1 py-2.5 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 ${
                                            activeTab === tab.id
                                                ? 'bg-[var(--card-bg)] text-[var(--accent-color)] shadow-sm'
                                                : 'text-[var(--text-muted)] hover:text-[var(--text-main)]'
                                        }`}
                                    >
                                        <span>{tab.icon}</span>
                                        <span>{tab.label}</span>
                                    </button>
                                ))}
                            </div>

                            {/* 💬 1. GM 과의 대화 탭 */}
                            {activeTab === 'chat' && (
                                <GmChatPanel
                                    apiKey={geminiApiKey}
                                    model={geminiModel}
                                    onChangeApiKey={this.handler.changeGeminiApiKey}
                                    onChangeModel={this.handler.changeGeminiModel}
                                    showSettings={showGmSettings}
                                    onToggleSettings={this.handler.toggleGmSettings}
                                    onExportLogs={this.handler.exportChatLogs}
                                    messages={gmMessages}
                                    inputValue={gmInput}
                                    onChangeInput={this.handler.changeGmInput}
                                    onSend={this.sendGmMessage}
                                    isLoading={isGmLoading}
                                    attachedFiles={gmAttachments}
                                    onAttachFile={this.handler.attachGmFile}
                                    onRemoveAttachment={this.handler.removeGmAttachment}

                                    scenarioUrl={scenarioUrl}
                                    mapUrl1={mapUrl1}
                                    mapUrl2={mapUrl2}
                                    isFetchLoading={isFetchLoading}
                                    scenarioData={scenarioData}
                                    onChangeScenarioUrl={this.handler.changeScenarioUrl}
                                    onChangeMapUrl1={this.handler.changeMapUrl1}
                                    onChangeMapUrl2={this.handler.changeMapUrl2}
                                    onLoadScenario={this.handler.handleLoadScenario}
                                />
                            )}

                            {/* 📜 2. 캐릭터 시트 탭 */}
                            {activeTab === 'sheet' && (
                                <>
                                    <CharacterHeaderCard
                                        charData={charData}
                                        inspiration={inspiration}
                                        onToggleInspiration={this.handler.toggleInspiration}
                                    />
                                    <HpCard
                                        hp={charData.hp}
                                        onChangeHp={this.handler.changeHp}
                                        onTakeDamage={this.handler.takeDamagePrompt}
                                        onShortRest={this.handler.shortRest}
                                        onLongRest={this.handler.longRest}
                                    />

                                    <div className="flex flex-wrap gap-1.5 pb-2 my-1 border-b" style={{ borderColor : 'var(--border-color)' }}>
                                        {subTabList.map(tab => (
                                            <button
                                                key={tab.id}
                                                type="button"
                                                onClick={() => this.handler.changeSheetSubTab(tab.id)}
                                                className={`px-2.5 py-1.5 text-xs font-bold rounded-md transition-all border ${
                                                    sheetSubTab === tab.id
                                                        ? 'bg-[var(--card-bg)] text-[var(--accent-color)] border-[var(--border-color)] shadow-sm'
                                                        : 'bg-transparent text-[var(--text-muted)] border-transparent hover:text-[var(--text-main)] hover:bg-[rgba(255,255,255,0.05)]'
                                                }`}
                                            >
                                                {tab.label}
                                            </button>
                                        ))}
                                    </div>

                                    {sheetSubTab === 'abilities' && (
                                        <AbilitiesCard
                                            stats={charData.stats}
                                            proficiencyBonus={charData.proficiencyBonus}
                                            spellDC={charData.spellDC}
                                            spellAttackBonus={charData.spellAttackBonus}
                                            onRollCheck={this.handler.rollCheck}
                                        />
                                    )}

                                    {sheetSubTab === 'spells' && (
                                        <SpellsAndFeaturesCard
                                            specialFeatures={charData.specialFeatures}
                                            usedFeatures={usedFeatures}
                                            onToggleUsed={this.handler.toggleUsedFeature}
                                            spellSlots={charData.spellSlots}
                                            usedSpellSlots={usedSpellSlots}
                                            onToggleSpellSlot={this.handler.toggleSpellSlot}
                                            cantrips={charData.cantrips}
                                            preparedSpells={charData.preparedSpells}
                                            onRollSpell={this.handler.rollSpell}
                                        />
                                    )}

                                    {sheetSubTab === 'skills' && (
                                        <SkillsCard
                                            skills={charData.skills}
                                            onRollCheck={this.handler.rollCheck}
                                        />
                                    )}

                                    {sheetSubTab === 'equipment' && (
                                        <EquipmentCard
                                            equipmentSlots={charData.equipmentSlots}
                                            onRollDamage={this.handler.rollWeaponDamage}
                                            onShowInfo={this.handler.showEquipInfo}
                                        />
                                    )}

                                    {sheetSubTab === 'traits' && (
                                        <TraitsCard
                                            mode="traits"
                                            traits={charData.traits}
                                            languages={charData.languages}
                                        />
                                    )}

                                    {sheetSubTab === 'inventory' && (
                                        <InventoryCard
                                            mode="inventory"
                                            inventory={charData.inventory}
                                            flaw={charData.flaw}
                                        />
                                    )}
                                </>
                            )}

                            {/* 🗺️ 3. 전투 지도 (VTT) 메인 탭 */}
                            {activeTab === 'map' && (
                                <BattleMapPanel
                                    mapState={mapState}
                                    onUpdateMapState={(newMapState) => {
                                        this.setState({ mapState : newMapState }, this.saveSession);
                                    }}
                                />
                            )}
                        </>
                    )}
                </div>
            </div>
        );
    }
}

export default withNavigate(CharacterSheetManager);
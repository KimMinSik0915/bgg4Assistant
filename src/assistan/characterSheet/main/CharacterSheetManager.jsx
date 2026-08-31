import { Component } from "react";
import withNavigate from "../../utils/withNavigate";
import { normalizeCharacterData } from "../util/normalizeCharacterData";
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
import TraitsAndInventoryCard from "../component/TraitsAndInventoryCard";
import GmChatPanel from "../component/GmChatPanel";
import DicePanel from "../component/DicePanel";
import "../resource/CSS/characterSheet.css";

const GEMINI_KEY_STORAGE = 'cs_gemini_api_key';
const GEMINI_MODEL_STORAGE = 'cs_gemini_model';
const DEFAULT_GEMINI_MODEL = 'gemini-2.5-flash';

/**
 * @Author : 김민식
 * CharacterSheetManager : D&D 5e 동적 캐릭터 시트
 */
class CharacterSheetManager extends Component {

    state = {
        activeTab: 'chat'        // 🔥 메인 탭 ('chat': GM 대화 / 'sheet': 캐릭터 시트)
      , sheetSubTab: 'abilities' // 🔥 캐릭터 시트 서브 탭 ('abilities', 'spells', 'skills', 'equipment', 'traits', 'inventory')
      , isUploadActive : false
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
            this.setState(prev => ({ inspiration : !prev.inspiration }));
        }
      , toggleUsedFeature : (index) => {
            this.setState(prev => ({
                usedFeatures : { ...prev.usedFeatures, [index] : !prev.usedFeatures[index] }
            }));
        }
      , toggleSpellSlot : (index) => {
            this.setState(prev => ({
                usedSpellSlots : { ...prev.usedSpellSlots, [index] : !prev.usedSpellSlots[index] }
            }));
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
            });
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
            if (!this.state.charData?.hp) return;
            const dieRoll = Math.floor(Math.random() * 6) + 1;
            const conMod = this.state.charData.hp.conMod || 0;
            const healAmount = dieRoll + conMod;
            this.handler.changeHp(healAmount);
            this.setState({
                usedFeatures : {}
              , usedSpellSlots : {}
              , selectedSides : 6
              , diceValue : healAmount
              , resultText : `☕ 짧은 휴식: 1d6(${dieRoll}) + 건강(${conMod}) = ${healAmount} HP 회복!`
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
            });
        }
      , selectDice : (sides) => {
            this.setState({ selectedSides : sides, diceValue : sides, resultText : `d${sides} 선택됨` });
        }
      , rollDice : () => {
            this.executeRoll(`d${this.state.selectedSides} 굴림`, this.state.selectedSides, 0);
        }
      , rollCheck : (label, sides, mod) => {
            this.setState({ selectedSides : sides, diceValue : sides });
            this.executeRoll(label, sides, mod);
        }
      , rollWeaponDamage : (item) => {
            this.handler.rollCheck(`${item.name} 피해`, item.dice, 0);
        }
      , rollSpell : (name, dice) => {
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
                this.setState({ scenarioData : data, isFetchLoading : false });
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

    applyCharData = (parsed) => {
        const charData = normalizeCharacterData(parsed);
        this.gmHistory = [];
        this.setState({
            charData
          , inspiration : false
          , usedFeatures : {}
          , usedSpellSlots : {}
          , resultText : `${charData.name || '캐릭터'} 시트 렌더링 완료!`
          , gmMessages : []
          , isUploadActive : false
        });
    }

    executeRoll = (label, sides, mod) => {
        if (this.rollTimer) clearInterval(this.rollTimer);
        this.setState({ isRolling : true, resultText : '굴리는 중...' });

        let counter = 0;
        this.rollTimer = setInterval(() => {
            this.setState({ diceValue : Math.floor(Math.random() * sides) + 1 });
            counter++;
            if (counter > 10) {
                clearInterval(this.rollTimer);
                const rawRoll = Math.floor(Math.random() * sides) + 1;
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
            }
        }, 50);
    }

    runGmTool = (name, args = {}) => {
        switch (name) {
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
                this.setState({ selectedSides : sides, diceValue : total, resultText : `${args.label || '굴림'}: ${total} [주사위 ${raw}${modStr}]` });
                return `🎲 [주사위 굴림] ${args.label || '굴림'} → ${total} (주사위 ${raw}${modStr})`;
            }
            default :
                return `⚠️ 알 수 없는 도구 호출: ${name}`;
        }
    }

    buildGmSystemInstruction = () => {
        const c = this.state.charData;
        const { mapUrl1, mapUrl2, scenarioData } = this.state;
        if (!c) return '';

        const summary = {
            name : c.name, class : c.class, race : c.race, level : c.level
            , hp : c.hp, stats : c.stats, skills : c.skills, inventory : c.inventory
        };

        const instructionParts = [
            '너는 아래 업로드/연결된 자료를 기반으로 D&D 세션을 진행하는 GM이다.'
            , ''
            , '## 1. 캐논 규칙 - 절대 변경 불가'
            , '- JSON에 명시된 몬스터 스탯, DC, 데미지, NPC 정보, 보상, 캐릭터 능력치는 절대 바꾸지 않는다.'
            , '- 판정이 필요한 모든 상황은 JSON에 있는 수치를 우선 사용한다.'
            , '- 공간 배치, 거리, 방 구조는 전달된 레이아웃 및 지도를 기준으로 하며 이와 모순되는 구도를 지어내지 않는다.'
            , ''
            , '## 2. 연결 조직 규칙 - 자유 연출 허용'
            , '- JSON에 없는 장면(마을, 이동 중 잡담 등)은 자유롭게 연출해도 된다.'
            , '- 단, 이 안에서 새로운 몬스터/아이템/줄거리 반전을 만들어내지 않는다.'
            , '- 3턴 이내에 자연스럽게 다음 JSON 비트(방/조우/NPC)로 수렴시킨다.'
            , ''
            , '## 3. 오라클 규칙 - 예상 밖 행동 판정'
            , '플레이어가 JSON에 없는 창의적 행동을 시도하면:'
            , '1. Yes/No 질문으로 변환'
            , '2. 상황에 맞는 개연성(10/35/50/65/90%) 판단'
            , '3. d100을 굴려 결과 결정'
            , '4. 결과가 이후 JSON 내용과 모순되면 JSON을 우선'
            , ''
            , '## 4. 진행 방식 규칙 - 자유 서술'
            , '- 매 턴 끝에 "1번, 2번" 같은 선택지를 나열하지 않는다.'
            , '- "어떻게 하시겠어요?"처럼 열린 질문으로 마무리하거나, 아무것도 묻지 않고 다음 반응을 기다린다.'
            , '- 플레이어가 어떤 행동을 하든(대사, 이동, 조사, 전투 등) 그대로 받아서 진행한다.'
            , ''
            , '## 5. 하우스룰 - 1인 플레이 보정'
            , '- 필요 시 몬스터 수를 인원에 맞게 조정한다 (예: 8마리 → 3마리).'
            , '- 그 외 수치는 원본 그대로 유지한다.'
            , '- session_state.json의 house_rules_active에 명시된 하우스룰은 별도 설명 없이 계속 적용한다.'
            , ''
            , '## 6. 세션 상태 관리 규칙'
            , '- 세션 시작 시 session_state.json이 함께 제공되면, current_location과 narrative_notes를 기준으로 그 지점부터 이어서 진행한다 (처음부터 다시 시작하지 않는다).'
            , '- open_threads에 있는 내용은 자연스러운 시점에 다시 등장시킬 수 있다.'
            , '- 플레이어가 "세션 상태 저장해줘" 또는 "여기까지 정리해줘"라고 요청하면, 지금까지의 진행 상황을 session_state.json과 동일한 스키마로 갱신해서 출력한다.'
        ];

        if (mapUrl1.trim() || mapUrl2.trim()) {
            instructionParts.push('');
            instructionParts.push('## 7. 공간 구조 지도 참조 URL');
            if (mapUrl1.trim()) instructionParts.push(`- 공간/지도 링크 1: ${mapUrl1.trim()}`);
            if (mapUrl2.trim()) instructionParts.push(`- 공간/지도 링크 2: ${mapUrl2.trim()}`);
            instructionParts.push('* 위 지도 주소와 JSON의 1 square = 5 feet 스케일 정보를 참조하여 공간/거리를 연출할 것.');
        }

        instructionParts.push('');
        instructionParts.push('## 현재 플레이어 캐릭터 시트 (JSON)');
        instructionParts.push(JSON.stringify(summary));

        if (scenarioData) {
            instructionParts.push('');
            instructionParts.push('## 세션 진행 시나리오 데이터 (JSON)');
            const jsonStr = JSON.stringify(scenarioData);

            if (jsonStr.length > 4000) {
                instructionParts.push(jsonStr.substring(0, 4000) + '\n... [이하 토큰 절약을 위한 부분 생략: 플레이어 진행 상황에 맞춰 스토리 진행]');
            } else {
                instructionParts.push(jsonStr);
            }
        }

        return instructionParts.join('\n');
    }

    sendGmMessage = async () => {
        const { gmInput, geminiApiKey, geminiModel, charData, gmAttachments } = this.state;
        if ((!gmInput.trim() && gmAttachments.length === 0) || !geminiApiKey || !charData || this.state.isGmLoading) return;

        const userMessage = gmInput.trim();
        const currentTurnContent = userContent(userMessage, gmAttachments);

        const historyText = gmAttachments.length > 0
            ? `${userMessage}\n[첨부된 파일: ${gmAttachments.map(f => f.name).join(', ')}]`
            : userMessage;

        const recentHistory = this.gmHistory.slice(-4);
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
                  , { role : 'system', text : `⏳ API 제한(Quota Exceeded)으로 인해 ${seconds}초 후 자동으로 재시도합니다. (로딩 유지 중...)` }
                ]
            }));
        };

        try {
            const systemInstruction = this.buildGmSystemInstruction();

            const data = await callGemini({
                apiKey : geminiApiKey, model : geminiModel || DEFAULT_GEMINI_MODEL
              , systemInstruction, contents : requestContents, tools : gmTools
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
                    newMessages.push({ role : 'system', text : summaryText });
                });
            }

            if (text) {
                newMessages.push({ role : 'gm', text });
            }

            this.setState(prev => ({
                gmMessages : [...prev.gmMessages, ...newMessages]
              , isGmLoading : false
            }));
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
          , selectedSides, diceValue, isRolling, resultText, hitEffectKey
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
                className={`min-h-screen p-3 pb-36 bg-[var(--bg-color)] ${hitEffectKey > 0 ? 'cs-hit-effect' : ''}`}
                style={themeVars}
            >
                <div className="max-w-[600px] mx-auto flex flex-col gap-3">
                    <div className="flex justify-end">
                        <button
                            type="button"
                            onClick={this.handler.toggleUploadActive}
                            className="px-3 py-1.5 text-sm font-semibold rounded bg-[var(--primary-color,#4a5568)] text-white hover:opacity-90 transition-all flex items-center gap-1.5 shadow-sm"
                        >
                            <span>📥 업로드</span>
                            <span className="text-xs">{isUploadActive ? '▲' : '▼'}</span>
                        </button>
                    </div>

                    {isUploadActive && (
                        <SheetLoader
                            rawInput={rawInput}
                            onChangeRawInput={this.handler.changeRawInput}
                            onRender={this.handler.renderFromInput}
                            onFileUpload={this.handler.uploadFile}
                            themeKey={themeKey}
                            onChangeTheme={this.handler.changeTheme}
                        />
                    )}

                    {charData && (
                        <>
                            {/* 📌 메인 탭 */}
                            <div className="flex border-b border-[var(--border-color)] mb-1">
                                <button
                                    type="button"
                                    onClick={() => this.handler.changeTab('chat')}
                                    className={`flex-1 py-2.5 text-xs font-bold transition-all border-b-2 flex items-center justify-center gap-1.5 ${
                                        activeTab === 'chat'
                                            ? 'border-[var(--accent-color)] text-[var(--accent-color)] bg-[var(--card-bg)] rounded-t-lg'
                                            : 'border-transparent text-[var(--text-muted)] hover:text-[var(--text-main)]'
                                    }`}
                                >
                                    <span>🎲</span>
                                    <span>GM 과의 대화</span>
                                </button>
                                <button
                                    type="button"
                                    onClick={() => this.handler.changeTab('sheet')}
                                    className={`flex-1 py-2.5 text-xs font-bold transition-all border-b-2 flex items-center justify-center gap-1.5 ${
                                        activeTab === 'sheet'
                                            ? 'border-[var(--accent-color)] text-[var(--accent-color)] bg-[var(--card-bg)] rounded-t-lg'
                                            : 'border-transparent text-[var(--text-muted)] hover:text-[var(--text-main)]'
                                    }`}
                                >
                                    <span>📜</span>
                                    <span>캐릭터 시트</span>
                                </button>
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
                                    {/* 🔴 헤더 & 체력 카드 */}
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

                                    {/* 🔘 서브 탭 바 (자동 줄바꿈 flex-wrap 적용) */}
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

                                    {/* 📂 선택한 서브 탭 출력 */}
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
                                        <TraitsAndInventoryCard
                                            mode="traits"
                                            traits={charData.traits}
                                            languages={charData.languages}
                                        />
                                    )}

                                    {sheetSubTab === 'inventory' && (
                                        <TraitsAndInventoryCard
                                            mode="inventory"
                                            inventory={charData.inventory}
                                            flaw={charData.flaw}
                                        />
                                    )}
                                </>
                            )}
                        </>
                    )}
                </div>

                <DicePanel
                    selectedSides={selectedSides}
                    diceValue={diceValue}
                    isRolling={isRolling}
                    resultText={resultText}
                    onSelectDice={this.handler.selectDice}
                    onRoll={this.handler.rollDice}
                />
            </div>
        );
    }
}

export default withNavigate(CharacterSheetManager);
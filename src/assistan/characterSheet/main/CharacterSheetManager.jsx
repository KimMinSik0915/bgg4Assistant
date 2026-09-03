import { Component, createRef } from "react";
import { BookOpenIcon, ChevronUpIcon, ChevronDownIcon, ChevronLeftIcon, ChevronRightIcon, UploadCloudIcon, ArrowLeft, DownloadIcon, RotateCcw, XIcon } from "lucide-react";
import withNavigate from "../../utils/withNavigate";
import { normalizeCharacterData } from "../util/normalizeCharacterData";
import { buildExportJson, downloadJson, sanitizeFileName } from "../util/exportCharacterData";
import { THEME_KEYS, themeToCssVars } from "../resource/dataSet/themes";
import { gmTools } from "../resource/dataSet/gmTools";
import { callGemini, splitResponseParts, userContent } from "../service/geminiService";
import { calculateGridPos, parseGridLabel, gridIndexToPixel } from "../util/gridCoords";
import SheetLoader from "../component/SheetLoader";
import CharacterHeaderCard from "../component/CharacterHeaderCard";
import HpCard from "../component/HpCard";
import AbilitiesCard from "../component/AbilitiesCard";
import SpellsAndFeaturesCard from "../component/SpellsAndFeaturesCard";
import SkillsCard from "../component/SkillsCard";
import EquipmentCard from "../component/EquipmentCard";
import BattleMapPanel from "../component/BattleMapPanel";
import GmChatPanel from "../component/GmChatPanel";
import { rollPhysicalDie, DICE_BOX_SELECTOR, announceDiceResult, DICE_ROLLING_EVENT, isDiceRollInProgress, beginDiceCycle } from "../service/dice3DEngine";
import "../resource/CSS/characterSheet.css";
import TraitsCard from "../component/TraitsCard";
import InventoryCard from "../component/InventoryCard";

const GEMINI_KEY_STORAGE = 'cs_gemini_api_key';
const GEMINI_MODEL_STORAGE = 'cs_gemini_model';
const SESSION_STORAGE_KEY = 'cs_trpg_session_data';
const LAYOUT_STORAGE_KEY = 'cs_workspace_layout';
const DEFAULT_GEMINI_MODEL = 'gemini-3.1-flash-lite';
const DEFAULT_CHAT_WIDTH = 380;
const MIN_CHAT_WIDTH = 300;
const MAX_CHAT_WIDTH = 640;
const DEFAULT_SHEET_WIDTH = 300;
const MIN_SHEET_WIDTH = 240;
const MAX_SHEET_WIDTH = 560;
const MOBILE_MEDIA_QUERY = '(max-width: 767px)'; // 데스크탑(지도 메인 3분할) ↔ 모바일 분기 기준
const DEFAULT_MOBILE_SHEET_HEIGHT = 240;
const MIN_MOBILE_SHEET_HEIGHT = 160;
const DEFAULT_MOBILE_CHAT_HEIGHT = 260;
const MIN_MOBILE_CHAT_HEIGHT = 190; // 헤더+입력창(전송 버튼 포함)이 잘리지 않고 항상 보이는 최소 높이
const MIN_MOBILE_MAP_HEIGHT = 160; // 지도가 메인이므로 세로 스택에서도 이만큼은 항상 확보
const MOBILE_RESIZER_SIZE = 20;    // 세로 리사이저 1개의 히트 영역 높이(px)
const MOBILE_COLLAPSED_SHEET_BAR = 44; // 접힌 캐릭터 시트 바 높이(px)

// 🔄 gmHistory 하위호환: 예전에는 Gemini 원본 형식({role:'user'|'model', parts:[{text}]}) 그대로
// 저장했다. 지금은 { role:'user'|'assistant', text } 평문으로 다루므로, 로컬에 저장돼 있던 예전
// 형식 세션을 불러올 때 한 번 변환해준다.
const normalizeGmHistory = (rawHistory) => {
    if (!Array.isArray(rawHistory)) return [];
    return rawHistory.map(turn => {
        if (typeof turn?.text === 'string') {
            return { role : turn.role === 'model' ? 'assistant' : turn.role, text : turn.text };
        }
        const partsText = Array.isArray(turn?.parts) ? turn.parts.filter(p => p.text).map(p => p.text).join('\n') : '';
        return { role : turn?.role === 'model' ? 'assistant' : 'user', text : partsText };
    }).filter(turn => turn.text);
};

// 🧷 GM 응답 강제 스키마 (Gemini Structured Output). buildGmSystemInstruction의 JSON 형식 설명을
// "요청"이 아니라 "강제"로 만든다 - Gemini가 ```json 코드펜스를 붙이거나 형식을 벗어나는 등 파싱이
// 실패할 여지를 원천 차단해서, token_moves를 포함한 응답이 항상 유효한 JSON으로 오게 보장한다.
// (추가 API 호출/토큰 비용 없이 같은 요청에 옵션만 하나 더 붙이는 것이라 사용량에는 영향이 없다.)
const GM_RESPONSE_SCHEMA = {
    type : 'OBJECT'
  , properties : {
        narrative : { type : 'STRING' }
      , session_state : {
            type : 'OBJECT'
          , properties : {
                loc : { type : 'STRING' }
              , clues : { type : 'ARRAY', items : { type : 'STRING' } }
              , quests : { type : 'ARRAY', items : { type : 'STRING' } }
              , landmarks : {
                    type : 'ARRAY'
                  , items : {
                        type : 'OBJECT'
                      , properties : { name : { type : 'STRING' }, gridPos : { type : 'STRING' } }
                      , required : ['name', 'gridPos']
                    }
                }
            }
        }
      , token_moves : {
            type : 'ARRAY'
          , items : {
                type : 'OBJECT'
              , properties : {
                    token : { type : 'STRING' }
                  , to : { type : 'STRING' }
                }
              , required : ['token', 'to']
            }
        }
      , token_spawns : {
            type : 'ARRAY'
          , items : {
                type : 'OBJECT'
              , properties : {
                    name : { type : 'STRING' }
                  , at : { type : 'STRING' }
                  , hp : { type : 'NUMBER' }
                  , maxHp : { type : 'NUMBER' }
                }
              , required : ['name', 'at']
            }
        }
      , location_lookup : { type : 'STRING' }
    }
  , required : ['narrative']
};

// 🔭 지도 이미지 비전 조회 응답 스키마. GM 응답에 location_lookup이 채워졌을 때만(=텍스트만으로는
// 좌표를 못 찾은, 드문 경우에만) 딱 한 번 추가로 호출한다 - 매 턴 이미지를 보내지 않으므로 평소
// 대화 비용에는 영향이 없다.
const LOCATION_LOOKUP_SCHEMA = {
    type : 'OBJECT'
  , properties : {
        found : { type : 'BOOLEAN' }
      , x_percent : { type : 'NUMBER' }
      , y_percent : { type : 'NUMBER' }
    }
  , required : ['found']
};

/**
 * @Author : 김민식
 * CharacterSheetManager : D&D 5e 동적 캐릭터 시트 & 무료 계정 최적화 VTT/GM 세션
 */
class CharacterSheetManager extends Component {

    state = {
        sheetSubTab: 'abilities'
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
      , sheetCollapsed: false   // 좌측 캐릭터 시트 접기/펼치기 (데스크탑)
      , sheetWidth: DEFAULT_SHEET_WIDTH // 좌측 캐릭터 시트 폭(px) - 펼쳤을 때 시트/지도 사이 리사이저로 조절 (데스크탑)
      , isResizingSheet: false
      , chatWidth: DEFAULT_CHAT_WIDTH // 우측 채팅 폭(px) - 지도/채팅 사이 리사이저로 조절 (데스크탑)
      , isResizingChat: false
      , isMobile: false        // 화면 폭에 따라 데스크탑 3분할 ↔ 모바일 탭 전환
      , activeTab: 'chat'      // 모바일 탭 모드에서 선택된 탭
      , mobileViewMode: 'tabs' // 모바일 전용: 'tabs'(전환) ↔ 'all'(지도 메인 + 시트/채팅 상하 배치, 전부 한 화면)
      , mobileSheetHeight: DEFAULT_MOBILE_SHEET_HEIGHT // 'all' 모드에서 시트를 펼쳤을 때 높이(px)
      , isResizingMobileSheet: false
      , mobileChatHeight: DEFAULT_MOBILE_CHAT_HEIGHT   // 'all' 모드에서 하단 채팅 높이(px)
      , isResizingMobileChat: false
      , viewportHeight: null   // visualViewport 기반 실제 보이는 높이(px) - 모바일 키보드가 올라와도 화면이 안 가려지게
      , viewportTop: 0
    }

    constructor(props) {
        super(props);
        this.gmHistory = [];
        this.mobileStackRef = createRef(); // 'all' 모드의 세로 스택 컨테이너 - 리사이즈 시 사용 가능한 높이 측정용
    }

    rollTimer = null;

    componentDidMount() {
        // 🔒 "지금 뭔가 물리적으로 굴러가는 중이다"는 dice3DEngine이 전역으로 관리한다 - 주사위
        // 트레이(DicePanel)처럼 이 컴포넌트가 모르는 다른 트리에서 굴린 것까지 포함해서, 뭔가
        // 굴러가는 동안엔 능력치/기술/장비/주문 판정 버튼도 같이 비활성화되어야 서로 끼어들지 않는다.
        this.setState({ isRolling : isDiceRollInProgress() });
        window.addEventListener(DICE_ROLLING_EVENT, this.handleDiceRollingChange);

        // 📱 화면 폭 감지: 데스크탑(지도 메인 3분할) ↔ 모바일(탭 전환) 레이아웃을 JS로 분기
        // (CSS로 숨기기만 하면 BattleMapPanel/GmChatPanel이 두 벌 동시에 마운트되어 상태가 꼬이므로 실제로 하나만 렌더링한다)
        this.mobileMql = window.matchMedia(MOBILE_MEDIA_QUERY);
        this.setState({ isMobile : this.mobileMql.matches });
        if (this.mobileMql.addEventListener) {
            this.mobileMql.addEventListener('change', this.handleMobileMqChange);
        } else if (this.mobileMql.addListener) {
            this.mobileMql.addListener(this.handleMobileMqChange); // Safari 구버전 호환
        }

        // ⌨️ 모바일 키보드가 올라와도 화면(특히 하단 채팅 입력창)이 가려지지 않도록,
        // 워크스페이스 높이를 브라우저의 "실제 보이는 영역"(visualViewport)에 맞춰 계속 갱신한다.
        // (position:fixed + inset:0 만으로는 키보드가 열려도 레이아웃 뷰포트가 그대로라 안 줄어드는 브라우저가 많음)
        if (window.visualViewport) {
            this.visualViewport = window.visualViewport;
            this.handleVisualViewportChange = () => {
                this.setState({
                    viewportHeight : this.visualViewport.height,
                    viewportTop : this.visualViewport.offsetTop || 0
                });
            };
            this.visualViewport.addEventListener('resize', this.handleVisualViewportChange);
            this.visualViewport.addEventListener('scroll', this.handleVisualViewportChange);
            this.handleVisualViewportChange();
        }

        const savedKey = window.localStorage.getItem(GEMINI_KEY_STORAGE);
        let savedModel = window.localStorage.getItem(GEMINI_MODEL_STORAGE);
        if (savedModel === 'gemini-3.6-flash') savedModel = null;

        const savedLayout = window.localStorage.getItem(LAYOUT_STORAGE_KEY);
        if (savedLayout) {
            try {
                const parsedLayout = JSON.parse(savedLayout);
                this.setState({
                    sheetCollapsed: !!parsedLayout.sheetCollapsed,
                    sheetWidth: this.clampSheetWidth(parsedLayout.sheetWidth) || DEFAULT_SHEET_WIDTH,
                    chatWidth: this.clampChatWidth(parsedLayout.chatWidth) || DEFAULT_CHAT_WIDTH,
                    mobileViewMode: parsedLayout.mobileViewMode === 'all' ? 'all' : 'tabs',
                    mobileSheetHeight: this.clampMobileSheetHeight(parsedLayout.mobileSheetHeight) || DEFAULT_MOBILE_SHEET_HEIGHT,
                    mobileChatHeight: this.clampMobileChatHeight(parsedLayout.mobileChatHeight) || DEFAULT_MOBILE_CHAT_HEIGHT
                });
            } catch (e) {
                console.error("레이아웃 설정 복원 중 오류 발생:", e);
            }
        }

        const savedSession = window.localStorage.getItem(SESSION_STORAGE_KEY);
        if (savedSession) {
            try {
                const parsed = JSON.parse(savedSession);
                this.gmHistory = normalizeGmHistory(parsed.gmHistory);
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
        window.removeEventListener(DICE_ROLLING_EVENT, this.handleDiceRollingChange);
        if (this.rollTimer) clearInterval(this.rollTimer);
        this.stopChatResize();
        this.stopSheetResize();
        this.stopMobileSheetResize();
        this.stopMobileChatResize();
        if (this.mobileMql) {
            if (this.mobileMql.removeEventListener) {
                this.mobileMql.removeEventListener('change', this.handleMobileMqChange);
            } else if (this.mobileMql.removeListener) {
                this.mobileMql.removeListener(this.handleMobileMqChange);
            }
        }
        if (this.visualViewport) {
            this.visualViewport.removeEventListener('resize', this.handleVisualViewportChange);
            this.visualViewport.removeEventListener('scroll', this.handleVisualViewportChange);
        }
    }

    handleMobileMqChange = (e) => {
        this.setState({ isMobile : e.matches });
    }

    handleDiceRollingChange = (e) => {
        this.setState({ isRolling : !!e.detail?.isRolling });
    }

    clampChatWidth = (value) => {
        const n = Number(value);
        if (!n || Number.isNaN(n)) return DEFAULT_CHAT_WIDTH;
        return Math.min(MAX_CHAT_WIDTH, Math.max(MIN_CHAT_WIDTH, Math.round(n)));
    }

    clampSheetWidth = (value) => {
        const n = Number(value);
        if (!n || Number.isNaN(n)) return DEFAULT_SHEET_WIDTH;
        return Math.min(MAX_SHEET_WIDTH, Math.max(MIN_SHEET_WIDTH, Math.round(n)));
    }

    // 📱 'all' 모드 세로 스택 높이 제한: 지도(메인)가 최소 높이 밑으로 밀리지 않도록,
    // 실제 컨테이너 높이를 측정해서 시트/채팅이 서로+지도 몫까지 먹지 않게 상한을 계산한다.
    clampMobileSheetHeight = (value) => {
        const n = Number(value);
        if (!n || Number.isNaN(n)) return DEFAULT_MOBILE_SHEET_HEIGHT;
        const containerH = this.mobileStackRef.current?.clientHeight || 0;
        const chatH = this.state.mobileChatHeight || DEFAULT_MOBILE_CHAT_HEIGHT;
        const maxAllowed = containerH > 0
            ? Math.max(MIN_MOBILE_SHEET_HEIGHT, containerH - MIN_MOBILE_MAP_HEIGHT - chatH - MOBILE_RESIZER_SIZE * 2)
            : 480;
        return Math.min(maxAllowed, Math.max(MIN_MOBILE_SHEET_HEIGHT, Math.round(n)));
    }

    clampMobileChatHeight = (value) => {
        const n = Number(value);
        if (!n || Number.isNaN(n)) return DEFAULT_MOBILE_CHAT_HEIGHT;
        const containerH = this.mobileStackRef.current?.clientHeight || 0;
        const sheetH = this.state.sheetCollapsed
            ? MOBILE_COLLAPSED_SHEET_BAR
            : (this.state.mobileSheetHeight || DEFAULT_MOBILE_SHEET_HEIGHT);
        const maxAllowed = containerH > 0
            ? Math.max(MIN_MOBILE_CHAT_HEIGHT, containerH - MIN_MOBILE_MAP_HEIGHT - sheetH - MOBILE_RESIZER_SIZE * 2)
            : 480;
        return Math.min(maxAllowed, Math.max(MIN_MOBILE_CHAT_HEIGHT, Math.round(n)));
    }

    saveLayoutPrefs = () => {
        try {
            window.localStorage.setItem(LAYOUT_STORAGE_KEY, JSON.stringify({
                sheetCollapsed: this.state.sheetCollapsed,
                sheetWidth: this.state.sheetWidth,
                chatWidth: this.state.chatWidth,
                mobileViewMode: this.state.mobileViewMode,
                mobileSheetHeight: this.state.mobileSheetHeight,
                mobileChatHeight: this.state.mobileChatHeight
            }));
        } catch (e) {
            console.error("레이아웃 설정 저장 중 오류 발생:", e);
        }
    }

    // 🖱️ 캐릭터 시트 ↔ 지도 사이 리사이저: 펼쳐진 시트 폭을 드래그로 조절 (시트가 좌측이라 오른쪽으로 끌수록 넓어짐)
    startSheetResize = (e) => {
        e.preventDefault();
        const clientX = e.touches ? e.touches[0].clientX : e.clientX;
        this._sheetResizeStartX = clientX;
        this._sheetResizeStartWidth = this.state.sheetWidth;
        this.setState({ isResizingSheet: true });
        document.body.style.cursor = 'col-resize';
        document.body.style.userSelect = 'none';
        window.addEventListener('mousemove', this.handleSheetResizeMove);
        window.addEventListener('mouseup', this.stopSheetResize);
        window.addEventListener('touchmove', this.handleSheetResizeMove, { passive: false });
        window.addEventListener('touchend', this.stopSheetResize);
    }

    handleSheetResizeMove = (e) => {
        if (this._sheetResizeStartX === undefined) return;
        const clientX = e.touches ? e.touches[0].clientX : e.clientX;
        const delta = clientX - this._sheetResizeStartX;
        this.setState({ sheetWidth: this.clampSheetWidth(this._sheetResizeStartWidth + delta) });
        if (e.cancelable) e.preventDefault();
    }

    stopSheetResize = () => {
        if (this._sheetResizeStartX === undefined) return;
        this._sheetResizeStartX = undefined;
        this.setState({ isResizingSheet: false });
        document.body.style.cursor = '';
        document.body.style.userSelect = '';
        window.removeEventListener('mousemove', this.handleSheetResizeMove);
        window.removeEventListener('mouseup', this.stopSheetResize);
        window.removeEventListener('touchmove', this.handleSheetResizeMove);
        window.removeEventListener('touchend', this.stopSheetResize);
        this.saveLayoutPrefs();
    }

    // 🖱️ 지도 ↔ 채팅 사이 리사이저: 드래그하는 동안 chatWidth를 실시간으로 갱신
    startChatResize = (e) => {
        e.preventDefault();
        const clientX = e.touches ? e.touches[0].clientX : e.clientX;
        this._resizeStartX = clientX;
        this._resizeStartWidth = this.state.chatWidth;
        this.setState({ isResizingChat: true });
        document.body.style.cursor = 'col-resize';
        document.body.style.userSelect = 'none';
        window.addEventListener('mousemove', this.handleChatResizeMove);
        window.addEventListener('mouseup', this.stopChatResize);
        window.addEventListener('touchmove', this.handleChatResizeMove, { passive: false });
        window.addEventListener('touchend', this.stopChatResize);
    }

    handleChatResizeMove = (e) => {
        if (this._resizeStartX === undefined) return;
        const clientX = e.touches ? e.touches[0].clientX : e.clientX;
        const delta = clientX - this._resizeStartX;
        // 리사이저를 오른쪽(지도 쪽)으로 끌면 채팅이 좁아지고 지도가 넓어짐, 왼쪽으로 끌면 반대
        this.setState({ chatWidth: this.clampChatWidth(this._resizeStartWidth - delta) });
        if (e.cancelable) e.preventDefault();
    }

    stopChatResize = () => {
        if (this._resizeStartX === undefined) return;
        this._resizeStartX = undefined;
        this.setState({ isResizingChat: false });
        document.body.style.cursor = '';
        document.body.style.userSelect = '';
        window.removeEventListener('mousemove', this.handleChatResizeMove);
        window.removeEventListener('mouseup', this.stopChatResize);
        window.removeEventListener('touchmove', this.handleChatResizeMove);
        window.removeEventListener('touchend', this.stopChatResize);
        this.saveLayoutPrefs();
    }

    // 📱 'all' 모드 세로 리사이저 - 시트(위) ↔ 지도: 시트가 위쪽이라 아래로 끌수록 넓어짐
    startMobileSheetResize = (e) => {
        e.preventDefault();
        const clientY = e.touches ? e.touches[0].clientY : e.clientY;
        this._mobileSheetResizeStartY = clientY;
        this._mobileSheetResizeStartHeight = this.state.mobileSheetHeight;
        this.setState({ isResizingMobileSheet: true });
        document.body.style.cursor = 'row-resize';
        document.body.style.userSelect = 'none';
        window.addEventListener('mousemove', this.handleMobileSheetResizeMove);
        window.addEventListener('mouseup', this.stopMobileSheetResize);
        window.addEventListener('touchmove', this.handleMobileSheetResizeMove, { passive: false });
        window.addEventListener('touchend', this.stopMobileSheetResize);
    }

    handleMobileSheetResizeMove = (e) => {
        if (this._mobileSheetResizeStartY === undefined) return;
        const clientY = e.touches ? e.touches[0].clientY : e.clientY;
        const delta = clientY - this._mobileSheetResizeStartY;
        this.setState({ mobileSheetHeight: this.clampMobileSheetHeight(this._mobileSheetResizeStartHeight + delta) });
        if (e.cancelable) e.preventDefault();
    }

    stopMobileSheetResize = () => {
        if (this._mobileSheetResizeStartY === undefined) return;
        this._mobileSheetResizeStartY = undefined;
        this.setState({ isResizingMobileSheet: false });
        document.body.style.cursor = '';
        document.body.style.userSelect = '';
        window.removeEventListener('mousemove', this.handleMobileSheetResizeMove);
        window.removeEventListener('mouseup', this.stopMobileSheetResize);
        window.removeEventListener('touchmove', this.handleMobileSheetResizeMove);
        window.removeEventListener('touchend', this.stopMobileSheetResize);
        this.saveLayoutPrefs();
    }

    // 📱 'all' 모드 세로 리사이저 - 지도 ↔ 채팅(아래): 채팅이 아래쪽이라 위로 끌수록 넓어짐
    startMobileChatResize = (e) => {
        e.preventDefault();
        const clientY = e.touches ? e.touches[0].clientY : e.clientY;
        this._mobileChatResizeStartY = clientY;
        this._mobileChatResizeStartHeight = this.state.mobileChatHeight;
        this.setState({ isResizingMobileChat: true });
        document.body.style.cursor = 'row-resize';
        document.body.style.userSelect = 'none';
        window.addEventListener('mousemove', this.handleMobileChatResizeMove);
        window.addEventListener('mouseup', this.stopMobileChatResize);
        window.addEventListener('touchmove', this.handleMobileChatResizeMove, { passive: false });
        window.addEventListener('touchend', this.stopMobileChatResize);
    }

    handleMobileChatResizeMove = (e) => {
        if (this._mobileChatResizeStartY === undefined) return;
        const clientY = e.touches ? e.touches[0].clientY : e.clientY;
        const delta = clientY - this._mobileChatResizeStartY;
        this.setState({ mobileChatHeight: this.clampMobileChatHeight(this._mobileChatResizeStartHeight - delta) });
        if (e.cancelable) e.preventDefault();
    }

    stopMobileChatResize = () => {
        if (this._mobileChatResizeStartY === undefined) return;
        this._mobileChatResizeStartY = undefined;
        this.setState({ isResizingMobileChat: false });
        document.body.style.cursor = '';
        document.body.style.userSelect = '';
        window.removeEventListener('mousemove', this.handleMobileChatResizeMove);
        window.removeEventListener('mouseup', this.stopMobileChatResize);
        window.removeEventListener('touchmove', this.handleMobileChatResizeMove);
        window.removeEventListener('touchend', this.stopMobileChatResize);
        this.saveLayoutPrefs();
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

    // 이동 가능한 실제 캐릭터/몬스터 토큰만 (핀은 제외)
    getCompressedMapText = () => {
        const { mapState } = this.state;
        const tokens = (mapState?.tokens || []).filter(t => !t.isPin);
        if (tokens.length === 0) return '배치된 토큰 없음';

        const tokenSummary = tokens
            .map((t) => `${t.name || '토큰'}(${t.gridPos || `${t.x},${t.y}`}${t.hp ? `, HP:${t.hp}` : ''})`)
            .join(', ');

        return `전투지도 좌표: [ ${tokenSummary} ]`;
    };

    // 사용자가 지도 위에 직접 찍어둔 장소 이름표(핀) - 좌표 조회의 1순위 소스
    getCompressedPinsText = () => {
        const { mapState } = this.state;
        const pins = (mapState?.tokens || []).filter(t => t.isPin);
        if (pins.length === 0) return null;

        return pins.map((p) => `${p.name || '핀'}(${p.gridPos || `${p.x},${p.y}`})`).join(', ');
    };

    // 🤖 AI 응답의 token_moves(예: [{ token:"고블린 1", to:"C4" }])를 받아 실제 지도 토큰 좌표를 갱신한다.
    // 지도 이미지를 AI에게 보여주는 대신, 이미 시스템 프롬프트로 내려준 격자 좌표 텍스트를 AI가
    // 그대로 다시 되돌려주는 방식이므로 비전 호출/추가 API 왕복 없이(=API 사용량 추가 없이) 동작한다.
    applyTokenMoves = (moves) => {
        const { mapState } = this.state;
        if (!mapState || !Array.isArray(mapState.tokens) || mapState.tokens.length === 0) return;
        if (!Array.isArray(moves) || moves.length === 0) return;

        const gridSize = Math.max(10, mapState.gridSize || 56);
        const nextTokens = mapState.tokens.map(t => ({ ...t }));
        let changed = false;

        moves.forEach(move => {
            const targetName = String(move?.token || move?.name || '').trim();
            const targetPos = String(move?.to || move?.gridPos || '').trim();
            if (!targetName || !targetPos) return;

            const parsedPos = parseGridLabel(targetPos);
            if (!parsedPos) return;

            // 이름은 완전 일치를 우선하고, 없으면 부분 일치(대소문자 무시)로 찾는다.
            // 핀(장소 표식)은 좌표 "참조용"일 뿐 이동 대상이 아니므로 검색에서 제외한다.
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

        if (!changed) return;

        this.setState(prev => ({
            mapState : { ...prev.mapState, tokens : nextTokens, aiTokenUpdateAt : Date.now() }
        }), this.saveSession);
    };

    // 👹 AI 응답의 token_spawns(예: [{ name:"고블린 2", at:"D3", hp:7, maxHp:7 }])를 받아 지도에
    // 새 적/NPC 토큰을 생성한다. AI는 이미지를 만들 수 없으므로 이미지 없이(url 없이) 생성되고,
    // 사용자가 지도에서 그 토큰을 클릭해 직접 이미지를 넣게 된다(BattleMapPanel 쪽 처리).
    applyTokenSpawns = (spawns) => {
        const { mapState } = this.state;
        if (!mapState) return;
        if (!Array.isArray(spawns) || spawns.length === 0) return;

        const gridSize = Math.max(10, mapState.gridSize || 56);
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
              , name
              , x, y
              , gridPos : atLabel.toUpperCase()
              , size : gridSize
              , hp, maxHp
                // url 없음 - 지도에서 이 토큰을 클릭하면 사용자가 이미지를 첨부할 수 있다
            });
        });

        if (newTokens.length === 0) return;

        const nextTokens = [...(mapState.tokens || []), ...newTokens];
        this.setState(prev => ({
            mapState : { ...prev.mapState, tokens : nextTokens, aiTokenUpdateAt : Date.now() }
        }), this.saveSession);
    };

    // 📍 지도 표식(핀)을 새로 하나 추가한다 - 사용자가 직접 찍는 것과 동일한 데이터 모양이며,
    // AI가 지도 비전 조회로 찾아낸 위치를 영구히 기억시키는 데 쓴다(다음부터는 비전 호출 없이
    // 이 핀 좌표를 텍스트로 바로 참조한다).
    addMapPin = (name, x, y) => {
        const { mapState } = this.state;
        if (!mapState) return;

        const gridSize = Math.max(10, mapState.gridSize || 56);
        const newPin = {
            id : Date.now() + Math.random()
          , name
          , isPin : true
          , x, y
          , gridPos : calculateGridPos(x, y, gridSize)
          , size : Math.max(16, Math.round(gridSize * 0.6))
        };
        const nextTokens = [...(mapState.tokens || []), newPin];

        this.setState(prev => ({
            mapState : { ...prev.mapState, tokens : nextTokens, aiTokenUpdateAt : Date.now() }
        }), this.saveSession);
    };

    // 🔭 GM 응답이 텍스트만으로 좌표를 못 찾아 location_lookup을 채웠을 때만 호출되는, 드문 경우
    // 전용 보조 함수. 현재 활성 지도 "이미지"를 딱 한 번 Gemini에 보내 그 장소가 이미지 안 어디쯤
    // 있는지(가로/세로 몇 % 지점) 추정을 받아온 뒤, 이미 알고 있는 이미지 픽셀 크기·격자 크기로
    // 클라이언트에서 직접 격자 좌표를 계산한다 - AI에게 격자 좌표를 직접 맞히게 하지 않는 이유는
    // 격자선은 화면에서 CSS로 덧그린 것일 뿐 실제 지도 이미지 파일에는 없기 때문이다.
    resolveLocationViaVision = async (locationName) => {
        const { mapState, geminiApiKey, geminiModel } = this.state;
        const activeMap = mapState?.maps?.find(m => m.id === mapState.activeMapId);
        if (!activeMap?.url || !activeMap.width || !activeMap.height) return null;

        const match = /^data:([^;]+);base64,(.+)$/.exec(activeMap.url);
        if (!match) return null;
        const [, mimeType, base64] = match;

        const prompt = [
            '아래는 TRPG 전투지도 이미지다.'
          , `이 이미지 안에서 "${locationName}"라고 부를 만한 장소나 지형지물을 찾아라.`
          , '이미지 좌상단을 (0,0), 우하단을 (100,100)으로 볼 때, 그 장소의 중심이 가로로 몇 %(x_percent), 세로로 몇 %(y_percent) 지점인지 답하라.'
          , '이미지에서 해당 장소를 찾을 수 없거나 확신이 서지 않으면 found를 false로 답하고 x_percent/y_percent는 생략하라.'
        ].join('\n');

        try {
            const data = await callGemini({
                apiKey : geminiApiKey
              , model : geminiModel || DEFAULT_GEMINI_MODEL
              , contents : [{
                    role : 'user'
                  , parts : [
                        { text : prompt }
                      , { inlineData : { mimeType, data : base64 } }
                    ]
                }]
              , responseSchema : LOCATION_LOOKUP_SCHEMA
            });

            const { text } = splitResponseParts(data);
            const parsed = JSON.parse(text);
            if (!parsed.found) return null;

            const xPercent = Math.max(0, Math.min(100, Number(parsed.x_percent) || 0));
            const yPercent = Math.max(0, Math.min(100, Number(parsed.y_percent) || 0));
            const x = (xPercent / 100) * activeMap.width;
            const y = (yPercent / 100) * activeMap.height;

            return { x, y, gridPos : calculateGridPos(x, y, mapState.gridSize || 56) };
        } catch (e) {
            console.error('지도 장소 비전 조회 실패:', e);
            return null;
        }
    };

    handler = {
        changeSheetSubTab : (subTab) => {
            this.setState({ sheetSubTab : subTab });
        }
      , toggleSheetCollapsed : () => {
            this.setState(prev => ({ sheetCollapsed : !prev.sheetCollapsed }), this.saveLayoutPrefs);
        }
      , changeTab : (tab) => {
            this.setState({ activeTab : tab });
        }
      , setMobileViewMode : (mode) => {
            this.setState({ mobileViewMode : mode }, this.saveLayoutPrefs);
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
            this.gmHistory = normalizeGmHistory(parsed.gmHistory);
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
        // 🚫 이미 뭔가(이 시트에서든, 주사위 트레이에서든) 굴러가는 중이면 여기서 막는다.
        // isDiceRollInProgress()는 모듈 변수를 즉시 읽으므로 state(isRolling)가 아직 리렌더로
        // 반영되기 전의 아주 짧은 틈(연타)까지도 확실하게 막아준다. 능력치/기술/장비/주문 카드
        // 쪽 버튼도 isRolling일 때 비활성화되지만, 그건 눈에 보이는 방어일 뿐이고 실제 판정
        // 시작 여부는 여기서 최종적으로 걸러진다.
        if (isDiceRollInProgress()) return;
        if (this.rollTimer) clearInterval(this.rollTimer);
        this.setState({ isRolling : true, resultText : '굴리는 중...' });
        // 굴림 결과는 announceDiceResult로 DicePanel에 넘어가 거기서 화면에 표시~치우기까지
        // 담당한다 - "굴림 사이클"이 진짜로 끝나는 시점(결과가 완전히 사라진 뒤)은 이 함수가
        // 아니라 DicePanel의 presentResult가 endDiceCycle()로 알려준다. 그래서 여기서는
        // isRolling을 다시 false로 되돌리지 않는다 - 되돌리면 결과가 아직 화면에 떠 있는데
        // 버튼이 풀려서 또 눌리는 문제가 재발한다.
        beginDiceCycle();

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

        // isRolling은 여기서 false로 되돌리지 않는다(위 주석 참고) - DICE_ROLLING_EVENT를 통해
        // DicePanel이 결과 표시를 다 끝냈을 때 자동으로 false가 된다.
        this.setState({ diceValue : total, resultText });
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
        const { mapUrl1, mapUrl2, scenarioData, sessionState } = this.state;
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
          , '    "quests": ["현재 진행 중인 퀘스트/목표"],'
          , '    "landmarks": [{ "name": "동굴 입구 같은 장소/지형지물 이름", "gridPos": "그 장소의 격자 좌표(예: D5)" }]'
          , '  },'
          , '  "token_moves": [{ "token": "전투지도 토큰 이름(부분 일치 가능)", "to": "이동할 격자 좌표(예: C4) - 반드시 격자 좌표 형식" }],'
          , '  "token_spawns": [{ "name": "새로 등장하는 적/NPC 이름", "at": "등장 격자 좌표(예: D3)", "hp": 7, "maxHp": 7 }],'
          , '  "location_lookup": "좌표를 모르는 장소 이름 (없으면 생략)"'
          , '}'
          , '```'
          , '- 플레이어가 탐색, NPC 대화 등을 통해 중요 시나리오 정보/단서를 얻으면 session_state.clues 배열에 1줄 요약으로 누적 기록하십시오.'
          , '- token_moves는 전투지도에 실제로 배치된 토큰이 이번 턴에 이동했을 때만 채우고(이동이 없으면 빈 배열 [] 또는 생략), 아래 "전투지도 좌표"/"지도 표식(핀)" 목록에 없는 이름은 절대 지어내지 않는다.'
          , '- token_moves[].to는 항상 격자 좌표(예: C4)여야 하며 "동굴", "제단" 같은 장소 이름을 그대로 넣지 않는다. 장소 이름으로 이동 요청이 오면 아래 순서로 좌표를 찾는다: ① 지도 표식(핀) 목록 ② 아래 토큰 목록(장소 이름의 토큰이 있는 경우) ③ session_state.landmarks. 여기서 찾은 gridPos를 그대로 token_moves[].to에 사용한다.'
          , '- 위 ①~③ 어디에서도 좌표를 찾을 수 없는, 완전히 처음 언급되는 장소라면 **좌표를 추측하지 말고** 그 이동은 이번 턴에 보류한다(해당 token_moves는 만들지 않는다). 대신 최상위 응답에 "location_lookup"에 그 장소 이름을 그대로 채우고, narrative에는 "잠시 지도를 확인해보겠다" 같은 자연스러운 짧은 서술만 담는다 - 좌표는 시스템이 지도 이미지를 직접 보고 알려줄 것이다.'
          , '- session_state.landmarks: 지도 표식(핀)에 없던 장소의 좌표가 다른 경로(예: location_lookup 결과, 대화 중 사용자가 직접 알려줌)로 새로 확정되면 { name, gridPos }로 기록한다. landmarks는 매 응답마다 지금까지 확정된 항목을 전부 포함해 다시 보내라(clues/quests와 동일한 누적 방식). 한 번 정한 장소의 좌표는 이후에도 바꾸지 말고 일관되게 유지한다.'
          , '- token_spawns: 서술상 새로운 적/몬스터/NPC가 전투지도 위에 처음 등장하면(매복, 문이 열리며 나타남, 증원 등) 채운다. 이미 아래 "전투지도 좌표" 목록에 있는 토큰은 다시 spawn하지 말고 token_moves로 이동시켜라. 이름은 기존 토큰과 겹치지 않게 구분한다(예: 고블린이 이미 있으면 "고블린 2"). hp/maxHp는 판단이 서면 채우고, 모르면 생략해도 된다(기본값 30으로 생성됨).'
          , '- token_spawns로 생성된 토큰은 이미지 없이 지도에 나타나며, 사용자가 지도에서 직접 그 토큰을 눌러 이미지를 넣는다 - AI가 이미지를 만들거나 지정할 필요는 없다.'
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

        if (this.state.mapState?.tokens?.length > 0) {
            const pinsText = this.getCompressedPinsText();

            instructionParts.push('');
            instructionParts.push(`## ${this.getCompressedMapText()}`);
            instructionParts.push('- 위 좌표는 "열알파벳+행숫자"(예: C4 = C열 4행) 격자 표기이며, 지도 이미지가 아니라 이 텍스트가 곧 현재 지도 상태다.');
            instructionParts.push('- 전투/이동으로 위 토큰 중 하나가 실제로 자리를 옮기면, 응답 JSON의 token_moves에 { "token": "위 목록의 이름과 일치", "to": "새 격자 좌표" }를 담아 알려라. 그러면 지도 위 토큰이 그 좌표로 자동 이동한다.');

            if (pinsText) {
                instructionParts.push('');
                instructionParts.push(`## 지도 표식(핀) 좌표: [ ${pinsText} ]`);
                instructionParts.push('- 이 표식들은 사용자가 지도 위에 직접 찍어둔 "장소 이름 = 정확한 좌표" 목록이다. 장소 이름으로 이동 요청이 오면 가장 먼저 이 목록에서 찾아라 - 여기 있는 좌표는 다른 어떤 추측보다 정확하다.');
            }
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

        const historyText = gmAttachments.length > 0
            ? `${userMessage}\n[첨부 파일: ${gmAttachments.map(f => f.name).join(', ')}]`
            : userMessage;

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
            // this.gmHistory는 { role: 'user'|'assistant', text } 평문으로 보관하고, 요청 시점에
            // Gemini의 { role:'user'|'model', parts:[{text}] } 형식으로 변환해서 보낸다.
            const recentHistory = this.gmHistory.slice(-6);
            const requestContents = [
                ...recentHistory.map(turn => ({
                    role : turn.role === 'assistant' ? 'model' : 'user', parts : [{ text : turn.text }]
                }))
              , userContent(userMessage, gmAttachments)
            ];

            const data = await callGemini({
                apiKey : geminiApiKey, model : geminiModel || DEFAULT_GEMINI_MODEL
              , systemInstruction, contents : requestContents
              , responseSchema : GM_RESPONSE_SCHEMA
            }, handleRetryNotice);

            const { text, functionCalls } = splitResponseParts(data);

            // ⚠️ gmTools(gmFunctionDeclarations)가 비어 있어 API에 tools로 등록되지 않으므로
            // functionCalls는 항상 빈 배열이다 - 실제 시트 조작은 아래 JSON 파싱(narrative/
            // session_state/token_moves) 경로로만 이뤄진다.
            if (functionCalls && functionCalls.length > 0) {
                functionCalls.forEach(call => this.runGmTool(call.name, call.args || {}));
            }

            this.gmHistory.push({ role : 'user', text : historyText });
            this.gmHistory.push({ role : 'assistant', text : text || '' });
            if (this.gmHistory.length > 6) {
                this.gmHistory = this.gmHistory.slice(-6);
            }

            const newMessages = [];
            let locationLookupName = null;

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

                        if (Array.isArray(parsed.token_moves) && parsed.token_moves.length > 0) {
                            this.applyTokenMoves(parsed.token_moves);
                        }

                        if (Array.isArray(parsed.token_spawns) && parsed.token_spawns.length > 0) {
                            this.applyTokenSpawns(parsed.token_spawns);
                        }

                        if (typeof parsed.location_lookup === 'string' && parsed.location_lookup.trim()) {
                            locationLookupName = parsed.location_lookup.trim();
                        }
                    }
                } catch (e) {
                    parsedNarrative = text;
                }

                newMessages.push({ role : 'gm', text : parsedNarrative });
            }

            // 🔭 GM이 텍스트만으로는 좌표를 못 찾아 location_lookup을 채운, 드문 경우에만 지도
            // 이미지를 1회 조회한다 - 평소 대화 흐름은 이 블록에 들어오지 않는다(usage 영향 없음).
            if (locationLookupName) {
                const found = await this.resolveLocationViaVision(locationLookupName);
                if (found) {
                    this.setState(prev => {
                        const prevLandmarks = prev.sessionState?.landmarks || [];
                        return {
                            sessionState : {
                                ...prev.sessionState
                              , landmarks : [
                                    ...prevLandmarks.filter(l => l.name !== locationLookupName)
                                  , { name : locationLookupName, gridPos : found.gridPos }
                                ]
                            }
                        };
                    });
                    this.addMapPin(locationLookupName, found.x, found.y);
                    newMessages.push({
                        role : 'system'
                      , text : `📍 지도에서 "${locationLookupName}"의 위치를 찾아 표식(${found.gridPos})을 추가했습니다. 같은 요청을 다시 말씀해 주세요!`
                    });
                } else {
                    newMessages.push({
                        role : 'system'
                      , text : `⚠️ 지도에서 "${locationLookupName}"을(를) 찾지 못했습니다. 지도에서 [📍 핀 찍기]로 직접 위치를 표시해 주시면 이후로는 정확히 인식합니다.`
                    });
                }
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
            sheetSubTab, isUploadActive, rawInput, charData, themeKey, inspiration, usedFeatures, usedSpellSlots
          , hitEffectKey, mapState
          , geminiApiKey, geminiModel, showGmSettings, gmMessages, gmInput, isGmLoading, gmAttachments
          , scenarioUrl, mapUrl1, mapUrl2, isFetchLoading, scenarioData
          , sheetCollapsed, sheetWidth, isResizingSheet, chatWidth, isResizingChat, isMobile, activeTab
          , mobileViewMode, mobileSheetHeight, isResizingMobileSheet, mobileChatHeight, isResizingMobileChat
          , viewportHeight, viewportTop, isRolling
        } = this.state;
        const themeVars = themeToCssVars(themeKey);
        const hasWorkspace = !!charData;

        const subTabList = [
            { id: 'abilities', label: '🏋️ 능력치' },
            { id: 'spells', label: '✨ 주문 & 특성' },
            { id: 'skills', label: '🎯 숙련 기술' },
            { id: 'equipment', label: '⚔️ 장비 착용' },
            { id: 'traits', label: '🧬 종족 & 배경 특성' },
            { id: 'inventory', label: '🎒 소지품 & 결점' },
        ];

        // 🔝 헤더 바 - 워크스페이스(지도 메인) 화면과 업로드 전 화면에서 공용으로 사용
        const headerRow = (
            <div className="flex items-center justify-between gap-2 shrink-0">
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
        );

        // 📜 캐릭터 시트 본문(헤더 카드 ~ 서브탭 콘텐츠) - 좌측 접이식 패널 안에서만 사용
        const sheetBody = hasWorkspace && (
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
                        isRolling={isRolling}
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
                        isRolling={isRolling}
                    />
                )}

                {sheetSubTab === 'skills' && (
                    <SkillsCard
                        skills={charData.skills}
                        onRollCheck={this.handler.rollCheck}
                        isRolling={isRolling}
                    />
                )}

                {sheetSubTab === 'equipment' && (
                    <EquipmentCard
                        equipmentSlots={charData.equipmentSlots}
                        onRollDamage={this.handler.rollWeaponDamage}
                        onShowInfo={this.handler.showEquipInfo}
                        isRolling={isRolling}
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
        );

        // 📤 업로드(다른 캐릭터 불러오기) 모달 - 데스크탑/모바일 워크스페이스 공용
        const uploadModal = isUploadActive && (
            <div
                className="fixed inset-0 z-[60] flex items-start justify-center overflow-y-auto p-4 bg-black/60"
                onClick={this.handler.toggleUploadActive}
            >
                <div className="relative w-full max-w-xl mt-10" onClick={(e) => e.stopPropagation()}>
                    <button
                        type="button"
                        onClick={this.handler.toggleUploadActive}
                        className="absolute -top-3 -right-3 flex h-7 w-7 items-center justify-center rounded-full text-white shadow-lg"
                        style={{ backgroundColor : 'var(--accent-color)' }}
                        title="닫기"
                    >
                        <XIcon size={14}/>
                    </button>
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
                </div>
            </div>
        );

        // ⌨️ 워크스페이스일 때만 visualViewport 기반 실제 높이/오프셋을 강제한다
        // (모바일에서 키보드가 올라와도 fixed 컨테이너가 실제 보이는 영역만큼만 차지하도록)
        const workspaceStyle = hasWorkspace
            ? { ...themeVars, height : viewportHeight ? `${viewportHeight}px` : undefined, top : viewportTop || 0 }
            : themeVars;

        return (
            <div
                key={`hit-${hitEffectKey}`}
                className={`bg-[var(--bg-color)] ${hitEffectKey > 0 ? 'cs-hit-effect' : ''} ${hasWorkspace ? 'fixed inset-0 z-[55] overflow-hidden flex flex-col p-2.5 gap-2.5' : 'p-3'}`}
                style={workspaceStyle}
            >
                {hasWorkspace && isMobile ? (
                    <>
                        {headerRow}

                        {/* 📱 모바일 보기 모드 전환: 탭으로 하나씩 보기 ↔ 지도가 메인인 상하 배치로 전부 보기 */}
                        <div className="flex gap-1 rounded-xl p-1 shrink-0" style={{ backgroundColor : 'var(--tag-bg)' }}>
                            {[
                                { id : 'tabs', icon : '🗂️', label : '탭으로 전환' }
                              , { id : 'all', icon : '🧩', label : '한 화면에 전부' }
                            ].map(mode => (
                                <button
                                    key={mode.id}
                                    type="button"
                                    onClick={() => this.handler.setMobileViewMode(mode.id)}
                                    className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 ${
                                        mobileViewMode === mode.id
                                            ? 'bg-[var(--card-bg)] text-[var(--accent-color)] shadow-sm'
                                            : 'text-[var(--text-muted)] hover:text-[var(--text-main)]'
                                    }`}
                                >
                                    <span>{mode.icon}</span>
                                    <span>{mode.label}</span>
                                </button>
                            ))}
                        </div>

                        {mobileViewMode === 'tabs' && (
                        <>
                        {/* 🗂️ 탭 모드: 화면이 좁아 3분할이 어려우므로 기존처럼 탭으로 GM 대화 / 시트 / 지도를 전환.
                            탭 밖(페이지)은 스크롤되지 않고, 선택된 패널 하나만 남은 높이를 꽉 채워 그 안에서 스크롤된다. */}
                        <div className="flex gap-1 rounded-xl p-1 shrink-0" style={{ backgroundColor : 'var(--tag-bg)' }}>
                            {[
                                { id : 'chat', icon : '🎲', label : 'GM 대화' }
                              , { id : 'sheet', icon : '📜', label : '캐릭터 시트' }
                              , { id : 'map', icon : '🗺️', label : '전투 지도' }
                            ].map(tab => (
                                <button
                                    key={tab.id}
                                    type="button"
                                    onClick={() => this.handler.changeTab(tab.id)}
                                    className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 ${
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

                        <div className="flex-1 min-h-0">
                            {activeTab === 'chat' && (
                                <div className="h-full min-h-0">
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
                                </div>
                            )}

                            {activeTab === 'sheet' && (
                                <div className="cs-scroll h-full min-h-0 overflow-y-auto rounded-xl border bg-[var(--card-bg)] p-2.5 flex flex-col gap-3" style={{ borderColor : 'var(--border-color)' }}>
                                    {sheetBody}
                                </div>
                            )}

                            {activeTab === 'map' && (
                                <div className="h-full min-h-0">
                                    <BattleMapPanel
                                        mapState={mapState}
                                        isMobile={isMobile}
                                        onUpdateMapState={(newMapState) => {
                                            this.setState({ mapState : newMapState }, this.saveSession);
                                        }}
                                    />
                                </div>
                            )}
                        </div>
                        </>
                        )}

                        {mobileViewMode === 'all' && (
                            // 🧩 한 화면 모드: 지도가 메인, 웹처럼 좌우가 아니라 상하로 쌓는다
                            // (시트 접기/펼치기, 시트↔지도, 지도↔채팅 사이 모두 세로 리사이저)
                            // 채팅을 맨 아래 두되, 컨테이너 높이 자체를 visualViewport에 맞춰 갱신하므로
                            // 모바일 키보드가 올라와도 입력창이 키보드 위에 그대로 남는다
                            <div ref={this.mobileStackRef} className="flex-1 min-h-0 flex flex-col">
                                {/* 📜 캐릭터 시트 - 접기/펼치기 */}
                                <div
                                    className={`shrink-0 ${isResizingMobileSheet ? '' : 'transition-[height] duration-200 ease-out'} ${sheetCollapsed ? 'h-11' : ''}`}
                                    style={sheetCollapsed ? undefined : { height : mobileSheetHeight, minHeight : MIN_MOBILE_SHEET_HEIGHT }}
                                >
                                    <div
                                        className="h-full min-h-0 flex flex-col rounded-xl border bg-[var(--card-bg)] overflow-hidden"
                                        style={{ borderColor : 'var(--border-color)' }}
                                    >
                                        <button
                                            type="button"
                                            onClick={this.handler.toggleSheetCollapsed}
                                            className="shrink-0 flex items-center gap-1.5 px-3 py-2.5 text-xs font-bold border-b hover:opacity-80 transition-opacity"
                                            style={{ color : 'var(--accent-color)', borderColor : 'var(--border-color)' }}
                                            title={sheetCollapsed ? '캐릭터 시트 펼치기' : '캐릭터 시트 접기'}
                                        >
                                            {sheetCollapsed ? <ChevronDownIcon size={15}/> : <ChevronUpIcon size={15}/>}
                                            <span>📜 캐릭터 시트</span>
                                        </button>

                                        {!sheetCollapsed && (
                                            <div className="cs-scroll flex-1 min-h-0 overflow-y-auto p-2.5 flex flex-col gap-3">
                                                {sheetBody}
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* ↕️ 시트/지도 리사이저 - 시트를 펼쳤을 때만 드래그로 동작, 접혔을 땐 여백 역할만 */}
                                <div
                                    className={`shrink-0 h-5 w-full flex items-center justify-center ${sheetCollapsed ? '' : `cs-resizer-v cursor-row-resize ${isResizingMobileSheet ? 'is-active' : ''}`}`}
                                    onMouseDown={sheetCollapsed ? undefined : this.startMobileSheetResize}
                                    onTouchStart={sheetCollapsed ? undefined : this.startMobileSheetResize}
                                    title={sheetCollapsed ? undefined : '드래그해서 캐릭터 시트/지도 높이를 조절하세요'}
                                >
                                    {!sheetCollapsed && <div className="cs-resizer-bar-v"/>}
                                </div>

                                {/* 🗺️ 전투 지도 - 메인, 남는 공간을 전부 차지 */}
                                <div className="flex-1 min-h-[160px]">
                                    <BattleMapPanel
                                        mapState={mapState}
                                        isMobile={isMobile}
                                        onUpdateMapState={(newMapState) => {
                                            this.setState({ mapState : newMapState }, this.saveSession);
                                        }}
                                    />
                                </div>

                                {/* ↕️ 지도/채팅 리사이저 */}
                                <div
                                    className={`cs-resizer-v shrink-0 h-5 w-full flex items-center justify-center cursor-row-resize ${isResizingMobileChat ? 'is-active' : ''}`}
                                    onMouseDown={this.startMobileChatResize}
                                    onTouchStart={this.startMobileChatResize}
                                    title="드래그해서 지도/채팅 높이를 조절하세요"
                                >
                                    <div className="cs-resizer-bar-v"/>
                                </div>

                                {/* 💬 GM 채팅 - 맨 아래 고정(채팅방 스타일), 키보드 위로 자연스럽게 붙는다 */}
                                <div className="shrink-0" style={{ height : mobileChatHeight, minHeight : MIN_MOBILE_CHAT_HEIGHT }}>
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
                                </div>
                            </div>
                        )}

                        {uploadModal}
                    </>
                ) : hasWorkspace ? (
                    <>
                        {headerRow}

                        {/* 🖥️ 데스크탑: 지도가 메인인 GM 작업 화면 - 좌측 접이식 캐릭터 시트 + 중앙(최대) 전투 지도 + 우측 채팅방
                            지도↔채팅 사이 리사이저로 폭을 서로 밀고 당길 수 있고, 페이지 자체는 절대 스크롤되지 않는다
                            (fixed inset-0 + overflow-hidden, 각 패널만 내부에서 개별 스크롤) */}
                        <div className="flex-1 min-h-0 flex overflow-x-auto">
                            {/* 📜 캐릭터 시트 - 접기/펼치기 */}
                            <div
                                className={`h-full min-h-0 shrink-0 ${isResizingSheet ? '' : 'transition-[width] duration-200 ease-out'} ${sheetCollapsed ? 'w-11' : ''}`}
                                style={sheetCollapsed ? undefined : { width : sheetWidth, minWidth : MIN_SHEET_WIDTH }}
                            >
                                <div
                                    className="h-full min-h-0 flex flex-col rounded-xl border bg-[var(--card-bg)] overflow-hidden"
                                    style={{ borderColor : 'var(--border-color)' }}
                                >
                                    <button
                                        type="button"
                                        onClick={this.handler.toggleSheetCollapsed}
                                        className="shrink-0 flex items-center gap-1.5 px-3 py-2.5 text-xs font-bold border-b hover:opacity-80 transition-opacity"
                                        style={{ color : 'var(--accent-color)', borderColor : 'var(--border-color)' }}
                                        title={sheetCollapsed ? '캐릭터 시트 펼치기' : '캐릭터 시트 접기'}
                                    >
                                        {sheetCollapsed ? <ChevronRightIcon size={15}/> : <ChevronLeftIcon size={15}/>}
                                        {!sheetCollapsed && <span>📜 캐릭터 시트</span>}
                                    </button>

                                    {!sheetCollapsed && (
                                        <div className="cs-scroll flex-1 min-h-0 overflow-y-auto p-2.5 flex flex-col gap-3">
                                            {sheetBody}
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* ↔️ 시트/지도 크기 조절 리사이저 - 시트를 펼쳤을 때만 드래그로 동작, 접혔을 땐 여백 역할만 */}
                            <div
                                className={`shrink-0 w-3 h-full flex items-center justify-center ${sheetCollapsed ? '' : `cs-resizer cursor-col-resize ${isResizingSheet ? 'is-active' : ''}`}`}
                                onMouseDown={sheetCollapsed ? undefined : this.startSheetResize}
                                onTouchStart={sheetCollapsed ? undefined : this.startSheetResize}
                                title={sheetCollapsed ? undefined : '드래그해서 캐릭터 시트/지도 크기를 조절하세요'}
                            >
                                {!sheetCollapsed && <div className="cs-resizer-bar"/>}
                            </div>

                            {/* 🗺️ 전투 지도(메인, 최대한 넓게) + 💬 GM 채팅(우측, 채팅방 스타일) */}
                            <div className="flex-1 min-w-[420px] h-full min-h-0 flex">
                                <div className="flex-1 min-w-[280px] h-full min-h-0">
                                    <BattleMapPanel
                                        mapState={mapState}
                                        isMobile={isMobile}
                                        onUpdateMapState={(newMapState) => {
                                            this.setState({ mapState : newMapState }, this.saveSession);
                                        }}
                                    />
                                </div>

                                {/* ↔️ 지도/채팅 크기 조절 리사이저 */}
                                <div
                                    className={`cs-resizer shrink-0 w-3 h-full flex items-center justify-center cursor-col-resize ${isResizingChat ? 'is-active' : ''}`}
                                    onMouseDown={this.startChatResize}
                                    onTouchStart={this.startChatResize}
                                    title="드래그해서 지도/채팅 크기를 조절하세요"
                                >
                                    <div className="cs-resizer-bar"/>
                                </div>

                                <div
                                    className="shrink-0 h-full min-h-0"
                                    style={{ width : chatWidth, minWidth : MIN_CHAT_WIDTH }}
                                >
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
                                </div>
                            </div>
                        </div>

                        {uploadModal}
                    </>
                ) : (
                    <div className="max-w-[650px] mx-auto flex flex-col gap-3">
                        {headerRow}

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

                        {!isUploadActive && (
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
                    </div>
                )}
            </div>
        );
    }
}

export default withNavigate(CharacterSheetManager);
/**
 * IronswornManager : Ironsworn TRPG 어시스턴트 메인 화면
 *  - 데스크탑: 화면 전체를 잡고 좌(캐릭터+서약) | 우(무브/오라클/GM) 2분할
 *  - 모바일: 탭 전환
 */
import { Component } from 'react';
import withNavigate from '../../utils/withNavigate';
import { themeToCssVars } from '../../characterSheet/resource/dataSet/themes';
import { callGemini, splitResponseParts, userTextPart } from '../../characterSheet/service/geminiService';
import {
    INITIAL_CHARACTER, INITIAL_VOW, STORAGE_KEY, STORAGE_KEY_GM
} from '../resource/dataSet/gameData';
import {
    GEMINI_KEY_STORAGE, GEMINI_MODEL_STORAGE, DEFAULT_GEMINI_MODEL,
    GM_RESPONSE_SCHEMA, buildSystemInstruction
} from '../resource/dataSet/gmConfig';
import CharacterPanel from '../component/CharacterPanel';
import VowTracker from '../component/VowTracker';
import MovePanel from '../component/MovePanel';
import OraclePanel from '../component/OraclePanel';
import IronswornGmChat from '../component/IronswornGmChat';
import '../resource/CSS/ironsworn.css';

const MOBILE_TABS = [
    { key: 'character', label: '캐릭터',    icon: '⚔️' }
  , { key: 'vows',      label: '서약/진행', icon: '📜' }
  , { key: 'moves',     label: '무브',      icon: '🎲' }
  , { key: 'oracle',    label: '오라클',    icon: '🔮' }
  , { key: 'gm',        label: 'AI GM',    icon: '🤖' }
];

const RIGHT_TABS = [
    { key: 'moves',  label: '무브',   icon: '🎲' }
  , { key: 'oracle', label: '오라클', icon: '🔮' }
  , { key: 'gm',     label: 'AI GM', icon: '🤖' }
];

const LEFT_TABS = [
    { key: 'character', label: '캐릭터',    icon: '⚔️' }
  , { key: 'vows',      label: '서약/진행', icon: '📜' }
];

const MOBILE_BREAKPOINT = 768;

class IronswornManager extends Component {
    constructor(props) {
        super(props);
        this.mobileMql = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT}px)`);
        this.state = {
            activeTab: 'character'
          , leftTab: 'character'
          , rightTab: 'gm'
          , isMobile: this.mobileMql.matches
          , char: { ...INITIAL_CHARACTER }
          , vows: []
          , theme: 'classic'
          , apiKey: localStorage.getItem(GEMINI_KEY_STORAGE) || ''
          , model: localStorage.getItem(GEMINI_MODEL_STORAGE) || DEFAULT_GEMINI_MODEL
          , gmMessages: []
          , gmInput: ''
          , gmLoading: false
          , gmHistory: []
          , gmShowSettings: false
          , worldState: null
        };
    }

    componentDidMount() {
        this.mobileMql.addEventListener('change', this.handleMediaChange);

        try {
            const saved = localStorage.getItem(STORAGE_KEY);
            if (saved) {
                const data = JSON.parse(saved);
                this.setState({
                    char: { ...INITIAL_CHARACTER, ...data.char }
                  , vows: data.vows || []
                });
            }
        } catch { /* ignore */ }

        try {
            const gmSaved = localStorage.getItem(STORAGE_KEY_GM);
            if (gmSaved) {
                const data = JSON.parse(gmSaved);
                this.setState({
                    gmMessages: data.messages || []
                  , gmHistory: data.history || []
                  , worldState: data.worldState || null
                });
            }
        } catch { /* ignore */ }
    }

    componentWillUnmount() {
        this.mobileMql.removeEventListener('change', this.handleMediaChange);
    }

    handleMediaChange = (e) => this.setState({ isMobile: e.matches });

    // ──────── 저장 ────────
    save = () => {
        const { char, vows } = this.state;
        localStorage.setItem(STORAGE_KEY, JSON.stringify({ char, vows }));
    };

    saveGm = () => {
        const { gmMessages, gmHistory, worldState } = this.state;
        localStorage.setItem(STORAGE_KEY_GM, JSON.stringify({
            messages: gmMessages, history: gmHistory, worldState
        }));
    };

    // ──────── 캐릭터 ────────
    handleCharChange = (char) => {
        this.setState({ char }, this.save);
    };

    // ──────── 서약 ────────
    handleVowAdd = () => {
        this.setState(prev => ({
            vows: [...prev.vows, { ...INITIAL_VOW, title: `서약 ${prev.vows.length + 1}` }]
        }), this.save);
    };
    handleVowUpdate = (idx, vow) => {
        this.setState(prev => {
            const vows = [...prev.vows];
            vows[idx] = vow;
            return { vows };
        }, this.save);
    };
    handleVowRemove = (idx) => {
        this.setState(prev => ({
            vows: prev.vows.filter((_, i) => i !== idx)
        }), this.save);
    };

    // ──────── 주사위 결과 → GM 알림 ────────
    handleRollResult = (rollData) => {
        const statLabel = rollData.statKey === 'progress' ? '진행도' : rollData.statKey;
        const matchText = rollData.match ? ' (매치!)' : '';
        const text = rollData.actionDie != null
            ? `[판정] ${statLabel}(${rollData.statValue}) 액션 ${rollData.actionDie}+${rollData.statValue}=${rollData.actionScore} vs 도전 ${rollData.challenge1}, ${rollData.challenge2} → ${rollData.label}${matchText}`
            : `[진행도 판정] 진행도 ${rollData.actionScore} vs 도전 ${rollData.challenge1}, ${rollData.challenge2} → ${rollData.label}${matchText}`;

        this.setState(prev => ({
            gmMessages: [...prev.gmMessages, { role: 'system', text }]
        }), this.saveGm);
    };

    // ──────── 오라클 결과 → GM 알림 ────────
    handleOracleResult = (entry) => {
        const text = `[오라클: ${entry.table}] ${entry.result}`;
        this.setState(prev => ({
            gmMessages: [...prev.gmMessages, { role: 'system', text }]
        }), this.saveGm);
    };

    // ──────── GM 채팅 ────────
    handleChangeApiKey = (apiKey) => {
        localStorage.setItem(GEMINI_KEY_STORAGE, apiKey);
        this.setState({ apiKey });
    };
    handleChangeModel = (model) => {
        localStorage.setItem(GEMINI_MODEL_STORAGE, model);
        this.setState({ model });
    };

    handleGmSend = async () => {
        const { apiKey, model, gmInput, gmHistory, char, worldState } = this.state;
        if (!apiKey || !gmInput.trim()) return;

        const userMsg = gmInput.trim();
        this.setState(prev => ({
            gmMessages: [...prev.gmMessages, { role: 'user', text: userMsg }]
          , gmInput: ''
          , gmLoading: true
        }));

        const newHistory = [...gmHistory, userTextPart(userMsg)];

        try {
            const systemInstruction = buildSystemInstruction(char, worldState);
            const data = await callGemini({
                apiKey, model
              , systemInstruction
              , contents: newHistory
              , responseSchema: GM_RESPONSE_SCHEMA
            });

            const { text, modelContent } = splitResponseParts(data);
            let narrative = text;
            let newWorldState = worldState;

            try {
                const parsed = JSON.parse(text);
                narrative = parsed.narrative || text;
                if (parsed.world_state) newWorldState = parsed.world_state;
                if (parsed.move_suggestion) narrative += `\n\n💡 추천 무브: ${parsed.move_suggestion}`;
            } catch { /* plain text */ }

            const updatedHistory = [...newHistory, modelContent];

            this.setState(prev => ({
                gmMessages: [...prev.gmMessages, { role: 'model', text: narrative }]
              , gmHistory: updatedHistory
              , gmLoading: false
              , worldState: newWorldState
            }), this.saveGm);
        } catch (err) {
            this.setState(prev => ({
                gmMessages: [...prev.gmMessages, { role: 'system', text: `⚠️ 오류: ${err.message}` }]
              , gmLoading: false
            }));
        }
    };

    handleExportLogs = () => {
        const { gmMessages, char } = this.state;
        const lines = gmMessages.map(m => {
            const prefix = m.role === 'user' ? '[나]' : m.role === 'model' ? '[GM]' : '[시스템]';
            return `${prefix} ${m.text}`;
        });
        const blob = new Blob(
            [`Ironsworn 세션 로그 - ${char.name || '이름 없음'}\n${'='.repeat(40)}\n\n${lines.join('\n\n')}`]
          , { type: 'text/plain;charset=utf-8' }
        );
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = `ironsworn_log_${Date.now()}.txt`;
        a.click();
        URL.revokeObjectURL(a.href);
    };

    handleResetGm = () => {
        this.setState({ gmMessages: [], gmHistory: [], worldState: null }, this.saveGm);
    };

    // ──────── 패널 렌더 헬퍼 ────────
    renderPanel = (key) => {
        const { char, vows, apiKey, model, gmMessages, gmInput, gmLoading, gmShowSettings } = this.state;
        switch (key) {
            case 'character':
                return <CharacterPanel char={char} onChange={this.handleCharChange} />;
            case 'vows':
                return (
                    <VowTracker
                        vows={vows}
                        onUpdate={this.handleVowUpdate}
                        onAdd={this.handleVowAdd}
                        onRemove={this.handleVowRemove}
                    />
                );
            case 'moves':
                return <MovePanel char={char} onRollResult={this.handleRollResult} />;
            case 'oracle':
                return <OraclePanel onOracleResult={this.handleOracleResult} />;
            case 'gm':
                return (
                    <IronswornGmChat
                        apiKey={apiKey}
                        model={model}
                        onChangeApiKey={this.handleChangeApiKey}
                        onChangeModel={this.handleChangeModel}
                        messages={gmMessages}
                        inputValue={gmInput}
                        onChangeInput={(v) => this.setState({ gmInput: v })}
                        onSend={this.handleGmSend}
                        isLoading={gmLoading}
                        showSettings={gmShowSettings}
                        onToggleSettings={() => this.setState(p => ({ gmShowSettings: !p.gmShowSettings }))}
                        onExportLogs={this.handleExportLogs}
                    />
                );
            default:
                return null;
        }
    };

    renderTabBar = (tabs, activeKey, onSelect) => (
        <div className="flex gap-0.5 shrink-0">
            {tabs.map(t => (
                <button
                    key={t.key}
                    onClick={() => onSelect(t.key)}
                    className="flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-lg font-bold whitespace-nowrap transition-all"
                    style={{
                        backgroundColor: activeKey === t.key ? 'rgba(217,119,6,0.2)' : 'transparent'
                      , color: activeKey === t.key ? '#d97706' : 'var(--text-muted)'
                      , border: activeKey === t.key ? '1px solid rgba(217,119,6,0.4)' : '1px solid transparent'
                    }}
                >
                    <span>{t.icon}</span>
                    <span>{t.label}</span>
                </button>
            ))}
        </div>
    );

    render() {
        const { activeTab, leftTab, rightTab, isMobile, char, theme } = this.state;
        const cssVars = themeToCssVars(theme);

        const headerBar = (
            <div className="shrink-0 px-4 py-2.5 flex justify-between items-center"
                 style={{ background: 'linear-gradient(135deg, #78350f, #451a03)', borderBottom: '1px solid rgba(217,119,6,0.3)' }}>
                <div className="flex items-center gap-3">
                    <button onClick={() => this.props.navigate('/')}
                        className="text-sm px-2 py-1 rounded hover:opacity-80"
                        style={{ color: '#fbbf24' }}>← 홈</button>
                    <span className="text-base font-black" style={{ color: '#fbbf24' }}>IRONSWORN</span>
                    {char.name && (
                        <span className="text-xs" style={{ color: 'rgba(251,191,36,0.7)' }}>— {char.name}</span>
                    )}
                </div>
                <button onClick={this.handleResetGm}
                    className="text-[0.65rem] px-2 py-1 rounded"
                    style={{ color: '#fca5a5', border: '1px solid rgba(252,165,165,0.3)' }}>
                    GM 초기화
                </button>
            </div>
        );

        // ──────── 모바일 ────────
        if (isMobile) {
            return (
                <div className="fixed inset-0 z-[55] flex flex-col overflow-hidden"
                     style={{ ...cssVars, backgroundColor: 'var(--bg-color)' }}>
                    {headerBar}

                    <div className="flex gap-0.5 px-2 py-1.5 overflow-x-auto is-scroll shrink-0"
                         style={{ borderBottom: '1px solid var(--border-color)' }}>
                        {this.renderTabBar(MOBILE_TABS, activeTab, (k) => this.setState({ activeTab: k }))}
                    </div>

                    <div className="flex-1 min-h-0 overflow-y-auto is-scroll p-3">
                        {this.renderPanel(activeTab)}
                    </div>
                </div>
            );
        }

        // ──────── 데스크탑: 좌 | 우 2분할 ────────
        return (
            <div className="fixed inset-0 z-[55] flex flex-col overflow-hidden"
                 style={{ ...cssVars, backgroundColor: 'var(--bg-color)' }}>
                {headerBar}

                <div className="flex-1 min-h-0 flex gap-2.5 p-2.5">
                    {/* 좌측 패널: 캐릭터 + 서약 */}
                    <div className="flex flex-col gap-2 h-full min-h-0" style={{ width: '42%', minWidth: 340 }}>
                        {this.renderTabBar(LEFT_TABS, leftTab, (k) => this.setState({ leftTab: k }))}
                        <div className="flex-1 min-h-0 overflow-y-auto is-scroll rounded-xl border p-3"
                             style={{ borderColor: 'var(--border-color)', backgroundColor: 'var(--card-bg)' }}>
                            {this.renderPanel(leftTab)}
                        </div>
                    </div>

                    {/* 우측 패널: 무브 / 오라클 / GM */}
                    <div className="flex flex-col gap-2 flex-1 h-full min-h-0" style={{ minWidth: 360 }}>
                        {this.renderTabBar(RIGHT_TABS, rightTab, (k) => this.setState({ rightTab: k }))}
                        <div className="flex-1 min-h-0 overflow-y-auto is-scroll rounded-xl border p-3"
                             style={{
                                 borderColor: 'var(--border-color)'
                               , backgroundColor: rightTab === 'gm' ? 'transparent' : 'var(--card-bg)'
                             }}>
                            {this.renderPanel(rightTab)}
                        </div>
                    </div>
                </div>
            </div>
        );
    }
}

export default withNavigate(IronswornManager);

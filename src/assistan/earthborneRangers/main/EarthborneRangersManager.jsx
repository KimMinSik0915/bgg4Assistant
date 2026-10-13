import { Component } from 'react';
import { MapIcon, LayersIcon, DownloadIcon, UploadCloudIcon, RotateCcw, ArrowLeft } from 'lucide-react';
import withNavigate from '../../utils/withNavigate';
import { themeToCssVars, THEME_KEYS } from '../../characterSheet/resource/dataSet/themes';
import { INITIAL_CAMPAIGN_STATE, INITIAL_DECK_STATE, STORAGE_KEY_CAMPAIGN, STORAGE_KEY_DECK } from '../resource/dataSet/gameData';
import CampaignTracker from '../component/CampaignTracker';
import DeckManager from '../component/DeckManager';
import '../resource/CSS/earthborneRangers.css';

/**
 * @Author : 김민식
 * EarthborneRangersManager : 어스본레인져스 캠페인 & 덱 관리 보조도구
 */
class EarthborneRangersManager extends Component {

    state = {
        activeTab: 'campaign',
        themeKey: THEME_KEYS.CLASSIC,
        campaign: { ...INITIAL_CAMPAIGN_STATE },
        decks: [{ ...INITIAL_DECK_STATE }],
        activeDeckIndex: 0,
    };

    componentDidMount() {
        const savedCampaign = window.localStorage.getItem(STORAGE_KEY_CAMPAIGN);
        if (savedCampaign) {
            try {
                const parsed = JSON.parse(savedCampaign);
                this.setState({ campaign: { ...INITIAL_CAMPAIGN_STATE, ...parsed } });
            } catch (e) {
                console.error('캠페인 데이터 복원 실패:', e);
            }
        }

        const savedDecks = window.localStorage.getItem(STORAGE_KEY_DECK);
        if (savedDecks) {
            try {
                const parsed = JSON.parse(savedDecks);
                if (Array.isArray(parsed) && parsed.length > 0) {
                    this.setState({ decks: parsed.map(d => ({ ...INITIAL_DECK_STATE, ...d })) });
                }
            } catch (e) {
                console.error('덱 데이터 복원 실패:', e);
            }
        }
    }

    saveCampaign = () => {
        try {
            window.localStorage.setItem(STORAGE_KEY_CAMPAIGN, JSON.stringify(this.state.campaign));
        } catch (e) {
            console.error('캠페인 저장 실패:', e);
        }
    };

    saveDecks = () => {
        try {
            window.localStorage.setItem(STORAGE_KEY_DECK, JSON.stringify(this.state.decks));
        } catch (e) {
            console.error('덱 저장 실패:', e);
        }
    };

    handleCampaignUpdate = (newCampaign) => {
        this.setState({ campaign: newCampaign }, this.saveCampaign);
    };

    handleDeckUpdate = (newDeck) => {
        this.setState(prev => {
            const nextDecks = prev.decks.map((d, i) => i === prev.activeDeckIndex ? newDeck : d);
            return { decks: nextDecks };
        }, this.saveDecks);
    };

    addDeck = () => {
        this.setState(prev => ({
            decks: [...prev.decks, { ...INITIAL_DECK_STATE }],
            activeDeckIndex: prev.decks.length,
        }), this.saveDecks);
    };

    removeDeck = (idx) => {
        if (this.state.decks.length <= 1) return;
        if (!window.confirm('이 덱을 삭제하시겠습니까?')) return;
        this.setState(prev => {
            const nextDecks = prev.decks.filter((_, i) => i !== idx);
            const nextIdx = Math.min(prev.activeDeckIndex, nextDecks.length - 1);
            return { decks: nextDecks, activeDeckIndex: nextIdx };
        }, this.saveDecks);
    };

    exportData = () => {
        const payload = {
            campaign: this.state.campaign,
            decks: this.state.decks,
            exportedAt: new Date().toISOString(),
        };
        const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `어스본레인져스_${this.state.campaign.campaignName || '세이브'}_${new Date().toISOString().slice(0, 10)}.json`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    };

    importData = (event) => {
        const file = event.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const parsed = JSON.parse(e.target.result);
                if (parsed.campaign) {
                    this.setState({ campaign: { ...INITIAL_CAMPAIGN_STATE, ...parsed.campaign } }, this.saveCampaign);
                }
                if (Array.isArray(parsed.decks) && parsed.decks.length > 0) {
                    this.setState({
                        decks: parsed.decks.map(d => ({ ...INITIAL_DECK_STATE, ...d })),
                        activeDeckIndex: 0,
                    }, this.saveDecks);
                }
                alert('데이터를 성공적으로 불러왔습니다!');
            } catch (err) {
                alert('데이터 파싱 오류: 올바른 JSON 파일인지 확인해주세요.');
            }
        };
        reader.readAsText(file, 'UTF-8');
        event.target.value = '';
    };

    resetAll = () => {
        if (window.confirm('정말 모든 데이터를 초기화하시겠습니까?\n(캠페인, 모든 덱 데이터가 삭제됩니다)')) {
            window.localStorage.removeItem(STORAGE_KEY_CAMPAIGN);
            window.localStorage.removeItem(STORAGE_KEY_DECK);
            this.setState({
                campaign: { ...INITIAL_CAMPAIGN_STATE },
                decks: [{ ...INITIAL_DECK_STATE }],
                activeDeckIndex: 0,
            });
            alert('초기화가 완료되었습니다.');
        }
    };

    render() {
        const { activeTab, themeKey, campaign, decks, activeDeckIndex } = this.state;
        const themeVars = themeToCssVars(themeKey);
        const activeDeck = decks[activeDeckIndex] || decks[0];

        return (
            <div className="fixed inset-0 z-[55] overflow-y-auto" style={{ ...themeVars, background: 'var(--bg-color)', color: 'var(--text-main)' }}>
                <div className="max-w-6xl mx-auto px-4 py-6 lg:px-8">
                    {/* 상단 네비게이션 */}
                    <div className="flex items-center justify-between mb-4">
                        <button
                            onClick={() => this.props.navigate('/')}
                            className="flex items-center gap-1.5 text-sm font-medium transition-colors hover:opacity-80"
                            style={{ color: 'var(--accent-color)' }}
                        >
                            <ArrowLeft className="h-4 w-4" />
                            홈
                        </button>
                        <div className="flex items-center gap-2">
                            <label className="cursor-pointer p-1.5 rounded-lg hover:bg-white/10 transition-colors" style={{ color: 'var(--text-muted)' }} title="불러오기">
                                <UploadCloudIcon className="h-4 w-4" />
                                <input type="file" accept=".json" onChange={this.importData} className="hidden" />
                            </label>
                            <button onClick={this.exportData} className="p-1.5 rounded-lg hover:bg-white/10 transition-colors" style={{ color: 'var(--text-muted)' }} title="내보내기">
                                <DownloadIcon className="h-4 w-4" />
                            </button>
                            <button onClick={this.resetAll} className="p-1.5 rounded-lg hover:bg-white/10 transition-colors" style={{ color: 'var(--danger)' }} title="초기화">
                                <RotateCcw className="h-4 w-4" />
                            </button>
                        </div>
                    </div>

                    {/* 타이틀 */}
                    <div className="text-center mb-6">
                        <h1 className="text-2xl font-bold" style={{ color: 'var(--text-main)' }}>
                            어스본 레인져스
                        </h1>
                        <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
                            Earthborne Rangers 보조도구
                        </p>
                    </div>

                    {/* 탭 전환 */}
                    <div className="flex gap-2 mb-6">
                        <button
                            onClick={() => this.setState({ activeTab: 'campaign' })}
                            className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl border text-sm font-bold transition-all"
                            style={{
                                background: activeTab === 'campaign' ? 'var(--accent-color)' : 'var(--card-bg)',
                                borderColor: activeTab === 'campaign' ? 'var(--accent-color)' : 'var(--border-color)',
                                color: activeTab === 'campaign' ? '#fff' : 'var(--text-muted)',
                            }}
                        >
                            <MapIcon className="h-4 w-4" />
                            캠페인
                        </button>
                        <button
                            onClick={() => this.setState({ activeTab: 'deck' })}
                            className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl border text-sm font-bold transition-all"
                            style={{
                                background: activeTab === 'deck' ? 'var(--accent-color)' : 'var(--card-bg)',
                                borderColor: activeTab === 'deck' ? 'var(--accent-color)' : 'var(--border-color)',
                                color: activeTab === 'deck' ? '#fff' : 'var(--text-muted)',
                            }}
                        >
                            <LayersIcon className="h-4 w-4" />
                            덱 관리
                        </button>
                    </div>

                    {/* 덱 선택 탭 (덱 관리 모드에서만) */}
                    {activeTab === 'deck' && (
                        <div className="flex items-center gap-2 mb-4 overflow-x-auto ebr-scroll pb-1">
                            {decks.map((d, idx) => (
                                <button
                                    key={idx}
                                    onClick={() => this.setState({ activeDeckIndex: idx })}
                                    className="shrink-0 text-xs px-3 py-1.5 rounded-lg border font-medium transition-all flex items-center gap-1"
                                    style={{
                                        background: activeDeckIndex === idx ? 'var(--accent-color)' : 'var(--card-bg)',
                                        borderColor: activeDeckIndex === idx ? 'var(--accent-color)' : 'var(--border-color)',
                                        color: activeDeckIndex === idx ? '#fff' : 'var(--text-muted)',
                                    }}
                                >
                                    {d.rangerName || `레인져 ${idx + 1}`}
                                    {decks.length > 1 && activeDeckIndex === idx && (
                                        <button
                                            onClick={(e) => { e.stopPropagation(); this.removeDeck(idx); }}
                                            className="ml-1 hover:opacity-70"
                                            style={{ color: 'rgba(255,255,255,0.6)' }}
                                        >
                                            ×
                                        </button>
                                    )}
                                </button>
                            ))}
                            <button
                                onClick={this.addDeck}
                                className="shrink-0 text-xs px-2.5 py-1.5 rounded-lg border border-dashed transition-all hover:bg-white/5"
                                style={{ borderColor: 'var(--border-color)', color: 'var(--clickable)' }}
                            >
                                + 덱 추가
                            </button>
                        </div>
                    )}

                    {/* 메인 컨텐츠 */}
                    {activeTab === 'campaign' && (
                        <CampaignTracker campaign={campaign} onUpdate={this.handleCampaignUpdate} />
                    )}
                    {activeTab === 'deck' && (
                        <DeckManager deck={activeDeck} onUpdate={this.handleDeckUpdate} />
                    )}

                    {/* 하단 여백 */}
                    <div className="h-8" />
                </div>
            </div>
        );
    }
}

export default withNavigate(EarthborneRangersManager);

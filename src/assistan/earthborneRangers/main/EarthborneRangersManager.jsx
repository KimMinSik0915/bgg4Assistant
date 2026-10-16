import { Component } from 'react';
import { MapIcon, LayersIcon, DownloadIcon, UploadCloudIcon, RotateCcw, ArrowLeft, SaveIcon, BookOpenIcon, PlusIcon, TrashIcon } from 'lucide-react';
import withNavigate from '../../utils/withNavigate';
import { themeToCssVars, THEME_KEYS } from '../../characterSheet/resource/dataSet/themes';
import { INITIAL_CAMPAIGN_STATE, INITIAL_DECK_STATE, STORAGE_KEY_CAMPAIGN, STORAGE_KEY_DECK, ASPECTS, BACKGROUNDS, SPECIALTIES } from '../resource/dataSet/gameData';
import { initializeApp, getApps, getApp } from 'firebase/app';
import { getDatabase, ref, set, get, update } from 'firebase/database';
import CampaignTracker from '../component/CampaignTracker';
import DeckManager from '../component/DeckManager';
import CardList from '../component/CardList';
import '../resource/CSS/earthborneRangers.css';

const FIREBASE_CONFIG = {
    apiKey: "AIzaSyBe7Z889wUM6W4inCq70y0w1a1xPuA6-GI",
    authDomain: "tgultgul.firebaseapp.com",
    databaseURL: "https://tgultgul-default-rtdb.asia-southeast1.firebasedatabase.app",
    projectId: "tgultgul",
    storageBucket: "tgultgul.firebasestorage.app",
    messagingSenderId: "345947100947",
    appId: "1:345947100947:web:8a320b8af98e32fc3a6ce6"
};

const getDb = () => {
    const app = getApps().length ? getApp() : initializeApp(FIREBASE_CONFIG);
    return getDatabase(app);
};

/**
 * @Author : 김민식
 * EarthborneRangersManager : 어스본레인져스 캠페인 & 덱 관리 보조도구
 */
class EarthborneRangersManager extends Component {

    state = {
        activeTab: 'campaign',
        deckView: 'list',
        themeKey: THEME_KEYS.CLASSIC,
        campaign: { ...INITIAL_CAMPAIGN_STATE },
        decks: [{ ...INITIAL_DECK_STATE }],
        activeDeckIndex: 0,
        draftDeck: null,
        showSaveModal: false,
        savePassword: '',
        saving: false,
        showLoadModal: false,
        loadPassword: '',
        loading: false,
        allCards: [],
    };

    componentDidMount() {
        const savedCampaign = window.localStorage.getItem(STORAGE_KEY_CAMPAIGN);
        if (savedCampaign) {
            try {
                const parsed = JSON.parse(savedCampaign);
                const campaign = { ...INITIAL_CAMPAIGN_STATE, ...parsed };
                if (!campaign.location) campaign.location = INITIAL_CAMPAIGN_STATE.location;
                if (!campaign.pathTerrain) campaign.pathTerrain = INITIAL_CAMPAIGN_STATE.pathTerrain;
                this.setState({ campaign });
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

        fetch('/assets/data/ranger_cards_full.json')
            .then(r => r.json())
            .then(cards => {
                this.setState({ allCards: cards }, () => this.migrateDecksToIds(cards));
            })
            .catch(() => {});
    }

    migrateDecksToIds = (cards) => {
        const OLD_NAME_TO_ID = {
            '독수리의 눈': '01001', '우리가 전에 걸었던 길': '01002',
            '트레일 믹스': '01004', '리버브 장신구': '01005',
            '철울 부츠': '01008', '주머니 달린 허리 파우치': '01011',
            '발자취를 따라': '01070', '오를린 쿵쿵이': '01071',
            '추적하기': '01072', '선조의 가르침': '01076',
        };
        const findIdByName = (name) => {
            if (!name || !name.trim()) return name;
            if (cards.find(c => c.id === name)) return name;
            if (OLD_NAME_TO_ID[name]) return OLD_NAME_TO_ID[name];
            const byName = cards.find(c => (c.name_ko || c.name_en) === name);
            return byName ? byName.id : name;
        };

        let changed = false;
        const migratedDecks = this.state.decks.map(deck => {
            const d = { ...deck };
            if (d.personalityCards) {
                const pc = { ...d.personalityCards };
                Object.keys(pc).forEach(key => {
                    const migrated = findIdByName(pc[key]);
                    if (migrated !== pc[key]) { pc[key] = migrated; changed = true; }
                });
                d.personalityCards = pc;
            }
            if (d.specialtyCards) {
                d.specialtyCards = d.specialtyCards.map(n => { const m = findIdByName(n); if (m !== n) changed = true; return m; });
            }
            if (d.backgroundCards) {
                d.backgroundCards = d.backgroundCards.map(n => { const m = findIdByName(n); if (m !== n) changed = true; return m; });
            }
            if (d.outsideInterest) {
                const m = findIdByName(d.outsideInterest);
                if (m !== d.outsideInterest) { d.outsideInterest = m; changed = true; }
            }
            if (d.specialtyRole) {
                const m = findIdByName(d.specialtyRole);
                if (m !== d.specialtyRole) { d.specialtyRole = m; changed = true; }
            }
            if (d.cardSwaps) {
                d.cardSwaps = d.cardSwaps.map(s => {
                    const rm = findIdByName(s.removed);
                    const am = findIdByName(s.added);
                    if (rm !== s.removed || am !== s.added) changed = true;
                    return { ...s, removed: rm, added: am };
                });
            }
            if (d.initialDeckSnapshot) {
                const snap = { ...d.initialDeckSnapshot };
                if (snap.personalityCards) {
                    const pc = { ...snap.personalityCards };
                    Object.keys(pc).forEach(key => {
                        const m = findIdByName(pc[key]);
                        if (m !== pc[key]) { pc[key] = m; changed = true; }
                    });
                    snap.personalityCards = pc;
                }
                if (snap.specialtyCards) {
                    snap.specialtyCards = snap.specialtyCards.map(n => { const m = findIdByName(n); if (m !== n) changed = true; return m; });
                }
                if (snap.backgroundCards) {
                    snap.backgroundCards = snap.backgroundCards.map(n => { const m = findIdByName(n); if (m !== n) changed = true; return m; });
                }
                if (snap.outsideInterest) {
                    const m = findIdByName(snap.outsideInterest);
                    if (m !== snap.outsideInterest) { snap.outsideInterest = m; changed = true; }
                }
                d.initialDeckSnapshot = snap;
            }
            return d;
        });

        if (changed) {
            this.setState({ decks: migratedDecks }, this.saveDecks);
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
        this.setState({ draftDeck: newDeck });
    };

    addDeck = () => {
        const newDeck = { ...INITIAL_DECK_STATE };
        this.setState(prev => ({
            decks: [...prev.decks, newDeck],
            activeDeckIndex: prev.decks.length,
            draftDeck: { ...newDeck },
            isNewDeck: true,
            deckView: 'detail',
        }), this.saveDecks);
    };

    openDeck = (idx) => {
        this.setState(prev => ({
            activeDeckIndex: idx,
            draftDeck: { ...prev.decks[idx] },
            isNewDeck: false,
            deckView: 'detail',
        }));
    };

    saveDraft = () => {
        this.setState(prev => {
            const nextDecks = prev.decks.map((d, i) => i === prev.activeDeckIndex ? prev.draftDeck : d);
            return { decks: nextDecks, deckView: 'list', draftDeck: null };
        }, this.saveDecks);
    };

    discardDraft = () => {
        this.setState({ deckView: 'list', draftDeck: null });
    };

    removeDeck = (idx) => {
        if (!window.confirm('이 덱을 삭제하시겠습니까?')) return;
        this.setState(prev => {
            const nextDecks = prev.decks.filter((_, i) => i !== idx);
            const nextIdx = Math.min(prev.activeDeckIndex, Math.max(0, nextDecks.length - 1));
            return { decks: nextDecks, activeDeckIndex: nextIdx, deckView: 'list', draftDeck: null };
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

    getTabDataKey = () => {
        const { activeTab } = this.state;
        if (activeTab === 'campaign') return 'campaign';
        if (activeTab === 'deck') return 'decks';
        return 'cardTranslations';
    };

    saveToFirebase = async () => {
        const { savePassword, activeTab, campaign, decks } = this.state;
        if (savePassword.length !== 4) {
            alert('비밀번호 4자리를 입력해주세요.');
            return;
        }
        this.setState({ saving: true });
        try {
            const db = getDb();
            const dataRef = ref(db, `erb/${savePassword}`);
            const payload = { savedAt: new Date().toISOString() };
            if (activeTab === 'campaign') {
                payload.campaign = campaign;
            } else if (activeTab === 'deck') {
                payload.decks = decks;
            } else {
                try {
                    const raw = window.localStorage.getItem('ebr_card_translations');
                    if (raw) payload.cardTranslations = JSON.parse(raw);
                } catch {}
            }
            await update(dataRef, payload);
            alert('저장되었습니다!');
            this.setState({ showSaveModal: false, savePassword: '' });
        } catch (e) {
            console.error('Firebase 저장 실패:', e);
            alert('저장에 실패했습니다: ' + e.message);
        } finally {
            this.setState({ saving: false });
        }
    };

    loadFromFirebase = async () => {
        const { loadPassword, activeTab } = this.state;
        if (loadPassword.length !== 4) {
            alert('비밀번호 4자리를 입력해주세요.');
            return;
        }
        this.setState({ loading: true });
        try {
            const db = getDb();
            const dataRef = ref(db, `erb/${loadPassword}`);
            const snap = await get(dataRef);
            if (!snap.exists()) {
                alert('해당 비밀번호로 저장된 데이터가 없습니다.');
                return;
            }
            const data = snap.val();
            if (activeTab === 'campaign') {
                if (data.campaign) {
                    this.setState({ campaign: { ...INITIAL_CAMPAIGN_STATE, ...data.campaign } }, this.saveCampaign);
                } else {
                    alert('저장된 캠페인 데이터가 없습니다.');
                    return;
                }
            } else if (activeTab === 'deck') {
                if (Array.isArray(data.decks) && data.decks.length > 0) {
                    this.setState({
                        decks: data.decks.map(d => ({ ...INITIAL_DECK_STATE, ...d })),
                        activeDeckIndex: 0,
                    }, this.saveDecks);
                } else {
                    alert('저장된 덱 데이터가 없습니다.');
                    return;
                }
            } else {
                if (data.cardTranslations) {
                    try { window.localStorage.setItem('ebr_card_translations', JSON.stringify(data.cardTranslations)); } catch {}
                } else {
                    alert('저장된 카드 번역 데이터가 없습니다.');
                    return;
                }
            }
            alert('데이터를 성공적으로 불러왔습니다!');
            this.setState({ showLoadModal: false, loadPassword: '' });
        } catch (e) {
            console.error('Firebase 불러오기 실패:', e);
            alert('불러오기에 실패했습니다: ' + e.message);
        } finally {
            this.setState({ loading: false });
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
                            onClick={() => this.setState({ activeTab: 'campaign', deckView: 'list', draftDeck: null })}
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
                            onClick={() => this.setState({ activeTab: 'deck', deckView: 'list', draftDeck: null })}
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
                        <button
                            onClick={() => this.setState({ activeTab: 'cards', deckView: 'list', draftDeck: null })}
                            className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl border text-sm font-bold transition-all"
                            style={{
                                background: activeTab === 'cards' ? 'var(--accent-color)' : 'var(--card-bg)',
                                borderColor: activeTab === 'cards' ? 'var(--accent-color)' : 'var(--border-color)',
                                color: activeTab === 'cards' ? '#fff' : 'var(--text-muted)',
                            }}
                        >
                            <BookOpenIcon className="h-4 w-4" />
                            카드 목록
                        </button>
                    </div>

                    {/* 저장/불러오기 버튼 */}
                    {(activeTab === 'campaign' || (activeTab === 'deck' && this.state.deckView === 'list') || activeTab === 'cards') && (
                    <div className="flex justify-end gap-2 mb-6">
                        <button
                            onClick={() => this.setState({ showLoadModal: true, loadPassword: '' })}
                            className="flex items-center gap-1.5 px-4 py-2 rounded-lg border text-sm font-medium transition-all hover:opacity-90"
                            style={{ background: 'var(--card-bg)', borderColor: 'var(--border-color)', color: 'var(--text-muted)' }}
                        >
                            <DownloadIcon className="h-3.5 w-3.5" />
                            불러오기
                        </button>
                        <button
                            onClick={() => this.setState({ showSaveModal: true, savePassword: '' })}
                            className="flex items-center gap-1.5 px-4 py-2 rounded-lg border text-sm font-medium transition-all hover:opacity-90"
                            style={{ background: 'var(--card-bg)', borderColor: 'var(--border-color)', color: 'var(--text-muted)' }}
                        >
                            <SaveIcon className="h-3.5 w-3.5" />
                            저장
                        </button>
                    </div>
                    )}

                    {/* 메인 컨텐츠 */}
                    {activeTab === 'campaign' && (
                        <CampaignTracker campaign={campaign} onUpdate={this.handleCampaignUpdate} decks={decks} allCards={this.state.allCards} />
                    )}
                    {activeTab === 'deck' && this.state.deckView === 'list' && (
                        <div className="flex flex-col gap-4 ebr-fade-in">
                            <div className="flex items-center justify-between mb-1">
                                <span />
                                <button
                                    onClick={this.addDeck}
                                    className="flex items-center gap-1.5 px-4 py-2 rounded-lg border text-sm font-medium transition-all hover:opacity-90"
                                    style={{ background: 'var(--card-bg)', borderColor: 'var(--border-color)', color: 'var(--text-muted)' }}
                                >
                                    <PlusIcon className="h-3.5 w-3.5" />
                                    추가
                                </button>
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                {decks.map((d, idx) => {
                                    const av = d.aspectValues;
                                    const bg = BACKGROUNDS.find(b => b.key === d.background);
                                    const spec = SPECIALTIES.find(s => s.key === d.specialty);
                                    const roleCard = d.specialtyRole
                                        ? this.state.allCards.find(c => c.id === d.specialtyRole)
                                        : null;
                                    const roleThumb = roleCard?.name_en
                                        ? roleCard.name_en.toLowerCase().replace(/[^a-z0-9 ]/g, '').replace(/ +/g, '_')
                                        : '';
                                    const roleName = roleCard ? (roleCard.name_ko || roleCard.name_en) : d.specialtyRole;
                                    return (
                                        <button
                                            key={idx}
                                            onClick={() => this.openDeck(idx)}
                                            className="rounded-xl border p-4 text-left transition-all hover:shadow-lg"
                                            style={{ background: 'var(--card-bg)', borderColor: 'var(--border-color)' }}
                                        >
                                            <div className="flex items-center gap-3 mb-3">
                                                {roleThumb && (
                                                    <img
                                                        src={`/assets/icons/ebr/role/${roleThumb}.png`}
                                                        alt={roleName}
                                                        className="shrink-0 w-12 h-12 rounded-lg object-cover"
                                                        style={{ border: '2px solid var(--accent-color)' }}
                                                        onError={(e) => { e.target.style.display = 'none'; }}
                                                    />
                                                )}
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-center justify-between">
                                                        <span className="text-sm font-bold" style={{ color: 'var(--text-main)' }}>
                                                            {d.rangerName || `레인져 ${idx + 1}`}
                                                        </span>
                                                        {decks.length > 0 && (
                                                            <span
                                                                onClick={(e) => { e.stopPropagation(); this.removeDeck(idx); }}
                                                                className="p-1 rounded-md hover:bg-white/10 transition-colors cursor-pointer"
                                                                style={{ color: 'var(--danger)' }}
                                                            >
                                                                <TrashIcon className="h-3.5 w-3.5" />
                                                            </span>
                                                        )}
                                                    </div>
                                                    {d.specialtyRole && (
                                                        <span className="text-xs" style={{ color: 'var(--accent-color)' }}>{roleName}</span>
                                                    )}
                                                </div>
                                            </div>
                                            {av && (
                                                <div className="flex gap-1.5 mb-2">
                                                    {Object.values(ASPECTS).map(a => (
                                                        <div key={a.key} className="flex items-center gap-0.5">
                                                            <span className="w-1.5 h-1.5 rounded-full" style={{ background: a.color }} />
                                                            <span className="text-[10px]" style={{ color: 'var(--text-muted)' }}>{av[a.key]}</span>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                            <div className="flex flex-wrap gap-1.5">
                                                {spec && (
                                                    <span className="text-[10px] px-2 py-0.5 rounded-full" style={{ background: 'var(--tag-bg)', color: 'var(--text-muted)' }}>
                                                        {spec.label}
                                                    </span>
                                                )}
                                                {bg && (
                                                    <span className="text-[10px] px-2 py-0.5 rounded-full" style={{ background: 'var(--tag-bg)', color: 'var(--text-muted)' }}>
                                                        {bg.label}
                                                    </span>
                                                )}
                                                {!bg && !spec && !av && (
                                                    <span className="text-[10px]" style={{ color: 'var(--text-muted)' }}>미설정</span>
                                                )}
                                            </div>
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    )}
                    {activeTab === 'deck' && this.state.deckView === 'detail' && this.state.draftDeck && (
                        <div className="ebr-fade-in">
                            <div className="flex items-center justify-between mb-4">
                                <button
                                    onClick={this.discardDraft}
                                    className="flex items-center gap-1.5 text-sm font-medium transition-colors hover:opacity-80"
                                    style={{ color: 'var(--accent-color)' }}
                                >
                                    <ArrowLeft className="h-4 w-4" />
                                    덱 목록
                                </button>
                                <div className="flex items-center gap-2">
                                    <button
                                        onClick={() => this.removeDeck(activeDeckIndex)}
                                        className="flex items-center gap-1.5 px-4 py-2 rounded-lg border text-sm font-medium transition-all hover:opacity-90"
                                        style={{ background: 'var(--card-bg)', borderColor: 'var(--danger)', color: 'var(--danger)' }}
                                    >
                                        <TrashIcon className="h-3.5 w-3.5" />
                                        삭제
                                    </button>
                                    <button
                                        onClick={this.saveDraft}
                                        className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-bold transition-all hover:opacity-90"
                                        style={{ background: 'var(--accent-color)', color: '#fff' }}
                                    >
                                        <SaveIcon className="h-3.5 w-3.5" />
                                        저장
                                    </button>
                                </div>
                            </div>
                            <h2 className="text-lg font-bold mb-4" style={{ color: 'var(--text-main)' }}>
                                덱 상세내역
                            </h2>
                            <DeckManager deck={this.state.draftDeck} onUpdate={this.handleDeckUpdate} isNew={this.state.isNewDeck} />
                        </div>
                    )}
                    {activeTab === 'cards' && (
                        <CardList />
                    )}

                    {/* 하단 여백 */}
                    <div className="h-8" />
                </div>

                {/* 저장 비밀번호 모달 */}
                {this.state.showSaveModal && (
                    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black"
                        onClick={() => this.setState({ showSaveModal: false })}>
                        <div className="rounded-2xl border p-6 w-80 shadow-xl"
                            style={{ background: 'var(--card-bg)', borderColor: 'var(--border-color)' }}
                            onClick={(e) => e.stopPropagation()}>
                            <h3 className="text-lg font-bold mb-4" style={{ color: 'var(--text-main)' }}>
                                데이터 저장
                            </h3>
                            <label className="text-xs uppercase tracking-wider mb-1 block" style={{ color: 'var(--text-muted)' }}>
                                비밀번호 (4자리)
                            </label>
                            <input
                                type="password"
                                maxLength={4}
                                value={this.state.savePassword}
                                onChange={(e) => this.setState({ savePassword: e.target.value.replace(/[^0-9a-zA-Z]/g, '').slice(0, 4) })}
                                placeholder="4자리 입력"
                                className="w-full text-center text-2xl tracking-[0.5em] px-3 py-3 rounded-lg border outline-none focus:ring-1 mb-4"
                                style={{
                                    background: 'var(--bg-color)',
                                    borderColor: 'var(--border-color)',
                                    color: 'var(--text-main)',
                                    '--tw-ring-color': 'var(--accent-color)',
                                }}
                                autoFocus
                            />
                            <div className="flex gap-2">
                                <button
                                    onClick={() => this.setState({ showSaveModal: false })}
                                    className="flex-1 py-2.5 rounded-lg border text-sm font-medium transition-colors hover:bg-white/5"
                                    style={{ borderColor: 'var(--border-color)', color: 'var(--text-muted)' }}
                                >
                                    취소
                                </button>
                                <button
                                    onClick={this.saveToFirebase}
                                    disabled={this.state.saving || this.state.savePassword.length !== 4}
                                    className="flex-1 py-2.5 rounded-lg text-sm font-bold transition-colors disabled:opacity-40"
                                    style={{ background: 'var(--accent-color)', color: '#fff' }}
                                >
                                    {this.state.saving ? '저장 중...' : '저장'}
                                </button>
                            </div>
                        </div>
                    </div>
                )}
                {/* 불러오기 비밀번호 모달 */}
                {this.state.showLoadModal && (
                    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black"
                        onClick={() => this.setState({ showLoadModal: false })}>
                        <div className="rounded-2xl border p-6 w-80 shadow-xl"
                            style={{ background: 'var(--card-bg)', borderColor: 'var(--border-color)' }}
                            onClick={(e) => e.stopPropagation()}>
                            <h3 className="text-lg font-bold mb-4" style={{ color: 'var(--text-main)' }}>
                                데이터 불러오기
                            </h3>
                            <label className="text-xs uppercase tracking-wider mb-1 block" style={{ color: 'var(--text-muted)' }}>
                                비밀번호 (4자리)
                            </label>
                            <input
                                type="password"
                                maxLength={4}
                                value={this.state.loadPassword}
                                onChange={(e) => this.setState({ loadPassword: e.target.value.replace(/[^0-9a-zA-Z]/g, '').slice(0, 4) })}
                                placeholder="4자리 입력"
                                className="w-full text-center text-2xl tracking-[0.5em] px-3 py-3 rounded-lg border outline-none focus:ring-1 mb-4"
                                style={{
                                    background: 'var(--bg-color)',
                                    borderColor: 'var(--border-color)',
                                    color: 'var(--text-main)',
                                    '--tw-ring-color': 'var(--accent-color)',
                                }}
                                autoFocus
                            />
                            <div className="flex gap-2">
                                <button
                                    onClick={() => this.setState({ showLoadModal: false })}
                                    className="flex-1 py-2.5 rounded-lg border text-sm font-medium transition-colors hover:bg-white/5"
                                    style={{ borderColor: 'var(--border-color)', color: 'var(--text-muted)' }}
                                >
                                    취소
                                </button>
                                <button
                                    onClick={this.loadFromFirebase}
                                    disabled={this.state.loading || this.state.loadPassword.length !== 4}
                                    className="flex-1 py-2.5 rounded-lg text-sm font-bold transition-colors disabled:opacity-40"
                                    style={{ background: 'var(--accent-color)', color: '#fff' }}
                                >
                                    {this.state.loading ? '불러오는 중...' : '불러오기'}
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        );
    }
}

export default withNavigate(EarthborneRangersManager);

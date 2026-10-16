import { useState } from 'react';
import { PlusIcon, XIcon, BookOpenIcon, Undo2Icon, CompassIcon, TentIcon, ScrollTextIcon } from 'lucide-react';
import { CAMPAIGNS, WEATHER_TYPES, getMoonInfo, VALLEY_NODES, VALLEY_REGIONS, LOCATION_ICON, TERRAIN_ICON, SPECIALTIES, BACKGROUNDS } from '../resource/dataSet/gameData';

const MoonIcon = ({ pct, size = 14 }) => {
    const abs = Math.abs(pct);
    const waning = pct < 0;
    const r = 9;

    if (abs === 0) {
        return (
            <svg viewBox="0 0 20 20" width={size} height={size}>
                <circle cx="10" cy="10" r={r} fill="#1a1a2e" stroke="#555" strokeWidth="0.8" />
            </svg>
        );
    }
    if (abs === 100) {
        return (
            <svg viewBox="0 0 20 20" width={size} height={size}>
                <circle cx="10" cy="10" r={r} fill="#f5f0c1" stroke="#d4c96a" strokeWidth="0.5" />
            </svg>
        );
    }

    const k = abs / 50 - 1;
    const rx = Math.max(0.1, Math.abs(k) * r);
    const sweep = abs < 50 ? 0 : 1;
    const path = `M 10 ${10 - r} A ${r} ${r} 0 0 1 10 ${10 + r} A ${rx} ${r} 0 0 ${sweep} 10 ${10 - r}`;

    return (
        <svg viewBox="0 0 20 20" width={size} height={size} style={waning ? { transform: 'scaleX(-1)' } : undefined}>
            <circle cx="10" cy="10" r={r} fill="#1a1a2e" stroke="#555" strokeWidth="0.5" />
            <path d={path} fill="#f5f0c1" />
        </svg>
    );
};

/**
 * @Author : 김민식
 * CampaignTracker : 어스본레인져스 캠페인 트래커 (공식 시트 기반)
 */
const ROLE_ICO = '/assets/icons/ebr/role';
const getRoleThumb = (nameEn) => nameEn ? nameEn.toLowerCase().replace(/[^a-z0-9 ]/g, '').replace(/ +/g, '_') : '';

const CampaignTracker = ({ campaign, onUpdate, decks = [], allCards = [] }) => {
    const [selectedDay, setSelectedDay] = useState(null);
    const [showTravelModal, setShowTravelModal] = useState(false);
    const [travelForm, setTravelForm] = useState({ location: '', pathTerrain: '', camp: false });
    const [missionModalIdx, setMissionModalIdx] = useState(null);
    const [missionForm, setMissionForm] = useState({ day: 1, name: '', progress: 0, completed: false });
    const [showTravelHistory, setShowTravelHistory] = useState(false);
    const [activeInfoTab, setActiveInfoTab] = useState('missions');
    const [locationSearch, setLocationSearch] = useState('');
    const [showLocationDropdown, setShowLocationDropdown] = useState(false);
    const [terrainSearch, setTerrainSearch] = useState('');
    const [showTerrainDropdown, setShowTerrainDropdown] = useState(false);

    const updateField = (field, value) => {
        onUpdate({ ...campaign, [field]: value });
    };

    const campaignDef = CAMPAIGNS[campaign.campaignType] || CAMPAIGNS.lure;
    const totalDays = campaignDef.totalDays;
    const dayNotes = campaign.dayNotes || {};
    const locationHistory = campaign.locationHistory || [];
    const undoStack = campaign._undoStack || [];

    const [showRangerPicker, setShowRangerPicker] = useState(false);

    const rangers = campaign.rangers || [];

    const addRangerFromDeck = (deckIdx) => {
        if (rangers.length >= 4) return;
        updateField('rangers', [...rangers, { deckIndex: deckIdx }]);
        setShowRangerPicker(false);
    };

    const removeRanger = (idx) => {
        updateField('rangers', rangers.filter((_, i) => i !== idx));
    };

    const linkedDeckIndices = rangers.filter(r => r && typeof r === 'object').map(r => r.deckIndex);

    const addMission = () => {
        updateField('missions', [...campaign.missions, { day: campaign.currentDay, name: '', progress: 0, completed: false }]);
    };

    const removeMission = (idx) => {
        updateField('missions', campaign.missions.filter((_, i) => i !== idx));
    };

    const openMissionModal = (idx) => {
        const m = campaign.missions[idx];
        setMissionForm({ day: m.day, name: m.name, progress: m.progress, completed: !!m.completed });
        setMissionModalIdx(idx);
    };

    const handleMissionSave = () => {
        if (missionModalIdx === null) return;
        const next = campaign.missions.map((m, i) =>
            i === missionModalIdx ? { ...m, ...missionForm } : m
        );
        updateField('missions', next);
        setMissionModalIdx(null);
    };

    const toggleModalProgress = (step) => {
        setMissionForm(f => ({
            ...f,
            progress: f.progress === step ? step - 1 : Math.max(0, step),
        }));
    };

    const addNotableEvent = () => {
        updateField('notableEvents', [...campaign.notableEvents, '']);
    };

    const updateNotableEvent = (idx, value) => {
        const next = campaign.notableEvents.map((e, i) => i === idx ? value : e);
        updateField('notableEvents', next);
    };

    const removeNotableEvent = (idx) => {
        updateField('notableEvents', campaign.notableEvents.filter((_, i) => i !== idx));
    };

    const addReward = () => {
        updateField('rewards', [...campaign.rewards, '']);
    };

    const updateReward = (idx, value) => {
        const next = campaign.rewards.map((r, i) => i === idx ? value : r);
        updateField('rewards', next);
    };

    const removeReward = (idx) => {
        updateField('rewards', campaign.rewards.filter((_, i) => i !== idx));
    };

    const addRemovedCard = () => {
        updateField('removedCards', [...(campaign.removedCards || []), '']);
    };

    const updateRemovedCard = (idx, value) => {
        const next = (campaign.removedCards || []).map((c, i) => i === idx ? value : c);
        updateField('removedCards', next);
    };

    const removeRemovedCard = (idx) => {
        updateField('removedCards', (campaign.removedCards || []).filter((_, i) => i !== idx));
    };

    const addMemo = () => {
        updateField('memos', [...(campaign.memos || []), '']);
    };

    const updateMemo = (idx, value) => {
        const next = (campaign.memos || []).map((m, i) => i === idx ? value : m);
        updateField('memos', next);
    };

    const removeMemo = (idx) => {
        updateField('memos', (campaign.memos || []).filter((_, i) => i !== idx));
    };

    const updateDayNote = (day, text) => {
        onUpdate({
            ...campaign,
            dayNotes: { ...dayNotes, [day]: text },
        });
    };

    const handleDayClick = (day) => {
        setSelectedDay(prev => prev === day ? null : day);
    };

    const openTravelModal = () => {
        setTravelForm({ location: '', pathTerrain: '', camp: false });
        setLocationSearch('');
        setShowLocationDropdown(false);
        setTerrainSearch('');
        setShowTerrainDropdown(false);
        setShowTravelModal(true);
    };

    const handleTravelSave = () => {
        const snapshot = {
            location: campaign.location,
            pathTerrain: campaign.pathTerrain,
            currentDay: campaign.currentDay,
            locationHistory: [...locationHistory],
        };

        const entry = {
            day: campaign.currentDay,
            location: travelForm.location.trim() || campaign.location,
            pathTerrain: travelForm.pathTerrain.trim(),
            camp: travelForm.camp,
            timestamp: new Date().toISOString(),
        };

        const nextDay = travelForm.camp
            ? Math.min(campaign.currentDay + 1, totalDays)
            : campaign.currentDay;

        onUpdate({
            ...campaign,
            location: travelForm.location.trim() || campaign.location,
            pathTerrain: travelForm.pathTerrain.trim(),
            currentDay: nextDay,
            locationHistory: [...locationHistory, entry],
            _undoStack: [...undoStack, snapshot],
        });

        setShowTravelModal(false);
    };

    const handleUndo = () => {
        if (undoStack.length === 0) return;
        const prev = undoStack[undoStack.length - 1];
        onUpdate({
            ...campaign,
            location: prev.location,
            pathTerrain: prev.pathTerrain,
            currentDay: prev.currentDay,
            locationHistory: prev.locationHistory,
            _undoStack: undoStack.slice(0, -1),
        });
    };

    const handleCamp = () => {
        if (campaign.currentDay >= totalDays) return;
        const snapshot = {
            location: campaign.location,
            pathTerrain: campaign.pathTerrain,
            currentDay: campaign.currentDay,
            locationHistory: [...locationHistory],
        };
        const entry = {
            day: campaign.currentDay,
            location: campaign.location || '',
            pathTerrain: campaign.pathTerrain || '',
            camp: true,
            timestamp: new Date().toISOString(),
        };
        onUpdate({
            ...campaign,
            currentDay: campaign.currentDay + 1,
            locationHistory: [...locationHistory, entry],
            _undoStack: [...undoStack, snapshot],
        });
    };

    const cardStyle = { background: 'var(--card-bg)', borderColor: 'var(--border-color)' };
    const inputStyle = { background: 'var(--input-bg)', color: 'var(--input-text)', borderColor: 'var(--border-color)' };

    const currentWeatherKey = campaignDef.weather[campaign.currentDay - 1] || 'none';
    const currentWeather = WEATHER_TYPES[currentWeatherKey] || WEATHER_TYPES.none;

    const storyRefs = campaignDef.storyRefs || {};

    return (
        <div className="flex flex-col gap-4 ebr-fade-in">
            {/* 여행 모달 */}
            {showTravelModal && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.7)' }}>
                    <div
                        className="w-full max-w-md rounded-xl border p-5 shadow-2xl ebr-fade-in"
                        style={{ background: 'var(--bg-color)', borderColor: 'var(--accent-color)' }}
                    >
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-lg font-bold flex items-center gap-2" style={{ color: 'var(--highlight)' }}>
                                <CompassIcon className="h-5 w-5" style={{ color: 'var(--accent-color)' }} />
                                여행 — Day {campaign.currentDay}
                            </h3>
                            <label className="flex items-center gap-1.5 cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={travelForm.freeTravel || false}
                                    onChange={(e) => setTravelForm(f => ({ ...f, freeTravel: e.target.checked }))}
                                    className="w-4 h-4 rounded accent-purple-500"
                                />
                                <span className="text-xs font-medium" style={{ color: 'var(--text-muted)' }}>자유여행</span>
                            </label>
                        </div>
                        <div className="flex flex-col gap-3">
                            <div className="relative">
                                <label className="text-xs uppercase tracking-wider mb-1 block" style={{ color: 'var(--text-muted)' }}>목적지 (Destination)</label>
                                <input
                                    type="text"
                                    value={locationSearch}
                                    onChange={(e) => { setLocationSearch(e.target.value); setShowLocationDropdown(true); }}
                                    onFocus={() => setShowLocationDropdown(true)}
                                    onBlur={() => setTimeout(() => setShowLocationDropdown(false), 150)}
                                    placeholder="장소 검색 또는 선택"
                                    className="w-full text-base px-3 py-2.5 rounded-lg border outline-none focus:ring-1"
                                    style={{ ...inputStyle, '--tw-ring-color': 'var(--accent-color)' }}
                                />
                                {travelForm.location && (
                                    <div className="mt-1 text-xs px-1 flex items-center gap-1.5" style={{ color: 'var(--accent-color)' }}>
                                        {LOCATION_ICON[travelForm.location] && <img src={LOCATION_ICON[travelForm.location]} alt="" className="h-7 w-7 object-contain" />}
                                        선택됨: {travelForm.location}
                                    </div>
                                )}
                                {showLocationDropdown && (() => {
                                    const curNode = VALLEY_NODES.find(n => n.name === campaign.location);
                                    const query = locationSearch.trim().toLowerCase();
                                    const filtered = VALLEY_NODES.filter(n =>
                                        n.name.toLowerCase().includes(query) || n.en.toLowerCase().includes(query)
                                    );
                                    const getPathTerrain = (destName) => {
                                        const forward = curNode?.paths.find(p => p.to === destName);
                                        if (forward) return forward.terrain;
                                        const destNode = VALLEY_NODES.find(n => n.name === destName);
                                        const reverse = destNode?.paths.find(p => p.to === campaign.location);
                                        return reverse?.terrain || '';
                                    };
                                    const connected = travelForm.freeTravel
                                        ? filtered
                                        : (curNode ? filtered.filter(n => curNode.paths.some(p => p.to === n.name)) : filtered);
                                    const selectNode = (node) => {
                                        const terrain = getPathTerrain(node.name);
                                        setTravelForm(f => ({ ...f, location: node.name, pathTerrain: terrain }));
                                        setLocationSearch(node.name);
                                        setShowLocationDropdown(false);
                                    };
                                    return (
                                        <div className="absolute left-0 right-0 mt-1 rounded-lg border shadow-lg overflow-y-auto z-10"
                                            style={{ background: 'var(--bg-color)', borderColor: 'var(--border-color)', maxHeight: '200px' }}>
                                            {connected.length > 0 ? connected.map(node => (
                                                <button key={node.name} className="w-full text-left px-3 py-2 text-sm hover:bg-white/10 transition-colors flex items-center justify-between"
                                                    style={{ color: 'var(--text-main)' }}
                                                    onClick={() => selectNode(node)}>
                                                    <span className="flex items-center gap-2">
                                                        {LOCATION_ICON[node.name] && <img src={LOCATION_ICON[node.name]} alt="" className="h-8 w-8 object-contain" />}
                                                        {node.name}
                                                    </span>
                                                    <span className="flex items-center gap-1.5" style={{ color: 'var(--accent-color)' }}>
                                                        {TERRAIN_ICON[getPathTerrain(node.name)] && <img src={TERRAIN_ICON[getPathTerrain(node.name)]} alt="" className="h-7 w-7 object-contain" />}
                                                        {getPathTerrain(node.name)}
                                                    </span>
                                                </button>
                                            )) : (
                                                <div className="px-3 py-2 text-sm" style={{ color: 'var(--text-muted)' }}>검색 결과 없음</div>
                                            )}
                                        </div>
                                    );
                                })()}
                            </div>
                            <div className="relative">
                                <label className="text-xs uppercase tracking-wider mb-1 block" style={{ color: 'var(--text-muted)' }}>경로 (Path Terrain)</label>
                                {travelForm.freeTravel ? (
                                    <>
                                        <input
                                            type="text"
                                            value={terrainSearch}
                                            onChange={(e) => { setTerrainSearch(e.target.value); setShowTerrainDropdown(true); }}
                                            onFocus={() => setShowTerrainDropdown(true)}
                                            onBlur={() => setTimeout(() => setShowTerrainDropdown(false), 150)}
                                            placeholder="경로 검색 또는 선택"
                                            className="w-full text-base px-3 py-2.5 rounded-lg border outline-none focus:ring-1"
                                            style={{ ...inputStyle, '--tw-ring-color': 'var(--accent-color)' }}
                                        />
                                        {travelForm.pathTerrain && (
                                            <div className="mt-1 text-xs px-1 flex items-center gap-1.5" style={{ color: 'var(--accent-color)' }}>
                                                {TERRAIN_ICON[travelForm.pathTerrain] && <img src={TERRAIN_ICON[travelForm.pathTerrain]} alt="" className="h-6 w-6 object-contain" />}
                                                선택됨: {travelForm.pathTerrain}
                                            </div>
                                        )}
                                        {showTerrainDropdown && (() => {
                                            const terrains = ['고목림', '산길', '숲', '호숫가', '풀밭', '협곡', '늪지', '강'];
                                            const query = terrainSearch.trim().toLowerCase();
                                            const filtered = terrains.filter(t => t.includes(query));
                                            return (
                                                <div className="absolute left-0 right-0 mt-1 rounded-lg border shadow-lg overflow-y-auto z-10"
                                                    style={{ background: 'var(--bg-color)', borderColor: 'var(--border-color)', maxHeight: '200px' }}>
                                                    {filtered.length > 0 ? filtered.map(t => (
                                                        <button key={t} className="w-full text-left px-3 py-2 text-sm hover:bg-white/10 transition-colors flex items-center gap-2"
                                                            style={{ color: 'var(--text-main)' }}
                                                            onClick={() => { setTravelForm(f => ({ ...f, pathTerrain: t })); setTerrainSearch(t); setShowTerrainDropdown(false); }}>
                                                            {TERRAIN_ICON[t] && <img src={TERRAIN_ICON[t]} alt="" className="h-7 w-7 object-contain" />}
                                                            {t}
                                                        </button>
                                                    )) : (
                                                        <div className="px-3 py-2 text-sm" style={{ color: 'var(--text-muted)' }}>검색 결과 없음</div>
                                                    )}
                                                </div>
                                            );
                                        })()}
                                    </>
                                ) : (
                                    <div className="flex items-center gap-2 px-3 py-2.5 rounded-lg border text-base"
                                        style={{ ...inputStyle, opacity: 0.7 }}>
                                        {TERRAIN_ICON[travelForm.pathTerrain] && <img src={TERRAIN_ICON[travelForm.pathTerrain]} alt="" className="h-7 w-7 object-contain" />}
                                        {travelForm.pathTerrain || '경로/지형'}
                                    </div>
                                )}
                            </div>
                            <label className="flex items-center gap-2.5 cursor-pointer py-1.5">
                                <input
                                    type="checkbox"
                                    checked={travelForm.camp}
                                    onChange={(e) => setTravelForm(f => ({ ...f, camp: e.target.checked }))}
                                    className="w-5 h-5 rounded accent-purple-500"
                                />
                                <span className="text-base font-medium" style={{ color: 'var(--text-main)' }}>
                                    Camp (야영)
                                </span>
                                <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
                                    — 체크하면 하루가 지나갑니다
                                </span>
                            </label>
                        </div>
                        <div className="flex gap-2 mt-5">
                            <button
                                onClick={handleTravelSave}
                                className="flex-1 py-2.5 rounded-lg text-base font-bold transition-all hover:opacity-90"
                                style={{ background: 'var(--accent-color)', color: '#fff' }}
                            >
                                저장
                            </button>
                            <button
                                onClick={() => setShowTravelModal(false)}
                                className="flex-1 py-2.5 rounded-lg border text-base font-bold transition-all hover:bg-white/5"
                                style={{ borderColor: 'var(--border-color)', color: 'var(--text-muted)' }}
                            >
                                취소
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* 미션 상세 모달 */}
            {missionModalIdx !== null && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.7)' }}>
                    <div
                        className="w-full max-w-md rounded-xl border p-5 shadow-2xl ebr-fade-in"
                        style={{ background: 'var(--bg-color)', borderColor: 'var(--accent-color)' }}
                    >
                        <h3 className="text-lg font-bold mb-4" style={{ color: 'var(--highlight)' }}>
                            미션 상세
                        </h3>
                        <div className="flex flex-col gap-4">
                            <div>
                                <label className="text-xs uppercase tracking-wider mb-1 block" style={{ color: 'var(--text-muted)' }}>날짜 (Day)</label>
                                <input
                                    type="number"
                                    min={1}
                                    max={totalDays}
                                    value={missionForm.day || ''}
                                    onChange={(e) => setMissionForm(f => ({ ...f, day: parseInt(e.target.value) || '' }))}
                                    className="w-full text-base px-3 py-2.5 rounded-lg border outline-none focus:ring-1"
                                    style={{ ...inputStyle, '--tw-ring-color': 'var(--accent-color)' }}
                                />
                            </div>
                            <div>
                                <label className="text-xs uppercase tracking-wider mb-1 block" style={{ color: 'var(--text-muted)' }}>미션명</label>
                                <input
                                    type="text"
                                    value={missionForm.name}
                                    onChange={(e) => setMissionForm(f => ({ ...f, name: e.target.value }))}
                                    placeholder="미션 이름을 입력하세요"
                                    className="w-full text-base px-3 py-2.5 rounded-lg border outline-none focus:ring-1"
                                    style={{ ...inputStyle, '--tw-ring-color': 'var(--accent-color)' }}
                                    autoFocus
                                />
                            </div>
                            <div>
                                <label className="text-xs uppercase tracking-wider mb-2 block" style={{ color: 'var(--text-muted)' }}>Progress</label>
                                <div className="flex items-center gap-3">
                                    {[1, 2, 3].map(step => (
                                        <button
                                            key={step}
                                            onClick={() => toggleModalProgress(step)}
                                            className="w-10 h-10 flex items-center justify-center transition-all"
                                            title={`진행도 ${step}/3`}
                                        >
                                            <svg viewBox="0 0 24 24" className="w-9 h-9">
                                                <path
                                                    d="M12 2 L22 12 L12 22 L2 12 Z"
                                                    fill={missionForm.progress >= step ? 'var(--accent-color)' : 'transparent'}
                                                    stroke={missionForm.progress >= step ? 'var(--accent-color)' : 'var(--text-muted)'}
                                                    strokeWidth="2"
                                                />
                                            </svg>
                                        </button>
                                    ))}
                                    <span className="text-sm ml-2" style={{ color: 'var(--text-muted)' }}>
                                        {missionForm.progress} / 3
                                    </span>
                                </div>
                            </div>
                            <label className="flex items-center gap-2.5 cursor-pointer py-1">
                                <input
                                    type="checkbox"
                                    checked={missionForm.completed}
                                    onChange={(e) => setMissionForm(f => ({ ...f, completed: e.target.checked }))}
                                    className="w-5 h-5 rounded accent-purple-500"
                                />
                                <span className="text-base font-medium" style={{ color: 'var(--text-main)' }}>
                                    완료
                                </span>
                                {missionForm.completed && (
                                    <span className="text-xs" style={{ color: 'var(--accent-color)' }}>
                                        ✓ 미션 완료 처리됨
                                    </span>
                                )}
                            </label>
                        </div>
                        <div className="flex gap-2 mt-5">
                            <button
                                onClick={handleMissionSave}
                                className="flex-1 py-2.5 rounded-lg text-base font-bold transition-all hover:opacity-90"
                                style={{ background: 'var(--accent-color)', color: '#fff' }}
                            >
                                저장
                            </button>
                            <button
                                onClick={() => setMissionModalIdx(null)}
                                className="flex-1 py-2.5 rounded-lg border text-base font-bold transition-all hover:bg-white/5"
                                style={{ borderColor: 'var(--border-color)', color: 'var(--text-muted)' }}
                            >
                                취소
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* 여행 기록 모달 */}
            {showTravelHistory && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.7)' }}>
                    <div
                        className="w-full max-w-lg rounded-xl border p-5 shadow-2xl ebr-fade-in"
                        style={{ background: 'var(--bg-color)', borderColor: 'var(--accent-color)' }}
                    >
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-lg font-bold flex items-center gap-2" style={{ color: 'var(--highlight)' }}>
                                <ScrollTextIcon className="h-5 w-5" style={{ color: 'var(--accent-color)' }} />
                                여행 기록
                            </h3>
                            <button
                                onClick={() => setShowTravelHistory(false)}
                                className="p-1 rounded-md hover:bg-white/10 transition-colors"
                                style={{ color: 'var(--text-muted)' }}
                            >
                                <XIcon className="h-5 w-5" />
                            </button>
                        </div>
                        {locationHistory.length > 0 ? (
                            <div className="flex flex-col gap-2 max-h-96 overflow-y-auto ebr-scroll pr-1">
                                {locationHistory.map((entry, idx) => (
                                    <div
                                        key={idx}
                                        className="flex items-start gap-3 px-3 py-2.5 rounded-lg"
                                        style={{ background: 'var(--card-bg)', borderLeft: `3px solid ${entry.camp ? 'var(--accent-color)' : 'var(--border-color)'}` }}
                                    >
                                        <span
                                            className="shrink-0 w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold border-2 mt-0.5"
                                            style={{ borderColor: 'var(--accent-color)', color: 'var(--accent-color)' }}
                                        >
                                            {entry.day}
                                        </span>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2">
                                                <span className="text-base font-medium flex items-center gap-2" style={{ color: 'var(--text-main)' }}>
                                                    {LOCATION_ICON[entry.location] && <img src={LOCATION_ICON[entry.location]} alt="" className="h-8 w-8 object-contain" />}
                                                    {entry.location || '(장소 없음)'}
                                                </span>
                                                {entry.camp && (
                                                    <span className="text-xs px-2 py-0.5 rounded-full font-medium" style={{ background: 'var(--tag-bg)', color: 'var(--accent-color)' }}>
                                                        야영
                                                    </span>
                                                )}
                                            </div>
                                            {entry.pathTerrain && (
                                                <span className="text-sm flex items-center gap-1.5 mt-0.5" style={{ color: 'var(--text-muted)' }}>
                                                    {TERRAIN_ICON[entry.pathTerrain] && <img src={TERRAIN_ICON[entry.pathTerrain]} alt="" className="h-6 w-6 object-contain" />}
                                                    경로: {entry.pathTerrain}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <p className="text-sm text-center py-8" style={{ color: 'var(--text-muted)' }}>
                                아직 여행 기록이 없습니다
                            </p>
                        )}
                        <div className="mt-4">
                            <button
                                onClick={() => setShowTravelHistory(false)}
                                className="w-full py-2.5 rounded-lg border text-base font-bold transition-all hover:bg-white/5"
                                style={{ borderColor: 'var(--border-color)', color: 'var(--text-muted)' }}
                            >
                                닫기
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* 캠페인 헤더 */}
            <header
                className="p-4 lg:p-5 rounded-xl border shadow-lg"
                style={{ background: 'linear-gradient(135deg, var(--header-from) 0%, var(--header-to) 100%)', borderColor: 'var(--accent-color)' }}
            >
                <div className="flex items-center justify-between gap-3 mb-2">
                    <input
                        type="text"
                        value={campaign.campaignName}
                        onChange={(e) => updateField('campaignName', e.target.value)}
                        placeholder="캠페인 이름"
                        className="text-xl lg:text-2xl font-bold text-white bg-transparent border-none outline-none flex-1 placeholder-white/40"
                    />
                </div>
                <div className="flex flex-wrap gap-2 mb-3">
                    {Object.values(CAMPAIGNS).map(c => (
                        <button
                            key={c.key}
                            onClick={() => updateField('campaignType', c.key)}
                            className="text-xs lg:text-sm px-3 py-1.5 rounded-full border font-medium transition-all"
                            style={{
                                background: campaign.campaignType === c.key ? 'rgba(255,255,255,0.25)' : 'rgba(255,255,255,0.08)',
                                borderColor: campaign.campaignType === c.key ? 'rgba(255,255,255,0.5)' : 'rgba(255,255,255,0.15)',
                                color: '#fff',
                            }}
                        >
                            {c.label} ({c.en})
                        </button>
                    ))}
                </div>
            </header>

            {/* Day Track 1-30 */}
            <section className="rounded-xl border p-4 shadow-md" style={cardStyle}>
                <h3 className="text-base font-bold mb-3" style={{ color: 'var(--highlight)' }}>
                    Day Track
                </h3>
                <div className="overflow-x-auto ebr-scroll pb-2">
                    <div style={{ minWidth: `${totalDays * 48}px` }}>
                        <div className="flex gap-1">
                            {Array.from({ length: totalDays }, (_, i) => {
                                const day = i + 1;
                                const isCurrent = day === campaign.currentDay;
                                const isPast = day < campaign.currentDay;
                                const isSelected = day === selectedDay;
                                const hasStoryRef = !!storyRefs[day];
                                const hasNote = !!(dayNotes[day] && dayNotes[day].trim());
                                const moonPct = campaignDef.moon ? campaignDef.moon[i] : null;
                                const moonInfo = moonPct !== null && moonPct !== undefined ? getMoonInfo(moonPct) : null;
                                return (
                                    <button
                                        key={day}
                                        onClick={() => handleDayClick(day)}
                                        className="flex flex-col items-center gap-0.5 transition-all shrink-0"
                                        style={{ width: '46px', minWidth: '46px' }}
                                        title={`Day ${day}${moonInfo ? ` | ${moonInfo.label}` : ''}${hasStoryRef ? ` | 가이드: ${storyRefs[day]}` : ''}`}
                                    >
                                        <span className="text-[10px] h-4 flex items-center justify-center font-medium" style={{ color: hasStoryRef ? 'var(--accent-color)' : 'transparent' }}>
                                            {hasStoryRef ? `📖${storyRefs[day]}` : '·'}
                                        </span>
                                        <span
                                            className="w-10 h-10 rounded-full flex items-center justify-center text-xs font-bold border-2 transition-all relative overflow-hidden"
                                            style={{
                                                borderColor: isSelected ? 'var(--highlight)'
                                                    : isCurrent ? 'var(--highlight)' : 'var(--border-color)',
                                                opacity: isPast ? 0.5 : 1,
                                                boxShadow: isSelected ? '0 0 8px var(--accent-color)' : 'none',
                                            }}
                                        >
                                            {moonPct !== null && moonPct !== undefined && (
                                                <span className="absolute inset-0 flex items-center justify-center">
                                                    <MoonIcon pct={moonPct} size={34} />
                                                </span>
                                            )}
                                            <span className="relative" style={{
                                                color: isCurrent ? '#fff' : isPast ? 'var(--text-muted)' : 'var(--text-main)',
                                                textShadow: moonPct !== null && moonPct !== undefined
                                                    ? '0 0 4px rgba(0,0,0,0.9), 0 1px 2px rgba(0,0,0,0.8)' : 'none',
                                            }}>
                                                {day}
                                            </span>
                                            {hasNote && (
                                                <span className="absolute bottom-0.5 right-0.5 w-2 h-2 rounded-full" style={{ background: 'var(--accent-color)', border: '1px solid rgba(0,0,0,0.3)' }} />
                                            )}
                                        </span>
                                    </button>
                                );
                            })}
                        </div>
                        {campaignDef.weatherRanges && (
                            <div className="flex gap-1 mt-1">
                                {campaignDef.weatherRanges.map((range, idx) => {
                                    const numDays = range.end - range.start + 1;
                                    const width = numDays * 50 - 4;
                                    const w = WEATHER_TYPES[range.weather] || WEATHER_TYPES.none;
                                    return (
                                        <div key={idx} className="shrink-0" style={{ width: `${width}px` }}>
                                            <div className="text-center text-[10px] font-medium mb-0.5" style={{ color: 'var(--text-muted)' }}>
                                                {w.label}
                                            </div>
                                            <div style={{
                                                borderBottom: '2px solid var(--text-muted)',
                                                borderLeft: '2px solid var(--text-muted)',
                                                borderRight: '2px solid var(--text-muted)',
                                                height: '8px',
                                            }} />
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                </div>

                {/* 선택된 날짜의 메모 */}
                {selectedDay && (
                    <div className="mt-3 pt-3" style={{ borderTop: '1px solid var(--border-color)' }}>
                        <div className="flex items-center gap-2 mb-2">
                            <BookOpenIcon className="h-4 w-4" style={{ color: 'var(--accent-color)' }} />
                            <span className="text-sm font-bold" style={{ color: 'var(--highlight)' }}>
                                Day {selectedDay} 메모
                            </span>
                            {storyRefs[selectedDay] && (
                                <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: 'var(--tag-bg)', color: 'var(--accent-color)' }}>
                                    가이드 참조: {storyRefs[selectedDay]}
                                </span>
                            )}
                        </div>
                        <textarea
                            value={dayNotes[selectedDay] || ''}
                            onChange={(e) => updateDayNote(selectedDay, e.target.value)}
                            placeholder={`Day ${selectedDay}에 대한 메모를 입력하세요...`}
                            rows={3}
                            className="w-full text-base px-3 py-2.5 rounded-lg border outline-none resize-y focus:ring-1"
                            style={{ ...inputStyle, '--tw-ring-color': 'var(--accent-color)', minHeight: '70px' }}
                        />
                    </div>
                )}

            </section>

            {/* 현재 위치 */}
            <section className="rounded-xl border p-4 shadow-md" style={cardStyle}>
                <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
                    <h3 className="text-base font-bold" style={{ color: 'var(--highlight)' }}>현재 위치</h3>
                    <div className="flex items-center gap-1.5">
                        <button
                            onClick={() => setShowTravelHistory(true)}
                            className="flex items-center gap-1 sm:gap-1.5 px-2 sm:px-3 py-1.5 rounded-lg border text-xs sm:text-sm font-bold transition-all hover:bg-white/5 whitespace-nowrap"
                            style={{ borderColor: 'var(--border-color)', color: 'var(--text-muted)' }}
                        >
                            <ScrollTextIcon className="h-3.5 sm:h-4 w-3.5 sm:w-4 shrink-0" />
                            <span className="hidden sm:inline">여행기록</span>
                            <span className="sm:hidden">기록</span>
                        </button>
                        <button
                            onClick={openTravelModal}
                            className="flex items-center gap-1 sm:gap-1.5 px-2 sm:px-3 py-1.5 rounded-lg text-xs sm:text-sm font-bold transition-all hover:opacity-90 whitespace-nowrap"
                            style={{ background: 'var(--accent-color)', color: '#fff' }}
                        >
                            <CompassIcon className="h-3.5 sm:h-4 w-3.5 sm:w-4 shrink-0" />
                            여행
                        </button>
                        <button
                            onClick={handleCamp}
                            disabled={campaign.currentDay >= totalDays}
                            className="flex items-center gap-1 sm:gap-1.5 px-2 sm:px-3 py-1.5 rounded-lg border text-xs sm:text-sm font-bold transition-all hover:bg-white/5 disabled:opacity-30 disabled:cursor-not-allowed whitespace-nowrap"
                            style={{ borderColor: 'var(--accent-color)', color: 'var(--accent-color)' }}
                        >
                            <TentIcon className="h-3.5 sm:h-4 w-3.5 sm:w-4 shrink-0" />
                            야영
                        </button>
                        <button
                            onClick={handleUndo}
                            disabled={undoStack.length === 0}
                            className="flex items-center gap-1 sm:gap-1.5 px-2 sm:px-3 py-1.5 rounded-lg border text-xs sm:text-sm font-bold transition-all hover:bg-white/5 disabled:opacity-30 disabled:cursor-not-allowed whitespace-nowrap"
                            style={{ borderColor: 'var(--border-color)', color: 'var(--text-muted)' }}
                        >
                            <Undo2Icon className="h-3.5 sm:h-4 w-3.5 sm:w-4 shrink-0" />
                            <span className="hidden sm:inline">되돌리기</span>
                            <span className="sm:hidden">되돌리기</span>
                        </button>
                    </div>
                </div>
                <div className="flex flex-col gap-1.5">
                    <span className="flex items-center gap-2 text-base font-medium" style={{ color: 'var(--text-main)' }}>
                        {LOCATION_ICON[campaign.location] && <img src={LOCATION_ICON[campaign.location]} alt="" className="h-10 w-10 object-contain" />}
                        {campaign.location || '-'}
                    </span>
                    <span className="flex items-center gap-2 text-sm" style={{ color: 'var(--text-muted)' }}>
                        {TERRAIN_ICON[campaign.pathTerrain] && <img src={TERRAIN_ICON[campaign.pathTerrain]} alt="" className="h-9 w-9 object-contain" />}
                        {campaign.pathTerrain || '-'}
                    </span>
                </div>
            </section>

            {/* 2열 그리드 레이아웃 (데스크톱) */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {/* 좌측 컬럼 — Rangers */}
                <section className="rounded-xl border p-4 shadow-md" style={cardStyle}>
                    <div className="flex items-center justify-between mb-3">
                        <h3 className="text-base font-bold" style={{ color: 'var(--highlight)' }}>RANGERS</h3>
                        {rangers.length < 4 && decks.length > 0 && (
                            <button onClick={() => setShowRangerPicker(true)} className="p-1.5 rounded-md hover:bg-white/10 transition-colors" style={{ color: 'var(--clickable)' }}>
                                <PlusIcon className="h-5 w-5" />
                            </button>
                        )}
                    </div>
                    <div className="flex flex-col gap-2">
                        {rangers.map((r, idx) => {
                            const d = typeof r === 'object' ? decks[r.deckIndex] : null;
                            if (!d) {
                                return (
                                    <div key={idx} className="flex items-center gap-2 py-2 px-3 rounded-lg border" style={{ borderColor: 'var(--border-color)', background: 'var(--input-bg)' }}>
                                        <span className="flex-1 text-sm" style={{ color: 'var(--text-muted)' }}>{typeof r === 'string' ? r : '삭제된 덱'}</span>
                                        <button onClick={() => removeRanger(idx)} className="p-1 rounded-md hover:bg-white/10 transition-colors" style={{ color: 'var(--danger)' }}>
                                            <XIcon className="h-3.5 w-3.5" />
                                        </button>
                                    </div>
                                );
                            }
                            const spec = SPECIALTIES.find(s => s.key === d.specialty);
                            const bg = BACKGROUNDS.find(b => b.key === d.background);
                            const roleCard = d.specialtyRole
                                ? allCards.find(c => c.id === d.specialtyRole)
                                : null;
                            const roleName = roleCard ? (roleCard.name_ko || roleCard.name_en) : d.specialtyRole;
                            const roleThumb = roleCard?.name_en ? getRoleThumb(roleCard.name_en) : '';
                            return (
                                <div key={idx} className="flex items-center gap-3 py-2 px-3 rounded-lg border" style={{ borderColor: 'var(--border-color)', background: 'var(--input-bg)' }}>
                                    {roleThumb && (
                                        <img
                                            src={`${ROLE_ICO}/${roleThumb}.png`}
                                            alt={roleName}
                                            className="shrink-0 w-10 h-10 rounded-lg object-cover"
                                            style={{ border: '2px solid var(--accent-color)' }}
                                            onError={(e) => { e.target.style.display = 'none'; }}
                                        />
                                    )}
                                    <div className="flex-1 min-w-0">
                                        <span className="text-sm font-bold block" style={{ color: 'var(--text-main)' }}>{d.rangerName || `레인져 ${r.deckIndex + 1}`}</span>
                                        <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                                            {d.specialtyRole && <span className="text-[10px]" style={{ color: 'var(--accent-color)' }}>{roleName}</span>}
                                            {spec && <span className="text-[10px] px-1.5 py-0.5 rounded-full" style={{ background: 'var(--tag-bg)', color: 'var(--text-muted)' }}>{spec.label}</span>}
                                            {bg && <span className="text-[10px] px-1.5 py-0.5 rounded-full" style={{ background: 'var(--tag-bg)', color: 'var(--text-muted)' }}>{bg.label}</span>}
                                        </div>
                                    </div>
                                    <button onClick={() => removeRanger(idx)} className="p-1 rounded-md hover:bg-white/10 transition-colors" style={{ color: 'var(--danger)' }}>
                                        <XIcon className="h-3.5 w-3.5" />
                                    </button>
                                </div>
                            );
                        })}
                        {rangers.length === 0 && (
                            <span className="text-xs" style={{ color: 'var(--text-muted)' }}>덱 관리에서 레인저를 만든 후 추가하세요</span>
                        )}
                    </div>

                    {/* 레인저 선택 모달 */}
                    {showRangerPicker && (
                        <div className="mt-3 pt-3 border-t" style={{ borderColor: 'var(--border-color)' }}>
                            <div className="flex items-center justify-between mb-2">
                                <span className="text-xs font-bold" style={{ color: 'var(--text-muted)' }}>덱에서 레인저 선택</span>
                                <button onClick={() => setShowRangerPicker(false)} className="p-1 rounded-md hover:bg-white/10 transition-colors" style={{ color: 'var(--text-muted)' }}>
                                    <XIcon className="h-3.5 w-3.5" />
                                </button>
                            </div>
                            <div className="flex flex-col gap-1.5">
                                {decks.map((d, dIdx) => {
                                    const already = linkedDeckIndices.includes(dIdx);
                                    const spec = SPECIALTIES.find(s => s.key === d.specialty);
                                    const bg = BACKGROUNDS.find(b => b.key === d.background);
                                    const roleCard = d.specialtyRole
                                        ? allCards.find(c => c.id === d.specialtyRole)
                                        : null;
                                    const pickerRoleName = roleCard ? (roleCard.name_ko || roleCard.name_en) : d.specialtyRole;
                                    const roleThumb = roleCard?.name_en ? getRoleThumb(roleCard.name_en) : '';
                                    return (
                                        <button
                                            key={dIdx}
                                            onClick={() => !already && addRangerFromDeck(dIdx)}
                                            className="flex items-center gap-3 py-2 px-3 rounded-lg border text-left transition-all"
                                            style={{
                                                borderColor: already ? 'var(--accent-color)' : 'var(--border-color)',
                                                background: already ? 'var(--accent-color)15' : 'transparent',
                                                opacity: already ? 0.5 : 1,
                                                cursor: already ? 'default' : 'pointer',
                                            }}
                                        >
                                            {roleThumb && (
                                                <img
                                                    src={`${ROLE_ICO}/${roleThumb}.png`}
                                                    alt={pickerRoleName}
                                                    className="shrink-0 w-9 h-9 rounded-lg object-cover"
                                                    style={{ border: '2px solid var(--accent-color)' }}
                                                    onError={(e) => { e.target.style.display = 'none'; }}
                                                />
                                            )}
                                            <div className="flex-1 min-w-0">
                                                <span className="text-sm font-bold" style={{ color: 'var(--text-main)' }}>{d.rangerName || `레인져 ${dIdx + 1}`}</span>
                                                <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                                                    {spec && <span className="text-[10px] px-1.5 py-0.5 rounded-full" style={{ background: 'var(--tag-bg)', color: 'var(--text-muted)' }}>{spec.label}</span>}
                                                    {bg && <span className="text-[10px] px-1.5 py-0.5 rounded-full" style={{ background: 'var(--tag-bg)', color: 'var(--text-muted)' }}>{bg.label}</span>}
                                                </div>
                                            </div>
                                            {already && <span className="text-[10px] font-bold" style={{ color: 'var(--accent-color)' }}>추가됨</span>}
                                        </button>
                                    );
                                })}
                                {decks.length === 0 && <span className="text-xs" style={{ color: 'var(--text-muted)' }}>덱이 없습니다</span>}
                            </div>
                        </div>
                    )}
                </section>

                {/* 우측 컬럼 — 탭 섹션 (Mission / Reward / Notable Events / Removed Card) */}
                <section className="rounded-xl border shadow-md overflow-hidden" style={cardStyle}>
                    <div className="flex border-b" style={{ borderColor: 'var(--border-color)' }}>
                        {[
                            { key: 'missions', label: '미션' },
                            { key: 'rewards', label: '보상' },
                            { key: 'events', label: '사건' },
                            { key: 'removedCards', label: '제거된 카드' },
                        ].map(tab => (
                            <button
                                key={tab.key}
                                onClick={() => setActiveInfoTab(tab.key)}
                                className="flex-1 py-2.5 text-sm font-bold transition-all"
                                style={{
                                    color: activeInfoTab === tab.key ? 'var(--accent-color)' : 'var(--text-muted)',
                                    borderBottom: activeInfoTab === tab.key ? '2px solid var(--accent-color)' : '2px solid transparent',
                                    background: activeInfoTab === tab.key ? 'rgba(255,255,255,0.03)' : 'transparent',
                                }}
                            >
                                {tab.label}
                            </button>
                        ))}
                    </div>

                    <div className="p-4">
                        {/* Missions 탭 */}
                        {activeInfoTab === 'missions' && (
                            <div>
                                <div className="flex items-center justify-between mb-3">
                                    <h3 className="text-base font-bold" style={{ color: 'var(--highlight)' }}>MISSIONS</h3>
                                    <button onClick={addMission} className="p-1.5 rounded-md hover:bg-white/10 transition-colors" style={{ color: 'var(--clickable)' }}>
                                        <PlusIcon className="h-5 w-5" />
                                    </button>
                                </div>
                                {campaign.missions.length > 0 && (
                                    <div className="flex items-center gap-2 mb-2 px-1">
                                        <span className="text-xs uppercase tracking-wider w-12 text-center" style={{ color: 'var(--text-muted)' }}>Day</span>
                                        <span className="text-xs uppercase tracking-wider flex-1" style={{ color: 'var(--text-muted)' }}>Name</span>
                                        <span className="text-xs uppercase tracking-wider w-28 text-center" style={{ color: 'var(--text-muted)' }}>Progress</span>
                                        <span className="w-7" />
                                    </div>
                                )}
                                <div className="flex flex-col gap-2">
                                    {campaign.missions.map((mission, idx) => (
                                        <div
                                            key={idx}
                                            className="flex items-center gap-2 px-2 py-2 rounded-lg hover:bg-white/[0.05] transition-colors cursor-pointer"
                                            onClick={() => openMissionModal(idx)}
                                        >
                                            <span
                                                className="w-12 text-sm text-center font-medium shrink-0"
                                                style={{ color: mission.completed ? 'var(--text-muted)' : 'var(--text-main)' }}
                                            >
                                                {mission.day || '-'}
                                            </span>
                                            <span
                                                className="flex-1 text-sm font-medium truncate"
                                                style={{
                                                    color: mission.completed ? 'var(--text-muted)' : 'var(--text-main)',
                                                    textDecoration: mission.completed ? 'line-through' : 'none',
                                                }}
                                            >
                                                {mission.name || '(이름 없음)'}
                                            </span>
                                            <div className="flex items-center gap-1 w-28 justify-center shrink-0">
                                                {[1, 2, 3].map(step => (
                                                    <svg key={step} viewBox="0 0 24 24" className="w-6 h-6">
                                                        <path
                                                            d="M12 2 L22 12 L12 22 L2 12 Z"
                                                            fill={mission.progress >= step ? 'var(--accent-color)' : 'transparent'}
                                                            stroke={mission.progress >= step ? 'var(--accent-color)' : 'var(--text-muted)'}
                                                            strokeWidth="2"
                                                            opacity={mission.completed ? 0.4 : 1}
                                                        />
                                                    </svg>
                                                ))}
                                            </div>
                                            <button
                                                onClick={(e) => { e.stopPropagation(); removeMission(idx); }}
                                                className="p-1 rounded-md hover:bg-white/10 transition-colors shrink-0"
                                                style={{ color: 'var(--danger)' }}
                                            >
                                                <XIcon className="h-4 w-4" />
                                            </button>
                                        </div>
                                    ))}
                                    {campaign.missions.length === 0 && (
                                        <p className="text-sm text-center py-4" style={{ color: 'var(--text-muted)' }}>
                                            + 버튼을 눌러 미션을 추가하세요
                                        </p>
                                    )}
                                </div>
                            </div>
                        )}

                        {/* Rewards 탭 */}
                        {activeInfoTab === 'rewards' && (
                            <div>
                                <div className="flex items-center justify-between mb-3">
                                    <h3 className="text-base font-bold" style={{ color: 'var(--highlight)' }}>REWARDS</h3>
                                    <button onClick={addReward} className="p-1.5 rounded-md hover:bg-white/10 transition-colors" style={{ color: 'var(--clickable)' }}>
                                        <PlusIcon className="h-5 w-5" />
                                    </button>
                                </div>
                                <div className="flex flex-col gap-1.5">
                                    {campaign.rewards.map((rwd, idx) => (
                                        <div key={idx} className="flex items-center gap-1.5">
                                            <input
                                                type="text"
                                                value={rwd}
                                                onChange={(e) => updateReward(idx, e.target.value)}
                                                placeholder="보상을 입력하세요"
                                                className="flex-1 text-sm px-2 py-1.5 rounded-lg border outline-none focus:ring-1"
                                                style={{ ...inputStyle, '--tw-ring-color': 'var(--accent-color)' }}
                                            />
                                            <button onClick={() => removeReward(idx)} className="p-0.5 rounded hover:bg-white/10 transition-colors" style={{ color: 'var(--danger)' }}>
                                                <XIcon className="h-4 w-4" />
                                            </button>
                                        </div>
                                    ))}
                                    {campaign.rewards.length === 0 && (
                                        <p className="text-sm text-center py-3" style={{ color: 'var(--text-muted)' }}>-</p>
                                    )}
                                </div>
                            </div>
                        )}

                        {/* Notable Events 탭 */}
                        {activeInfoTab === 'events' && (
                            <div>
                                <div className="flex items-center justify-between mb-3">
                                    <h3 className="text-base font-bold" style={{ color: 'var(--highlight)' }}>NOTABLE EVENTS</h3>
                                    <button onClick={addNotableEvent} className="p-1.5 rounded-md hover:bg-white/10 transition-colors" style={{ color: 'var(--clickable)' }}>
                                        <PlusIcon className="h-5 w-5" />
                                    </button>
                                </div>
                                <div className="flex flex-col gap-1.5">
                                    {campaign.notableEvents.map((evt, idx) => (
                                        <div key={idx} className="flex items-center gap-1.5">
                                            <input
                                                type="text"
                                                value={evt}
                                                onChange={(e) => updateNotableEvent(idx, e.target.value)}
                                                placeholder="사건을 입력하세요"
                                                className="flex-1 text-sm px-2 py-1.5 rounded-lg border outline-none focus:ring-1"
                                                style={{ ...inputStyle, '--tw-ring-color': 'var(--accent-color)' }}
                                            />
                                            <button onClick={() => removeNotableEvent(idx)} className="p-0.5 rounded hover:bg-white/10 transition-colors" style={{ color: 'var(--danger)' }}>
                                                <XIcon className="h-4 w-4" />
                                            </button>
                                        </div>
                                    ))}
                                    {campaign.notableEvents.length === 0 && (
                                        <p className="text-sm text-center py-3" style={{ color: 'var(--text-muted)' }}>-</p>
                                    )}
                                </div>
                            </div>
                        )}

                        {/* Removed Card 탭 */}
                        {activeInfoTab === 'removedCards' && (
                            <div>
                                <div className="flex items-center justify-between mb-3">
                                    <h3 className="text-base font-bold" style={{ color: 'var(--highlight)' }}>REMOVED CARDS</h3>
                                    <button onClick={addRemovedCard} className="p-1.5 rounded-md hover:bg-white/10 transition-colors" style={{ color: 'var(--clickable)' }}>
                                        <PlusIcon className="h-5 w-5" />
                                    </button>
                                </div>
                                <div className="flex flex-col gap-1.5">
                                    {(campaign.removedCards || []).map((card, idx) => (
                                        <div key={idx} className="flex items-center gap-1.5">
                                            <input
                                                type="text"
                                                value={card}
                                                onChange={(e) => updateRemovedCard(idx, e.target.value)}
                                                placeholder="제거된 카드를 입력하세요"
                                                className="flex-1 text-sm px-2 py-1.5 rounded-lg border outline-none focus:ring-1"
                                                style={{ ...inputStyle, '--tw-ring-color': 'var(--accent-color)' }}
                                            />
                                            <button onClick={() => removeRemovedCard(idx)} className="p-0.5 rounded hover:bg-white/10 transition-colors" style={{ color: 'var(--danger)' }}>
                                                <XIcon className="h-4 w-4" />
                                            </button>
                                        </div>
                                    ))}
                                    {(campaign.removedCards || []).length === 0 && (
                                        <p className="text-sm text-center py-3" style={{ color: 'var(--text-muted)' }}>-</p>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>
                </section>
            </div>

            {/* 메모 */}
            <section className="rounded-xl border p-4 shadow-md" style={cardStyle}>
                <div className="flex items-center justify-between mb-3">
                    <h3 className="text-base font-bold" style={{ color: 'var(--highlight)' }}>MEMO</h3>
                    <button onClick={addMemo} className="p-1.5 rounded-md hover:bg-white/10 transition-colors" style={{ color: 'var(--clickable)' }}>
                        <PlusIcon className="h-5 w-5" />
                    </button>
                </div>
                <div className="flex flex-col gap-1.5">
                    {(campaign.memos || []).map((m, idx) => (
                        <div key={idx} className="flex items-center gap-1.5">
                            <input
                                type="text"
                                value={m}
                                onChange={(e) => updateMemo(idx, e.target.value)}
                                placeholder="메모를 입력하세요"
                                className="flex-1 text-sm px-2 py-1.5 rounded-lg border outline-none focus:ring-1"
                                style={{ ...inputStyle, '--tw-ring-color': 'var(--accent-color)' }}
                            />
                            <button onClick={() => removeMemo(idx)} className="p-0.5 rounded hover:bg-white/10 transition-colors" style={{ color: 'var(--danger)' }}>
                                <XIcon className="h-4 w-4" />
                            </button>
                        </div>
                    ))}
                    {(campaign.memos || []).length === 0 && (
                        <p className="text-sm text-center py-3" style={{ color: 'var(--text-muted)' }}>-</p>
                    )}
                </div>
            </section>
        </div>
    );
};

export default CampaignTracker;

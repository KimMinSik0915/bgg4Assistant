import { useState } from 'react';
import { PlusIcon, XIcon, BookOpenIcon, Undo2Icon, CompassIcon, TentIcon, ScrollTextIcon } from 'lucide-react';
import { CAMPAIGNS, WEATHER_TYPES } from '../resource/dataSet/gameData';

/**
 * @Author : 김민식
 * CampaignTracker : 어스본레인져스 캠페인 트래커 (공식 시트 기반)
 */
const CampaignTracker = ({ campaign, onUpdate }) => {
    const [selectedDay, setSelectedDay] = useState(null);
    const [showTravelModal, setShowTravelModal] = useState(false);
    const [travelForm, setTravelForm] = useState({ location: '', pathTerrain: '', camp: false });
    const [missionModalIdx, setMissionModalIdx] = useState(null);
    const [missionForm, setMissionForm] = useState({ day: 1, name: '', progress: 0, completed: false });
    const [showTravelHistory, setShowTravelHistory] = useState(false);
    const [activeInfoTab, setActiveInfoTab] = useState('missions');

    const updateField = (field, value) => {
        onUpdate({ ...campaign, [field]: value });
    };

    const campaignDef = CAMPAIGNS[campaign.campaignType] || CAMPAIGNS.lure;
    const totalDays = campaignDef.totalDays;
    const dayNotes = campaign.dayNotes || {};
    const locationHistory = campaign.locationHistory || [];
    const undoStack = campaign._undoStack || [];

    const addRanger = () => {
        if (campaign.rangers.length >= 4) return;
        updateField('rangers', [...campaign.rangers, '']);
    };

    const removeRanger = (idx) => {
        if (campaign.rangers.length <= 1) return;
        updateField('rangers', campaign.rangers.filter((_, i) => i !== idx));
    };

    const updateRanger = (idx, value) => {
        const next = campaign.rangers.map((r, i) => i === idx ? value : r);
        updateField('rangers', next);
    };

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
        const text = window.prompt('주목할 사건을 입력하세요:');
        if (text && text.trim()) {
            updateField('notableEvents', [...campaign.notableEvents, text.trim()]);
        }
    };

    const removeNotableEvent = (idx) => {
        updateField('notableEvents', campaign.notableEvents.filter((_, i) => i !== idx));
    };

    const addReward = () => {
        const text = window.prompt('보상을 입력하세요:');
        if (text && text.trim()) {
            updateField('rewards', [...campaign.rewards, text.trim()]);
        }
    };

    const removeReward = (idx) => {
        updateField('rewards', campaign.rewards.filter((_, i) => i !== idx));
    };

    const addRemovedCard = () => {
        const text = window.prompt('제거된 카드를 입력하세요:');
        if (text && text.trim()) {
            updateField('removedCards', [...(campaign.removedCards || []), text.trim()]);
        }
    };

    const removeRemovedCard = (idx) => {
        updateField('removedCards', (campaign.removedCards || []).filter((_, i) => i !== idx));
    };

    const updateDayNote = (day, text) => {
        onUpdate({
            ...campaign,
            dayNotes: { ...dayNotes, [day]: text },
        });
    };

    const handleDayClick = (day) => {
        updateField('currentDay', day);
        setSelectedDay(prev => prev === day ? null : day);
    };

    const openTravelModal = () => {
        setTravelForm({ location: campaign.location || '', pathTerrain: campaign.pathTerrain || '', camp: false });
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
                        <h3 className="text-lg font-bold mb-4 flex items-center gap-2" style={{ color: 'var(--highlight)' }}>
                            <CompassIcon className="h-5 w-5" style={{ color: 'var(--accent-color)' }} />
                            여행 — Day {campaign.currentDay}
                        </h3>
                        <div className="flex flex-col gap-3">
                            <div>
                                <label className="text-xs uppercase tracking-wider mb-1 block" style={{ color: 'var(--text-muted)' }}>장소 (Location)</label>
                                <input
                                    type="text"
                                    value={travelForm.location}
                                    onChange={(e) => setTravelForm(f => ({ ...f, location: e.target.value }))}
                                    placeholder="이동할 장소를 입력하세요"
                                    className="w-full text-base px-3 py-2.5 rounded-lg border outline-none focus:ring-1"
                                    style={{ ...inputStyle, '--tw-ring-color': 'var(--accent-color)' }}
                                    autoFocus
                                />
                            </div>
                            <div>
                                <label className="text-xs uppercase tracking-wider mb-1 block" style={{ color: 'var(--text-muted)' }}>경로 (Path Terrain)</label>
                                <input
                                    type="text"
                                    value={travelForm.pathTerrain}
                                    onChange={(e) => setTravelForm(f => ({ ...f, pathTerrain: e.target.value }))}
                                    placeholder="경로/지형을 입력하세요"
                                    className="w-full text-base px-3 py-2.5 rounded-lg border outline-none focus:ring-1"
                                    style={{ ...inputStyle, '--tw-ring-color': 'var(--accent-color)' }}
                                />
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
                                                <span className="text-base font-medium" style={{ color: 'var(--text-main)' }}>
                                                    {entry.location || '(장소 없음)'}
                                                </span>
                                                {entry.camp && (
                                                    <span className="text-xs px-2 py-0.5 rounded-full font-medium" style={{ background: 'var(--tag-bg)', color: 'var(--accent-color)' }}>
                                                        야영
                                                    </span>
                                                )}
                                            </div>
                                            {entry.pathTerrain && (
                                                <span className="text-sm block mt-0.5" style={{ color: 'var(--text-muted)' }}>
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
                {currentWeather.key !== 'none' && (
                    <div className="flex items-center gap-2 text-sm lg:text-base text-white/80">
                        <span className="text-xl">{currentWeather.icon}</span>
                        <span className="font-medium">{currentWeather.label} ({currentWeather.en})</span>
                    </div>
                )}
            </header>

            {/* Day Track 1-30 */}
            <section className="rounded-xl border p-4 shadow-md" style={cardStyle}>
                <div className="flex items-center justify-between mb-3">
                    <h3 className="text-base font-bold" style={{ color: 'var(--highlight)' }}>
                        Day Track
                        {campaignDef.guideRef && (
                            <span className="text-xs font-normal ml-2" style={{ color: 'var(--text-muted)' }}>
                                Guide Ref: {campaignDef.guideRef}
                            </span>
                        )}
                    </h3>
                    <div className="flex items-center gap-1.5">
                        <button
                            onClick={() => setShowTravelHistory(true)}
                            className="flex items-center gap-1.5 px-3 py-2 rounded-lg border text-sm font-bold transition-all hover:bg-white/5"
                            style={{ borderColor: 'var(--border-color)', color: 'var(--text-muted)' }}
                            title="여행 기록 보기"
                        >
                            <ScrollTextIcon className="h-4 w-4" />
                            여행기록
                        </button>
                        <button
                            onClick={handleCamp}
                            disabled={campaign.currentDay >= totalDays}
                            className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg border text-sm font-bold transition-all hover:bg-white/5 disabled:opacity-30 disabled:cursor-not-allowed"
                            style={{ borderColor: 'var(--accent-color)', color: 'var(--accent-color)' }}
                            title="야영 — 하루가 지나갑니다"
                        >
                            <TentIcon className="h-4 w-4" />
                            야영
                        </button>
                        <button
                            onClick={openTravelModal}
                            className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-sm font-bold transition-all hover:opacity-90"
                            style={{ background: 'var(--accent-color)', color: '#fff' }}
                        >
                            <CompassIcon className="h-4 w-4" />
                            여행
                        </button>
                        <button
                            onClick={handleUndo}
                            disabled={undoStack.length === 0}
                            className="flex items-center gap-1.5 px-3 py-2 rounded-lg border text-sm font-bold transition-all hover:bg-white/5 disabled:opacity-30 disabled:cursor-not-allowed"
                            style={{ borderColor: 'var(--border-color)', color: 'var(--text-muted)' }}
                            title="마지막 작업 되돌리기"
                        >
                            <Undo2Icon className="h-4 w-4" />
                            되돌리기
                        </button>
                    </div>
                </div>
                <div className="overflow-x-auto ebr-scroll pb-2">
                    <div className="flex gap-1" style={{ minWidth: `${totalDays * 48}px` }}>
                        {Array.from({ length: totalDays }, (_, i) => {
                            const day = i + 1;
                            const weatherKey = campaignDef.weather[i] || 'none';
                            const weather = WEATHER_TYPES[weatherKey] || WEATHER_TYPES.none;
                            const isCurrent = day === campaign.currentDay;
                            const isPast = day < campaign.currentDay;
                            const isSelected = day === selectedDay;
                            const hasWeather = weatherKey !== 'none';
                            const hasStoryRef = !!storyRefs[day];
                            const hasNote = !!(dayNotes[day] && dayNotes[day].trim());
                            return (
                                <button
                                    key={day}
                                    onClick={() => handleDayClick(day)}
                                    className="flex flex-col items-center gap-0.5 transition-all shrink-0"
                                    style={{ width: '46px' }}
                                    title={`Day ${day}${hasWeather ? `: ${weather.label}` : ''}${hasStoryRef ? ` | 가이드: ${storyRefs[day]}` : ''}`}
                                >
                                    <span className="text-[10px] h-4 flex items-center justify-center font-medium" style={{ color: hasStoryRef ? 'var(--accent-color)' : 'transparent' }}>
                                        {hasStoryRef ? `📖${storyRefs[day]}` : '·'}
                                    </span>
                                    <span className="text-sm h-5 flex items-center justify-center">
                                        {hasWeather ? weather.icon : ''}
                                    </span>
                                    <span
                                        className="w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold border-2 transition-all"
                                        style={{
                                            background: isCurrent ? 'var(--accent-color)'
                                                : isPast ? 'var(--tag-bg)' : 'transparent',
                                            borderColor: isSelected ? 'var(--highlight)'
                                                : isCurrent ? 'var(--highlight)'
                                                : hasWeather ? 'var(--accent-color)' : 'var(--border-color)',
                                            color: isCurrent ? '#fff'
                                                : isPast ? 'var(--text-muted)' : 'var(--text-main)',
                                            opacity: isPast ? 0.5 : 1,
                                            boxShadow: isSelected ? '0 0 8px var(--accent-color)' : 'none',
                                        }}
                                    >
                                        {day}
                                    </span>
                                    <span className="text-[9px] leading-tight text-center h-5 overflow-hidden" style={{ color: 'var(--text-muted)', width: '46px' }}>
                                        {hasWeather ? weather.label : ''}
                                    </span>
                                    {hasNote && (
                                        <span className="w-1.5 h-1.5 rounded-full" style={{ background: 'var(--accent-color)' }} />
                                    )}
                                </button>
                            );
                        })}
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
                            {(() => {
                                const wk = campaignDef.weather[selectedDay - 1] || 'none';
                                const w = WEATHER_TYPES[wk];
                                return wk !== 'none' ? (
                                    <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: 'var(--tag-bg)', color: 'var(--text-muted)' }}>
                                        {w.icon} {w.label}
                                    </span>
                                ) : null;
                            })()}
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

            {/* 2열 그리드 레이아웃 (데스크톱) */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {/* 좌측 컬럼 — Rangers */}
                <section className="rounded-xl border p-4 shadow-md" style={cardStyle}>
                    <div className="flex items-center justify-between mb-3">
                        <h3 className="text-base font-bold" style={{ color: 'var(--highlight)' }}>RANGERS</h3>
                        {campaign.rangers.length < 4 && (
                            <button onClick={addRanger} className="p-1.5 rounded-md hover:bg-white/10 transition-colors" style={{ color: 'var(--clickable)' }}>
                                <PlusIcon className="h-5 w-5" />
                            </button>
                        )}
                    </div>
                    <div className="flex flex-col gap-2">
                        {campaign.rangers.map((name, idx) => (
                            <div key={idx} className="flex items-center gap-2">
                                <input
                                    type="text"
                                    value={name}
                                    onChange={(e) => updateRanger(idx, e.target.value)}
                                    placeholder={`Ranger ${idx + 1}`}
                                    className="flex-1 text-base px-3 py-2 rounded-lg border outline-none focus:ring-1"
                                    style={{ ...inputStyle, '--tw-ring-color': 'var(--accent-color)' }}
                                />
                                {campaign.rangers.length > 1 && (
                                    <button onClick={() => removeRanger(idx)} className="p-1.5 rounded-md hover:bg-white/10 transition-colors" style={{ color: 'var(--danger)' }}>
                                        <XIcon className="h-4 w-4" />
                                    </button>
                                )}
                            </div>
                        ))}
                    </div>
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
                                        <div key={idx} className="flex items-center gap-1.5 group">
                                            <span className="text-sm py-1 flex-1" style={{ color: 'var(--text-main)', borderBottom: '1px solid var(--border-color)' }}>
                                                {rwd}
                                            </span>
                                            <button onClick={() => removeReward(idx)} className="p-0.5 rounded opacity-0 group-hover:opacity-100 transition-opacity" style={{ color: 'var(--danger)' }}>
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
                                        <div key={idx} className="flex items-center gap-1.5 group">
                                            <span className="text-sm py-1 flex-1" style={{ color: 'var(--text-main)', borderBottom: '1px solid var(--border-color)' }}>
                                                {evt}
                                            </span>
                                            <button onClick={() => removeNotableEvent(idx)} className="p-0.5 rounded opacity-0 group-hover:opacity-100 transition-opacity" style={{ color: 'var(--danger)' }}>
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
                                        <div key={idx} className="flex items-center gap-1.5 group">
                                            <span className="text-sm py-1 flex-1" style={{ color: 'var(--text-main)', borderBottom: '1px solid var(--border-color)' }}>
                                                {card}
                                            </span>
                                            <button onClick={() => removeRemovedCard(idx)} className="p-0.5 rounded opacity-0 group-hover:opacity-100 transition-opacity" style={{ color: 'var(--danger)' }}>
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
        </div>
    );
};

export default CampaignTracker;

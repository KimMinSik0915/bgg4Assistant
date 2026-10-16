/**
 * VowTracker : 서약/진행도 트랙 관리 (서약, 여정, 전투 등)
 */
import { PROGRESS_RANKS, TICKS_PER_BOX, PROGRESS_BOXES } from '../resource/dataSet/gameData';

const TRACK_TYPES = [
    { key: 'vow',     label: '서약(Vow)',     color: '#d97706' }
  , { key: 'journey', label: '여정(Journey)', color: '#06b6d4' }
  , { key: 'combat',  label: '전투(Combat)',  color: '#ef4444' }
  , { key: 'other',   label: '기타',          color: '#8b5cf6' }
];

const TickMarks = ({ count }) => {
    if (count === 0) return null;
    const marks = [];
    for (let i = 1; i <= Math.min(count, TICKS_PER_BOX); i++) {
        marks.push(<div key={i} className={`is-tick-mark t${i}`} />);
    }
    return <>{marks}</>;
};

const ProgressBar = ({ ticks, rank, onAddMark, onRemoveMark }) => {
    const rankData = PROGRESS_RANKS.find(r => r.key === rank);
    const totalMaxTicks = PROGRESS_BOXES * TICKS_PER_BOX;
    const boxes = [];

    for (let i = 0; i < PROGRESS_BOXES; i++) {
        const boxStart = i * TICKS_PER_BOX;
        const boxTicks = Math.max(0, Math.min(TICKS_PER_BOX, ticks - boxStart));
        const isFull = boxTicks >= TICKS_PER_BOX;

        boxes.push(
            <div
                key={i}
                className={`is-progress-box ${isFull ? 'filled' : ''}`}
                onClick={onAddMark}
                onContextMenu={(e) => { e.preventDefault(); onRemoveMark(); }}
                title="클릭: 진행 표시 / 우클릭: 되돌리기"
            >
                <TickMarks count={boxTicks} />
            </div>
        );
    }

    const progressScore = Math.min(PROGRESS_BOXES, Math.floor(ticks / TICKS_PER_BOX));

    return (
        <div className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between">
                <span className="text-[0.6rem]" style={{ color: 'var(--text-muted)' }}>
                    {rankData?.label} · 한 칸당 {rankData?.ticksPerMark}틱
                </span>
                <span className="text-xs font-bold" style={{ color: '#d97706' }}>
                    진행도 점수: {progressScore}
                </span>
            </div>
            <div className="flex gap-1 flex-wrap">{boxes}</div>
            <div className="flex gap-1.5">
                <button
                    onClick={onAddMark}
                    className="text-[0.6rem] px-2 py-0.5 rounded font-bold"
                    style={{ backgroundColor: 'rgba(217,119,6,0.2)', color: '#d97706' }}
                    disabled={ticks >= totalMaxTicks}
                >+{rankData?.ticksPerMark}틱 진행</button>
                <button
                    onClick={onRemoveMark}
                    className="text-[0.6rem] px-2 py-0.5 rounded font-bold"
                    style={{ backgroundColor: 'rgba(239,68,68,0.2)', color: '#f87171' }}
                    disabled={ticks <= 0}
                >되돌리기</button>
            </div>
        </div>
    );
};

const VowCard = ({ vow, index, onUpdate, onRemove }) => {
    const trackType = TRACK_TYPES.find(t => t.key === vow.type) || TRACK_TYPES[0];
    const rankData = PROGRESS_RANKS.find(r => r.key === vow.rank);

    const addMark = () => {
        if (!rankData) return;
        const maxTicks = PROGRESS_BOXES * TICKS_PER_BOX;
        onUpdate(index, { ...vow, ticks: Math.min(maxTicks, vow.ticks + rankData.ticksPerMark) });
    };
    const removeMark = () => {
        if (!rankData) return;
        onUpdate(index, { ...vow, ticks: Math.max(0, vow.ticks - rankData.ticksPerMark) });
    };

    return (
        <div className="p-3 rounded-xl border is-fade-in" style={{ borderColor: 'var(--border-color)', backgroundColor: 'var(--card-bg)' }}>
            <div className="flex justify-between items-start mb-2">
                <div className="flex-1">
                    <input
                        type="text"
                        value={vow.title}
                        onChange={(e) => onUpdate(index, { ...vow, title: e.target.value })}
                        placeholder="서약/목표를 입력하세요..."
                        className="w-full text-sm font-bold bg-transparent border-none outline-none"
                        style={{ color: trackType.color }}
                    />
                </div>
                <button
                    onClick={() => onRemove(index)}
                    className="text-xs px-1.5 font-bold ml-2"
                    style={{ color: 'var(--danger)' }}
                >✕</button>
            </div>

            <div className="flex gap-2 mb-2">
                <select
                    value={vow.type}
                    onChange={(e) => onUpdate(index, { ...vow, type: e.target.value })}
                    className="text-[0.65rem] px-1.5 py-0.5 rounded border bg-transparent"
                    style={{ borderColor: 'var(--border-color)', color: 'var(--text-main)' }}
                >
                    {TRACK_TYPES.map(t => <option key={t.key} value={t.key}>{t.label}</option>)}
                </select>
                <select
                    value={vow.rank}
                    onChange={(e) => onUpdate(index, { ...vow, rank: e.target.value, ticks: 0 })}
                    className="text-[0.65rem] px-1.5 py-0.5 rounded border bg-transparent"
                    style={{ borderColor: 'var(--border-color)', color: 'var(--text-main)' }}
                >
                    {PROGRESS_RANKS.map(r => <option key={r.key} value={r.key}>{r.label}</option>)}
                </select>
            </div>

            <ProgressBar ticks={vow.ticks} rank={vow.rank} onAddMark={addMark} onRemoveMark={removeMark} />
        </div>
    );
};

const VowTracker = ({ vows, onUpdate, onAdd, onRemove }) => (
    <div className="flex flex-col gap-3">
        <div className="flex justify-between items-center">
            <span className="text-sm font-bold" style={{ color: '#d97706' }}>진행도 트랙</span>
            <button
                onClick={onAdd}
                className="text-xs px-2.5 py-1 rounded font-bold"
                style={{ backgroundColor: 'rgba(217,119,6,0.2)', color: '#d97706' }}
            >+ 트랙 추가</button>
        </div>
        {vows.length === 0 && (
            <div className="text-xs text-center py-6" style={{ color: 'var(--text-muted)' }}>
                아직 진행 중인 서약이 없습니다. "트랙 추가"를 눌러 시작하세요.
            </div>
        )}
        {vows.map((v, i) => (
            <VowCard key={i} vow={v} index={i} onUpdate={onUpdate} onRemove={onRemove} />
        ))}
    </div>
);

export default VowTracker;

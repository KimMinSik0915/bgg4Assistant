/**
 * CharacterPanel : Ironsworn 캐릭터 시트 (스탯, 상태 트랙, 모멘텀, 경험치)
 */
import { STATS, STATUS_TRACKS, MOMENTUM } from '../resource/dataSet/gameData';

const StatBlock = ({ stat, value, onChange }) => (
    <div className="flex flex-col items-center gap-1">
        <span className="text-[0.6rem] font-bold" style={{ color: 'var(--text-muted)' }}>{stat.label}</span>
        <div className="flex items-center gap-1">
            <button
                onClick={() => onChange(Math.max(1, value - 1))}
                className="w-5 h-5 rounded text-xs font-bold flex items-center justify-center"
                style={{ backgroundColor: 'var(--tag-bg)', color: 'var(--text-muted)' }}
            >-</button>
            <span className="text-xl font-black w-8 text-center" style={{ color: '#d97706' }}>{value}</span>
            <button
                onClick={() => onChange(Math.min(4, value + 1))}
                className="w-5 h-5 rounded text-xs font-bold flex items-center justify-center"
                style={{ backgroundColor: 'var(--tag-bg)', color: 'var(--text-muted)' }}
            >+</button>
        </div>
    </div>
);

const StatusTrack = ({ track, value, onChange }) => (
    <div className="flex flex-col gap-1">
        <div className="flex justify-between items-center">
            <span className="text-xs font-bold" style={{ color: track.color }}>{track.label}</span>
            <span className="text-xs font-bold" style={{ color: track.color }}>{value}/{track.max}</span>
        </div>
        <div className="flex gap-1.5">
            {Array.from({ length: track.max + 1 }, (_, i) => (
                <div
                    key={i}
                    onClick={() => onChange(i)}
                    className="is-status-pip"
                    style={{
                        color: track.color
                      , backgroundColor: i <= value ? `${track.color}33` : 'transparent'
                      , borderColor: i <= value ? track.color : 'rgba(255,255,255,0.15)'
                    }}
                >
                    {i}
                </div>
            ))}
        </div>
    </div>
);

const MomentumTrack = ({ value, max, reset, onChange }) => {
    const cells = [];
    for (let i = MOMENTUM.min; i <= max; i++) {
        const isActive = i <= value;
        const isNeg = i < 0;
        const isReset = i === reset;
        cells.push(
            <div
                key={i}
                onClick={() => onChange(i)}
                className={`is-momentum-cell ${isActive ? 'active' : ''} ${isNeg ? 'negative' : 'positive'}`}
                title={isReset ? `리셋 값: ${reset}` : undefined}
                style={isReset ? { borderColor: '#fbbf24', borderWidth: '2px' } : undefined}
            >
                {i}
            </div>
        );
    }
    return (
        <div className="flex flex-col gap-1">
            <div className="flex justify-between items-center">
                <span className="text-xs font-bold" style={{ color: '#818cf8' }}>모멘텀(Momentum)</span>
                <div className="flex gap-2 text-[0.6rem]" style={{ color: 'var(--text-muted)' }}>
                    <span>현재: <strong style={{ color: '#818cf8' }}>{value}</strong></span>
                    <span>최대: {max}</span>
                    <span>리셋: {reset}</span>
                </div>
            </div>
            <div className="is-momentum-track overflow-x-auto is-scroll pb-1">{cells}</div>
            <div className="flex gap-1.5 mt-0.5">
                <button
                    onClick={() => onChange(Math.min(max, value + 1))}
                    className="text-[0.65rem] px-2 py-0.5 rounded font-bold"
                    style={{ backgroundColor: 'rgba(99,102,241,0.2)', color: '#818cf8' }}
                >+1</button>
                <button
                    onClick={() => onChange(Math.max(MOMENTUM.min, value - 1))}
                    className="text-[0.65rem] px-2 py-0.5 rounded font-bold"
                    style={{ backgroundColor: 'rgba(239,68,68,0.2)', color: '#f87171' }}
                >-1</button>
                <button
                    onClick={() => onChange(reset)}
                    className="text-[0.65rem] px-2 py-0.5 rounded font-bold"
                    style={{ backgroundColor: 'var(--tag-bg)', color: 'var(--text-muted)' }}
                >리셋</button>
            </div>
        </div>
    );
};

const CharacterPanel = ({ char, onChange }) => {
    const update = (key, val) => onChange({ ...char, [key]: val });

    return (
        <div className="flex flex-col gap-3 is-fade-in">
            {/* 캐릭터 이름 */}
            <div className="p-3 rounded-xl border" style={{ borderColor: 'var(--border-color)', backgroundColor: 'var(--card-bg)' }}>
                <input
                    type="text"
                    value={char.name}
                    onChange={(e) => update('name', e.target.value)}
                    placeholder="캐릭터 이름을 입력하세요..."
                    className="w-full text-lg font-black bg-transparent border-none outline-none"
                    style={{ color: '#d97706' }}
                />
            </div>

            {/* 스탯 */}
            <div className="p-3 rounded-xl border" style={{ borderColor: 'var(--border-color)', backgroundColor: 'var(--card-bg)' }}>
                <div className="text-xs font-bold mb-2" style={{ color: 'var(--text-muted)' }}>능력치</div>
                <div className="flex justify-between flex-wrap gap-2">
                    {STATS.map(s => (
                        <StatBlock key={s.key} stat={s} value={char[s.key]} onChange={(v) => update(s.key, v)} />
                    ))}
                </div>
            </div>

            {/* 상태 트랙 */}
            <div className="p-3 rounded-xl border flex flex-col gap-3" style={{ borderColor: 'var(--border-color)', backgroundColor: 'var(--card-bg)' }}>
                <div className="text-xs font-bold" style={{ color: 'var(--text-muted)' }}>상태</div>
                {STATUS_TRACKS.map(t => (
                    <StatusTrack key={t.key} track={t} value={char[t.key]} onChange={(v) => update(t.key, v)} />
                ))}
            </div>

            {/* 모멘텀 */}
            <div className="p-3 rounded-xl border" style={{ borderColor: 'var(--border-color)', backgroundColor: 'var(--card-bg)' }}>
                <MomentumTrack
                    value={char.momentum}
                    max={char.momentumMax}
                    reset={char.momentumReset}
                    onChange={(v) => update('momentum', v)}
                />
            </div>

            {/* 경험치 & 유대 */}
            <div className="p-3 rounded-xl border flex gap-4" style={{ borderColor: 'var(--border-color)', backgroundColor: 'var(--card-bg)' }}>
                <div className="flex-1">
                    <div className="text-xs font-bold mb-1" style={{ color: 'var(--text-muted)' }}>경험치(XP)</div>
                    <div className="flex items-center gap-2">
                        <span className="text-sm" style={{ color: 'var(--text-main)' }}>
                            획득: <strong style={{ color: '#34d399' }}>{char.xpEarned}</strong>
                        </span>
                        <span className="text-sm" style={{ color: 'var(--text-main)' }}>
                            사용: <strong style={{ color: '#f87171' }}>{char.xpSpent}</strong>
                        </span>
                        <span className="text-sm" style={{ color: 'var(--text-main)' }}>
                            잔여: <strong style={{ color: '#fbbf24' }}>{char.xpEarned - char.xpSpent}</strong>
                        </span>
                    </div>
                    <div className="flex gap-1 mt-1.5">
                        <button onClick={() => update('xpEarned', char.xpEarned + 1)}
                            className="text-[0.6rem] px-1.5 py-0.5 rounded"
                            style={{ backgroundColor: 'rgba(52,211,153,0.2)', color: '#34d399' }}>획득+1</button>
                        <button onClick={() => update('xpSpent', Math.min(char.xpEarned, char.xpSpent + 1))}
                            className="text-[0.6rem] px-1.5 py-0.5 rounded"
                            style={{ backgroundColor: 'rgba(248,113,113,0.2)', color: '#f87171' }}>사용+1</button>
                    </div>
                </div>
                <div>
                    <div className="text-xs font-bold mb-1" style={{ color: 'var(--text-muted)' }}>유대(Bonds)</div>
                    <div className="flex items-center gap-2">
                        <button onClick={() => update('bonds', Math.max(0, char.bonds - 1))}
                            className="w-5 h-5 rounded text-xs font-bold flex items-center justify-center"
                            style={{ backgroundColor: 'var(--tag-bg)', color: 'var(--text-muted)' }}>-</button>
                        <span className="text-xl font-black" style={{ color: '#d97706' }}>{char.bonds}</span>
                        <button onClick={() => update('bonds', Math.min(40, char.bonds + 1))}
                            className="w-5 h-5 rounded text-xs font-bold flex items-center justify-center"
                            style={{ backgroundColor: 'var(--tag-bg)', color: 'var(--text-muted)' }}>+</button>
                        <span className="text-[0.6rem]" style={{ color: 'var(--text-muted)' }}>
                            진행도: {Math.min(10, Math.floor(char.bonds / 4))}
                        </span>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default CharacterPanel;

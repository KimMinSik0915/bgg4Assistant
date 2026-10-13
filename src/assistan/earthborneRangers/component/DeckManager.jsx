import { PlusIcon, XIcon, InfoIcon } from 'lucide-react';
import { ASPECTS, ASPECT_CARDS, BACKGROUNDS, SPECIALTIES, DECK_TARGET, DECK_COMPOSITION } from '../resource/dataSet/gameData';

/**
 * @Author : 김민식
 * DeckManager : 어스본레인져스 덱 구성 관리
 */
const DeckManager = ({ deck, onUpdate }) => {
    const updateField = (field, value) => {
        onUpdate({ ...deck, [field]: value });
    };

    const selectedAspect = ASPECT_CARDS.find(a => a.id === deck.aspectCardId);
    const selectedBg = BACKGROUNDS.find(b => b.key === deck.background);
    const selectedSpec = SPECIALTIES.find(s => s.key === deck.specialty);

    const currentCount = calculateDeckCount(deck);

    const addBackgroundCard = () => {
        const name = window.prompt('배경 카드 이름을 입력하세요:');
        if (name && name.trim() && deck.backgroundCards.length < (selectedBg?.pickCount || 5)) {
            updateField('backgroundCards', [...deck.backgroundCards, name.trim()]);
        }
    };

    const removeBackgroundCard = (idx) => {
        updateField('backgroundCards', deck.backgroundCards.filter((_, i) => i !== idx));
    };

    const addSpecialtyCard = () => {
        const name = window.prompt('전문 카드 이름을 입력하세요:');
        if (name && name.trim() && deck.specialtyCards.length < (selectedSpec?.pickCount || 5)) {
            updateField('specialtyCards', [...deck.specialtyCards, name.trim()]);
        }
    };

    const removeSpecialtyCard = (idx) => {
        updateField('specialtyCards', deck.specialtyCards.filter((_, i) => i !== idx));
    };

    const cardStyle = {
        background: 'var(--card-bg)',
        borderColor: 'var(--border-color)',
    };

    const inputStyle = {
        background: 'var(--input-bg)',
        color: 'var(--input-text)',
        borderColor: 'var(--border-color)',
    };

    return (
        <div className="flex flex-col gap-4 ebr-fade-in">
            {/* 레인져 이름 & 덱 카운터 */}
            <header
                className="p-4 rounded-xl border flex flex-col gap-3 shadow-lg"
                style={{ background: 'linear-gradient(135deg, var(--header-from) 0%, var(--header-to) 100%)', borderColor: 'var(--accent-color)' }}
            >
                <div className="flex items-center justify-between gap-3">
                    <input
                        type="text"
                        value={deck.rangerName}
                        onChange={(e) => updateField('rangerName', e.target.value)}
                        placeholder="레인져 이름"
                        className="text-xl font-bold text-white bg-transparent border-none outline-none flex-1 placeholder-white/40"
                    />
                    <div className="flex items-center gap-2">
                        <span
                            className="text-xs font-bold px-3 py-1.5 rounded-full border"
                            style={{
                                background: currentCount === DECK_TARGET ? 'var(--clickable)' : currentCount > DECK_TARGET ? 'var(--danger)' : 'rgba(255,255,255,0.1)',
                                borderColor: currentCount === DECK_TARGET ? 'var(--clickable)' : currentCount > DECK_TARGET ? 'var(--danger)' : 'rgba(255,255,255,0.2)',
                                color: '#fff',
                            }}
                        >
                            {currentCount}/{DECK_TARGET} 장
                        </span>
                    </div>
                </div>
                {/* 덱 구성 요약 바 */}
                <div className="w-full h-2 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.1)' }}>
                    <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{
                            width: `${Math.min(100, (currentCount / DECK_TARGET) * 100)}%`,
                            background: currentCount === DECK_TARGET
                                ? 'var(--clickable)'
                                : currentCount > DECK_TARGET
                                    ? 'var(--danger)'
                                    : 'var(--accent-color)',
                        }}
                    />
                </div>
            </header>

            {/* 애스펙트 카드 선택 */}
            <section className="rounded-xl border p-4 shadow-md" style={cardStyle}>
                <h3 className="text-sm font-bold mb-3" style={{ color: 'var(--highlight)' }}>애스펙트 카드 (Aspect Card)</h3>
                <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 mb-3">
                    {ASPECT_CARDS.map((card) => (
                        <button
                            key={card.id}
                            onClick={() => updateField('aspectCardId', deck.aspectCardId === card.id ? null : card.id)}
                            className="rounded-lg border p-2 text-center transition-all"
                            style={{
                                background: deck.aspectCardId === card.id ? 'var(--accent-color)' : 'var(--input-bg)',
                                borderColor: deck.aspectCardId === card.id ? 'var(--highlight)' : 'var(--border-color)',
                                boxShadow: deck.aspectCardId === card.id ? '0 0 12px rgba(139,92,246,0.3)' : 'none',
                            }}
                        >
                            <div className="text-[10px] font-bold mb-1" style={{ color: deck.aspectCardId === card.id ? '#fff' : 'var(--text-muted)' }}>
                                #{card.id}
                            </div>
                            <div className="flex flex-col gap-0.5">
                                {Object.values(ASPECTS).map(asp => (
                                    <div key={asp.key} className="flex items-center gap-1">
                                        <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: asp.color }} />
                                        <span className="text-[9px] flex-1 text-left" style={{ color: deck.aspectCardId === card.id ? 'rgba(255,255,255,0.8)' : 'var(--text-muted)' }}>
                                            {asp.label}
                                        </span>
                                        <span className="text-[10px] font-bold" style={{ color: deck.aspectCardId === card.id ? '#fff' : 'var(--text-main)' }}>
                                            {card[asp.key]}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        </button>
                    ))}
                </div>

                {/* 선택된 애스펙트 상세 */}
                {selectedAspect && (
                    <div className="rounded-lg border p-3" style={{ background: 'var(--input-bg)', borderColor: 'var(--border-color)' }}>
                        <p className="text-xs font-bold mb-2" style={{ color: 'var(--text-main)' }}>에너지 배분 (매 라운드)</p>
                        <div className="flex flex-col gap-1.5">
                            {Object.values(ASPECTS).map(asp => {
                                const val = selectedAspect[asp.key];
                                return (
                                    <div key={asp.key} className="flex items-center gap-2">
                                        <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: asp.color }} />
                                        <span className="text-xs w-8" style={{ color: 'var(--text-main)' }}>{asp.label}</span>
                                        <div className="flex-1 h-3 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.08)' }}>
                                            <div
                                                className="h-full rounded-full ebr-aspect-bar"
                                                style={{ width: `${(val / 3) * 100}%`, background: asp.color }}
                                            />
                                        </div>
                                        <span className="text-xs font-bold w-4 text-right" style={{ color: 'var(--text-main)' }}>{val}</span>
                                        <span className="text-[10px] hidden sm:inline" style={{ color: 'var(--text-muted)' }}>→ {asp.test}</span>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}
            </section>

            {/* 배경 선택 */}
            <section className="rounded-xl border p-4 shadow-md" style={cardStyle}>
                <h3 className="text-sm font-bold mb-3" style={{ color: 'var(--highlight)' }}>배경 (Background)</h3>
                <div className="flex gap-2 flex-wrap mb-3">
                    {BACKGROUNDS.map(bg => (
                        <button
                            key={bg.key}
                            onClick={() => {
                                updateField('background', deck.background === bg.key ? null : bg.key);
                                if (deck.background !== bg.key) updateField('backgroundCards', []);
                            }}
                            className="text-xs px-3 py-2 rounded-lg border font-medium transition-all"
                            style={{
                                background: deck.background === bg.key ? 'var(--accent-color)' : 'var(--input-bg)',
                                color: deck.background === bg.key ? '#fff' : 'var(--text-main)',
                                borderColor: deck.background === bg.key ? 'var(--accent-color)' : 'var(--border-color)',
                            }}
                        >
                            <div>{bg.label}</div>
                            <div className="text-[9px] mt-0.5 opacity-70">{bg.en}</div>
                        </button>
                    ))}
                </div>

                {/* 배경 카드 리스트 */}
                {selectedBg && (
                    <div className="rounded-lg border p-3" style={{ background: 'var(--input-bg)', borderColor: 'var(--border-color)' }}>
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
                                {selectedBg.label} 카드 ({deck.backgroundCards.length}/{selectedBg.pickCount})
                            </span>
                            {deck.backgroundCards.length < selectedBg.pickCount && (
                                <button onClick={addBackgroundCard} className="p-1 rounded-md hover:bg-white/10 transition-colors" style={{ color: 'var(--clickable)' }}>
                                    <PlusIcon className="h-3.5 w-3.5" />
                                </button>
                            )}
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                            {deck.backgroundCards.map((card, idx) => (
                                <span key={idx} className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full border" style={{ background: 'var(--tag-bg)', borderColor: 'var(--border-color)', color: 'var(--text-main)' }}>
                                    {card}
                                    <button onClick={() => removeBackgroundCard(idx)} className="hover:opacity-70" style={{ color: 'var(--danger)' }}>
                                        <XIcon className="h-3 w-3" />
                                    </button>
                                </span>
                            ))}
                        </div>
                    </div>
                )}
            </section>

            {/* 전문 선택 */}
            <section className="rounded-xl border p-4 shadow-md" style={cardStyle}>
                <h3 className="text-sm font-bold mb-3" style={{ color: 'var(--highlight)' }}>전문 (Specialty)</h3>
                <div className="flex gap-2 flex-wrap mb-3">
                    {SPECIALTIES.map(spec => (
                        <button
                            key={spec.key}
                            onClick={() => {
                                updateField('specialty', deck.specialty === spec.key ? null : spec.key);
                                if (deck.specialty !== spec.key) {
                                    updateField('specialtyCards', []);
                                    updateField('specialtyRole', '');
                                }
                            }}
                            className="text-xs px-3 py-2 rounded-lg border font-medium transition-all"
                            style={{
                                background: deck.specialty === spec.key ? 'var(--accent-color)' : 'var(--input-bg)',
                                color: deck.specialty === spec.key ? '#fff' : 'var(--text-main)',
                                borderColor: deck.specialty === spec.key ? 'var(--accent-color)' : 'var(--border-color)',
                            }}
                        >
                            <div>{spec.label}</div>
                            <div className="text-[9px] mt-0.5 opacity-70">{spec.en}</div>
                        </button>
                    ))}
                </div>

                {selectedSpec && (
                    <div className="flex flex-col gap-3">
                        {/* 역할 카드 */}
                        <div className="rounded-lg border p-3" style={{ background: 'var(--input-bg)', borderColor: 'var(--border-color)' }}>
                            <label className="text-xs mb-1.5 block" style={{ color: 'var(--text-muted)' }}>역할 카드 (Role)</label>
                            <input
                                type="text"
                                value={deck.specialtyRole}
                                onChange={(e) => updateField('specialtyRole', e.target.value)}
                                placeholder="역할 카드 이름"
                                className="w-full text-sm px-3 py-1.5 rounded-lg border outline-none focus:ring-1"
                                style={{ ...inputStyle, '--tw-ring-color': 'var(--accent-color)' }}
                            />
                        </div>

                        {/* 전문 카드 리스트 */}
                        <div className="rounded-lg border p-3" style={{ background: 'var(--input-bg)', borderColor: 'var(--border-color)' }}>
                            <div className="flex items-center justify-between mb-2">
                                <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
                                    {selectedSpec.label} 카드 ({deck.specialtyCards.length}/{selectedSpec.pickCount})
                                </span>
                                {deck.specialtyCards.length < selectedSpec.pickCount && (
                                    <button onClick={addSpecialtyCard} className="p-1 rounded-md hover:bg-white/10 transition-colors" style={{ color: 'var(--clickable)' }}>
                                        <PlusIcon className="h-3.5 w-3.5" />
                                    </button>
                                )}
                            </div>
                            <div className="flex flex-wrap gap-1.5">
                                {deck.specialtyCards.map((card, idx) => (
                                    <span key={idx} className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full border" style={{ background: 'var(--tag-bg)', borderColor: 'var(--border-color)', color: 'var(--text-main)' }}>
                                        {card}
                                        <button onClick={() => removeSpecialtyCard(idx)} className="hover:opacity-70" style={{ color: 'var(--danger)' }}>
                                            <XIcon className="h-3 w-3" />
                                        </button>
                                    </span>
                                ))}
                            </div>
                        </div>
                    </div>
                )}
            </section>

            {/* 성격 카드 */}
            <section className="rounded-xl border p-4 shadow-md" style={cardStyle}>
                <div className="flex items-center gap-2 mb-3">
                    <h3 className="text-sm font-bold" style={{ color: 'var(--highlight)' }}>성격 카드 (Personality)</h3>
                    <span className="text-[10px] px-2 py-0.5 rounded-full" style={{ background: 'var(--tag-bg)', color: 'var(--text-muted)' }}>
                        각 애스펙트당 1종 × 2장
                    </span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {Object.values(ASPECTS).map(asp => (
                        <div key={asp.key} className="flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full shrink-0" style={{ background: asp.color }} />
                            <span className="text-xs w-8 shrink-0" style={{ color: 'var(--text-main)' }}>{asp.label}</span>
                            <input
                                type="text"
                                value={deck.personalityCards[asp.key] || ''}
                                onChange={(e) => updateField('personalityCards', { ...deck.personalityCards, [asp.key]: e.target.value })}
                                placeholder={`${asp.label} 성격 카드`}
                                className="flex-1 text-xs px-2 py-1.5 rounded-lg border outline-none focus:ring-1"
                                style={{ ...inputStyle, '--tw-ring-color': asp.color }}
                            />
                        </div>
                    ))}
                </div>
            </section>

            {/* 외부 관심사 */}
            <section className="rounded-xl border p-4 shadow-md" style={cardStyle}>
                <h3 className="text-sm font-bold mb-3" style={{ color: 'var(--highlight)' }}>외부 관심사 (Outside Interest)</h3>
                <input
                    type="text"
                    value={deck.outsideInterest}
                    onChange={(e) => updateField('outsideInterest', e.target.value)}
                    placeholder="다른 배경/전문에서 1장 선택"
                    className="w-full text-sm px-3 py-1.5 rounded-lg border outline-none focus:ring-1"
                    style={{ ...inputStyle, '--tw-ring-color': 'var(--accent-color)' }}
                />
            </section>

            {/* 덱 구성 요약 */}
            <section className="rounded-xl border p-4 shadow-md" style={cardStyle}>
                <h3 className="text-sm font-bold mb-3" style={{ color: 'var(--highlight)' }}>덱 구성 요약</h3>
                <div className="flex flex-col gap-1.5">
                    {Object.entries(DECK_COMPOSITION).map(([key, comp]) => {
                        const actual = getActualCount(deck, key);
                        const isFull = actual >= comp.count;
                        return (
                            <div key={key} className="flex items-center gap-2 text-xs">
                                <span className="flex-1" style={{ color: 'var(--text-main)' }}>{comp.label}</span>
                                <span style={{ color: 'var(--text-muted)' }}>{comp.desc}</span>
                                <span
                                    className="font-bold w-10 text-right"
                                    style={{ color: isFull ? 'var(--clickable)' : 'var(--text-muted)' }}
                                >
                                    {actual}/{comp.count}
                                </span>
                            </div>
                        );
                    })}
                    <div className="mt-2 pt-2 border-t flex items-center justify-between" style={{ borderColor: 'var(--border-color)' }}>
                        <span className="text-sm font-bold" style={{ color: 'var(--text-main)' }}>합계</span>
                        <span
                            className="text-sm font-bold"
                            style={{ color: currentCount === DECK_TARGET ? 'var(--clickable)' : currentCount > DECK_TARGET ? 'var(--danger)' : 'var(--text-main)' }}
                        >
                            {currentCount}/{DECK_TARGET} 장
                        </span>
                    </div>
                </div>
            </section>

            {/* 메모 */}
            <section className="rounded-xl border p-4 shadow-md" style={cardStyle}>
                <h3 className="text-sm font-bold mb-3" style={{ color: 'var(--highlight)' }}>메모</h3>
                <textarea
                    value={deck.notes}
                    onChange={(e) => updateField('notes', e.target.value)}
                    placeholder="덱에 대한 메모를 자유롭게 작성하세요..."
                    rows={3}
                    className="w-full text-sm px-3 py-2 rounded-lg border outline-none focus:ring-1 resize-y"
                    style={{ ...inputStyle, '--tw-ring-color': 'var(--accent-color)' }}
                />
            </section>
        </div>
    );
};

function calculateDeckCount(deck) {
    let count = 0;
    const filledPersonality = Object.values(deck.personalityCards).filter(v => v && v.trim()).length;
    count += filledPersonality * 2;
    count += deck.backgroundCards.length;
    count += deck.specialtyRole ? 1 : 0;
    count += deck.specialtyCards.length;
    count += deck.outsideInterest ? 1 : 0;
    return count;
}

function getActualCount(deck, key) {
    switch (key) {
        case 'personality': return Object.values(deck.personalityCards).filter(v => v && v.trim()).length * 2;
        case 'background':  return deck.backgroundCards.length;
        case 'role':         return deck.specialtyRole ? 1 : 0;
        case 'specialty':    return deck.specialtyCards.length;
        case 'outside':      return deck.outsideInterest ? 1 : 0;
        default:             return 0;
    }
}

export default DeckManager;

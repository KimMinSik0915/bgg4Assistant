/**
 * @Author : 김민식
 * SpellsAndFeaturesCard : 직업 특성 + 주문 슬롯 체크박스 + 캔트립 + 준비된 주문
 *  - 새 HTML/CSS 프로토타입의 "주문 & 직업 특성" 카드를 그대로 이식
 */
const SpellsAndFeaturesCard = ({
    specialFeatures, usedFeatures, onToggleUsed
  , spellSlots, usedSpellSlots, onToggleSpellSlot
  , cantrips, preparedSpells, onRollSpell
}) => {
    // 남은 1레벨 슬롯이 있는지 계산 - 다 썼으면 준비된 주문 카드를 살짝 흐리게 표시해준다
    const usedSlotCount = Object.values(usedSpellSlots || {}).filter(Boolean).length;
    const noSlotsLeft = spellSlots > 0 && usedSlotCount >= spellSlots;

    return (
        <div className="p-3.5 rounded-xl border bg-[var(--card-bg)] backdrop-blur-md" style={{ borderColor : 'var(--border-color)' }}>
            <div
                className="text-base font-bold pb-1.5 mb-3 border-b-2"
                style={{ color : 'var(--accent-color)', borderColor : 'var(--border-color)' }}
            >
                주문 &amp; 직업 특성
            </div>

            {(specialFeatures || []).map((f, i) => (
                <div
                    key={i}
                    className="rounded-md p-2 mb-2 border"
                    style={{ backgroundColor : 'rgba(34,211,238,0.08)', borderColor : 'var(--highlight)' }}
                >
                    <div className="flex justify-between items-center mb-1">
                        <strong className="text-sm" style={{ color : 'var(--highlight)' }}>{f.name}</strong>
                        <label className="cs-checkbox-used inline-flex items-center gap-1 text-xs px-1.5 py-0.5">
                            <input type="checkbox" checked={!!usedFeatures?.[i]} onChange={() => onToggleUsed(i)} />
                            <span>사용함</span>
                        </label>
                    </div>
                    <div className="text-xs" style={{ color : 'var(--text-muted)' }}>{f.desc}</div>
                </div>
            ))}

            {spellSlots > 0 && (
                <div
                    className="mb-3 rounded-lg p-2"
                    style={{ backgroundColor : 'rgba(34,211,238,0.1)', border : '1px solid rgba(34,211,238,0.3)' }}
                >
                    <div className="flex justify-between items-center">
                        <span className="text-xs font-bold" style={{ color : '#a5f3fc' }}>✨ 주문 슬롯</span>
                        <div className="flex gap-1.5 flex-wrap justify-end">
                            {Array.from({ length : spellSlots }).map((_, i) => (
                                <label
                                    key={i}
                                    className="cs-checkbox-used inline-flex items-center gap-1 text-xs px-1.5 py-0.5 rounded"
                                    style={{ border : '1px solid rgba(255,255,255,0.1)' }}
                                >
                                    <input type="checkbox" checked={!!usedSpellSlots?.[i]} onChange={() => onToggleSpellSlot(i)} />
                                    <span className="font-bold text-white">🔮 슬롯 {i + 1}</span>
                                </label>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {(cantrips || []).length > 0 && (
                <div className="mb-2.5">
                    <div className="text-xs font-bold mb-1" style={{ color : 'var(--accent-color)' }}>캔트립 (Cantrips)</div>
                    {cantrips.map((c, i) => (
                        <div
                            key={i}
                            onClick={() => onRollSpell(c.name, c.dice, false)}
                            className="pl-2.5 pr-2 py-2 mb-2 rounded-r-md border-l-[3px] cursor-pointer active:scale-[0.98] transition-transform bg-black/15"
                            style={{ borderColor : 'var(--accent-color)' }}
                        >
                            <div className="font-bold text-sm text-[var(--text-main)]">{c.name} {c.dice ? '🎲' : ''}</div>
                            <div className="text-xs mt-0.5" style={{ color : 'var(--text-muted)' }}>{c.desc}</div>
                        </div>
                    ))}
                </div>
            )}

            {(preparedSpells || []).length > 0 && (
                <div>
                    <div className="text-xs font-bold mb-1 flex items-center justify-between" style={{ color : 'var(--accent-color)' }}>
                        <span>준비된 주문</span>
                        {noSlotsLeft && <span className="text-[0.65rem] font-normal" style={{ color : 'var(--text-muted)' }}>슬롯 소진 - 휴식 필요</span>}
                    </div>
                    {preparedSpells.map((s, i) => (
                        <div
                            key={i}
                            onClick={() => onRollSpell(s.name, s.dice, true)}
                            className={`pl-2.5 pr-2 py-2 mb-2 rounded-r-md border-l-[3px] cursor-pointer active:scale-[0.98] transition-transform bg-black/15 ${noSlotsLeft ? 'opacity-40' : ''}`}
                            style={{ borderColor : 'var(--accent-color)' }}
                        >
                            <div className="flex justify-between items-center">
                                <span className="font-bold text-sm text-[var(--text-main)]">{s.name} {s.dice ? '🎲' : ''}</span>
                                {s.type && (
                                    <span
                                        className="text-[0.65rem] text-white px-1.5 py-0.5 rounded"
                                        style={{ backgroundColor : 'var(--accent-color)' }}
                                    >{s.type}</span>
                                )}
                            </div>
                            <div className="text-xs mt-0.5" style={{ color : 'var(--text-muted)' }}>{s.desc}</div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

export default SpellsAndFeaturesCard;

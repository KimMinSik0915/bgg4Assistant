/**
 * @Author : 김민식
 * AbilitiesCard : 능력치, 내성굴림, 숙련 보너스, 주문 난이도/공격 보너스 카드
 */
const STAT_KEYS = [
    { id : 'strength', name : '근력' }
  , { id : 'dexterity', name : '민첩' }
  , { id : 'constitution', name : '건강' }
  , { id : 'intelligence', name : '지능' }
  , { id : 'wisdom', name : '지혜' }
  , { id : 'charisma', name : '매력' }
];

const AbilitiesCard = ({ stats, proficiencyBonus, spellDC, spellAttackBonus, onRollCheck }) => {
    return (
        <div className="p-3.5 rounded-xl border bg-[var(--card-bg)] backdrop-blur-md" style={{ borderColor : 'var(--border-color)' }}>
            <div
                className="text-base font-bold pb-1.5 mb-3 flex justify-between border-b-2"
                style={{ color : 'var(--accent-color)', borderColor : 'var(--border-color)' }}
            >
                <span>능력치 &amp; 내성굴림</span>
                <span className="text-xs font-normal" style={{ color : 'var(--clickable)' }}>*터치해서 판정</span>
            </div>

            <div className="grid grid-cols-3 gap-2">
                {STAT_KEYS.map(s => {
                    const st = stats?.[s.id] || { score : 10, mod : 0, save : false };
                    const modStr = st.mod >= 0 ? `+${st.mod}` : `${st.mod}`;
                    return (
                        <div
                            key={s.id}
                            onClick={() => onRollCheck(`${s.name} 판정`, 20, st.mod)}
                            className="rounded-lg text-center py-2 px-1 border cursor-pointer active:scale-95 transition-transform bg-black/20"
                            style={{ borderColor : 'var(--border-color)' }}
                        >
                            <div className="text-xs font-bold" style={{ color : 'var(--text-muted)' }}>{s.name}</div>
                            <div className="text-lg font-bold my-0.5 text-[var(--text-main)]">{st.score}</div>
                            <div
                                className="inline-block text-white px-1.5 rounded-full text-xs font-bold"
                                style={{ backgroundColor : 'var(--accent-color)' }}
                            >{modStr}</div>
                        </div>
                    );
                })}
            </div>

            <div className="mt-2.5">
                <div className="text-xs font-bold mb-1" style={{ color : 'var(--text-muted)' }}>내성굴림 (Saving Throws)</div>
                <div>
                    {STAT_KEYS.map(s => {
                        const st = stats?.[s.id] || { score : 10, mod : 0, save : false };
                        const saveBonus = st.save ? st.mod + (proficiencyBonus || 2) : st.mod;
                        const saveStr = saveBonus >= 0 ? `+${saveBonus}` : `${saveBonus}`;
                        return (
                            <span
                                key={s.id}
                                onClick={() => onRollCheck(`${s.name} 내성`, 20, saveBonus)}
                                className="inline-block px-2 py-0.5 rounded text-xs mr-1 mb-1.5 cursor-pointer text-white"
                                style={{ backgroundColor : st.save ? '#0284c7' : 'var(--tag-bg)' }}
                            >
                                {st.save ? '🛡️ ' : ''}{s.name} {saveStr}
                            </span>
                        );
                    })}
                </div>
            </div>

            <div className="grid grid-cols-3 gap-2 mt-3">
                <div className="rounded-lg text-center py-2 px-1 border" style={{ backgroundColor : 'rgba(34,211,238,0.1)', borderColor : 'var(--accent-color)' }}>
                    <div className="text-lg font-bold text-white">+{proficiencyBonus || 2}</div>
                    <div className="text-xs" style={{ color : 'var(--text-muted)' }}>숙련 보너스</div>
                </div>
                <div className="rounded-lg text-center py-2 px-1 border" style={{ backgroundColor : 'rgba(34,211,238,0.1)', borderColor : 'var(--accent-color)' }}>
                    <div className="text-lg font-bold text-white">{spellDC || '-'}</div>
                    <div className="text-xs" style={{ color : 'var(--text-muted)' }}>주문 난이도(DC)</div>
                </div>
                <div
                    onClick={() => onRollCheck('주문 공격 판정', 20, spellAttackBonus || 0)}
                    className="rounded-lg text-center py-2 px-1 border cursor-pointer active:scale-95 transition-transform"
                    style={{ backgroundColor : 'rgba(34,211,238,0.1)', borderColor : 'var(--accent-color)' }}
                >
                    <div className="text-lg font-bold text-white">+{spellAttackBonus || 0} 🎲</div>
                    <div className="text-xs" style={{ color : 'var(--text-muted)' }}>주문 공격 보너스</div>
                </div>
            </div>
        </div>
    );
}

export default AbilitiesCard;

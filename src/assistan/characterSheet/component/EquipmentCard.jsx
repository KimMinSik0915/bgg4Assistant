/**
 * @Author : 김민식
 * EquipmentCard : 8개 장비 슬롯 표시. 무기 슬롯은 피해 굴림, 그 외는 정보 표시
 */
const SLOT_DEF = [
    { key : 'head', type : '머리 (Head)', defaultIcon : '👑' }
  , { key : 'neck', type : '목/성물 (Neck)', defaultIcon : '📿' }
  , { key : 'armor', type : '갑옷 (Armor)', defaultIcon : '👘' }
  , { key : 'hands', type : '손/장갑 (Hands)', defaultIcon : '🧤' }
  , { key : 'feet', type : '신발 (Feet)', defaultIcon : '👢' }
  , { key : 'trinket', type : '장신구 (Trinket)', defaultIcon : '💍' }
  , { key : 'mainHand', type : '주 무기 (Main)', defaultIcon : '🏏' }
  , { key : 'offHand', type : '보조/양손 (Off)', defaultIcon : '🦯' }
];

const EquipmentCard = ({ equipmentSlots, onRollDamage, onShowInfo, isRolling }) => {
    return (
        <div
            className={`p-3.5 rounded-xl border bg-[var(--card-bg)] transition-opacity ${isRolling ? 'opacity-50 pointer-events-none' : ''}`}
            style={{ borderColor : 'var(--border-color)' }}
        >
            <div
                className="text-base font-bold pb-1.5 mb-3 border-b-2"
                style={{ color : 'var(--accent-color)', borderColor : 'var(--border-color)' }}
            >
                장비 착용 슬롯 (Equipment)
            </div>
            <div className="grid grid-cols-2 gap-2">
                {SLOT_DEF.map(s => {
                    const item = equipmentSlots?.[s.key];
                    if (!item) {
                        return (
                            <div key={s.key} className="rounded-lg border border-dashed p-2 flex items-center gap-2.5 bg-black/25" style={{ borderColor : 'var(--border-color)' }}>
                                <div className="w-8 h-8 rounded-md flex items-center justify-center text-lg bg-white/5 opacity-30 flex-shrink-0">{s.defaultIcon}</div>
                                <div className="flex flex-col overflow-hidden">
                                    <div className="text-[0.65rem] font-bold" style={{ color : 'var(--text-muted)' }}>{s.type}</div>
                                    <div className="text-xs font-bold truncate" style={{ color : 'var(--text-muted)' }}>(비어있음)</div>
                                </div>
                            </div>
                        );
                    }
                    const isWeapon = !!item.dice;
                    return (
                        <div
                            key={s.key}
                            onClick={() => isWeapon ? onRollDamage(item) : onShowInfo(s.type, item)}
                            className="rounded-lg border p-2 flex items-center gap-2.5 cursor-pointer active:scale-95 transition-transform bg-black/25"
                            style={{ borderColor : 'rgba(34,211,238,0.6)', backgroundColor : 'rgba(34,211,238,0.05)' }}
                        >
                            <div className="w-8 h-8 rounded-md flex items-center justify-center text-lg bg-white/5 flex-shrink-0">{item.icon || s.defaultIcon}</div>
                            <div className="flex flex-col overflow-hidden">
                                <div className="text-[0.65rem] font-bold" style={{ color : 'var(--text-muted)' }}>{s.type} {isWeapon ? '🎲' : ''}</div>
                                <div className="text-xs font-bold text-[var(--text-main)] truncate">{item.name}</div>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}

export default EquipmentCard;

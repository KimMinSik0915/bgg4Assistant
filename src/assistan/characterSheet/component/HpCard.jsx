/**
 * @Author : 김민식
 * HpCard : HP 증감, 피해 입력, 짧은/긴 휴식 처리 카드
 */
const HpCard = ({ hp, onChangeHp, onTakeDamage, onShortRest, onLongRest }) => {
    return (
        <div
            className="p-3.5 rounded-xl border"
            style={{
                background : 'linear-gradient(135deg, rgba(239,68,68,0.15) 0%, var(--card-bg) 100%)'
              , borderColor : 'rgba(239,68,68,0.4)'
            }}
        >
            <div
                className="text-base font-bold pb-1.5 mb-3 flex justify-between border-b-2"
                style={{ color : 'var(--danger)', borderColor : 'rgba(239,68,68,0.3)' }}
            >
                체력 &amp; 휴식 관리
            </div>
            <div className="flex items-center justify-between p-2.5 rounded-lg mb-2.5 bg-black/30">
                <div>
                    <div className="text-xs" style={{ color : 'var(--text-muted)' }}>
                        현재 HP / 최대 HP (히트다이스: {hp?.hitDice || '1d6'})
                    </div>
                    <div className="text-xl font-bold text-white">
                        <span style={{ color : 'var(--danger)' }}>{hp?.current || 0}</span> / <span>{hp?.max || 0}</span>
                    </div>
                </div>
                <div className="flex gap-1.5">
                    <button
                        onClick={() => onChangeHp(-1)}
                        className="w-8 h-8 rounded-md font-bold border text-white bg-[var(--card-bg)]"
                        style={{ borderColor : 'var(--border-color)' }}
                    >-</button>
                    <button
                        onClick={() => onChangeHp(1)}
                        className="w-8 h-8 rounded-md font-bold border text-white bg-[var(--card-bg)]"
                        style={{ borderColor : 'var(--border-color)' }}
                    >+</button>
                </div>
            </div>
            <div className="flex gap-1.5">
                <button
                    onClick={onTakeDamage}
                    className="flex-1 text-white border-none py-1.5 px-3 rounded-md font-bold text-xs"
                    style={{ backgroundColor : 'var(--danger)' }}
                >💥 피해</button>
                <button
                    onClick={onShortRest}
                    className="text-white border-none py-1.5 px-2.5 rounded-md font-bold text-xs bg-[#3b82f6]"
                    style={{ flex : 1.2 }}
                >☕ 짧은 휴식</button>
                <button
                    onClick={onLongRest}
                    className="text-white border-none py-1.5 px-2.5 rounded-md font-bold text-xs"
                    style={{ flex : 1.2, backgroundColor : 'var(--clickable)' }}
                >⛺ 긴 휴식</button>
            </div>
        </div>
    );
}

export default HpCard;

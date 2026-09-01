/**
 * @Author : 김민식
 * TraitsCard : 종족 특성 & 배경 능력 / 소지품 & 결점(Flaw)
 */
const InventoryCard = ({ inventory, flaw }) => {
    return (
        <>
            <div className="p-3.5 rounded-xl border bg-[var(--card-bg)]" style={{ borderColor : 'var(--border-color)' }}>
                <div
                    className="text-base font-bold pb-1.5 mb-3 border-b-2"
                    style={{ color : 'var(--accent-color)', borderColor : 'var(--border-color)' }}
                >
                    소지품 &amp; 결점
                </div>
                <div className="text-sm leading-relaxed mb-2.5" style={{ color : 'var(--text-muted)' }}>
                    <strong>🎒 기타 소지품:</strong><br />{inventory || '없음'}
                </div>
                {flaw && (
                    <div
                        className="p-2.5 rounded-r-md border-l-4 text-sm"
                        style={{ backgroundColor : 'rgba(236,72,153,0.1)', borderColor : 'var(--highlight)', color : 'var(--text-main)' }}
                    >
                        <strong style={{ color : 'var(--highlight)' }}>💥 결점 (Flaw):</strong> {flaw}
                    </div>
                )}
            </div>
        </>
    );
}

export default InventoryCard;

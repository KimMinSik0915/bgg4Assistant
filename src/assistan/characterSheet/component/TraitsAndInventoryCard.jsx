/**
 * @Author : 김민식
 * TraitsAndInventoryCard : 종족 특성 & 배경 능력 / 소지품 & 결점(Flaw)
 */
const TraitsAndInventoryCard = ({ traits, languages, inventory, flaw }) => {
    return (
        <>
            <div className="p-3.5 rounded-xl border bg-[var(--card-bg)]" style={{ borderColor : 'var(--border-color)' }}>
                <div
                    className="text-base font-bold pb-1.5 mb-3 border-b-2"
                    style={{ color : 'var(--accent-color)', borderColor : 'var(--border-color)' }}
                >
                    종족 특성 &amp; 배경 능력
                </div>
                {(traits || []).map((t, i) => (
                    <div
                        key={i}
                        className="rounded-md p-2 mb-2 border text-sm"
                        style={{ backgroundColor : 'rgba(139,92,246,0.08)', borderColor : 'rgba(139,92,246,0.3)' }}
                    >
                        <strong>{t.title}:</strong> {t.desc}
                    </div>
                ))}
                {languages && (
                    <div className="text-xs mt-1.5" style={{ color : 'var(--text-muted)' }}>
                        <strong>🗣️ 사용 언어:</strong> {languages}
                    </div>
                )}
            </div>
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

export default TraitsAndInventoryCard;

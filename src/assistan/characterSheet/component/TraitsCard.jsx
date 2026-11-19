/**
 * @Author : 김민식
 * TraitsCard : 종족 특성 & 배경 능력 / 소지품 & 결점(Flaw)
 */
const TraitsCard = ({ traits, languages }) => {
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
                        style={{ backgroundColor : 'rgba(34,211,238,0.08)', borderColor : 'rgba(34,211,238,0.3)' }}
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
        </>
    );
}

export default TraitsCard;

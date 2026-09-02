/**
 * @Author : 김민식
 * SkillsCard : 숙련된 기술 목록 및 판정 굴림
 */
const SkillsCard = ({ skills, onRollCheck }) => {
    return (
        <div className="p-3.5 rounded-xl border bg-[var(--card-bg)]" style={{ borderColor : 'var(--border-color)' }}>
            <div
                className="text-base font-bold pb-1.5 mb-3 flex justify-between border-b-2"
                style={{ color : 'var(--accent-color)', borderColor : 'var(--border-color)' }}
            >
                <span>숙련 기술 (Skills)</span>
                <span className="text-xs font-normal" style={{ color : 'var(--clickable)' }}>*터치해서 판정</span>
            </div>
            <div>
                {(skills || []).length === 0 && (
                    <div className="text-sm" style={{ color : 'var(--text-muted)' }}>숙련된 기술이 없습니다.</div>
                )}
                {(skills || []).map((sk, i) => (
                    <span
                        key={i}
                        onClick={() => onRollCheck(`${sk.name} 판정`, 20, sk.mod)}
                        className="inline-block px-2 py-0.5 rounded text-xs mr-1 mb-1.5 cursor-pointer text-white"
                        style={{ backgroundColor : 'var(--accent-color)' }}
                    >
                        {sk.name} (+{sk.mod})
                    </span>
                ))}
            </div>
        </div>
    );
}

export default SkillsCard;

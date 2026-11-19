/**
 * @Author : 김민식
 * CharacterHeaderCard : 캐릭터 이름, 레벨/직업, 영감/뱃지 표시 헤더
 */
const CharacterHeaderCard = ({ charData, inspiration, onToggleInspiration }) => {
    return (
        <header
            className="p-4 rounded-xl border flex flex-col gap-3 shadow-lg"
            style={{
                background : 'linear-gradient(135deg, var(--header-from) 0%, var(--header-to) 100%)'
              , borderColor : 'var(--accent-color)'
            }}
        >
            <div>
                <h1 className="text-2xl font-bold text-white">{charData.name || '이름 없음'}</h1>
                <p className="text-sm font-medium" style={{ color : 'var(--text-muted)' }}>
                    {charData.englishName || ''} | Lv.{charData.level || 1} {charData.class || ''} / {charData.background || ''}
                </p>
            </div>
            <div className="flex gap-1.5 flex-wrap items-center">
                <label
                    className="inline-flex items-center gap-1.5 cursor-pointer select-none px-2 py-1 rounded-md border"
                    style={{ background : 'rgba(255,255,255,0.08)', borderColor : 'var(--highlight)' }}
                >
                    <input
                        type="checkbox"
                        checked={inspiration}
                        onChange={onToggleInspiration}
                        className="w-[18px] h-[18px]"
                        style={{ accentColor : 'var(--accent-color)' }}
                    />
                    <strong className="text-xs text-white">✨ 영감 (Inspiration)</strong>
                </label>
                {charData.race && <span className="text-xs px-2.5 py-1 rounded-full bg-white/10 border border-white/20 text-white">{charData.race}</span>}
                {charData.speed && <span className="text-xs px-2.5 py-1 rounded-full bg-white/10 border border-white/20 text-white">이동 {charData.speed}</span>}
                {charData.vision && <span className="text-xs px-2.5 py-1 rounded-full bg-white/10 border border-white/20 text-white">{charData.vision}</span>}
            </div>
        </header>
    );
}

export default CharacterHeaderCard;

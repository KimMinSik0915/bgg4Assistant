/**
 * @Author : 김민식
 * SheetLoader : JSON/TXT 캐릭터 데이터 입력 및 테마 선택 영역
 */
import { themes } from "../resource/dataSet/themes";

const SheetLoader = ({ rawInput, onChangeRawInput, onRender, onFileUpload, themeKey, onChangeTheme }) => {
    return (
        <div className="border border-dashed border-[var(--accent-color)] p-3 rounded-xl flex flex-col gap-2 bg-[var(--card-bg)]">
            <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="text-sm font-bold text-[var(--accent-color)]">📄 캐릭터 데이터 로드 (JSON / TXT)</div>
                <div className="flex gap-1.5">
                    {Object.entries(themes).map(([key, t]) => (
                        <button
                            key={key}
                            onClick={() => onChangeTheme(key)}
                            className={`text-xs px-2.5 py-1 rounded-full border font-semibold ${
                                themeKey === key
                                    ? 'bg-[var(--accent-color)] text-white border-[var(--accent-color)]'
                                    : 'text-[var(--text-muted)] border-[var(--border-color)]'
                            }`}
                        >
                            {t.label}
                        </button>
                    ))}
                </div>
            </div>

            <textarea
                value={rawInput}
                onChange={(e) => onChangeRawInput(e.target.value)}
                placeholder="JSON 또는 TXT 형식의 텍스트를 여기에 붙여넣으세요..."
                className="w-full h-24 rounded-md p-2 text-xs font-mono resize-y border bg-[var(--input-bg)] text-[var(--input-text)] border-[var(--border-color)]"
            />

            <div className="flex gap-2 items-center">
                <button
                    onClick={onRender}
                    className="text-white font-bold text-xs px-3 py-2 rounded-md bg-[var(--accent-color)]"
                >
                    시트 렌더링
                </button>
                <label className="text-white font-bold text-xs px-3 py-2 rounded-md bg-[#3b82f6] cursor-pointer">
                    파일 업로드 (.json, .txt)
                    <input type="file" accept=".json,.txt" className="hidden" onChange={onFileUpload} />
                </label>
            </div>
        </div>
    );
}

export default SheetLoader;

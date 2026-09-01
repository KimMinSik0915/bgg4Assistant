/**
 * @Author : 김민식
 * SheetLoader : JSON/TXT 캐릭터 데이터 입력 및 테마 선택 영역
 */
import { UploadIcon, SparklesIcon, DownloadIcon } from "lucide-react";
import { themes } from "../resource/dataSet/themes";

const SheetLoader = ({ rawInput, onChangeRawInput, onRender, onFileUpload, themeKey, onChangeTheme, onExport, canExport }) => {
    return (
        <div className="border border-dashed p-3.5 rounded-2xl flex flex-col gap-2.5 bg-[var(--card-bg)] backdrop-blur-md" style={{ borderColor : 'var(--accent-color)' }}>
            <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="text-sm font-bold text-[var(--accent-color)]">📄 캐릭터 데이터 로드 (JSON / TXT)</div>
                <div className="flex gap-1.5">
                    {Object.entries(themes).map(([key, t]) => (
                        <button
                            key={key}
                            onClick={() => onChangeTheme(key)}
                            className={`text-xs px-2.5 py-1 rounded-full border font-semibold transition-colors ${
                                themeKey === key
                                    ? 'bg-[var(--accent-color)] text-white border-[var(--accent-color)]'
                                    : 'text-[var(--text-muted)] border-[var(--border-color)] hover:text-[var(--text-main)]'
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
                className="w-full h-24 rounded-lg p-2.5 text-xs font-mono resize-y border bg-[var(--input-bg)] text-[var(--input-text)] border-[var(--border-color)] focus:outline-none focus:ring-1"
                style={{ '--tw-ring-color' : 'var(--accent-color)' }}
            />

            <div className="flex flex-wrap gap-2 items-center">
                <button
                    onClick={onRender}
                    className="flex items-center gap-1.5 text-white font-bold text-xs px-3.5 py-2 rounded-full bg-[var(--accent-color)] transition-transform active:scale-95"
                >
                    <SparklesIcon size={14}/> 시트 렌더링
                </button>
                <label className="flex items-center gap-1.5 text-white font-bold text-xs px-3.5 py-2 rounded-full cursor-pointer transition-transform active:scale-95" style={{ backgroundColor : 'var(--highlight)' }}>
                    <UploadIcon size={14}/> 파일 업로드 (.json, .txt)
                    <input type="file" accept=".json,.txt" className="hidden" onChange={onFileUpload} />
                </label>
                <button
                    onClick={onExport}
                    disabled={!canExport}
                    className="flex items-center gap-1.5 text-white font-bold text-xs px-3.5 py-2 rounded-full bg-[var(--clickable)] disabled:opacity-40 transition-transform active:scale-95 disabled:active:scale-100"
                    title={canExport ? '현재 시트 상태를 JSON 파일로 내보내기' : '먼저 캐릭터 시트를 불러오세요'}
                >
                    <DownloadIcon size={14}/> 내보내기 (Export)
                </button>
            </div>
            {!canExport && (
                <div className="text-[0.65rem]" style={{ color : 'var(--text-muted)' }}>
                    시트를 불러온 뒤에 현재 상태를 JSON으로 내보낼 수 있어요.
                </div>
            )}
        </div>
    );
}

export default SheetLoader;

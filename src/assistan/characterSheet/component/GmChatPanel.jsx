/**
 * @Author : 김민식
 * GmChatPanel : Gemini와 대화하며 캐릭터 시트를 관리하는 AI GM 채팅 카드
 */
const GmChatPanel = ({
    apiKey, model, onChangeApiKey, onChangeModel, showSettings, onToggleSettings
  , messages, inputValue, onChangeInput, onSend, isLoading
  , attachedFiles, onAttachFile, onRemoveAttachment
}) => {
    const handleKeyDown = (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            onSend();
        }
    };

    return (
        <div className="p-3.5 rounded-xl border bg-[var(--card-bg)]" style={{ borderColor : 'var(--border-color)' }}>
            <div
                className="text-base font-bold pb-1.5 mb-3 flex justify-between items-center border-b-2"
                style={{ color : 'var(--accent-color)', borderColor : 'var(--border-color)' }}
            >
                <span>🎲 AI GM 채팅 (Gemini)</span>
                <button
                    onClick={onToggleSettings}
                    className="text-xs font-normal px-2 py-1 rounded"
                    style={{ color : 'var(--text-muted)', border : '1px solid var(--border-color)' }}
                >⚙️ 설정</button>
            </div>

            {showSettings && (
                <div className="mb-3 p-2.5 rounded-lg flex flex-col gap-2 border" style={{ borderColor : 'var(--border-color)', backgroundColor : 'rgba(0,0,0,0.2)' }}>
                    <label className="text-xs font-bold" style={{ color : 'var(--text-muted)' }}>
                        Gemini API 키
                        <input
                            type="password"
                            value={apiKey}
                            onChange={(e) => onChangeApiKey(e.target.value)}
                            placeholder="AIza..."
                            className="w-full mt-1 rounded-md p-2 text-xs border bg-[var(--input-bg)] text-[var(--input-text)]"
                            style={{ borderColor : 'var(--border-color)' }}
                        />
                    </label>
                    <label className="text-xs font-bold" style={{ color : 'var(--text-muted)' }}>
                        모델
                        <input
                            type="text"
                            value={model}
                            onChange={(e) => onChangeModel(e.target.value)}
                            placeholder="gemini-3.6-flash"
                            className="w-full mt-1 rounded-md p-2 text-xs border bg-[var(--input-bg)] text-[var(--input-text)]"
                            style={{ borderColor : 'var(--border-color)' }}
                        />
                    </label>
                    <div className="text-[0.65rem] leading-snug" style={{ color : 'var(--text-muted)' }}>
                        ⚠️ API 키는 이 브라우저(localStorage)에만 저장됩니다. 개인 로컬 사용은
                        문제없지만, 배포된 사이트에 올리면 누구나 볼 수 있으니 주의하세요.
                    </div>
                </div>
            )}

            <div
                className="rounded-lg p-2 mb-2 overflow-y-auto flex flex-col gap-2"
                style={{ maxHeight : '260px', backgroundColor : 'rgba(0,0,0,0.25)' }}
            >
                {messages.length === 0 && (
                    <div className="text-xs text-center py-4" style={{ color : 'var(--text-muted)' }}>
                        GM에게 말을 걸어보세요. (예: "방에 들어서자 무슨 일이 벌어지나요?")
                    </div>
                )}
                {messages.map((m, i) => (
                    <div
                        key={i}
                        className={`text-xs rounded-md px-2.5 py-1.5 max-w-[85%] whitespace-pre-wrap ${m.role === 'user' ? 'self-end text-white' : 'self-start'}`}
                        style={
                            m.role === 'user'
                                ? { backgroundColor : 'var(--accent-color)' }
                                : m.role === 'system'
                                    ? { backgroundColor : 'transparent', color : 'var(--clickable)', fontStyle : 'italic', alignSelf : 'center' }
                                    : { backgroundColor : 'var(--tag-bg)', color : 'var(--text-main)' }
                        }
                    >
                        {m.text}
                    </div>
                ))}
                {isLoading && (
                    <div className="text-xs self-start" style={{ color : 'var(--text-muted)' }}>GM이 생각하는 중...</div>
                )}
            </div>

            {(attachedFiles || []).length > 0 && (
                <div className="flex flex-col gap-1 mb-1.5">
                    {attachedFiles.map((f, i) => (
                        <div
                            key={i}
                            className="flex items-center justify-between text-xs px-2 py-1 rounded-md"
                            style={{ backgroundColor : 'rgba(139,92,246,0.15)', color : 'var(--text-main)' }}
                        >
                            <span>📎 {f.name}</span>
                            <button onClick={() => onRemoveAttachment(i)} className="font-bold px-1" style={{ color : 'var(--danger)' }}>✕</button>
                        </div>
                    ))}
                </div>
            )}

            <div className="flex gap-1.5 items-end">
                <label
                    className="text-xs px-2.5 py-2 rounded-md cursor-pointer border"
                    style={{ borderColor : 'var(--border-color)', color : 'var(--text-muted)' }}
                    title="이미지/PDF 첨부 (여러 개 선택 가능)"
                >
                    📎
                    <input type="file" accept="image/*,application/pdf,application/txt,application/json" multiple className="hidden" onChange={onAttachFile} />
                </label>
                <textarea
                    value={inputValue}
                    onChange={(e) => onChangeInput(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="GM에게 메시지 보내기..."
                    rows={1}
                    className="flex-1 rounded-md p-2 text-xs border resize-none bg-[var(--input-bg)] text-[var(--input-text)]"
                    style={{ borderColor : 'var(--border-color)' }}
                />
                <button
                    onClick={onSend}
                    disabled={isLoading || !apiKey}
                    className="text-white font-bold text-xs px-3 py-2 rounded-md disabled:opacity-40"
                    style={{ backgroundColor : 'var(--highlight)' }}
                >전송</button>
            </div>
            {!apiKey && (
                <div className="text-[0.65rem] mt-1.5" style={{ color : 'var(--text-muted)' }}>
                    ⚙️ 설정에서 Gemini API 키를 입력해야 대화할 수 있어요.
                </div>
            )}
        </div>
    );
}

export default GmChatPanel;

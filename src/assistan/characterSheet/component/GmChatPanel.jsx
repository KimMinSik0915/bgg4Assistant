/**
 * @Author : 김민식
 * GmChatPanel : Gemini와 대화하며 캐릭터 시트를 관리하는 AI GM 채팅 카드
 */
const GmChatPanel = ({
                         apiKey, model, onChangeApiKey, onChangeModel, showSettings, onToggleSettings
                         , onExportLogs
                         , messages, inputValue, onChangeInput, onSend, isLoading
                         , attachedFiles, onAttachFile, onRemoveAttachment
                         , scenarioUrl, mapUrl1, mapUrl2, isFetchLoading, scenarioData
                         , onChangeScenarioUrl, onChangeMapUrl1, onChangeMapUrl2, onLoadScenario
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

                <div className="flex gap-1.5 items-center">
                    <button
                        onClick={onExportLogs}
                        className="text-xs font-normal px-2 py-1 rounded hover:opacity-80 transition-opacity"
                        style={{ color : 'var(--text-muted)', border : '1px solid var(--border-color)' }}
                        title="대화 내역을 TXT 파일로 다운로드"
                    >
                        📄 추출하기
                    </button>
                    <button
                        onClick={onToggleSettings}
                        className="text-xs font-normal px-2 py-1 rounded hover:opacity-80 transition-opacity"
                        style={{ color : 'var(--text-muted)', border : '1px solid var(--border-color)' }}
                    >
                        ⚙️ 설정
                    </button>
                </div>
            </div>

            {showSettings && (
                <div className="mb-3 p-2.5 rounded-lg flex flex-col gap-2.5 border" style={{ borderColor : 'var(--border-color)', backgroundColor : 'rgba(0,0,0,0.2)' }}>
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
                            placeholder="gemini-2.5-flash"
                            className="w-full mt-1 rounded-md p-2 text-xs border bg-[var(--input-bg)] text-[var(--input-text)]"
                            style={{ borderColor : 'var(--border-color)' }}
                        />
                    </label>

                    {/* 📜 시나리오 JSON URL 및 로드 버튼 */}
                    <div className="pt-2 border-t flex flex-col gap-1" style={{ borderColor : 'rgba(255,255,255,0.1)' }}>
                        <div className="flex justify-between items-center">
                            <span className="text-xs font-bold" style={{ color : 'var(--text-muted)' }}>시나리오 JSON Raw URL</span>
                            {scenarioData && (
                                <span className="text-[0.65rem] font-bold" style={{ color : 'var(--clickable)' }}>✓ 로드 완료</span>
                            )}
                        </div>
                        <div className="flex gap-1.5">
                            <input
                                type="text"
                                value={scenarioUrl || ''}
                                onChange={(e) => onChangeScenarioUrl(e.target.value)}
                                placeholder="https://raw.githubusercontent.com/.../scenario.json"
                                className="flex-1 rounded-md p-2 text-xs border bg-[var(--input-bg)] text-[var(--input-text)]"
                                style={{ borderColor : 'var(--border-color)' }}
                            />
                            <button
                                onClick={onLoadScenario}
                                disabled={isFetchLoading || !scenarioUrl}
                                className="text-white font-bold text-xs px-3 py-1.5 rounded-md disabled:opacity-40"
                                style={{ backgroundColor : 'var(--highlight)' }}
                            >
                                {isFetchLoading ? '불러오는 중...' : '로드'}
                            </button>
                        </div>
                    </div>

                    {/* 🗺️ 지도 1 URL */}
                    <label className="text-xs font-bold" style={{ color : 'var(--text-muted)' }}>
                        지도 1 URL (예: 크로커 동굴 지도)
                        <input
                            type="text"
                            value={mapUrl1 || ''}
                            onChange={(e) => onChangeMapUrl1(e.target.value)}
                            placeholder="https://raw.githubusercontent.com/.../map1.jpg"
                            className="w-full mt-1 rounded-md p-2 text-xs border bg-[var(--input-bg)] text-[var(--input-text)]"
                            style={{ borderColor : 'var(--border-color)' }}
                        />
                    </label>

                    {/* 🗺️ 지도 2 URL */}
                    <label className="text-xs font-bold" style={{ color : 'var(--text-muted)' }}>
                        지도 2 URL (예: 살스볼트 지도)
                        <input
                            type="text"
                            value={mapUrl2 || ''}
                            onChange={(e) => onChangeMapUrl2(e.target.value)}
                            placeholder="https://raw.githubusercontent.com/.../map2.jpg"
                            className="w-full mt-1 rounded-md p-2 text-xs border bg-[var(--input-bg)] text-[var(--input-text)]"
                            style={{ borderColor : 'var(--border-color)' }}
                        />
                    </label>

                    <div className="text-[0.65rem] leading-snug mt-1" style={{ color : 'var(--text-muted)' }}>
                        ⚠️ API 키는 브라우저(localStorage)에만 저장됩니다. URL을 입력하고 [로드]를 누르면 시나리오 및 지도 정보가 AI GM의 컨텍스트로 자동 전달됩니다.
                    </div>
                </div>
            )}

            {/* 💬 대화창 높이를 260px -> 480px로 넓혀 가독성 대폭 향상 */}
            <div
                className="rounded-lg p-3 mb-3 overflow-y-auto flex flex-col gap-2.5"
                style={{ maxHeight : '780px', minHeight : '600px', backgroundColor : 'rgba(0,0,0,0.25)' }}
            >
                {messages.length === 0 && (
                    <div className="text-xs text-center py-8" style={{ color : 'var(--text-muted)' }}>
                        GM에게 말을 걸어보세요. (예: "방에 들어서자 무슨 일이 벌어지나요?")
                    </div>
                )}
                {messages.map((m, i) => (
                    <div
                        key={i}
                        className={`text-xs rounded-md px-3 py-2 max-w-[85%] whitespace-pre-wrap leading-relaxed ${m.role === 'user' ? 'self-end text-white' : 'self-start'}`}
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
                    <div className="text-xs self-start italic animate-pulse" style={{ color : 'var(--text-muted)' }}>GM이 생각하는 중...</div>
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
                    rows={2}
                    className="flex-1 rounded-md p-2 text-xs border resize-none bg-[var(--input-bg)] text-[var(--input-text)]"
                    style={{ borderColor : 'var(--border-color)' }}
                />
                <button
                    onClick={onSend}
                    disabled={isLoading || !apiKey}
                    className="text-white font-bold text-xs px-3.5 py-3 rounded-md disabled:opacity-40"
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
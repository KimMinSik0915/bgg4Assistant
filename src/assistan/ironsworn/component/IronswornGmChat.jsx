/**
 * IronswornGmChat : Ironsworn 전용 AI GM 채팅 패널 (Gemini)
 */
import { useState, useEffect, useRef } from 'react';

const IronswornGmChat = ({
    apiKey, model, onChangeApiKey, onChangeModel
  , messages, inputValue, onChangeInput, onSend, isLoading
  , showSettings, onToggleSettings, onExportLogs
}) => {
    const chatEndRef = useRef(null);
    useEffect(() => {
        chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages, isLoading]);

    const handleKeyDown = (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            onSend();
        }
    };

    return (
        <div className="p-3.5 rounded-xl border bg-[var(--card-bg)] h-full flex flex-col min-h-0 overflow-hidden"
             style={{ borderColor: 'var(--border-color)' }}>
            <div className="text-base font-bold pb-1.5 mb-3 flex justify-between items-center border-b-2 shrink-0"
                 style={{ color: '#d97706', borderColor: 'var(--border-color)' }}>
                <span>AI GM (Ironsworn)</span>
                <div className="flex gap-1.5 items-center">
                    <button onClick={onExportLogs}
                        className="text-xs font-normal px-2 py-1 rounded hover:opacity-80 transition-opacity"
                        style={{ color: 'var(--text-muted)', border: '1px solid var(--border-color)' }}>
                        추출하기
                    </button>
                    <button onClick={onToggleSettings}
                        className="text-xs font-normal px-2 py-1 rounded hover:opacity-80 transition-opacity"
                        style={{ color: 'var(--text-muted)', border: '1px solid var(--border-color)' }}>
                        설정
                    </button>
                </div>
            </div>

            {showSettings && (
                <div className="is-scroll mb-3 p-2.5 rounded-lg flex flex-col gap-2.5 border shrink-0 max-h-[40vh] overflow-y-auto"
                     style={{ borderColor: 'var(--border-color)', backgroundColor: 'rgba(0,0,0,0.2)' }}>
                    <label className="text-xs font-bold" style={{ color: 'var(--text-muted)' }}>
                        Gemini API 키
                        <input type="password" value={apiKey}
                            onChange={(e) => onChangeApiKey(e.target.value)}
                            placeholder="AIza..."
                            className="w-full mt-1 rounded-md p-2 text-xs border bg-[var(--input-bg)] text-[var(--input-text)]"
                            style={{ borderColor: 'var(--border-color)' }} />
                    </label>
                    <label className="text-xs font-bold" style={{ color: 'var(--text-muted)' }}>
                        모델
                        <input type="text" value={model}
                            onChange={(e) => onChangeModel(e.target.value)}
                            placeholder="gemini-2.5-flash"
                            className="w-full mt-1 rounded-md p-2 text-xs border bg-[var(--input-bg)] text-[var(--input-text)]"
                            style={{ borderColor: 'var(--border-color)' }} />
                    </label>
                    <div className="text-[0.65rem] leading-snug mt-1" style={{ color: 'var(--text-muted)' }}>
                        API 키는 브라우저(localStorage)에만 저장됩니다.
                    </div>
                </div>
            )}

            {/* 대화창 */}
            <div className="is-scroll rounded-lg p-3 mb-3 overflow-y-auto flex flex-col gap-2.5 flex-1 min-h-[40px]"
                 style={{ backgroundColor: 'rgba(0,0,0,0.25)' }}>
                {messages.length === 0 && (
                    <div className="text-xs text-center py-8" style={{ color: 'var(--text-muted)' }}>
                        GM에게 말을 걸어보세요. (예: "나는 철의 서약자로서 마을을 떠나 여정을 시작합니다.")
                    </div>
                )}
                {messages.map((m, i) => (
                    <div
                        key={i}
                        className={`text-xs rounded-md px-3 py-2 max-w-[85%] whitespace-pre-wrap leading-relaxed ${
                            m.role === 'user' ? 'self-end text-white' : 'self-start'
                        }`}
                        style={
                            m.role === 'user'
                                ? { backgroundColor: '#b45309' }
                                : m.role === 'system'
                                    ? { backgroundColor: 'transparent', color: '#34d399', fontStyle: 'italic', alignSelf: 'center' }
                                    : { backgroundColor: 'var(--tag-bg)', color: 'var(--text-main)' }
                        }
                    >
                        {m.text}
                    </div>
                ))}
                {isLoading && (
                    <div className="text-xs self-start italic animate-pulse" style={{ color: 'var(--text-muted)' }}>
                        GM이 생각하는 중...
                    </div>
                )}
                <div ref={chatEndRef} />
            </div>

            {/* 입력 */}
            <div className="flex gap-1.5 items-end shrink-0">
                <textarea
                    value={inputValue}
                    onChange={(e) => onChangeInput(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="GM에게 메시지 보내기..."
                    rows={2}
                    className="flex-1 rounded-md p-2 text-xs border resize-none bg-[var(--input-bg)] text-[var(--input-text)]"
                    style={{ borderColor: 'var(--border-color)' }}
                />
                <button
                    onClick={onSend}
                    disabled={isLoading || !apiKey}
                    className="text-white font-bold text-xs px-3.5 py-3 rounded-md disabled:opacity-40"
                    style={{ backgroundColor: '#b45309' }}
                >전송</button>
            </div>
            {!apiKey && (
                <div className="text-[0.65rem] mt-1.5" style={{ color: 'var(--text-muted)' }}>
                    설정에서 Gemini API 키를 입력해야 대화할 수 있어요.
                </div>
            )}
        </div>
    );
};

export default IronswornGmChat;

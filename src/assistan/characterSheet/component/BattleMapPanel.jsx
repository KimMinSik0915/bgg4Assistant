import React, { useState, useRef } from 'react';

/**
 * @Author : 김민식
 * BattleMapPanel : 모바일 대응 + 토큰 화면 중앙 생성 + 지도 10% 축소 + 지도 잠금
 */
const BattleMapPanel = () => {
    const [maps, setMaps] = useState([]);                  // 업로드된 지도 배열
    const [activeMapId, setActiveMapId] = useState(null);     // 현재 활성화된 지도 ID
    const [tokens, setTokens] = useState([]);              // 배치된 토큰 배열
    const [selectedTokenId, setSelectedTokenId] = useState(null); // 선택된 토큰 ID
    const [draggingTokenId, setDraggingTokenId] = useState(null); // 드래그 중인 토큰 ID
    const [showGrid, setShowGrid] = useState(true);        // 격자 가시성
    const [mapScale, setMapScale] = useState(100);         // 🔍 지도 배율 (% : 10 ~ 200)

    // 🔒 지도 잠금 상태
    const [isMapLocked, setIsMapLocked] = useState(false); // true일 때 지도 드래그 금지

    // 🖐️ 지도 드래그 이동(Pan) 상태
    const [panOffset, setPanOffset] = useState({ x: 0, y: 0 });
    const [isPanning, setIsPanning] = useState(false);

    const dragRef = useRef({ startX: 0, startY: 0, tokenX: 0, tokenY: 0, isDragging: false });
    const panStartRef = useRef({ x: 0, y: 0 });
    const boardRef = useRef(null);

    // 헬퍼: 터치/마우스 좌표 통합 추출
    const getPos = (e) => {
        if (e.touches && e.touches.length > 0) {
            return { x: e.touches[0].clientX, y: e.touches[0].clientY };
        }
        return { x: e.clientX, y: e.clientY };
    };

    // 🗺️ 지도 업로드
    const handleMapUpload = (e) => {
        const files = Array.from(e.target.files || []);
        if (files.length === 0) return;

        const readPromises = files.map(file => new Promise(res => {
            const reader = new FileReader();
            reader.onload = ev => res({ id: Date.now() + Math.random(), name: file.name.replace(/\.[^/.]+$/, ""), url: ev.target.result });
            reader.readAsDataURL(file);
        }));

        Promise.all(readPromises).then(newMaps => {
            setMaps(prev => [...prev, ...newMaps]);
            if (!activeMapId && newMaps.length > 0) {
                setActiveMapId(newMaps[0].id);
            }
        });
        e.target.value = '';
    };

    // 🎭 토큰 업로드 (현재 보고 있는 화면 중앙에 생성)
    const handleTokenUpload = (e) => {
        const files = Array.from(e.target.files || []);
        if (files.length === 0) return;

        // 현재 보드 영역의 중심점 좌표 계산 (Zoom 및 Pan 오프셋 반영)
        const boardWidth = boardRef.current ? boardRef.current.offsetWidth : 600;
        const boardHeight = boardRef.current ? boardRef.current.offsetHeight : 400;
        const scaleFactor = mapScale / 100;
        const tokenSize = 56; // 기본 1칸 크기

        // 🎯 화면 중앙 좌표 계산
        const centerX = Math.max(0, (boardWidth / 2 - panOffset.x) / scaleFactor - tokenSize / 2);
        const centerY = Math.max(0, (boardHeight / 2 - panOffset.y) / scaleFactor - tokenSize / 2);

        const readPromises = files.map((file, idx) => new Promise(res => {
            const reader = new FileReader();
            reader.onload = ev => res({
                id: Date.now() + Math.random(),
                name: file.name.replace(/\.[^/.]+$/, ""),
                url: ev.target.result,
                x: centerX + (idx * 12), // 여러 개 업로드 시 약간의 오프셋 부여
                y: centerY + (idx * 12),
                size: tokenSize,
                hp: 30,
                maxHp: 30
            });
            reader.readAsDataURL(file);
        }));

        Promise.all(readPromises).then(newTokens => {
            setTokens(prev => [...prev, ...newTokens]);
            if (newTokens.length > 0) {
                setSelectedTokenId(newTokens[newTokens.length - 1].id);
            }
        });
        e.target.value = '';
    };

    // 🔍 지도 확대 / 축소 (최대 10%까지 축소 가능)
    const handleZoom = (delta) => {
        setMapScale(prev => Math.max(10, Math.min(200, prev + delta)));
    };

    // 🔄 지도 위치 & 배율 초기화
    const resetMapView = () => {
        setMapScale(100);
        setPanOffset({ x: 0, y: 0 });
    };

    // 🖐️ 지도 바탕 터치/클릭 시작
    const handleBoardStart = (e) => {
        setSelectedTokenId(null);

        // 지도 잠금 상태라면 드래그 이동 금지
        if (isMapLocked) return;

        const pos = getPos(e);
        setIsPanning(true);
        panStartRef.current = {
            x: pos.x - panOffset.x,
            y: pos.y - panOffset.y
        };
    };

    // 🖱️ 토큰 터치/클릭 시작
    const handleTokenStart = (e, token) => {
        e.stopPropagation(); // 지도 드래그 방지
        const pos = getPos(e);
        setDraggingTokenId(token.id);

        dragRef.current = {
            startX: pos.x,
            startY: pos.y,
            tokenX: token.x,
            tokenY: token.y,
            isDragging: false
        };
    };

    // 🖱️ 토큰 클릭 (선택 토글)
    const handleTokenClick = (e, tokenId) => {
        e.stopPropagation();
        if (!dragRef.current.isDragging) {
            setSelectedTokenId(prev => (prev === tokenId ? null : tokenId));
        }
    };

    // 🖱️ 이동 처리 (터치 & 마우스 공용)
    const handleMove = (e) => {
        const pos = getPos(e);

        // 1. 토큰 이동 중
        if (draggingTokenId) {
            const scaleFactor = mapScale / 100;
            const deltaX = (pos.x - dragRef.current.startX) / scaleFactor;
            const deltaY = (pos.y - dragRef.current.startY) / scaleFactor;

            if (Math.abs(deltaX) > 3 || Math.abs(deltaY) > 3) {
                dragRef.current.isDragging = true;
            }

            setTokens(prev => prev.map(t => {
                if (t.id === draggingTokenId) {
                    return {
                        ...t,
                        x: Math.max(0, dragRef.current.tokenX + deltaX),
                        y: Math.max(0, dragRef.current.tokenY + deltaY)
                    };
                }
                return t;
            }));
        }
        // 2. 지도 드래그 이동 중 (잠금 해제 상태일 때만)
        else if (isPanning && !isMapLocked) {
            setPanOffset({
                x: pos.x - panStartRef.current.x,
                y: pos.y - panStartRef.current.y
            });
        }
    };

    const handleEnd = () => {
        setDraggingTokenId(null);
        setIsPanning(false);
    };

    // 📏 토큰 크기 조절
    const changeTokenSize = (id, delta) => {
        setTokens(prev => prev.map(t => {
            if (t.id === id) {
                const currentSize = t.size ?? 56;
                return { ...t, size: Math.max(28, Math.min(300, currentSize + delta)) };
            }
            return t;
        }));
    };

    const setTokenPresetSize = (id, presetSize) => {
        setTokens(prev => prev.map(t => t.id === id ? { ...t, size: presetSize } : t));
    };

    // ❤️ 체력 조절
    const changeTokenHp = (id, amount) => {
        setTokens(prev => prev.map(t => {
            if (t.id === id) {
                const maxHp = t.maxHp ?? 30;
                const currentHp = t.hp ?? maxHp;
                return { ...t, hp: Math.max(0, Math.min(maxHp, currentHp + amount)), maxHp };
            }
            return t;
        }));
    };

    const promptSetHp = (token) => {
        const maxHp = token.maxHp ?? 30;
        const currentHp = token.hp ?? maxHp;
        const input = window.prompt(`[${token.name}] 의 현재 HP:`, `${currentHp}`);
        if (input !== null && !isNaN(input) && input.trim() !== '') {
            const val = parseInt(input, 10);
            setTokens(prev => prev.map(t => t.id === token.id ? { ...t, hp: Math.max(0, Math.min(maxHp, val)), maxHp } : t));
        }
    };

    const promptSetMaxHp = (token) => {
        const maxHp = token.maxHp ?? 30;
        const currentHp = token.hp ?? maxHp;
        const input = window.prompt(`[${token.name}] 의 최대 HP(Max HP):`, `${maxHp}`);
        if (input !== null && !isNaN(input) && input.trim() !== '') {
            const maxVal = Math.max(1, parseInt(input, 10));
            setTokens(prev => prev.map(t => t.id === token.id ? { ...t, maxHp: maxVal, hp: Math.min(currentHp, maxVal) } : t));
        }
    };

    // 🗑️ 제거 기능
    const removeToken = (id) => {
        setTokens(prev => prev.filter(t => t.id !== id));
        if (selectedTokenId === id) setSelectedTokenId(null);
    };

    const removeActiveMap = () => {
        if (!activeMapId) return;
        const filtered = maps.filter(m => m.id !== activeMapId);
        setMaps(filtered);
        setActiveMapId(filtered.length > 0 ? filtered[0].id : null);
    };

    const activeMap = maps.find(m => m.id === activeMapId);
    const selectedToken = tokens.find(t => t.id === selectedTokenId);

    return (
        <div
            className="flex flex-col gap-3 p-3 rounded-xl border bg-[var(--card-bg)] select-none touch-none"
            style={{ borderColor: 'var(--border-color)' }}
            onMouseMove={handleMove}
            onMouseUp={handleEnd}
            onTouchMove={handleMove}
            onTouchEnd={handleEnd}
        >
            {/* 🛠️ 상단 컨트롤 바 */}
            <div className="flex flex-wrap gap-2 items-center justify-between pb-2 border-b" style={{ borderColor: 'rgba(255,255,255,0.1)' }}>
                <div className="flex items-center gap-1.5">
                    <h4 className="text-xs font-bold" style={{ color: 'var(--accent-color)' }}>
                        🗺️ 인터랙티브 전투 지도
                    </h4>

                    {/* 🔒 지도 잠금 / 해제 토글 버튼 */}
                    <button
                        type="button"
                        onClick={() => setIsMapLocked(!isMapLocked)}
                        className={`text-[0.7rem] px-2 py-0.5 rounded border font-bold transition-all ${
                            isMapLocked 
                                ? 'bg-red-900/90 text-red-200 border-red-600 shadow-[0_0_8px_rgba(220,38,38,0.5)]' 
                                : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700'
                        }`}
                        title={isMapLocked ? "지도 드래그 이동 불가" : "지도 드래그 이동 가능"}
                    >
                        {isMapLocked ? '🔒 지도 잠김' : '🔓 지도 이동'}
                    </button>

                    <button
                        type="button"
                        onClick={() => setShowGrid(!showGrid)}
                        className={`text-[0.7rem] px-2 py-0.5 rounded border transition-colors ${showGrid ? 'bg-[var(--accent-color)] text-black font-bold' : 'text-[var(--text-muted)]'}`}
                        style={{ borderColor: 'var(--border-color)' }}
                    >
                        {showGrid ? '격자 켜짐' : '격자 꺼짐'}
                    </button>
                </div>

                {/* 🔍 지도 크기 & 위치 컨트롤 (10% ~ 200%) */}
                <div className="flex items-center gap-1 bg-slate-900/80 px-2 py-0.5 rounded border border-slate-700 text-xs">
                    <button onClick={() => handleZoom(-10)} className="px-1.5 py-0.5 bg-slate-800 hover:bg-slate-700 rounded font-bold">-</button>
                    <span className="text-[0.72rem] font-mono min-w-[36px] text-center font-bold text-amber-400">{mapScale}%</span>
                    <button onClick={() => handleZoom(10)} className="px-1.5 py-0.5 bg-slate-800 hover:bg-slate-700 rounded font-bold">+</button>
                    <button onClick={resetMapView} className="text-[0.65rem] px-1.5 py-0.5 ml-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded font-bold" title="원위치 및 100% 리셋">🔄</button>
                </div>

                <div className="flex items-center gap-2">
                    <label className="cursor-pointer text-[0.75rem] font-bold px-2 py-1 rounded bg-[var(--primary-color,#4a5568)] text-white hover:opacity-90">
                        <span>➕ 지도</span>
                        <input type="file" accept="image/*" multiple className="hidden" onChange={handleMapUpload} />
                    </label>

                    <label className="cursor-pointer text-[0.75rem] font-bold px-2 py-1 rounded text-white hover:opacity-90" style={{ backgroundColor: 'var(--highlight,#3b82f6)' }}>
                        <span>🎭 토큰</span>
                        <input type="file" accept="image/*" multiple className="hidden" onChange={handleTokenUpload} />
                    </label>
                </div>
            </div>

            {/* 🗺️ 지도 선택 드롭다운 */}
            {maps.length > 0 && (
                <div className="flex items-center gap-2 text-xs">
                    <span className="text-[var(--text-muted)] font-bold">지도:</span>
                    <select
                        value={activeMapId || ''}
                        onChange={(e) => {
                            setActiveMapId(Number(e.target.value) || e.target.value);
                            setSelectedTokenId(null);
                        }}
                        className="p-1 rounded text-xs bg-[var(--bg-color)] text-[var(--text-main)] border border-[var(--border-color)] flex-1"
                    >
                        {maps.map(m => (
                            <option key={m.id} value={m.id}>{m.name}</option>
                        ))}
                    </select>

                    <button
                        type="button"
                        onClick={removeActiveMap}
                        className="px-2 py-1 bg-red-900/60 hover:bg-red-800 text-red-200 border border-red-700/50 rounded text-[0.7rem]"
                    >
                        🗑️ 제거
                    </button>
                </div>
            )}

            {/* 🎮 전투 지도 메인 뷰포트 영역 */}
            <div
                ref={boardRef}
                onMouseDown={handleBoardStart}
                onTouchStart={handleBoardStart}
                className={`relative w-full min-h-[420px] max-h-[600px] rounded-lg overflow-hidden border flex items-center justify-center bg-black/60 ${
                    isMapLocked ? 'cursor-default' : (isPanning ? 'cursor-grabbing' : 'cursor-grab')
                }`}
                style={{ borderColor: 'var(--border-color)' }}
            >
                {/* 🖐️ 지도 Pan & Zoom Container */}
                <div
                    className="relative select-none"
                    style={{
                        transform: `translate(${panOffset.x}px, ${panOffset.y}px) scale(${mapScale / 100})`,
                        transition: isPanning ? 'none' : 'transform 0.1s ease-out',
                        backgroundImage: showGrid ? 'radial-gradient(circle, rgba(255,255,255,0.18) 1px, transparent 1px)' : 'none',
                        backgroundSize: '30px 30px'
                    }}
                >
                    {/* 1. 배경 지도 */}
                    {activeMap ? (
                        <img src={activeMap.url} alt={activeMap.name} className="max-w-none pointer-events-none select-none block" />
                    ) : (
                        <div className="text-center p-16 text-xs text-[var(--text-muted)] w-[600px] h-[400px] flex flex-col items-center justify-center">
                            <p className="font-bold mb-1">🗺️ 등록된 지도가 없습니다.</p>
                            <p className="text-[0.7rem]">상단 [➕ 지도]를 눌러 이미지 파일을 업로드해 주세요.</p>
                        </div>
                    )}

                    {/* 2. 토큰 레이어 */}
                    {tokens.map((token) => {
                        const isSelected = selectedTokenId === token.id;
                        const size = token.size ?? 56;
                        const maxHp = token.maxHp ?? 30;
                        const hp = token.hp ?? maxHp;
                        const hpPercent = maxHp > 0 ? Math.round((hp / maxHp) * 100) : 0;
                        const hpColorClass = hpPercent > 50 ? 'bg-emerald-500' : (hpPercent > 20 ? 'bg-amber-500' : 'bg-red-600');

                        return (
                            <div
                                key={token.id}
                                onMouseDown={(e) => handleTokenStart(e, token)}
                                onTouchStart={(e) => handleTokenStart(e, token)}
                                onClick={(e) => handleTokenClick(e, token.id)}
                                className="absolute cursor-grab active:cursor-grabbing group"
                                style={{
                                    left: `${token.x}px`,
                                    top: `${token.y}px`,
                                    width: `${size}px`,
                                    height: `${size}px`,
                                    zIndex: isSelected ? 40 : 10
                                }}
                            >
                                {/* HP 미니 바 */}
                                <div className="absolute -top-2.5 left-0 w-full h-1.5 bg-black/80 rounded-full overflow-hidden border border-slate-700/60">
                                    <div className={`h-full transition-all duration-300 ${hpColorClass}`} style={{ width: `${hpPercent}%` }} />
                                </div>

                                {/* 토큰 원형 이미지 & 활성화 하이라이트 링 */}
                                <div className={`w-full h-full rounded-full transition-all duration-150 ${
                                    isSelected 
                                        ? 'ring-4 ring-amber-400 ring-offset-2 ring-offset-black/80 scale-105 shadow-[0_0_15px_rgba(251,191,36,0.8)]' 
                                        : 'hover:border-amber-400 border-2 border-amber-500/60'
                                }`}>
                                    <img src={token.url} alt={token.name} className="w-full h-full object-cover rounded-full pointer-events-none bg-black/50" />
                                </div>

                                {/* 비활성화 시 하단 라벨 */}
                                {!isSelected && (
                                    <div className="absolute -bottom-4 left-1/2 -translate-x-1/2 text-[0.6rem] text-slate-300 bg-black/80 px-1 py-0.2 rounded whitespace-nowrap pointer-events-none">
                                        {token.name}
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>

                {/* 📱 모바일 최적화 하단 컨트롤 시트 */}
                {selectedToken && (
                    <div
                        onMouseDown={(e) => e.stopPropagation()}
                        onTouchStart={(e) => e.stopPropagation()}
                        onClick={(e) => e.stopPropagation()}
                        className="absolute bottom-2 left-2 right-2 z-50 bg-slate-900/95 text-white rounded-xl p-2.5 border-2 border-amber-500/80 shadow-2xl backdrop-blur-md max-w-md mx-auto flex flex-col gap-2 animate-fadeIn"
                    >
                        {/* 상단: 토큰 이름 & 삭제 & 닫기 */}
                        <div className="flex items-center justify-between border-b border-slate-700/80 pb-1.5">
                            <div className="flex items-center gap-2">
                                <span className="w-3 h-3 rounded-full bg-amber-400 animate-pulse" />
                                <span className="text-xs font-bold text-amber-300 truncate max-w-[150px]">
                                    {selectedToken.name}
                                </span>
                            </div>
                            <div className="flex items-center gap-1.5">
                                <button
                                    type="button"
                                    onClick={() => removeToken(selectedToken.id)}
                                    className="px-2 py-0.5 text-[0.68rem] bg-red-600/80 hover:bg-red-600 text-white font-bold rounded transition-colors"
                                >
                                    🗑️ 삭제
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setSelectedTokenId(null)}
                                    className="px-2 py-0.5 text-[0.68rem] bg-slate-800 hover:bg-slate-700 text-slate-300 rounded border border-slate-700 font-bold"
                                >
                                    ✖️ 닫기
                                </button>
                            </div>
                        </div>

                        {/* 중단: HP 조절 & 크기 조절 */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            {/* ❤️ HP 컨트롤 */}
                            <div className="flex flex-col gap-1 bg-slate-950/70 p-2 rounded-lg border border-slate-800">
                                <div className="flex items-center justify-between text-[0.7rem]">
                                    <span className="text-slate-400 font-bold">❤️ HP</span>
                                    <div className="flex items-center gap-1">
                                        <button onClick={() => promptSetHp(selectedToken)} className="font-bold text-amber-300 hover:underline">
                                            {selectedToken.hp ?? selectedToken.maxHp ?? 30}
                                        </button>
                                        <span className="text-slate-500">/</span>
                                        <button onClick={() => promptSetMaxHp(selectedToken)} className="text-slate-400 hover:underline">
                                            {selectedToken.maxHp ?? 30}
                                        </button>
                                    </div>
                                </div>
                                <div className="grid grid-cols-4 gap-1 text-[0.65rem] font-bold mt-1">
                                    <button onClick={() => changeTokenHp(selectedToken.id, -5)} className="py-1 rounded bg-red-950/80 hover:bg-red-900 border border-red-800 text-red-200">-5</button>
                                    <button onClick={() => changeTokenHp(selectedToken.id, -1)} className="py-1 rounded bg-red-950/80 hover:bg-red-900 border border-red-800 text-red-200">-1</button>
                                    <button onClick={() => changeTokenHp(selectedToken.id, 1)} className="py-1 rounded bg-emerald-950/80 hover:bg-emerald-900 border border-emerald-800 text-emerald-200">+1</button>
                                    <button onClick={() => changeTokenHp(selectedToken.id, 5)} className="py-1 rounded bg-emerald-950/80 hover:bg-emerald-900 border border-emerald-800 text-emerald-200">+5</button>
                                </div>
                            </div>

                            {/* 📏 크기 조절 */}
                            <div className="flex flex-col gap-1 bg-slate-950/70 p-2 rounded-lg border border-slate-800 text-[0.7rem]">
                                <div className="flex items-center justify-between text-slate-400 font-bold">
                                    <span>📏 크기</span>
                                    <span className="text-amber-300 font-mono text-[0.68rem]">{selectedToken.size ?? 56}px</span>
                                </div>
                                <div className="grid grid-cols-3 gap-1 text-[0.65rem] font-bold mt-1">
                                    <button onClick={() => setTokenPresetSize(selectedToken.id, 56)} className={`py-1 rounded border ${(selectedToken.size ?? 56) === 56 ? 'bg-amber-600 border-amber-400 text-white' : 'bg-slate-800 text-slate-300 border-slate-700'}`}>1칸</button>
                                    <button onClick={() => setTokenPresetSize(selectedToken.id, 112)} className={`py-1 rounded border ${(selectedToken.size ?? 56) === 112 ? 'bg-amber-600 border-amber-400 text-white' : 'bg-slate-800 text-slate-300 border-slate-700'}`}>2칸</button>
                                    <button onClick={() => setTokenPresetSize(selectedToken.id, 168)} className={`py-1 rounded border ${(selectedToken.size ?? 56) === 168 ? 'bg-amber-600 border-amber-400 text-white' : 'bg-slate-800 text-slate-300 border-slate-700'}`}>3칸</button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            <p className="text-[0.68rem] text-[var(--text-muted)] text-center">
                💡 지도 축소는 **10%**까지 지원되며, 새 토큰 추가 시 현재 보고 계신 화면 바로 중앙에 생성됩니다.
            </p>
        </div>
    );
};

export default BattleMapPanel;
import React, { useState, useRef, useEffect } from 'react';

/**
 * @Author : 김민식
 * BattleMapPanel : 스케일/줌 + 지도 위치 맞춤(Offset) + 격자 크기/색상 + 최신 좌표 동기화(tokensRef)
 * + 토큰 HP 직접 입력(Direct Set) 기능 포함
 */

// 🎨 격자 고대비 색상 프리셋
const GRID_COLORS = {
    amber: { name: '🟡 황금', line: 'rgba(251, 191, 36, 0.85)', shadow: 'rgba(0, 0, 0, 0.7)' },
    white: { name: '⚪ 흰색', line: 'rgba(255, 255, 255, 0.9)', shadow: 'rgba(0, 0, 0, 0.7)' },
    red:   { name: '🔴 빨강', line: 'rgba(239, 68, 68, 0.9)',   shadow: 'rgba(0, 0, 0, 0.7)' },
    black: { name: '⚫ 검정', line: 'rgba(0, 0, 0, 0.85)',     shadow: 'rgba(255, 255, 255, 0.5)' }
};

// 💡 이미지 압축 헬퍼 함수
const compressImage = (file, maxWidth = 1200, quality = 0.7) => {
    return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onload = (e) => {
            const img = new Image();
            img.onload = () => {
                const canvas = document.createElement('canvas');
                let width = img.width;
                let height = img.height;

                if (width > maxWidth) {
                    height = Math.round((height * maxWidth) / width);
                    width = maxWidth;
                }

                canvas.width = width;
                canvas.height = height;

                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0, width, height);
                resolve(canvas.toDataURL('image/jpeg', quality));
            };
            img.src = e.target.result;
        };
        reader.readAsDataURL(file);
    });
};

const BattleMapPanel = ({ mapState, onUpdateMapState, isMobile }) => {
    const [maps, setMaps] = useState([]);
    const [activeMapId, setActiveMapId] = useState(null);
    const [tokens, setTokens] = useState([]);
    const [selectedTokenId, setSelectedTokenId] = useState(null);
    // 📱 모바일: 위치맞춤/지도이동/격자/배율/업로드 등 설정 줄이 지도 세로 공간을 많이 잡아먹으므로 기본은 접어둔다
    const [mobileControlsOpen, setMobileControlsOpen] = useState(false);
    const [draggingTokenId, setDraggingTokenId] = useState(null);

    // 📐 격자 설정 상태
    const [showGrid, setShowGrid] = useState(true);
    const [gridSize, setGridSize] = useState(56);
    const [gridColorKey, setGridColorKey] = useState('amber');

    // 🔍 전체 지도 확대/축소 및 화면 드래그 이동 상태
    const [mapScale, setMapScale] = useState(100);
    const [isMapLocked, setIsMapLocked] = useState(false);
    const [panOffset, setPanOffset] = useState({ x: 0, y: 0 });
    const [isPanning, setIsPanning] = useState(false);

    // 🎯 지도 오프셋 미세 조정 상태
    const [isAlignMode, setIsAlignMode] = useState(false);
    const [mapOffset, setMapOffset] = useState({ x: 0, y: 0 });

    const dragRef = useRef({ startX: 0, startY: 0, tokenX: 0, tokenY: 0, isDragging: false });
    const panStartRef = useRef({ x: 0, y: 0 });
    const alignStartRef = useRef({ x: 0, y: 0 });
    const boardRef = useRef(null);

    // ⚡ 클로저 문제 방지용 tokensRef (항상 최신 tokens 상태 유지)
    const tokensRef = useRef(tokens);
    useEffect(() => {
        tokensRef.current = tokens;
    }, [tokens]);

    // 🔍 휠/핀치 줌은 addEventListener(native, {passive:false})로 붙여야 preventDefault가 먹기 때문에
    // 마운트 시 한 번만 등록되는 리스너 안에서도 항상 최신 값을 읽을 수 있도록 ref로 미러링해둔다
    const mapScaleRef = useRef(mapScale);
    useEffect(() => { mapScaleRef.current = mapScale; }, [mapScale]);
    const panOffsetRef = useRef(panOffset);
    useEffect(() => { panOffsetRef.current = panOffset; }, [panOffset]);
    const zoomPersistTimerRef = useRef(null);
    const pinchRef = useRef({ active: false, lastDist: 0 });

    // 🎯 동적 격자 크기 기준 AI 좌표 계산 (A1, B2 등)
    const calculateGridPos = (x, y, currentGridSize = gridSize) => {
        const cellSize = Math.max(10, currentGridSize);
        const colIndex = Math.floor(Math.max(0, x) / cellSize);
        const rowIndex = Math.floor(Math.max(0, y) / cellSize) + 1;

        let colName = '';
        let tempCol = colIndex;
        while (tempCol >= 0) {
            colName = String.fromCharCode(65 + (tempCol % 26)) + colName;
            tempCol = Math.floor(tempCol / 26) - 1;
        }
        return `${colName}${rowIndex}`;
    };

    // 💾 상위(sessionState) 전달 헬퍼
    const notifyParentState = (updated = {}) => {
        if (typeof onUpdateMapState === 'function') {
            onUpdateMapState({
                maps: updated.maps ?? maps,
                activeMapId: updated.activeMapId ?? activeMapId,
                tokens: updated.tokens ?? tokensRef.current,
                showGrid: updated.showGrid ?? showGrid,
                gridSize: updated.gridSize ?? gridSize,
                gridColorKey: updated.gridColorKey ?? gridColorKey,
                mapScale: updated.mapScale ?? mapScale,
                isMapLocked: updated.isMapLocked ?? isMapLocked,
                panOffset: updated.panOffset ?? panOffset,
                mapOffset: updated.mapOffset ?? mapOffset
            });
        }
    };

    // 네이티브 휠 리스너(마운트 시 1회 등록)에서도 항상 최신 notifyParentState를 호출할 수 있도록 ref로 보관
    const notifyParentStateRef = useRef(notifyParentState);
    useEffect(() => { notifyParentStateRef.current = notifyParentState; });

    // 초기 상태 복원
    useEffect(() => {
        if (mapState) {
            if (mapState.maps) setMaps(mapState.maps);
            if (mapState.activeMapId !== undefined) setActiveMapId(mapState.activeMapId);
            if (mapState.tokens) {
                setTokens(mapState.tokens);
                tokensRef.current = mapState.tokens;
            }
            if (mapState.showGrid !== undefined) setShowGrid(mapState.showGrid);
            if (mapState.gridSize !== undefined) setGridSize(mapState.gridSize);
            if (mapState.gridColorKey) setGridColorKey(mapState.gridColorKey);
            if (mapState.mapScale !== undefined) setMapScale(mapState.mapScale);
            if (mapState.isMapLocked !== undefined) setIsMapLocked(mapState.isMapLocked);
            if (mapState.panOffset) setPanOffset(mapState.panOffset);
            if (mapState.mapOffset) setMapOffset(mapState.mapOffset);
        }
    }, []);

    const getPos = (e) => {
        if (e.touches && e.touches.length > 0) {
            return { x: e.touches[0].clientX, y: e.touches[0].clientY };
        }
        return { x: e.clientX, y: e.clientY };
    };

    // 🤏 핀치 줌용 - 두 터치 포인트 사이 거리 / 중간점
    const getTouchDistance = (touches) => {
        const dx = touches[0].clientX - touches[1].clientX;
        const dy = touches[0].clientY - touches[1].clientY;
        return Math.hypot(dx, dy);
    };
    const getTouchMidpoint = (touches) => ({
        x: (touches[0].clientX + touches[1].clientX) / 2,
        y: (touches[0].clientY + touches[1].clientY) / 2
    });

    // 💾 확대/축소는 드래그처럼 매 이벤트마다 상위로 저장하면 과도하므로, 조작이 멈추고 잠시 후에만 저장한다
    const schedulePersistZoom = () => {
        if (zoomPersistTimerRef.current) clearTimeout(zoomPersistTimerRef.current);
        zoomPersistTimerRef.current = setTimeout(() => {
            notifyParentStateRef.current({ mapScale: mapScaleRef.current, panOffset: panOffsetRef.current });
        }, 400);
    };

    // 🔍 특정 지점(마우스 커서 / 핀치 중간점)이 화면에서 그대로 고정된 채로 목표 배율까지 확대/축소.
    // pan/zoom 뷰포트의 transformOrigin을 '0 0'으로 맞춰뒀기 때문에, 뷰포트 기준 좌표(px,py)에 대해
    // "그 지점 아래의 콘텐츠 좌표는 확대/축소 후에도 같은 화면 위치에 있어야 한다"는 식으로 panOffset을 함께 보정한다.
    // 마운트 시 1회만 등록되는 네이티브 wheel 리스너에서도 안전하게 쓸 수 있도록 상태가 아닌 ref만 읽는다.
    const setZoomAtPoint = (targetScalePct, clientX, clientY) => {
        if (!boardRef.current) return;
        const rect = boardRef.current.getBoundingClientRect();
        const px = clientX - rect.left;
        const py = clientY - rect.top;

        const oldScalePct = mapScaleRef.current;
        const newScalePct = Math.max(10, Math.min(200, Math.round(targetScalePct)));
        if (newScalePct === oldScalePct) return;

        const oldScale = oldScalePct / 100;
        const newScale = newScalePct / 100;
        const currentPan = panOffsetRef.current;

        const contentX = (px - currentPan.x) / oldScale;
        const contentY = (py - currentPan.y) / oldScale;
        const newPanOffset = {
            x: px - contentX * newScale,
            y: py - contentY * newScale
        };

        mapScaleRef.current = newScalePct;
        panOffsetRef.current = newPanOffset;
        setMapScale(newScalePct);
        setPanOffset(newPanOffset);
        schedulePersistZoom();
    };

    const zoomAtPoint = (deltaScale, clientX, clientY) => {
        setZoomAtPoint(mapScaleRef.current + deltaScale, clientX, clientY);
    };

    // 🖱️ 마우스 휠(웹) / 트랙패드로 커서 위치를 기준으로 확대·축소.
    // React의 onWheel은 브라우저가 passive 리스너로 취급해 preventDefault가 무시될 수 있어 네이티브로 직접 등록한다.
    useEffect(() => {
        const el = boardRef.current;
        if (!el) return undefined;

        const handleWheelNative = (e) => {
            e.preventDefault();
            const rawDelta = -e.deltaY * 0.08;
            const delta = Math.max(-15, Math.min(15, rawDelta));
            zoomAtPoint(delta, e.clientX, e.clientY);
        };

        el.addEventListener('wheel', handleWheelNative, { passive: false });
        return () => el.removeEventListener('wheel', handleWheelNative);
        // zoomAtPoint는 ref만 읽고 안정적인 setState/타이머만 사용해 재생성돼도 동작이 바뀌지 않으므로
        // 리스너를 매 렌더 재등록할 필요가 없다 (마운트 시 1회 등록으로 충분).
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // 📐 격자 크기 조절
    const handleGridSizeChange = (delta) => {
        const newSize = Math.max(20, Math.min(200, gridSize + delta));
        setGridSize(newSize);

        const updatedTokens = tokens.map(t => ({
            ...t,
            gridPos: calculateGridPos(t.x, t.y, newSize)
        }));
        setTokens(updatedTokens);
        tokensRef.current = updatedTokens;
        notifyParentState({ gridSize: newSize, tokens: updatedTokens });
    };

    // 🎯 지도 오프셋 미세 조절
    const nudgeMapOffset = (dx, dy) => {
        const nextOffset = {
            x: mapOffset.x + dx,
            y: mapOffset.y + dy
        };
        setMapOffset(nextOffset);
        notifyParentState({ mapOffset: nextOffset });
    };

    // 🗺️ 지도 업로드
    const handleMapUpload = async (e) => {
        const files = Array.from(e.target.files || []);
        if (files.length === 0) return;

        const readPromises = files.map(async (file) => {
            const compressedUrl = await compressImage(file, 1200, 0.7);
            return {
                id: Date.now() + Math.random(),
                name: file.name.replace(/\.[^/.]+$/, ""),
                url: compressedUrl
            };
        });

        const newMaps = await Promise.all(readPromises);
        const nextMaps = [...maps, ...newMaps];
        const nextActiveId = !activeMapId && newMaps.length > 0 ? newMaps[0].id : activeMapId;

        setMaps(nextMaps);
        if (!activeMapId && newMaps.length > 0) setActiveMapId(nextActiveId);
        notifyParentState({ maps: nextMaps, activeMapId: nextActiveId });
        e.target.value = '';
    };

    // 🎭 토큰 업로드
    const handleTokenUpload = async (e) => {
        const files = Array.from(e.target.files || []);
        if (files.length === 0) return;

        const boardWidth = boardRef.current ? boardRef.current.offsetWidth : 600;
        const boardHeight = boardRef.current ? boardRef.current.offsetHeight : 400;
        const scaleFactor = mapScale / 100;

        const centerX = Math.max(0, (boardWidth / 2 - panOffset.x) / scaleFactor - gridSize / 2);
        const centerY = Math.max(0, (boardHeight / 2 - panOffset.y) / scaleFactor - gridSize / 2);

        const readPromises = files.map(async (file, idx) => {
            const compressedUrl = await compressImage(file, 400, 0.8);
            const posX = centerX + (idx * 12);
            const posY = centerY + (idx * 12);

            return {
                id: Date.now() + Math.random(),
                name: file.name.replace(/\.[^/.]+$/, ""),
                url: compressedUrl,
                x: posX,
                y: posY,
                gridPos: calculateGridPos(posX, posY, gridSize),
                size: gridSize,
                hp: 30,
                maxHp: 30
            };
        });

        const newTokens = await Promise.all(readPromises);
        const nextTokens = [...tokens, ...newTokens];

        setTokens(nextTokens);
        tokensRef.current = nextTokens;
        if (newTokens.length > 0) setSelectedTokenId(newTokens[newTokens.length - 1].id);
        notifyParentState({ tokens: nextTokens });
        e.target.value = '';
    };

    // 🔍 전체 확대/축소 버튼 - 뷰포트 중앙을 기준점 삼아 휠/핀치 줌과 동일한 방식으로 확대/축소
    const handleZoom = (delta) => {
        if (!boardRef.current) return;
        const rect = boardRef.current.getBoundingClientRect();
        zoomAtPoint(delta, rect.left + rect.width / 2, rect.top + rect.height / 2);
    };

    const resetMapView = () => {
        if (zoomPersistTimerRef.current) { clearTimeout(zoomPersistTimerRef.current); zoomPersistTimerRef.current = null; }
        mapScaleRef.current = 100;
        panOffsetRef.current = { x: 0, y: 0 };
        setMapScale(100);
        setPanOffset({ x: 0, y: 0 });
        setMapOffset({ x: 0, y: 0 });
        notifyParentState({ mapScale: 100, panOffset: { x: 0, y: 0 }, mapOffset: { x: 0, y: 0 } });
    };

    // 🖐️ 지도 바탕 드래그 시작
    const handleBoardStart = (e) => {
        // 🤏 손가락이 2개 이상 닿으면 핀치 줌 시작 - 진행 중이던 패닝/토큰 드래그는 취소
        if (e.touches && e.touches.length >= 2) {
            setSelectedTokenId(null);
            setDraggingTokenId(null);
            setIsPanning(false);
            pinchRef.current = { active: true, lastDist: getTouchDistance(e.touches) };
            return;
        }

        setSelectedTokenId(null);
        const pos = getPos(e);

        if (isAlignMode) {
            setIsPanning(true);
            alignStartRef.current = {
                x: pos.x - (mapOffset.x * (mapScale / 100)),
                y: pos.y - (mapOffset.y * (mapScale / 100))
            };
        } else if (!isMapLocked) {
            setIsPanning(true);
            panStartRef.current = {
                x: pos.x - panOffset.x,
                y: pos.y - panOffset.y
            };
        }
    };

    // 🖱️ 토큰 드래그 시작
    const handleTokenStart = (e, token) => {
        e.stopPropagation();
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

    // 🖱️ 이동 처리
    const handleMove = (e) => {
        // 🤏 핀치 줌 진행 중 - 두 손가락 사이 거리 변화를 확대율로, 중간점을 기준점으로 삼는다
        if (e.touches && e.touches.length >= 2 && pinchRef.current.active) {
            const dist = getTouchDistance(e.touches);
            const mid = getTouchMidpoint(e.touches);
            if (pinchRef.current.lastDist > 0 && dist > 0) {
                const ratio = dist / pinchRef.current.lastDist;
                setZoomAtPoint(mapScale * ratio, mid.x, mid.y);
            }
            pinchRef.current.lastDist = dist;
            return;
        }

        const pos = getPos(e);

        if (draggingTokenId) {
            const scaleFactor = mapScale / 100;
            const deltaX = (pos.x - dragRef.current.startX) / scaleFactor;
            const deltaY = (pos.y - dragRef.current.startY) / scaleFactor;

            if (Math.abs(deltaX) > 3 || Math.abs(deltaY) > 3) {
                dragRef.current.isDragging = true;
            }

            setTokens(prev => {
                const nextTokens = prev.map(t => {
                    if (t.id === draggingTokenId) {
                        const newX = dragRef.current.tokenX + deltaX;
                        const newY = dragRef.current.tokenY + deltaY;
                        return {
                            ...t,
                            x: newX,
                            y: newY,
                            gridPos: calculateGridPos(newX, newY, gridSize)
                        };
                    }
                    return t;
                });
                tokensRef.current = nextTokens;
                return nextTokens;
            });
        } else if (isPanning) {
            if (isAlignMode) {
                const scaleFactor = mapScale / 100;
                setMapOffset({
                    x: (pos.x - alignStartRef.current.x) / scaleFactor,
                    y: (pos.y - alignStartRef.current.y) / scaleFactor
                });
            } else if (!isMapLocked) {
                setPanOffset({
                    x: pos.x - panStartRef.current.x,
                    y: pos.y - panStartRef.current.y
                });
            }
        }
    };

    const handleEnd = (e) => {
        // 🤏 핀치 줌 종료 처리 - 손가락이 하나 남으면 그 손가락으로 자연스럽게 패닝을 이어간다
        if (pinchRef.current.active) {
            const remainingTouches = e && e.touches ? e.touches : [];
            if (remainingTouches.length >= 2) return; // 아직 두 손가락 이상 - 계속 핀치 중

            pinchRef.current = { active: false, lastDist: 0 };
            notifyParentState({ mapScale: mapScaleRef.current, panOffset: panOffsetRef.current });

            if (remainingTouches.length === 1 && !isMapLocked) {
                const t = remainingTouches[0];
                setIsPanning(true);
                panStartRef.current = {
                    x: t.clientX - panOffsetRef.current.x,
                    y: t.clientY - panOffsetRef.current.y
                };
            }
            return;
        }

        if (draggingTokenId || isPanning) {
            notifyParentState({
                tokens: tokensRef.current,
                panOffset,
                mapOffset
            });
        }
        setDraggingTokenId(null);
        setIsPanning(false);
    };

    const changeTokenSize = (id, delta) => {
        const nextTokens = tokens.map(t => t.id === id ? { ...t, size: Math.max(20, Math.min(350, (t.size ?? gridSize) + delta)) } : t);
        setTokens(nextTokens);
        tokensRef.current = nextTokens;
        notifyParentState({ tokens: nextTokens });
    };

    const setTokenPresetSize = (id, multiplier) => {
        const targetSize = gridSize * multiplier;
        const nextTokens = tokens.map(t => t.id === id ? { ...t, size: targetSize } : t);
        setTokens(nextTokens);
        tokensRef.current = nextTokens;
        notifyParentState({ tokens: nextTokens });
    };

    // ❤️ HP 증감 버튼 조작
    const changeTokenHp = (id, amount) => {
        const nextTokens = tokens.map(t => {
            if (t.id === id) {
                const maxHp = t.maxHp ?? 30;
                return { ...t, hp: Math.max(0, Math.min(maxHp, (t.hp ?? maxHp) + amount)) };
            }
            return t;
        });
        setTokens(nextTokens);
        tokensRef.current = nextTokens;
        notifyParentState({ tokens: nextTokens });
    };

    // ✏️ HP / MaxHP 직접 입력 조작
    const handleHpDirectChange = (id, field, rawValue) => {
        const parsedVal = parseInt(rawValue, 10);
        const val = isNaN(parsedVal) ? 0 : Math.max(0, parsedVal);

        const nextTokens = tokens.map(t => {
            if (t.id === id) {
                const newMax = field === 'maxHp' ? val : (t.maxHp ?? 30);
                const newHp = field === 'hp' ? val : (t.hp ?? newMax);
                return {
                    ...t,
                    hp: Math.min(newHp, newMax),
                    maxHp: newMax
                };
            }
            return t;
        });
        setTokens(nextTokens);
        tokensRef.current = nextTokens;
        notifyParentState({ tokens: nextTokens });
    };

    const removeToken = (id) => {
        const nextTokens = tokens.filter(t => t.id !== id);
        setTokens(nextTokens);
        tokensRef.current = nextTokens;
        if (selectedTokenId === id) setSelectedTokenId(null);
        notifyParentState({ tokens: nextTokens });
    };

    const activeMap = maps.find(m => m.id === activeMapId);
    const selectedToken = tokens.find(t => t.id === selectedTokenId);
    const currentGridStyle = GRID_COLORS[gridColorKey] || GRID_COLORS.amber;

    return (
        <div
            className="flex flex-col gap-3 p-3 rounded-xl border bg-[var(--card-bg)] select-none touch-none h-full min-h-0 overflow-hidden"
            style={{ borderColor: 'var(--border-color)' }}
            onMouseMove={handleMove}
            onMouseUp={handleEnd}
            onTouchMove={handleMove}
            onTouchEnd={handleEnd}
        >
            {/* 🛠️ 상단 컨트롤 바 - 모바일에서는 위치맞춤/지도이동/격자/배율/업로드 줄을 통째로 접었다 펼 수 있다 */}
            <div className="flex flex-col gap-2 pb-2 border-b shrink-0" style={{ borderColor: 'rgba(255,255,255,0.1)' }}>
                <div className="flex items-center justify-between gap-2">
                    <h4 className="text-xs font-bold" style={{ color: 'var(--accent-color)' }}>
                        🗺️ 전투 지도
                    </h4>

                    {isMobile && (
                        <button
                            type="button"
                            onClick={() => setMobileControlsOpen(v => !v)}
                            className={`text-[0.7rem] px-2.5 py-1 rounded border font-bold transition-all flex items-center gap-1 ${
                                mobileControlsOpen
                                    ? 'bg-amber-500 text-black border-amber-400'
                                    : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700'
                            }`}
                        >
                            ⚙️ 지도 설정 {mobileControlsOpen ? '▲' : '▼'}
                        </button>
                    )}
                </div>

                {(!isMobile || mobileControlsOpen) && (
                <div className="flex flex-wrap gap-2 items-center justify-between">
                <div className="flex flex-wrap items-center gap-1.5">
                    {/* 🎯 지도 위치 맞춤 버튼 */}
                    <button
                        type="button"
                        onClick={() => setIsAlignMode(!isAlignMode)}
                        className={`text-[0.7rem] px-2 py-0.5 rounded border font-bold transition-all ${
                            isAlignMode 
                                ? 'bg-amber-500 text-black border-amber-300 shadow-[0_0_10px_rgba(245,158,11,0.6)] animate-pulse' 
                                : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700'
                        }`}
                        title="격자 선에 맞춰 지도를 직접 움직입니다."
                    >
                        {isAlignMode ? '🎯 지도 맞춤 중 (드래그로 이동)' : '🎯 위치 맞춤'}
                    </button>

                    {/* 🔒 지도 이동 잠금 토글 */}
                    {!isAlignMode && (
                        <button
                            type="button"
                            onClick={() => {
                                setIsMapLocked(!isMapLocked);
                                notifyParentState({ isMapLocked: !isMapLocked });
                            }}
                            className={`text-[0.7rem] px-2 py-0.5 rounded border font-bold transition-all ${
                                isMapLocked 
                                    ? 'bg-red-900/90 text-red-200 border-red-600 shadow-[0_0_8px_rgba(220,38,38,0.5)]' 
                                    : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700'
                            }`}
                        >
                            {isMapLocked ? '🔒 지도 잠김' : '🔓 지도 이동'}
                        </button>
                    )}

                    {/* 🔲 격자 토글 */}
                    <button
                        type="button"
                        onClick={() => {
                            setShowGrid(!showGrid);
                            notifyParentState({ showGrid: !showGrid });
                        }}
                        className={`text-[0.7rem] px-2 py-0.5 rounded border transition-colors font-bold ${
                            showGrid ? 'bg-amber-500 text-black border-amber-400' : 'bg-slate-800 text-slate-400 border-slate-700'
                        }`}
                    >
                        {showGrid ? '▦ 격자 켜짐' : '▢ 격자 꺼짐'}
                    </button>

                    {/* 📐 격자 크기 조절 */}
                    {showGrid && (
                        <div className="flex items-center gap-1 bg-slate-900/90 px-1.5 py-0.5 rounded border border-amber-500/40 text-xs">
                            <span className="text-[0.65rem] text-slate-400 font-bold">격자:</span>
                            <button
                                type="button"
                                onClick={() => handleGridSizeChange(-4)}
                                className="px-1 py-0 bg-slate-800 hover:bg-slate-700 active:bg-slate-600 text-amber-300 font-bold rounded text-[0.65rem]"
                            >
                                -
                            </button>
                            <span className="text-[0.7rem] font-mono min-w-[32px] text-center font-bold text-amber-400">
                                {gridSize}px
                            </span>
                            <button
                                type="button"
                                onClick={() => handleGridSizeChange(4)}
                                className="px-1 py-0 bg-slate-800 hover:bg-slate-700 active:bg-slate-600 text-amber-300 font-bold rounded text-[0.65rem]"
                            >
                                +
                            </button>
                        </div>
                    )}

                    {/* 🎨 격자 색상 팔레트 */}
                    {showGrid && (
                        <div className="flex items-center gap-1 bg-slate-900/90 px-1.5 py-0.5 rounded border border-slate-700 text-xs">
                            {Object.keys(GRID_COLORS).map((key) => (
                                <button
                                    key={key}
                                    type="button"
                                    onClick={() => {
                                        setGridColorKey(key);
                                        notifyParentState({ gridColorKey: key });
                                    }}
                                    className={`text-[0.65rem] px-1.5 py-0.2 rounded font-bold transition-all ${
                                        gridColorKey === key
                                            ? 'bg-amber-500 text-black ring-1 ring-amber-300 scale-105'
                                            : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                                    }`}
                                >
                                    {GRID_COLORS[key].name}
                                </button>
                            ))}
                        </div>
                    )}
                </div>

                {/* 🔍 지도 배율 조절 및 업로드 */}
                <div className="flex items-center gap-1.5">
                    {isAlignMode && (
                        <div className="flex items-center gap-1 bg-amber-950/80 px-2 py-0.5 rounded border border-amber-500/60 text-xs animate-fadeIn">
                            <span className="text-[0.65rem] text-amber-300 font-bold mr-0.5">미세이동:</span>
                            <button onClick={() => nudgeMapOffset(-1, 0)} className="px-1.5 py-0.2 bg-amber-900 hover:bg-amber-800 text-amber-200 rounded font-bold text-[0.65rem]">←</button>
                            <button onClick={() => nudgeMapOffset(1, 0)} className="px-1.5 py-0.2 bg-amber-900 hover:bg-amber-800 text-amber-200 rounded font-bold text-[0.65rem]">→</button>
                            <button onClick={() => nudgeMapOffset(0, -1)} className="px-1.5 py-0.2 bg-amber-900 hover:bg-amber-800 text-amber-200 rounded font-bold text-[0.65rem]">↑</button>
                            <button onClick={() => nudgeMapOffset(0, 1)} className="px-1.5 py-0.2 bg-amber-900 hover:bg-amber-800 text-amber-200 rounded font-bold text-[0.65rem]">↓</button>
                            <button
                                onClick={() => { setMapOffset({ x: 0, y: 0 }); notifyParentState({ mapOffset: { x: 0, y: 0 } }); }}
                                className="text-[0.6rem] px-1 bg-amber-900 hover:bg-amber-800 text-amber-200 rounded font-bold ml-1"
                            >
                                초기화
                            </button>
                        </div>
                    )}

                    <div className="flex items-center gap-1 bg-slate-900/80 px-2 py-0.5 rounded border border-slate-700 text-xs">
                        <button onClick={() => handleZoom(-10)} className="px-1.5 py-0.5 bg-slate-800 hover:bg-slate-700 rounded font-bold">-</button>
                        <span className="text-[0.72rem] font-mono min-w-[36px] text-center font-bold text-amber-400">{mapScale}%</span>
                        <button onClick={() => handleZoom(10)} className="px-1.5 py-0.5 bg-slate-800 hover:bg-slate-700 rounded font-bold">+</button>
                        <button onClick={resetMapView} className="text-[0.65rem] px-1.5 py-0.5 ml-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded font-bold" title="원위치 리셋">🔄</button>
                    </div>

                    <div className="flex items-center gap-1">
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
                </div>
                )}
            </div>

            {/* 🎮 메인 전투 지도 뷰포트 */}
            <div
                ref={boardRef}
                onMouseDown={handleBoardStart}
                onTouchStart={handleBoardStart}
                className={`relative w-full flex-1 min-h-0 rounded-lg overflow-hidden border flex items-center justify-center bg-slate-950 ${
                    isAlignMode 
                        ? 'cursor-move border-amber-500/80' 
                        : (isMapLocked ? 'cursor-default' : (isPanning ? 'cursor-grabbing' : 'cursor-grab'))
                }`}
                style={{ borderColor: isAlignMode ? '#f59e0b' : 'var(--border-color)' }}
            >
                {/* 🔍 Pan & Zoom 뷰포트 */}
                <div
                    className="relative select-none w-full h-full"
                    style={{
                        transform: `translate(${panOffset.x}px, ${panOffset.y}px) scale(${mapScale / 100})`,
                        transformOrigin: '0 0',
                        transition: (isPanning || pinchRef.current.active) ? 'none' : 'transform 0.1s ease-out'
                    }}
                >
                    {/* 🖼️ 1. 배경 지도 */}
                    {activeMap ? (
                        <div
                            className="absolute left-0 top-0 transition-none pointer-events-none"
                            style={{ transform: `translate(${mapOffset.x}px, ${mapOffset.y}px)` }}
                        >
                            <img src={activeMap.url} alt={activeMap.name} className="max-w-none block select-none opacity-90" />
                        </div>
                    ) : (
                        <div className="absolute inset-0 flex flex-col items-center justify-center text-xs text-[var(--text-muted)]">
                            <p className="font-bold mb-1">🗺️ 등록된 지도가 없습니다.</p>
                            <p className="text-[0.7rem]">상단 [➕ 지도]를 눌러 이미지 파일을 업로드해 주세요.</p>
                        </div>
                    )}

                    {/* ▦ 2. 격자 오버레이 */}
                    {showGrid && (
                        <div
                            className="absolute inset-0 pointer-events-none z-10 min-w-[3000px] min-h-[3000px]"
                            style={{
                                backgroundImage: `
                                    linear-gradient(to right, ${currentGridStyle.line} 1.5px, transparent 1.5px),
                                    linear-gradient(to bottom, ${currentGridStyle.line} 1.5px, transparent 1.5px)
                                `,
                                backgroundSize: `${gridSize}px ${gridSize}px`,
                                filter: `drop-shadow(0px 0px 1px ${currentGridStyle.shadow})`
                            }}
                        />
                    )}

                    {/* 🎭 3. 토큰 레이어 */}
                    {tokens.map((token) => {
                        const isSelected = selectedTokenId === token.id;
                        const size = token.size ?? gridSize;
                        const maxHp = token.maxHp ?? 30;
                        const hp = token.hp ?? maxHp;
                        const hpPercent = maxHp > 0 ? Math.round((hp / maxHp) * 100) : 0;

                        return (
                            <div
                                key={token.id}
                                onMouseDown={(e) => handleTokenStart(e, token)}
                                onTouchStart={(e) => handleTokenStart(e, token)}
                                onClick={(e) => {
                                    if (!isAlignMode) {
                                        e.stopPropagation();
                                        if (!dragRef.current.isDragging) {
                                            setSelectedTokenId(prev => (prev === token.id ? null : token.id));
                                        }
                                    }
                                }}
                                className="absolute cursor-grab active:cursor-grabbing z-20"
                                style={{
                                    left: `${token.x}px`,
                                    top: `${token.y}px`,
                                    width: `${size}px`,
                                    height: `${size}px`
                                }}
                            >
                                {/* HP 바 */}
                                <div className="absolute -top-2.5 left-0 w-full h-1.5 bg-black/80 rounded-full overflow-hidden border border-slate-700">
                                    <div className="h-full bg-emerald-500 transition-all" style={{ width: `${hpPercent}%` }} />
                                </div>

                                {/* 토큰 이미지 */}
                                <div className={`w-full h-full rounded-full ${
                                    isSelected 
                                        ? 'ring-4 ring-amber-400 ring-offset-2 ring-offset-black scale-105 shadow-[0_0_15px_rgba(251,191,36,0.8)]' 
                                        : 'border-2 border-amber-500/70 hover:border-amber-400'
                                }`}>
                                    <img src={token.url} alt={token.name} className="w-full h-full object-cover rounded-full pointer-events-none" />
                                </div>

                                {/* 실시간 좌표 라벨 */}
                                {!isSelected && (
                                    <div className="absolute -bottom-4 left-1/2 -translate-x-1/2 text-[0.6rem] text-slate-200 bg-black/90 px-1 rounded whitespace-nowrap pointer-events-none">
                                        {token.name} <span className="text-amber-400 font-bold font-mono">({token.gridPos || 'A1'})</span>
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>

                {/* 🎛️ 선택된 토큰 하단 컨트롤 시트 */}
                {selectedToken && !isAlignMode && (
                    <div
                        onMouseDown={(e) => e.stopPropagation()}
                        onTouchStart={(e) => e.stopPropagation()}
                        onClick={(e) => e.stopPropagation()}
                        className="absolute bottom-2 left-2 right-2 z-50 bg-slate-900/95 text-white rounded-xl p-2.5 border-2 border-amber-500/80 shadow-2xl max-w-md mx-auto flex flex-col gap-2"
                    >
                        <div className="flex items-center justify-between border-b border-slate-700/80 pb-1.5">
                            <div className="flex items-center gap-2">
                                <span className="text-xs font-bold text-amber-300">{selectedToken.name}</span>
                                <span className="text-[0.68rem] bg-amber-950 text-amber-400 px-1.5 py-0.5 rounded border border-amber-800 font-mono font-bold">
                                    좌표: {selectedToken.gridPos || 'A1'}
                                </span>
                            </div>
                            <div className="flex items-center gap-1.5">
                                <button onClick={() => removeToken(selectedToken.id)} className="px-2 py-0.5 text-[0.68rem] bg-red-600/80 hover:bg-red-600 text-white font-bold rounded">🗑️ 삭제</button>
                                <button onClick={() => setSelectedTokenId(null)} className="px-2 py-0.5 text-[0.68rem] bg-slate-800 text-slate-300 rounded border border-slate-700">✖️ 닫기</button>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-2 text-[0.7rem]">
                            {/* ❤️ HP 설정 칸 (직접 입력 input 포함) */}
                            <div className="flex flex-col gap-1 bg-slate-950/70 p-2 rounded-lg border border-slate-800">
                                <div className="flex items-center justify-between">
                                    <span className="text-slate-400 font-bold">❤️ HP 설정</span>
                                    <div className="flex items-center gap-1 font-mono">
                                        <input
                                            type="number"
                                            value={selectedToken.hp ?? 30}
                                            onChange={(e) => handleHpDirectChange(selectedToken.id, 'hp', e.target.value)}
                                            className="w-11 text-center bg-slate-900 text-amber-300 border border-amber-500/50 rounded text-[0.7rem] font-bold p-0.5 focus:outline-none focus:border-amber-400"
                                            title="현재 HP 직접 입력"
                                        />
                                        <span className="text-slate-500 font-bold">/</span>
                                        <input
                                            type="number"
                                            value={selectedToken.maxHp ?? 30}
                                            onChange={(e) => handleHpDirectChange(selectedToken.id, 'maxHp', e.target.value)}
                                            className="w-11 text-center bg-slate-900 text-slate-300 border border-slate-700 rounded text-[0.7rem] font-bold p-0.5 focus:outline-none focus:border-slate-500"
                                            title="최대 HP 직접 입력"
                                        />
                                    </div>
                                </div>
                                <div className="grid grid-cols-4 gap-1 font-bold mt-1">
                                    <button onClick={() => changeTokenHp(selectedToken.id, -5)} className="py-1 rounded bg-red-950 border border-red-800 text-red-200 hover:bg-red-900">-5</button>
                                    <button onClick={() => changeTokenHp(selectedToken.id, -1)} className="py-1 rounded bg-red-950 border border-red-800 text-red-200 hover:bg-red-900">-1</button>
                                    <button onClick={() => changeTokenHp(selectedToken.id, 1)} className="py-1 rounded bg-emerald-950 border border-emerald-800 text-emerald-200 hover:bg-emerald-900">+1</button>
                                    <button onClick={() => changeTokenHp(selectedToken.id, 5)} className="py-1 rounded bg-emerald-950 border border-emerald-800 text-emerald-200 hover:bg-emerald-900">+5</button>
                                </div>
                            </div>

                            {/* 📏 크기 조절 칸 */}
                            <div className="flex flex-col gap-1 bg-slate-950/70 p-2 rounded-lg border border-slate-800">
                                <div className="flex items-center justify-between text-slate-400 font-bold">
                                    <span>📏 크기 조절</span>
                                    <div className="flex items-center gap-1">
                                        <button onClick={() => changeTokenSize(selectedToken.id, -4)} className="px-1.5 py-0.5 bg-slate-800 text-amber-300 rounded border border-slate-700">-</button>
                                        <span className="text-amber-300 font-mono">{selectedToken.size ?? gridSize}px</span>
                                        <button onClick={() => changeTokenSize(selectedToken.id, 4)} className="px-1.5 py-0.5 bg-slate-800 text-amber-300 rounded border border-slate-700">+</button>
                                    </div>
                                </div>
                                <div className="grid grid-cols-3 gap-1 font-bold mt-1">
                                    <button onClick={() => setTokenPresetSize(selectedToken.id, 1)} className="py-1 rounded bg-slate-800 text-slate-300 border border-slate-700 hover:bg-slate-700">1칸</button>
                                    <button onClick={() => setTokenPresetSize(selectedToken.id, 2)} className="py-1 rounded bg-slate-800 text-slate-300 border border-slate-700 hover:bg-slate-700">2칸</button>
                                    <button onClick={() => setTokenPresetSize(selectedToken.id, 3)} className="py-1 rounded bg-slate-800 text-slate-300 border border-slate-700 hover:bg-slate-700">3칸</button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default BattleMapPanel;
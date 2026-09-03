/**
 * @Author : 김민식
 * gridCoords : 전투지도 격자 좌표 ↔ 픽셀 좌표 변환 유틸
 *  - BattleMapPanel(픽셀→라벨)과 CharacterSheetManager(라벨→픽셀, AI 응답 파싱)가 동시에 이 규칙에
 *    의존하므로, 어느 한쪽에서 각자 구현하면 인코딩이 어긋날 위험이 있어 한 곳으로 모았다.
 */

// 🎯 픽셀 좌표(x, y) → 격자 라벨("A1", "AA5" 등). 열은 엑셀 열 이름과 같은 방식(0=A, 25=Z, 26=AA...).
export const calculateGridPos = (x, y, gridSize) => {
    const cellSize = Math.max(10, gridSize);
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

// 🎯 격자 라벨("C4" 등) → { col, row } 0/1-index. calculateGridPos의 역변환.
// ⚠️ calculateGridPos의 인코딩 방식이 바뀌면 이 함수도 반드시 함께 맞춰야 한다.
export const parseGridLabel = (label) => {
    const match = /^([A-Za-z]+)\s*(\d+)$/.exec(String(label || '').trim());
    if (!match) return null;

    const [, colStr, rowStr] = match;
    let colIndex = 0;
    for (let i = 0; i < colStr.length; i++) {
        colIndex = colIndex * 26 + (colStr.toUpperCase().charCodeAt(i) - 64);
    }
    colIndex -= 1;

    const row = parseInt(rowStr, 10);
    // AI가 엉뚱한 좌표(예: "ZZZZ99999")를 지어내는 극단적인 경우를 대비한 안전 범위 체크
    if (colIndex < 0 || colIndex > 999 || !Number.isFinite(row) || row < 1 || row > 999) return null;
    return { col : colIndex, row };
};

// 🎯 격자 인덱스({col, row}) → 셀 좌상단 픽셀 좌표. 토큰을 그 칸 "안쪽 중앙"에 놓고 싶을 때는
// 호출부에서 size(토큰 크기)만큼 보정해서 쓴다.
export const gridIndexToPixel = (col, row, gridSize) => ({
    x : col * Math.max(10, gridSize)
  , y : (row - 1) * Math.max(10, gridSize)
});

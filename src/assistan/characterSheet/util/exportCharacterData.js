/**
 * @Author : 김민식
 * exportCharacterData : 현재 시트 상태(HP, 영감, 사용함 체크 등)를
 * "원래 업로드했던 JSON의 스키마"에 그대로 되꽂아서 다운로드한다.
 *  - 어떤 스키마(평탄화 / characterInfo 중첩 / character·ability_scores 서술형)든
 *    구조 자체는 건드리지 않고, 실제로 바뀔 수 있는 값(주로 현재 HP)만 원래 위치에 패치한다.
 *  - normalizeCharacterData가 읽지 않는 UI 전용 상태(영감, 사용함 체크, 주문 슬롯 체크)는
 *    `_sheetUiState`라는 이름으로 최상위에 추가해서, 나중에 이 JSON을 다시 불러오면
 *    체크 상태까지 그대로 복원되게 한다.
 */

// 현재 HP를 원본 JSON의 실제 위치(스키마마다 다름)에 패치
const patchCurrentHp = (clone, currentHp) => {
    if (currentHp === undefined || currentHp === null) return;

    if (clone.hp && typeof clone.hp === 'object') {
        // 1) 평탄화 스키마: { hp: { current, max, ... } }
        clone.hp.current = currentHp;
    } else if (clone.combat?.hitPoints) {
        // 2) 중첩 v2 스키마: { combat: { hitPoints: { current, max } } }
        clone.combat.hitPoints.current = currentHp;
    } else if (clone.combat && 'current_hp' in clone.combat) {
        // 3) 서술형(gamja류): { combat: { current_hp, max_hp } }
        clone.combat.current_hp = currentHp;
    } else if (clone.combat && typeof clone.combat.max_hp_at_level_1 === 'string') {
        // 3) 서술형(priest류): { combat: { max_hp_at_level_1: "6 + CON mod = ... = 8" } }
        // 계산식 텍스트 안의 마지막 숫자만 현재 HP로 교체
        clone.combat.max_hp_at_level_1 = clone.combat.max_hp_at_level_1.replace(/(\d+)(?!.*\d)/, String(currentHp));
    } else if (clone.combat && typeof clone.combat.max_hp === 'number') {
        // current_hp 필드가 아예 없던 경우, 새로 추가
        clone.combat.current_hp = currentHp;
    }
}

/**
 * @param originalRawJson  applyCharData에 넘어왔던 원본 파싱 객체 (없으면 charData 자체를 사용)
 * @param charData         정규화된 현재 시트 상태
 * @param uiState           { inspiration, usedFeatures, usedSpellSlots }
 */
export const buildExportJson = (originalRawJson, charData, uiState) => {
    const clone = JSON.parse(JSON.stringify(originalRawJson || charData || {}));
    patchCurrentHp(clone, charData?.hp?.current);
    clone._sheetUiState = uiState;
    return clone;
}

export const downloadJson = (data, filename) => {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type : 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

// 파일명으로 쓰기 애매한 문자 제거
export const sanitizeFileName = (name) => String(name || 'character').replace(/[\\/:*?"<>|]+/g, '_').trim() || 'character';

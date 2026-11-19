/**
 * @Author : 김민식
 * scenarioContext : 시나리오 JSON 전체를 글자 수로 잘라 보내는 대신,
 *  "지금 꼭 필요한 부분"만 골라서 GM 시스템 프롬프트에 넣기 위한 유틸.
 *
 *  기존 방식(앞에서부터 3000자만 자르기)의 문제:
 *   - bestiary(몬스터 AC/HP/피해 주사위)가 파일 맨 끝에 있는 시나리오가 많아서,
 *     조금만 길어도 통째로 잘려나가 AI가 피해 굴림을 낼 근거 자체를 못 받는다.
 *   - part3처럼 파일이 크면 방(S1~S18) 정보조차 3000자 안에 다 안 들어간다.
 *
 *  이 유틸의 접근:
 *   - id 또는 name을 가진 객체들의 배열("방/장소 목록"으로 추정되는 배열)을 재귀적으로 찾는다.
 *   - 그런 배열이 들어있는 "큰 컨테이너"(예: part_1_palebank_village, salsvault)는 통째로 제외하고,
 *     대신 현재 위치(session_state.loc)와 id/name이 일치하는 "방 1개"만 current_room으로 넣는다.
 *   - adventure, disease_mechanic, npcs, bestiary, resolution처럼 방 목록이 아닌 나머지 최상위
 *     필드는 그대로 전부 포함한다 (bestiary는 이 방식으로 절대 잘리지 않는다).
 *   - 시나리오 스키마가 파트마다 달라도(locations/rooms 등 키 이름이 달라도) 동작하도록
 *     "id 또는 name을 가진 객체 배열"이라는 패턴만으로 판단한다.
 */

// 재귀적으로 "방/장소로 추정되는 객체들의 배열"을 전부 찾는다.
// id가 있거나, (name + connections/doors/read_aloud 중 하나)가 있는 경우만 "방"으로 판단한다.
// (단순히 name만 있는 배열은 몬스터의 actions([{name:"Claws",...}]) 같은 것과 구분이 안 되므로 제외)
const looksLikeRoom = (o) => o && typeof o === 'object' && !Array.isArray(o)
    && (o.id || (o.name && (o.connections || o.doors || o.read_aloud || o.passages)));

const findRoomArrays = (obj, path = []) => {
    let found = [];
    if (Array.isArray(obj)) {
        const isRoomArray = obj.length > 0 && obj.every(looksLikeRoom);
        if (isRoomArray) found.push({ path, array: obj });
        obj.forEach((item, i) => { found = found.concat(findRoomArrays(item, [...path, i])); });
    } else if (obj && typeof obj === 'object') {
        Object.entries(obj).forEach(([k, v]) => {
            found = found.concat(findRoomArrays(v, [...path, k]));
        });
    }
    return found;
};

/**
 * @param {object} scenarioData  시나리오 JSON (파싱된 객체)
 * @param {string} currentLocId  session_state.loc (현재 위치 ID, 예: "S1", "C6", "pelcs_curiosities")
 * @returns {object|null} bestiary는 항상 포함하고, 방 목록은 현재 위치 1개로 압축한 축소 버전
 */
export const buildScenarioContext = (scenarioData, currentLocId) => {
    if (!scenarioData || typeof scenarioData !== 'object') return null;

    const roomArrays = findRoomArrays(scenarioData);

    let matchedRoom = null;
    if (currentLocId) {
        const lowerLoc = String(currentLocId).toLowerCase();
        for (const { array } of roomArrays) {
            const hit = array.find(r =>
                (r.id && String(r.id).toLowerCase() === lowerLoc)
                || (r.name && String(r.name).toLowerCase().includes(lowerLoc))
            );
            if (hit) { matchedRoom = hit; break; }
        }
    }

    // 방 목록이 들어있던 최상위 키(예: "salsvault", "part_1_palebank_village")는
    // 통째로 빼고, 그 대신 현재 위치한 방 1개만 별도로 넣는다.
    const bigContainerTopKeys = new Set(roomArrays.map(r => r.path[0]).filter(Boolean));
    const compact = {};
    Object.entries(scenarioData).forEach(([k, v]) => {
        if (bigContainerTopKeys.has(k)) return;
        compact[k] = v;
    });

    if (matchedRoom) {
        compact.current_room = matchedRoom;
    } else if (roomArrays.length > 0) {
        // 세션 시작 직후처럼 아직 위치가 안 잡혔으면, 첫 번째 방을 기본값으로 제공한다.
        compact.current_room = roomArrays[0].array[0];
        compact._note = '현재 위치(session_state.loc)가 아직 없어 첫 번째 장소를 기본으로 제공합니다.';
    }

    return compact;
};

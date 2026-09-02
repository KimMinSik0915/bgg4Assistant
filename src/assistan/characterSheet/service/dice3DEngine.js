/**
 * @Author : 김민식
 * dice3DEngine : @3d-dice/dice-box(Babylon.js + 물리엔진)를 감싸는 아주 얇은 래퍼.
 *  - 실제 물리 시뮬레이션으로 주사위가 화면을 굴러다니다가 "진짜" 무작위 결과에 착지한다.
 *  - CSS로 직접 3D를 흉내내던 이전 방식은 특정 렌더링 환경에서 정지된 3D transform이 사라지는
 *    문제를 겪어서, 검증된 전용 라이브러리로 교체했다.
 *
 * ⚠️ 설정 키는 "container"다 (문서/예제에 종종 나오는 "selector"가 아니다). 그리고 값은 반드시
 * CSS 선택자 "문자열"이어야 한다 — DOM 노드를 직접 넘기면 "You must provide a DOM selector"
 * 에러가 나고, 반대로 잘못된 키(container 대신 selector)로 넘기면 조용히 무시되고 캔버스가
 * document.body에 0x0 크기로 붙어버려서(아무 에러도 없이!) 화면에 아무것도 안 보이게 된다.
 * 둘 다 실제로 겪은 삽질이라 주석으로 남긴다.
 *
 * ⚠️ @3d-dice/dice-box는 Babylon.js + Ammo.js(WASM 물리엔진)를 통째로 끌고 오는 아주 무거운
 * 패키지다(번들 gzip 기준 400KB+). 예전엔 파일 맨 위에서 `import DiceBox from "@3d-dice/dice-box"`로
 * 정적 임포트했는데, 이러면 이 모듈을 참조하는 DicePanel이 Layout에 전역으로 항상 떠 있는 이상
 * "주사위를 한 번도 안 쓰는" 페이지(홈 화면 등)에서도 이 무거운 라이브러리가 초기 번들에 통째로
 * 같이 실려서 다운로드·파싱된다 — 실제로 쓰는 시점(getDiceBox 호출)을 늦춰도 번들 자체가 이미
 * 같이 와버리면 아무 의미가 없다. 그래서 createBox 안에서 동적 import()로 바꿔, 웹팩이 이 라이브러리를
 * 완전히 별도 청크로 쪼개고 실제로 처음 굴릴 때만 네트워크로 받아오게 한다.
 */

// 물리 주사위 캔버스가 실제로 붙는 자리. 화면 전체를 덮는 이 컨테이너는 이제 Layout에서 전역으로
// 딱 한 번만 렌더링되므로(모든 화면에서 같은 캔버스를 공유), 셀렉터 문자열도 여기 한 곳에서만
// 관리하고 DicePanel/CharacterSheetManager 양쪽에서 그대로 가져다 쓴다.
export const DICE_BOX_SELECTOR = '#cs-dice-box-canvas-root';

// 🎲 주사위 굴림 "결과가 나왔다"는 사실을 화면 어디에 있든(다른 화면이어도) 전역 플로팅 위젯에
// 알려주는 아주 작은 이벤트 버스. CharacterSheetManager처럼 DicePanel과 같은 트리에 있지 않은
// 코드도 굴림 결과를 방송(broadcast)하면, Layout에 한 번 떠 있는 DicePanel이 그걸 받아서 풀스크린
// 결과 오버레이를 띄워준다 — props/ref로 남의 트리를 건너뛰어 연결할 필요가 없다.
export const DICE_RESULT_EVENT = 'cs-dice-result';
export const announceDiceResult = (payload) => {
    window.dispatchEvent(new CustomEvent(DICE_RESULT_EVENT, { detail : payload }));
};

let boxPromise = null;

// ⚠️ 반드시 async 함수여야 한다. new DiceBox(...)는 대상 컨테이너의 DOM 노드를 "동기적으로" 찾는데,
// React 18 StrictMode의 mount→unmount→remount 이중 호출 타이밍과 겹치면 그 순간 노드가 잠깐
// 없어서 동기 예외(throw)가 난다. 일반 함수였다면 이 동기 throw가 호출부의 .catch()를 건너뛰고
// 그대로 튀어나가 버린다 — async 함수로 감싸면 어떤 동기 throw든 항상 reject된 프라미스로
// 바뀌어서 .catch()가 정상적으로 잡아준다. 그래도 못 찾으면 아주 짧게 한 번 재시도한다.
const createBox = async (selector, attempt = 0) => {
    if (!document.querySelector(selector) && attempt < 3) {
        await new Promise((r) => setTimeout(r, 60));
        return createBox(selector, attempt + 1);
    }
    const { default : DiceBox } = await import("@3d-dice/dice-box");
    const box = new DiceBox({
        container : selector
      , assetPath : "/assets/dice-box/"
      , theme : "default"
      , themeColor : "#22d3ee"
      , scale : 5.5
      , gravity : 2
      , throwForce : 6
      , spinForce : 5
      , settleTimeout : 4000
      , offscreen : false
      // ⚠️ 그림자 렌더링(shadow map)은 WebGL 씬에서 GPU 비용이 가장 큰 축에 속한다. 특히 iOS
      // Safari/WebKit은 이런 셰이더 패스에 데스크탑·안드로이드보다 훨씬 취약해서(발열·프레임드랍),
      // 시각적으로 크게 아쉽지 않은 선에서 꺼둔다.
      , enableShadows : false
      , lightIntensity : 1
    });
    await box.init();
    return box;
};

// selector(CSS 선택자 문자열) 하나당 인스턴스 하나만 생성/재사용한다.
// ⚠️ DiceBox는 DOM 노드가 아니라 "선택자 문자열"을 받는다 — 노드를 직접 넘기면
// "You must provide a DOM selector..." 에러가 난다.
//
// ⚠️ React 18 StrictMode는 개발 모드에서 최초 마운트 직후 한 번 통째로 unmount→remount를 한다.
// 이때 포탈로 붙인 컨테이너 div(와 그 안의 canvas)도 실제로 제거됐다가 새로 생긴다. 그런데
// boxPromise는 모듈 전역 캐시라서, 예전(이미 DOM에서 사라진) canvas를 들고 있는 DiceBox 인스턴스를
// 계속 재사용해버리면 — 물리 시뮬레이션과 roll() 자체는 멀쩡히 동작하는데(그래서 값은 나온다)
// 캔버스가 화면 어디에도 없어서 아무것도 안 보이는 상태가 된다. 그래서 매번 "지금 이 selector 안에
// 진짜로 canvas가 붙어 있는지"를 확인하고, 없으면 캐시를 버리고 새로 만든다.
export const getDiceBox = async (selector) => {
    if (boxPromise) {
        const stillAttached = document.querySelector(`${selector} canvas`);
        if (!stillAttached) boxPromise = null;
    }
    if (!boxPromise) {
        boxPromise = createBox(selector).catch((err) => {
            boxPromise = null; // 실패하면 다음 시도 때 재생성
            throw err;
        });
    }
    return boxPromise;
};

// dice-box의 roll() 결과(그룹 배열, 각 그룹은 sides/rolls[]를 가짐)를 [{sides, value}, ...] 평면
// 배열로 펼친다. 그룹 하나짜리 단일 굴림 결과도 같은 모양으로 통일해서 호출부를 단순하게 만든다.
const flattenResults = (raw) => {
    const groups = Array.isArray(raw) ? raw : [raw];
    const flat = [];
    groups.forEach((g) => {
        if (!g) return;
        const rolls = Array.isArray(g.rolls) ? Object.values(g.rolls) : null;
        if (rolls && rolls.length > 0) {
            rolls.forEach((r) => flat.push({ sides : g.sides, value : r.value }));
        } else if (typeof g.value === 'number') {
            flat.push({ sides : g.sides, value : g.value });
        }
    });
    return flat;
};

/**
 * sides개의 면을 가진 주사위 1개를 실제로 굴려서 나온 눈(raw value)을 반환한다.
 * 실패 시(에셋 로드 실패 등) null을 반환 — 호출부에서 Math.random() 폴백으로 이어간다.
 */
export const rollPhysicalDie = async (selector, sides) => {
    try {
        const box = await getDiceBox(selector);
        box.clear();
        const results = flattenResults(await box.roll(`1d${sides}`));
        return typeof results[0]?.value === 'number' ? results[0].value : null;
    } catch (err) {
        console.error('[dice3DEngine] 3D 주사위 굴림 실패, 일반 난수로 대체합니다.', err);
        return null;
    }
};

/**
 * 여러 종류/개수의 주사위를 한 번에 굴린다. specs: [{ sides, qty }, ...]
 * 반환: [{ sides, value }, ...] (개별 주사위 결과 평면 배열). 실패 시 null.
 */
export const rollPhysicalDiceGroup = async (selector, specs) => {
    try {
        const box = await getDiceBox(selector);
        box.clear();
        const notation = specs.map(({ sides, qty }) => ({ qty, sides }));
        const results = flattenResults(await box.roll(notation));
        return results.length > 0 ? results : null;
    } catch (err) {
        console.error('[dice3DEngine] 다중 주사위 굴림 실패, 일반 난수로 대체합니다.', err);
        return null;
    }
};

export const clearDiceBox = async () => {
    if (!boxPromise) return;
    try {
        const box = await boxPromise;
        box.clear();
    } catch { /* noop */ }
};

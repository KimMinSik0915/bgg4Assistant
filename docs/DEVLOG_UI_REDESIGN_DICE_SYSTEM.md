# 개발 기록: 전체 UI/UX 리디자인 & 3D 주사위 시스템

> 이 문서는 AI(Claude Code)와의 협업으로 진행된 **전면 UI/UX 리디자인**과
> **실물 3D 물리 주사위 시스템** 개발 과정을 정리한 기록이다.
> "왜 이렇게 구현했는지", "왜 이 방식은 버려졌는지"를 남겨서,
> 나중에 같은 시행착오를 반복하지 않는 것이 목적이다.

- 작업 브랜치: `feature/trpg/front`
- 대상 프로젝트: `imperium_assistant` (React 18 + CRA + Tailwind CSS 3.4)

---

## 1. 진행 원칙 (모든 작업에 공통 적용)

1. **기능은 그대로, 껍데기만 갈아엎는다.** 문구/배치/구조/디자인은 자유롭게
   바꾸되, 기존 비즈니스 로직(상태 계산, 저장/로드, 판정 규칙 등)은 절대
   깨뜨리지 않는다.
2. **말로만 된다고 하지 않는다.** 코드만 보고 "됐다"고 하지 않고, 헤드리스
   크롬 + Chrome DevTools Protocol(CDP)로 실제 화면을 띄워 클릭하고
   스크린샷을 찍어서 눈으로 확인한 뒤에만 완료로 본다.
3. **테스트용 크롬은 반드시 PID로만 추적/종료한다.** `Get-Process chrome |
   Stop-Process` 같은 이름 기반 종료는 사용자가 쓰고 있는 실제 크롬 창까지
   전부 꺼버리는 사고로 이어졌다 (2회 발생). 이후로는 항상
   `Start-Process -PassThru`로 PID를 받아 파일에 기록해두고, 테스트가
   끝나면 그 PID만 `Stop-Process -Id <pid> -Force`로 종료한다. 격리된
   `--user-data-dir`도 함께 사용해 실제 프로필과 완전히 분리한다.

---

## 2. 작업 순서 요약

| 단계 | 요청 내용 | 결과 |
|---|---|---|
| 1 | 메인 화면(홈 화면)부터 디자인 개선 | `homeScreen.jsx` 전면 리디자인 |
| 2 | 헤더(메뉴바+로그인 버튼)/푸터 추가, 메인화면 더 화려하게 | `HeaderLayout.js`, `FooterLayout.jsx`, `Layout.jsx` 신설/개편 |
| 3 | 프로젝트 전체(모든 화면)를 메인화면 디자인 언어로 통일 | 캐릭터 시트, Imperium, RoRDuel 등 전 모듈 리디자인, 없는 화면은 새로 제작 |
| 4 | 주사위 굴리기 UX 개선 + 화면을 굴러다니는 연출 | CSS 기반 애니메이션 1차 시도 |
| 5 | "납작해서 별로다, 진짜 입체로" | CSS만으로 진짜 3D 재현 시도 (최종적으로 폐기) |
| 6 | "이미 있는 3D 주사위 라이브러리를 가져다 써라" | `@3d-dice/dice-box` 도입 |
| 7 | 주사위를 여러 개(같은 종류 여러 개 또는 여러 종류 섞어서) 한 번에 굴리기 | 다중 선택 트레이 + 일괄 굴림 + 텍스트 결과 요약 |

아래에서 4~7단계(주사위 시스템)를 중심으로 자세히 다룬다. 화면 리디자인은
"기능 유지 + 스타일만 전면 교체"라 특별한 로직 변경이 없으므로 3장에서
간단히 정리한다.

---

## 3. 전체 화면 리디자인

### 3.1 대상 범위
- **홈 화면** (`src/assistan/homeScreen/`) — 최초 리디자인 대상. 이후
  전체 리디자인의 "기준 디자인 언어"가 됨.
- **헤더/푸터/레이아웃** (`src/assistan/layout/`) — 메뉴바, 로그인 버튼,
  다단 푸터(바로가기/라이브러리 섹션 등) 신규 추가.
- **캐릭터 시트 모듈** (`src/assistan/characterSheet/`) — 카드형 UI,
  테마 시스템(CSS 변수 기반), GM 대화창/캐릭터 시트 탭 분리, 전투매트
  (`BattleMapPanel.jsx`) 추가.
- **Imperium 모듈** (`src/assistan/imperium/`) — 게임 셋업/상태 화면 개편.
- **RoRDuel 모듈** (`src/assistan/RoRDuel/`) — 캐릭터 선택/게임 상태 화면 개편.
- **설정 화면** (`src/assistan/settings/`) — 기존에 없던 화면을 신규 제작
  (`SettingsScreen.jsx`, `App.js`에 `/settings` 라우트 추가).

### 3.2 디자인 언어
- Tailwind CSS 3.4 유틸리티 + CSS 커스텀 프로퍼티(`--accent-color`,
  `--card-bg`, `--border-color`, `--header-from/to` 등)로 테마를 구성해서,
  캐릭터 시트의 테마 전환 기능과 자연스럽게 맞물리도록 함.
- 카드/글래스모피즘(backdrop-blur) 기반의 다크 톤 UI로 통일.
- 클래스 컴포넌트가 대부분인 기존 코드베이스 컨벤션을 유지하면서, 새로
  추가하는 조작이 많은 UI(주사위 패널 등)만 함수 컴포넌트 + Hooks로 작성.

### 3.3 지켜야 했던 제약
- 기존 ESLint 경고(모든 클래스 컴포넌트의 "빈 생성자", `href="#"` 패턴 등)는
  이 프로젝트의 기존 관행이므로 새로 발생한 오류로 취급하지 않음. 새로
  추가한 코드에서 이런 경고가 새로 생기지 않도록만 주의.

---

## 4. 주사위 시스템 — 1차: CSS만으로 "떼굴떼굴 굴러다니는" 연출

### 요청
> "주사위 굴리기 부분 개선해줘. 화면 전체에서 떼굴떼굴 굴러다니는 그런 기능
> 구현 가능해?"

### 구현
- `@keyframes`로 화면 위를 이동(위치 랜덤 경로) + 회전하는 애니메이션 구현.
- 주사위 모양은 SVG 다각형(면 수만큼 변을 가진 폴리곤)으로 표현.

### 문제
> "주사위가 입체가 아니라 납작한데? 진짜 주사위처럼 동글동글하게 입체적으로
> 표현 못해?"

평면 SVG라 눈으로 보기에 "입체감"이 없었음.

---

## 5. 주사위 시스템 — 2차: CSS 3D(`transform-style: preserve-3d`)로 진짜 정육면체 재현 시도 (→ 폐기)

여러 겹의 `<div>`를 육면체 형태로 배치하고 `rotateX/Y/Z`로 굴리는 방식을
시도했다. 이 과정에서 겪은 문제와 조치는 다음과 같다.

### 겪은 문제
**헤드리스 크롬에서, 주사위가 착지한 뒤 "정지된 3D transform" 상태로 오래
있으면 화면에서 사라지는 현상**이 재현됨. 원인 후보로 다음을 모두
점검했지만 100% 단일 원인으로 확정하지는 못했다:
- 레이어 개수, `filter`를 `preserve-3d` 내부/외부 어디에 두는지
- `clip-path` vs SVG 폴리곤
- 정적 transform vs `requestAnimationFrame` 구동 vs CSS `@keyframes` 구동
- 포탈(`createPortal`)로 뺀 경우 vs 인라인
- 새 브라우저 세션 vs 재사용 세션
- "정지 상태를 유지하는 대신 아주 미세하게 계속 흔들어서 강제로 리페인트
  시키기" (임시방편으로는 효과 있었으나 근본 해결은 아니었음)

### 결론
"정지된 3D 회전 상태를 오래 유지하는 것" 자체가 이 테스트 환경에서
불안정하다는 강한 상관관계만 확인. 최종적으로는 **애니메이션 중(구르는 동안)
에만 3D 회전을 쓰고, 착지 즉시 2D 표현으로 전환**하는 우회 설계로 일단
봉합했었으나—

> "무슨 확장을 사용하든 라이브러리를 설치하든.. 직접 디자인해서 만들지
> 말고 이미 만들어져있는 주사위를 가져다가 쓸수는 없는거야? 너가 만들어준건
> 전부 납작해 디자인도 구려"

라는 피드백을 받고 **손으로 만든 CSS 3D는 전량 폐기**, 검증된 전용
라이브러리로 완전히 교체하는 방향으로 확정했다.

---

## 6. 주사위 시스템 — 3차(현재): `@3d-dice/dice-box` 라이브러리 도입

### 선택한 라이브러리
[`@3d-dice/dice-box`](https://www.npmjs.com/package/@3d-dice/dice-box) `^1.1.4`
— Babylon.js + 실제 물리 엔진(Ammo.js/wasm) 기반으로 진짜 3D 모델 주사위가
중력/충돌을 받으며 굴러가다 멈추는 라이브러리.

```bash
npm install @3d-dice/dice-box --legacy-peer-deps
```

### 필요 에셋
라이브러리가 런타임에 `assetPath` 아래에서 3D 모델/텍스처/물리엔진 wasm을
직접 fetch하므로, `node_modules/@3d-dice/dice-box/dist/assets`를
**`public/assets/dice-box/`로 복사**해서 정적 서빙되도록 했다.
(`ammo/ammo.wasm.wasm`, `themes/default/*`)

### 겪은 삽질과 원인 (전부 `src/assistan/characterSheet/service/dice3DEngine.js`에
주석으로도 남겨둠)

1. **DOM 노드를 직접 넘김 → 에러**
   `container: containerRef.current`처럼 DOM 노드를 넘기면
   `"You must provide a DOM selector as the first argument"` 에러 발생.
   → CSS 선택자 **문자열**을 넘겨야 한다.

2. **설정 키 오타(`selector` vs `container`) → 조용히 무시됨, 에러도 없음**
   문서/예제에 흔히 등장하는 `selector` 키를 썼더니 인식되지 않고 조용히
   무시됨. 캔버스는 생성되지만 지정한 컨테이너가 아니라 `document.body`에
   `0x0` 크기로 붙어버려 **아무 에러 없이 화면에 아무것도 안 보임**.
   → 실제 배포된 `dice-box.es.js` 소스를 직접 열어서
   `this.canvas = Jl({selector: this.config.container, ...})`를 확인,
   진짜 공개 키는 `container`라는 걸 확인 후 수정.

3. **React 18 StrictMode의 이중 mount → 동기 예외가 `.catch()`를 건너뜀**
   개발 모드에서 StrictMode가 mount→unmount→remount를 한 번 더 도는데, 그
   타이밍에 컨테이너 DOM이 잠깐 없어서 `new DiceBox(...)`가 **동기적으로
   throw**. `createBox`가 평범한 함수였을 때는 이 throw가 곧바로 튀어나가
   `.catch()`를 우회했다.
   → `createBox`를 `async` 함수로 바꿔서, 함수 본문의 어떤 동기 throw든
   자동으로 reject된 Promise가 되게 함. 그래도 못 찾으면 60ms 대기 후
   최대 3회까지 재시도.

4. **StrictMode 리마운트로 캔버스가 고아(orphan)가 됨**
   모듈 전역 캐시(`boxPromise`)가 이전(이미 DOM에서 사라진) 캔버스를 가진
   인스턴스를 계속 재사용 → `roll()`은 정상 동작해서 값은 나오는데 화면에는
   아무것도 안 보임.
   → 재사용 전에 `document.querySelector('${selector} canvas')`로 실제
   DOM에 붙어 있는지 매번 확인하고, 없으면 캐시를 버리고 새로 생성.

5. **캔버스가 0×0 크기로 렌더링됨**
   라이브러리가 `.dice-box-canvas`에 대한 CSS 크기 지정을 자체적으로
   제공하지 않음.
   → `characterSheet.css`에 아래 규칙 추가:
   ```css
   .dice-box-canvas {
       width: 100% !important;
       height: 100% !important;
       display: block;
   }
   ```

### 검증
위 5가지를 모두 고치고 나서, CDP 스크린샷으로 **제대로 된 크기, 제대로 된
부모, 실제 3D 모델링된 d20/d6가 물리적으로 굴러가다 착지해서 눈이
보이고, `resultText`와 값이 일치**함을 확인. 콘솔 에러 0건.

### 확인된 라이브러리 한계
`@3d-dice/dice-box`는 **결과값을 미리 정해서 굴리는 기능(forced result)을
지원하지 않는다** ([GitHub issue #47](https://github.com/3d-dice/dice-box/issues/47)에서
메인테이너가 "구현하려면 상당한 작업"이라고 답변한 것을 확인). 따라서
실패 시(에셋 로드 실패 등)에는 `null`을 반환하게 하고, 호출부에서
**`Math.random()` 기반 폴백**(예전 방식의 "짧게 반짝이다 멈추는" 연출)으로
이어지도록 설계했다. 정상적인 경우 실제 표시되는 3D 주사위 결과값 =
게임 로직이 사용하는 값으로 100% 일치한다 (라이브러리가 결과를 반환하고,
그 값을 그대로 판정에 사용하는 구조이기 때문).

---

## 7. 주사위 시스템 — 4차(최신): 여러 개 선택해서 한 번에 굴리기

### 요청
> "주사위를 여러개 선택해서 여러개 한번에 굴릴수 있게 해줘. 한종류를 여러개
> 선택해도 되고 여러종류를 한꺼번에 선택해서 한번에 다 굴리는거지. 그리고
> 결과를 텍스트로 보여주는게 좋겠다. 예쁘고 멋지게"

### UX 설계
- 하단 고정 패널에 **트레이(장바구니) 방식** 도입.
- 주사위 종류 버튼(d4/d6/d8/d10/d12/d20)을 누를 때마다 트레이에 +1 담김
  (뱃지로 개수 표시), 뱃지를 누르면 -1. 한 종류당 최대 9개까지.
- "N개 굴리기" 버튼으로 트레이에 담긴 걸 **한 번의 물리 시뮬레이션**으로
  전부 굴림 (다른 종류가 섞여 있어도 동시에 굴러감).
- 결과가 2개 이상이면 "N개 굴림 결과 / 합계 X" + 개별 `d{면수} {값}` 칩
  목록으로, 1개짜리(능력치/무기/주문 판정 등 기존 단일 굴림)는 기존처럼
  아이콘 + 텍스트로 표시 — **기존 단일 굴림 UX는 전혀 건드리지 않음**.

### 구현
- **`dice3DEngine.js`**: `rollPhysicalDiceGroup(selector, specs)` 추가.
  `specs = [{sides, qty}, ...]`를 `dice-box`의 `roll()`에 배열 형태
  (`[{qty, sides}, ...]`)로 그대로 전달하고, 결과 그룹 배열을
  `flattenResults()`로 `[{sides, value}, ...]` 평면 배열로 정규화.
- **`DicePanel.jsx`**: `forwardRef` + `useImperativeHandle`로
  `rollPhysical`(단일)과 `rollPhysicalMultiple`(다중) 둘 다 노출.
  트레이 상태(`diceQueue`)는 부모(`CharacterSheetManager`)가 소유하고
  Panel은 props로만 받아 그리는 순수 표현 컴포넌트로 유지.
- **`CharacterSheetManager.jsx`**:
  - state: `diceQueue`(종류별 개수), `queueResults`(마지막 굴림 결과),
    `queueTotal`(합계) 추가.
  - `incrementQueueDie` / `decrementQueueDie` / `resetQueue` — 트레이 조작.
  - `rollQueue` — 트레이에 담긴 것을 모아 `rollDiceQueuePhysically`로
    실제 굴리고, 결과 요약 텍스트(`N개 굴림 = d4:4  +  d6:6  +  d6:2  +
    d20:9  →  합계 21` 형태)를 만들어 `resultText`에 반영.
  - `rollDiceQueuePhysically` / `fallbackQueueRoll` — 기존
    `rollDiePhysically` / `rollWithFallback`과 동일한 패턴으로, 물리
    엔진 실패 시 `Math.random()` 폴백.
  - 기존 `executeRoll`(단일 판정용, 능력치/무기/주문 체크가 호출)은
    **일절 수정하지 않음**.

### 검증 (CDP 자동 테스트)
헤드리스 크롬(격리된 프로필, PID 추적)으로 실제 클릭 흐름을 재현:

1. d4 버튼 1회, d6 버튼 2회, d20 버튼 1회 클릭 → 트레이에 `d4×1, d6×2,
   d20×1` 담김, 버튼 라벨이 `"4개 굴리기"`로 바뀌는 것 확인.
2. `"4개 굴리기"` 클릭 → 화면 위에서 **진짜 3D 모델 주사위 4개가 동시에
   물리적으로 굴러가다 착지**하는 것을 스크린샷 시퀀스로 확인.
3. 최종 결과 텍스트: `"4개 굴림 결과" / "합계 21"` +
   칩 `d4 4`, `d6 6`, `d6 2`, `d20 9` → **4+6+2+9=21로 합계 검산 일치**,
   화면에 보이는 다이 눈(d20=9, d6=2 등)과 텍스트 결과가 정확히 일치.
4. 콘솔/네트워크 에러 0건.
5. 테스트 종료 후 추적해둔 PID만 종료 (헤드리스 크롬, 정적 서버 각각).

---

## 8. 관련 파일 위치 요약

```
src/assistan/characterSheet/
├── service/
│   └── dice3DEngine.js         # dice-box 래퍼: getDiceBox / rollPhysicalDie /
│                                #   rollPhysicalDiceGroup / clearDiceBox
├── component/
│   └── DicePanel.jsx           # 하단 고정 패널: 트레이 선택 UI + 결과 표시
│                                #   + 화면 전체를 덮는 3D 캔버스 포탈
├── main/
│   └── CharacterSheetManager.jsx  # 상태 소유 + 단일/다중 굴림 오케스트레이션
└── resource/CSS/
    └── characterSheet.css      # .dice-box-canvas 크기 지정 등

public/assets/dice-box/         # dice-box 런타임 에셋(물리엔진 wasm, 테마 텍스처)
```

## 9. 참고: 새로 만든 화면

- `src/assistan/settings/main/SettingsScreen.jsx` — 기존에 없던 설정 화면을
  신규 제작, `App.js`에 `/settings` 라우트 추가.
- `src/assistan/characterSheet/component/BattleMapPanel.jsx` — 전투매트
  기능 신규 추가.

## 10. 향후 작업 시 주의할 점 (체크리스트)

- [ ] `dice-box` 관련 코드를 건드릴 때는 **`container` 키를 절대
      `selector`로 바꾸지 말 것** (조용히 무시되는 버그가 재현된다).
- [ ] React 18 StrictMode 환경에서 모듈 전역 캐시를 쓸 경우, 리마운트 시
      DOM이 실제로 남아있는지 확인 후 재사용하는 패턴을 유지할 것.
- [ ] 새 에셋을 `node_modules/@3d-dice/dice-box/dist/assets`에서 갱신해
      가져올 경우 `public/assets/dice-box/`에도 다시 복사할 것 (빌드 시
      정적 파일로 함께 배포되어야 함).
- [ ] 헤드리스 크롬으로 테스트할 때는 반드시:
      1) `Start-Process -PassThru`로 PID 확보 → 파일에 기록
      2) 독립된 `--user-data-dir` 사용
      3) 테스트 종료 후 **그 PID만** `Stop-Process -Id`로 종료
      4) `Get-Process chrome | Stop-Process` 같은 이름 기반 전체 종료는
         절대 사용하지 말 것 (사용자의 실제 브라우저가 함께 종료됨).

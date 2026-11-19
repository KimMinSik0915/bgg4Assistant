# 개발 기록: AI GM의 전투지도 토큰 컨트롤 (이동/생성) & Claude 지원 검토

> 이 문서는 AI(Claude Code)와의 협업으로 진행된 **"채팅으로 대화한 결과에 따라
> AI GM이 전투지도 위 토큰을 직접 옮기고, 새 적을 등장시키는" 기능** 구현
> 기록이다. 그 과정에서 함께 다룬 **Claude(Anthropic) 프로바이더 추가/제거**,
> **임의로 업로드한 지도 이미지에서 이름만으로 장소를 찾는 문제**, 그리고
> **작업 중 겪은 변경사항 유실 사고**까지 포함한다.
> `docs/DEVLOG_GM_WORKSPACE_LAYOUT_AND_IOS_PERF.md`(워크스페이스 레이아웃)
> 다음에 이어지는 작업이며, 같은 이유로 "왜 이렇게 했는지"를 남겨서 나중에
> 같은 삽질을 반복하지 않는 것이 목적이다.

- 작업 브랜치: `feature/trpg/front`
- 대상 프로젝트: `bgg4Assistant` (React 18 + CRA + Tailwind CSS)
- AI 제공자: Google Gemini `generateContent` REST API (프로젝트 내
  `geminiService.js` 자체 래퍼, 공식 SDK 아님)

> ⚠️ **검증 방식에 대한 솔직한 기록**: 이 문서에 정리된 작업은 전부 `npx
> react-scripts build` 컴파일 성공 + ESLint 신규 경고 없음, 그리고 격자
> 좌표 변환 로직(순수 함수)에 대한 Node 스크립트 단위 테스트로만 검증했다.
> **실제 Gemini API 키로 브라우저에서 대화를 주고받으며 토큰이 실제로
> 옮겨지는지는 확인하지 않았다.** 특히 5장(지도 비전 조회)과 6장(적 토큰
> 생성)은 로직 리뷰 + 빌드 통과 수준의 검증이라는 점을 감안하고 실사용
> 테스트가 필요하다.

---

## 목차

1. [문제 정의 — AI가 지도 위 토큰을 옮길 수 있는가?](#1-문제-정의--ai가-지도-위-토큰을-옮길-수-있는가)
2. [1차 구현 — 텍스트 좌표 계약(token_moves) + Gemini Structured Output](#2-1차-구현--텍스트-좌표-계약token_moves--gemini-structured-output)
3. [곁가지 — Claude(Anthropic) 프로바이더 추가](#3-곁가지--claudeanthropic-프로바이더-추가)
4. [Claude 무료 사용 가능성 검토 → 불가 결론 → 제거](#4-claude-무료-사용-가능성-검토--불가-결론--제거)
5. [임의 지도에서 "이름만으로" 장소 찾기 — 핀 + 비전 폴백](#5-임의-지도에서-이름만으로-장소-찾기--핀--비전-폴백)
6. [AI 적 토큰 생성(token_spawns) + 클릭해서 이미지 넣기](#6-ai-적-토큰-생성token_spawns--클릭해서-이미지-넣기)
7. [사고 기록 — 미커밋 변경사항 유실 및 재구현](#7-사고-기록--미커밋-변경사항-유실-및-재구현)
8. [관련 파일 위치 요약](#8-관련-파일-위치-요약)
9. [향후 작업 시 주의할 점 (체크리스트)](#9-향후-작업-시-주의할-점-체크리스트)

---

## 1. 문제 정의 — AI가 지도 위 토큰을 옮길 수 있는가?

### 요청
> "AI와 채팅하다가 나온 결과에 따라서 AI가 지도상의 토큰을 이동시키게
> 하고싶어. 그러려면 AI가 지도를 읽어야 돼. 이게 구현이 가능할까?"

### 검토
기존 코드(`GmChatPanel.jsx`, `BattleMapPanel.jsx`, `CharacterSheetManager.jsx`)를
먼저 훑어보니:

- `BattleMapPanel`은 이미 각 토큰의 위치를 **격자 좌표 라벨**(`A1`, `C4` 등,
  `calculateGridPos()`)로 계산해 들고 있었다.
- `CharacterSheetManager.getCompressedMapText()`가 이 좌표 목록을 매 턴
  시스템 프롬프트에 텍스트로 이미 전달하고 있었다(토큰 이동 자체는 아직
  없었지만, "AI가 지도 상태를 안다"는 절반은 이미 구현돼 있었던 셈).
- `gmTools.js`(Gemini function calling 선언)는 존재했지만 **비어 있었고
  실제 API 요청(`callGemini`)에 `tools`로 등록된 적도 없어 죽은 코드**였다.
  즉 이 프로젝트는 애초에 "AI 응답 텍스트를 JSON으로 파싱해서 시트를
  갱신하는" 방식(narrative + session_state)으로 동작하고 있었다.

### 결론 & 설계 방향
지도 **이미지**를 AI에게 보여줄 필요가 없다는 게 핵심 통찰이었다. 이미
텍스트로 좌표를 알고 있으니:

1. AI 응답 JSON 스키마에 `token_moves: [{ token, to }]` 필드만 추가
2. 클라이언트가 격자 라벨을 픽셀 좌표로 역산해서 실제로 토큰을 옮김

→ **추가 API 호출도, 비전(이미지) 토큰도, tool-use 왕복도 없이** 기존
"질문 1번 → 응답 1번" 구조에 필드 하나만 얹는 구조. 사용자가 처음부터
"AI 사용량이 가장 적은 방법으로 효율적으로 구현해줘"라고 명시했기 때문에
이 방향을 최우선으로 잡았다.

---

## 2. 1차 구현 — 텍스트 좌표 계약(token_moves) + Gemini Structured Output

### 구현

**격자 좌표 역변환**: `BattleMapPanel.calculateGridPos(x, y, gridSize)`(픽셀→라벨,
엑셀 열 이름 방식 0=A,25=Z,26=AA...)의 정확한 역함수가 필요했다. 처음엔
`CharacterSheetManager.jsx`에 로컬로 작성했다가, 이후 여러 곳에서 같은
로직이 필요해지면서(5장) **`src/assistan/characterSheet/util/gridCoords.js`로
분리**했다:

```js
export const calculateGridPos = (x, y, gridSize) => { ... };   // 픽셀 → "C4"
export const parseGridLabel = (label) => { ... };              // "C4" → {col, row}
export const gridIndexToPixel = (col, row, gridSize) => { ... }; // {col,row} → 픽셀
```

두 컴포넌트가 각자 구현하면 인코딩이 어긋날 위험이 있어 한 곳으로 모은
것 — 실제로 이 위험을 의식해서 2,400개 격자 셀에 대한 왕복(forward→inverse→forward)
테스트를 Node 스크립트로 직접 돌려 검증했다(`Z1→AA1` 같은 두 자리 알파벳
경계 케이스 포함, 전부 통과).

**AI 쪽 계약**: `CharacterSheetManager.buildGmSystemInstruction()`의 JSON
응답 포맷에 `token_moves` 필드 추가:

```json
{
  "narrative": "...",
  "session_state": { "loc": "...", "clues": [...], "quests": [...] },
  "token_moves": [{ "token": "고블린 1", "to": "C4" }]
}
```

`CharacterSheetManager.applyTokenMoves(moves)`가 이걸 받아 이름 매칭(완전
일치 우선, 없으면 부분 일치) 후 `mapState.tokens`의 좌표를 갱신한다.

**신뢰성 강화 — Structured Output**: 처음엔 "```json 코드펜스로 감싸서
반환하라"는 텍스트 지시 + `JSON.parse` 실패 시 원문 그대로 표시하는
fallback 방식이었다. 이 방식은 Gemini가 형식을 살짝 어기면(펜스 누락,
여분 설명 텍스트 등) `token_moves`가 통째로 무시될 수 있는 구멍이 있었다.
그래서 `geminiService.callGemini()`에 `responseSchema` 옵션을 추가하고,
`generationConfig: { responseMimeType: 'application/json', responseSchema }`로
**Gemini가 스키마를 벗어난 JSON을 낼 수 없게 강제**했다(`GM_RESPONSE_SCHEMA`
상수). 추가 토큰 비용 없이 같은 요청에 옵션 하나 더 붙이는 것이라 사용량에는
영향이 없다.

**BattleMapPanel 쪽 동기화 문제**: `BattleMapPanel`은 마운트 시 1회만
`mapState` prop을 로컬 state로 복사해오는 구조라, 부모(`CharacterSheetManager`)가
`applyTokenMoves`로 `mapState`를 바꿔도 화면에 반영되지 않는 구조적
문제가 있었다. `mapState.aiTokenUpdateAt`(타임스탬프)을 추가해, **AI가
옮겼을 때만** 이 필드를 갱신하고 `BattleMapPanel`은 이 필드 변화에만
반응하는 별도 `useEffect`를 추가했다 — 사용자가 직접 드래그할 때 발생하는
일반적인 `notifyParentState` 왕복에는 이 필드가 없으므로 서로 간섭하지
않는다.

---

## 3. 곁가지 — Claude(Anthropic) 프로바이더 추가

### 요청
> "지금 AI는 제미나이만 쓰고있는데 이걸 클로드로 추가하고 싶어. 사용자가
> 제미나이 쓸지 클로드 쓸지 선택해서 사용하도록 클로드 추가해줘."

### 구현 (이후 4장에서 전량 롤백됨)
- `@anthropic-ai/sdk` 공식 SDK 설치, `src/assistan/characterSheet/service/claudeService.js`
  신규 작성(`dangerouslyAllowBrowser: true` — Gemini 키와 동일하게 브라우저
  직접 호출, 서버 없음).
- `GmChatPanel.jsx`에 Gemini/Claude 토글 버튼, 각 제공자별 API 키·모델
  입력 필드 추가(전환해도 각자 값 유지).
- `CharacterSheetManager.sendGmMessage()`를 `aiProvider` 상태에 따라
  분기하도록 리팩터링. 이 과정에서 `gmHistory`를 Gemini 전용 원본 형식
  (`{role:'model', parts:[...]}`)에서 **공급자 중립 평문**(`{role, text}`)으로
  바꿔 대화 도중 제공자를 전환해도 맥락이 끊기지 않게 함.
- 기본 모델은 `claude-opus-5`(claude-api 스킬 정책상 임의로 저가 모델을
  기본값으로 내리지 않음), 대신 설정 필드 placeholder에 저렴한 대안
  (`claude-haiku-4-5`)을 안내.

---

## 4. Claude 무료 사용 가능성 검토 → 불가 결론 → 제거

### 요청 흐름
1. "클로드로 무료로 GM으로 사용할 수 있는 방법 있어? 있으면 클로드 방식만
   바꿔서 개발해줘."
2. "그럼 클로드 Pro 플랜으로 구독하고있으면 이 앱에서 사용할 수 있어?"
3. "그럼 클로드 관련 소스 다 제거해주고, 지금 제미나이로만 지도위의
   토큰을 완벽히 컨트롤 할 수 있는지 다시 점검해줘."

### 조사 결과 (WebSearch로 2026년 최신 정보 확인)
- **Claude API에는 상시 무료 티어가 없다.** 신규 계정 가입 시 1회성
  ~$5 크레딧만 제공되고 이후 종량제.
- **Claude Pro/Max 구독은 API와 완전히 별개 서비스**이며, 2026년 2월
  Anthropic이 "Free/Pro/Max 등 소비자 플랜의 OAuth 인증을 Agent SDK를
  포함한 제3자 제품·툴·서비스에서 쓰는 것은 약관 위반"이라고 명문화하고
  실제로 차단하기 시작했다(2026-01-09부터 Max OAuth 제3자 클라이언트
  차단). 즉 Pro 구독 자격으로 이 앱의 백엔드를 돌리는 건 기술적으로
  흉내 낼 수 있어도 명백한 ToS 위반이라 **구현하지 않기로 결정**.
- 결론: 무료가 목적이면 이미 무료 티어가 있는 Gemini를 쓰는 게 정답이고,
  Claude는 (원한다면) 저렴한 모델로 소액 결제해서 쓰는 것만 현실적인
  선택지.

### 롤백 작업
- `claudeService.js` 삭제, `@anthropic-ai/sdk` 의존성 제거
  (`npm uninstall`).
- `GmChatPanel.jsx`를 `git checkout`으로 원복(이 파일의 변경분은 전부
  Claude 전용이었음).
- `CharacterSheetManager.jsx`에서 Claude 관련 state/handler/props/import만
  선별 제거하되, **`token_moves`/`gmHistory` 평문화 등 Claude와 무관한
  개선은 유지**(공급자 중립 히스토리 포맷은 그 자체로 더 단순해서 되돌릴
  이유가 없었음).
- 부수적으로 `npm install/uninstall` 과정에서 `yarn.lock`이 의도치 않게
  갱신되는 걸 발견해 `git checkout`으로 복구(이 레포는 npm 위주로 관리되고
  yarn.lock은 사실상 방치돼 있던 상태였다).

---

## 5. 임의 지도에서 "이름만으로" 장소 찾기 — 핀 + 비전 폴백

### 요청 흐름
1. "'OO를 C4로 이동시켜'가 아니라 'OO를 동굴(지도의 특정 지점)로
   이동시켜'로 말해도 잘 동작하는거지?"
2. (답변: 조건부로만 동작 — 이전 대화에서 좌표가 언급된 적 있어야 함)
   → "지도 이미지도 사용자가 마음대로 자기가 원하는 이미지 첨부하는
   방식이야. 지도는 매번 달라지고 토큰도 원하는대로 올려놓고 GM이랑
   플레이 하는건데 이걸 구현할 방법 없어?"

### 문제의 본질
AI는 지도 **이미지**를 한 번도 본 적이 없다. `token_moves`는 이미 알고
있는 좌표를 텍스트로 돌려받는 구조라 정확했지만, "동굴"처럼 그림에만
존재하고 한 번도 좌표로 언급된 적 없는 장소는 AI가 찍어맞힐 수밖에
없었다.

### 설계 갈림길 → 사용자 선택
`AskUserQuestion`으로 세 가지 옵션을 제시:
1. **핀 찍기**(무료, 100% 정확, 사용자가 미리 찍어둬야 함)
2. **AI 비전 분석**(자동이지만 요청마다/지도 로드마다 비전 토큰 비용,
   추정치라 부정확할 수 있음)
3. **둘 다**(핀이 기본, 비전은 핀도 없고 처음 언급되는 장소에 한해
   보조로 1회만)

사용자가 **3번(둘 다)**을 선택.

### 구현

**(A) 핀(장소 표식) 찍기 — `BattleMapPanel.jsx`**
- 상단 [📍 핀 찍기] 토글 버튼. 켠 상태로 지도를 클릭하면 `window.prompt`로
  이름을 물어보고, 그 좌표에 `isPin: true`인 토큰을 하나 생성.
- 일반 토큰과 **같은 배열**에 저장하되 `isPin` 플래그로 구분 — HP 바 없이
  📍 마커로 렌더링, 선택 패널도 HP/크기 없이 안내 문구만 표시.
- 드래그로 위치 조정 가능, 삭제 가능.
- `applyTokenMoves`의 이동 대상 검색에서는 **제외**(핀은 참조용이지 이동
  대상이 아님).

**(B) 텍스트 계약 확장 — `CharacterSheetManager.jsx`**
- `getCompressedMapText()`(이동 가능한 토큰만)와 `getCompressedPinsText()`
  (핀만)로 분리, 시스템 프롬프트에 "전투지도 좌표"와 "지도 표식(핀) 좌표"를
  별도 섹션으로 제공.
- `session_state.landmarks: [{ name, gridPos }]` 필드 추가 — clues/quests와
  같은 **누적 방식**(매 응답마다 지금까지 확정된 항목 전부를 다시 포함).
  서술 중 특정 장소의 좌표가 처음 확정되면 여기 기록해두고, 이후 같은
  이름이 다시 언급되면 재사용. 핀은 "즉시·영구·무료"인 반면 landmarks는
  "대화 중 자연스럽게 확정된 것"을 기억하는 보조 수단.
- 좌표 조회 우선순위를 프롬프트에 명시: **① 핀 목록 → ② 토큰 목록(장소
  이름의 토큰이 있는 경우) → ③ session_state.landmarks**.
- 위 세 곳 어디에도 없는, **완전히 처음 언급되는 장소**는 좌표를
  추측하지 말고 최상위 응답 필드 `location_lookup`에 장소 이름만 채우고
  이동은 보류하도록 지시(GM_RESPONSE_SCHEMA에도 필드 추가).

**(C) 비전 폴백 — `CharacterSheetManager.resolveLocationViaVision()`**
- `location_lookup`이 채워진, 드문 경우에만 활성 지도 **이미지**를 1회
  Gemini에 전송. 격자선은 CSS로 덧그린 것이라 이미지 파일 자체에는
  없으므로, AI에게 격자 좌표를 직접 맞히게 하지 않고 **"이미지 기준
  가로/세로 몇 %(x_percent, y_percent) 지점인지"**만 물어봄
  (`LOCATION_LOOKUP_SCHEMA`로 구조화).
- 응답받은 %좌표를 지도 업로드 시 저장해둔 **실제 픽셀 크기**(`width`/`height`
  — `BattleMapPanel.compressImage()`가 압축 후 실제 크기도 함께 반환하도록
  확장)로 환산해 클라이언트에서 격자 좌표를 직접 계산.
- 찾으면: 그 자리에 핀을 자동으로 꽂고(`addMapPin`) `session_state.landmarks`에도
  기록 → 시스템 메시지로 "📍 위치를 찾아 표식을 추가했습니다. 같은 요청을
  다시 말씀해 주세요!" 안내(같은 턴에 바로 이동까지 자동 재시도하지 않고,
  사용자가 한 번 더 요청하게 하는 단순한 흐름을 택함 — 재귀 호출/중복
  히스토리 push 등의 복잡도를 피하기 위한 의도적 선택).
- 못 찾으면: "⚠️ 못 찾았습니다, 직접 핀을 찍어주세요"로 (A) 방식으로 유도.
- 지도 업로드 이전(이번 변경 전)에 이미 저장돼 있던 세션의 지도는
  `width`/`height`가 없어 비전 폴백이 조용히 스킵된다 — 재업로드하거나
  핀을 쓰면 됨.

### 비용 관점
평소 대화(이동 요청 포함)는 전부 텍스트만 오가는 기존 방식 그대로다.
비전 호출은 "핀도 없고 한 번도 언급된 적 없는 장소"를 처음 부르는,
사실상 드문 순간에만 1회 발생한다.

---

## 6. AI 적 토큰 생성(token_spawns) + 클릭해서 이미지 넣기

### 요청
> "AI가 적을 생성해야 하는 경우 토큰을 position에 생성하게. 그 토큰을
> 누르면 이미지를 넣을 수 있도록"

### 구현

**AI 쪽 계약 — `CharacterSheetManager.jsx`**
- `GM_RESPONSE_SCHEMA`에 `token_spawns: [{ name, at, hp, maxHp }]` 추가
  (`token_moves`와 대칭 구조, `at`이 등장 격자 좌표).
- `applyTokenSpawns(spawns)`: `parseGridLabel` + `gridIndexToPixel`로
  좌표 계산 후 `mapState.tokens`에 새 토큰 추가. **`url` 필드 없이**
  생성 — AI는 이미지를 만들 수 없으므로 의도적으로 비워둔다. hp/maxHp
  미지정 시 기본값 30/30.
- 프롬프트에 "이미 지도에 있는 토큰은 다시 spawn하지 말고 token_moves로
  이동시켜라", "이름은 기존 토큰과 겹치지 않게 구분(고블린 2 등)"을
  명시해 중복/혼동을 예방.

**사용자 쪽 UX — `BattleMapPanel.jsx`**
- `url`이 없는(핀도 아닌) 토큰은 `➕🖼️` 점선 테두리 + 애니메이션 마커로
  렌더링, 좌표 라벨 옆에 "이미지 필요" 표시.
- 그 토큰을 **클릭하면 곧바로 파일 선택창이 뜬다** — 공유 숨김
  `<input type=file>` + `pendingImageTokenIdRef`로 "지금 어느 토큰에
  넣는 중인지"를 잠깐 기억해두는 방식. 선택 완료 시 압축(`compressImage`)
  후 해당 토큰의 `url`만 채워 넣으면 이후로는 완전히 일반 토큰과
  동일하게 동작(HP, 이동, 삭제 등 전부 가능).
- 혹시 파일 선택을 취소했을 때를 위해, 선택된 토큰의 하단 컨트롤
  패널에도 "🖼️ 이 토큰에 이미지 넣기" 버튼을 별도로 노출.

---

## 7. 사고 기록 — 미커밋 변경사항 유실 및 재구현

6장 작업 직후, 다음 턴에서 같은 기능을 다시 요청받았다. 확인해보니:

- 6장에서 만든 `token_spawns`/`applyTokenSpawns`/`openImagePickerFor`/
  `pendingImageTokenIdRef` 등이 **작업 트리에서 통째로 사라져 있었다**
  (`git status`가 clean — 즉 디스크의 파일이 그 시점 HEAD와 정확히
  일치하는 상태).
- `git log`를 보니 그 사이 `feat: 지도에 핀찍기 기능 추가` 커밋과, 다른
  브랜치(`feature/trpg/func`)를 병합하는 PR 두 건이 들어와 있었다.
  즉 **1~5장까지의 작업은 어느 시점에 커밋되어 살아남았지만, 6장(가장
  최근 작업)은 커밋되지 않은 채로 외부의 git 작업(머지/리셋 등)에
  의해 유실**된 것으로 보인다.
- 하네스가 "파일이 디스크에서 바뀌었다"는 시스템 알림을 줘서 인지할 수
  있었고, 원칙대로 **되돌리지 않고 현재 디스크 상태를 기준으로** 6장의
  기능만 다시 구현했다(재구현 내용은 6장 서술과 동일 — 최종 결과물
  기준으로는 차이 없음).

### 교훈
- 이 프로젝트는 AI(Claude Code) 세션과 사람(팀원)의 git 작업이 **같은
  브랜치에서 비동기적으로 섞여 진행**되고 있다. 세션이 만든 변경사항은
  **세션이 직접 커밋하지 않는 한 다음 병합/리셋에 유실될 수 있다.**
- 값진 변경(특히 여러 파일에 걸친 기능 단위) 직후에는 **바로 커밋**해
  두는 것이 안전하다. 이 문서 작성 시점 기준으로도 6장 재구현분은 아직
  미커밋 상태이니, 다음 작업 시작 전에 커밋부터 하는 것을 권장한다.

---

## 8. 관련 파일 위치 요약

```
src/assistan/characterSheet/
├── main/CharacterSheetManager.jsx
│   ├── GM_RESPONSE_SCHEMA / LOCATION_LOOKUP_SCHEMA        # 2, 5, 6장 - Structured Output 스키마
│   ├── buildGmSystemInstruction()                         # 2, 5, 6장 - AI에게 내려주는 좌표/계약 텍스트
│   ├── sendGmMessage()                                    # 2, 3(롤백), 5, 6장 - 요청/응답 파싱 진입점
│   ├── applyTokenMoves() / applyTokenSpawns() / addMapPin() / resolveLocationViaVision()
│   ├── getCompressedMapText() / getCompressedPinsText()   # 5장 - 토큰/핀 좌표 텍스트 요약
│   └── normalizeGmHistory()                                # 3장 - 공급자 중립 gmHistory 하위호환
│
├── component/
│   ├── GmChatPanel.jsx                                    # 3장에서 Claude 토글 추가 → 4장에서 원복(순수 Gemini)
│   └── BattleMapPanel.jsx
│       ├── calculateGridPos (이제 gridCoords.js에서 import) # 2장
│       ├── isPinMode / placePinAt()                        # 5장 - 핀 찍기
│       ├── compressImage() → {url, width, height}          # 5장 - 비전 %좌표 환산용
│       ├── mapState.aiTokenUpdateAt 동기화 useEffect        # 2장 - AI 이동을 화면에 반영
│       └── pendingImageTokenIdRef / openImagePickerFor() / handlePendingImageChange()  # 6장
│
├── util/gridCoords.js                                      # 2장 - 격자 라벨 ↔ 픽셀 좌표 공용 변환 (2,400셀 테스트 완료)
│
├── service/
│   ├── geminiService.js                                    # 2장 - callGemini에 responseSchema 옵션 추가
│   └── claudeService.js                                    # 3장에서 신설 → 4장에서 삭제 (더 이상 존재하지 않음)
│
└── resource/dataSet/gmTools.js                              # 1장 - 여전히 미사용(죽은 코드), 이번 작업 범위 밖
```

---

## 9. 향후 작업 시 주의할 점 (체크리스트)

- [ ] **6장(적 토큰 생성) + 5장(비전 폴백)은 실제 API 키로 브라우저에서
      한 번도 검증되지 않았다.** 다음 세션에서 실사용 테스트가 필요하면
      이 순서로 확인할 것: ① 지도/토큰 업로드 → ② "OO가 나타난다" 같은
      메시지로 `token_spawns` 유발 → ③ 생성된 플레이스홀더 토큰 클릭 →
      이미지 선택창이 뜨는지 → ④ 핀 없이 새 장소 이름을 언급해
      `location_lookup` → 비전 폴백이 실제로 좌표를 맞히는지.
- [ ] **작업 결과는 세션이 직접 커밋하지 않으면 유실될 수 있다**(7장
      참고). 이 문서 작성 시점 기준 6장 재구현분이 아직 미커밋이니,
      다음 세션 시작 시 `git status`부터 확인할 것.
- [ ] `Gemini responseSchema`(Structured Output)를 쓰는 모든 요청은
      모델이 바뀌어도(사용자가 설정에서 자유 입력) 계속 지원되는지
      확인이 필요하다 — 현재는 `gemini-3.1-flash-lite` 계열 기준으로만
      확인됨.
- [ ] `BattleMapPanel`의 `tokens` 배열은 지도(`activeMapId`)별로 분리돼
      있지 않다 — 여러 지도를 등록해도 토큰/핀은 전역으로 공유된다.
      "지도를 바꿔도 이전 지도의 몬스터가 그대로 보인다"는 문제가 될
      수 있으니, 다중 지도를 실제로 활용하게 되면 `mapId`별 토큰 분리를
      고려할 것.
- [ ] `session_state.landmarks`/`clues`/`quests`는 모두 "매 응답마다
      AI가 전체를 다시 채워 보내는" 누적 방식에 의존한다. AI가 이
      규칙을 어기고 일부만 보내면 조용히 앞선 기록이 사라질 수 있다 —
      현재는 클라이언트 쪽 병합/검증 로직이 없다.
- [ ] Claude 지원은 완전히 제거됐지만, 이 문서(3~4장)에 조사 근거(ToS,
      비용 구조)가 남아있으니 향후 "Claude 다시 붙여줘" 요청이 오면
      처음부터 다시 조사하지 말고 이 문서부터 참고할 것.

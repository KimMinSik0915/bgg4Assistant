# 🤝 2인 협동 세션 (Firebase) 설정 가이드

"GM 대화" 패널 상단의 **🤝 함께 플레이** 버튼을 누르면 다른 사람과 같은 시나리오를
실시간으로 함께 플레이할 수 있어요. Firebase Realtime Database를 쓰므로, 아래 설정을
딱 한 번만 해두면 됩니다 (파티원 중 아무나 한 명만 하면 돼요 - 같은 저장소 코드를
공유하니까요).

## 1. Firebase 프로젝트 만들기 (5분)

1. https://console.firebase.google.com 접속 → 구글 계정으로 로그인
2. "프로젝트 추가" → 이름 아무거나 (예: `bgg4-trpg`) → 애널리틱스는 꺼도 무방
3. 왼쪽 메뉴 **빌드(Build) > Realtime Database** → "데이터베이스 만들기"
   - 위치는 가까운 지역(asia-southeast1 등) 아무거나
   - 보안 규칙은 일단 **테스트 모드**로 시작 (아래 4번에서 다시 손볼 거예요)
4. 왼쪽 위 ⚙️ (프로젝트 설정) → 아래로 스크롤 → "내 앱" → **웹 앱 추가**(`</>` 아이콘)
   - 앱 닉네임 아무거나 입력 → "앱 등록"
   - 화면에 나오는 `firebaseConfig` 객체를 통째로 복사해두기

```js
const firebaseConfig = {
  apiKey: "AIza...",
  authDomain: "bgg4-trpg.firebaseapp.com",
  databaseURL: "https://bgg4-trpg-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "bgg4-trpg",
  storageBucket: "bgg4-trpg.appspot.com",
  messagingSenderId: "123456789",
  appId: "1:123456789:web:abcdef"
};
```

## 2. 패키지 설치 + 코드 설정

이 프로젝트의 `package.json`에 Firebase가 없다면 먼저 설치하세요.

```bash
npm install firebase
```

그다음 `src/assistan/characterSheet/service/firebaseClient.js` 파일을 열어서
`FIREBASE_CONFIG` 객체 안의 `YOUR_...` 값들을 방금 복사한 값으로 전부 교체하세요.

> ⚠️ 이 값들은 "비밀 키"가 아니라 브라우저에 공개적으로 노출되는 식별자예요. 코드에 그대로
> 넣어도 되지만, 대신 **누가 이 DB를 읽고 쓸 수 있는지는 아래 3번의 "규칙(Rules)"으로
> 제어**해야 해요. (Gemini API 키와는 성격이 다릅니다 — 그 키는 여전히 각자 브라우저의
> 설정 화면에만 저장되고, 이 파일에는 절대 넣지 않습니다.)

## 3. 보안 규칙 설정 (꼭 하세요)

Realtime Database > **규칙(Rules)** 탭에서 아래로 교체하고 "게시(Publish)"하세요.

```json
{
  "rules": {
    "rooms": {
      "$roomId": {
        ".read": true,
        ".write": true
      }
    }
  }
}
```

> "방 코드를 아는 사람만 참여 가능"한 수준의 느슨한 보안이에요 (테이블탑 게임 초대
> 코드와 비슷한 신뢰 모델). 지인끼리 쓰는 용도라면 이 정도로 충분해요.

## 4. 사용 방법

1. 파티원 각자 설정(⚙️)에서 **본인의 Gemini API 키**를 입력해두세요.
2. "GM 대화" 패널 → **🤝 함께 플레이** 클릭
3. 한 명이 이름 입력 후 **➕ 새 방 만들기** → 생성된 6자리 방 코드를 상대방에게 공유
4. 상대방은 이름 입력 후 그 코드를 넣고 **참가하기**
5. 이제 둘 다 같은 채팅 로그/전투지도를 실시간으로 봅니다. 누가 메시지를 보내든
   **보낸 사람 본인의 API 키**로 GM이 호출됩니다.

## 동작 방식

- 누군가 메시지를 보내면: 채팅 로그에 먼저 표시 → 턴 잠금(turnLock) 획득 시도 →
  성공하면 본인 API 키로 GM 호출(솔로 모드와 동일한 `GM_RESPONSE_SCHEMA` 구조화
  응답 사용) → `token_moves`/`token_spawns`로 전투지도 갱신 → 결과를 방에 기록 →
  잠금 해제.
- 동시에 두 명이 보내면, 먼저 잠금을 얻은 쪽만 실제로 GM을 호출하고 나머지는
  "상대방이 GM과 대화 중이에요" 안내를 받은 뒤 다시 시도하면 돼요.
- `location_lookup`(지도 이미지를 직접 봐야 하는 드문 경우)은 협동 세션에서는
  자동 처리하지 않아요. 공유 방에는 지도 좌표 텍스트만 있고 이미지 자체가 없어서,
  솔로 모드의 비전 조회 기능을 그대로 재현할 수 없기 때문이에요. 대신 "지도에서
  핀을 직접 찍어달라"는 안내 메시지가 표시됩니다.

## 참고

무료 요금제(Spark 플랜) 기준 Firebase Realtime DB는 동시 연결 100개, 월 1GB
다운로드까지 무료라서, 지인끼리 쓰는 용도로는 비용 걱정 없이 쓸 수 있어요.

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

### 3-1. Storage 활성화 (전투지도/토큰 이미지 공유에 필요)

방장이 올린 전투지도 이미지를 다른 참가자에게도 보여주려면 **Cloud Storage**가 필요해요
(Realtime Database에는 이미지 원본을 직접 넣지 않고, Storage에 올린 뒤 짧은 URL만 저장해요).

1. 왼쪽 메뉴 **빌드(Build) > Storage** → "시작하기" → 기본 설정으로 진행
2. **규칙(Rules)** 탭에서 아래로 교체하고 게시하세요.

```
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    match /rooms/{roomId}/{allPaths=**} {
      allow read, write: if true;
    }
  }
}
```

> 이것도 Realtime Database 규칙과 같은 느슨한 신뢰 모델이에요. Storage를 켜두지 않으면
> 지도/토큰 이미지 업로드 시 오류가 나니, 협동 세션에서 지도를 쓸 계획이면 꼭 켜두세요.

## 4. 사용 방법

1. 파티원 각자 설정(⚙️)에서 **본인의 Gemini API 키**를 입력해두세요.
2. "GM 대화" 패널 → **🤝 함께 플레이** 클릭
3. 한 명이 이름 입력 후 **➕ 새 방 만들기** → 생성된 6자리 방 코드를 상대방에게 공유
   (이 사람이 **방장**이 됩니다)
4. 나머지는 이름 입력 후 그 코드를 넣고 **참가하기** (인원 제한 없음)
5. 이제 모두 같은 채팅 로그를 실시간으로 봅니다. 누가 메시지를 보내든
   **보낸 사람 본인의 API 키**로 GM이 호출됩니다.
6. [🗺️ 전투 지도] 탭에서 **방장이 지도를 업로드**하면, 같은 방에 있는 모든 참가자의
   화면에 실시간으로 함께 나타납니다. 방장이 아닌 참가자는 지도 업로드 버튼이
   "🔒 지도(방장 전용)"으로 표시되고, 대신 토큰 추가/이동, 핀 찍기, HP 조절 등은
   누구나 할 수 있어요 - 서로의 조작이 실시간으로 모두의 화면에 반영됩니다.

## 동작 방식

- 누군가 메시지를 보내면: 채팅 로그에 먼저 표시 → 턴 잠금(turnLock) 획득 시도 →
  성공하면 본인 API 키로 GM 호출(솔로 모드와 동일한 `GM_RESPONSE_SCHEMA` 구조화
  응답 사용) → `token_moves`/`token_spawns`로 전투지도 갱신 → 결과를 방에 기록 →
  잠금 해제.
- 동시에 여러 명이 보내면, 먼저 잠금을 얻은 사람만 실제로 GM을 호출하고 나머지는
  "상대방이 GM과 대화 중이에요" 안내를 받은 뒤 다시 시도하면 돼요.
- `location_lookup`(지도 이미지를 직접 봐야 하는 드문 경우)은 협동 세션에서는
  자동 처리하지 않아요. GM 호출 자체에는 여전히 지도 좌표 텍스트만 전달되어서,
  솔로 모드의 비전 조회 기능을 그대로 재현할 수 없기 때문이에요(방에 실제로 지도
  이미지가 함께 보이는 것과는 별개예요). 대신 "지도에서 핀을 직접 찍어달라"는
  안내 메시지가 표시됩니다.
- 전투지도(배경 이미지/토큰 이미지)는 로컬에서 압축한 뒤 Firebase Storage에 올리고,
  Realtime Database의 방 데이터(`mapState`)에는 그 다운로드 URL과 토큰 좌표만 저장돼요.
  화면 확대/이동(줌·팬)은 각자 보는 화면의 개인 설정이라 공유되지 않고, 그 외
  지도/토큰 관련 변경은 전부 실시간으로 모두에게 동기화됩니다.

## 참고

무료 요금제(Spark 플랜) 기준 Firebase Realtime DB는 동시 연결 100개, 월 1GB
다운로드까지 무료라서, 지인끼리 쓰는 용도로는 비용 걱정 없이 쓸 수 있어요.

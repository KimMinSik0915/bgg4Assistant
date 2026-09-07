# 🚀 GitHub Pages 새로고침 404 수정 + 배포 가이드

## 무슨 문제였나

GitHub Pages는 정적 파일 호스팅이라 서버 쪽에서 경로를 다시 써주는(rewrite) 기능이
없어요. 기존에 쓰던 `BrowserRouter`(`/character-sheet` 같은 깔끔한 주소)는 그 페이지에서
**새로고침하거나 링크를 직접 붙여넣으면 404**가 뜹니다. GitHub Pages 서버 입장에서는
`/character-sheet`라는 실제 파일/폴더가 없으니까요.

## 무엇을 고쳤나

`src/App.js`에서 `BrowserRouter` → `HashRouter`로 교체했어요.

```diff
- import {BrowserRouter, Route, Routes} from "react-router-dom";
+ import {HashRouter, Route, Routes} from "react-router-dom";
  ...
  return (
-     <BrowserRouter>
+     <HashRouter>
          <Layout>
              ...
          </Layout>
-     </BrowserRouter>
+     </HashRouter>
  );
```

주소가 `.../character-sheet` 대신 `.../#/character-sheet` 형태로 바뀌는 것 외에는
기능상 차이가 없어요. `#` 뒤쪽은 브라우저가 서버에 아예 요청을 보내지 않고 자체적으로
처리하는 부분이라, 그 페이지에서 새로고침해도 항상 `index.html`이 먼저 로드되고
React Router가 `#` 뒤의 경로를 읽어서 알아서 올바른 화면을 그려줘요.

> 참고: Vercel이나 Netlify처럼 서버 rewrite를 지원하는 곳에 올릴 계획이라면
> `BrowserRouter`로 되돌려도 무방해요 (그런 플랫폼은 이 문제가 아예 없어요).

## 배포 시 체크리스트

이번에 업로드해주신 파일에는 `package.json`/`public` 폴더가 포함되어 있지 않아서,
아래 항목은 실제 저장소에 이미 설정돼 있는지만 확인해주세요.

1. **`package.json`의 `homepage` 필드**
   ```json
   "homepage": "https://내깃허브아이디.github.io/저장소이름"
   ```
2. **배포 스크립트** (없다면 추가)
   ```bash
   npm install --save-dev gh-pages
   ```
   ```json
   "scripts": {
     "predeploy": "npm run build",
     "deploy": "gh-pages -d build"
   }
   ```
3. **배포 실행**
   ```bash
   npm run deploy
   ```
4. **저장소 Settings > Pages**에서 Source를 `gh-pages` 브랜치로 지정

## Firebase와의 관계

이번에 추가한 Firebase 협동 세션 기능(`MULTIPLAYER_SETUP.md` 참고)은 GitHub Pages 배포와
완전히 독립적이에요. Firebase 콘솔에 도메인을 등록하는 절차가 따로 필요하지 않으니,
`FIREBASE_CONFIG` 설정만 해두면 GitHub Pages든 다른 곳이든 바로 동작합니다.

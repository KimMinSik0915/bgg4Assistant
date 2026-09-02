import './App.css';
import { lazy, Suspense } from 'react';
import {BrowserRouter, Route, Routes} from "react-router-dom";
import Layout from "./assistan/layout/main/Layout";
import HomeScreen from "./assistan/homeScreen/main/homeScreen";

// 🚀 홈 화면(첫 진입점)만 즉시 로드하고, 나머지 화면은 실제로 그 경로에 들어갈 때만 코드를
// 내려받는다. 예전엔 App.js가 5개 화면을 전부 정적 import 해서, 방문자가 캐릭터 시트만 쓰려고
// 들어와도 임페리움/반지의 제왕 로직까지 초기 번들에 같이 실려왔다 — 특히 캐릭터 시트는 AI GM
// 채팅·전투지도까지 딸려 있어서 무겁고, iOS처럼 JS 파싱/실행이 느린 환경일수록 이 낭비가 로딩
// 체감 속도에 크게 티가 난다.
const ImperiumManager = lazy(() => import("./assistan/imperium/main/ImperiumManager"));
const LordOfRingsDuelManager = lazy(() => import("./assistan/RoRDuel/main/LordOfRingsDuelManager"));
const CharacterSheetManager = lazy(() => import("./assistan/characterSheet/main/CharacterSheetManager"));
const SettingsScreen = lazy(() => import("./assistan/settings/main/SettingsScreen"));

// 화면 코드가 아직 안 내려와서 잠깐 기다리는 동안 보여줄 아주 가벼운 자리표시자(레이아웃 배경과 톤을 맞춤)
const RouteLoading = () => (
    <div className="flex min-h-[60vh] items-center justify-center bg-slate-950">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-cyan-400/30 border-t-cyan-400"/>
    </div>
);

function App() {
    return (
        <BrowserRouter>
            <Layout>
                <Suspense fallback={<RouteLoading/>}>
                    <Routes>
                        <Route path={'/'} element={<HomeScreen/>} />
                        <Route path={'/imperium'} element={<ImperiumManager/>} />
                        <Route path={'/bandu'} element={<LordOfRingsDuelManager/> } />
                        <Route path={'/character-sheet'} element={<CharacterSheetManager/> } />
                        <Route path={'/settings'} element={<SettingsScreen/> } />
                    </Routes>
                </Suspense>
            </Layout>
        </BrowserRouter>
    );
}

export default App;

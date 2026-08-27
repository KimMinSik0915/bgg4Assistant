import './App.css';
import {BrowserRouter, Route, Routes} from "react-router-dom";
import HomeScreen from "./assistan/homeScreen/main/homeScreen";
import ImperiumManager from "./assistan/imperium/main/ImperiumManager";
import Layout from "./assistan/layout/main/Layout";
import LordOfRingsDuelManager from "./assistan/RoRDuel/main/LordOfRingsDuelManager";
import CharacterSheetManager from "./assistan/characterSheet/main/CharacterSheetManager";

function App() {
    return (
        <BrowserRouter>
            <Layout>
                <Routes>
                    <Route path={'/'} element={<HomeScreen/>} />
                    <Route path={'/imperium'} element={<ImperiumManager/>} />
                    <Route path={'/bandu'} element={<LordOfRingsDuelManager/> } />
                    <Route path={'/character-sheet'} element={<CharacterSheetManager/> } />
                </Routes>
            </Layout>
        </BrowserRouter>
    );
}

export default App;

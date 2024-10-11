import './App.css';
import {BrowserRouter, Route, Routes} from "react-router-dom";
import HomeScreen from "./assistan/homeScreen/main/homeScreen";
import GameSetup from "./assistan/imperium/main/gameSetup_tmp";

function App() {
  return (
      <BrowserRouter>
        <Routes>
            <Route path={"/"} element={<HomeScreen/>} />
            <Route path={"/imperium/"} element={<GameSetup/>} />
        </Routes>
      </BrowserRouter>
    /*<div className="App">
      <header className="App-header">
        <img src={logo} className="App-logo" alt="logo" />
        <p>
          Edit <code>src/App.js</code> and save to reload.
        </p>
        <a
          className="App-link"
          href="https://reactjs.org"
          target="_blank"
          rel="noopener noreferrer"
        >
          Learn React
        </a>
      </header>
    </div>*/
  );
}

export default App;

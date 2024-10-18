import GameStat from "../component/GameStatus";
import {Component} from "react";
import withNavigate from "../../utils/withNavigate";
import GameSetup from "../component/GameSetup";

class ImperiumManager extends Component {

    state = {
        gameStarted : false
      , players : []
    }

    constructor(props) {
        super(props);
    }

    handler = {
        startGame : (players) => {
            this.setState({
                gameStarted : true
              , players : players
            })
        }
      , returnToSetup : () => {
            this.setState({gameStarted : false});
        }
    }

    fnc = {

    }

    render() {
        if(this.state.gameStarted) {
            return <GameStat players={this.state.players} handler={this.handler} />
        }
        return <GameSetup startGame={this.handler.startGame} handler={this.handler} />
    }

}
export default withNavigate(ImperiumManager);
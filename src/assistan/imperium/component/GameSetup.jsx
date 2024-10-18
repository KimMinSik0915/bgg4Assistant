import {Component} from "react";
import WithNavigate from "../../utils/withNavigate";
import {Button, nations} from "../util/Util";
import {MinusCircle, PlusCircle} from "lucide-react";
import PlayerSetup from "./PlayerSetup";

class GameSetup extends Component {

    state = {
        players : [
            {name : '', isAI : false, selected : '', chaosActivated : false}
        ]
      , availableNations : nations
      , gameStarted : false
      , canCalculateSource : false
    }

    constructor(props) {
        super(props);
    }

    handler = {
        player : {
            updatePlayer : (updater) => {
                this.setState(prevState => ({
                    players : prevState.players.map(updater)
                }));
            }
          , addPlayer : () => {
                const playerNum = this.state.players.length;
                if(playerNum < 4) {
                    this.setState(prevState => ({
                        players: [...prevState.players, {name : '', isAI : false, selected : '', chaosActivated : false}]
                    }));
                } else {
                    alert('플레이 할 수 있는 최대 인원수가 초과되었습니다.');
                    return;
                }
            }
          , removePlayer : () => {
                const playerNum = this.state.players.length;
                if(playerNum > 1) {
                    this.setState(prevState => ({
                        players : prevState.players.slice(0, -1)
                    }));
                } else {
                    alert('플레이 할 수 있는 최소 인원은 1명입니다.');
                    return;
                }
            }
        }
      , nationUpdate : (prevProps, prevState) => {
            if(prevState.players !== this.state.players) {
                const selNations = this.state.players.map(p => p.selected).filter(Boolean);
                this.setState({
                    availableNations : nations.filter(n => !selNations.includes(n))
                })
            }
        }
    }

    fnc = {
        typeChange : (index) => {
            this.handler.player.updatePlayer((p, i)  => i === index ? {...p, isAI : !p.isAI} : p);
        }
      , nationChange : (index, nation) => {
            this.handler.player.updatePlayer((p, i) => i === index ? {...p, selected : nation} : p);
        }
      , nameChange : (index, name) => {
            this.handler.player.updatePlayer((p, i) => i === index ? {...p, name} : p);
        }
      , randomNation : (index) => {
            const availableNationCnt = this.state.availableNations.length;
            if(availableNationCnt > 0) {
                const randomNation = this.state.availableNations[Math.floor(Math.random() * availableNationCnt)];
                this.fnc.nationChange(index, randomNation);
            }
        }
      , startGame : () => {
            const initPlayers = this.state.players.map((p, index) => ({
                ...p
              , name : p.name || `플레이어 ${index + 1}`
              , resources : p.isAI ? { material : 0, population : 0, vp : 0} : {material : 3, population : 2, vp : 1}
              , chaosActivated : false
            }));
            this.props.startGame(initPlayers);
        }
    }


    render() {
        return(
            <>
                <div className="container mx-auto p-4" style={{backgroundColor: '#d9d9f2'}}>
                    <h1 className="text-xl sm:text-2xl font-bold mb-4 text-indigo-800">플레이어 Setup</h1>
                    <div className="flex items-center space-x-4 mb-4">
                        <Button onClick={this.handler.player.addPlayer} disabled={this.state.players.length >= 4} className="bg-green-400 text-white">
                            <PlusCircle size={24} />
                        </Button>
                        <Button onClick={this.handler.player.removePlayer} disabled={this.state.players.length <= 1} className="bg-red-400 text-white">
                            <MinusCircle size={24} />
                        </Button>
                        <span>플레이어 수: {this.state.players.length}</span>
                    </div>
                    {this.state.players.map((player, index) => (
                        <PlayerSetup
                            key={index}
                            index={index}
                            player={player}
                            onTypeChange={this.fnc.typeChange}
                            onNationChange={this.fnc.nationChange}
                            onRandomNation={this.fnc.randomNation}
                            onNameChange={this.fnc.nameChange}
                            availableNations={this.state.availableNations}
                        />
                    ))}
                    <Button
                        onClick={this.fnc.startGame}
                        disabled={this.state.players.some((p) => !p.selected)}
                        className="mt-4 w-full bg-indigo-500 text-white hover:bg-indigo-600"
                    >
                        게임 시작
                    </Button>
                </div>
            </>
        )
    }

}

export default WithNavigate(GameSetup);
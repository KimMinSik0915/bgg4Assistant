import {Component} from "react";
import WithNavigate from "../../utils/withNavigate";
import {Button, nations} from "../util/util";
import {MinusCircle, PlusCircle} from "lucide-react";
import PlayerSetup from "../component/playerSetup";

class GameSetup_tmp extends Component {

    state = {
        players : [
            {name : '', isAI : false, selected : '', chaosActivated : false}
        ]
      , avaliableNations : nations
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
      , rnadomNation : (index) => {
            const avaliealbeNationCnt = this.state.avaliableNations.length;
            if(avaliealbeNationCnt > 0) {
                const randomNation = this.state.avaliableNations[Math.floor(Math.random() * avaliealbeNationCnt)];
                this.fnc.nationChange(index, randomNation);
            }
        }
    }

    /*render() {
        return(
            <>
                <div className="container mx-auto p-4" style={{backgroundColor: '#d9d9f2'}}>
                    <h1 className="text-xl sm:text-2xl font-bold mb-4 text-indigo-800">임페리움:레전드 게임 설정</h1>
                    <div className="flex items-center space-x-4 mb-4">
                        <Button onClick={addPlayer} disabled={players.length >= 4} className="bg-green-400 text-white">
                            <PlusCircle size={24}/>
                        </Button>
                        <Button onClick={removePlayer} disabled={players.length <= 1} className="bg-red-400 text-white">
                            <MinusCircle size={24}/>
                        </Button>
                        <span>플레이어 수: {players.length}</span>
                    </div>
                    {players.map((player, index) => (
                        <PlayerSetup
                            key={index}
                            index={index}
                            player={player}
                            onTypeChange={handleTypeChange}
                            onNationChange={handleNationChange}
                            onRandomNation={handleRandomNation}
                            onNameChange={handleNameChange}
                            availableNations={availableNations}
                        />
                    ))}
                    <Button
                        onClick={startGame}
                        disabled={players.some((p) => !p.selected)}
                        className="mt-4 w-full bg-indigo-500 text-white hover:bg-indigo-600"
                    >
                        게임 시작
                    </Button>
                </div>
            </>
        )
    }*/

}

export default WithNavigate(GameSetup_tmp);
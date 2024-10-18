import {Component} from "react";
import PlayerGameState from "./PlayerGameStatus";
import {Button} from "../util/Util";
import withNavigate from "../../utils/withNavigate";
import GameSetup from "./GameSetup";

class GameStatus extends Component {

    state = {
        players : this.props.players
    }

    constructor(props) {
        super(props);
    }

    handler = {
        setting : (playerIndex, action) => {
            if(action === 'chaos') {
                this.setState(prevState => ({
                    players : prevState.players.map(player => ({
                        ...player
                        , chaosActivated : true
                        , resources : {
                            ...player.resources
                            , chaos : 0
                        }
                    }))
                }))
            } else {
                this.setState(prevState => ({
                    players : prevState.players.map((p, i) => {
                        if( i !== playerIndex ) return p;
                        return {...p, hasWonCondition : true}
                    })
                }))
            }
            this.setState({canCalculateScore : true});
        }
      , updateResources : (playerIndex, resource, newValue) => {
            this.setState(prevState => ({
                players : prevState.players.map((p, i) =>
                    i === playerIndex ? {
                        ...p
                      , resources : { ...p.resources, [resource] : newValue }
                    } : p
                )
            }));
        }
      , calculateScore : () => {
            console.log('move Calculate Score Screen');
        }
    }

    fnc = {

    }

    render() {
        return(
            <>
                <div className="container mx-auto p-4" style={{backgroundColor: '#d9d9f2'}}>
                    <h1
                        className="text-xl sm:text-2xl font-bold mb-4 text-indigo-800 cursor-pointer"
                        onClick={this.props.handler.returnToSetup}
                    >
                        임페리움:레전드
                    </h1>
                    {this.state.players.map((player, index) => (
                        <PlayerGameState
                            key={index}
                            player={player}
                            index={index}
                            onUpdateResources={this.handler.updateResources}
                            onSettingsAction={this.handler.setting}
                        />
                    ))}
                    <Button
                        onClick={this.calculateScore}
                        disabled={!this.state.canCalculateScore}
                        className={`mt-4 w-full ${this.state.canCalculateScore ? 'bg-green-500 hover:bg-green-600' : 'bg-gray-400'} text-white`}
                    >
                        점수 계산
                    </Button>
                </div>
            </>
        )
    }

}

export default withNavigate(GameStatus);
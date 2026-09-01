import {Component} from "react";
import PlayerGameState from "./PlayerGameStatus";
import {Button} from "../util/Util";
import withNavigate from "../../utils/withNavigate";
import GameSetup from "./GameSetup";
import {ArrowLeft, Swords, Trophy} from "lucide-react";

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
            <div className="relative bg-slate-950">
                <div className="pointer-events-none absolute inset-0 overflow-hidden">
                    <div className="absolute -top-32 left-1/4 h-96 w-96 rounded-full bg-cyan-500/10 blur-[120px]" />
                    <div className="absolute bottom-0 right-0 h-96 w-96 rounded-full bg-indigo-600/10 blur-[120px]" />
                </div>

                <div className="relative container mx-auto max-w-3xl px-4 py-8 sm:px-6 sm:py-12">
                    <button
                        onClick={this.props.handler.returnToSetup}
                        className="mb-6 flex items-center gap-1.5 text-sm text-slate-400 transition hover:text-cyan-300"
                    >
                        <ArrowLeft size={16}/> 설정으로
                    </button>

                    <div className="mb-8 flex items-center gap-3">
                        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-cyan-400/20 to-indigo-500/20 ring-1 ring-white/10">
                            <Swords className="h-5 w-5 text-cyan-300"/>
                        </div>
                        <div>
                            <p className="text-xs font-semibold uppercase tracking-widest text-cyan-400/70">게임 진행 중</p>
                            <h1 className="text-xl font-bold text-white sm:text-2xl">임페리움: 레전드</h1>
                        </div>
                    </div>

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
                        onClick={this.handler.calculateScore}
                        disabled={!this.state.canCalculateScore}
                        className={`mt-2 w-full gap-2 py-3.5 text-base shadow-lg ${
                            this.state.canCalculateScore
                                ? 'bg-gradient-to-r from-emerald-400 to-cyan-400 text-slate-950 shadow-emerald-500/20 hover:brightness-110'
                                : 'bg-white/10 text-slate-500'
                        }`}
                    >
                        <Trophy size={18}/> 점수 계산
                    </Button>
                </div>
            </div>
        )
    }

}

export default withNavigate(GameStatus);
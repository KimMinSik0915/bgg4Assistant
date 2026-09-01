import {Component} from "react";
import WithNavigate from "../../utils/withNavigate";
import {Button, nations} from "../util/Util";
import {MinusCircle, PlusCircle, Swords, ArrowLeft} from "lucide-react";
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
        const readyToStart = !this.state.players.some((p) => !p.selected);

        return(
            <div className="relative bg-slate-950">
                <div className="pointer-events-none absolute inset-0 overflow-hidden">
                    <div className="absolute -top-32 left-1/4 h-96 w-96 rounded-full bg-cyan-500/10 blur-[120px]" />
                    <div className="absolute bottom-0 right-0 h-96 w-96 rounded-full bg-indigo-600/10 blur-[120px]" />
                </div>

                <div className="relative container mx-auto max-w-3xl px-4 py-8 sm:px-6 sm:py-12">
                    <button
                        onClick={() => this.props.navigate('/')}
                        className="mb-6 flex items-center gap-1.5 text-sm text-slate-400 transition hover:text-cyan-300"
                    >
                        <ArrowLeft size={16}/> 홈으로
                    </button>

                    <div className="mb-8 flex items-center gap-3">
                        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-cyan-400/20 to-indigo-500/20 ring-1 ring-white/10">
                            <Swords className="h-5 w-5 text-cyan-300"/>
                        </div>
                        <div>
                            <p className="text-xs font-semibold uppercase tracking-widest text-cyan-400/70">임페리움: 레전드</p>
                            <h1 className="text-xl font-bold text-white sm:text-2xl">플레이어 설정</h1>
                        </div>
                    </div>

                    <div className="mb-5 flex items-center justify-between rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
                        <span className="text-sm font-medium text-slate-300">
                            플레이어 수 <span className="font-bold text-white">{this.state.players.length}</span> / 4
                        </span>
                        <div className="flex items-center gap-2">
                            <Button onClick={this.handler.player.removePlayer} disabled={this.state.players.length <= 1} className="bg-white/10 text-slate-200 hover:bg-white/15">
                                <MinusCircle size={18} />
                            </Button>
                            <Button onClick={this.handler.player.addPlayer} disabled={this.state.players.length >= 4} className="bg-cyan-400/15 text-cyan-300 hover:bg-cyan-400/25">
                                <PlusCircle size={18} />
                            </Button>
                        </div>
                    </div>

                    <div className="mb-6">
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
                    </div>

                    <Button
                        onClick={this.fnc.startGame}
                        disabled={!readyToStart}
                        className={`w-full py-3.5 text-base shadow-lg ${
                            readyToStart
                                ? 'bg-gradient-to-r from-cyan-400 to-indigo-400 text-slate-950 shadow-cyan-500/20 hover:brightness-110'
                                : 'bg-white/10 text-slate-500'
                        }`}
                    >
                        게임 시작
                    </Button>
                    {!readyToStart && (
                        <p className="mt-2 text-center text-xs text-slate-500">모든 플레이어의 국가를 선택해 주세요.</p>
                    )}
                </div>
            </div>
        )
    }

}

export default WithNavigate(GameSetup);
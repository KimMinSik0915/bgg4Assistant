import React, { Component } from 'react';
import { ArrowLeft, Shuffle, Sparkles } from 'lucide-react';

// 카드 뒷면 이미지 import
import cardBackImage from '../resource/img/actionCard/back/action_card_back.png';
import actionCard01 from '../resource/img/actionCard/front/action_card_01.png';
import actionCard02 from '../resource/img/actionCard/front/action_card_02.png';
import actionCard03 from '../resource/img/actionCard/front/action_card_03.png';
import actionCard04 from '../resource/img/actionCard/front/action_card_04.png';
import actionCard05 from '../resource/img/actionCard/front/action_card_05.png';
import actionCard06 from '../resource/img/actionCard/front/action_card_06.png';
import actionCard07 from '../resource/img/actionCard/front/action_card_07.png';
import actionCard08 from '../resource/img/actionCard/front/action_card_08.png';
import actionCard09 from '../resource/img/actionCard/front/action_card_09.png';
import actionCard10 from '../resource/img/actionCard/front/action_card_10.png';
import actionCard11 from '../resource/img/actionCard/front/action_card_11.png';
import actionCard12 from '../resource/img/actionCard/front/action_card_12.png';

import withNavigate from "../../utils/withNavigate";

// 카드 앞면 이미지들을 동적으로 import하기 위한 함수
function importAll(r) {
    return r.keys().map(r);
}

// 모든 카드 앞면 이미지를 가져옵니다
const cardFrontImages = importAll(require.context('../resource/img/actionCard/front', false, /\.(png|jpe?g|svg)$/));

class GameStatus extends Component {

    state = {
        actionCards : [
            { id : 1, fileName : 'action_card_01', imgPath : actionCard01 }
          , { id : 2, fileName : 'action_card_02', imgPath : actionCard02 }
          , { id : 3, fileName : 'action_card_03', imgPath : actionCard03 }
          , { id : 4, fileName : 'action_card_04', imgPath : actionCard04 }
          , { id : 5, fileName : 'action_card_05', imgPath : actionCard05 }
          , { id : 6, fileName : 'action_card_06', imgPath : actionCard06 }
          , { id : 7, fileName : 'action_card_07', imgPath : actionCard07 }
          , { id : 8, fileName : 'action_card_08', imgPath : actionCard08 }
          , { id : 9, fileName : 'action_card_09', imgPath : actionCard09 }
          , { id : 10, fileName : 'action_card_10', imgPath : actionCard10 }
          , { id : 11, fileName : 'action_card_11', imgPath : actionCard11 }
          , { id : 12, fileName : 'action_card_12', imgPath : actionCard12 }
        ]
      , currentDeck : []
      , currentCard : null
      , revealedCards : []
    };

    handler = {
        flipCard : () => {
            const { actionCards, revealedCards } = this.state;
            const remainingCards = actionCards.filter(card => !revealedCards.includes(card.id));

            if(remainingCards.length > 0) {
                const randomIdx = Math.floor(Math.random() * remainingCards.length);
                const selectedCard = remainingCards[randomIdx];
                this.setState((prevState) => ({
                    currentCard : selectedCard
                  , revealedCards: [...prevState.revealedCards, selectedCard.id]
                }))
            } else {
                this.fnc.resetDeck();
            }
        }
    }

    fnc = {
        resetDeck : () => {
            const shuffled = [...this.state.actionCards].sort(() => 0.5 - Math.random());
            this.setState({
                currentDeck: shuffled,
                currentCard: null,
                revealedCards: [],
            });
        }
    }


    render() {
        const { currentCard, revealedCards } = this.state;
        const { selectedCharacter } = this.props;
        const allCardsRevealed = revealedCards.length === this.state.actionCards.length;

        return (
            <div className="relative bg-slate-950">
                <div className="pointer-events-none absolute inset-0 overflow-hidden">
                    <div className="absolute -top-32 left-1/4 h-96 w-96 rounded-full bg-amber-500/10 blur-[120px]" />
                    <div className="absolute bottom-0 right-0 h-96 w-96 rounded-full bg-emerald-600/10 blur-[120px]" />
                </div>

                <div className="relative container mx-auto max-w-3xl px-4 py-8 sm:px-6 sm:py-12">
                    <button
                        onClick={() => this.props.navigate('/bandu')}
                        className="mb-6 flex items-center gap-1.5 text-sm text-slate-400 transition hover:text-cyan-300"
                    >
                        <ArrowLeft size={16}/> 캐릭터 선택으로
                    </button>

                    <div className="flex flex-col items-center gap-8 sm:flex-row sm:items-start sm:justify-center">
                        {/* 선택한 캐릭터 카드 */}
                        <div className="flex shrink-0 flex-col items-center">
                            <div className="relative h-56 w-40 overflow-hidden rounded-2xl border border-white/10 shadow-lg sm:h-72 sm:w-52">
                                <img
                                    src={selectedCharacter.image}
                                    alt={selectedCharacter.krName}
                                    className="h-full w-full object-cover"
                                />
                                <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
                                <p className="absolute inset-x-0 bottom-0 p-2 text-center text-sm font-bold text-white drop-shadow-md">{selectedCharacter.krName}</p>
                            </div>
                        </div>

                        {/* 카드 영역 */}
                        <div className="flex flex-col items-center gap-4">
                            <div className="flex items-center gap-2 text-xs text-slate-400">
                                <Sparkles size={14} className="text-amber-300"/>
                                공개된 카드 {revealedCards.length} / {this.state.actionCards.length}
                            </div>

                            <div className={`relative transition-opacity ${allCardsRevealed ? 'opacity-10' : ''}`}>
                                <img
                                    src={cardBackImage}
                                    alt="카드 뒷면"
                                    className="h-40 w-64 rounded-xl object-cover shadow-lg"
                                />
                                {allCardsRevealed && (
                                    <div className="absolute inset-0 rounded-xl border-4 border-rose-500"></div>
                                )}
                            </div>

                            <div>
                                {currentCard ? (
                                    <img
                                        src={currentCard.imgPath}
                                        alt={`카드 ${currentCard.id}`}
                                        className="h-40 w-64 rounded-xl object-cover shadow-lg shadow-amber-500/10 ring-1 ring-amber-400/30"
                                    />
                                ) : (
                                    <div className="flex h-40 w-64 items-center justify-center rounded-xl border border-dashed border-white/15 bg-white/[0.02] text-slate-500">
                                        <p className="text-center text-sm">카드를 선택해주세요</p>
                                    </div>
                                )}
                            </div>

                            {allCardsRevealed && (
                                <p className="text-xs font-medium text-rose-300">모든 카드가 공개되었어요. 다음을 누르면 덱이 다시 섞여요.</p>
                            )}
                        </div>
                    </div>

                    {/* 다음 버튼 */}
                    <div className="mt-10 text-center">
                        <button
                            onClick={this.handler.flipCard}
                            className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-amber-400 to-emerald-400 px-8 py-3 text-sm font-semibold text-slate-950 shadow-lg shadow-amber-500/20 transition-all duration-200 hover:brightness-110 active:scale-95 sm:text-base"
                        >
                            <Shuffle size={16}/> 다음 카드
                        </button>
                    </div>
                </div>
            </div>
        );
    }
}


export default withNavigate(GameStatus);
import React, { Component } from 'react';

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
            <div className="container mx-auto px-4 py-8">
                <div className="flex justify-center items-start space-x-8">
                    {/* 선택한 캐릭터 카드 */}
                    <div className="flex flex-col items-center">
                        <img
                            src={selectedCharacter.image}
                            alt={selectedCharacter.name}
                            className="w-50 h-80 object-cover rounded-lg mb-2"
                        />
                        <p className="text-center">{selectedCharacter.krName}</p>
                    </div>

                    {/* 카드 영역 - 세로 배치 */}
                    <div className="flex flex-col space-y-4">
                        {/* 카드 뒷면 이미지 */}
                        <div className={`relative ${allCardsRevealed ? 'opacity-10' : ''}`}>
                            <img
                                src={cardBackImage}
                                alt="Cards Back"
                                className="w-64 h-40 object-cover rounded-lg"
                            />
                            {allCardsRevealed && (
                                <div className="absolute inset-0 border-4 border-red-500 rounded-lg"></div>
                            )}
                        </div>

                        {/* 현재 선택된 카드 이미지 */}
                        <div>
                            {currentCard ? (
                                <img
                                    src={currentCard.imgPath}
                                    alt={`Card ${currentCard.id}`}
                                    className="w-64 h-40 object-cover rounded-lg"
                                />
                            ) : (
                                <div
                                    className="w-64 h-40 bg-gray-200 flex items-center justify-center text-gray-500 rounded-lg">
                                    <p className="text-center">카드를 선택해주세요</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* 다음 버튼 */}
                <div className="mt-8 text-center">
                    <button
                        onClick={this.handler.flipCard}
                        className="px-6 py-2 bg-blue-500 text-white rounded-full hover:bg-blue-600"
                    >
                        다음
                    </button>
                </div>
            </div>
        );
    }
}


export default withNavigate(GameStatus);
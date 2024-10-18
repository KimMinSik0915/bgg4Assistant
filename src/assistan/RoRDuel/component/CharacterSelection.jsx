import React, { Component } from 'react';

// 이미지 import
import elrondImg from '../resource/img/character/elrond.png';
import galadrielImg from '../resource/img/character/galadriel.png';
import gandalfImg from '../resource/img/character/gandlf.png';
import sarumanImg from '../resource/img/character/saruman.png';
import sauronImg from '../resource/img/character/sauron.png';
import smaugImg from '../resource/img/character/smaug.png';
import tomBomderialImg from '../resource/img/character/tom_bomderial.png';
import whitchKingImg from '../resource/img/character/whitch_king.png';
import withNavigate from "../../utils/withNavigate";

const characterList = [
    { krName : '엘론드', enName : 'elrond', image: elrondImg }
  , { krName : '갈라드리엘', enName : 'galadriel', image: galadrielImg}
  , { krName : '간달프', enName : 'gandlf', image: gandalfImg}
  , { krNmae : '사루만', enName : 'saruman', image: sarumanImg}
  , { krName : '사우론', enName : 'sauron', image: sauronImg}
  , { krName : '스마우그', enName : 'smaug', image: smaugImg}
  , { krName : '툼-붐드리엘', enName : 'tom-bomderial', image: tomBomderialImg}
  , { krName : '마술사 왕', enName: 'witch-king', image: whitchKingImg}
];

class CharacterSelection extends Component {

    state = {
        selectedCharacter: null,
    };

    constructor(props) {
        super(props);
    }

    handler = {

    }


    render() {
        const { selectedCharacter } = this.state;

        return (
            <div className="container mx-auto px-4 py-8">
                <h1 className="text-2xl font-bold text-center mb-6">반지의 제왕 - 가운데땅에서의 대결</h1>
                <h2 className="text-xl text-center mb-4">캐릭터를 선택하세요</h2>
                <div className="grid grid-cols-3 gap-2 sm:gap-4 max-w-3xl mx-auto">
                    {characterList.map((character) => (
                        <div
                            key={character.krName !== '' ? character.krName : character.enName}
                            className={`cursor-pointer border-4 rounded-lg overflow-hidden ${
                                this.props.selectedCharacter && this.props.selectedCharacter.krName === character.krName
                                    ? 'border-blue-500'
                                    : 'border-transparent'
                            }`}
                            onClick={() => this.props.handler.characterSelect(character)}
                        >
                            <div className="bg-gray-800 relative pb-[100%]">
                                <img
                                    src={character.image}
                                    alt={character.krName !== '' ? character.krName : character.enName}
                                    className="absolute top-0 left-0 w-full h-full object-contain"
                                />
                            </div>
                            <div className="bg-gray-800 text-white p-1 sm:p-2">
                                <p className="text-center text-xs sm:text-sm">{character.krName !== '' ? character.krName : character.enName}</p>
                            </div>
                        </div>
                    ))}
                </div>
                <div className="mt-8 text-center">
                    <button
                        onClick={this.props.handler.gameStart}
                        className={`px-6 py-2 rounded-full text-white ${
                            this.props.selectedCharacter ? 'bg-green-500 hover:bg-green-600' : 'bg-gray-400 cursor-not-allowed'
                        }`}
                        disabled={!this.props.selectedCharacter}
                    >
                        게임 시작
                    </button>
                </div>
            </div>
        );
    }
}

export default withNavigate(CharacterSelection);
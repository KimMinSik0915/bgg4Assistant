import React, { Component } from 'react';
import { ArrowLeft, Swords, Check } from 'lucide-react';

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
        const { selectedCharacter } = this.props;

        return (
            <div className="relative bg-slate-950">
                <div className="pointer-events-none absolute inset-0 overflow-hidden">
                    <div className="absolute -top-32 left-1/4 h-96 w-96 rounded-full bg-amber-500/10 blur-[120px]" />
                    <div className="absolute bottom-0 right-0 h-96 w-96 rounded-full bg-emerald-600/10 blur-[120px]" />
                </div>

                <div className="relative container mx-auto max-w-4xl px-4 py-8 sm:px-6 sm:py-12">
                    <button
                        onClick={() => this.props.navigate('/')}
                        className="mb-6 flex items-center gap-1.5 text-sm text-slate-400 transition hover:text-cyan-300"
                    >
                        <ArrowLeft size={16}/> 홈으로
                    </button>

                    <div className="mb-8 flex items-center gap-3">
                        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-400/20 to-emerald-500/20 ring-1 ring-white/10">
                            <Swords className="h-5 w-5 text-amber-300"/>
                        </div>
                        <div>
                            <p className="text-xs font-semibold uppercase tracking-widest text-amber-400/70">반지의 제왕: 가운데땅에서의 대결</p>
                            <h1 className="text-xl font-bold text-white sm:text-2xl">캐릭터를 선택하세요</h1>
                        </div>
                    </div>

                    <div className="mx-auto grid max-w-3xl grid-cols-3 gap-3 sm:gap-4">
                        {characterList.map((character) => {
                            const isSelected = selectedCharacter && selectedCharacter.krName === character.krName;
                            return (
                                <button
                                    key={character.krName || character.enName}
                                    onClick={() => this.props.handler.characterSelect(character)}
                                    className={`group relative aspect-square overflow-hidden rounded-2xl border bg-slate-900/60 shadow-lg transition-all duration-300 hover:-translate-y-1 hover:shadow-xl ${
                                        isSelected
                                            ? 'border-amber-400/70 ring-2 ring-amber-400/50'
                                            : 'border-white/10 hover:border-white/25'
                                    }`}
                                >
                                    <img
                                        src={character.image}
                                        alt={character.krName || character.enName}
                                        className={`absolute inset-0 h-full w-full object-cover transition-transform duration-500 group-hover:scale-110 ${isSelected ? '' : 'grayscale-[35%]'}`}
                                    />
                                    <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/90 via-black/10 to-transparent" />
                                    {isSelected && (
                                        <span className="absolute right-1.5 top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-amber-400 text-slate-950">
                                            <Check size={13} strokeWidth={3}/>
                                        </span>
                                    )}
                                    <span className="absolute inset-x-0 bottom-0 p-1.5 text-center text-[10px] font-semibold leading-tight text-white drop-shadow-md sm:p-2 sm:text-xs">
                                        {character.krName || character.enName}
                                    </span>
                                </button>
                            );
                        })}
                    </div>

                    <div className="mt-8 text-center">
                        <button
                            onClick={this.props.handler.gameStart}
                            disabled={!selectedCharacter}
                            className={`rounded-full px-8 py-3 text-sm font-semibold transition-all duration-200 active:scale-95 sm:text-base ${
                                selectedCharacter
                                    ? 'bg-gradient-to-r from-amber-400 to-emerald-400 text-slate-950 shadow-lg shadow-amber-500/20 hover:brightness-110'
                                    : 'cursor-not-allowed bg-white/10 text-slate-500'
                            }`}
                        >
                            게임 시작
                        </button>
                    </div>
                </div>
            </div>
        );
    }
}

export default withNavigate(CharacterSelection);
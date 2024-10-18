import React, { Component } from 'react';
import withNavigate from "../../utils/withNavigate";
import CharacterSelection from "../component/CharacterSelection";
import GameStatus from "../../RoRDuel/component/GameStatus";

class LordOfRingsDuelManager extends Component {

    state = {
        gameStarted: false,
        selectedCharacter: null,
    };

    handler = {
        characterSelect : (character) => {
            console.log('character : ', character);
            this.setState({
                selectedCharacter : character
            })
        }
      , gameStart : () => {
            this.setState({
                gameStarted : true
            })
        }
    }

    render() {
        const { gameStarted, selectedCharacter } = this.state;

        if (!gameStarted) {
            return (
                <CharacterSelection
                    handler={this.handler}
                    onGameStart={this.handler.gameStart}
                    selectedCharacter={selectedCharacter}
                />
            );
        }

        return <GameStatus selectedCharacter={selectedCharacter} />;
    }
}

export default withNavigate(LordOfRingsDuelManager);
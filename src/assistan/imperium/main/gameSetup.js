import React, { useState, useEffect } from 'react';
import { PlusCircle, MinusCircle, Shuffle, ArrowRightCircle, Settings, Crown } from 'lucide-react';
import PlayerGameState from "../component/gameStatus";
import {Button, nations} from "../util/util";
import PlayerSetup from "../component/playerSetup";

const GameSetup = () => {
    const [players, setPlayers] = useState([{ name: '', isAI: false, selected: '', chaosActivated: false }]);
    const [availableNations, setAvailableNations] = useState(nations);
    const [gameStarted, setGameStarted] = useState(false);
    const [canCalculateScore, setCanCalculateScore] = useState(false);

    useEffect(() => {
        const selectedNations = players.map(p => p.selected).filter(Boolean);
        setAvailableNations(nations.filter(n => !selectedNations.includes(n)));
    }, [players]);

    const updatePlayers = (updater) => setPlayers(prevPlayers => prevPlayers.map(updater));

    const addPlayer = () => players.length < 4 && setPlayers([...players, { name: '', isAI: false, selected: '', chaosActivated: false }]);
    const removePlayer = () => players.length > 1 && setPlayers(players.slice(0, -1));
    const handleTypeChange = (index) => updatePlayers((p, i) => i === index ? { ...p, isAI: !p.isAI } : p);
    const handleNationChange = (index, nation) => updatePlayers((p, i) => i === index ? { ...p, selected: nation } : p);
    const handleNameChange = (index, name) => updatePlayers((p, i) => i === index ? { ...p, name } : p);
    const handleRandomNation = (index) => {
        if (availableNations.length > 0) {
            const randomNation = availableNations[Math.floor(Math.random() * availableNations.length)];
            handleNationChange(index, randomNation);
        }
    };

    const startGame = () => {
        updatePlayers(p => ({
            ...p,
            name: p.name || `플레이어 ${players.indexOf(p) + 1}`,
            resources: p.isAI
                ? { material: 0, population: 0, victoryPoints: 0 }
                : { material: 3, population: 2, victoryPoints: 1 },
            chaosActivated: false
        }));
        setGameStarted(true);
    };

    const handleSettingsAction = (playerIndex, action) => {
        if (action === 'chaos') {
            setPlayers(prevPlayers => prevPlayers.map(player => ({
                ...player,
                chaosActivated: true,
                resources: {
                    ...player.resources,
                    chaos: 0
                }
            })));
        } else {
            updatePlayers((p, i) => {
                if (i !== playerIndex) return p;
                let updatedPlayer = { ...p };
                updatedPlayer.hasWonCondition = true;
                return updatedPlayer;
            });
        }
        setCanCalculateScore(true);
    };

    const handleUpdateResources = (playerIndex, resource, newValue) => {
        updatePlayers((p, i) => i === playerIndex ? { ...p, resources: { ...p.resources, [resource]: newValue } } : p);
    };

    const calculateScore = () => console.log("점수 계산");

    if (gameStarted) {
        return (
            <div className="container mx-auto p-4" style={{backgroundColor: '#d9d9f2'}}>
                <h1 className="text-xl sm:text-2xl font-bold mb-4 text-indigo-800">임페리움:레전드 게임 상태</h1>
                {players.map((player, index) => (
                    <PlayerGameState
                        key={index}
                        player={player}
                        index={index}
                        onUpdateResources={handleUpdateResources}
                        onSettingsAction={handleSettingsAction}
                    />
                ))}
                <Button
                    onClick={calculateScore}
                    disabled={!canCalculateScore}
                    className={`mt-4 w-full ${canCalculateScore ? 'bg-green-500 hover:bg-green-600' : 'bg-gray-400'} text-white`}
                >
                    점수 계산
                </Button>
            </div>
        );
    }

    return (
        <div className="container mx-auto p-4" style={{backgroundColor: '#d9d9f2'}}>
            <h1 className="text-xl sm:text-2xl font-bold mb-4 text-indigo-800">임페리움:레전드 게임 설정</h1>
            <div className="flex items-center space-x-4 mb-4">
                <Button onClick={addPlayer} disabled={players.length >= 4} className="bg-green-400 text-white">
                    <PlusCircle size={24} />
                </Button>
                <Button onClick={removePlayer} disabled={players.length <= 1} className="bg-red-400 text-white">
                    <MinusCircle size={24} />
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
    );
};

export default GameSetup;
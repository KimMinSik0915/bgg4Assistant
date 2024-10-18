import React from 'react';
import { Shuffle } from 'lucide-react';
import {Button} from "../util/Util";

const PlayerSetup = ({ index, player, onTypeChange, onNationChange, onRandomNation, onNameChange, availableNations }) => (
    <div className="flex flex-col sm:flex-row items-start sm:items-center space-y-2 sm:space-y-0 sm:space-x-4 mb-4 p-4 border rounded-lg bg-white">
        <input
            type="text"
            value={player.name}
            onChange={(e) => onNameChange(index, e.target.value)}
            placeholder={`플레이어 ${index + 1}`}
            className="p-2 border rounded w-full sm:w-auto"
        />
        <label className="flex items-center">
            <input type="checkbox" checked={player.isAI} onChange={() => onTypeChange(index)} className="mr-2" />
            AI
        </label>
        <select
            value={player.selected || ''}
            onChange={(e) => onNationChange(index, e.target.value)}
            className="p-2 border rounded w-full sm:w-auto"
        >
            <option value="">국가 선택</option>
            {[...availableNations, player.selected].filter(Boolean).map((n) => (
                <option key={n} value={n}>{n}</option>
            ))}
        </select>
        <Button onClick={() => onRandomNation(index)} className="bg-indigo-500 text-white w-full sm:w-auto">
            <Shuffle size={20} className="inline mr-2" /> 랜덤
        </Button>
    </div>
);

export default PlayerSetup;
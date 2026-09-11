import React from 'react';
import { Shuffle, Bot, User } from 'lucide-react';
import {Button} from "../util/Util";

const PlayerSetup = ({ index, player, onTypeChange, onNationChange, onRandomNation, onNameChange, availableNations }) => (
    <div className="mb-3 flex flex-col gap-3 rounded-2xl border border-white/10 bg-[#170a2e]/60 p-4 shadow-lg sm:flex-row sm:items-center">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-purple-400/15 text-sm font-bold text-purple-300">
            {index + 1}
        </div>

        <input
            type="text"
            value={player.name}
            onChange={(e) => onNameChange(index, e.target.value)}
            placeholder={`플레이어 ${index + 1}`}
            className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder:text-slate-500 focus:border-purple-400/50 focus:outline-none focus:ring-1 focus:ring-purple-400/50 sm:w-40"
        />

        <button
            type="button"
            onClick={() => onTypeChange(index)}
            className={`flex shrink-0 items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold transition sm:text-sm ${
                player.isAI
                    ? 'bg-violet-400/20 text-violet-300 ring-1 ring-violet-400/40'
                    : 'bg-white/5 text-slate-400 ring-1 ring-white/10 hover:text-slate-200'
            }`}
        >
            {player.isAI ? <Bot size={16}/> : <User size={16}/>}
            {player.isAI ? 'AI' : '플레이어'}
        </button>

        <select
            value={player.selected || ''}
            onChange={(e) => onNationChange(index, e.target.value)}
            className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white focus:border-purple-400/50 focus:outline-none focus:ring-1 focus:ring-purple-400/50 sm:w-auto sm:flex-1"
        >
            <option className="bg-[#170a2e]" value="">국가 선택</option>
            {[...availableNations, player.selected].filter(Boolean).map((n) => (
                <option className="bg-[#170a2e]" key={n} value={n}>{n}</option>
            ))}
        </select>

        <Button onClick={() => onRandomNation(index)} className="w-full shrink-0 bg-purple-400/15 text-purple-300 hover:bg-purple-400/25 sm:w-auto">
            <Shuffle size={16}/> 랜덤
        </Button>
    </div>
);

export default PlayerSetup;

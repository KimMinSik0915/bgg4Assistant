import React, { useState } from 'react';
import { Settings, Crown, Bot, User } from 'lucide-react';
import {Button} from "../util/Util";
import Popup from "../popup/popup";
import ResourceControl from "./ResourceController";

const PlayerGameState = ({ player, index, onUpdateResources, onSettingsAction }) => {
    const [isSettingsOpen, setIsSettingsOpen] = useState(false);
    const [alert, setAlert] = useState(null);

    const handleConvert = (resource) => {
        if (player.resources[resource] >= 5) {
            onUpdateResources(index, resource, player.resources[resource] - 5);
            onUpdateResources(index, 'victoryPoints', player.resources.victoryPoints + 1);
        } else {
            setAlert(`현재 ${player.resources[resource]}개가 있습니다.\n5개마다 1개의 승점으로 변환이 가능합니다.`);
        }
    };

    const handleSettingsAction = (action) => {
        onSettingsAction(index, action);
        setIsSettingsOpen(false);
    };

    return (
        <div className={`mb-4 rounded-2xl border p-4 shadow-lg transition-colors ${
            player.hasWonCondition
                ? 'border-amber-400/40 bg-amber-400/[0.06]'
                : 'border-white/10 bg-slate-900/60'
        }`}>
            <div className="mb-3 flex items-center justify-between gap-2">
                <div className="flex min-w-0 items-center gap-2">
                    <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${player.isAI ? 'bg-indigo-400/15 text-indigo-300' : 'bg-cyan-400/15 text-cyan-300'}`}>
                        {player.isAI ? <Bot size={18}/> : <User size={18}/>}
                    </div>
                    <div className="min-w-0">
                        <h3 className="flex items-center gap-1.5 truncate text-sm font-bold text-white sm:text-base">
                            {player.name || `플레이어 ${index + 1}`}
                            {player.hasWonCondition && <Crown className="shrink-0 text-amber-400" size={16} />}
                        </h3>
                        <p className="truncate text-xs text-slate-400">{player.selected}</p>
                    </div>
                </div>
                <button
                    onClick={() => setIsSettingsOpen(true)}
                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/5 text-slate-400 transition hover:bg-white/10 hover:text-white"
                    aria-label="게임 설정"
                >
                    <Settings size={18} />
                </button>
            </div>

            {['material', 'population', 'victoryPoints'].map(resource => (
                <ResourceControl
                    key={resource}
                    label={
                        resource === 'victoryPoints' ? '승점' :
                            resource === 'material' ? '물질' :
                                '인구'
                    }
                    value={player.resources[resource] || 0}
                    onIncrement={() => onUpdateResources(index, resource, (player.resources[resource] || 0) + 1)}
                    onDecrement={() => onUpdateResources(index, resource, Math.max(0, (player.resources[resource] || 0) - 1))}
                    onConvert={resource !== 'victoryPoints' ? () => handleConvert(resource) : null}
                />
            ))}
            {player.chaosActivated && (
                <ResourceControl
                    label="혼란"
                    value={player.resources.chaos || 0}
                    onIncrement={() => onUpdateResources(index, 'chaos', (player.resources.chaos || 0) + 1)}
                    onDecrement={() => onUpdateResources(index, 'chaos', Math.max(0, (player.resources.chaos || 0) - 1))}
                />
            )}

            <Popup isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} title="게임 설정">
                <div className="space-y-2">
                    <Button onClick={() => handleSettingsAction('integrationDeck')} className="w-full bg-white/5 text-slate-200 hover:bg-white/10">
                        통합 덱 소진
                    </Button>
                    <Button onClick={() => handleSettingsAction('allDevelopments')} className="w-full bg-white/5 text-slate-200 hover:bg-white/10">
                        모든 개발 카드 개발 완료
                    </Button>
                    <Button onClick={() => handleSettingsAction('kingOfKings')} className="w-full bg-white/5 text-slate-200 hover:bg-white/10">
                        왕 중 왕 효과 처리
                    </Button>
                    {player.selected === '유토피아' && (
                        <Button onClick={() => handleSettingsAction('utopia')} className="w-full bg-white/5 text-slate-200 hover:bg-white/10">
                            유토피아 효과 처리
                        </Button>
                    )}
                    {player.selected === '아서왕' && (
                        <Button onClick={() => handleSettingsAction('holyCup')} className="w-full bg-white/5 text-slate-200 hover:bg-white/10">
                            성배 효과 처리
                        </Button>
                    )}
                    <Button onClick={() => handleSettingsAction('chaos')} className="w-full bg-rose-500/15 text-rose-300 hover:bg-rose-500/25">
                        혼란 더미 소진
                    </Button>
                </div>
            </Popup>
            {alert && <Popup isOpen={true} onClose={() => setAlert(null)} title="알림"><p className="whitespace-pre-line text-sm text-slate-300">{alert}</p></Popup>}
        </div>
    );
};

export default PlayerGameState;

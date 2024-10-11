import React, { useState } from 'react';
import { Settings, Crown } from 'lucide-react';
import {Button} from "../util/util";
import Popup from "../popup/popup";
import ResourceControl from "./resourceController";

const PlayerGameState = ({ player, index, onUpdateResources, onSettingsAction }) => {
    const [isPopupOpen, setIsPopupOpen] = useState(false);
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
        <div className="border rounded-lg p-4 mb-4 bg-white">
            <div className="flex justify-between items-center mb-2">
                <h3 className="text-base sm:text-lg font-bold">
                    {player.name || `플레이어 ${index + 1}`} ({player.isAI ? 'AI' : '플레이어'}) - {player.selected}
                    {player.hasWonCondition && <Crown className="inline-block ml-2" size={20} />}
                </h3>
                <Button onClick={() => setIsSettingsOpen(true)} className="bg-gray-200"><Settings size={20} /></Button>
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
            <Popup isOpen={isPopupOpen} onClose={() => setIsPopupOpen(false)} title="승점 변환">
                {/* ConversionPopup content */}
            </Popup>
            <Popup isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} title="게임 설정">
                <div className="space-y-4">
                    <Button onClick={() => handleSettingsAction('integrationDeck')} className="w-full bg-indigo-500 text-white">
                        통합 덱 소진
                    </Button>
                    <Button onClick={() => handleSettingsAction('allDevelopments')} className="w-full bg-indigo-500 text-white">
                        모든 개발 카드 개발 완료
                    </Button>
                    <Button onClick={() => handleSettingsAction('kingOfKings')} className="w-full bg-indigo-500 text-white">
                        왕 중 왕 효과 처리
                    </Button>
                    {player.selected === '유토피아' && (
                        <Button onClick={() => handleSettingsAction('utopia')} className="w-full bg-indigo-500 text-white">
                            유토피아 효과 처리
                        </Button>
                    )}
                    {player.selected === '아서왕' && (
                        <Button onClick={() => handleSettingsAction('holyCup')} className="w-full bg-indigo-500 text-white">
                            성배 효과 처리
                        </Button>
                    )}
                    <Button onClick={() => handleSettingsAction('chaos')} className="w-full bg-red-500 text-white">
                        혼란 더미 소진
                    </Button>
                </div>
            </Popup>
            {alert && <Popup isOpen={true} onClose={() => setAlert(null)} title="알림">{alert}</Popup>}
        </div>
    );
};

export default PlayerGameState;
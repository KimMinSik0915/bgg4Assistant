/**
 * MovePanel : 무브 레퍼런스 + 주사위 판정 통합
 */
import { useState } from 'react';
import { MOVES, MOVE_CATEGORIES, STATS, PROGRESS_BOXES, TICKS_PER_BOX } from '../resource/dataSet/gameData';
import {
    DICE_BOX_SELECTOR, rollPhysicalDiceGroup,
    beginDiceCycle, announceDiceResult
} from '../../characterSheet/service/dice3DEngine';

const RESULT_COLORS = { strong: '#34d399', weak: '#fbbf24', miss: '#f87171' };

const judgeResult = (actionScore, challenge1, challenge2) => {
    const beats1 = actionScore > challenge1;
    const beats2 = actionScore > challenge2;
    const isMatch = challenge1 === challenge2;
    if (beats1 && beats2) return { type: 'strong', label: '강한 성공!', match: isMatch };
    if (beats1 || beats2) return { type: 'weak', label: '약한 성공', match: isMatch };
    return { type: 'miss', label: '실패...', match: isMatch };
};

const MovePanel = ({ char, onRollResult }) => {
    const [selectedCat, setSelectedCat] = useState('adventure');
    const [expandedMove, setExpandedMove] = useState(null);
    const [rollResult, setRollResult] = useState(null);
    const [isRolling, setIsRolling] = useState(false);

    const filteredMoves = MOVES.filter(m => m.cat === selectedCat);

    const doActionRoll = async (statKey, bonus = 0) => {
        if (isRolling) return;
        setIsRolling(true);

        const statValue = char[statKey] || 0;
        let actionDie, challenge1, challenge2;

        beginDiceCycle();
        try {
            const results = await rollPhysicalDiceGroup(DICE_BOX_SELECTOR, [
                { sides: 6, qty: 1 }, { sides: 10, qty: 2 }
            ]);
            if (results) {
                actionDie = results[0].value;
                challenge1 = results[1].value;
                challenge2 = results[2].value;
            }
        } catch { /* fallback below */ }

        if (actionDie == null) {
            actionDie = Math.floor(Math.random() * 6) + 1;
            challenge1 = Math.floor(Math.random() * 10) + 1;
            challenge2 = Math.floor(Math.random() * 10) + 1;
        }

        const actionScore = actionDie + statValue + bonus;
        const result = judgeResult(actionScore, challenge1, challenge2);

        const rollData = {
            actionDie, statKey, statValue, bonus, actionScore
          , challenge1, challenge2
          , ...result
        };

        setRollResult(rollData);

        announceDiceResult({
            dice: [
                { sides: 6, value: actionDie }
              , { sides: 10, value: challenge1 }
              , { sides: 10, value: challenge2 }
            ]
          , total: actionScore
          , label: `${STATS.find(s => s.key === statKey)?.label || statKey} +${statValue}`
        });

        if (onRollResult) onRollResult(rollData);
        setIsRolling(false);
    };

    const doProgressRoll = async (progressScore) => {
        if (isRolling) return;
        setIsRolling(true);

        let challenge1, challenge2;

        beginDiceCycle();
        try {
            const results = await rollPhysicalDiceGroup(DICE_BOX_SELECTOR, [
                { sides: 10, qty: 2 }
            ]);
            if (results) {
                challenge1 = results[0].value;
                challenge2 = results[1].value;
            }
        } catch { /* fallback below */ }

        if (challenge1 == null) {
            challenge1 = Math.floor(Math.random() * 10) + 1;
            challenge2 = Math.floor(Math.random() * 10) + 1;
        }

        const result = judgeResult(progressScore, challenge1, challenge2);
        const rollData = {
            actionDie: null, statKey: 'progress', statValue: progressScore
          , bonus: 0, actionScore: progressScore
          , challenge1, challenge2
          , ...result
        };

        setRollResult(rollData);

        announceDiceResult({
            dice: [{ sides: 10, value: challenge1 }, { sides: 10, value: challenge2 }]
          , total: progressScore
          , label: `진행도 판정 (${progressScore})`
        });

        if (onRollResult) onRollResult(rollData);
        setIsRolling(false);
    };

    return (
        <div className="flex flex-col gap-3 is-fade-in">
            {/* 카테고리 탭 */}
            <div className="flex gap-1 flex-wrap">
                {MOVE_CATEGORIES.map(c => (
                    <button
                        key={c.key}
                        onClick={() => { setSelectedCat(c.key); setExpandedMove(null); setRollResult(null); }}
                        className="text-xs px-2.5 py-1 rounded-full font-bold transition-all"
                        style={{
                            backgroundColor: selectedCat === c.key ? 'rgba(217,119,6,0.3)' : 'var(--tag-bg)'
                          , color: selectedCat === c.key ? '#d97706' : 'var(--text-muted)'
                          , border: selectedCat === c.key ? '1px solid #d97706' : '1px solid transparent'
                        }}
                    >{c.label}</button>
                ))}
            </div>

            {/* 무브 카드 목록 */}
            <div className="flex flex-col gap-2 is-scroll overflow-y-auto" style={{ maxHeight: '60vh' }}>
                {filteredMoves.map(m => {
                    const isExpanded = expandedMove === m.id;
                    return (
                        <div
                            key={m.id}
                            className="is-move-card p-3 rounded-xl border"
                            style={{ borderColor: isExpanded ? '#d97706' : 'var(--border-color)', backgroundColor: 'var(--card-bg)' }}
                        >
                            <div
                                className="flex justify-between items-center cursor-pointer"
                                onClick={() => { setExpandedMove(isExpanded ? null : m.id); setRollResult(null); }}
                            >
                                <div>
                                    <span className="text-sm font-bold" style={{ color: 'var(--text-main)' }}>{m.name}</span>
                                    <span className="text-[0.6rem] ml-1.5" style={{ color: 'var(--text-muted)' }}>{m.nameEn}</span>
                                </div>
                                <span className="text-xs" style={{ color: 'var(--text-muted)' }}>{isExpanded ? '▲' : '▼'}</span>
                            </div>

                            {isExpanded && (
                                <div className="mt-2 pt-2 border-t is-fade-in" style={{ borderColor: 'var(--border-color)' }}>
                                    <p className="text-xs mb-3 leading-relaxed" style={{ color: 'var(--text-muted)' }}>{m.desc}</p>

                                    {/* 액션 롤 버튼 */}
                                    {m.stat === 'choice' && (
                                        <div className="flex flex-col gap-1.5">
                                            <span className="text-[0.6rem] font-bold" style={{ color: 'var(--text-muted)' }}>스탯 선택 후 판정:</span>
                                            <div className="flex gap-1.5 flex-wrap">
                                                {STATS.map(s => (
                                                    <button
                                                        key={s.key}
                                                        onClick={() => doActionRoll(s.key)}
                                                        disabled={isRolling}
                                                        className="text-xs px-2.5 py-1.5 rounded font-bold disabled:opacity-40"
                                                        style={{ backgroundColor: 'rgba(217,119,6,0.15)', color: '#d97706' }}
                                                    >{s.label} ({char[s.key]})</button>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {m.stat && m.stat !== 'choice' && m.stat !== 'none' && m.stat !== 'progress' && !m.stat.includes('_or_') && (
                                        <button
                                            onClick={() => doActionRoll(m.stat)}
                                            disabled={isRolling}
                                            className="text-xs px-3 py-1.5 rounded font-bold disabled:opacity-40"
                                            style={{ backgroundColor: 'rgba(217,119,6,0.15)', color: '#d97706' }}
                                        >
                                            {STATS.find(s => s.key === m.stat)?.label || m.stat} ({char[m.stat] || 0})으로 판정
                                        </button>
                                    )}

                                    {m.stat && m.stat.includes('_or_') && (
                                        <div className="flex gap-1.5 flex-wrap">
                                            {m.stat.split('_or_').map(sk => {
                                                const stat = STATS.find(s => s.key === sk);
                                                return stat ? (
                                                    <button
                                                        key={sk}
                                                        onClick={() => doActionRoll(sk)}
                                                        disabled={isRolling}
                                                        className="text-xs px-2.5 py-1.5 rounded font-bold disabled:opacity-40"
                                                        style={{ backgroundColor: 'rgba(217,119,6,0.15)', color: '#d97706' }}
                                                    >{stat.label} ({char[sk]})로 판정</button>
                                                ) : null;
                                            })}
                                        </div>
                                    )}

                                    {m.stat === 'supply' && (
                                        <button
                                            onClick={() => doActionRoll('supply')}
                                            disabled={isRolling}
                                            className="text-xs px-3 py-1.5 rounded font-bold disabled:opacity-40"
                                            style={{ backgroundColor: 'rgba(217,119,6,0.15)', color: '#d97706' }}
                                        >보급({char.supply})으로 판정</button>
                                    )}

                                    {m.stat === 'progress' && (
                                        <div className="flex flex-col gap-1">
                                            <span className="text-[0.6rem]" style={{ color: 'var(--text-muted)' }}>
                                                진행도 점수를 선택하세요 (해당 진행도 트랙의 채워진 칸 수):
                                            </span>
                                            <div className="flex gap-1 flex-wrap">
                                                {Array.from({ length: 11 }, (_, i) => (
                                                    <button
                                                        key={i}
                                                        onClick={() => doProgressRoll(i)}
                                                        disabled={isRolling}
                                                        className="w-7 h-7 text-xs rounded font-bold disabled:opacity-40"
                                                        style={{ backgroundColor: 'rgba(217,119,6,0.15)', color: '#d97706' }}
                                                    >{i}</button>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {/* 판정 결과 */}
                                    {rollResult && expandedMove === m.id && (
                                        <div className="mt-3 p-2.5 rounded-lg is-dice-result" style={{ backgroundColor: 'rgba(0,0,0,0.3)' }}>
                                            <div className="flex items-center gap-3 mb-1">
                                                {rollResult.actionDie != null && (
                                                    <div className="text-center">
                                                        <div className="text-[0.55rem]" style={{ color: 'var(--text-muted)' }}>액션</div>
                                                        <div className="text-lg font-black" style={{ color: '#818cf8' }}>{rollResult.actionDie}</div>
                                                    </div>
                                                )}
                                                {rollResult.actionDie != null && (
                                                    <div className="text-xs" style={{ color: 'var(--text-muted)' }}>
                                                        +{rollResult.statValue} = <strong style={{ color: '#818cf8' }}>{rollResult.actionScore}</strong>
                                                    </div>
                                                )}
                                                <div className="text-xs" style={{ color: 'var(--text-muted)' }}>vs</div>
                                                <div className="text-center">
                                                    <div className="text-[0.55rem]" style={{ color: 'var(--text-muted)' }}>도전1</div>
                                                    <div className="text-lg font-black" style={{
                                                        color: rollResult.actionScore > rollResult.challenge1 ? '#34d399' : '#f87171'
                                                    }}>{rollResult.challenge1}</div>
                                                </div>
                                                <div className="text-center">
                                                    <div className="text-[0.55rem]" style={{ color: 'var(--text-muted)' }}>도전2</div>
                                                    <div className="text-lg font-black" style={{
                                                        color: rollResult.actionScore > rollResult.challenge2 ? '#34d399' : '#f87171'
                                                    }}>{rollResult.challenge2}</div>
                                                </div>
                                            </div>
                                            <div className="text-sm font-black" style={{ color: RESULT_COLORS[rollResult.type] }}>
                                                {rollResult.label}
                                                {rollResult.match && (
                                                    <span className="ml-1.5 text-xs font-bold" style={{ color: '#e879f9' }}>
                                                        ✦ 매치!
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

export default MovePanel;

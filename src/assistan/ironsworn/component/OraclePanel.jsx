/**
 * OraclePanel : Ironsworn 오라클 테이블
 */
import { useState } from 'react';
import {
    ORACLE_ACTION, ORACLE_THEME, ORACLE_REGION, ORACLE_LOCATION,
    ORACLE_CHAR_ROLE, ORACLE_CHAR_GOAL, ORACLE_CHAR_DESC,
    ORACLE_COMBAT_ACTION, ORACLE_PAY_THE_PRICE
} from '../resource/dataSet/gameData';

const ORACLE_TABLES = [
    { key: 'action',    label: '행동',         data: ORACLE_ACTION }
  , { key: 'theme',     label: '주제',         data: ORACLE_THEME }
  , { key: 'region',    label: '지역',         data: ORACLE_REGION }
  , { key: 'location',  label: '장소',         data: ORACLE_LOCATION }
  , { key: 'charRole',  label: '캐릭터 역할',  data: ORACLE_CHAR_ROLE }
  , { key: 'charGoal',  label: '캐릭터 목표',  data: ORACLE_CHAR_GOAL }
  , { key: 'charDesc',  label: '캐릭터 묘사',  data: ORACLE_CHAR_DESC }
  , { key: 'combat',    label: '전투 행동',    data: ORACLE_COMBAT_ACTION }
  , { key: 'price',     label: '대가',         data: ORACLE_PAY_THE_PRICE }
];

const YES_NO_ODDS = [
    { label: '거의 확실',   threshold: 90 }
  , { label: '가능성 높음', threshold: 75 }
  , { label: '반반',       threshold: 50 }
  , { label: '가능성 낮음', threshold: 25 }
  , { label: '거의 불가능', threshold: 10 }
];

const rollD100 = () => Math.floor(Math.random() * 100) + 1;

const OraclePanel = ({ onOracleResult }) => {
    const [results, setResults] = useState([]);

    const addResult = (table, result, roll) => {
        const entry = { table, result, roll, id: Date.now() + Math.random() };
        setResults(prev => [entry, ...prev].slice(0, 30));
        if (onOracleResult) onOracleResult(entry);
    };

    const rollTable = (table) => {
        const roll = Math.floor(Math.random() * table.data.length);
        addResult(table.label, table.data[roll], roll + 1);
    };

    const rollYesNo = (odds) => {
        const roll = rollD100();
        const answer = roll <= odds.threshold ? '예' : '아니오';
        addResult(
            `예/아니오 (${odds.label})`
          , `${answer} (${roll} / 기준: ${odds.threshold})`
          , roll
        );
    };

    const rollActionTheme = () => {
        const aIdx = Math.floor(Math.random() * ORACLE_ACTION.length);
        const tIdx = Math.floor(Math.random() * ORACLE_THEME.length);
        addResult('행동 + 주제', `${ORACLE_ACTION[aIdx]} + ${ORACLE_THEME[tIdx]}`, `${aIdx + 1} / ${tIdx + 1}`);
    };

    return (
        <div className="flex flex-col gap-3 is-fade-in">
            {/* 주요 버튼 */}
            <div className="p-3 rounded-xl border" style={{ borderColor: 'var(--border-color)', backgroundColor: 'var(--card-bg)' }}>
                <div className="text-xs font-bold mb-2" style={{ color: '#d97706' }}>빠른 오라클</div>
                <div className="flex gap-1.5 flex-wrap">
                    <button
                        onClick={rollActionTheme}
                        className="text-xs px-3 py-1.5 rounded font-bold"
                        style={{ backgroundColor: 'rgba(217,119,6,0.2)', color: '#d97706' }}
                    >행동 + 주제</button>
                    {ORACLE_TABLES.slice(0, 4).map(t => (
                        <button
                            key={t.key}
                            onClick={() => rollTable(t)}
                            className="text-xs px-2.5 py-1.5 rounded font-bold"
                            style={{ backgroundColor: 'var(--tag-bg)', color: 'var(--text-main)' }}
                        >{t.label}</button>
                    ))}
                </div>
            </div>

            {/* 캐릭터 생성 오라클 */}
            <div className="p-3 rounded-xl border" style={{ borderColor: 'var(--border-color)', backgroundColor: 'var(--card-bg)' }}>
                <div className="text-xs font-bold mb-2" style={{ color: '#06b6d4' }}>캐릭터 & 전투</div>
                <div className="flex gap-1.5 flex-wrap">
                    {ORACLE_TABLES.slice(4).map(t => (
                        <button
                            key={t.key}
                            onClick={() => rollTable(t)}
                            className="text-xs px-2.5 py-1.5 rounded font-bold"
                            style={{ backgroundColor: 'var(--tag-bg)', color: 'var(--text-main)' }}
                        >{t.label}</button>
                    ))}
                </div>
            </div>

            {/* 예/아니오 오라클 */}
            <div className="p-3 rounded-xl border" style={{ borderColor: 'var(--border-color)', backgroundColor: 'var(--card-bg)' }}>
                <div className="text-xs font-bold mb-2" style={{ color: '#8b5cf6' }}>예/아니오 오라클</div>
                <div className="flex gap-1.5 flex-wrap">
                    {YES_NO_ODDS.map(o => (
                        <button
                            key={o.label}
                            onClick={() => rollYesNo(o)}
                            className="text-xs px-2.5 py-1.5 rounded font-bold"
                            style={{ backgroundColor: 'rgba(139,92,246,0.15)', color: '#a78bfa' }}
                        >{o.label} ({o.threshold}%)</button>
                    ))}
                </div>
            </div>

            {/* 결과 로그 */}
            <div className="p-3 rounded-xl border" style={{ borderColor: 'var(--border-color)', backgroundColor: 'var(--card-bg)' }}>
                <div className="text-xs font-bold mb-2" style={{ color: 'var(--text-muted)' }}>결과 기록</div>
                <div className="flex flex-col gap-1 is-scroll overflow-y-auto" style={{ maxHeight: '30vh' }}>
                    {results.length === 0 && (
                        <div className="text-xs text-center py-4" style={{ color: 'var(--text-muted)' }}>
                            오라클 버튼을 눌러 결과를 확인하세요.
                        </div>
                    )}
                    {results.map(r => (
                        <div
                            key={r.id}
                            className="text-xs px-2.5 py-1.5 rounded is-fade-in flex justify-between"
                            style={{ backgroundColor: 'rgba(0,0,0,0.2)' }}
                        >
                            <span style={{ color: 'var(--text-muted)' }}>{r.table}:</span>
                            <span className="font-bold" style={{ color: '#d97706' }}>{r.result}</span>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default OraclePanel;

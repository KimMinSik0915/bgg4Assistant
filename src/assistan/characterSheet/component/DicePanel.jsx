/**
 * @Author : 김민식
 * DicePanel : 화면 하단 고정 주사위 선택/굴림 패널 + 화면 전체를 실제 물리 엔진으로 굴러다니는
 * 진짜 3D 주사위(@3d-dice/dice-box, Babylon.js + 물리 시뮬레이션) 연출.
 *
 * 주사위 종류 버튼을 눌러 "트레이"에 여러 개(한 종류를 여럿, 또는 여러 종류를 섞어서) 담아뒀다가
 * 한 번에 다 굴릴 수 있다. 뱃지 숫자를 누르면 하나씩 뺄 수 있다.
 */
import { forwardRef, useEffect, useImperativeHandle } from "react";
import { createPortal } from "react-dom";
import { DicesIcon, Trash2Icon } from "lucide-react";
import { getDiceBox, rollPhysicalDie, rollPhysicalDiceGroup } from "../service/dice3DEngine";

const DICE_LIST = [4, 6, 8, 10, 12, 20];
const DICE_BOX_SELECTOR = '#cs-dice-box-canvas-root';

// 주사위 면 수를 그대로 다각형 변 수로 사용 → d4는 뾰족한 삼각형, d20은 거의 원에 가까운 모양이 되어
// "각진 정도 = 난이도" 라는 직관과 자연스럽게 맞아떨어진다. (하단 패널의 작은 아이콘 전용)
const polygonPoints = (sides, radius = 46, cx = 50, cy = 50) => {
    const n = Math.max(3, Math.min(sides, 20));
    const pts = [];
    for (let i = 0; i < n; i++) {
        const angle = (Math.PI * 2 * i) / n - Math.PI / 2;
        pts.push(`${(cx + radius * Math.cos(angle)).toFixed(2)},${(cy + radius * Math.sin(angle)).toFixed(2)}`);
    }
    return pts.join(' ');
};

// 평면형 다이스 아이콘 (선택 버튼 / 하단 결과창처럼 작은 자리에서 쓰는 유리질감 버전)
const DiceShape = ({ sides, value, size = 40, glow = false, gradientId }) => (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
        <svg viewBox="0 0 100 100" className="absolute inset-0 h-full w-full" style={{ filter: glow ? 'drop-shadow(0 6px 16px rgba(0,0,0,0.5))' : 'none' }}>
            <defs>
                <linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="var(--accent-color, #22d3ee)" />
                    <stop offset="100%" stopColor="var(--highlight, #818cf8)" />
                </linearGradient>
                <radialGradient id={`${gradientId}-gloss`} cx="34%" cy="24%" r="70%">
                    <stop offset="0%" stopColor="#ffffff" stopOpacity="0.75" />
                    <stop offset="45%" stopColor="#ffffff" stopOpacity="0.12" />
                    <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
                </radialGradient>
            </defs>
            <polygon points={polygonPoints(sides)} fill={`url(#${gradientId})`} stroke="rgba(255,255,255,0.55)" strokeWidth="2.5" strokeLinejoin="round" />
            <polygon points={polygonPoints(sides)} fill={`url(#${gradientId}-gloss)`} />
        </svg>
        <div
            className="absolute inset-0 flex items-center justify-center font-black text-white"
            style={{ fontSize : size * 0.34, textShadow : '0 2px 5px rgba(0,0,0,0.55)' }}
        >
            {value}
        </div>
    </div>
);

// 🎲 화면 전체를 덮는 실제 3D 물리 주사위 캔버스. 클래스 컴포넌트(CharacterSheetManager)에서
// ref로 직접 "실제로 굴려서 눈 받아오기"를 호출할 수 있도록 forwardRef + useImperativeHandle 사용.
const DicePanel = forwardRef(({
    diceQueue, queueResults, queueTotal
  , selectedSides, diceValue, isRolling, resultText
  , onIncrementDie, onDecrementDie, onResetQueue, onRollQueue
}, ref) => {
    useImperativeHandle(ref, () => ({
        rollPhysical : (sides) => rollPhysicalDie(DICE_BOX_SELECTOR, sides)
      , rollPhysicalMultiple : (specs) => rollPhysicalDiceGroup(DICE_BOX_SELECTOR, specs)
    }));

    // 에셋(모델/워커) 준비를 미리 시작해서, 실제로 "굴리기"를 눌렀을 때 첫 로딩 지연이 없도록 한다.
    useEffect(() => {
        getDiceBox(DICE_BOX_SELECTOR).catch(() => {});
    }, []);

    const totalQueued = DICE_LIST.reduce((sum, sides) => sum + (diceQueue[sides] || 0), 0);
    const hasBreakdown = queueResults && queueResults.length > 1;

    return (
        <>
            {createPortal(
                <div
                    id="cs-dice-box-canvas-root"
                    className="pointer-events-none fixed inset-0 z-[10000]"
                    aria-hidden="true"
                />,
                document.body
            )}

            <div
                className="fixed bottom-0 left-0 right-0 border-t-2 border-[var(--accent-color)] px-3 py-2.5 z-[9999] bg-[var(--panel-bg)] backdrop-blur-md"
                style={{ boxShadow : '0 -4px 20px rgba(0,0,0,0.5)' }}
            >
                {/* 주사위 선택 트레이: 탭할 때마다 +1, 뱃지를 탭하면 -1 */}
                <div className="flex justify-between gap-1.5 mb-2">
                    {DICE_LIST.map(sides => {
                        const count = diceQueue[sides] || 0;
                        return (
                            <button
                                key={sides}
                                onClick={() => onIncrementDie(sides)}
                                className={`relative flex flex-1 flex-col items-center gap-0.5 rounded-lg border py-1.5 transition-all ${
                                    count > 0
                                        ? 'border-[var(--accent-color)] bg-[var(--accent-color)]/15 scale-105'
                                        : 'border-[var(--border-color)] bg-[var(--card-bg)] backdrop-blur-md opacity-80 hover:opacity-100'
                                }`}
                            >
                                <DiceShape sides={sides} value="" size={22} gradientId={`cs-dice-btn-grad-${sides}`}/>
                                <span className="text-[0.65rem] font-bold" style={{ color : count > 0 ? 'var(--accent-color)' : 'var(--text-muted)' }}>
                                    d{sides}
                                </span>
                                {count > 0 && (
                                    <span
                                        onClick={(e) => { e.stopPropagation(); onDecrementDie(sides); }}
                                        className="absolute -top-1.5 -right-1.5 flex h-5 min-w-[1.25rem] items-center justify-center rounded-full px-1 text-[0.65rem] font-bold text-white shadow-md active:scale-90"
                                        style={{ background : 'var(--highlight)' }}
                                        title="1개 빼기"
                                    >
                                        {count}
                                    </span>
                                )}
                            </button>
                        );
                    })}
                </div>

                {/* 초기화 + 굴리기 */}
                <div className="flex items-center gap-2">
                    <button
                        onClick={onResetQueue}
                        disabled={totalQueued === 0 || isRolling}
                        className="flex shrink-0 items-center justify-center rounded-lg border px-2.5 py-2.5 transition-opacity disabled:opacity-30"
                        style={{ borderColor : 'var(--border-color)', color : 'var(--text-muted)' }}
                        title="선택 초기화"
                    >
                        <Trash2Icon size={16}/>
                    </button>
                    <button
                        onClick={onRollQueue}
                        disabled={isRolling || totalQueued === 0}
                        className="flex flex-1 items-center justify-center gap-1.5 rounded-lg border-none py-2.5 text-[0.95rem] font-bold text-white transition-transform active:scale-95 disabled:opacity-50"
                        style={{ background : 'linear-gradient(135deg, var(--header-from) 0%, var(--header-to) 100%)' }}
                    >
                        <DicesIcon size={17} className={isRolling ? 'animate-spin' : ''}/>
                        {isRolling ? '굴리는 중...' : totalQueued > 0 ? `${totalQueued}개 굴리기` : '주사위를 선택하세요'}
                    </button>
                </div>

                {/* 결과 */}
                {resultText && (
                    <div
                        className="mt-2 rounded-lg border px-3 py-2"
                        style={{ borderColor : 'var(--border-color)', background : 'var(--card-bg)' }}
                    >
                        {hasBreakdown ? (
                            <div className="flex flex-col gap-1.5">
                                <div className="flex items-center justify-between">
                                    <span className="text-xs font-bold" style={{ color : 'var(--text-muted)' }}>
                                        {queueResults.length}개 굴림 결과
                                    </span>
                                    <span className="text-base font-black" style={{ color : 'var(--accent-color)' }}>
                                        합계 {queueTotal}
                                    </span>
                                </div>
                                <div className="flex flex-wrap gap-1.5">
                                    {queueResults.map((r, i) => (
                                        <span
                                            key={i}
                                            className="rounded-full px-2 py-0.5 text-xs font-bold"
                                            style={{ background : 'var(--tag-bg)', color : 'var(--text-main)', border : '1px solid var(--border-color)' }}
                                        >
                                            d{r.sides}<span style={{ color : 'var(--accent-color)' }}> {r.value}</span>
                                        </span>
                                    ))}
                                </div>
                            </div>
                        ) : (
                            <div className="flex items-center gap-2">
                                <div className={isRolling ? 'cs-dice-rolling rounded-lg' : 'rounded-lg'}>
                                    <DiceShape sides={selectedSides} value={diceValue} size={36} gradientId="cs-dice-result-grad"/>
                                </div>
                                <span className="text-xs" style={{ color : 'var(--text-muted)' }}>{resultText}</span>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </>
    );
});

export default DicePanel;

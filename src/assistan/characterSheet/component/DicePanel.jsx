/**
 * @Author : 김민식
 * DicePanel : 화면 하단 고정 주사위 선택/굴림 패널
 */
const DICE_LIST = [4, 6, 8, 10, 12, 20];

const DicePanel = ({ selectedSides, diceValue, isRolling, resultText, onSelectDice, onRoll }) => {
    return (
        <div
            className="fixed bottom-0 left-0 right-0 border-t-2 border-[var(--accent-color)] px-3 py-2.5 z-[9999] bg-[var(--panel-bg)]"
            style={{ boxShadow : '0 -4px 20px rgba(0,0,0,0.5)' }}
        >
            <div className="flex justify-between gap-1 mb-2">
                {DICE_LIST.map(sides => (
                    <button
                        key={sides}
                        onClick={() => onSelectDice(sides)}
                        className={`flex-1 py-2 rounded-md font-bold text-sm border ${
                            selectedSides === sides
                                ? 'bg-[var(--accent-color)] text-white border-[var(--accent-color)]'
                                : 'bg-[var(--card-bg)] text-[var(--text-main)] border-[var(--border-color)]'
                        }`}
                    >
                        d{sides}
                    </button>
                ))}
            </div>
            <div className="flex items-center justify-between gap-2.5">
                <button
                    onClick={onRoll}
                    className="flex-1 text-white border-none py-2.5 text-[0.95rem] font-bold rounded-md bg-[var(--highlight)]"
                >
                    굴리기
                </button>
                <div className="flex items-center gap-2 flex-[1.5]">
                    <div
                        className={`w-10 h-10 min-w-[40px] text-white text-xl font-bold flex items-center justify-center rounded-lg bg-[var(--accent-color)] ${isRolling ? 'cs-dice-rolling' : ''}`}
                    >
                        {diceValue}
                    </div>
                    <span className="text-xs text-[var(--text-muted)]">{resultText}</span>
                </div>
            </div>
        </div>
    );
}

export default DicePanel;

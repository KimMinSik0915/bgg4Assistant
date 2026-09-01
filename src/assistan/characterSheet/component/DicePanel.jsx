/**
 * @Author : 김민식
 * DicePanel : 사이트 전체에 떠 있는 전역 주사위 위젯. Layout에 딱 한 번 마운트되어(props 없음)
 * 어떤 화면(홈/캐릭터 시트/기타 게임 화면)에 있든 화면 상단에 플로팅 버튼(FAB)으로 떠 있다.
 * 클릭하면 주사위 선택 트레이가 펼쳐지고, 여러 종류/개수를 담아 한 번에 굴릴 수 있다.
 *
 * 굴림은 실제 물리 엔진(@3d-dice/dice-box, Babylon.js)으로 화면 전체에 주사위를 던져서 진짜로
 * 굴러다니다 착지하게 만든다. 문제는 이 물리 주사위들이 착지한 뒤 아무 처리도 안 하면 "영원히"
 * 화면에 남아있다는 것 — 그래서 결과를 잠깐 보여준 다음, 화면 대각선으로 손이 쓱 지나가는 타이밍에
 * 맞춰 실제로 캔버스를 정리(clearDiceBox)해서 널브러진 주사위들을 "회수"해간다.
 *
 * CharacterSheetManager의 능력 체크처럼, 이 컴포넌트가 모르는 다른 화면/트리에서 발생한 굴림도
 * dice3DEngine의 announceDiceResult(...)로 방송하면 이 위젯이 window 이벤트로 받아 같은 풀스크린
 * 결과 연출을 그대로 띄워준다 — props나 ref로 트리를 가로지를 필요가 없다.
 */
import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { DicesIcon, Trash2Icon, XIcon } from "lucide-react";
import {
  getDiceBox,
  rollPhysicalDiceGroup,
  clearDiceBox,
  DICE_BOX_SELECTOR,
  DICE_RESULT_EVENT,
} from "../service/dice3DEngine";

const DICE_LIST = [4, 6, 8, 10, 12, 20];
const EMPTY_QUEUE = { 4: 0, 6: 0, 8: 0, 10: 0, 12: 0, 20: 0 };

// 결과가 화면 한가운데 등장해서 얼마나 오래 머물렀다가(HOLD) 손이 화면을 가로지르며 널브러진
// 주사위들을 회수해가는 연출(EXIT)에 들어갈지. EXIT_MS는 characterSheet.css의
// cs-hand-collect / cs-result-collected 애니메이션 길이(1.1s)와 맞춰야 한다.
const RESULT_HOLD_MS = 2600;
const RESULT_EXIT_MS = 1100;
// 손이 화면 중앙을 가로지르는 시점(대략 exit 애니메이션의 절반)에 맞춰 실제 물리 캔버스를 비운다 —
// "손이 쓸고 지나가면서 주사위를 치웠다"는 착시를 만든다.
const CLEAR_AT_MS = 520;

// 이 위젯은 사이트 어디서나(캐릭터 시트 테마가 없는 화면 포함) 떠 있어야 하므로, 캐릭터 시트의
// 테마 CSS 변수(--accent-color 등)에 기대지 않고 자체 고정 팔레트를 쓴다.
const FAB_GRADIENT = "linear-gradient(135deg, #6366f1 0%, #22d3ee 100%)";
const DICE_ACCENT = "#22d3ee";
const DICE_HIGHLIGHT = "#818cf8";

// 주사위 면 수를 그대로 다각형 변 수로 사용 → d8/d10/d12/d20처럼 각지고 둥근 정도가 면 수와
// 자연스럽게 맞아떨어지는 주사위는 이 방식을 그대로 쓴다.
const polygonPoints = (sides, radius = 46, cx = 50, cy = 50) => {
  const n = Math.max(3, Math.min(sides, 20));
  const pts = [];
  for (let i = 0; i < n; i++) {
    const angle = (Math.PI * 2 * i) / n - Math.PI / 2;
    pts.push(
      `${(cx + radius * Math.cos(angle)).toFixed(2)},${(cy + radius * Math.sin(angle)).toFixed(2)}`,
    );
  }
  return pts.join(" ");
};

// d4(삼각뿔) / d6(정육면체)는 각지고 밝은 면·그늘진 면을 나눠 칠해서 "진짜 입체"처럼 보이게 그린다.
// 각 면은 같은 그라디언트를 공통 바탕으로 쓰고, 그 위에 흰색/검은색을 살짝 얹어 빛이 왼쪽 위에서
// 오는 것처럼 명암을 준다 — 배경색이 뭐든 항상 "밝다/어둡다"가 유지되도록 불투명 오버레이를 쓴다.
const cubeFaces = (gradientId) => (
  <>
    {/* 왼쪽 아래 면 (중간 톤) */}
    <polygon
      points="14,32 50,54 50,98 14,76"
      fill={`url(#${gradientId})`}
      stroke="rgba(255,255,255,0.55)"
      strokeWidth="2.5"
      strokeLinejoin="round"
    />
    {/* 오른쪽 아래 면 (그늘) */}
    <polygon
      points="86,32 86,76 50,98 50,54"
      fill={`url(#${gradientId})`}
      stroke="rgba(255,255,255,0.55)"
      strokeWidth="2.5"
      strokeLinejoin="round"
    />
    <polygon
      points="86,32 86,76 50,98 50,54"
      fill="#000000"
      fillOpacity="0.32"
    />
    {/* 윗면 (하이라이트) */}
    <polygon
      points="50,10 86,32 50,54 14,32"
      fill={`url(#${gradientId})`}
      stroke="rgba(255,255,255,0.55)"
      strokeWidth="2.5"
      strokeLinejoin="round"
    />
    <polygon
      points="50,10 86,32 50,54 14,32"
      fill="#ffffff"
      fillOpacity="0.3"
    />
    <polygon
      points="50,10 86,32 50,54 14,32"
      fill={`url(#${gradientId}-gloss)`}
    />
  </>
);

const tetraFaces = (gradientId) => (
  <>
    {/* 아래 면 (중간 톤) */}
    <polygon
      points="10,88 90,88 50,60"
      fill={`url(#${gradientId})`}
      stroke="rgba(255,255,255,0.55)"
      strokeWidth="2.5"
      strokeLinejoin="round"
    />
    <polygon points="10,88 90,88 50,60" fill="#000000" fillOpacity="0.16" />
    {/* 오른쪽 면 (그늘) */}
    <polygon
      points="50,8 90,88 50,60"
      fill={`url(#${gradientId})`}
      stroke="rgba(255,255,255,0.55)"
      strokeWidth="2.5"
      strokeLinejoin="round"
    />
    <polygon points="50,8 90,88 50,60" fill="#000000" fillOpacity="0.3" />
    {/* 왼쪽 면 (하이라이트) */}
    <polygon
      points="50,8 50,60 10,88"
      fill={`url(#${gradientId})`}
      stroke="rgba(255,255,255,0.55)"
      strokeWidth="2.5"
      strokeLinejoin="round"
    />
    <polygon points="50,8 50,60 10,88" fill="#ffffff" fillOpacity="0.26" />
  </>
);

// 평면형 다이스 아이콘 (선택 버튼 / FAB / 풀스크린 결과 모두 이 하나로 크기만 바꿔서 재사용).
// d4·d6는 입체감 있는 전용 모양을, 그 외에는 면 수만큼의 각진 다각형을 그린다.
const DiceShape = ({ sides, value, size = 40, glow = false, gradientId }) => {
  const is3D = sides === 4 || sides === 6;
  // d4/d6는 안쪽 면 배치상 숫자가 중앙에서 살짝 치우쳐야 보기 좋다.
  const valueShift = sides === 4 ? -9 : sides === 6 ? 15 : 0;

  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg
        viewBox="0 0 100 100"
        className="absolute inset-0 w-full h-full"
        style={{
          filter: glow ? "drop-shadow(0 6px 16px rgba(0,0,0,0.5))" : "none",
        }}
      >
        <defs>
          <linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop
              offset="0%"
              stopColor={`var(--accent-color, ${DICE_ACCENT})`}
            />
            <stop
              offset="100%"
              stopColor={`var(--highlight, ${DICE_HIGHLIGHT})`}
            />
          </linearGradient>
          <radialGradient id={`${gradientId}-gloss`} cx="34%" cy="24%" r="70%">
            <stop offset="0%" stopColor="#ffffff" stopOpacity="0.75" />
            <stop offset="45%" stopColor="#ffffff" stopOpacity="0.12" />
            <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
          </radialGradient>
        </defs>
        {sides === 6 ? (
          cubeFaces(gradientId)
        ) : sides === 4 ? (
          tetraFaces(gradientId)
        ) : (
          <>
            <polygon
              points={polygonPoints(sides)}
              fill={`url(#${gradientId})`}
              stroke="rgba(255,255,255,0.55)"
              strokeWidth="2.5"
              strokeLinejoin="round"
            />
            <polygon
              points={polygonPoints(sides)}
              fill={`url(#${gradientId}-gloss)`}
            />
          </>
        )}
      </svg>
      <div
        className="absolute inset-0 flex items-center justify-center font-black text-white"
        style={{
          fontSize: size * 0.34,
          textShadow: "0 2px 5px rgba(0,0,0,0.55)",
          transform: is3D ? `translateY(${valueShift}%)` : undefined,
        }}
      >
        {value}
      </div>
    </div>
  );
};

// 🎉/💀 대성공·대실패 문구를 감지해서 금색/핏빛 테마로 물들인다. --accent-color / --highlight를
// 이 시점에만 덮어써주면 DiceShape의 그라디언트가 그대로 그 색을 받아쓴다.
const resultTheme = (text) => {
  if (/대성공/.test(text || ""))
    return { "--accent-color": "#fbbf24", "--highlight": "#f97316" };
  if (/대실패/.test(text || ""))
    return { "--accent-color": "#f87171", "--highlight": "#7f1d1d" };
  return undefined;
};

// 🎲 굴림이 끝나는 순간의 결과를 화면 전체에 크게 띄웠다가, 화면을 가로지르는 손과 함께
// (실제로 널브러져 있던 물리 주사위들과 나란히) 회수되어 사라지는 풀스크린 오버레이.
const DiceResultOverlay = ({ overlay }) => {
  const { mode, phase, sides, value, results, total, text } = overlay;
  const exiting = phase === "exit";

  return (
    <div
      className={`fixed inset-0 z-[10001] flex items-center justify-center pointer-events-none ${exiting ? "cs-overlay-backdrop-out" : "cs-overlay-backdrop-in"}`}
    >
      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(circle at 50% 45%, rgba(0,0,0,0.6) 0%, rgba(0,0,0,0.25) 55%, rgba(0,0,0,0) 78%)",
        }}
      />

      <div
        className={`relative flex flex-col items-center gap-5 px-6 ${exiting ? "cs-result-collected" : "cs-result-enter"}`}
        style={resultTheme(text)}
      >
        {mode === "group" ? (
          <>
            <span className="text-sm font-bold tracking-widest uppercase text-white/80">
              🎲 {results.length}개 굴림
            </span>
            <div className="flex flex-wrap justify-center gap-3 max-w-[92vw]">
              {results.map((r, i) => (
                <div
                  key={i}
                  className="cs-result-chip-pop"
                  style={{ animationDelay: exiting ? "0ms" : `${i * 70}ms` }}
                >
                  <DiceShape
                    sides={r.sides}
                    value={r.value}
                    size={68}
                    glow
                    gradientId={`cs-ov-chip-${i}`}
                  />
                </div>
              ))}
            </div>
            <div
              className="text-6xl font-black text-white sm:text-7xl"
              style={{
                textShadow: `0 6px 30px var(--accent-color, ${DICE_ACCENT})`,
              }}
            >
              합계 {total}
            </div>
          </>
        ) : (
          <DiceShape
            sides={sides}
            value={value}
            size={220}
            glow
            gradientId="cs-ov-single"
          />
        )}

        {text && (
          <div
            className="max-w-[90vw] rounded-full px-6 py-2.5 text-center text-base sm:text-xl font-extrabold text-white"
            style={{
              background: "rgba(12,12,18,0.55)",
              backdropFilter: "blur(8px)",
              border: "1px solid rgba(255,255,255,0.25)",
            }}
          >
            {text}
          </div>
        )}
      </div>

      {exiting && (
        <div className="cs-hand-collect" aria-hidden="true">
          <span className="cs-hand-open">🖐️</span>
          <span className="cs-hand-fist">✊</span>
        </div>
      )}
    </div>
  );
};

// 🎲 화면 전체를 덮는 실제 3D 물리 주사위 캔버스 + 사이트 전역 상단 플로팅 버튼/트레이.
// Layout에 한 번만 마운트되어 props 없이 완전히 독립적으로 동작한다.
const DicePanel = () => {
  // 에셋(모델/워커) 준비를 미리 시작해서, 실제로 "굴리기"를 눌렀을 때 첫 로딩 지연이 없도록 한다.
  useEffect(() => {
    getDiceBox(DICE_BOX_SELECTOR).catch(() => {});
  }, []);

  const [expanded, setExpanded] = useState(false);
  const [diceQueue, setDiceQueue] = useState(EMPTY_QUEUE);
  const [isRolling, setIsRolling] = useState(false);
  const [overlay, setOverlay] = useState(null); // { mode, phase, sides, value, results, total, text }
  const timersRef = useRef([]);

  const clearTimers = useCallback(() => {
    timersRef.current.forEach(clearTimeout);
    timersRef.current = [];
  }, []);
  useEffect(() => () => clearTimers(), [clearTimers]);

  // 결과를 화면 전체에 띄웠다가, 잠시 후 손이 화면을 가로지르는 타이밍에 맞춰 실제 물리 캔버스도
  // 함께 비운다(clearDiceBox) — 이게 "던져진 주사위가 영원히 안 사라지던" 문제의 실제 해결책이다.
  const presentResult = useCallback(
    (snapshot) => {
      clearTimers();
      setOverlay({ ...snapshot, phase: "enter" });

      timersRef.current.push(
        setTimeout(() => {
          setOverlay((prev) => (prev ? { ...prev, phase: "exit" } : prev));
          timersRef.current.push(
            setTimeout(() => {
              clearDiceBox();
            }, CLEAR_AT_MS),
          );
          timersRef.current.push(
            setTimeout(() => setOverlay(null), RESULT_EXIT_MS),
          );
        }, RESULT_HOLD_MS),
      );
    },
    [clearTimers],
  );

  // 다른 화면/트리(예: 캐릭터 시트의 능력 체크)에서 방송한 굴림 결과도 같은 오버레이로 띄운다.
  useEffect(() => {
    const onExternalResult = (e) => presentResult(e.detail);
    window.addEventListener(DICE_RESULT_EVENT, onExternalResult);
    return () =>
      window.removeEventListener(DICE_RESULT_EVENT, onExternalResult);
  }, [presentResult]);

  const totalQueued = DICE_LIST.reduce(
    (sum, sides) => sum + (diceQueue[sides] || 0),
    0,
  );

  const incrementDie = (sides) =>
    setDiceQueue((prev) => {
      const current = prev[sides] || 0;
      if (current >= 9) return prev; // 한 종류당 최대 9개
      return { ...prev, [sides]: current + 1 };
    });
  const decrementDie = (sides) =>
    setDiceQueue((prev) => {
      const current = prev[sides] || 0;
      if (current <= 0) return prev;
      return { ...prev, [sides]: current - 1 };
    });
  const resetQueue = () => setDiceQueue(EMPTY_QUEUE);

  const handleRollQueue = async () => {
    const entries = Object.entries(diceQueue).filter(([, qty]) => qty > 0);
    if (entries.length === 0 || isRolling) return;

    setExpanded(false);
    setIsRolling(true);

    const specs = entries.map(([sides, qty]) => ({
      sides: Number(sides),
      qty,
    }));
    let results = await rollPhysicalDiceGroup(DICE_BOX_SELECTOR, specs).catch(
      () => null,
    );
    if (!Array.isArray(results) || results.length === 0) {
      // 3D 엔진 로드 실패 등 예외 상황에서만 일반 난수로 대체한다.
      results = [];
      specs.forEach(({ sides, qty }) => {
        for (let i = 0; i < qty; i++)
          results.push({ sides, value: Math.floor(Math.random() * sides) + 1 });
      });
    }

    const total = results.reduce((sum, r) => sum + r.value, 0);
    const breakdown = results
      .map((r) => `d${r.sides}:${r.value}`)
      .join("  +  ");
    const text = `${results.length}개 굴림 = ${breakdown}  →  합계 ${total}`;

    setIsRolling(false);
    presentResult(
      results.length > 1
        ? { mode: "group", results, total, text }
        : {
            mode: "single",
            sides: results[0]?.sides,
            value: results[0]?.value,
            text,
          },
    );
  };

  // 굴리는 중엔 트레이를 접어서 화면을 가리지 않게 하고, 실제 물리 주사위가 잘 보이게 한다.
  useEffect(() => {
    if (isRolling) setExpanded(false);
  }, [isRolling]);

  return (
    <>
      {createPortal(
        <div
          id="cs-dice-box-canvas-root"
          className="pointer-events-none fixed inset-0 z-[10000]"
          aria-hidden="true"
        />,
        document.body,
      )}

      {overlay &&
        createPortal(<DiceResultOverlay overlay={overlay} />, document.body)}

      {/* 트레이가 펼쳐졌을 때 바깥을 탭하면 접히는 투명 백드롭 */}
      {expanded && (
        <div
          className="fixed inset-0 z-[9997]"
          onClick={() => setExpanded(false)}
          aria-hidden="true"
        />
      )}

      {/* 펼쳐지는 선택 트레이 — 상단 FAB 바로 아래로 펼쳐진다 */}
      <div
        className={`fixed top-40 right-4 z-[9998] w-[min(320px,calc(100vw-2rem))] origin-top-right rounded-2xl border-2 px-3 py-3 transition-all duration-300 ${
          expanded
            ? "opacity-100 scale-100 translate-y-0"
            : "pointer-events-none opacity-0 scale-90 -translate-y-3"
        }`}
        style={{
          borderColor: DICE_ACCENT,
          background: "rgba(15,17,26,0.92)",
          backdropFilter: "blur(14px)",
          boxShadow: "0 12px 40px rgba(0,0,0,0.55)",
        }}
      >
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-bold text-white/70">
            🎲 주사위 선택
          </span>
          <button
            onClick={() => setExpanded(false)}
            className="p-1 rounded-md text-white/70 opacity-70 hover:opacity-100"
          >
            <XIcon size={15} />
          </button>
        </div>

        {/* 주사위 선택 트레이: 탭할 때마다 +1, 뱃지를 탭하면 -1 */}
        <div className="flex justify-between gap-1.5 mb-2">
          {DICE_LIST.map((sides) => {
            const count = diceQueue[sides] || 0;
            return (
              <button
                key={sides}
                onClick={() => incrementDie(sides)}
                className={`relative flex flex-1 flex-col items-center gap-0.5 rounded-lg border py-1.5 transition-all ${
                  count > 0
                    ? "scale-105 bg-cyan-400/15"
                    : "border-white/15 bg-white/5 opacity-80 hover:opacity-100"
                }`}
                style={count > 0 ? { borderColor: DICE_ACCENT } : undefined}
              >
                <DiceShape
                  sides={sides}
                  value=""
                  size={22}
                  gradientId={`cs-dice-btn-grad-${sides}`}
                />
                <span
                  className="text-[0.65rem] font-bold"
                  style={{
                    color: count > 0 ? DICE_ACCENT : "rgba(255,255,255,0.6)",
                  }}
                >
                  d{sides}
                </span>
                {count > 0 && (
                  <span
                    onClick={(e) => {
                      e.stopPropagation();
                      decrementDie(sides);
                    }}
                    className="absolute -top-1.5 -right-1.5 flex h-5 min-w-[1.25rem] items-center justify-center rounded-full px-1 text-[0.65rem] font-bold text-white shadow-md active:scale-90"
                    style={{ background: DICE_HIGHLIGHT }}
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
            onClick={resetQueue}
            disabled={totalQueued === 0 || isRolling}
            className="flex shrink-0 items-center justify-center rounded-lg border border-white/15 px-2.5 py-2.5 text-white/70 transition-opacity disabled:opacity-30"
            title="선택 초기화"
          >
            <Trash2Icon size={16} />
          </button>
          <button
            onClick={handleRollQueue}
            disabled={isRolling || totalQueued === 0}
            className="flex flex-1 items-center justify-center gap-1.5 rounded-lg border-none py-2.5 text-[0.95rem] font-bold text-white transition-transform active:scale-95 disabled:opacity-50"
            style={{ background: FAB_GRADIENT }}
          >
            <DicesIcon size={17} className={isRolling ? "animate-spin" : ""} />
            {isRolling
              ? "굴리는 중..."
              : totalQueued > 0
                ? `${totalQueued}개 굴리기`
                : "주사위를 선택하세요"}
          </button>
        </div>
      </div>

      {/* 상단 플로팅 버튼(FAB) — 사이트 어느 화면에 있든 항상 떠 있다 */}
      <button
        onClick={() => setExpanded((v) => !v)}
        className="fixed top-20 right-5 z-[9999] flex h-16 w-16 items-center justify-center rounded-full border-2 text-white transition-transform active:scale-90"
        style={{
          borderColor: "rgba(255,255,255,0.35)",
          background: FAB_GRADIENT,
          boxShadow: expanded
            ? "0 0 0 6px rgba(255,255,255,0.08), 0 10px 30px rgba(0,0,0,0.5)"
            : "0 10px 30px rgba(0,0,0,0.5)",
        }}
        title="주사위 굴리기"
      >
        {expanded ? (
          <XIcon size={26} />
        ) : (
          <DicesIcon size={26} className={isRolling ? "animate-spin" : ""} />
        )}
        {!expanded && totalQueued > 0 && (
          <span
            className="absolute -bottom-1 -right-1 flex h-6 min-w-[1.5rem] items-center justify-center rounded-full px-1.5 text-xs font-bold text-white shadow-md"
            style={{ background: DICE_HIGHLIGHT }}
          >
            {totalQueued}
          </span>
        )}
        {isRolling && (
          <span
            className="absolute -bottom-8 right-0 whitespace-nowrap rounded-full px-2.5 py-1 text-[0.65rem] font-bold text-white"
            style={{
              background: "rgba(12,12,18,0.75)",
              backdropFilter: "blur(6px)",
            }}
          >
            굴리는 중...
          </span>
        )}
      </button>
    </>
  );
};

export default DicePanel;

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
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { DicesIcon, Trash2Icon, XIcon } from "lucide-react";
import {
  getDiceBox,
  rollPhysicalDiceGroup,
  clearDiceBox,
  DICE_BOX_SELECTOR,
  DICE_RESULT_EVENT,
  DICE_ROLLING_EVENT,
  isDiceRollInProgress,
  beginDiceCycle,
  endDiceCycle,
} from "../service/dice3DEngine";
import {
  getDiceResultEffect,
  DICE_RESULT_EFFECT_EVENT,
  getDiceColor,
  DICE_COLOR_EVENT,
} from "../service/diceEffectSettings";
import d4BadgeIcon from "../resource/diceIcons/d4.svg";
import d6BadgeIcon from "../resource/diceIcons/d6.svg";
import d8BadgeIcon from "../resource/diceIcons/d8.svg";
import d10BadgeIcon from "../resource/diceIcons/d10.svg";
import d12BadgeIcon from "../resource/diceIcons/d12.svg";
import d20BadgeIcon from "../resource/diceIcons/d20.svg";

const DICE_LIST = [4, 6, 8, 10, 12, 20];
const EMPTY_QUEUE = { 4: 0, 6: 0, 8: 0, 10: 0, 12: 0, 20: 0 };

// 🖐️ 플로팅 버튼(FAB)을 화면 아무 데나 드래그해서 옮길 수 있게 하는 설정.
// 위치는 뷰포트 좌상단 기준 px(top/left)로 저장하고, 다음 방문 때도 같은 자리에 뜨도록 localStorage에 남긴다.
const FAB_SIZE = 64; // h-16 w-16
const FAB_EDGE_MARGIN = 12;
const FAB_DRAG_THRESHOLD = 6; // 이보다 적게 움직이면 드래그가 아니라 탭/클릭으로 취급
const FAB_POSITION_STORAGE = "cs_dice_fab_position";

const clampFabPosition = ({ top, left }) => {
  const maxLeft = Math.max(
    FAB_EDGE_MARGIN,
    window.innerWidth - FAB_SIZE - FAB_EDGE_MARGIN,
  );
  const maxTop = Math.max(
    FAB_EDGE_MARGIN,
    window.innerHeight - FAB_SIZE - FAB_EDGE_MARGIN,
  );
  return {
    left: Math.min(maxLeft, Math.max(FAB_EDGE_MARGIN, left)),
    top: Math.min(maxTop, Math.max(FAB_EDGE_MARGIN, top)),
  };
};

const defaultFabPosition = () =>
  clampFabPosition({ top: 80, left: window.innerWidth - FAB_SIZE - 20 }); // 기존 top-20 right-5 자리

const loadFabPosition = () => {
  try {
    const raw = window.localStorage.getItem(FAB_POSITION_STORAGE);
    if (!raw) return defaultFabPosition();
    const parsed = JSON.parse(raw);
    if (typeof parsed.top !== "number" || typeof parsed.left !== "number") {
      return defaultFabPosition();
    }
    return clampFabPosition(parsed); // 저장 이후 화면 크기가 바뀌었을 수 있으니 항상 다시 클램프
  } catch (e) {
    return defaultFabPosition();
  }
};

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

// game-icons.net의 실제 다이스 도안(D4·D8·D10·D12·D20은 Delapouite·Skoll 작가, CC BY 3.0 —
// 자세한 출처는 resource/diceIcons/CREDITS.md)을 마스크로 써서 브랜드 그라디언트를 입힌다.
// 실제 면 분할선·눈금까지 있는 진짜 다면체 도안이라 손으로 그린 다각형보다 훨씬 입체적으로
// 보인다. d6만은 원본 세트에 눈금 없는 정육면체가 없어서, 같은 "꽉 찬 실루엣 + 면 사이 가는
// 틈" 질감으로 등각 큐브를 손수 그려 넣었다(d6.svg).
const DICE_BADGE_ICONS = {
  4: d4BadgeIcon,
  6: d6BadgeIcon,
  8: d8BadgeIcon,
  10: d10BadgeIcon,
  12: d12BadgeIcon,
  20: d20BadgeIcon,
};

// 아이콘 안에는 이미 예시 숫자가 박혀 있어서(예: d20 도안 한가운데엔 "20"), 실제 굴림 값을
// 표시해야 하는 자리에는 그 위에 크고 굵은 숫자를 덧그려 가려버린다.
// 평면형 다이스 아이콘 (선택 버튼 / FAB / 풀스크린 결과 모두 이 하나로 크기만 바꿔서 재사용).
const DiceShape = ({ sides, value, size = 40, glow = false }) => {
  const badgeIcon = DICE_BADGE_ICONS[sides];

  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <div
        aria-hidden="true"
        className="absolute inset-0"
        style={{
          background: `linear-gradient(135deg, var(--accent-color, ${DICE_ACCENT}) 0%, var(--highlight, ${DICE_HIGHLIGHT}) 100%)`,
          WebkitMaskImage: `url(${badgeIcon})`,
          maskImage: `url(${badgeIcon})`,
          WebkitMaskSize: "contain",
          maskSize: "contain",
          WebkitMaskRepeat: "no-repeat",
          maskRepeat: "no-repeat",
          WebkitMaskPosition: "center",
          maskPosition: "center",
          filter: glow ? "drop-shadow(0 6px 16px rgba(0,0,0,0.5))" : "none",
        }}
      />
      {value !== "" && (
        <div
          className="absolute inset-0 flex items-center justify-center font-black text-white"
          style={{
            fontSize: size * 0.34,
            textShadow: "0 2px 5px rgba(0,0,0,0.75), 0 0 14px rgba(0,0,0,0.6)",
          }}
        >
          {value}
        </div>
      )}
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

// 🔥 "재가 되어 흩날리기" 연출 전용 - 정사각형 아이콘 영역을 정중앙 한 점에서 바깥 테두리로
// 뻗어나가는 6조각(파이 모양)으로 쪼갠 clip-path. 원본 정사각형을 빈틈없이 덮는 삼각형들이라,
// 조각마다 따로 날아가도 "하나의 아이콘이 깨져서 흩어진" 것처럼 보인다.
const DICE_SHARD_CLIPS = [
  "polygon(50% 50%, 0% 0%, 66.7% 0%)",
  "polygon(50% 50%, 66.7% 0%, 100% 33.3%)",
  "polygon(50% 50%, 100% 33.3%, 100% 100%)",
  "polygon(50% 50%, 100% 100%, 33.3% 100%)",
  "polygon(50% 50%, 33.3% 100%, 0% 66.7%)",
  "polygon(50% 50%, 0% 66.7%, 0% 0%)",
];

// 🔥 주사위 아이콘 하나가 "파사삭" 조각나서 사방으로 튀며 사라지는 연출. 원본 아이콘은 아주
// 짧게(0.35s) 잔상처럼 남았다 사라지고, 그 위로 같은 마스크 이미지를 6조각으로 쪼갠 파편들이
// 저마다 다른 방향으로 회전하며 튀어나가 흩어진다 - 진짜로 깨져 나가는 느낌을 주는 핵심.
const DiceShatter = ({ sides, value, size = 40, glow = false }) => {
  const badgeIcon = DICE_BADGE_ICONS[sides];
  const shards = useMemo(
    () =>
      DICE_SHARD_CLIPS.map((clip) => ({
        clip,
        dx: (Math.random() - 0.5) * size * 3.2,
        dy: (Math.random() - 0.5) * size * 3.2 - size * 0.5, // 살짝 위로 튀는 편향
        rot: (Math.random() - 0.5) * 320,
        delay: Math.random() * 70,
      })),
    [size],
  );

  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <div className="absolute inset-0 cs-dice-shatter-fade">
        <DiceShape sides={sides} value={value} size={size} glow={glow} />
      </div>
      {shards.map((s, i) => (
        <div
          key={i}
          aria-hidden="true"
          className="absolute inset-0 cs-dice-shard"
          style={{
            clipPath: s.clip,
            WebkitClipPath: s.clip,
            background: `linear-gradient(135deg, var(--accent-color, ${DICE_ACCENT}) 0%, var(--highlight, ${DICE_HIGHLIGHT}) 100%)`,
            WebkitMaskImage: `url(${badgeIcon})`,
            maskImage: `url(${badgeIcon})`,
            WebkitMaskSize: "contain",
            maskSize: "contain",
            WebkitMaskRepeat: "no-repeat",
            maskRepeat: "no-repeat",
            WebkitMaskPosition: "center",
            maskPosition: "center",
            filter: glow ? "drop-shadow(0 4px 10px rgba(0,0,0,0.5))" : "none",
            animationDelay: `${s.delay}ms`,
            "--shard-dx": `${s.dx}px`,
            "--shard-dy": `${s.dy}px`,
            "--shard-rot": `${s.rot}deg`,
          }}
        />
      ))}
    </div>
  );
};

// 🔥 화면 여기저기서 작은 잉걸불/재 입자가 위쪽으로 흩날리며 사라지는 파티클. 결과 카드 위의
// 조각난 아이콘들 뒤로는 카드 근처에만(좁은 범위) 흩뿌리고, 실제로 화면에 널브러져 있던 물리
// 주사위들 쪽(canvas-root 위)에는 화면 전체(넓은 범위)에 흩뿌려서 "저기 굴러다니던 진짜 주사위도
// 같이 재가 되어 날아간다"는 느낌을 준다 - 그래서 범위를 xMin~xMax/yMin~yMax(%)로 받는다.
// 매 굴림(마운트)마다 useMemo로 한 번만 랜덤 좌표를 뽑아 리렌더 중 위치가 튀지 않게 한다.
const AshBurst = ({ count = 22, xMin = 20, xMax = 80, yMin = 28, yMax = 68 }) => {
  const particles = useMemo(
    () =>
      Array.from({ length: count }, (_, i) => ({
        id: i,
        left: xMin + Math.random() * (xMax - xMin), // %
        top: yMin + Math.random() * (yMax - yMin), // %
        size: 4 + Math.random() * 7, // px
        driftX: (Math.random() - 0.5) * 46, // vw
        driftY: 22 + Math.random() * 34, // vh (위로 뜨는 거리)
        delay: 150 + Math.random() * 300, // ms - 조각이 튄 다음에 뒤따라 피어오르도록 살짝 늦게 시작
        ember: Math.random() < 0.55,
      })),
    [count, xMin, xMax, yMin, yMax],
  );

  return (
    <div className="cs-ash-burst" aria-hidden="true">
      {particles.map((p) => (
        <span
          key={p.id}
          className="cs-ash-mote"
          style={{
            left: `${p.left}%`,
            top: `${p.top}%`,
            width: p.size,
            height: p.size,
            background: p.ember
              ? "radial-gradient(circle, rgba(255,186,110,0.95) 0%, rgba(120,55,20,0.6) 55%, transparent 100%)"
              : "radial-gradient(circle, rgba(200,196,190,0.9) 0%, rgba(70,66,62,0.55) 60%, transparent 100%)",
            animationDelay: `${p.delay}ms`,
            "--ash-mx": `${p.driftX}vw`,
            "--ash-my": `-${p.driftY}vh`,
          }}
        />
      ))}
    </div>
  );
};

// 🌀 "소용돌이로 빨려들기" 연출 전용 - 개별 주사위 아이콘은 화면 위 각자 다른 위치에 떠 있어서,
// 그 아이콘 자신의 애니메이션만으로는 "여러 개가 한 점으로 빨려든다"는 진짜 소용돌이를 만들 수
// 없다(각자 제자리에서만 움직이므로). 그래서 아이콘은 그냥 제자리에서 빙글빙글 돌며 줄어들게만
// 하고("빨려 들어가는 대상"), 실제 "소용돌이"라는 인상은 VortexBurst(아래)가 만든다.
const makeVortexVars = () => ({
  "--vspin": `${(Math.random() < 0.5 ? -1 : 1) * (600 + Math.random() * 360)}deg`,
});

// 🌀 화면 정중앙 한 점으로 실제로 빨려들어가는 빛줄기들. 모든 빛줄기가 정확히 같은 기준점
// (뷰포트 정중앙)에서 뻗어나가므로 - 개별 주사위와 달리 - 반지름이 0으로 줄어드는 애니메이션이
// "사방에서 한 점으로 빨려든다"는 소용돌이를 실제로/수학적으로 만들어준다. 그래서 이 컴포넌트가
// vortex 연출이 "그럴듯해 보이는지"를 좌우하는 핵심이다.
const VORTEX_MOTE_COUNT = 18;
const VortexBurst = () => {
  const motes = useMemo(
    () =>
      Array.from({ length: VORTEX_MOTE_COUNT }, (_, i) => ({
        id: i,
        length: 16 + Math.random() * 26,
        delay: Math.random() * 180,
        angle: Math.random() * 360,
        radius: 120 + Math.random() * 170,
        spin: (Math.random() < 0.5 ? -1 : 1) * (480 + Math.random() * 360),
      })),
    [],
  );

  return (
    <div className="cs-vortex-burst" aria-hidden="true">
      {motes.map((m) => (
        <span
          key={m.id}
          className="cs-vortex-mote"
          style={{
            width: m.length,
            animationDelay: `${m.delay}ms`,
            "--vb-a0": `${m.angle}deg`,
            "--vb-r0": `${m.radius}px`,
            "--vb-spin": `${m.spin}deg`,
          }}
        />
      ))}
    </div>
  );
};

// 🎲 굴림이 끝나는 순간의 결과를 화면 전체에 크게 띄웠다가, 설정에서 고른 연출(effect)에 맞춰
// (실제로 널브러져 있던 물리 주사위들과 나란히) 회수되어 사라지는 풀스크린 오버레이.
// effect: "hand"(기본, 손이 쓸어감) | "ash"(파사삭 부서져 재로 흩날림) | "vortex"(휘몰아치며 빨려듦) | "fade"(은은하게 페이드)
const DiceResultOverlay = ({ overlay, effect = "hand", colorVars }) => {
  const { mode, phase, sides, value, results, total, text } = overlay;
  const exiting = phase === "exit";
  const isAsh = effect === "ash";
  const isVortex = effect === "vortex";
  const isFade = effect === "fade";

  // 결과 카드(합계/문구 포함) 전체가 퇴장할 때 어떤 애니메이션을 탈지 - 손 연출만 기존 클래스 그대로 유지.
  const resultExitClass = isAsh
    ? "cs-result-swipe-out"
    : isVortex
      ? "cs-result-vortex-out"
      : isFade
        ? "cs-result-fade-out"
        : "cs-result-collected";

  // 소용돌이 연출용 개별 주사위 회전 방향(시계/반시계)/반지름 - results 배열 레퍼런스가 살아있는
  // 한(같은 굴림) 유지되어야 하므로 useMemo에 results를 키로 건다(enter→exit 전환 시 재계산되지 않게).
  const groupVortexVars = useMemo(
    () => (results || []).map(() => makeVortexVars()),
    [results],
  );
  const singleVortexVars = useMemo(() => makeVortexVars(), [sides, value]);

  return (
    <div
      className={`fixed inset-0 z-[10001] flex items-center justify-center pointer-events-none ${exiting ? "cs-overlay-backdrop-out" : "cs-overlay-backdrop-in"}`}
      style={colorVars}
    >
      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(circle at 50% 45%, rgba(0,0,0,0.6) 0%, rgba(0,0,0,0.25) 55%, rgba(0,0,0,0) 78%)",
        }}
      />

      <div
        className={`relative flex flex-col items-center gap-5 px-6 ${exiting ? resultExitClass : "cs-result-enter"}`}
        style={resultTheme(text)}
      >
        {mode === "group" ? (
          <>
            <span className="text-sm font-bold tracking-widest uppercase text-white/80">
              🎲 {results.length}개 굴림
            </span>
            <div className="flex flex-wrap justify-center gap-3 max-w-[92vw]">
              {results.map((r, i) => {
                const vortexNow = exiting && isVortex;
                const v = groupVortexVars[i];
                return (
                  <div
                    key={i}
                    className={vortexNow ? "cs-dice-vortex-spin-out" : "cs-result-chip-pop"}
                    style={{
                      animationDelay: exiting ? `${i * 45}ms` : `${i * 70}ms`,
                      ...(vortexNow ? v : null),
                    }}
                  >
                    {exiting && isAsh ? (
                      <DiceShatter sides={r.sides} value={r.value} size={68} glow />
                    ) : (
                      <DiceShape
                        sides={r.sides}
                        value={r.value}
                        size={68}
                        glow
                        gradientId={`cs-ov-chip-${i}`}
                      />
                    )}
                  </div>
                );
              })}
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
          <div
            className={exiting && isVortex ? "cs-dice-vortex-spin-out" : undefined}
            style={exiting && isVortex ? singleVortexVars : undefined}
          >
            {exiting && isAsh ? (
              <DiceShatter sides={sides} value={value} size={220} glow />
            ) : (
              <DiceShape
                sides={sides}
                value={value}
                size={220}
                glow
                gradientId="cs-ov-single"
              />
            )}
          </div>
        )}

        {text && (
          <div
            className="max-w-[90vw] rounded-full px-6 py-2.5 text-center text-base sm:text-xl font-extrabold text-white"
            style={{
              // iOS(WebKit)에서 backdrop-filter가 유독 무거워서 뺐다 - 대신 배경을 좀 더 진하게 해서 가독성 보완
              background: "rgba(10,10,16,0.78)",
              border: "1px solid rgba(255,255,255,0.25)",
            }}
          >
            {text}
          </div>
        )}
      </div>

      {exiting && effect === "hand" && (
        <div className="cs-hand-collect" aria-hidden="true">
          <span className="cs-hand-open">🖐️</span>
          <span className="cs-hand-fist">✊</span>
        </div>
      )}
      {exiting && isAsh && <AshBurst count={22} xMin={20} xMax={80} yMin={28} yMax={68} />}
      {exiting && isVortex && (
        <>
          <div className="cs-vortex-ring" aria-hidden="true" />
          <VortexBurst />
        </>
      )}
      {/* "fade"는 별도 장식 없이 결과/주사위 자체만 조용히 사라진다 */}
    </div>
  );
};

// 🎲 화면 전체를 덮는 실제 3D 물리 주사위 캔버스 + 사이트 전역 상단 플로팅 버튼/트레이.
// Layout에 한 번만 마운트되어 props 없이 완전히 독립적으로 동작한다.
const DicePanel = () => {
  // ⚠️ 예전엔 이 컴포넌트가 마운트되자마자(=사이트 어느 화면을 열든 무조건) WebGL 3D 엔진 +
  // WASM 물리엔진(Ammo.js) + 에셋을 미리 로드했다. 그런데 이 컴포넌트는 Layout에 전역으로 항상
  // 떠 있어서, 주사위를 한 번도 안 쓰는 화면(홈 화면 등)에서도 매번 무거운 WebGL 컨텍스트가
  // 켜지는 셈이었다 — 특히 iOS(WebKit)에서 로딩 지연/발열/렌더링 이슈의 큰 원인이 된다.
  // 이제는 사용자가 실제로 주사위 트레이를 펼칠 때(handleFabClick)만 미리 준비를 시작한다.
  const [expanded, setExpanded] = useState(false);
  const [diceQueue, setDiceQueue] = useState(EMPTY_QUEUE);
  // 🔒 "지금 뭔가 물리적으로 굴러가는 중이다"는 이 컴포넌트만의 상태가 아니라 dice3DEngine이
  // 전역으로 관리한다 - 캐릭터 시트의 능력 체크 판정처럼 다른 트리에서 굴린 것까지 포함해서,
  // 뭔가 굴러가는 동안엔 이 트레이의 버튼도 같이 비활성화되어야 "먼저 굴림이 안 끝났는데 여기서
  // 또 눌러서 끼어드는" 상황이 안 생긴다. 초기값은 이 컴포넌트가 마운트되기 전에 이미 다른
  // 곳에서 굴림이 시작돼 있을 극히 드문 경우까지 대비해 isDiceRollInProgress()로 잡는다.
  const [isRolling, setIsRolling] = useState(isDiceRollInProgress);
  useEffect(() => {
    const onRollingChange = (e) => setIsRolling(!!e.detail?.isRolling);
    window.addEventListener(DICE_ROLLING_EVENT, onRollingChange);
    return () => window.removeEventListener(DICE_ROLLING_EVENT, onRollingChange);
  }, []);
  const [overlay, setOverlay] = useState(null); // { mode, phase, sides, value, results, total, text }
  // 🖐️/🔥/🌀/✨ 결과가 회수되어 사라지는 연출 - 설정 화면(SettingsScreen)에서 바꾸며,
  // 이미 이 위젯이 떠 있는 동안 바뀌어도 DICE_RESULT_EFFECT_EVENT를 받아 다음 굴림부터 바로 반영된다.
  const [resultEffect, setResultEffect] = useState(getDiceResultEffect);
  useEffect(() => {
    const onEffectChange = (e) => setResultEffect(e.detail?.effect || "hand");
    window.addEventListener(DICE_RESULT_EFFECT_EVENT, onEffectChange);
    return () =>
      window.removeEventListener(DICE_RESULT_EFFECT_EVENT, onEffectChange);
  }, []);
  // 🎨 주사위 색상(2D 아이콘 + 실제 3D 물리 주사위 모두) - 마찬가지로 설정 화면에서 바꾸면
  // DICE_COLOR_EVENT로 즉시 반영된다. DiceShape는 --accent-color/--highlight CSS 변수를 읽으므로
  // 여기서는 그 변수를 트레이/오버레이 루트에 꽂아주기만 하면 된다.
  const [diceColor, setDiceColorState] = useState(getDiceColor);
  useEffect(() => {
    const onColorChange = (e) => e.detail && setDiceColorState(e.detail);
    window.addEventListener(DICE_COLOR_EVENT, onColorChange);
    return () => window.removeEventListener(DICE_COLOR_EVENT, onColorChange);
  }, []);
  const diceColorVars = {
    "--accent-color": diceColor.accent,
    "--highlight": diceColor.highlight,
  };
  const [fabPosition, setFabPosition] = useState(loadFabPosition); // { top, left } - 드래그로 옮긴 FAB 위치
  const timersRef = useRef([]);

  // 🖐️ FAB 드래그 상태 - 리렌더를 유발하지 않는 ref로 추적 (moved는 클릭과 드래그를 구분하는 데 쓰인다)
  const fabDragRef = useRef({
    dragging: false,
    moved: false,
    startX: 0,
    startY: 0,
    startTop: 0,
    startLeft: 0,
  });

  // 화면 크기가 바뀌면(브라우저 창 리사이즈, 기기 회전 등) 저장된 위치가 화면 밖으로 나가지 않도록 다시 클램프
  useEffect(() => {
    const handleResize = () =>
      setFabPosition((prev) => clampFabPosition(prev));
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const handleFabDragMove = useCallback((e) => {
    const state = fabDragRef.current;
    if (!state.dragging) return;
    const point = e.touches ? e.touches[0] : e;
    if (!point) return;
    const dx = point.clientX - state.startX;
    const dy = point.clientY - state.startY;

    if (!state.moved && Math.hypot(dx, dy) > FAB_DRAG_THRESHOLD) {
      state.moved = true;
    }
    if (state.moved) {
      if (e.cancelable) e.preventDefault(); // 드래그 중엔 페이지 스크롤/당겨서 새로고침 방지
      setFabPosition(
        clampFabPosition({ top: state.startTop + dy, left: state.startLeft + dx }),
      );
    }
  }, []);

  const handleFabDragEnd = useCallback(() => {
    const state = fabDragRef.current;
    window.removeEventListener("mousemove", handleFabDragMove);
    window.removeEventListener("mouseup", handleFabDragEnd);
    window.removeEventListener("touchmove", handleFabDragMove);
    window.removeEventListener("touchend", handleFabDragEnd);

    if (state.moved) {
      setFabPosition((prev) => {
        try {
          window.localStorage.setItem(FAB_POSITION_STORAGE, JSON.stringify(prev));
        } catch (e) {
          // localStorage 접근 불가 시 위치는 이번 세션 동안만 유지
        }
        return prev;
      });
    }
    state.dragging = false;
    // click 이벤트는 mouseup/touchend 직후 같은 틱에서 동기적으로 뒤따라오므로,
    // moved 리셋은 다음 틱(setTimeout 0)으로 미뤄서 그 click 핸들러가 "방금 드래그였다"를 볼 수 있게 한다.
    setTimeout(() => {
      state.moved = false;
    }, 0);
  }, [handleFabDragMove]);

  const handleFabDragStart = useCallback(
    (e) => {
      const point = e.touches ? e.touches[0] : e;
      if (!point) return;
      fabDragRef.current = {
        dragging: true,
        moved: false,
        startX: point.clientX,
        startY: point.clientY,
        startTop: fabPosition.top,
        startLeft: fabPosition.left,
      };
      window.addEventListener("mousemove", handleFabDragMove);
      window.addEventListener("mouseup", handleFabDragEnd);
      window.addEventListener("touchmove", handleFabDragMove, { passive: false });
      window.addEventListener("touchend", handleFabDragEnd);
    },
    [fabPosition, handleFabDragMove, handleFabDragEnd],
  );

  // 드래그 직후에 뒤따라오는 클릭은 무시해서, FAB을 옮기고 손을 뗐을 때 트레이가 실수로 열리지 않게 한다.
  // 트레이를 "여는" 순간에만 3D 엔진 준비를 시작한다 - 주사위를 안 쓰는 화면/방문에서는 절대 로드되지 않는다.
  const handleFabClick = () => {
    if (fabDragRef.current.moved) return;
    setExpanded((v) => {
      const next = !v;
      if (next) getDiceBox(DICE_BOX_SELECTOR).catch(() => {});
      return next;
    });
  };

  // 언마운트 시(드래그 도중 화면 전환 등) 전역 리스너가 남지 않도록 정리 - 언마운트 후 setState는 하지 않는다
  useEffect(
    () => () => {
      window.removeEventListener("mousemove", handleFabDragMove);
      window.removeEventListener("mouseup", handleFabDragEnd);
      window.removeEventListener("touchmove", handleFabDragMove);
      window.removeEventListener("touchend", handleFabDragEnd);
    },
    [handleFabDragMove, handleFabDragEnd],
  );

  const clearTimers = useCallback(() => {
    timersRef.current.forEach(clearTimeout);
    timersRef.current = [];
  }, []);
  useEffect(() => () => clearTimers(), [clearTimers]);

  // 결과를 화면 전체에 띄웠다가, 잠시 후 손이 화면을 가로지르는 타이밍에 맞춰 실제 물리 캔버스도
  // 함께 비운다(clearDiceBox) — 이게 "던져진 주사위가 영원히 안 사라지던" 문제의 실제 해결책이다.
  //
  // ⚠️ 이 함수가 "굴림 사이클"의 끝을 결정한다(endDiceCycle). 오버레이가 화면에서 완전히
  // 사라지고 물리 캔버스도 다 치워진 뒤에야 endDiceCycle을 호출해서 버튼들이 다시 눌리게
  // 한다 - 그 전에 풀어버리면, 결과가 아직 보이는 동안 다음 굴림이 시작되고 그게 여기 다시
  // 들어와 clearTimers()로 앞선 굴림의 정리 예약을 통째로 지워버려서(앞선 결과는 영원히 안
  // 치워지고, 나중에 손이 쓸어갈 땐 그 사이 새로 굴려진 주사위까지 같이 쓸려나가는) 문제가
  // 있었다. 지금은 beginDiceCycle()이 먼저 호출돼 있지 않으면 애초에 새 굴림을 시작할 수 없으므로
  // (버튼이 비활성화됨) presentResult가 사이클 도중에 다시 호출될 일 자체가 없다.
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
            setTimeout(() => {
              setOverlay(null);
              endDiceCycle();
            }, RESULT_EXIT_MS),
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
    // isDiceRollInProgress()는 모듈 변수를 즉시(동기적으로) 읽으므로, React state(isRolling)가
    // 아직 리렌더로 반영되기 전의 아주 짧은 틈(연타)까지도 확실하게 막아준다.
    if (entries.length === 0 || isDiceRollInProgress()) return;

    setExpanded(false);
    beginDiceCycle(); // 결과가 다 표시되고 치워질 때까지(endDiceCycle, presentResult 안) 버튼이 잠긴다

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

  // 📦 선택 트레이는 FAB이 화면 어디로 옮겨지든 항상 그 옆(화면 안쪽 방향)에 붙어서 펼쳐지도록,
  // FAB이 화면 아래쪽/오른쪽에 있으면 각각 위쪽/왼쪽으로 열리게 방향을 계산한다.
  const trayOpenUp = fabPosition.top + FAB_SIZE / 2 > window.innerHeight / 2;
  const trayAlignRight = fabPosition.left + FAB_SIZE / 2 > window.innerWidth / 2;
  const trayStyle = {
    ...diceColorVars, // 트레이 안의 DiceShape들도 같은 커스텀 색을 쓰도록 CSS 변수를 여기서 꽂아준다
    borderColor: diceColor.accent,
    background: "rgba(15,17,26,0.92)", // 이미 거의 불투명이라 backdrop-filter는 안 써도 티가 안 나서 뺐다(iOS 부담만 줄어듦)
    boxShadow: "0 12px 40px rgba(0,0,0,0.55)",
    ...(trayOpenUp
      ? { bottom: Math.max(8, window.innerHeight - fabPosition.top + 10) }
      : { top: fabPosition.top + FAB_SIZE + 10 }),
    ...(trayAlignRight
      ? { right: Math.max(8, window.innerWidth - fabPosition.left - FAB_SIZE) }
      : { left: Math.max(8, fabPosition.left) }),
  };
  const trayOriginClass = trayOpenUp
    ? trayAlignRight
      ? "origin-bottom-right"
      : "origin-bottom-left"
    : trayAlignRight
      ? "origin-top-right"
      : "origin-top-left";
  const trayHiddenTranslateClass = trayOpenUp ? "translate-y-3" : "-translate-y-3";

  // 🎲→💨 실제로 화면을 굴러다니다 착지한 "진짜" 물리 주사위(WebGL 캔버스) 쪽에도 결과 카드와
  // 같은 순간(phase === "exit")에 같은 연출을 입힌다. clearDiceBox()가 실제로 캔버스를 비우는
  // CLEAR_AT_MS 시점보다 애니메이션이 살짝 길어서, "뚝 끊기듯 사라진다"가 아니라 "저기 굴러다니던
  // 주사위가 진짜로 삭아 없어진다"는 착시가 만들어진다. "hand"는 기존 손 연출 자체가 이미 그
  // 순간을 가려주므로 별도 처리가 필요 없다.
  const physicalExiting = overlay?.phase === "exit";
  const physicalEffectClass = physicalExiting
    ? resultEffect === "ash"
      ? "cs-physical-dice-crumble"
      : resultEffect === "vortex"
        ? "cs-physical-dice-vortex"
        : resultEffect === "fade"
          ? "cs-physical-dice-fade"
          : ""
    : "";

  return (
    <>
      {createPortal(
        <div
          id="cs-dice-box-canvas-root"
          className={`pointer-events-none fixed inset-0 z-[10000] ${physicalEffectClass}`}
          aria-hidden="true"
        />,
        document.body,
      )}

      {/* 🔥/🌀 진짜 물리 주사위들 위에 겹치는 파티클 - canvas-root와 같은 z축에 있되 이 포탈 호출이
          코드상 더 뒤에 있어서(= DOM에서 더 나중에 붙어서) 캔버스 위에 그려진다. */}
      {physicalExiting &&
        resultEffect === "ash" &&
        createPortal(
          <div className="pointer-events-none fixed inset-0 z-[10000]" aria-hidden="true">
            <AshBurst count={40} xMin={4} xMax={96} yMin={6} yMax={94} />
          </div>,
          document.body,
        )}
      {physicalExiting &&
        resultEffect === "vortex" &&
        createPortal(
          <div className="pointer-events-none fixed inset-0 z-[10000]" aria-hidden="true">
            <VortexBurst />
          </div>,
          document.body,
        )}

      {overlay &&
        createPortal(
          <DiceResultOverlay
            overlay={overlay}
            effect={resultEffect}
            colorVars={diceColorVars}
          />,
          document.body,
        )}

      {/* 트레이가 펼쳐졌을 때 바깥을 탭하면 접히는 투명 백드롭 */}
      {expanded && (
        <div
          className="fixed inset-0 z-[9997]"
          onClick={() => setExpanded(false)}
          aria-hidden="true"
        />
      )}

      {/* 펼쳐지는 선택 트레이 — FAB이 화면 어디에 있든 그 옆(화면 안쪽)으로 펼쳐진다 */}
      <div
        className={`fixed z-[9998] w-[min(320px,calc(100vw-2rem))] ${trayOriginClass} rounded-2xl border-2 px-3 py-3 transition-all duration-300 ${
          expanded
            ? "opacity-100 scale-100 translate-y-0"
            : `pointer-events-none opacity-0 scale-90 ${trayHiddenTranslateClass}`
        }`}
        style={trayStyle}
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
                style={count > 0 ? { borderColor: diceColor.accent } : undefined}
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
                    color: count > 0 ? diceColor.accent : "rgba(255,255,255,0.6)",
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
                    style={{ background: diceColor.highlight }}
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

      {/* 🖐️ 플로팅 버튼(FAB) — 사이트 어느 화면에 있든 항상 떠 있고, 화면 아무 데나 드래그해서 옮길 수 있다 */}
      <button
        onClick={handleFabClick}
        onMouseDown={handleFabDragStart}
        onTouchStart={handleFabDragStart}
        className="fixed z-[9999] flex h-16 w-16 touch-none select-none items-center justify-center rounded-full border-2 text-white transition-transform active:scale-90 active:cursor-grabbing"
        style={{
          top: fabPosition.top,
          left: fabPosition.left,
          cursor: "grab",
          borderColor: "rgba(255,255,255,0.35)",
          background: FAB_GRADIENT,
          boxShadow: expanded
            ? "0 0 0 6px rgba(255,255,255,0.08), 0 10px 30px rgba(0,0,0,0.5)"
            : "0 10px 30px rgba(0,0,0,0.5)",
        }}
        title="주사위 굴리기 (드래그하면 위치를 옮길 수 있어요)"
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

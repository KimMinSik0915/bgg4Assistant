/**
 * diceEffectSettings : 주사위 굴림 결과가 화면에서 "치워지는" 연출(퇴장 이펙트)을 사용자가
 * 설정 화면에서 고를 수 있게 해주는 아주 작은 설정 저장소.
 *
 * DicePanel(풀스크린 결과 오버레이)과 설정 화면(SettingsScreen)이 서로 다른 트리에 있어서,
 * dice3DEngine.js의 DICE_RESULT_EVENT와 같은 패턴으로 localStorage + window 커스텀 이벤트를
 * 함께 써서 "설정에서 바꾸는 즉시" 이미 떠 있는 DicePanel도 다음 굴림부터 새 연출을 쓰도록 한다.
 */

// 각 id는 DiceResultOverlay(DicePanel.jsx)와 characterSheet.css의 cs-result-* / cs-*-collect
// 애니메이션 클래스 이름과 1:1로 대응한다.
export const DICE_RESULT_EFFECTS = [
  {
    id: "hand",
    emoji: "🖐️",
    label: "손이 쓸어가기",
    desc: "화면을 대각선으로 가로지르는 손이 결과와 주사위를 통째로 회수해간다 (기본값)",
  },
  {
    id: "ash",
    emoji: "🔥",
    label: "재가 되어 흩날리기",
    desc: "결과는 옆으로 쓱 사라지고, 주사위는 파사삭 재가 되어 날아간다",
  },
  {
    id: "vortex",
    emoji: "🌀",
    label: "소용돌이로 빨려들기",
    desc: "결과와 주사위가 빙글빙글 돌며 작은 빛의 소용돌이 속으로 빨려 들어간다",
  },
  {
    id: "fade",
    emoji: "✨",
    label: "은은하게 사라지기",
    desc: "화려한 연출 없이 결과와 주사위가 위로 살짝 떠오르며 조용히 사라진다 (저사양 기기에 추천)",
  },
];

const VALID_IDS = new Set(DICE_RESULT_EFFECTS.map((e) => e.id));
export const DEFAULT_DICE_RESULT_EFFECT = "hand";
const STORAGE_KEY = "cs_dice_result_effect";

export const DICE_RESULT_EFFECT_EVENT = "cs-dice-result-effect-change";

export const getDiceResultEffect = () => {
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    return VALID_IDS.has(stored) ? stored : DEFAULT_DICE_RESULT_EFFECT;
  } catch (e) {
    return DEFAULT_DICE_RESULT_EFFECT;
  }
};

export const setDiceResultEffect = (id) => {
  const next = VALID_IDS.has(id) ? id : DEFAULT_DICE_RESULT_EFFECT;
  try {
    window.localStorage.setItem(STORAGE_KEY, next);
  } catch (e) {
    // localStorage 접근 불가 시 이번 세션 동안만(이벤트로 전파되는 값) 적용된다
  }
  window.dispatchEvent(
    new CustomEvent(DICE_RESULT_EFFECT_EVENT, { detail: { effect: next } }),
  );
  return next;
};

// ===== 주사위 색상 =====
// 2D 아이콘(DiceShape의 그라디언트 - `--accent-color`/`--highlight` CSS 변수)과 실제 3D 물리
// 주사위(dice-box의 themeColor) 양쪽 모두 이 값을 따른다. accent가 주 색상, highlight는 그라디언트
// 보조색(자동으로 밝게 섞어 계산하거나, 프리셋은 미리 손으로 골라둔 값을 쓴다).
const clampByte = (n) => Math.max(0, Math.min(255, Math.round(n)));

// 임의의 hex 색을 흰색 쪽으로 amount(0~1)만큼 섞어서 그라디언트용 밝은 보조색을 만든다.
export const lightenHex = (hex, amount = 0.35) => {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex || "");
  if (!m) return hex;
  const num = parseInt(m[1], 16);
  const r = clampByte(((num >> 16) & 0xff) + (255 - ((num >> 16) & 0xff)) * amount);
  const g = clampByte(((num >> 8) & 0xff) + (255 - ((num >> 8) & 0xff)) * amount);
  const b = clampByte((num & 0xff) + (255 - (num & 0xff)) * amount);
  return `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`;
};

export const DICE_COLOR_PRESETS = [
  { id: "cyan", label: "시안 (기본)", accent: "#22d3ee", highlight: "#818cf8" },
  { id: "pink", label: "핑크", accent: "#ec4899", highlight: "#f9a8d4" },
  { id: "purple", label: "퍼플", accent: "#a855f7", highlight: "#e9d5ff" },
  { id: "emerald", label: "에메랄드", accent: "#10b981", highlight: "#6ee7b7" },
  { id: "amber", label: "골드", accent: "#f59e0b", highlight: "#fde68a" },
  { id: "ruby", label: "루비", accent: "#ef4444", highlight: "#fca5a5" },
];
const DEFAULT_DICE_COLOR = DICE_COLOR_PRESETS[0];
const COLOR_STORAGE_KEY = "cs_dice_color";
const HEX_RE = /^#[0-9a-f]{6}$/i;

export const DICE_COLOR_EVENT = "cs-dice-color-change";

// 저장된 값은 { id, accent, highlight } 형태 - 프리셋을 골랐으면 id가 프리셋 id, 커스텀 색을
// 직접 골랐으면 id는 "custom"이고 accent/highlight만 의미가 있다.
export const getDiceColor = () => {
  try {
    const raw = window.localStorage.getItem(COLOR_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && HEX_RE.test(parsed.accent)) {
        return {
          id: parsed.id || "custom",
          accent: parsed.accent,
          highlight: HEX_RE.test(parsed.highlight)
            ? parsed.highlight
            : lightenHex(parsed.accent),
        };
      }
    }
  } catch (e) {
    // localStorage 접근 불가 시 기본색으로 폴백
  }
  return DEFAULT_DICE_COLOR;
};

// presetId(프리셋 id 문자열) 또는 임의의 hex 문자열("#ec4899")을 받는다.
export const setDiceColor = (presetIdOrHex) => {
  const preset = DICE_COLOR_PRESETS.find((p) => p.id === presetIdOrHex);
  const next = preset
    ? preset
    : HEX_RE.test(presetIdOrHex)
      ? { id: "custom", accent: presetIdOrHex, highlight: lightenHex(presetIdOrHex) }
      : DEFAULT_DICE_COLOR;
  try {
    window.localStorage.setItem(COLOR_STORAGE_KEY, JSON.stringify(next));
  } catch (e) {
    // localStorage 접근 불가 시 이번 세션 동안만(이벤트로 전파되는 값) 적용된다
  }
  window.dispatchEvent(new CustomEvent(DICE_COLOR_EVENT, { detail: next }));
  return next;
};

// ===== 주사위 테마 =====
// 실제 3D 물리 주사위(dice-box)에 입힐 메시+텍스처 세트. @3d-dice/dice-themes(공식 배포, MIT
// 라이선스 - 무료로 자유롭게 써도 된다)에 들어있는 테마 중 일부를 public/assets/dice-box/themes/
// 아래 같은 이름 폴더로 그대로 복사해뒀다. `colorable: true`인 테마만 "주사위 색상" 설정이
// 실제로 반영된다 - dice-box 재질 타입이 "standard"인 테마(wooden 등)는 미리 구워진 텍스처를
// 그대로 쓰는 방식이라 색을 입힐 수 없는 게 아니라, "일부러 그 재질 고유의 색(나무색 등)을
// 유지하는" 재질이라 색상 설정과 무관하게 항상 같은 색으로 나온다.
//
// ⚠️ theme은 페이지가 로드될 때 딱 한 번만 읽힌다(dice3DEngine.js 상단 주석 참고). React
// key로 캔버스만 리마운트시켜서 살아있는 세션 안에서 바로 반영해보려 했지만, dice-box(정확히는
// 그 안의 Ammo.js WASM 물리엔진)가 같은 페이지 안에서 두 번째 인스턴스를 만드는 걸 제대로
// 지원하지 못해서 - 캔버스는 새로 생겨도 물리 시뮬레이션이 응답하지 않아 주사위가 아예 안
// 나타나는 - 새로운 버그로 이어졌다. 그래서 이 설정을 바꾸면 SettingsScreen이 페이지를 통째로
// 새로고침한다(setDiceTheme이 직접 하지 않고 호출부가 하게 함 - 데이터 저장 자체는 새로고침과
// 무관하게 항상 즉시 되어야 하므로). 새로고침된 뒤의 "첫" DiceBox 생성이므로 항상 안전하다.
// ⚠️ "gemstone" 테마는 실제로 써보니 주사위 모양 자체가 기괴하게 나와서(다른 테마들은 멀쩡했다)
// 뺐다 - 이 프로젝트의 라이팅/스케일 설정과 잘 안 맞는 것으로 보인다. "gemstoneMarble"도 같은
// 메시 파일(gemstone.json)을 그대로 재사용하는 테마라 - 텍스처만 대리석 무늬로 다를 뿐 모양은
// 똑같이 깨져 보일 게 거의 확실해서 - 함께 뺐다. default-extras/diceOfRolling-fate/genesys/
// genesys2/smooth-pip은 우리가 실제로 굴리는 d4~d20이 아니라 pip·fate·제네시스 전용 특수
// 주사위 세트라(diceAvailable에 d4~d20이 아예 없음) 애초에 쓸 수 없어서 뺐다. 그 외
// @3d-dice/dice-themes에 있는 d4~d20 지원 테마는 전부 넣었다.
export const DICE_THEME_PRESETS = [
  {
    id: "default",
    label: "베이직",
    desc: "매끈하고 불투명한 기본 주사위",
    colorable: true,
  },
  {
    id: "smooth",
    label: "스무스",
    desc: "컷팅 없이 매끈하게 다듬어진 무광 주사위",
    colorable: true,
  },
  {
    id: "rock",
    label: "락",
    desc: "돌처럼 거친 표면의 무광 재질",
    colorable: true,
  },
  {
    id: "rust",
    label: "러스트",
    desc: "녹슨 금속 재질의 거친 질감",
    colorable: true,
  },
  {
    id: "wooden",
    label: "우든",
    desc: "나무 결이 그대로 보이는 원목 주사위 - 미리 구워진 나무 텍스처라 색상 설정과 무관하게 항상 같은 나무색으로 나온다",
    colorable: false,
    swatch: ["#a8764f", "#6b4226"], // 원목 갈색
  },
  {
    id: "blueGreenMetal",
    label: "청록 메탈",
    desc: "청록빛이 감도는 낡은 금속 재질 - 색상 설정과 무관하게 항상 같은 금속색으로 나온다",
    colorable: false,
    swatch: ["#5f9ea0", "#2f4f4f"], // 청록 금속
  },
  {
    id: "diceOfRolling",
    label: "몰디드",
    desc: "매끈하게 성형된 무광 플라스틱 재질 - 색상 설정과 무관하게 항상 같은 색으로 나온다",
    colorable: false,
    swatch: ["#d1d5db", "#6b7280"], // 무광 플라스틱 그레이
  },
];
const THEME_IDS = new Set(DICE_THEME_PRESETS.map((t) => t.id));
const DEFAULT_DICE_THEME = DICE_THEME_PRESETS[0];
const THEME_STORAGE_KEY = "cs_dice_theme";

export const DICE_THEME_EVENT = "cs-dice-theme-change";

export const getDiceTheme = () => {
  try {
    const stored = window.localStorage.getItem(THEME_STORAGE_KEY);
    return THEME_IDS.has(stored)
      ? DICE_THEME_PRESETS.find((t) => t.id === stored)
      : DEFAULT_DICE_THEME;
  } catch (e) {
    return DEFAULT_DICE_THEME;
  }
};

export const setDiceTheme = (id) => {
  const next = DICE_THEME_PRESETS.find((t) => t.id === id) || DEFAULT_DICE_THEME;
  try {
    window.localStorage.setItem(THEME_STORAGE_KEY, next.id);
  } catch (e) {
    // localStorage 접근 불가 시 이번 세션 동안만(이벤트로 전파되는 값) 적용된다
  }
  window.dispatchEvent(new CustomEvent(DICE_THEME_EVENT, { detail: next }));
  return next;
};

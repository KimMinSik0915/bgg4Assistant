import { Component } from "react";
import { ArrowLeft, SettingsIcon, KeyRound, Sparkles, Github, Layers, Dices, Palette, Box } from "lucide-react";
import withNavigate from "../../utils/withNavigate";
import {
    DICE_RESULT_EFFECTS,
    getDiceResultEffect,
    setDiceResultEffect,
    DICE_COLOR_PRESETS,
    getDiceColor,
    setDiceColor,
    DICE_THEME_PRESETS,
    getDiceTheme,
    setDiceTheme,
} from "../../characterSheet/service/diceEffectSettings";

const bgg4AssistantIcoPath = "/bgg4Assistant_ico.webp";

const techStack = [
    { label: 'React 18' }
  , { label: 'React Router 6' }
  , { label: 'Tailwind CSS' }
  , { label: 'lucide-react' }
  , { label: 'Gemini API' }
];

/**
 * @Author : 김민식
 * SettingsScreen : 앱 정보 및 AI GM 안내, 주사위 관련 설정을 모아둔 설정 페이지
 */
class SettingsScreen extends Component {

    state = {
        diceResultEffect: getDiceResultEffect(),
        diceColor: getDiceColor(),
        diceTheme: getDiceTheme(),
        diceThemeReloading: false,
    };

    constructor(props) {
        super(props);
    }

    handleSelectDiceEffect = (id) => {
        const applied = setDiceResultEffect(id);
        this.setState({ diceResultEffect: applied });
    };

    handleSelectDiceColor = (presetIdOrHex) => {
        const applied = setDiceColor(presetIdOrHex);
        this.setState({ diceColor: applied });
    };

    // 3D 물리 주사위(dice-box)는 페이지가 로드될 때 딱 한 번만 theme을 읽는다 - 이미 떠 있는
    // 세션 안에서 theme만 바꿔치기해봤더니 물리 엔진이 응답을 멈추는 버그가 있었다
    // (dice3DEngine.js 상단 주석 참고). 그래서 여기서는 설정만 저장해두고 실제로 페이지를
    // 새로고침해서, 다음 로드가 처음부터 새 theme으로 시작하게 한다 - 사용자가 수동으로
    // 새로고침해서 고쳤던 것과 정확히 같은 방식. 고른 게 눈에 보이게 아주 짧게 하이라이트를
    // 띄운 뒤 새로고침한다.
    handleSelectDiceTheme = (id) => {
        if (this.state.diceTheme.id === id || this.state.diceThemeReloading) return;
        const applied = setDiceTheme(id);
        this.setState({ diceTheme: applied, diceThemeReloading: true });
        window.setTimeout(() => window.location.reload(), 350);
    };

    render() {
        return (
            <div className="relative bg-slate-950">
                <div className="pointer-events-none absolute inset-0 overflow-hidden">
                    <div className="absolute -top-32 left-1/4 h-96 w-96 rounded-full bg-cyan-500/10 blur-[120px]" />
                    <div className="absolute bottom-0 right-0 h-96 w-96 rounded-full bg-indigo-600/10 blur-[120px]" />
                </div>

                <div className="relative container mx-auto max-w-2xl px-4 py-8 sm:px-6 sm:py-12">
                    <button
                        onClick={() => this.props.navigate('/')}
                        className="mb-6 flex items-center gap-1.5 text-sm text-slate-400 transition hover:text-cyan-300"
                    >
                        <ArrowLeft size={16}/> 홈으로
                    </button>

                    <div className="mb-8 flex items-center gap-3">
                        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-cyan-400/20 to-indigo-500/20 ring-1 ring-white/10">
                            <SettingsIcon className="h-5 w-5 text-cyan-300"/>
                        </div>
                        <div>
                            <p className="text-xs font-semibold uppercase tracking-widest text-cyan-400/70">Settings</p>
                            <h1 className="text-xl font-bold text-white sm:text-2xl">설정</h1>
                        </div>
                    </div>

                    {/* 앱 정보 */}
                    <div className="mb-5 rounded-2xl border border-white/10 bg-slate-900/60 p-5 shadow-lg">
                        <div className="flex items-center gap-3">
                            <img src={bgg4AssistantIcoPath} alt="logo" className="h-12 w-12 rounded-2xl ring-1 ring-white/10"/>
                            <div>
                                <p className="text-base font-bold text-white">Bgg4Assistant</p>
                                <p className="text-xs text-slate-400">보드게임 &amp; TRPG 올인원 어시스턴트 · v0.1.0</p>
                            </div>
                        </div>
                        <div className="mt-4 flex flex-wrap gap-1.5">
                            {techStack.map((t) => (
                                <span key={t.label} className="flex items-center gap-1 rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-[11px] font-medium text-slate-300">
                                    <Layers size={11} className="text-cyan-300"/>
                                    {t.label}
                                </span>
                            ))}
                        </div>
                    </div>

                    {/* 주사위 결과 퇴장 연출 */}
                    <div className="mb-5 rounded-2xl border border-white/10 bg-slate-900/60 p-5 shadow-lg">
                        <div className="mb-1 flex items-center gap-2">
                            <Dices size={16} className="text-cyan-300"/>
                            <h2 className="text-sm font-bold text-white">주사위 결과 연출</h2>
                        </div>
                        <p className="mb-3 text-xs leading-relaxed text-slate-400">
                            주사위를 굴린 뒤 결과가 화면에서 어떻게 치워질지 골라보세요. 사이트 어디서 굴리든(전역 주사위 위젯,
                            캐릭터 시트 판정 모두) 다음 굴림부터 바로 적용돼요.
                        </p>
                        <div className="flex flex-col gap-2">
                            {DICE_RESULT_EFFECTS.map((eff) => {
                                const active = this.state.diceResultEffect === eff.id;
                                return (
                                    <button
                                        key={eff.id}
                                        onClick={() => this.handleSelectDiceEffect(eff.id)}
                                        className={`flex items-start gap-3 rounded-xl border px-3 py-2.5 text-left transition ${
                                            active
                                                ? "border-cyan-400/60 bg-cyan-400/10"
                                                : "border-white/10 bg-white/5 hover:bg-white/10"
                                        }`}
                                    >
                                        <span className="text-xl leading-none">{eff.emoji}</span>
                                        <span className="min-w-0 flex-1">
                                            <span className={`block text-sm font-bold ${active ? "text-cyan-300" : "text-white"}`}>
                                                {eff.label}
                                            </span>
                                            <span className="block text-xs leading-relaxed text-slate-400">
                                                {eff.desc}
                                            </span>
                                        </span>
                                        {active && (
                                            <span className="mt-0.5 shrink-0 rounded-full bg-cyan-400/20 px-2 py-0.5 text-[10px] font-bold text-cyan-300">
                                                사용 중
                                            </span>
                                        )}
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    {/* 주사위 색상 */}
                    <div className="mb-5 rounded-2xl border border-white/10 bg-slate-900/60 p-5 shadow-lg">
                        <div className="mb-1 flex items-center gap-2">
                            <Palette size={16} className="text-cyan-300"/>
                            <h2 className="text-sm font-bold text-white">주사위 색상</h2>
                        </div>
                        <p className="mb-3 text-xs leading-relaxed text-slate-400">
                            주사위 아이콘과 실제로 굴러가는 3D 주사위 색을 원하는 대로 바꿔보세요. 아래 색상 중 하나를 고르거나,
                            팔레트 아이콘으로 직접 원하는 색(예: 핑크)을 골라도 돼요.
                        </p>
                        <div className="flex flex-wrap items-center gap-2.5">
                            {DICE_COLOR_PRESETS.map((preset) => {
                                const active = this.state.diceColor.id === preset.id;
                                return (
                                    <button
                                        key={preset.id}
                                        onClick={() => this.handleSelectDiceColor(preset.id)}
                                        title={preset.label}
                                        className={`flex h-11 w-11 items-center justify-center rounded-full transition ${active ? "ring-2 ring-offset-2 ring-offset-slate-900" : "opacity-80 hover:opacity-100"}`}
                                        style={{
                                            background: `linear-gradient(135deg, ${preset.accent} 0%, ${preset.highlight} 100%)`,
                                            ...(active ? { "--tw-ring-color": preset.accent } : {}),
                                        }}
                                    >
                                        {active && <span className="h-2 w-2 rounded-full bg-white shadow"/>}
                                    </button>
                                );
                            })}

                            {/* 커스텀 색 - 네이티브 컬러피커. 라벨 클릭 시 눈에 보이는 스와치가 실제 <input type=color>를 감싼다 */}
                            <label
                                title="직접 색 고르기"
                                className={`relative flex h-11 w-11 cursor-pointer items-center justify-center overflow-hidden rounded-full border-2 border-dashed transition ${
                                    this.state.diceColor.id === "custom"
                                        ? "border-white/60"
                                        : "border-white/25 hover:border-white/50"
                                }`}
                                style={this.state.diceColor.id === "custom" ? { background: this.state.diceColor.accent, borderStyle: "solid" } : undefined}
                            >
                                {this.state.diceColor.id !== "custom" && <Palette size={16} className="text-white/60"/>}
                                <input
                                    type="color"
                                    value={this.state.diceColor.accent}
                                    onChange={(e) => this.handleSelectDiceColor(e.target.value)}
                                    className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
                                />
                            </label>
                        </div>
                    </div>

                    {/* 주사위 테마 - 실제 3D 물리 주사위의 메시/텍스처(dice-box의 "theme")를 바꾼다. 공식
                        배포 패키지(@3d-dice/dice-themes, MIT 라이선스 - 무료로 자유롭게 쓸 수 있다)에서
                        가져왔다. theme은 페이지가 로드될 때 딱 한 번만 읽히므로(dice3DEngine.js 상단 주석
                        참고 - 살아있는 세션 안에서 바꿔치기하면 물리 엔진이 응답을 멈추는 버그가 있었다),
                        여기서 고르면 저장만 하고 곧바로 페이지를 새로고침해서 다음 로드가 새 테마로 시작하게
                        한다. */}
                    <div className="mb-5 rounded-2xl border border-white/10 bg-slate-900/60 p-5 shadow-lg">
                        <div className="mb-1 flex items-center gap-2">
                            <Box size={16} className="text-cyan-300"/>
                            <h2 className="text-sm font-bold text-white">주사위 테마</h2>
                        </div>
                        <p className="mb-3 text-xs leading-relaxed text-slate-400">
                            실제로 화면을 굴러다니는 3D 주사위의 재질/모양을 바꿔요. 「색상 미반영」이 붙은 테마는
                            위의 주사위 색상 설정과 무관하게 재질 고유의 색을 그대로 써요.{" "}
                            <span className="text-slate-300">고르면 바로 페이지가 새로고침돼요</span> - 3D 엔진 특성상
                            새로고침해야만 새 테마가 안전하게 적용돼요.
                        </p>
                        <div className="flex flex-col gap-2">
                            {DICE_THEME_PRESETS.map((theme) => {
                                const active = this.state.diceTheme.id === theme.id;
                                return (
                                    <button
                                        key={theme.id}
                                        onClick={() => this.handleSelectDiceTheme(theme.id)}
                                        disabled={this.state.diceThemeReloading}
                                        className={`flex items-center gap-3 rounded-xl border px-3 py-2.5 text-left transition disabled:opacity-60 ${
                                            active
                                                ? "border-cyan-400/60 bg-cyan-400/10"
                                                : "border-white/10 bg-white/5 hover:bg-white/10"
                                        }`}
                                    >
                                        <span
                                            className="h-8 w-8 shrink-0 rounded-full"
                                            style={{
                                                background: theme.colorable
                                                    ? `linear-gradient(135deg, ${this.state.diceColor.accent} 0%, ${this.state.diceColor.highlight} 100%)`
                                                    // 색상 미반영 테마는 재질 고유색(diceEffectSettings의 swatch)을 그대로 보여준다
                                                    : `linear-gradient(135deg, ${theme.swatch[0]} 0%, ${theme.swatch[1]} 100%)`,
                                            }}
                                        />
                                        <span className="min-w-0 flex-1">
                                            <span className={`block text-sm font-bold ${active ? "text-cyan-300" : "text-white"}`}>
                                                {theme.label}
                                                {!theme.colorable && (
                                                    <span className="ml-1.5 rounded-full bg-white/10 px-1.5 py-0.5 text-[9px] font-bold text-slate-400">
                                                        색상 미반영
                                                    </span>
                                                )}
                                            </span>
                                            <span className="block text-xs leading-relaxed text-slate-400">
                                                {theme.desc}
                                            </span>
                                        </span>
                                        {active && (
                                            <span className="mt-0.5 shrink-0 rounded-full bg-cyan-400/20 px-2 py-0.5 text-[10px] font-bold text-cyan-300">
                                                {this.state.diceThemeReloading ? "새로고침 중…" : "사용 중"}
                                            </span>
                                        )}
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    {/* AI GM 안내 */}
                    <div className="mb-5 rounded-2xl border border-white/10 bg-slate-900/60 p-5 shadow-lg">
                        <div className="mb-2 flex items-center gap-2">
                            <Sparkles size={16} className="text-cyan-300"/>
                            <h2 className="text-sm font-bold text-white">AI 게임 마스터 (Gemini) 안내</h2>
                        </div>
                        <p className="text-sm leading-relaxed text-slate-400">
                            D&amp;D 캐릭터 시트의 <span className="text-slate-200">「GM 과의 대화」</span> 탭 상단 <span className="text-slate-200">⚙️ 설정</span>에서
                            Gemini API 키를 입력하면 AI 게임 마스터와 대화할 수 있어요.
                        </p>
                        <div className="mt-3 flex items-start gap-2 rounded-xl border border-white/10 bg-white/5 p-3">
                            <KeyRound size={14} className="mt-0.5 shrink-0 text-amber-300"/>
                            <p className="text-xs leading-relaxed text-slate-400">
                                입력한 API 키는 서버로 전송되지 않고 이 기기의 브라우저(localStorage)에만 저장돼요.
                            </p>
                        </div>
                    </div>

                    <p className="flex items-center justify-center gap-1.5 text-xs text-slate-600">
                        <Github size={13}/> Bgg4Assistant · Made by SnowFlower
                    </p>
                </div>
            </div>
        );
    }
}

export default withNavigate(SettingsScreen);

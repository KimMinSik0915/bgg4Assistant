import { Component } from "react";
import { ArrowLeft, SettingsIcon, KeyRound, Sparkles, Github, Layers } from "lucide-react";
import { homeScreenItems } from "../../homeScreen/resource/resources";
import withNavigate from "../../utils/withNavigate";

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
 * SettingsScreen : 앱 정보 및 빠른 이동, AI GM 안내를 모아둔 설정 페이지
 */
class SettingsScreen extends Component {

    state = {};

    constructor(props) {
        super(props);
    }

    render() {
        const quickLinks = homeScreenItems.filter((item) => item.path && item.path !== this.props.location?.pathname);

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

                    {/* 빠른 이동 */}
                    <div className="mb-5 rounded-2xl border border-white/10 bg-slate-900/60 p-5 shadow-lg">
                        <h2 className="mb-3 text-sm font-bold text-white">빠른 이동</h2>
                        <div className="flex flex-col gap-1.5">
                            {quickLinks.map((item) => (
                                <button
                                    key={item.id}
                                    onClick={() => this.props.navigate(item.path)}
                                    className="flex items-center justify-between rounded-xl px-3 py-2.5 text-sm text-slate-300 transition hover:bg-white/5 hover:text-white"
                                >
                                    <span className="truncate">{item.label}</span>
                                    <ArrowLeft size={14} className="shrink-0 rotate-180 text-slate-500"/>
                                </button>
                            ))}
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

import {
  Dice5Icon,
  SparklesIcon,
  SwordsIcon,
  ArrowUpRightIcon,
  PlusIcon,
} from "lucide-react";
import { Component } from "react";
import { homeScreenItems } from "../resource/resources";
import { IconRenderer } from "../util/util";
import withNavigate from "../../utils/withNavigate";

const bgg4AssistantIcoPath = "/bgg4Assistant_ico.webp";

const heroBadges = [
  { icon: Dice5Icon, label: "보드게임 & TRPG" },
  { icon: SparklesIcon, label: "AI 게임 마스터" },
  { icon: SwordsIcon, label: "실시간 전투매트" },
];

/**
 * @Author : 김민식
 * homeScreen : 메인 페이지
 */
class HomeScreen extends Component {
  state = {};

  constructor(props) {
    super(props);
  }

  handler = {
    onClick: {
      actionIcon: (e) => {
        const currentId = e.currentTarget.id;
        switch (currentId) {
          case "imperium":
            this.props.navigate("/imperium");
            break;
          case "bandu":
            this.props.navigate("/bandu");
            break;
          case "character-sheet":
            this.props.navigate("/character-sheet");
            break;
          case "settings":
            this.props.navigate("/settings");
            break;
          default:
            console.log("executed default");
            break;
        }
      },
    },
  };

  render() {
    return (
      <div className="relative overflow-hidden bg-slate-950">
        {/* ambient background glow */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-32 -left-24 h-96 w-96 rounded-full bg-cyan-500/20 blur-[120px]" />
          <div className="absolute top-1/3 -right-24 h-[28rem] w-[28rem] rounded-full bg-indigo-600/20 blur-[130px]" />
          <div className="absolute bottom-0 left-1/3 h-96 w-96 rounded-full bg-fuchsia-500/10 blur-[120px]" />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_1px_1px,rgba(255,255,255,0.06)_1px,transparent_0)] [background-size:28px_28px]" />
        </div>

        <div className="container relative px-4 py-12 mx-auto sm:px-6 sm:py-16">
          {/* Hero */}
          <div className="flex flex-col items-center max-w-2xl mx-auto text-center mb-14 sm:mb-20">
            <div className="relative mb-5">
              <div className="absolute inset-0 rounded-full bg-cyan-400/30 blur-2xl" />
              <img
                src={bgg4AssistantIcoPath}
                alt="logo"
                className="relative w-16 h-16 shadow-lg rounded-2xl shadow-cyan-500/20 ring-1 ring-white/10 sm:h-20 sm:w-20"
              />
            </div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-[0.3em] text-cyan-400/80 sm:text-sm">
              BGG4 Assistant
            </p>
            <h1 className="text-3xl font-bold text-white sm:text-4xl">
              테이블 위의 모든 게임,{" "}
              <span className="text-transparent bg-gradient-to-r from-cyan-300 to-indigo-300 bg-clip-text">
                한 곳에서
              </span>
            </h1>
            <p className="mt-4 text-sm leading-relaxed text-slate-400 sm:text-base">
              게임 진행 보조부터 캐릭터 시트 관리, AI 게임 마스터와의 대화까지 —
              <br className="hidden sm:block" />
              실행할 앱을 선택해 주세요.
            </p>

            <div className="flex flex-wrap items-center justify-center gap-2 mt-6">
              {heroBadges.map(({ icon: Icon, label }) => (
                <span
                  key={label}
                  className="flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-medium text-slate-300"
                >
                  <Icon className="h-3.5 w-3.5 text-cyan-300" />
                  {label}
                </span>
              ))}
            </div>
          </div>

          {/* Library section */}
          <div className="flex items-end justify-between max-w-5xl px-1 mx-auto mb-5">
            <div>
              <p className="text-xs font-semibold tracking-widest uppercase text-cyan-400/70">
                Library
              </p>
              <h2 className="text-lg font-bold text-white sm:text-xl">
                실행할 앱 선택하기
              </h2>
            </div>
            <span className="hidden text-xs text-slate-500 sm:inline">
              {homeScreenItems.length}개 이용 가능
            </span>
          </div>

          <div className="grid max-w-5xl grid-cols-2 gap-4 mx-auto sm:grid-cols-3 sm:gap-6 md:grid-cols-4 lg:grid-cols-5">
            {homeScreenItems.map((item) => (
              <button
                key={item.id}
                id={item.id}
                onClick={(e) => {
                  this.handler.onClick.actionIcon(e);
                }}
                className="group relative aspect-[3/4] overflow-hidden rounded-2xl border border-white/10 bg-slate-900/60 shadow-lg backdrop-blur-sm transition-all duration-300 ease-out hover:-translate-y-1.5 hover:border-cyan-400/40 hover:shadow-2xl hover:shadow-cyan-500/20 focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400"
              >
                {!item.isCustomIcon && (
                  <div className="absolute inset-0 bg-gradient-to-br from-slate-800 to-slate-950" />
                )}

                <IconRenderer item={item} />

                {item.tag && (
                  <span className="absolute left-2 top-2 z-10 rounded-full bg-black/50 px-2 py-0.5 text-[9px] font-medium text-cyan-200 ring-1 ring-white/10 backdrop-blur sm:text-[10px]">
                    {item.tag}
                  </span>
                )}

                <div className="absolute inset-0 transition-opacity duration-300 pointer-events-none bg-gradient-to-t from-black/90 via-black/10 to-transparent opacity-90 group-hover:opacity-100" />

                <ArrowUpRightIcon className="absolute z-10 w-6 h-6 p-1 transition-all duration-300 -translate-y-1 rounded-full shadow-md opacity-0 right-2 top-2 bg-cyan-400/90 text-slate-950 group-hover:translate-y-0 group-hover:opacity-100" />

                <span className="absolute inset-x-0 bottom-0 p-2 text-center text-[10px] font-semibold leading-tight text-white drop-shadow-md sm:p-3 sm:text-xs">
                  {item.label}
                </span>

                <div className="absolute inset-0 transition-all duration-300 rounded-2xl ring-1 ring-inset ring-white/5 group-hover:ring-cyan-300/30" />
              </button>
            ))}

            <div className="flex aspect-[3/4] flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-white/15 bg-white/[0.02] text-slate-500">
              <PlusIcon className="w-6 h-6 opacity-50 sm:h-8 sm:w-8" />
              <span className="px-2 text-center text-[10px] font-medium leading-tight sm:text-xs">
                새로운 게임을
                <br />
                준비하고 있어요
              </span>
            </div>
          </div>
        </div>
      </div>
    );
  }
}

export default withNavigate(HomeScreen);

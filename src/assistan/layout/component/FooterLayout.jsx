import {Component} from "react";
import withNavigate from "../../utils/withNavigate";
import {Link} from "react-router-dom";
import {NavigationItems} from "../resources/DataSet/NavigationItems";
import {homeScreenItems} from "../../homeScreen/resource/resources";

const bgg4AssistantIcoPath = "/bgg4Assistant_ico.webp";

class FooterLayout extends Component {

    state = {

    }

    constructor(props) {
        super(props);
    }

    handler = {

    }

    fnc = {

    }

    render() {
        const libraryLinks = homeScreenItems.filter((item) => item.path);
        const year = new Date().getFullYear();

        return (
            <footer className="border-t border-white/10 bg-slate-950 text-slate-300">
                <div className="h-px w-full bg-gradient-to-r from-transparent via-cyan-400/40 to-transparent"/>
                <div className="container mx-auto px-4 py-10 sm:px-6 sm:py-12">
                    <div className="grid grid-cols-1 gap-10 sm:grid-cols-2 lg:grid-cols-4">
                        <div className="lg:col-span-2">
                            <Link to="/" className="flex items-center gap-2.5">
                                <img src={bgg4AssistantIcoPath} alt="logo" className="h-9 w-9 rounded-xl ring-1 ring-white/10"/>
                                <span className="bg-gradient-to-r from-cyan-300 to-indigo-300 bg-clip-text text-lg font-bold text-transparent">
                                    Bgg4Assistant
                                </span>
                            </Link>
                            <p className="mt-3 max-w-sm text-sm leading-relaxed text-slate-400">
                                보드게임과 TRPG를 위한 올인원 어시스턴트. 게임 진행 보조부터 캐릭터 시트, AI 게임 마스터 대화까지 한 곳에서 즐겨보세요.
                            </p>
                        </div>

                        <div>
                            <h3 className="text-sm font-semibold tracking-wide text-white">바로가기</h3>
                            <ul className="mt-4 space-y-2.5">
                                {NavigationItems.map(({ path, icon: Icon, text, onClick }) => (
                                    <li key={text}>
                                        {onClick ? (
                                            <a href="#" onClick={onClick} className="flex items-center gap-2 text-sm text-slate-400 transition-colors hover:text-cyan-300">
                                                <Icon size={15}/>
                                                {text}
                                            </a>
                                        ) : (
                                            <Link to={path} className="flex items-center gap-2 text-sm text-slate-400 transition-colors hover:text-cyan-300">
                                                <Icon size={15}/>
                                                {text}
                                            </Link>
                                        )}
                                    </li>
                                ))}
                            </ul>
                        </div>

                        <div>
                            <h3 className="text-sm font-semibold tracking-wide text-white">라이브러리</h3>
                            <ul className="mt-4 space-y-2.5">
                                {libraryLinks.map((item) => (
                                    <li key={item.id}>
                                        <Link to={item.path} className="text-sm text-slate-400 transition-colors hover:text-cyan-300">
                                            {item.label}
                                        </Link>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    </div>

                    <div className="mt-10 flex flex-col gap-2 border-t border-white/10 pt-6 text-xs text-slate-500 sm:flex-row sm:items-center sm:justify-between">
                        <p>&copy; {year} SnowFlower. All rights reserved.</p>
                        <p>Made with React &amp; Tailwind CSS</p>
                    </div>
                </div>
            </footer>
        )
    }


}

export default withNavigate(FooterLayout);

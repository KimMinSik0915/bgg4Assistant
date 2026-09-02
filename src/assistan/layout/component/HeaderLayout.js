import {Component} from "react";
import {Menu, Settings, User, X} from "lucide-react";
import {Link, NavLink} from "react-router-dom";
import {NavigationItems} from "../resources/DataSet/NavigationItems";
import withNavigate from "../../utils/withNavigate";

const bgg4AssistantIcoPath = "/bgg4Assistant_ico.webp";

class HeaderLayout extends Component {

    state = {
        isMenuOpen : false
      , isLoginOpen : false
    }

    constructor(props) {
        super(props);
    }

    handler = {
        toggleMenu : () => {
            this.setState(prevState => ({
                isMenuOpen : !prevState.isMenuOpen
              , isLoginOpen : false
            }));
        }
      , toggleLogin : () => {
            this.setState(prevState => ({
                isLoginOpen : !prevState.isLoginOpen
            }));
        }
      , naviClick : (path) => {
            this.setState({isMenuOpen : false});
            this.props.navigate(path);
        }
      , closeAll : () => {
            this.setState({isMenuOpen : false, isLoginOpen : false});
        }
    }

    renderNavLink = ({ path, icon: Icon, text, onClick }, variant) => {
        const desktopClass = ({ isActive }) =>
            `flex items-center gap-1.5 rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
                isActive ? 'bg-cyan-400/15 text-cyan-300' : 'text-slate-300 hover:bg-white/10 hover:text-white'
            }`;
        const mobileClass = ({ isActive }) =>
            `flex items-center gap-2 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                isActive ? 'bg-cyan-400/15 text-cyan-300' : 'text-slate-300 hover:bg-white/10 hover:text-white'
            }`;

        if (onClick) {
            const className = variant === 'mobile'
                ? 'flex items-center gap-2 rounded-lg px-3 py-2.5 text-sm font-medium text-slate-300 transition-colors hover:bg-white/10 hover:text-white'
                : 'flex items-center gap-1.5 rounded-full px-4 py-1.5 text-sm font-medium text-slate-300 transition-colors hover:bg-white/10 hover:text-white';
            return (
                <a key={text} href="#" className={className} onClick={onClick}>
                    <Icon size={16}/>
                    {text}
                </a>
            );
        }

        return (
            <NavLink
                key={path}
                to={path}
                onClick={this.handler.closeAll}
                className={variant === 'mobile' ? mobileClass : desktopClass}
            >
                <Icon size={16}/>
                {text}
            </NavLink>
        );
    }

    render() {
        const { isMenuOpen, isLoginOpen } = this.state;

        return(
            <header className="sticky top-0 z-50 border-b border-white/10 bg-slate-950/80 shadow-lg shadow-black/20">
                <div className="container mx-auto flex h-16 items-center justify-between px-4 sm:h-[70px] sm:px-6">
                    <Link to="/" className="flex shrink-0 items-center gap-2.5" onClick={this.handler.closeAll}>
                        <img src={bgg4AssistantIcoPath} alt="logo" className="h-9 w-9 rounded-xl ring-1 ring-white/10 sm:h-10 sm:w-10"/>
                        <span className="bg-gradient-to-r from-cyan-300 to-indigo-300 bg-clip-text text-lg font-bold text-transparent sm:text-xl">
                            Bgg4Assistant
                        </span>
                    </Link>

                    <nav className="hidden items-center gap-1 rounded-full border border-white/10 bg-white/5 p-1 md:flex">
                        {NavigationItems.map((item) => this.renderNavLink(item, 'desktop'))}
                    </nav>

                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => this.handler.naviClick('/settings')}
                            className="rounded-full p-2 text-slate-300 transition-colors hover:bg-white/10 hover:text-white"
                            title="설정"
                            aria-label="설정"
                        >
                            <Settings size={18}/>
                        </button>

                        <div className="relative hidden sm:block">
                            <button
                                onClick={this.handler.toggleLogin}
                                className="flex items-center gap-1.5 rounded-full bg-gradient-to-r from-cyan-400 to-indigo-400 px-4 py-1.5 text-sm font-semibold text-slate-950 shadow-md shadow-cyan-500/20 transition-transform duration-200 hover:scale-105"
                            >
                                <User size={16}/>
                                로그인
                            </button>
                            {isLoginOpen && (
                                <div className="absolute right-0 top-full z-50 mt-2 w-56 rounded-xl border border-white/10 bg-slate-900/95 p-3 text-xs leading-relaxed text-slate-300 shadow-xl">
                                    🚧 로그인 기능은 준비 중이에요. 조금만 기다려 주세요!
                                </div>
                            )}
                        </div>

                        <button
                            className="rounded-lg p-2 text-slate-200 transition-colors hover:bg-white/10 md:hidden"
                            onClick={this.handler.toggleMenu}
                            aria-label="메뉴 열기"
                        >
                            {isMenuOpen ? <X size={22} /> : <Menu size={22} />}
                        </button>
                    </div>
                </div>

                <nav className={`overflow-hidden border-t border-white/10 bg-slate-950/95 transition-[max-height] duration-300 ease-in-out md:hidden ${isMenuOpen ? 'max-h-96' : 'max-h-0 border-t-0'}`}>
                    <ul className="flex flex-col gap-1 px-4 py-3">
                        {NavigationItems.map((item) => (
                            <li key={item.path ?? item.text}>{this.renderNavLink(item, 'mobile')}</li>
                        ))}
                        <li className="pt-2">
                            <button
                                onClick={this.handler.toggleLogin}
                                className="flex w-full items-center justify-center gap-1.5 rounded-full bg-gradient-to-r from-cyan-400 to-indigo-400 px-4 py-2.5 text-sm font-semibold text-slate-950 shadow-md shadow-cyan-500/20"
                            >
                                <User size={16}/>
                                로그인
                            </button>
                            {isLoginOpen && (
                                <p className="mt-2 rounded-lg border border-white/10 bg-white/5 p-3 text-xs leading-relaxed text-slate-300">
                                    🚧 로그인 기능은 준비 중이에요. 조금만 기다려 주세요!
                                </p>
                            )}
                        </li>
                    </ul>
                </nav>
            </header>
        )
    }
}
export default withNavigate(HeaderLayout);

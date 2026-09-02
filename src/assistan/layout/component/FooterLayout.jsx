import { Component } from "react";
import withNavigate from "../../utils/withNavigate";
import { Link } from "react-router-dom";
import { NavigationItems } from "../resources/DataSet/NavigationItems";
import { homeScreenItems } from "../../homeScreen/resource/resources";

const bgg4AssistantIcoPath = "/bgg4Assistant_ico.webp";

class FooterLayout extends Component {
  state = {};

  constructor(props) {
    super(props);
  }

  handler = {};

  fnc = {};

  render() {
    const libraryLinks = homeScreenItems.filter((item) => item.path);
    const year = new Date().getFullYear();

    return (
      <footer className="border-t border-white/10 bg-slate-950 text-slate-300">
        <div className="w-full h-px bg-gradient-to-r from-transparent via-cyan-400/40 to-transparent" />
        <div className="container px-4 py-10 mx-auto sm:px-6 sm:py-12">
          <div className="grid grid-cols-1 gap-10 sm:grid-cols-2 lg:grid-cols-4">
            <div className="lg:col-span-2">
              <Link to="/" className="flex items-center gap-2.5">
                <img
                  src={bgg4AssistantIcoPath}
                  alt="logo"
                  className="h-9 w-9 rounded-xl ring-1 ring-white/10"
                />
                <span className="text-lg font-bold text-transparent bg-gradient-to-r from-cyan-300 to-indigo-300 bg-clip-text">
                  Bgg4Assistant
                </span>
              </Link>
              <p className="mt-3 text-sm leading-relaxed text-slate-400">
                당신의 보드게임 경험을 더욱 즐겁게 만들어드립니다.
              </p>
            </div>
          </div>

          <div className="flex flex-col gap-2 pt-6 mt-10 text-xs border-t border-white/10 text-slate-500 sm:flex-row sm:items-center sm:justify-between">
            <p>&copy; {year} SnowFlower. All rights reserved.</p>
            <p>Made with React &amp; Tailwind CSS</p>
          </div>
        </div>
      </footer>
    );
  }
}

export default withNavigate(FooterLayout);

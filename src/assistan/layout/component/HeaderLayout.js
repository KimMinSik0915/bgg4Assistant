import {Component} from "react";
import {Box, Home, Menu, Settings, User, X} from "lucide-react";
import {Link, NavLink} from "react-router-dom";
import {NavigationItems} from "../resources/DataSet/NavigationItems";
import withNavigate from "../../utils/withNavigate";

class HeaderLayout extends Component {

    state = {
        isMenuOpen : false
    }

    constructor(props) {
        super(props);
    }

    handler = {
        toggleMenu : () => {
            this.setState(prevState => ({
                isMenuOpen : !prevState.isMenuOpen
            }));
        }
      , naviClick : (path) => {
            this.setState({isMenuOpen : false});
            this.props.navigate(path);
        }
    }

    render() {
        const { isMenuOpen} = this.state;

        return(
            <>
                <header className="bg-blue-600 text-white p-4">
                    <div className="container mx-auto flex justify-between items-center">
                      <Link to="/" className="flex items-center space-x-2 text-xl font-bold">
                        <Box size={24} />
                        <span>Bgg4Assistant</span>
                      </Link>

                      {/* 햄버거 메뉴 아이콘 (모바일) */}
                      <button className="md:hidden" onClick={this.handler.toggleMenu}>
                        {this.state.isMenuOpen ? <X size={24} /> : <Menu size={24} />}
                      </button>

                      {/* 네비게이션 메뉴 */}
                      <nav className={`${this.state.isMenuOpen ? 'block' : 'hidden'} md:block absolute md:relative top-full left-0 w-full md:w-auto bg-blue-600 md:bg-transparent`}>
                        <ul className="flex flex-col md:flex-row space-y-2 md:space-y-0 md:space-x-4 p-4 md:p-0">
                            {NavigationItems.map(({ path, icon: Icon, text, onClick }) => (
                                <li key={path}>
                                  {onClick ? (
                                    <a
                                      href="#"
                                      className="flex items-center hover:text-blue-200"
                                      onClick={onClick}
                                    >
                                      <Icon size={18} className="mr-1" />
                                      {text}
                                    </a>
                                  ) : (
                                    <NavLink
                                      to={path}
                                      className={({ isActive }) =>
                                        `flex items-center hover:text-blue-200 ${isActive ? 'text-blue-200 font-bold' : ''}`
                                      }
                                      onClick={() => this.setState({ isMenuOpen: false })}
                                    >
                                      <Icon size={18} className="mr-1" />
                                      {text}
                                    </NavLink>
                                  )}
                                </li>
                            ))}
                        </ul>
                      </nav>
                    </div>
                </header>
            </>
        )
    }
}
export default withNavigate(HeaderLayout);
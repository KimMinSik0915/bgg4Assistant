import { BookOpenIcon, UsersIcon, SettingsIcon, BellIcon, CalendarIcon, ImageIcon, MusicIcon, VideoIcon, FileTextIcon, GlobeIcon, MailIcon } from 'lucide-react';
import {Component} from "react";
import {homeScreenItems} from "../resource/resources";
import {IconRenderer} from "../util/util";
import withNavigate from "../../utils/withNavigate";

const bgg4AssistantIcoPath="/bgg4Assistant_ico.webp";

/**
 * @Author : 김민식
 * homeScreen : 메인 페이지
*/
class HomeScreen extends Component {

    state = {

    };

    constructor(props) {
        super(props);
    }

    handler = {
        onClick : {
            actionIcon : (e) => {

                const currentId = e.currentTarget.id;
                switch (currentId) {
                    case 'imperium' :
                        this.props.navigate('/imperium');
                        break;
                    case 'bandu' :
                        this.props.navigate('/bandu');
                    default :
                        console.log('executed default');
                        break;
                }
            }
        }
    }

    render() {
        return(
            <>
                <div className="container mx-auto p-4" style={{backgroundColor: '#d9d9f2'}}>
                    <div className="flex items-center justify-center mb-6">
                        <img src={bgg4AssistantIcoPath} alt="logo" className="w-10 h-10 mr-3"/>
                        <h1 className="text-2xl font-bold mb-6 text-center text-indigo-800">실행할 app을 선택해 주세요.</h1>
                    </div>
                    <div className="grid grid-cols-5 gap-2 sm:gap-4 max-w-4xl mx-auto">
                        {homeScreenItems.map((item) => (
                            <button
                                key={item.id}
                                id={item.id}
                                onClick={(e) => {
                                    this.handler.onClick.actionIcon(e);
                                }}
                                className={'flex flex-col items-center justify-center p-1 sm:p-2 bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow duration-300 aspect-square'}
                            >
                                <div className={'flex items-center justify-center w-8 h-8 sm:w-12 sm:h-12'}>
                                    {item.isCustomIcon ?
                                        (
                                            <IconRenderer item={item}/>
                                            // <img src={item.icon} alt={item.label} className={'w-full h-full object-contain'}/>
                                        ) :
                                        (
                                            <item.icon className={'w-full h-full'}/>
                                        )
                                    }
                                </div>
                                <br/>
                                <span
                                    className="text-[8px] sm:text-xs font-medium text-gray-700 text-center leading-tight mt-1 sm:mt-2">{item.label}</span>
                            </button>
                        ))
                        }
                    </div>
                </div>
            </>
        )
    }
}

export default withNavigate(HomeScreen);
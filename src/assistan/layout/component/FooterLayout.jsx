import {Component} from "react";
import withNavigate from "../../utils/withNavigate";
import {Link} from "react-router-dom";

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
        return (
            <>
                <footer className="bg-gray-800 text-white py-6 sm:py-8 flex-shrink-0">
                    <div className="container mx-auto px-4">
                        <div className="flex flex-col sm:flex-row justify-between">
                            <div className="w-full sm:w-1/3 mb-6 sm:mb-0">
                                <h3 className="text-lg font-bold mb-2">보드게임 어시스턴트</h3>
                                <p className="text-sm">당신의 보드게임 경험을 더욱 즐겁게 만들어드립니다.</p>
                            </div>
                        </div>
                        <div className="mt-6 sm:mt-8 pt-6 sm:pt-8 border-t border-gray-700 text-sm text-center">
                            <p>&copy; {new Date().getFullYear()} SnowFlower. All rights reserved.</p>
                        </div>
                    </div>
                </footer>
            </>
        )
    }


}

export default withNavigate(FooterLayout);
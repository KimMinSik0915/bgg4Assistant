import {Component} from "react";
import withNavigate from "../../utils/withNavigate";
import {BackgroundColor} from "../resources/CSS/Background/BackGroundColor";
import HeaderLayout from "../component/HeaderLayout";
import FooterLayout from "../component/FooterLayout";
import DicePanel from "../../characterSheet/component/DicePanel";
import "../../characterSheet/resource/CSS/characterSheet.css";

class Layout extends Component {

    state = {
        backgroundColor : '#020617'
    }

    constructor(props) {
        super(props);
    }

    handler = {

    }

    fnc = {

    }

    componentDidMount() {
        this.updateBackgroundColor();
    }

    componentDidUpdate(prevProps) {
        if (this.props.location !== prevProps.location) {
            this.updateBackgroundColor();
        }
    }

    updateBackgroundColor() {
        const backgroundColor = BackgroundColor(this.props.location);
        this.setState({ backgroundColor });
    }


    render() {

        const { backgroundColor } = this.state;

        return (
            <div className="flex flex-col min-h-screen" style={{ backgroundColor }}>
                <HeaderLayout />
                <main className="flex-grow">
                    {this.props.children}
                </main>
                <FooterLayout/>
                {/* 🎲 사이트 전체(모든 화면)에 떠 있는 전역 주사위 플로팅 버튼 — props 없이 완전히 독립적 */}
                <DicePanel/>
            </div>
        );
    }

}

export default withNavigate(Layout);
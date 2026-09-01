import {Component} from "react";
import withNavigate from "../../utils/withNavigate";
import {BackgroundColor} from "../resources/CSS/Background/BackGroundColor";
import HeaderLayout from "../component/HeaderLayout";
import FooterLayout from "../component/FooterLayout";

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
            </div>
        );
    }

}

export default withNavigate(Layout);
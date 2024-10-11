import {useNavigate} from "react-router-dom";

function withNavigate(WrapperComponent) {
    return function WithNavigate(props) {
        const navigate = useNavigate();
        return <WrapperComponent {...props} navigate={navigate()} />;
    }
}

export default withNavigate;
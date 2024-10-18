import {useLocation, useNavigate} from "react-router-dom";

function withNavigate(WrapperComponent) {
    return function WithNavigate(props) {
        const navigate = useNavigate();
        const location = useLocation();
        return <WrapperComponent {...props} navigate={navigate} location={location}/>;
    }
}

export default withNavigate;
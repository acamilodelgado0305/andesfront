import PropTypes from "prop-types";
import { Navigate } from "react-router-dom";

const ProtectedRoute = ({ element }) => {
    const token = localStorage.getItem("token");

    if (!token) {
        return <Navigate to="/" replace />;
    }

    return element;
};

ProtectedRoute.propTypes = {
    element: PropTypes.node.isRequired,
};

export default ProtectedRoute;

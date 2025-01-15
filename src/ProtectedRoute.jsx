import React, { useContext } from "react";
import PropTypes from "prop-types";
import { Navigate } from "react-router-dom";
import { AuthContext } from "../src/AuthContext";

const ProtectedRoute = ({ element }) => {
    const { token } = useContext(AuthContext);

    if (!token) {
        return <Navigate to="/" replace />;
    }

    return element;
};

ProtectedRoute.propTypes = {
    element: PropTypes.node.isRequired,
};

export default ProtectedRoute;

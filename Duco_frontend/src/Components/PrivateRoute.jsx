import { Navigate } from "react-router-dom";

const PrivateRoute = ({ children, user }) => {
  // Check if user is logged in
  if (!user || !user._id) {
    return <Navigate to="/" replace />;
  }

  return children;
};

export default PrivateRoute;

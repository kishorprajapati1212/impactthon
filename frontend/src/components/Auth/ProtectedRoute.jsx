import { Navigate } from "react-router-dom";
import { useSelector } from "react-redux";
const ProtectedRoute = ({ children, allowedRole }) => {
  const { isAuthenticated, user } = useSelector(s => s.auth);
  if (!isAuthenticated || !user) return <Navigate to="/login" replace />;
  const role = user.role?.toLowerCase();
  if (allowedRole && role !== allowedRole.toLowerCase()) return <Navigate to={`/${role}`} replace />;
  return children;
};
export default ProtectedRoute;

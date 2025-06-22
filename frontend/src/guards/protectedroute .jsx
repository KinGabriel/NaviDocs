import { Navigate } from "react-router-dom";
import useUser from '../../hooks/useUser';

export default function ProtectedRoute({ children, allowedRoles }) {
  const user = useUser();
  if (!user) {
    return <Navigate to="/"  />;
  }
  if (allowedRoles && !allowedRoles.includes(user.role?.name)) {
    return <Navigate to="/"  />;
  }
  return children;
}
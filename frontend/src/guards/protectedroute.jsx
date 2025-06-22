import { Navigate } from "react-router-dom";
import useUser from '../hooks/useUser';

export default function ProtectedRoute({ children, allowedRoles }) {
  const user = useUser();

  // Wait for user to be loaded if localStorage has user
  if (user === null && localStorage.getItem("user")) {
    return null; 
  }

 // If not log in
  if (!user) {
    console.log("User not found, redirecting to login");  
    return <Navigate to="/" />;
  }

  // Unauthorized access 
  if (allowedRoles && !allowedRoles.includes(user.role?.name)) {
    return <Navigate to="/" />;
  }

  return children;
}
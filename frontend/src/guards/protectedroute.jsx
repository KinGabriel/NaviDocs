import { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import useUser from '../hooks/useUser';
import Loader from '../components/loader';

export default function ProtectedRoute({ children, allowedRoles }) {
  const user = useUser();
  // Small boot delay to prevent unauthorized/login flicker while app/auth mounts
  const [bootWaiting, setBootWaiting] = useState(true);
  useEffect(() => {
    const t = setTimeout(() => setBootWaiting(false), 300);
    return () => clearTimeout(t);
  }, []);

  const hasCachedUser = !!localStorage.getItem("user");

  // While booting or expecting a cached user to hydrate, show a loader
  if ((user === null && hasCachedUser) || (!user && bootWaiting)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <Loader message="Loading..." />
      </div>
    );
  }

 // If not log in
  if (!user) {
    console.log("User not found, redirecting to login");  
    return <Navigate to="/" />;
  }

  const userRole = user.role?.name;

  // Unauthorized access 
  if (allowedRoles && !allowedRoles.includes(userRole)) {
    // Avoid flicker to unauthorized during boot delay
    if (bootWaiting) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-gray-100">
          <Loader message="Loading..." />
        </div>
      );
    }
    return <Navigate to="/unauthorized" replace />;
  }

  return children;
}
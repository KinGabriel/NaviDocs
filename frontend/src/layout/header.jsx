// This is the header component for the application, which includes a logo, title, notifications, and user profile information.
import { useNavigate } from 'react-router-dom';
import '../assets/css/global.css'
import naviLogo from '../assets/images/navilogo.png';
import notifIcon from '../assets/images/notif_icon.svg';

export default function Header({ user }) {
  const navigate = useNavigate();

  /**
   * @function handleLogout
   * @description Handles user logout by clearing authentication data and redirecting to login page
   */
  const handleLogout = () => {
    // Clear authentication data from localStorage
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    
    // Redirect to login page
    navigate('/');
  
  };

  return (
    <>
    {  /* Top Blue Header */}
      <div className="h-4 bg-[#063c8d] w-full" />
      {/* Main Header */}
      <header className="bg-white px-6 py-3 flex items-center justify-between shadow-sm">
        {/* Logo and Title */}
        <div className="flex items-center gap-3">
          <img src={naviLogo} alt="Logo" className="h-10 w-15" />
          <span className="text-[13px] font-semibold text-gray-700 tracking-wide">NAVIDOCS</span>
        </div>

        {/* Notification & User Info */}
        <div className="flex items-center gap-3">
          {/* Notification Bell */}
          <div className="bg-gray-100 rounded-lg px-3 py-2 flex items-center" style={{ height: '48px' }}>
            <img src={notifIcon} alt="Notifications" className="h-6 w-6" />
          </div>

          {/* User Section */}
          {user && (
            <div className="bg-gray-100 rounded-lg px-3 py-2 flex items-center gap-3" style={{ height: '48px' }}>
              <img
                src={user.profile_picture ? `http://localhost:8001${user.profile_picture}` : '/default-avatar.png'}
                alt="Profile"
                className="h-10 w-10 rounded-full border border-gray-300"
              />
              <div>
                <p className="text-sm font-semibold text-gray-700 leading-none">
                  {(user.firstname || '') + ' ' + (user.lastname || '')}
                </p>
                <button 
                  onClick={handleLogout}
                  className="text-xs text-gray-500 hover:text-red-600 hover:underline transition-colors duration-200"
                >
                  Log out
                </button>
              </div>
            </div>
          )}
        </div>
      </header>
    </>
  );
}

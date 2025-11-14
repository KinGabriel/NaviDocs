// This is the header component for the application, which includes a logo, title, notifications, and user profile information.
import { useNavigate, useLocation } from 'react-router-dom';
import React, { useState, useRef, useEffect } from "react";
import NotificationDropdown from "../../components/dropdowns/notificationDropdown";
import '../../assets/css/global.css'
import naviLogo from '../../assets/images/navilogo.png';
import notifIcon from '../../assets/images/notif_icon.svg';
import { logoutAPI } from '../../api/authAPI.js';
import defaultProfile from '../../assets/images/profile_picture.png';
import { useDataPolling } from '../../hooks/useDataPolling.jsx';


const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

const fetchNotificationsAPI = async () => {
  try {
    const res = await fetch('/api/notifications', { credentials: 'include' });
    if (res.ok) {
      const data = await res.json();
      return data.map(n => ({
        id: n._id,
        message: n.message,
        link: n.link,
        isRead: !!n.isRead,
        createdAt: n.createdAt,
      }));
    }
    return [];
  } catch (err) {
    console.error('Failed to fetch notifications:', err);
    return [];
  }
};

export default function Header({ user }) {
  const navigate = useNavigate();
  const location = useLocation(); // <-- get current route

  const [showDropdown, setShowDropdown] = useState(false);
  const bellRef = useRef();

  const { data: notifications, setData: setNotifications, refetch: fetchNotifications } = useDataPolling(fetchNotificationsAPI, 15000, []);

  // Refetch when dropdown opens so users see the latest instantly
  useEffect(() => {
    if (showDropdown) {
      fetchNotifications();
    }
  }, [showDropdown, fetchNotifications]);

  // Refetch when tab regains focus / visibility / custom event
  useEffect(() => {
    const onFocus = () => fetchNotifications();
    const onVisibility = () => {
      if (document.visibilityState === 'visible') fetchNotifications();
    };
    window.addEventListener('focus', onFocus);
    document.addEventListener('visibilitychange', onVisibility);

    const onCustom = () => fetchNotifications();
    window.addEventListener('notifications:refresh', onCustom);

    return () => {
      window.removeEventListener('focus', onFocus);
      document.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener('notifications:refresh', onCustom);
    };
  }, [fetchNotifications]);

  const unreadCount = notifications.filter(n => !n.isRead).length;

  const markAsRead = async (id) => {
    try {
      await fetch(`/api/notifications/${id}/read`, {
        method: 'PATCH',
        credentials: 'include',
      });
      setNotifications(prev =>
        prev.map(n => (n.id === id ? { ...n, isRead: true } : n))
      );
    } catch (err) {
      console.error('Failed to mark notification as read', err);
    }
  };

  const handleNotificationSelect = (n) => {
    if (!n) return;
    markAsRead(n.id);
    setShowDropdown(false);
    if (n.link) navigate(n.link);
  };

  /**
   * @function handleLogout
   * @description Handles user logout by clearing authentication data and redirecting to login page
   */
  const handleLogout = async () => {
    await logoutAPI();
    localStorage.removeItem('user');
    navigate('/');
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (bellRef.current && !bellRef.current.contains(event.target)) {
        setShowDropdown(false);
      }
    }
    if (showDropdown) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [showDropdown]);

  // Sidebar toggle — dispatch an event that Sidebar listens to
  const toggleSidebar = () => {
    window.dispatchEvent(new CustomEvent('sidebar:toggle'));
  };

  // decide if we should hide the hamburger
  // matches /select-template exactly, and also covers variants like /select-template?foo=bar
  const hideHamburger = location.pathname === "/select-template";

  return (
    <>
      <div className="h-4 bg-[#063c8d] w-full" />
      <header className="bg-white px-6 py-3 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-3">
          {/* Hamburger: only visible on small screens AND not on select-template */}
          {!hideHamburger && (
            <button
              type="button"
              onClick={toggleSidebar}
              aria-label="Toggle sidebar"
              className="inline-flex lg:hidden items-center justify-center rounded-md border border-gray-200 bg-white hover:bg-gray-50 active:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
              style={{ width: 40, height: 40 }}
              title="Toggle sidebar"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="22"
                height="22"
                viewBox="0 0 24 24"
                fill="none"
              >
                <path
                  d="M4 7h16M4 12h16M4 17h16"
                  stroke="#111827"
                  strokeWidth="2"
                  strokeLinecap="round"
                />
              </svg>
            </button>
          )}

          <img src={naviLogo} alt="Logo" className="h-10 w-15" />
          <span className="text-[13px] font-semibold text-gray-700 tracking-wide">
            NAVIDOCS
          </span>
        </div>

        {/* Notification & User Info */}
        <div className="flex items-center gap-3">
          {/* Notification Bell */}
          <div
            className="bg-gray-100 rounded-lg px-3 py-2 flex items-center relative"
            style={{ height: "48px", cursor: "pointer" }}
            ref={bellRef}
            onClick={() => setShowDropdown((prev) => !prev)}
          >
            <img src={notifIcon} alt="Notifications" className="h-6 w-6" />
            {unreadCount > 0 && (
              <span
                style={{
                  position: "absolute",
                  top: 6,
                  right: 6,
                  background: "red",
                  color: "#fff",
                  borderRadius: "50%",
                  width: 16,
                  height: 16,
                  fontSize: 10,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                {unreadCount}
              </span>
            )}
            {showDropdown && (
              <NotificationDropdown
                notifications={notifications}
                onClose={() => setShowDropdown(true)}
                onSelect={handleNotificationSelect}
              />
            )}
          </div>

          {/* User Section */}
          {user && (
            <div
              className="bg-gray-100 rounded-lg px-3 py-2 flex items-center gap-3"
              style={{ height: "48px" }}
            >
              <div className="h-10 w-10 rounded-full overflow-hidden flex items-center justify-center border border-gray-300 bg-white">
                <img
                  src={
                    user.profile_picture
                      ? `${API_URL}${user.profile_picture}`
                      : defaultProfile
                  }
                  alt="Profile"
                  className={`object-cover ${
                    user.profile_picture ? "h-full w-full" : "h-8 w-8 object-contain opacity-90"
                  }`}
                  onError={(e) => {
                    e.currentTarget.onerror = null;
                    e.currentTarget.src = defaultProfile;
                  }}
                />
              </div>

              <div>
                <p className="text-sm font-semibold text-gray-700 leading-none">
                  {(user.firstname || "") + " " + (user.lastname || "")}
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
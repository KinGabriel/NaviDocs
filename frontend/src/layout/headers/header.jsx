/**
 * @fileoverview Header component for the application navigation and user interface.
 * Provides navigation controls, notification system, and user profile display.
 * @module components/headers/header
 */

// This is the header component for the application, which includes a logo, title, notifications, and user profile information.
import { useNavigate, useLocation } from 'react-router-dom';
import React, { useState, useRef, useEffect } from "react";
import axios from 'axios';
import NotificationDropdown from "../../components/dropdowns/notificationDropdown";
import '../../assets/css/global.css'
import naviLogo from '../../assets/images/navilogo.png';
import notifIcon from '../../assets/images/notif_icon.svg';
import { logoutAPI } from '../../api/authAPI.js';
import defaultProfile from '../../assets/images/profile_picture.png';
import { useDataPolling } from '../../hooks/useDataPolling.jsx';

const API_URL = import.meta.env.VITE_API_URL;

/**
 * Fetches notifications from the API
 * @async
 * @function fetchNotificationsAPI
 * @returns {Promise<Array<Object>>} Array of notification objects with standardized properties
 * @property {string|null} id - Notification identifier
 * @property {string} message - Notification message content
 * @property {string|null} link - Optional navigation link
 * @property {boolean} isRead - Read status of the notification
 * @property {string|null} createdAt - Timestamp of notification creation
 * @throws {Error} Logs error to console if fetch fails
 */
const fetchNotificationsAPI = async () => {
  try {
    const base = API_URL ? String(API_URL).replace(/\/$/, '') : '';
    const url = `${base}/api/notifications`;
    const res = await axios.get(url, { withCredentials: true });
    const data = res.data;
    if (!Array.isArray(data)) return [];
    return data.map((n = {}) => ({
      id: n._id || n.id || null,
      message: n.message || n.msg || '',
      link: n.link || n.url || null,
      isRead: !!(n.isRead || n.is_read || n.read),
      createdAt: n.createdAt || n.created_at || n.created || null,
    }));
  } catch (err) {
    console.error('Failed to fetch notifications:', err);
    return [];
  }
};

/**
 * Header component that displays application branding, notifications, and user information
 * @component
 * @param {Object} props - Component props
 * @param {Object} props.user - Current user object
 * @param {string} [props.user.firstname] - User's first name
 * @param {string} [props.user.lastname] - User's last name
 * @param {string} [props.user.profile_picture] - URL path to user's profile picture
 * @returns {React.ReactElement} Header component with navigation and user controls
 * 
 * @description
 * Main header component that includes:
 * - Application logo and branding
 * - Hamburger menu toggle for mobile sidebar (hidden on /select-template route)
 * - Notification bell with unread count badge
 * - User profile section with logout functionality
 * 
 * Features:
 * - Auto-refreshes notifications every 15 seconds
 * - Refetches notifications on tab focus/visibility change
 * - Responsive design with mobile hamburger menu
 * - Click-outside detection for notification dropdown
 * 
 * @example
 * <Header user={{ firstname: "John", lastname: "Doe", profile_picture: "/uploads/profile.jpg" }} />
 */
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

/**
   * Marks a notification as read in the backend and updates local state
   * @async
   * @function markAsRead
   * @param {string} id - Notification ID to mark as read
   * @returns {Promise<void>}
   * @throws {Error} Logs error to console if API call fails
   */
  const markAsRead = async (id) => {
    if (!id) return;
    try {
      const base = API_URL ? String(API_URL).replace(/\/$/, '') : '';
      const url = `${base}/api/notifications/${id}/read`;
      await axios.patch(url, null, { withCredentials: true });
      setNotifications(prev => prev.map(n => (n.id === id ? { ...n, isRead: true } : n)));
    } catch (err) {
      console.error('Failed to mark notification as read', err);
    }
  };

/**
   * Handles notification selection by marking it as read and navigating to its link
   * @function handleNotificationSelect
   * @param {Object} n - Notification object
   * @param {string} n.id - Notification ID
   * @param {string} [n.link] - Optional navigation link
   * @returns {void}
   */
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
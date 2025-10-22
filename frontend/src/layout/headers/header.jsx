// This is the header component for the application, which includes a logo, title, notifications, and user profile information.
import { useNavigate } from 'react-router-dom';
import React, { useState, useRef, useEffect } from "react";
import NotificationDropdown from "../../components/dropdowns/notificationDropdown";
import '../../assets/css/global.css'
import naviLogo from '../../assets/images/navilogo.png';
import notifIcon from '../../assets/images/notif_icon.svg';
import { logoutAPI } from '../../api/authAPI.js';
const rawUrls = import.meta.env.VITE_API_URL || "http://localhost:8000";
const API_URLS = rawUrls.split(",");

const API_URL =
  API_URLS.find(url => url.includes(window.location.hostname)) || API_URLS[0];  
export default function Header({ user }) {
  const navigate = useNavigate();
  const [showDropdown, setShowDropdown] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const bellRef = useRef();

  // Poll notifications every 30s
  useEffect(() => {
    let mounted = true;
    const fetchNotifications = async () => {
      try {
        const res = await fetch('/api/notifications', { credentials: 'include' });
        if (!mounted) return;
        if (res.ok) {
          const data = await res.json();
          // Expecting array: { _id, message, link, isRead, createdAt }
          setNotifications(data.map(n => ({
            id: n._id,
            message: n.message,
            link: n.link,
            isRead: !!n.isRead,
            createdAt: n.createdAt
          })));
        }
      } catch (err) {
        console.error('Failed to fetch notifications:', err);
      }
    };

    fetchNotifications();
    const id = setInterval(fetchNotifications, 30000);
    return () => { mounted = false; clearInterval(id); };
  }, []);

  const unreadCount = notifications.filter(n => !n.isRead).length;

  const markAsRead = async (id) => {
    try {
      await fetch(`/api/notifications/${id}/read`, { method: 'PATCH', credentials: 'include' });
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, isRead: true } : n));
    } catch (err) {
      console.error('Failed to mark notification as read', err);
    }
  };

  const handleNotificationSelect = (n) => {
    if (!n) return;
    markAsRead(n.id);
    setShowDropdown(false);
    // Navigate to the link within app
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

  return (
    <>
      {/* Top Blue Header */}
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
          <div
            className="bg-gray-100 rounded-lg px-3 py-2 flex items-center relative"
            style={{ height: '48px', cursor: 'pointer' }}
            ref={bellRef}
            onClick={() => setShowDropdown((prev) => !prev)}
          >
            <img src={notifIcon} alt="Notifications" className="h-6 w-6" />
            {/* Notification badge */}
            {unreadCount > 0 && (
              <span style={{
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
                justifyContent: "center"
              }}>
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
            <div className="bg-gray-100 rounded-lg px-3 py-2 flex items-center gap-3" style={{ height: '48px' }}>
              <img
                src={user.profile_picture ? `${API_URL}${user.profile_picture}` : '/default-avatar.png'}
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

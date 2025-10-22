import { useEffect, useRef, useState } from "react";
import { useNavigate, useLocation } from 'react-router-dom';

const rawUrls = import.meta.env.VITE_API_URL || "http://localhost:8000";
const API_URLS = rawUrls.split(",");
const API_URL =
  API_URLS.find(url => url.includes(window.location.hostname)) || API_URLS[0];  

export default function Sidebar({ user }) {
  // breakpoint helper (lg = 1024)
  const isLg = () => window.innerWidth <= 1024;

  // smarter initial collapsed:
  // use saved value if present
  // otherwise default to collapsed on mobile, expanded on desktop
  const getInitialCollapsed = () => {
    const saved = localStorage.getItem('sidebarCollapsed');
    if (saved !== null) return saved === '1';
    return isLg(); // collapsed if mobile on first load
  };

  const [isMobile, setIsMobile] = useState(isLg());
  const [collapsed, setCollapsed] = useState(getInitialCollapsed);
  const [mobileOpen, setMobileOpen] = useState(false);
  const prevIsMobile = useRef(isMobile);

  // keep isMobile in sync
  useEffect(() => {
    const onResize = () => setIsMobile(isLg());
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  // React to mode changes
  useEffect(() => {
    // when switching FROM mobile TO desktop, expand by default
    if (prevIsMobile.current && !isMobile) {
      setMobileOpen(false);
      setCollapsed(false);
      localStorage.setItem('sidebarCollapsed', '0');
    }
    // when switching TO mobile, hide panel
    if (!prevIsMobile.current && isMobile) {
      setMobileOpen(false);
    }
    prevIsMobile.current = isMobile;
  }, [isMobile]);

  // Header toggle listener
  useEffect(() => {
    const handler = () => {
      if (isMobile) {
        setMobileOpen(v => !v);
      } else {
        setCollapsed(prev => {
          const next = !prev;
          localStorage.setItem('sidebarCollapsed', next ? '1' : '0');
          return next;
        });
      }
    };
    window.addEventListener('sidebar:toggle', handler);
    return () => window.removeEventListener('sidebar:toggle', handler);
  }, [isMobile]);

  // Close mobile with ESC
  useEffect(() => {
    if (!isMobile || !mobileOpen) return;
    const onKey = (e) => e.key === 'Escape' && setMobileOpen(false);
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isMobile, mobileOpen]);

  const roleValue = user?.role?.name || user?.role;
  const menu = roleValue ? MENU_CONFIG[roleValue] : undefined;
  const navigate = useNavigate();
  const location = useLocation();

  // active
  let activeLabel = null;
  if (menu) {
    for (const item of menu) {
      if (item.route && location.pathname.startsWith(item.route)) { activeLabel = item.label; break; }
    }
    if (!activeLabel) {
      for (const item of menu) {
        if (item.route === location.pathname) { activeLabel = item.label; break; }
      }
    }
  }

  const widthPx = collapsed ? 72 : 320;
  const avatarClasses = (isMobile && !mobileOpen) || collapsed
    ? "h-10 w-10 rounded-full object-cover border-2 border-gray-100 mb-4"
    : "h-28 w-28 rounded-full object-cover border-4 border-gray-100 mb-4";

  // Mobile off-canvas
  if (isMobile) {
    return (
      <>
        {mobileOpen && (
          <div
            className="fixed inset-0 bg-black/40 z-40"
            onClick={() => setMobileOpen(false)}
          />
        )}
        <div
          className={`fixed z-50 top-0 left-0 h-full bg-white shadow-xl pt-8 pb-4 px-6 flex flex-col items-center rounded-r-xl transition-transform duration-200 ease-out ${mobileOpen ? 'translate-x-0' : '-translate-x-full'}`}
          style={{ width: 320 }}
          role="dialog"
          aria-modal="true"
        >
          <img
            src={user?.profile_picture ? `${API_URL}${user.profile_picture}` : '/default-avatar.png'}
            alt="Profile"
            className={avatarClasses}
            onError={e => { e.currentTarget.onerror = null; e.currentTarget.src = '/default-avatar.jpg'; }}
          />
          <h2 className="text-xl font-bold text-center mb-0">
            {(user?.firstname || '') + ' ' + (user?.lastname || '')}
          </h2>
          <div className="text-sm text-gray-500 text-center mb-6">{roleValue}</div>

          <nav className="w-full flex flex-col gap-1 mb-8">
            {menu ? menu.map(item => (
              <SidebarItem
                key={item.label}
                icon={item.icon}
                label={item.label}
                active={activeLabel === item.label}
                onClick={() => { if (item.route) { navigate(item.route); setMobileOpen(false); } }}
                collapsed={false}
              />
            )) : (
              <div className="text-gray-400 text-center py-4">No menu available for this role.</div>
            )}
          </nav>

          <div className="absolute bottom-4 left-0 w-full text-center text-[10px] text-gray-400 select-none">
            Copyright ©2025 NaviDocs
          </div>
        </div>
      </>
    );
  }

  // Desktop rail (auto-expanded by default)
  return (
    <div
      className="bg-white shadow pt-8 pb-4 px-8 flex flex-col items-center min-h-[70vh] relative mx-6 mt-8 rounded-xl"
      style={{ width: widthPx, transition: "width 180ms ease" }}
    >
      <img
        src={user?.profile_picture ? `${API_URL}${user.profile_picture}` : '/default-avatar.png'}
        alt="Profile"
        className={avatarClasses}
        onError={e => { e.currentTarget.onerror = null; e.currentTarget.src = '/default-avatar.jpg'; }}
      />

      {!collapsed && (
        <>
          <h2 className="text-xl font-bold text-center mb-0">
            {(user?.firstname || '') + ' ' + (user?.lastname || '')}
          </h2>
          <div className="text-sm text-gray-500 text-center mb-6">
            {roleValue}
          </div>
        </>
      )}

      <nav className="w-full flex flex-col gap-1 mb-8">
        {menu ? menu.map(item => (
          <SidebarItem
            key={item.label}
            icon={item.icon}
            label={item.label}
            active={activeLabel === item.label}
            onClick={() => { if (item.route) navigate(item.route); }}
            collapsed={collapsed}
          />
        )) : (
          <div className="text-gray-400 text-center py-4">No menu available for this role.</div>
        )}
      </nav>

      {!collapsed && (
        <div className="absolute bottom-4 left-0 w-full text-center text-[10px] text-gray-400 select-none">
          Copyright ©2025 NaviDocs
        </div>
      )}
    </div>
  );
}

function SidebarItem({ icon, label, active, onClick, collapsed }) {
  const containerBase =
    "flex items-center w-full rounded transition-colors cursor-pointer relative";
  const padding = collapsed ? "px-3 py-3" : "px-8 py-3";
  const stateClasses = active ? "bg-gray-100 font-bold" : "hover:bg-gray-50";

  return (
    <div className={`${containerBase} ${padding} ${stateClasses}`} onClick={onClick} title={label}>
      {active && <div className="absolute left-0 top-0 h-full w-1 bg-yellow-400 rounded-r"></div>}
      <div className="mr-4 flex-shrink-0">{icon}</div>
      {!collapsed && <span className="text-base">{label}</span>}
    </div>
  );
}

/* ===== MENU_CONFIG ===== */
const MENU_CONFIG = {
  /* Admin Module */
  Admin: [
    {
      label: "Dashboard",
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" width="2em" height="2em" viewBox="0 0 15 15"><path fill="#003DA5" fillRule="evenodd" d="M2.8 1h-.05c-.229 0-.426 0-.6.041A1.5 1.5 0 0 0 1.04 2.15c-.04.174-.04.37-.04.6v2.5c0 .229 0 .426.041.6A1.5 1.5 0 0 0 2.15 6.96c.174.04.37.04.6.04h2.5c.229 0 .426 0 .6-.041A1.5 1.5 0 0 0 6.96 5.85c.04-.174.04-.37.04-.6v-2.5c0-.229 0-.426-.041-.6A1.5 1.5 0 0 0 5.85 1.04C5.676 1 5.48 1 5.25 1zm-.417 1.014c.043-.01.11-.014.417-.014h2.4c.308 0 .374.003.417.014a.5.5 0 0 1 .37.37c.01.042.013.108.013.416v2.4c0 .308-.003.374-.014.417a.5.5 0 0 1-.37.37C5.575 5.996 5.509 6 5.2 6H2.8c-.308 0-.374-.003-.417-.014a.5.5 0 0 1-.37-.37C2.004 5.575 2 5.509 2 5.2V2.8c0-.308.003-.374.014-.417a.5.5 0 0 1 .37-.37M9.8 1h-.05c-.229 0-.426 0-.6.041A1.5 1.5 0 0 0 8.04 2.15c-.04.174-.04.37-.04.6v2.5c0 .229 0 .426.041.6A1.5 1.5 0 0 0 9.15 6.96c.174.04.37.04.6.04h2.5c.229 0 .426 0 .6-.041a1.5 1.5 0 0 0 1.11-1.109c.04-.174.04-.37.04-.6v-2.5c0-.229 0-.426-.041-.6a1.5 1.5 0 0 0-1.109-1.11c-.174-.04-.37-.04-.6-.04zm-.417 1.014c.043-.01.11-.014.417-.014h2.4c.308 0 .374.003.417.014a.5.5 0 0 1 .37.37c.01.042.013.108.013.416v2.4c0 .308-.004.374-.014.417a.5.5 0 0 1-.37.37c-.042.01-.108.013-.416.013H9.8c-.308 0 -.374-.003-.417-.014a.5.5 0 0 1-.37-.37C9.004 5.575 9 5.509 9 5.2V2.8c0-.308.003-.374.014-.417a.5.5 0 0 1 .37-.37M2.75 8h2.5c.229 0 .426 0 .6.041A1.5 1.5 0 0 1 6.96 9.15c.04.174.04.37.04.6v2.5c0 .229 0 .426-.041.6a1.5 1.5 0 0 1-1.109 1.11c-.174.04-.37.04-.6.04h-2.5c-.229 0-.426 0-.6-.041a1.5 1.5 0 0 1-1.11-1.109c-.04-.174-.04-.37-.04-.6v-2.5c0-.229 0-.426.041-.6A1.5 1.5 0 0 1 2.15 8.04c.174-.04.37-.04.6-.04m.05 1c-.308 0-.374.003-.417.014a.5.5 0 0 0-.37.37C2.004 9.425 2 9.491 2 9.8v2.4c0 .308.003.374.014.417a.5.5 0 0 0 .37.37c.042.01.108.013.416.013h2.4c.308 0 .374-.004.417-.014a.5.5 0 0 0 .37-.37c.01-.042.013-.108.013-.416V9.8c0-.308-.003-.374-.014-.417a.5.5 0 0 0-.37-.37C5.575 9.004 5.509 9 5.2 9zm7-1h-.05c-.229 0-.426 0-.6.041A1.5 1.5 0 0 0 8.04 9.15c-.04.174-.04.37-.04.6v2.5c0 .229 0 .426.041.6a1.5 1.5 0 0 0 1.109 1.11c.174.041.371.041.6.041h2.5c.229 0 .426 0 .6-.041a1.5 1.5 0 0 0 1.109-1.109c.041-.174.041-.371.041-.6v-2.5c0-.229 0-.426-.041-.6A1.5 1.5 0 0 0 12.85 8.04c-.174-.04-.37-.04-.6-.04zm-.417 1.014c.043-.01.11-.014.417-.014h2.4c.308 0 .374.003.417.014a.5.5 0 0 1 .37.37c.01.042.013.108.013.416v2.4c0 .308-.004.374-.014.417a.5.5 0 0 1-.37.37c-.042.01-.108.013-.416.013H9.8c-.308 0-.374-.004-.417-.014a.5.5 0 0 1-.37-.37C9.004 12.575 9 12.509 9 12.2V9.8c0-.308.003-.374.014-.417a.5.5 0 0 1 .37-.37"/></svg>
      ),
      route: "/admin/dashboard"
    },
    {
      label: "User Accounts",
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" width="2em" height="2em" viewBox="0 0 24 24"><path fill="#003DA5" d="M12 5a3.5 3.5 0 0 0-3.5 3.5A3.5 3.5 0 0 0 12 12a3.5 3.5 0 0 0 3.5-3.5A3.5 3.5 0 0 0 12 5m0 2a1.5 1.5 0 0 1 1.5 1.5A1.5 1.5 0 0 1 12 10a1.5 1.5 0 0 1-1.5-1.5A1.5 1.5 0 0 1 12 7M5.5 8A2.5 2.5 0 0 0 3 10.5c0 .94.53 1.75 1.29 2.18c.36.2.77.32 1.21.32s.85-.12 1.21-.32c.37-.21.68-.51.91-.87A5.42 5.42 0 0 1 6.5 8.5v-.28c-.3-.14-.64-.22-1-.22m13 0c-.36 0-.7.08-1 .22v.28c0 1.2-.39 2.36-1.12 3.31c.12.19.25.34.4.49a2.48 2.48 0 0 0 1.72.7c.44 0 .85-.12 1.21-.32c.76-.43 1.29-1.24 1.29-2.18A2.5 2.5 0 0 0 18.5 8M12 14c-2.34 0-7 1.17-7 3.5V19h14v-1.5c0-2.33-4.66-3.5-7-3.5m-7.29.55C2.78 14.78 0 15.76 0 17.5V19h3v-1.93c0-1.01.69-1.85 1.71-2.52m14.58 0c1.02.67 1.71 1.51 1.71 2.52V19h3v-1.5c0-1.74-2.78-2.72-4.71-2.95M12 16c1.53 0 3.24.5 4.23 1H7.77c.99-.5 2.7-1 4.23-1"/></svg>
      ),
      route: "/admin/accounts"
    },
    {
      label: "Create User",
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" width="2em" height="2em" viewBox="0 0 24 24"><path fill="#003DA5" d="M14 14.252v2.09A6 6 0 0 0 6 22H4a8 8 0 0 1 10-7.749M12 13c-3.315 0-6-2.685-6-6s2.685-6 6-6s6 2.685 6 6s-2.685 6-6 6m0-2c2.21 0 4-1.79 4-4s-1.79-4-4-4s-4 1.79-4 4s1.79 4 4 4m6 6v-3h2v3h3v2h-3v3h-2v-3h-3v-2z"/></svg>
      ),
      route: "/admin/create-user"
    },
    {
      label: "Account Settings",
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" width="2em" height="2em" viewBox="0 0 24 24"><path fill="#003DA5" d="M15 21h6v-.825q-.625-.575-1.4-.875T18 19t-1.6.3t-1.4.875zm3-3q.625 0 1.063-.437T19.5 16.5t-.437-1.062T18 15t-1.062.438T16.5 16.5t.438 1.063T18 18m-5.95-9.5q-1.45 0-2.475 1.025T8.55 12q0 1.2.675 2.1T11 15.35q0-.575.013-1.1t.212-.95q-.35-.2-.512-.55T10.55 12q0-.625.438-1.062t1.062-.438q.375 0 .713.188t.562.512q.275-.125.575-.175t.6-.05h.9Q15.075 9.9 14.163 9.2t-2.113-.7M9.25 22l-.4-3.2q-.325-.125-.612-.3t-.563-.375L4.7 19.375l-2.75-4.75l2.575-1.95Q4.5 12.5 4.5 12.338v-.675q0-.163.025-.338L1.95 9.375l2.75-4.75l2.975 1.25q.275-.2.575-.375t.6-.3l.4-3.2h5.5l.4 3.2q.325.125.613.3t.562.375l2.975-1.25l2.75 4.75L19.925 11H17.4q-.025-.125-.05-.262t-.075-.263l2.15-1.625l-.975-1.7l-2.475 1.05q-.55-.575-1.213-.962t-1.437-.588L13 4h-1.975l-.35 2.65q-.775.2-1.437.588t-1.213.937L5.55 7.15l-.975 1.7l2.15 1.6q-.125.375-.175.75t-.05.8q0 .4.05.775t.175.75l-2.15 1.625l.975 1.7l2.475-1.05q.6.625 1.35 1.05T11 17.4V22zm5.25 1q-.625 0-1.062-.437T13 21.5v-7q0-.625.438-1.062T14.5 13h7q.625 0 1.063.438T23 14.5v7q0 .625-.437 1.063T21.5 23z"/></svg>
      ),
      route: "/account/settings"
    }
  ],

  /* Faculty Module */
  Faculty: [
    {
      
      label: "Dashboard",
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" width="2em" height="2em" viewBox="0 0 15 15"><path fill="#003DA5" fillRule="evenodd" d="M2.8 1h-.05c-.229 0-.426 0-.6.041A1.5 1.5 0 0 0 1.04 2.15c-.04.174-.04.37-.04.6v2.5c0 .229 0 .426.041.6A1.5 1.5 0 0 0 2.15 6.96c.174.04.37.04.6.04h2.5c.229 0 .426 0 .6-.041A1.5 1.5 0 0 0 6.96 5.85c.04-.174.04-.37.04-.6v-2.5c0-.229 0-.426-.041-.6A1.5 1.5 0 0 0 5.85 1.04C5.676 1 5.48 1 5.25 1zm-.417 1.014c.043-.01.11-.014.417-.014h2.4c.308 0 .374.003.417.014a.5.5 0 0 1 .37.37c.01.042.013.108.013.416v2.4c0 .308-.003.374-.014.417a.5.5 0 0 1-.37.37C5.575 5.996 5.509 6 5.2 6H2.8c-.308 0-.374-.003-.417-.014a.5.5 0 0 1-.37-.37C2.004 5.575 2 5.509 2 5.2V2.8c0-.308.003-.374.014-.417a.5.5 0 0 1 .37-.37M9.8 1h-.05c-.229 0-.426 0-.6.041A1.5 1.5 0 0 0 8.04 2.15c-.04.174-.04.37-.04.6v2.5c0 .229 0 .426.041.6A1.5 1.5 0 0 0 9.15 6.96c.174.04.37.04.6.04h2.5c.229 0 .426 0 .6-.041a1.5 1.5 0 0 0 1.11-1.109c.04-.174.04-.37.04-.6v-2.5c0-.229 0-.426-.041-.6a1.5 1.5 0 0 0-1.109-1.11c-.174-.04-.37-.04-.6-.04zm-.417 1.014c.043-.01.11-.014.417-.014h2.4c.308 0 .374.003.417.014a.5.5 0 0 1 .37.37c.01.042.013.108.013.416v2.4c0 .308-.004.374-.014.417a.5.5 0 0 1-.37.37c-.042.01-.108.013-.416.013H9.8c-.308 0 -.374-.003-.417-.014a.5.5 0 0 1-.37-.37C9.004 5.575 9 5.509 9 5.2V2.8c0-.308.003-.374.014-.417a.5.5 0 0 1 .37-.37M2.75 8h2.5c.229 0 .426 0 .6.041A1.5 1.5 0 0 1 6.96 9.15c.04.174.04.37.04.6v2.5c0 .229 0 .426-.041.6a1.5 1.5 0 0 1-1.109 1.11c-.174.04-.37.04-.6.04h-2.5c-.229 0-.426 0-.6-.041a1.5 1.5 0 0 1-1.11-1.109c-.04-.174-.04-.37-.04-.6v-2.5c0-.229 0-.426.041-.6A1.5 1.5 0 0 1 2.15 8.04c.174-.04.37-.04.6-.04m.05 1c-.308 0-.374.003-.417.014a.5.5 0 0 0-.37.37C2.004 9.425 2 9.491 2 9.8v2.4c0 .308.003.374.014.417a.5.5 0 0 0 .37.37c.042.01.108.013.416.013h2.4c.308 0 .374-.004.417-.014a.5.5 0 0 0 .37-.37c.01-.042.013-.108.013-.416V9.8c0-.308-.003-.374-.014-.417a.5.5 0 0 0-.37-.37C5.575 9.004 5.509 9 5.2 9zm7-1h-.05c-.229 0-.426 0-.6.041A1.5 1.5 0 0 0 8.04 9.15c-.04.174-.04.37-.04.6v2.5c0 .229 0 .426.041.6a1.5 1.5 0 0 0 1.109 1.11c.174.041.371.041.6.041h2.5c.229 0 .426 0 .6-.041a1.5 1.5 0 0 0 1.109-1.109c.041-.174.041-.371.041-.6v-2.5c0-.229 0-.426-.041-.6A1.5 1.5 0 0 0 12.85 8.04c-.174-.04-.37-.04-.6-.04zm-.417 1.014c.043-.01.11-.014.417-.014h2.4c.308 0 .374.003.417.014a.5.5 0 0 1 .37.37c.01.042.013.108.013.416v2.4c0 .308-.004.374-.014.417a.5.5 0 0 1-.37.37c-.042.01-.108.013-.416.013H9.8c-.308 0-.374-.004-.417-.014a.5.5 0 0 1-.37-.37C9.004 12.575 9 12.509 9 12.2V9.8c0-.308.003-.374.014-.417a.5.5 0 0 1 .37-.37" /></svg>
      ),
      route: "/admin/dashboard"
    },
    {
      label: "Documents",
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" width="2em" height="2em" viewBox="0 0 48 48"><path fill="none" stroke="#0035da" strokeLinecap="round" strokeLinejoin="round" d="M10.364 4.51a1.994 1.994 0 0 0-1.945 1.994v35.002a1.995 1.995 0 0 0 1.944 1.994h27.224a1.994 1.994 0 0 0 1.994-1.994V14.472h-7.977a1.995 1.995 0 0 1-1.945-1.995V4.5Zm19.205 0l9.962 9.962m-23.693 8.456h16.274M15.838 34.994h16.274m-16.274-6.033h16.274" strokeWidth="2"/></svg>
      ),
      route: "/documents"
    },
    { 
      label: "Templates",
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" width="2em" height="2em" viewBox="0 0 24 24"><path fill="#0035da" d="M2 2h20v20H2zm2 2v4h16V4zm16 6h-9v10h9zM9 20V10H4v10z"/></svg>
      ),  
      route: "/faculty/templates"
    },
    { 
      label: "Storage",
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" width="1.9em" height="1.9em" viewBox="0 0 24 24"><path fill="none" stroke="#003DA5" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" d="M3 6h5l2 2h11v10.4a.6.6 0 0 1-.6.6H3.6a.6.6 0 0 1-.6-.6V6.6a.6.6 0 0 1 .6-.6Z"/></svg>
      ),  
      route: "/storage"
    },
    {
      label: "Account Settings",
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" width="2em" height="2em" viewBox="0 0 24 24"><path fill="#003DA5" d="M15 21h6v-.825q-.625-.575-1.4-.875T18 19t-1.6.3t-1.4.875zm3-3q.625 0 1.063-.437T19.5 16.5t-.437-1.062T18 15t-1.062.438T16.5 16.5t.438 1.063T18 18m-5.95-9.5q-1.45 0-2.475 1.025T8.55 12q0 1.2.675 2.1T11 15.35q0-.575.013-1.1t.212-.95q-.35-.2-.512-.55T10.55 12q0-.625.438-1.062t1.062-.438q.375 0 .713.188t.562.512q.275-.125.575-.175t.6-.05h.9Q15.075 9.9 14.163 9.2t-2.113-.7M9.25 22l-.4-3.2q-.325-.125-.612-.3t-.563-.375L4.7 19.375l-2.75-4.75l2.575-1.95Q4.5 12.5 4.5 12.338v-.675q0-.163.025-.338L1.95 9.375l2.75-4.75l2.975 1.25q.275-.2.575-.375t.6-.3l.4-3.2h5.5l.4 3.2q.325.125.613.3t.562.375l2.975-1.25l2.75 4.75L19.925 11H17.4q-.025-.125-.05-.262t-.075-.263l2.15-1.625l-.975-1.7l-2.475 1.05q-.55-.575-1.213-.962t-1.437-.588L13 4h-1.975l-.35 2.65q-.775.2-1.437.588t-1.213.937L5.55 7.15l-.975 1.7l2.15 1.6q-.125.375-.175.75t-.05.8q0 .4.05.775t.175.75l-2.15 1.625l.975 1.7l2.475-1.05q.6.625 1.35 1.05T11 17.4V22zm5.25 1q-.625 0-1.062-.437T13 21.5v-7q0-.625.438-1.062T14.5 13h7q.625 0 1.063.438T23 14.5v7q0 .625-.437 1.063T21.5 23z"/></svg>
      ),
      route: "/account/settings"
    },
  ],

  /* Document Controller Module */
  "Document Controller": [
    {
      label: "Dashboard",
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" width="2em" height="2em" viewBox="0 0 15 15"><path fill="#003DA5" fillRule="evenodd" d="M2.8 1h-.05c-.229 0-.426 0-.6.041A1.5 1.5 0 0 0 1.04 2.15c-.04.174-.04.37-.04.6v2.5c0 .229 0 .426.041.6A1.5 1.5 0 0 0 2.15 6.96c.174.04.37.04.6.04h2.5c.229 0 .426 0 .6-.041A1.5 1.5 0 0 0 6.96 5.85c.04-.174.04-.37.04-.6v-2.5c0-.229 0-.426-.041-.6A1.5 1.5 0 0 0 5.85 1.04C5.676 1 5.48 1 5.25 1zm-.417 1.014c.043-.01.11-.014.417-.014h2.4c.308 0 .374.003.417.014a.5.5 0 0 1 .37.37c.01.042.013.108.013.416v2.4c0 .308-.003.374-.014.417a.5.5 0 0 1-.37.37C5.575 5.996 5.509 6 5.2 6H2.8c-.308 0-.374-.003-.417-.014a.5.5 0 0 1-.37-.37C2.004 5.575 2 5.509 2 5.2V2.8c0-.308.003-.374.014-.417a.5.5 0 0 1 .37-.37M9.8 1h-.05c-.229 0-.426 0-.6.041A1.5 1.5 0 0 0 8.04 2.15c-.04.174-.04.37-.04.6v2.5c0 .229 0 .426.041.6A1.5 1.5 0 0 0 9.15 6.96c.174.04.37.04.6.04h2.5c.229 0 .426 0 .6-.041a1.5 1.5 0 0 0 1.11-1.109c.04-.174.04-.37.04-.6v-2.5c0-.229 0-.426-.041-.6a1.5 1.5 0 0 0-1.109-1.11c-.174-.04-.37-.04-.6-.04zm-.417 1.014c.043-.01.11-.014.417-.014h2.4c.308 0 .374.003.417.014a.5.5 0 0 1 .37.37c.01.042.013.108.013.416v2.4c0 .308-.004.374-.014.417a.5.5 0 0 1-.37.37c-.042.01-.108.013-.416.013H9.8c-.308 0 -.374-.003-.417-.014a.5.5 0 0 1-.37-.37C9.004 5.575 9 5.509 9 5.2V2.8c0-.308.003-.374.014-.417a.5.5 0 0 1 .37-.37M2.75 8h2.5c.229 0 .426 0 .6.041A1.5 1.5 0 0 1 6.96 9.15c.04.174.04.37.04.6v2.5c0 .229 0 .426-.041.6a1.5 1.5 0 0 1-1.109 1.11c-.174.04-.37.04-.6.04h-2.5c-.229 0-.426 0-.6-.041a1.5 1.5 0 0 1-1.11-1.109c-.04-.174-.04-.37-.04-.6v-2.5c0-.229 0-.426.041-.6A1.5 1.5 0 0 1 2.15 8.04c.174-.04.37-.04.6-.04m.05 1c-.308 0-.374.003-.417.014a.5.5 0 0 0-.37.37C2.004 9.425 2 9.491 2 9.8v2.4c0 .308.003.374.014.417a.5.5 0 0 0 .37.37c.042.01.108.013.416.013h2.4c.308 0 .374-.004.417-.014a.5.5 0 0 0 .37-.37c.01-.042.013-.108.013-.416V9.8c0-.308-.003-.374-.014-.417a.5.5 0 0 0-.37-.37C5.575 9.004 5.509 9 5.2 9zm7-1h-.05c-.229 0-.426 0-.6.041A1.5 1.5 0 0 0 8.04 9.15c-.04.174-.04.37-.04.6v2.5c0 .229 0 .426.041.6a1.5 1.5 0 0 0 1.109 1.11c.174.041.371.041.6.041h2.5c.229 0 .426 0 .6-.041a1.5 1.5 0 0 0 1.109-1.109c.041-.174.041-.371.041-.6v-2.5c0-.229 0-.426-.041-.6A1.5 1.5 0 0 0 12.85 8.04c-.174-.04-.37-.04-.6-.04zm-.417 1.014c.043-.01.11-.014.417-.014h2.4c.308 0 .374.003.417.014a.5.5 0 0 1 .37.37c.01.042.013.108.013.416v2.4c0 .308-.004.374-.014.417a.5.5 0 0 1-.37.37c-.042.01-.108.013-.416.013H9.8c-.308 0-.374-.004-.417-.014a.5.5 0 0 1-.37-.37C9.004 12.575 9 12.509 9 12.2V9.8c0-.308.003-.374.014-.417a.5.5 0 0 1 .37-.37"/></svg>
      ),
      route: "/document-controller/dashboard"
    },
    {
      label: "Documents",
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" width="2em" height="2em" viewBox="0 0 48 48"><path fill="none" stroke="#0035da" strokeLinecap="round" strokeLinejoin="round" d="M10.364 4.51a1.994 1.994 0 0 0-1.945 1.994v35.002a1.995 1.995 0 0 0 1.944 1.994h27.224a1.994 1.994 0 0 0 1.994-1.994V14.472h-7.977a1.995 1.995 0 0 1-1.945-1.995V4.5Zm19.205 0l9.962 9.962m-23.693 8.456h16.274M15.838 34.994h16.274m-16.274-6.033h16.274" strokeWidth="2"/></svg>
      ),
      route: "/documents"
    },
    { 
      label: "Templates",
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" width="2em" height="2em" viewBox="0 0 24 24"><path fill="#0035da" d="M2 2h20v20H2zm2 2v4h16V4zm16 6h-9v10h9zM9 20V10H4v10z"/></svg>
      ),  
      route: "/document-controller/templates"
    },
    { 
      label: "Document Workflow",
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" width="2em" height="2em" viewBox="0 0 24 24"><g fill="none" stroke="#003DA5" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5"><path d="M20 13V5.749a.6.6 0 0 0-.176-.425l-3.148-3.148A.6.6 0 0 0 16.252 2H4.6a.6.6 0 0 0-.6.6v18.8a.6.6 0 0 0 .6.6H14"/><path d="M16 2v3.4a.6.6 0 0 0 .6.6H20m-4 13h6m0 0l-3-3m3 3l-3 3"/></g></svg>
      ),  
      route: "/document-controller/document-workflow"
    },
    { 
      label: "Storage",
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" width="1.9em" height="1.9em" viewBox="0 0 24 24"><path fill="none" stroke="#003DA5" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" d="M3 6h5l2 2h11v10.4a.6.6 0 0 1-.6.6H3.6a.6.6 0 0 1-.6-.6V6.6a.6.6 0 0 1 .6-.6Z"/></svg>
      ),  
      route: "/storage"
    },
    {
      label: "Account Settings",
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" width="2em" height="2em" viewBox="0 0 24 24"><path fill="#003DA5" d="M15 21h6v-.825q-.625-.575-1.4-.875T18 19t-1.6.3t-1.4.875zm3-3q.625 0 1.063-.437T19.5 16.5t-.437-1.062T18 15t-1.062.438T16.5 16.5t.438 1.063T18 18m-5.95-9.5q-1.45 0-2.475 1.025T8.55 12q0 1.2.675 2.1T11 15.35q0-.575.013-1.1t.212-.95q-.35-.2-.512-.55T10.55 12q0-.625.438-1.062t1.062-.438q.375 0 .713.188t.562.512q.275-.125.575-.175t.6-.05h.9Q15.075 9.9 14.163 9.2t-2.113-.7M9.25 22l-.4-3.2q-.325-.125-.612-.3t-.563-.375L4.7 19.375l-2.75-4.75l2.575-1.95Q4.5 12.5 4.5 12.338v-.675q0-.163.025-.338L1.95 9.375l2.75-4.75l2.975 1.25q.275-.2.575-.375t.6-.3l.4-3.2h5.5l.4 3.2q.325.125.613.3t.562.375l2.975-1.25l2.75 4.75L19.925 11H17.4q-.025-.125-.05-.262t-.075-.263l2.15-1.625l-.975-1.7l-2.475 1.05q-.55-.575-1.213-.962t-1.437-.588L13 4h-1.975l-.35 2.65q-.775.2-1.437.588t-1.213.937L5.55 7.15l-.975 1.7l2.15 1.6q-.125.375-.175.75t-.05.8q0 .4.05.775t.175.75l-2.15 1.625l.975 1.7l2.475-1.05q.6.625 1.35 1.05T11 17.4V22zm5.25 1q-.625 0-1.062-.437T13 21.5v-7q0-.625.438-1.062T14.5 13h7q.625 0 1.063.438T23 14.5v7q0 .625-.437 1.063T21.5 23z"/></svg>
      ),
      route: "/account/settings"
    },
  ],

  /* Secretary Module */
  Secretary: [
    {
      label: "Dashboard",
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" width="2em" height="2em" viewBox="0 0 15 15"><path fill="#003DA5" fillRule="evenodd" d="M2.8 1h-.05c-.229 0-.426 0-.6.041A1.5 1.5 0 0 0 1.04 2.15c-.04.174-.04.37-.04.6v2.5c0 .229 0 .426.041.6A1.5 1.5 0 0 0 2.15 6.96c.174.04.37.04.6.04h2.5c.229 0 .426 0 .6-.041A1.5 1.5 0 0 0 6.96 5.85c.04-.174.04-.37.04-.6v-2.5c0-.229 0-.426-.041-.6A1.5 1.5 0 0 0 5.85 1.04C5.676 1 5.48 1 5.25 1zm-.417 1.014c.043-.01.11-.014.417-.014h2.4c.308 0 .374.003.417.014a.5.5 0 0 1 .37.37c.01.042.013.108.013.416v2.4c0 .308-.003.374-.014.417a.5.5 0 0 1-.37.37C5.575 5.996 5.509 6 5.2 6H2.8c-.308 0-.374-.003-.417-.014a.5.5 0 0 1-.37-.37C2.004 5.575 2 5.509 2 5.2V2.8c0-.308.003-.374.014-.417a.5.5 0 0 1 .37-.37M9.8 1h-.05c-.229 0-.426 0-.6.041A1.5 1.5 0 0 0 8.04 2.15c-.04.174-.04.37-.04.6v2.5c0 .229 0 .426.041.6A1.5 1.5 0 0 0 9.15 6.96c.174.04.37.04.6.04h2.5c.229 0 .426 0 .6-.041a1.5 1.5 0 0 0 1.11-1.109c.04-.174.04-.37.04-.6v-2.5c0-.229 0-.426-.041-.6a1.5 1.5 0 0 0-1.109-1.11c-.174-.04-.37-.04-.6-.04zm-.417 1.014c.043-.01.11-.014.417-.014h2.4c.308 0 .374.003.417.014a.5.5 0 0 1 .37.37c.01.042.013.108.013.416v2.4c0 .308-.004.374-.014.417a.5.5 0 0 1-.37.37c-.042.01-.108.013-.416.013H9.8c-.308 0 -.374-.003-.417-.014a.5.5 0 0 1-.37-.37C9.004 5.575 9 5.509 9 5.2V2.8c0-.308.003-.374.014-.417a.5.5 0 0 1 .37-.37M2.75 8h2.5c.229 0 .426 0 .6.041A1.5 1.5 0 0 1 6.96 9.15c.04.174.04.37.04.6v2.5c0 .229 0 .426-.041.6a1.5 1.5 0 0 1-1.109 1.11c-.174.04-.37.04-.6.04h-2.5c-.229 0-.426 0-.6-.041a1.5 1.5 0 0 1-1.11-1.109c-.04-.174-.04-.37-.04-.6v-2.5c0-.229 0-.426.041-.6A1.5 1.5 0 0 1 2.15 8.04c.174-.04.37-.04.6-.04m.05 1c-.308 0-.374.003-.417.014a.5.5 0 0 0-.37.37C2.004 9.425 2 9.491 2 9.8v2.4c0 .308.003.374.014.417a.5.5 0 0 0 .37.37c.042.01.108.013.416.013h2.4c.308 0 .374-.004.417-.014a.5.5 0 0 0 .37-.37c.01-.042.013-.108.013-.416V9.8c0-.308-.003-.374-.014-.417a.5.5 0 0 0-.37-.37C5.575 9.004 5.509 9 5.2 9zm7-1h-.05c-.229 0-.426 0-.6.041A1.5 1.5 0 0 0 8.04 9.15c-.04.174-.04.37-.04.6v2.5c0 .229 0 .426.041.6a1.5 1.5 0 0 0 1.109 1.11c.174.041.371.041.6.041h2.5c.229 0 .426 0 .6-.041a1.5 1.5 0 0 0 1.109-1.109c.041-.174.041-.371.041-.6v-2.5c0-.229 0-.426-.041-.6A1.5 1.5 0 0 0 12.85 8.04c-.174-.04-.37-.04-.6-.04zm-.417 1.014c.043-.01.11-.014.417-.014h2.4c.308 0 .374.003.417.014a.5.5 0 0 1 .37.37c.01.042.013.108.013.416v2.4c0 .308-.004.374-.014.417a.5.5 0 0 1-.37.37c-.042.01-.108.013-.416.013H9.8c-.308 0-.374-.004-.417-.014a.5.5 0 0 1-.37-.37C9.004 12.575 9 12.509 9 12.2V9.8c0-.308.003-.374.014-.417a.5.5 0 0 1 .37-.37"/></svg>
      ),
      route: "/secretary/dashboard"
    },
    {
      label: "Documents",
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" width="2em" height="2em" viewBox="0 0 48 48"><path fill="none" stroke="#0035da" strokeLinecap="round" strokeLinejoin="round" d="M10.364 4.51a1.994 1.994 0 0 0-1.945 1.994v35.002a1.995 1.995 0 0 0 1.944 1.994h27.224a1.994 1.994 0 0 0 1.994-1.994V14.472h-7.977a1.995 1.995 0 0 1-1.945-1.995V4.5Zm19.205 0l9.962 9.962m-23.693 8.456h16.274M15.838 34.994h16.274m-16.274-6.033h16.274" strokeWidth="2"/></svg>
      ),
      route: "/documents"
    },
    {
      label: "Templates",
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" width="2em" height="2em" viewBox="0 0 24 24"><path fill="#003da5" d="M2 2h20v20H2zm2 2v4h16V4zm16 6h-9v10h9zM9 20V10H4v10z"/></svg>
      ),
      route: "/secretary/templates"
    },
    { 
      label: "Storage",
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" width="1.9em" height="1.9em" viewBox="0 0 24 24"><path fill="none" stroke="#003DA5" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" d="M3 6h5l2 2h11v10.4a.6.6 0 0 1-.6.6H3.6a.6.6 0 0 1-.6-.6V6.6a.6.6 0 0 1 .6-.6Z"/></svg>
      ),  
      route: "/storage"
    },
    {
      label: "Account Settings",
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" width="2em" height="2em" viewBox="0 0 24 24"><path fill="#003DA5" d="M15 21h6v-.825q-.625-.575-1.4-.875T18 19t-1.6.3t-1.4.875zm3-3q.625 0 1.063-.437T19.5 16.5t-.437-1.062T18 15t-1.062.438T16.5 16.5t.438 1.063T18 18m-5.95-9.5q-1.45 0-2.475 1.025T8.55 12q0 1.2.675 2.1T11 15.35q0-.575.013-1.1t.212-.95q-.35-.2-.512-.55T10.55 12q0-.625.438-1.062t1.062-.438q.375 0 .713.188t.562.512q.275-.125.575-.175t.6-.05h.9Q15.075 9.9 14.163 9.2t-2.113-.7M9.25 22l-.4-3.2q-.325-.125-.612-.3t-.563-.375L4.7 19.375l-2.75-4.75l2.575-1.95Q4.5 12.5 4.5 12.338v-.675q0-.163.025-.338L1.95 9.375l2.75-4.75l2.975 1.25q.275-.2.575-.375t.6-.3l.4-3.2h5.5l.4 3.2q.325.125.613.3t.562.375l2.975-1.25l2.75 4.75L19.925 11H17.4q-.025-.125-.05-.262t-.075-.263l2.15-1.625l-.975-1.7l-2.475 1.05q-.55-.575-1.213-.962t-1.437-.588L13 4h-1.975l-.35 2.65q-.775.2-1.437.588t-1.213.937L5.55 7.15l-.975 1.7l2.15 1.6q-.125.375-.175.75t-.05.8q0 .4.05.775t.175.75l-2.15 1.625l.975 1.7l2.475-1.05q.6.625 1.35 1.05T11 17.4V22zm5.25 1q-.625 0-1.062-.437T13 21.5v-7q0-.625.438-1.062T14.5 13h7q.625 0 1.063.438T23 14.5v7q0 .625-.437 1.063T21.5 23z"/></svg>
      ),
      route: "/account/settings"
    },
  ],

  /* Dean Module */
  Dean: [
    {
      label: "Dashboard",
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" width="2em" height="2em" viewBox="0 0 15 15"><path fill="#003DA5" fillRule="evenodd" d="M2.8 1h-.05c-.229 0-.426 0-.6.041A1.5 1.5 0 0 0 1.04 2.15c-.04.174-.04.37-.04.6v2.5c0 .229 0 .426.041.6A1.5 1.5 0 0 0 2.15 6.96c.174.04.37.04.6.04h2.5c.229 0 .426 0 .6-.041A1.5 1.5 0 0 0 6.96 5.85c.04-.174.04-.37.04-.6v-2.5c0-.229 0-.426-.041-.6A1.5 1.5 0 0 0 5.85 1.04C5.676 1 5.48 1 5.25 1zm-.417 1.014c.043-.01.11-.014.417-.014h2.4c.308 0 .374.003.417.014a.5.5 0 0 1 .37.37c.01.042.013.108.013.416v2.4c0 .308-.003.374-.014.417a.5.5 0 0 1-.37.37C5.575 5.996 5.509 6 5.2 6H2.8c-.308 0-.374-.003-.417-.014a.5.5 0 0 1-.37-.37C2.004 5.575 2 5.509 2 5.2V2.8c0-.308.003-.374.014-.417a.5.5 0 0 1 .37-.37M9.8 1h-.05c-.229 0-.426 0-.6.041A1.5 1.5 0 0 0 8.04 2.15c-.04.174-.04.37-.04.6v2.5c0 .229 0 .426.041.6A1.5 1.5 0 0 0 9.15 6.96c.174.04.37.04.6.04h2.5c.229 0 .426 0 .6-.041a1.5 1.5 0 0 0 1.11-1.109c.04-.174.04-.37.04-.6v-2.5c0-.229 0-.426-.041-.6a1.5 1.5 0 0 0-1.109-1.11c-.174-.04-.37-.04-.6-.04zm-.417 1.014c.043-.01.11-.014.417-.014h2.4c.308 0 .374.003.417.014a.5.5 0 0 1 .37.37c.01.042.013.108.013.416v2.4c0 .308-.004.374-.014.417a.5.5 0 0 1-.37.37c-.042.01-.108.013-.416.013H9.8c-.308 0 -.374-.003-.417-.014a.5.5 0 0 1-.37-.37C9.004 5.575 9 5.509 9 5.2V2.8c0-.308.003-.374.014-.417a.5.5 0 0 1 .37-.37M2.75 8h2.5c.229 0 .426 0 .6.041A1.5 1.5 0 0 1 6.96 9.15c.04.174.04.37.04.6v2.5c0 .229 0 .426-.041.6a1.5 1.5 0 0 1-1.109 1.11c-.174.04-.37.04-.6.04h-2.5c-.229 0-.426 0-.6-.041a1.5 1.5 0 0 1-1.11-1.109c-.04-.174-.04-.37-.04-.6v-2.5c0-.229 0-.426.041-.6A1.5 1.5 0 0 1 2.15 8.04c.174-.04.37-.04.6-.04m.05 1c-.308 0-.374.003-.417.014a.5.5 0 0 0-.37.37C2.004 9.425 2 9.491 2 9.8v2.4c0 .308.003.374.014.417a.5.5 0 0 0 .37.37c.042.01.108.013.416.013h2.4c.308 0 .374-.004.417-.014a.5.5 0 0 0 .37-.37c.01-.042.013-.108.013-.416V9.8c0-.308-.003-.374-.014-.417a.5.5 0 0 0-.37-.37C5.575 9.004 5.509 9 5.2 9zm7-1h-.05c-.229 0-.426 0-.6.041A1.5 1.5 0 0 0 8.04 9.15c-.04.174-.04.37-.04.6v2.5c0 .229 0 .426.041.6a1.5 1.5 0 0 0 1.109 1.11c.174.041.371.041.6.041h2.5c.229 0 .426 0 .6-.041a1.5 1.5 0 0 0 1.109-1.109c.041-.174.041-.371.041-.6v-2.5c0-.229 0-.426-.041-.6A1.5 1.5 0 0 0 12.85 8.04c-.174-.04-.37-.04-.6-.04zm-.417 1.014c.043-.01.11-.014.417-.014h2.4c.308 0 .374.003.417.014a.5.5 0 0 1 .37.37c.01.042.013.108.013.416v2.4c0 .308-.004.374-.014.417a.5.5 0 0 1-.37.37c-.042.01-.108.013-.416.013H9.8c-.308 0-.374-.004-.417-.014a.5.5 0 0 1-.37-.37C9.004 12.575 9 12.509 9 12.2V9.8c0-.308.003-.374.014-.417a.5.5 0 0 1 .37-.37"/></svg>
      ),
      route: "/dean/dashboard"
    },
    {
      label: "Documents",
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" width="2em" height="2em" viewBox="0 0 48 48"><path fill="none" stroke="#0035da" strokeLinecap="round" strokeLinejoin="round" d="M10.364 4.51a1.994 1.994 0 0 0-1.945 1.994v35.002a1.995 1.995 0 0 0 1.944 1.994h27.224a1.994 1.994 0 0 0 1.994-1.994V14.472h-7.977a1.995 1.995 0 0 1-1.945-1.995V4.5Zm19.205 0l9.962 9.962m-23.693 8.456h16.274M15.838 34.994h16.274m-16.274-6.033h16.274" strokeWidth="2"/></svg>
      ),
      route: "/documents"
    },
    {
      label: "Templates",
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" width="2em" height="2em" viewBox="0 0 24 24"><path fill="#003da5" d="M2 2h20v20H2zm2 2v4h16V4zm16 6h-9v10h9zM9 20V10H4v10z"/></svg>
      ),
      route: "/dean/templates"
    },
    { 
      label: "Document Workflow",
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" width="2em" height="2em" viewBox="0 0 24 24"><g fill="none" stroke="#003DA5" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5"><path d="M20 13V5.749a.6.6 0 0 0-.176-.425l-3.148-3.148A.6.6 0 0 0 16.252 2H4.6a.6.6 0 0 0-.6.6v18.8a.6.6 0 0 0 .6.6H14"/><path d="M16 2v3.4a.6.6 0 0 0 .6.6H20m-4 13h6m0 0l-3-3m3 3l-3 3"/></g></svg>
      ),  
      route: "/dean/document-workflow"
    },
    { 
      label: "Statistics",
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" width="1.9em" height="1.9em" viewBox="0 0 24 24"><g fill="none" stroke="#003DA5" strokeWidth="1.5"><path strokeLinecap="round" strokeLinejoin="round" d="M16 16V8m-4 8v-5m-4 5v-3"/><path d="M3 20.4V3.6a.6.6 0 0 1 .6-.6h16.8a.6.6 0 0 1 .6.6v16.8a.6.6 0 0 1-.6.6H3.6a.6.6 0 0 1-.6-.6Z"/></g></svg>
      ),  
      route: "/dean/statistics"
    },
    { 
      label: "Storage",
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" width="1.9em" height="1.9em" viewBox="0 0 24 24"><path fill="none" stroke="#003DA5" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" d="M3 6h5l2 2h11v10.4a.6.6 0 0 1-.6.6H3.6a.6.6 0 0 1-.6-.6V6.6a.6.6 0 0 1 .6-.6Z"/></svg>
      ),  
      route: "/storage"
    },
    {
      label: "Account Settings",
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" width="2em" height="2em" viewBox="0 0 24 24"><path fill="#003DA5" d="M15 21h6v-.825q-.625-.575-1.4-.875T18 19t-1.6.3t-1.4.875zm3-3q.625 0 1.063-.437T19.5 16.5t-.437-1.062T18 15t-1.062.438T16.5 16.5t.438 1.063T18 18m-5.95-9.5q-1.45 0-2.475 1.025T8.55 12q0 1.2.675 2.1T11 15.35q0-.575.013-1.1t.212-.95q-.35-.2-.512-.55T10.55 12q0-.625.438-1.062t1.062-.438q.375 0 .713.188t.562.512q.275-.125.575-.175t.6-.05h.9Q15.075 9.9 14.163 9.2t-2.113-.7M9.25 22l-.4-3.2q-.325-.125-.612-.3t-.563-.375L4.7 19.375l-2.75-4.75l2.575-1.95Q4.5 12.5 4.5 12.338v-.675q0-.163.025-.338L1.95 9.375l2.75-4.75l2.975 1.25q.275-.2.575-.375t.6-.3l.4-3.2h5.5l.4 3.2q.325.125.613.3t.562.375l2.975-1.25l2.75 4.75L19.925 11H17.4q-.025-.125-.05-.262t-.075-.263l2.15-1.625l-.975-1.7l-2.475 1.05q-.55-.575-1.213-.962t-1.437-.588L13 4h-1.975l-.35 2.65q-.775.2-1.437.588t-1.213.937L5.55 7.15l-.975 1.7l2.15 1.6q-.125.375-.175.75t-.05.8q0 .4.05.775t.175.75l-2.15 1.625l.975 1.7l2.475-1.05q.6.625 1.35 1.05T11 17.4V22zm5.25 1q-.625 0-1.062-.437T13 21.5v-7q0-.625.438-1.062T14.5 13h7q.625 0 1.063.438T23 14.5v7q0 .625-.437 1.063T21.5 23z"/></svg>
      ),
      route: "/account/settings"
    },
  ],

  /* Department Head Module */
  "Department Head": [
    {
      label: "Dashboard",
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" width="2em" height="2em" viewBox="0 0 15 15"><path fill="#003DA5" fillRule="evenodd" d="M2.8 1h-.05c-.229 0-.426 0-.6.041A1.5 1.5 0 0 0 1.04 2.15c-.04.174-.04.37-.04.6v2.5c0 .229 0 .426.041.6A1.5 1.5 0 0 0 2.15 6.96c.174.04.37.04.6.04h2.5c.229 0 .426 0 .6-.041A1.5 1.5 0 0 0 6.96 5.85c.04-.174.04-.37.04-.6v-2.5c0-.229 0-.426-.041-.6A1.5 1.5 0 0 0 5.85 1.04C5.676 1 5.48 1 5.25 1zm-.417 1.014c.043-.01.11-.014.417-.014h2.4c.308 0 .374.003.417.014a.5.5 0 0 1 .37.37c.01.042.013.108.013.416v2.4c0 .308-.003.374-.014.417a.5.5 0 0 1-.37.37C5.575 5.996 5.509 6 5.2 6H2.8c-.308 0-.374-.003-.417-.014a.5.5 0 0 1-.37-.37C2.004 5.575 2 5.509 2 5.2V2.8c0-.308.003-.374.014-.417a.5.5 0 0 1 .37-.37M9.8 1h-.05c-.229 0-.426 0-.6.041A1.5 1.5 0 0 0 8.04 2.15c-.04.174-.04.37-.04.6v2.5c0 .229 0 .426.041.6A1.5 1.5 0 0 0 9.15 6.96c.174.04.37.04.6.04h2.5c.229 0 .426 0 .6-.041a1.5 1.5 0 0 0 1.11-1.109c.04-.174.04-.37.04-.6v-2.5c0-.229 0-.426-.041-.6a1.5 1.5 0 0 0-1.109-1.11c-.174-.04-.37-.04-.6-.04zm-.417 1.014c.043-.01.11-.014.417-.014h2.4c.308 0 .374.003.417.014a.5.5 0 0 1 .37.37c.01.042.013.108.013.416v2.4c0 .308-.004.374-.014.417a.5.5 0 0 1-.37.37c-.042.01-.108.013-.416.013H9.8c-.308 0 -.374-.003-.417-.014a.5.5 0 0 1-.37-.37C9.004 5.575 9 5.509 9 5.2V2.8c0-.308.003-.374.014-.417a.5.5 0 0 1 .37-.37M2.75 8h2.5c.229 0 .426 0 .6.041A1.5 1.5 0 0 1 6.96 9.15c.04.174.04.37.04.6v2.5c0 .229 0 .426-.041.6a1.5 1.5 0 0 1-1.109 1.11c-.174.04-.37.04-.6.04h-2.5c-.229 0-.426 0-.6-.041a1.5 1.5 0 0 1-1.11-1.109c-.04-.174-.04-.37-.04-.6v-2.5c0-.229 0-.426.041-.6A1.5 1.5 0 0 1 2.15 8.04c.174-.04.37-.04.6-.04m.05 1c-.308 0-.374.003-.417.014a.5.5 0 0 0-.37.37C2.004 9.425 2 9.491 2 9.8v2.4c0 .308.003.374.014.417a.5.5 0 0 0 .37.37c.042.01.108.013.416.013h2.4c.308 0 .374-.004.417-.014a.5.5 0 0 0 .37-.37c.01-.042.013-.108.013-.416V9.8c0-.308-.003-.374-.014-.417a.5.5 0 0 0-.37-.37C5.575 9.004 5.509 9 5.2 9zm7-1h-.05c-.229 0-.426 0-.6.041A1.5 1.5 0 0 0 8.04 9.15c-.04.174-.04.37-.04.6v2.5c0 .229 0 .426.041.6a1.5 1.5 0 0 0 1.109 1.11c.174.041.371.041.6.041h2.5c.229 0 .426 0 .6-.041a1.5 1.5 0 0 0 1.109-1.109c.041-.174.041-.371.041-.6v-2.5c0-.229 0-.426-.041-.6A1.5 1.5 0 0 0 12.85 8.04c-.174-.04-.37-.04-.6-.04zm-.417 1.014c.043-.01.11-.014.417-.014h2.4c.308 0 .374.003.417.014a.5.5 0 0 1 .37.37c.01.042.013.108.013.416v2.4c0 .308-.004.374-.014.417a.5.5 0 0 1-.37.37c-.042.01-.108.013-.416.013H9.8c-.308 0-.374-.004-.417-.014a.5.5 0 0 1-.37-.37C9.004 12.575 9 12.509 9 12.2V9.8c0-.308.003-.374.014-.417a.5.5 0 0 1 .37-.37"/></svg>
      ),
      route: "/dept-head/dashboard"
    },
    {
      label: "Documents",
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" width="2em" height="2em" viewBox="0 0 48 48"><path fill="none" stroke="#0035da" strokeLinecap="round" strokeLinejoin="round" d="M10.364 4.51a1.994 1.994 0 0 0-1.945 1.994v35.002a1.995 1.995 0 0 0 1.944 1.994h27.224a1.994 1.994 0 0 0 1.994-1.994V14.472h-7.977a1.995 1.995 0 0 1-1.945-1.995V4.5Zm19.205 0l9.962 9.962m-23.693 8.456h16.274M15.838 34.994h16.274m-16.274-6.033h16.274" strokeWidth="2"/></svg>
      ),
      route: "/documents"
    },
    {
      label: "Templates",
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" width="2em" height="2em" viewBox="0 0 24 24"><path fill="#003da5" d="M2 2h20v20H2zm2 2v4h16V4zm16 6h-9v10h9zM9 20V10H4v10z"/></svg>
      ),
      route: "/dept-head/templates"
    },
    { 
      label: "Document Workflow",
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" width="2em" height="2em" viewBox="0 0 24 24"><g fill="none" stroke="#003DA5" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5"><path d="M20 13V5.749a.6.6 0 0 0-.176-.425l-3.148-3.148A.6.6 0 0 0 16.252 2H4.6a.6.6 0 0 0-.6.6v18.8a.6.6 0 0 0 .6.6H14"/><path d="M16 2v3.4a.6.6 0 0 0 .6.6H20m-4 13h6m0 0l-3-3m3 3l-3 3"/></g></svg>
      ),  
      route: "/dept-head/document-workflow"
    },
    { 
      label: "Statistics",
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" width="1.9em" height="1.9em" viewBox="0 0 24 24"><g fill="none" stroke="#003DA5" strokeWidth="1.5"><path strokeLinecap="round" strokeLinejoin="round" d="M16 16V8m-4 8v-5m-4 5v-3"/><path d="M3 20.4V3.6a.6.6 0 0 1 .6-.6h16.8a.6.6 0 0 1 .6.6v16.8a.6.6 0 0 1-.6.6H3.6a.6.6 0 0 1-.6-.6Z"/></g></svg>
      ),  
      route: "/dept-head/statistics"
    },
    { 
      label: "Storage",
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" width="1.9em" height="1.9em" viewBox="0 0 24 24"><path fill="none" stroke="#003DA5" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" d="M3 6h5l2 2h11v10.4a.6.6 0 0 1-.6.6H3.6a.6.6 0 0 1-.6-.6V6.6a.6.6 0 0 1 .6-.6Z"/></svg>
      ),  
      route: "/storage"
    },
    {
      label: "Account Settings",
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" width="2em" height="2em" viewBox="0 0 24 24"><path fill="#003DA5" d="M15 21h6v-.825q-.625-.575-1.4-.875T18 19t-1.6.3t-1.4.875zm3-3q.625 0 1.063-.437T19.5 16.5t-.437-1.062T18 15t-1.062.438T16.5 16.5t.438 1.063T18 18m-5.95-9.5q-1.45 0-2.475 1.025T8.55 12q0 1.2.675 2.1T11 15.35q0-.575.013-1.1t.212-.95q-.35-.2-.512-.55T10.55 12q0-.625.438-1.062t1.062-.438q.375 0 .713.188t.562.512q.275-.125.575-.175t.6-.05h.9Q15.075 9.9 14.163 9.2t-2.113-.7M9.25 22l-.4-3.2q-.325-.125-.612-.3t-.563-.375L4.7 19.375l-2.75-4.75l2.575-1.95Q4.5 12.5 4.5 12.338v-.675q0-.163.025-.338L1.95 9.375l2.75-4.75l2.975 1.25q.275-.2.575-.375t.6-.3l.4-3.2h5.5l.4 3.2q.325.125.613.3t.562.375l2.975-1.25l2.75 4.75L19.925 11H17.4q-.025-.125-.05-.262t-.075-.263l2.15-1.625l-.975-1.7l-2.475 1.05q-.55-.575-1.213-.962t-1.437-.588L13 4h-1.975l-.35 2.65q-.775.2-1.437.588t-1.213.937L5.55 7.15l-.975 1.7l2.15 1.6q-.125.375-.175.75t-.05.8q0 .4.05.775t.175.75l-2.15 1.625l.975 1.7l2.475-1.05q.6.625 1.35 1.05T11 17.4V22zm5.25 1q-.625 0-1.062-.437T13 21.5v-7q0-.625.438-1.062T14.5 13h7q.625 0 1.063.438T23 14.5v7q0 .625-.437 1.063T21.5 23z"/></svg>
      ),
      route: "/account/settings"
    },
  ],
};

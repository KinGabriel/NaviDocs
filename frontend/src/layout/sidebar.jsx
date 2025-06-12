import { useNavigate, useLocation } from 'react-router-dom';


export default function Sidebar({ user }) {
  const roleValue = user?.role?.name || user?.role;
  const menu = roleValue ? MENU_CONFIG[roleValue] : undefined;
  const navigate = useNavigate();
  const location = useLocation();

  // route map for the current role
  const roleRoutes = MENU_ROUTES[roleValue] || {};

  // active menu item based on the current path
  let activeLabel = null;
  if (menu) {
    for (const item of menu) {
      if (roleRoutes[item.label] && location.pathname.startsWith(roleRoutes[item.label])) {
        activeLabel = item.label;
        break;
      }
    }
    // fallback
    if (!activeLabel) {
      for (const item of menu) {
        if (roleRoutes[item.label] === location.pathname) {
          activeLabel = item.label;
          break;
        }
      }
    }
  }

  return (
    <div className="bg-white shadow pt-8 pb-4 px-8 w-80 flex flex-col items-center min-h-[70vh] relative mx-6 mt-8 rounded-xl">
      {/* Profile Picture */}
      <img
        src={user?.profile_picture || '/default-avatar.jpg'}
        alt="Profile"
        className="h-28 w-28 rounded-full object-cover border-4 border-gray-100 mb-4"
        onError={e => { e.target.onerror = null; e.target.src = '/default-avatar.jpg'; }}
      />
      {/* Name */}
      <h2 className="text-xl font-bold text-center mb-0">
        {(user?.firstname || '') + ' ' + (user?.lastname || '')}
      </h2>
      {/* Role */}
      <div className="text-sm text-gray-500 text-center mb-6">
        {roleValue}
      </div>

      {/* Menu */}
      <nav className="w-full flex flex-col gap-1 mb-8">
        {menu
          ? menu.map(item => (
              <SidebarItem
                key={item.label}
                icon={item.icon}
                label={item.label}
                active={activeLabel === item.label}
                onClick={() => {
                  const route = roleRoutes[item.label];
                  if (route) navigate(route);
                }}
              />
            ))
          : (
            <div className="text-gray-400 text-center py-4">
              No menu available for this role.
            </div>
          )
        }
      </nav>
      <div className="absolute bottom-4 left-0 w-full text-center text-[10px] text-gray-400 select-none">
        Copyright ©2025 NaviDocs
      </div>
    </div>
  );
}

function SidebarItem({ icon, label, active, onClick }) {
  return (
    <div
      className={`flex items-center w-full px-8 py-3 rounded transition-colors cursor-pointer relative
        ${active ? "bg-gray-100 font-bold" : "hover:bg-gray-50"}
      `}
      onClick={onClick}
    >
      {active && <div className="absolute left-0 top-0 h-full w-1 bg-yellow-400 rounded-r"></div>}
      <div className="mr-4 flex-shrink-0">{icon}</div>
      <span className="text-base">{label}</span>
    </div>
  );
}

const MENU_CONFIG = {
  Admin: [
    {
      label: "Dashboard",
      icon: (
        <svg className="h-5 w-5 text-blue-700" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
          <rect x="3" y="3" width="7" height="7" rx="1.5" />
          <rect x="14" y="3" width="7" height="7" rx="1.5" />
          <rect x="14" y="14" width="7" height="7" rx="1.5" />
          <rect x="3" y="14" width="7" height="7" rx="1.5" />
        </svg>
      ),
    },
    {
      label: "User Accounts",
      icon: (
        <svg className="h-5 w-5 text-blue-700" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
          <path d="M17 20h5v-2a4 4 0 00-3-3.87M9 20H4v-2a4 4 0 013-3.87m9-4a4 4 0 10-8 0 4 4 0 008 0z" />
        </svg>
      ),
    },
    {
      label: "Create User",
      icon: (
        <svg className="h-5 w-5 text-blue-700" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
          <circle cx="12" cy="8" r="4" />
          <path d="M16 16v2m0 0v2m0-2h2m-2 0h-2" />
        </svg>
      ),
    },
    {
      label: "Account Settings",
      icon: (
        <svg className="h-5 w-5 text-blue-700" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
          <path d="M12 15v2m0 4a4 4 0 100-8 4 4 0 000 8zm6.364-6.364l1.414-1.414m-1.414 1.414A9 9 0 003.636 6.636m1.414 1.414L6.364 6.364" />
        </svg>
      ),
    },
  ],
  Faculty: [
    {
      label: "Dashboard",
      icon: (
        <svg className="h-5 w-5 text-blue-700" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
          <rect x="3" y="3" width="7" height="7" rx="1.5" />
          <rect x="14" y="3" width="7" height="7" rx="1.5" />
          <rect x="14" y="14" width="7" height="7" rx="1.5" />
          <rect x="3" y="14" width="7" height="7" rx="1.5" />
        </svg>
      ),
    },
    {
      label: "Documents",
      icon: (
        <svg className="h-5 w-5 text-blue-700" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
          <rect x="6" y="3" width="12" height="18" rx="2" />
          <line x1="9" y1="7" x2="15" y2="7" />
          <line x1="9" y1="11" x2="15" y2="11" />
          <line x1="9" y1="15" x2="13" y2="15" />
        </svg>
      ),
    },
    {
      label: "Account Settings",
      icon: (
        <svg className="h-5 w-5 text-blue-700" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
          <path d="M12 15v2m0 4a4 4 0 100-8 4 4 0 000 8zm6.364-6.364l1.414-1.414m-1.414 1.414A9 9 0 003.636 6.636m1.414 1.414L6.364 6.364" />
        </svg>
      ),
    },
  ],

};

const MENU_ROUTES = {
  Admin: {
    "Dashboard": "/admin/dashboard",
    "User Accounts": "/admin/accounts",
    "Create User": "/admin/create-user",
    "Account Settings": "/admin/settings"
  },
  Faculty: {
    "Dashboard": "/faculty/dashboard",
    "Documents": "/faculty/documents",
    "Account Settings": "/faculty/settings"
  }

};

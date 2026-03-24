import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

const Sidebar = ({ links, title, subtitle }) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [collapsed, setCollapsed] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <aside className={`${collapsed ? 'w-16' : 'w-64'} min-h-screen bg-gradient-to-b from-primary-900 to-slate-900 flex flex-col transition-all duration-300 flex-shrink-0 relative z-10`}>
      {/* Logo */}
      <div className="p-4 border-b border-white/10 flex items-center gap-3">
        <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center flex-shrink-0">
          <span className="text-xl">🏛️</span>
        </div>
        {!collapsed && (
          <div>
            <div className="text-white font-bold text-sm leading-tight">NagarSeva</div>
            <div className="text-blue-300 text-xs">{subtitle}</div>
          </div>
        )}
        <button onClick={() => setCollapsed(!collapsed)} className="ml-auto text-white/50 hover:text-white text-xs p-1">
          {collapsed ? '→' : '←'}
        </button>
      </div>

      {/* User info */}
      {!collapsed && (
        <div className="p-4 border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-400 to-indigo-600 flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
              {user?.name?.charAt(0)?.toUpperCase()}
            </div>
            <div className="overflow-hidden">
              <div className="text-white text-sm font-semibold truncate">{user?.name}</div>
              <div className="text-blue-300 text-xs truncate">{user?.role?.replace('_', ' ')}</div>
            </div>
          </div>
        </div>
      )}

      {/* Nav links */}
      <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
        {links.map((link) => {
          const isActive = location.pathname === link.path ||
            (link.path !== '/' && location.pathname.startsWith(link.path));
          return (
            <button
              key={link.path}
              onClick={() => navigate(link.path)}
              className={`sidebar-link w-full text-left ${isActive ? 'active' : ''}`}
              title={collapsed ? link.label : ''}
            >
              <span className="text-lg flex-shrink-0">{link.icon}</span>
              {!collapsed && <span>{link.label}</span>}
            </button>
          );
        })}
      </nav>

      {/* Logout */}
      <div className="p-3 border-t border-white/10">
        <button onClick={handleLogout} className="sidebar-link w-full text-left text-red-300 hover:text-red-200 hover:bg-red-500/20">
          <span className="text-lg">🚪</span>
          {!collapsed && <span>Logout</span>}
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;

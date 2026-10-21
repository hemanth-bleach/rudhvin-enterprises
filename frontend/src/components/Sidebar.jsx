import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  FilePlus,
  Files,
  Users,
  Package,
  CreditCard,
  Building2,
  BarChart3,
  UserCheck,
  LogOut
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function Sidebar() {
  const { user, isAdmin, logout } = useAuth();

  const navItems = [
    { to: '/', label: 'Dashboard', icon: LayoutDashboard },
    { to: '/invoices/new', label: 'Create Invoice', icon: FilePlus },
    { to: '/invoices', label: 'All Invoices', icon: Files },
    { to: '/customers', label: 'Customers', icon: Users },
    { to: '/products', label: 'Products / Items', icon: Package },
    { to: '/payments', label: 'Payments', icon: CreditCard },
    { to: '/settings/company', label: 'Company Settings', icon: Building2 },
    { to: '/reports', label: 'Reports', icon: BarChart3 },
    ...(isAdmin ? [{ to: '/users', label: 'Users', icon: UserCheck }] : [])
  ];

  return (
    <aside className="w-64 bg-[#0B132B] text-slate-300 flex flex-col shrink-0 min-h-screen border-r border-slate-800">
      {/* Brand Header */}
      <div className="p-5 flex items-center gap-3 border-b border-slate-800/80">
        <svg width="42" height="38" viewBox="0 0 200 65" fill="none" xmlns="http://www.w3.org/2000/svg" className="shrink-0">
          <path d="M12 12 H38 C48 12 55 18 55 27 C55 35 48 41 38 41 H24 V58 H12 V12Z" fill="#3B82F6"/>
          <path d="M24 22 H36 C41 22 44 24 44 27 C44 30 41 32 36 32 H24 V22Z" fill="#FFFFFF"/>
          <path d="M36 34 L56 58 H41 L25 38 Z" fill="#F59E0B"/>
          <path d="M58 12 H90 V21 H69 V30 H86 V38 H69 V49 H92 V58 H58 V12Z" fill="#3B82F6"/>
        </svg>
        <div className="flex flex-col">
          <span className="font-black text-sm tracking-wider text-white">RUDHVIN</span>
          <span className="text-[10px] tracking-widest text-slate-400 font-bold uppercase">ENTERPRISES</span>
        </div>
      </div>

      {/* Navigation Links */}
      <nav className="flex-1 py-4 px-3 space-y-1.5 overflow-y-auto">
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/'}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all ${
                  isActive
                    ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30 font-semibold'
                    : 'text-slate-300 hover:bg-slate-800/70 hover:text-white'
                }`
              }
            >
              <Icon className="w-5 h-5 shrink-0" />
              <span>{item.label}</span>
            </NavLink>
          );
        })}
      </nav>

      {/* User profile & Logout */}
      <div className="p-4 border-t border-slate-800/80 bg-slate-900/40">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-sm">
              {user?.name?.[0]?.toUpperCase() || 'U'}
            </div>
            <div className="truncate text-xs">
              <div className="font-semibold text-white truncate">{user?.name || 'User'}</div>
              <div className="text-slate-400 capitalize text-[11px]">{user?.role || 'Staff'}</div>
            </div>
          </div>
          <button
            onClick={logout}
            title="Logout"
            className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-slate-800 rounded-lg transition-colors"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </aside>
  );
}

import React from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Search, Bell, Plus } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import api from '../api/axios';

export default function Navbar({ onSearch }) {
  const { user } = useAuth();
  const navigate = useNavigate();

  // Fetch live stats for real-time notification badge (unpaid/pending invoices)
  const { data: stats } = useQuery({
    queryKey: ['dashboardStats'],
    queryFn: async () => {
      const res = await api.get('/dashboard/stats');
      return res.data.data;
    },
    staleTime: 10000
  });

  const pendingCount = stats?.pendingInvoicesCount ?? 0;

  return (
    <header className="h-16 bg-white border-b border-slate-200 px-6 flex items-center justify-between shrink-0 sticky top-0 z-30 shadow-xs">
      {/* Title & Subtitle */}
      <div className="flex flex-col">
        <Link to="/" className="text-xl font-extrabold text-[#DC2626] tracking-tight hover:opacity-90 transition-opacity">
          RUDHVIN ENTERPRISES
        </Link>
        <span className="text-xs text-slate-500 font-medium -mt-1">
          Invoice Management System
        </span>
      </div>

      {/* Global Quick Search */}
      <div className="flex-1 max-w-md mx-8 hidden md:block">
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            placeholder="Search invoices, customers, products..."
            onChange={(e) => onSearch && onSearch(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                navigate(`/invoices?search=${encodeURIComponent(e.target.value)}`);
              }
            }}
            className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-hidden focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all text-slate-700 placeholder-slate-400"
          />
        </div>
      </div>

      {/* Right Controls */}
      <div className="flex items-center gap-4">
        {/* Prominent Create Invoice button */}
        <Link
          to="/invoices/new"
          className="hidden sm:inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs px-3.5 py-2 rounded-lg shadow-sm hover:shadow transition-all"
        >
          <Plus className="w-4 h-4" />
          <span>Create Invoice</span>
        </Link>

        {/* Notification Bell with Real Dynamic Badge */}
        <Link
          to="/invoices?status=issued"
          title={`${pendingCount} unpaid invoice${pendingCount === 1 ? '' : 's'} requiring attention`}
          className="relative p-2 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-full cursor-pointer transition-colors"
        >
          <Bell className="w-5 h-5" />
          {pendingCount > 0 && (
            <span className="absolute top-1 right-1 min-w-[16px] h-4 px-1 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
              {pendingCount}
            </span>
          )}
        </Link>

        {/* User Chip */}
        <div className="flex items-center gap-2.5 pl-2 border-l border-slate-200">
          <div className="w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-xs shadow-xs">
            {user?.name?.[0]?.toUpperCase() || 'H'}
          </div>
          <div className="hidden lg:flex flex-col text-left">
            <span className="text-xs font-semibold text-slate-800 leading-tight">
              {user?.name || 'Hemanth'}
            </span>
            <span className="text-[11px] text-slate-400 capitalize font-medium">
              {user?.role || 'Admin'}
            </span>
          </div>
        </div>
      </div>
    </header>
  );
}

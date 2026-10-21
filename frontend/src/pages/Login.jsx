import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Lock, Mail, ArrowRight, ShieldCheck } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function Login() {
  const [email, setEmail] = useState('admin@rudhvin.com');
  const [password, setPassword] = useState('Admin@12345');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    const result = await login(email, password);
    setIsSubmitting(false);
    if (result?.success) {
      navigate('/');
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 flex flex-col justify-center items-center p-4 relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute -top-40 -right-40 w-96 h-96 bg-blue-600/20 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-red-600/15 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl p-8 relative z-10 border border-slate-100">
        {/* Brand header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center mb-3">
            <svg width="180" height="55" viewBox="0 0 200 65" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M12 12 H38 C48 12 55 18 55 27 C55 35 48 41 38 41 H24 V58 H12 V12Z" fill="#1E3A8A"/>
              <path d="M24 22 H36 C41 22 44 24 44 27 C44 30 41 32 36 32 H24 V22Z" fill="#FFFFFF"/>
              <path d="M36 34 L56 58 H41 L25 38 Z" fill="#F59E0B"/>
              <path d="M58 12 H90 V21 H69 V30 H86 V38 H69 V49 H92 V58 H58 V12Z" fill="#1E3A8A"/>
              <text x="100" y="28" fontFamily="Arial, sans-serif" fontWeight="900" fontSize="14" fill="#1E3A8A" letterSpacing="1">RUDHVIN</text>
              <text x="100" y="44" fontFamily="Arial, sans-serif" fontWeight="700" fontSize="10" fill="#64748B" letterSpacing="2">ENTERPRISES</text>
            </svg>
          </div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">Invoice Management System</h2>
          <p className="text-xs text-slate-500 mt-1">Sign in to access your business dashboard</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Email Address
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@rudhvin.com"
                className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:bg-white focus:outline-hidden transition-all text-slate-800"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Password
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:bg-white focus:outline-hidden transition-all text-slate-800"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl text-sm shadow-md shadow-blue-600/30 hover:shadow-lg transition-all flex items-center justify-center gap-2 disabled:opacity-50 mt-2"
          >
            <span>{isSubmitting ? 'Signing in...' : 'Sign In'}</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>

        <div className="mt-6 pt-5 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
          <div className="flex items-center gap-1.5 text-emerald-600 font-medium">
            <ShieldCheck className="w-4 h-4" />
            <span>Secure JWT Auth</span>
          </div>
          <span className="text-[11px] bg-slate-100 px-2.5 py-1 rounded-md text-slate-600 font-mono">
            Default: admin@rudhvin.com
          </span>
        </div>
      </div>
    </div>
  );
}

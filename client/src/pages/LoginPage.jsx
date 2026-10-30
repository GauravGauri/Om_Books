import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Cross, Lock, Mail, ShieldCheck, CheckCircle2, ArrowRight } from 'lucide-react';
import { useAuthStore } from '../store/useAuthStore';
import { Input } from '../components/common/Input';
import { Button } from '../components/common/Button';

export const LoginPage = () => {
  const navigate = useNavigate();
  const { login, isLoading, error } = useAuthStore();

  const [email, setEmail] = useState('admin@homebooks.com');
  const [password, setPassword] = useState('Password@123');

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await login(email, password);
      navigate('/');
    } catch (err) {
      // Error handled in store
    }
  };

  const handleSuperAdminLogin = async () => {
    setEmail('admin@homebooks.com');
    setPassword('Password@123');
    try {
      await login('admin@homebooks.com', 'Password@123');
      navigate('/');
    } catch (err) {
      // Error handled in store
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-emerald-950 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white/95 backdrop-blur-md rounded-3xl shadow-2xl border border-white/20 p-8">
        {/* Brand */}
        <div className="text-center mb-6">
          <div className="inline-flex w-14 h-14 rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-400 items-center justify-center text-white shadow-xl shadow-emerald-500/20 mb-3">
            <Cross className="w-8 h-8 fill-white" />
          </div>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-[11px] font-semibold text-emerald-700 mb-2">
            <ShieldCheck className="w-3.5 h-3.5" />
            Super Admin Access Only
          </div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">HomeBooks Pharmacy ERP</h1>
          <p className="text-xs text-slate-500 mt-1 font-medium">
            Full-Access Management, POS Billing, Stock & Ledger Portal
          </p>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-xl bg-red-50 border border-red-200 text-xs text-red-700 font-medium">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="Super Admin Email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            icon={Mail}
            placeholder="admin@homebooks.com"
            required
          />

          <Input
            label="Password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            icon={Lock}
            placeholder="••••••••••••"
            required
          />

          <Button type="submit" variant="primary" className="w-full py-2.5 mt-2" isLoading={isLoading}>
            Sign In as Super Admin
          </Button>
        </form>

        {/* 1-Click Super Admin Login Quick Card */}
        <div className="mt-6 pt-5 border-t border-slate-100">
          <button
            type="button"
            onClick={handleSuperAdminLogin}
            disabled={isLoading}
            className="w-full p-3.5 rounded-2xl border border-emerald-200 bg-emerald-50/70 hover:bg-emerald-100/70 transition-all text-left flex items-center justify-between group"
          >
            <div>
              <div className="flex items-center gap-2">
                <p className="font-bold text-xs text-emerald-900">1-Click Super Admin Sign In</p>
                <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-emerald-600 text-white">
                  Universal Access
                </span>
              </div>
              <p className="text-[11px] text-slate-500 mt-0.5">
                admin@homebooks.com <span className="text-slate-400">•</span> Password@123
              </p>
            </div>
            <ArrowRight className="w-4 h-4 text-emerald-600 group-hover:translate-x-1 transition-transform" />
          </button>
        </div>
      </div>
    </div>
  );
};

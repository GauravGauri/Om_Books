import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Cross, Lock, Mail, ArrowRight, ShieldCheck, CheckCircle2 } from 'lucide-react';
import { useAuthStore } from '../store/useAuthStore';
import { Input } from '../components/common/Input';
import { Button } from '../components/common/Button';

export const LoginPage = () => {
  const navigate = useNavigate();
  const { login, isLoading, error } = useAuthStore();

  const [email, setEmail] = useState('pharmacist@homebooks.com');
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

  const handleQuickLogin = async (demoEmail) => {
    setEmail(demoEmail);
    setPassword('Password@123');
    try {
      await login(demoEmail, 'Password@123');
      navigate('/');
    } catch (err) {
      // Error handled in store
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-emerald-950 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white/95 backdrop-blur-md rounded-3xl shadow-2xl border border-white/20 p-8">
        {/* Brand */}
        <div className="text-center mb-8">
          <div className="inline-flex w-14 h-14 rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-400 items-center justify-center text-white shadow-xl shadow-emerald-500/20 mb-3">
            <Cross className="w-8 h-8 fill-white" />
          </div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">HomeBooks Pharmacy ERP</h1>
          <p className="text-xs text-slate-500 mt-1 font-medium">Enterprise Retail Billing, FEFO Stock & Ledger</p>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-xl bg-red-50 border border-red-200 text-xs text-red-700 font-medium">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="Email Address"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            icon={Mail}
            placeholder="pharmacist@homebooks.com"
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
            Sign In to Pharmacy Portal
          </Button>
        </form>

        {/* Quick Demo Selector */}
        <div className="mt-8 pt-6 border-t border-slate-100">
          <p className="text-xs font-semibold text-slate-500 mb-3 text-center uppercase tracking-wider">
            Quick 1-Click Role Login
          </p>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <button
              type="button"
              onClick={() => handleQuickLogin('pharmacist@homebooks.com')}
              className="p-2.5 rounded-xl border border-slate-200 bg-slate-50 hover:bg-emerald-50 hover:border-emerald-300 text-left transition-colors font-medium text-slate-700"
            >
              <p className="font-bold text-slate-900">Pharmacist</p>
              <p className="text-[10px] text-slate-500">POS & Dispensing</p>
            </button>

            <button
              type="button"
              onClick={() => handleQuickLogin('admin@homebooks.com')}
              className="p-2.5 rounded-xl border border-slate-200 bg-slate-50 hover:bg-emerald-50 hover:border-emerald-300 text-left transition-colors font-medium text-slate-700"
            >
              <p className="font-bold text-slate-900">Super Admin</p>
              <p className="text-[10px] text-slate-500">Universal Access</p>
            </button>

            <button
              type="button"
              onClick={() => handleQuickLogin('cashier@homebooks.com')}
              className="p-2.5 rounded-xl border border-slate-200 bg-slate-50 hover:bg-emerald-50 hover:border-emerald-300 text-left transition-colors font-medium text-slate-700"
            >
              <p className="font-bold text-slate-900">Cashier</p>
              <p className="text-[10px] text-slate-500">Checkout & Bills</p>
            </button>

            <button
              type="button"
              onClick={() => handleQuickLogin('manager@homebooks.com')}
              className="p-2.5 rounded-xl border border-slate-200 bg-slate-50 hover:bg-emerald-50 hover:border-emerald-300 text-left transition-colors font-medium text-slate-700"
            >
              <p className="font-bold text-slate-900">Store Manager</p>
              <p className="text-[10px] text-slate-500">Stock & Purchases</p>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

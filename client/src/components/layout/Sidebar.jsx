import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  ShoppingCart,
  Pill,
  Boxes,
  Truck,
  Receipt,
  RotateCcw,
  Users,
  Building2,
  Wallet,
  BarChart3,
  FileText,
  Settings,
  ChevronLeft,
  ChevronRight,
  LogOut,
  Cross,
} from 'lucide-react';
import { useAuthStore } from '../../store/useAuthStore';
import { cn } from '../../utils/cn';

export const Sidebar = ({ isCollapsed, setIsCollapsed }) => {
  const location = useLocation();
  const { user, logout } = useAuthStore();

  const navItems = [
    { name: 'Dashboard', path: '/', icon: LayoutDashboard },
    { name: 'POS Billing', path: '/pos', icon: ShoppingCart, badge: 'F2' },
    { name: 'Products & Medicines', path: '/products', icon: Pill },
    { name: 'Inventory & Batches', path: '/inventory', icon: Boxes },
    { name: 'Purchases & Inward', path: '/purchases', icon: Truck },
    { name: 'Sales Invoices', path: '/sales', icon: Receipt },
    { name: 'Returns & Refunds', path: '/returns', icon: RotateCcw },
    { name: 'Customers & Khata', path: '/customers', icon: Users },
    { name: 'Suppliers & Ledger', path: '/suppliers', icon: Building2 },
    { name: 'Finance & Expenses', path: '/finance', icon: Wallet },
    { name: 'Reports & GST', path: '/reports', icon: BarChart3 },
    { name: 'Audit Logs', path: '/audit-logs', icon: FileText },
    { name: 'Settings', path: '/settings', icon: Settings },
  ];

  return (
    <aside
      className={cn(
        'h-screen bg-slate-900 text-slate-300 flex flex-col justify-between border-r border-slate-800 transition-all duration-300 z-30 select-none print:hidden',
        isCollapsed ? 'w-20' : 'w-64'
      )}
    >
      {/* Brand Header */}
      <div>
        <div className="h-16 flex items-center justify-between px-4 border-b border-slate-800">
          {!isCollapsed && (
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-400 flex items-center justify-center text-white shadow-lg shadow-emerald-900/30">
                <Cross className="w-5 h-5 fill-white" />
              </div>
              <div>
                <h1 className="text-base font-bold text-white tracking-tight flex items-center gap-1.5">
                  HomeBooks
                  <span className="text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-400 font-semibold border border-emerald-500/30">
                    ERP
                  </span>
                </h1>
                <p className="text-[10px] text-slate-400">Intelligent Pharmacy System</p>
              </div>
            </div>
          )}

          {isCollapsed && (
            <div className="mx-auto w-9 h-9 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-400 flex items-center justify-center text-white shadow-lg">
              <Cross className="w-5 h-5 fill-white" />
            </div>
          )}

          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors ml-auto hidden md:block"
            title={isCollapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}
          >
            {isCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
          </button>
        </div>

        {/* Navigation Items */}
        <nav className="p-3 space-y-1 overflow-y-auto max-h-[calc(100vh-140px)]">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;

            return (
              <NavLink
                key={item.path}
                to={item.path}
                title={isCollapsed ? item.name : undefined}
                className={cn(
                  'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all group relative',
                  isActive
                    ? 'bg-emerald-600 text-white shadow-sm font-semibold'
                    : 'text-slate-300 hover:text-white hover:bg-slate-800/70'
                )}
              >
                <Icon
                  className={cn(
                    'w-5 h-5 shrink-0 transition-colors',
                    isActive ? 'text-white' : 'text-slate-400 group-hover:text-emerald-400'
                  )}
                />
                {!isCollapsed && <span className="truncate">{item.name}</span>}
                {!isCollapsed && item.badge && (
                  <span className="ml-auto text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-800 text-emerald-300 border border-slate-700">
                    {item.badge}
                  </span>
                )}
              </NavLink>
            );
          })}
        </nav>
      </div>

      {/* User Footer */}
      <div className="p-3 border-t border-slate-800 bg-slate-950/40">
        <div className="flex items-center gap-3 px-2 py-2 rounded-xl bg-slate-800/40 border border-slate-800">
          <div className="w-8 h-8 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold text-xs uppercase shrink-0 border border-emerald-500/30">
            {user?.name?.charAt(0) || 'U'}
          </div>
          {!isCollapsed && (
            <div className="min-w-0 flex-1">
              <p className="text-xs font-semibold text-white truncate">{user?.name || 'Pharmacist'}</p>
              <p className="text-[10px] text-emerald-400 truncate">{user?.role || 'Staff'}</p>
            </div>
          )}
          <button
            onClick={logout}
            title="Log Out"
            className="p-1.5 text-slate-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors ml-auto"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </aside>
  );
};

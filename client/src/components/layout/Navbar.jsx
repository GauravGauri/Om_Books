import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Search,
  Bell,
  Store,
  PlusCircle,
  ExternalLink,
  AlertTriangle,
  Clock,
  CheckCircle,
} from 'lucide-react';
import { useAuthStore } from '../../store/useAuthStore';
import { Button } from '../common/Button';
import apiClient from '../../api/client';

export const Navbar = () => {
  const navigate = useNavigate();
  const { user, currentOutlet, setCurrentOutlet } = useAuthStore();

  const [outlets, setOutlets] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [globalSearch, setGlobalSearch] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);

  useEffect(() => {
    fetchOutlets();
    fetchNotifications();
  }, [currentOutlet]);

  // Global F2 keyboard shortcut to open POS
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'F2') {
        e.preventDefault();
        navigate('/pos');
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [navigate]);

  const fetchOutlets = async () => {
    try {
      const res = await apiClient.get('/system/outlets');
      setOutlets(res.data || []);
      if (!currentOutlet && res.data?.length > 0) {
        setCurrentOutlet(res.data[0]);
      }
    } catch (e) {
      // Ignore
    }
  };

  const fetchNotifications = async () => {
    try {
      const res = await apiClient.get('/system/notifications', {
        params: { outletId: currentOutlet?._id },
      });
      setNotifications(res.data || []);
    } catch (e) {
      // Ignore
    }
  };

  const handleSearch = async (val) => {
    setGlobalSearch(val);
    if (!val || val.length < 2) {
      setSearchResults([]);
      return;
    }
    setIsSearching(true);
    try {
      const res = await apiClient.get('/products', {
        params: { search: val, limit: 5, outletId: currentOutlet?._id },
      });
      setSearchResults(res.products || []);
    } catch (e) {
      // Ignore
    } finally {
      setIsSearching(false);
    }
  };

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  return (
    <header className="h-16 bg-white border-b border-slate-200 px-6 flex items-center justify-between sticky top-0 z-20 print:hidden">
      {/* Global Search Bar */}
      <div className="relative w-80 lg:w-96">
        <div className="relative flex items-center">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 pointer-events-none" />
          <input
            type="text"
            placeholder="Search medicine, salt composition, barcode... (F2 for POS)"
            value={globalSearch}
            onChange={(e) => handleSearch(e.target.value)}
            className="w-full bg-slate-50 border border-slate-200 pl-9 pr-4 py-1.5 rounded-xl text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-colors"
          />
        </div>

        {/* Live Search Quick Results Overlay */}
        {searchResults.length > 0 && (
          <div className="absolute top-12 left-0 w-full bg-white border border-slate-200 shadow-xl rounded-xl p-2 z-50 divide-y divide-slate-100">
            {searchResults.map((p) => (
              <div
                key={p._id}
                onClick={() => {
                  setGlobalSearch('');
                  setSearchResults([]);
                  navigate(`/products?search=${encodeURIComponent(p.name)}`);
                }}
                className="py-2 px-3 hover:bg-slate-50 rounded-lg cursor-pointer transition-colors flex items-center justify-between"
              >
                <div>
                  <p className="text-xs font-semibold text-slate-900">{p.name}</p>
                  <p className="text-[10px] text-slate-500">{p.genericName}</p>
                </div>
                <div className="text-right">
                  <span className="text-xs font-bold text-emerald-700">₹{p.sellingPrice}</span>
                  <p className="text-[10px] text-slate-400">{p.currentStock || 0} in stock</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Top Controls */}
      <div className="flex items-center gap-3">
        {/* Outlet / Store Selector */}
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-100/80 border border-slate-200 text-xs">
          <Store className="w-4 h-4 text-emerald-600" />
          <select
            value={currentOutlet?._id || ''}
            onChange={(e) => {
              const selected = outlets.find((o) => o._id === e.target.value);
              if (selected) setCurrentOutlet(selected);
            }}
            className="bg-transparent font-medium text-slate-800 focus:outline-none cursor-pointer"
          >
            {outlets.map((o) => (
              <option key={o._id} value={o._id}>
                {o.name} ({o.code})
              </option>
            ))}
          </select>
        </div>

        {/* Quick New POS Bill Button */}
        <Button
          variant="primary"
          size="sm"
          icon={PlusCircle}
          onClick={() => navigate('/pos')}
          className="shadow-sm shadow-emerald-600/20"
        >
          New Bill (F2)
        </Button>

        {/* Notification Bell Dropdown */}
        <div className="relative">
          <button
            onClick={() => setShowNotifications(!showNotifications)}
            className="p-2 rounded-xl text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-colors relative"
            title="Notifications"
          >
            <Bell className="w-5 h-5" />
            {unreadCount > 0 && (
              <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-red-500 ring-2 ring-white" />
            )}
          </button>

          {showNotifications && (
            <div className="absolute right-0 mt-2 w-80 bg-white border border-slate-200 shadow-2xl rounded-2xl p-4 z-50">
              <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-100">
                <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">Alerts & Notifications</h4>
                <span className="text-[10px] font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">
                  {unreadCount} New
                </span>
              </div>

              <div className="space-y-2 max-h-72 overflow-y-auto">
                {notifications.length === 0 ? (
                  <p className="text-xs text-slate-400 text-center py-4">No notifications</p>
                ) : (
                  notifications.map((n) => (
                    <div
                      key={n._id}
                      className="p-2.5 rounded-xl bg-slate-50 border border-slate-100 text-xs hover:bg-slate-100 transition-colors"
                    >
                      <div className="flex items-start gap-2">
                        {n.type === 'EXPIRY_WARNING' ? (
                          <Clock className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                        ) : n.type === 'LOW_STOCK' ? (
                          <AlertTriangle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                        ) : (
                          <CheckCircle className="w-4 h-4 text-blue-500 shrink-0 mt-0.5" />
                        )}
                        <div>
                          <p className="font-semibold text-slate-800">{n.title}</p>
                          <p className="text-slate-500 text-[11px] mt-0.5">{n.message}</p>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};

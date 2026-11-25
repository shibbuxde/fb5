import React, { useState } from 'react';
import {
  Bell,
  BookOpen,
  Briefcase,
  CalendarClock,
  CheckCheck,
  FileSpreadsheet,
  HelpCircle,
  IndianRupee,
  LayoutDashboard,
  LogOut,
  MoreVertical,
  Share2,
  Shield,
  TrendingUp,
  User,
  Users,
  Wallet,
  ArrowUpRight,
  X,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { markNotificationRead } from '../lib/firestoreService';
import { formatINR, formatTimestamp } from '../lib/utils';
import type { UserNavView } from '../types';

const SIDEBAR_ITEMS: { id: UserNavView; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'training', label: 'Training', icon: BookOpen },
  { id: 'work-plans', label: 'Work Plans', icon: Briefcase },
  { id: 'active-pages', label: 'My Active Pages', icon: FileSpreadsheet },
  { id: 'affiliate', label: 'Affiliate Program', icon: Share2 },
  { id: 'referrals', label: 'My Referrals', icon: Users },
  { id: 'earnings', label: 'My Earnings', icon: TrendingUp },
  { id: 'monthly-salary', label: 'Monthly Salary', icon: IndianRupee },
  { id: 'weekly-payout', label: 'Weekly Payout', icon: CalendarClock },
  { id: 'wallet', label: 'Wallet', icon: Wallet },
  { id: 'withdrawal', label: 'Withdrawal', icon: ArrowUpRight },
  { id: 'profile', label: 'Profile Settings', icon: User },
  { id: 'support', label: 'Support', icon: HelpCircle },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const {
    userProfile,
    isAdmin,
    setPortalMode,
    userView,
    setUserView,
    wallet,
    myNotifications,
    handleLogout,
  } = useApp();

  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);

  const unreadCount = myNotifications.filter((n) => !n.read).length;

  const handleSelectNav = (view: UserNavView) => {
    setUserView(view);
    setMobileMenuOpen(false);
  };

  const handleMarkAllRead = async () => {
    const unread = myNotifications.filter((n) => !n.read);
    await Promise.all(unread.map((n) => markNotificationRead(n.id)));
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Top Header: Left Three-Dot Menu | Center Violet Button | Right Wallet + Bell + Profile */}
      <header className="sticky top-0 z-30 bg-white border-b border-slate-200 h-16 px-4 sm:px-6 flex items-center justify-between gap-4">
        {/* Left Side: Three-Dot Menu + Wordmark */}
        <div className="flex items-center gap-3 shrink-0">
          <button
            type="button"
            onClick={() => {
              if (window.innerWidth < 1024) {
                setMobileMenuOpen((v) => !v);
              } else {
                setSidebarOpen((v) => !v);
              }
            }}
            aria-label="Toggle navigation menu"
            title="Menu"
            className="w-10 h-10 rounded-lg border border-slate-200 hover:bg-slate-50 flex items-center justify-center text-slate-700 transition-colors"
          >
            <MoreVertical className="w-5 h-5" />
          </button>

          <button
            type="button"
            onClick={() => handleSelectNav('dashboard')}
            className="flex items-center gap-2.5 text-left whitespace-nowrap shrink-0"
          >
            <div className="w-8 h-8 rounded-lg bg-violet-700 flex items-center justify-center text-white font-bold text-xs">
              FE
            </div>
            <span className="text-base font-bold tracking-tight text-slate-900 hidden sm:inline">
              Facebook Earner
            </span>
          </button>
        </div>

        {/* Center: Signature Violet Main Section Button */}
        <div className="flex items-center justify-center">
          <button
            type="button"
            onClick={() => handleSelectNav('work-plans')}
            className="inline-flex items-center gap-2 px-4 sm:px-6 py-2 text-xs sm:text-sm font-semibold text-white bg-violet-700 hover:bg-violet-800 rounded-lg shadow-xs transition-colors whitespace-nowrap shrink-0"
          >
            <Briefcase className="w-4 h-4 shrink-0" />
            <span>Facebook Work Hub</span>
          </button>
        </div>

        {/* Right Side: Wallet Available Balance + Notifications + Profile Icon */}
        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          <button
            type="button"
            onClick={() => handleSelectNav('wallet')}
            className="inline-flex items-center gap-2 px-3 py-2 bg-slate-50 hover:bg-violet-50 border border-slate-200 hover:border-violet-200 rounded-lg transition-colors whitespace-nowrap shrink-0"
            title="Open Wallet Dashboard"
          >
            <Wallet className="w-4 h-4 text-violet-700 shrink-0" />
            <span className="text-xs font-medium text-slate-600 hidden sm:inline">Wallet</span>
            <span className="text-xs sm:text-sm font-bold font-mono tabular-nums text-slate-900">
              {formatINR(wallet.availableBalance)}
            </span>
          </button>

          {/* Notification Bell */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setNotifOpen((v) => !v)}
              aria-label="Notifications"
              className="relative w-10 h-10 rounded-lg border border-slate-200 hover:bg-slate-50 flex items-center justify-center text-slate-700 transition-colors"
            >
              <Bell className="w-4 h-4" />
              {unreadCount > 0 ? (
                <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-violet-700 text-white text-[10px] font-bold font-mono flex items-center justify-center">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              ) : null}
            </button>

            {notifOpen ? (
              <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white border border-slate-200 rounded-xl shadow-xl z-40 overflow-hidden">
                <div className="px-4 py-3 border-b border-slate-200 flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-900">
                    Notifications ({myNotifications.length})
                  </span>
                  <div className="flex items-center gap-3">
                    {unreadCount > 0 ? (
                      <button
                        type="button"
                        onClick={handleMarkAllRead}
                        className="inline-flex items-center gap-1 text-[11px] font-semibold text-violet-700 hover:underline"
                      >
                        <CheckCheck className="w-3.5 h-3.5" />
                        Mark all read
                      </button>
                    ) : null}
                    <button
                      type="button"
                      onClick={() => setNotifOpen(false)}
                      className="text-slate-400 hover:text-slate-700"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </div>
                <div className="max-h-96 overflow-y-auto divide-y divide-slate-100">
                  {myNotifications.length === 0 ? (
                    <div className="p-6 text-center text-xs text-slate-500">
                      No notifications yet.
                    </div>
                  ) : (
                    myNotifications.slice(0, 20).map((n) => (
                      <button
                        key={n.id}
                        type="button"
                        onClick={() => {
                          if (!n.read) markNotificationRead(n.id);
                        }}
                        className={`w-full text-left px-4 py-3 hover:bg-slate-50 transition-colors ${
                          n.read ? 'bg-white' : 'bg-violet-50/50'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-xs font-semibold text-slate-900">{n.title}</span>
                          {!n.read ? (
                            <span className="text-[10px] font-semibold text-violet-700">New</span>
                          ) : null}
                        </div>
                        <p className="text-xs text-slate-600 mt-0.5 leading-relaxed">{n.message}</p>
                        <div className="text-[10px] text-slate-400 mt-1">
                          {formatTimestamp(n.createdAt)}
                        </div>
                      </button>
                    ))
                  )}
                </div>
              </div>
            ) : null}
          </div>

          {/* Admin Mode Button (visible strictly for Admin accounts) */}
          {isAdmin ? (
            <button
              type="button"
              onClick={() => setPortalMode('admin')}
              className="hidden sm:inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-lg transition-colors whitespace-nowrap shrink-0"
            >
              <Shield className="w-3.5 h-3.5" />
              Admin Panel
            </button>
          ) : null}

          {/* Right Side: User Profile Icon */}
          <button
            type="button"
            onClick={() => handleSelectNav('profile')}
            title="Profile Settings"
            className="w-10 h-10 rounded-lg border border-slate-200 hover:border-violet-300 overflow-hidden bg-violet-50 flex items-center justify-center shrink-0 transition-colors"
          >
            {userProfile?.photoUrl ? (
              <img
                src={userProfile.photoUrl}
                alt={userProfile.fullName}
                referrerPolicy="no-referrer"
                className="w-full h-full object-cover"
              />
            ) : (
              <User className="w-4 h-4 text-violet-700" />
            )}
          </button>
        </div>
      </header>

      {/* Main Workspace Layout */}
      <div className="flex-1 flex min-h-0 relative">
        {/* Desktop Sidebar (Exact 14 items including Logout) */}
        <aside
          className={`hidden lg:flex flex-col bg-white border-r border-slate-200 transition-all duration-150 shrink-0 ${
            sidebarOpen ? 'w-64' : 'w-0 overflow-hidden border-r-0'
          }`}
        >
          <div className="p-4 border-b border-slate-100">
            <div className="text-xs font-semibold text-slate-900 truncate">
              {userProfile?.fullName}
            </div>
            <div className="text-[11px] font-mono text-slate-500 mt-0.5">
              ID: {userProfile?.userCode} · Plan:{' '}
              {userProfile?.activePlanPages ? `${userProfile.activePlanPages} Pages` : 'None'}
            </div>
          </div>

          <nav className="flex-1 overflow-y-auto p-3 space-y-0.5">
            {SIDEBAR_ITEMS.map((item) => {
              const Icon = item.icon;
              const active = userView === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => handleSelectNav(item.id)}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 text-sm font-medium rounded-lg transition-colors whitespace-nowrap ${
                    active
                      ? 'bg-violet-50 text-violet-800 font-semibold'
                      : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                  }`}
                >
                  <Icon className={`w-4 h-4 shrink-0 ${active ? 'text-violet-700' : 'text-slate-400'}`} />
                  <span className="truncate">{item.label}</span>
                </button>
              );
            })}

            <div className="pt-2 mt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={handleLogout}
                className="w-full flex items-center gap-3 px-3 py-2.5 text-sm font-medium text-rose-700 hover:bg-rose-50 rounded-lg transition-colors whitespace-nowrap"
              >
                <LogOut className="w-4 h-4 shrink-0" />
                <span>Logout</span>
              </button>
            </div>
          </nav>
        </aside>

        {/* Mobile Drawer */}
        {mobileMenuOpen ? (
          <div className="lg:hidden fixed inset-0 z-40 flex">
            <div
              className="fixed inset-0 bg-slate-900/40"
              onClick={() => setMobileMenuOpen(false)}
            />
            <div className="relative w-72 max-w-[82vw] bg-white h-full shadow-xl flex flex-col z-50">
              <div className="p-4 border-b border-slate-200 flex items-center justify-between">
                <div>
                  <div className="text-sm font-bold text-slate-900">{userProfile?.fullName}</div>
                  <div className="text-xs font-mono text-slate-500">ID: {userProfile?.userCode}</div>
                </div>
                <button
                  type="button"
                  onClick={() => setMobileMenuOpen(false)}
                  className="p-1.5 text-slate-500"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {isAdmin ? (
                <div className="p-3 border-b border-slate-100">
                  <button
                    type="button"
                    onClick={() => {
                      setMobileMenuOpen(false);
                      setPortalMode('admin');
                    }}
                    className="w-full flex items-center justify-center gap-2 px-3 py-2 text-xs font-semibold text-white bg-slate-900 rounded-lg"
                  >
                    <Shield className="w-3.5 h-3.5" />
                    Switch to Admin Panel
                  </button>
                </div>
              ) : null}

              <nav className="flex-1 overflow-y-auto p-3 space-y-0.5">
                {SIDEBAR_ITEMS.map((item) => {
                  const Icon = item.icon;
                  const active = userView === item.id;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => handleSelectNav(item.id)}
                      className={`w-full flex items-center gap-3 px-3 py-2.5 text-sm font-medium rounded-lg ${
                        active ? 'bg-violet-50 text-violet-800 font-semibold' : 'text-slate-600'
                      }`}
                    >
                      <Icon className="w-4 h-4 shrink-0" />
                      <span>{item.label}</span>
                    </button>
                  );
                })}
                <div className="pt-2 mt-2 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={handleLogout}
                    className="w-full flex items-center gap-3 px-3 py-2.5 text-sm font-medium text-rose-700 hover:bg-rose-50 rounded-lg"
                  >
                    <LogOut className="w-4 h-4 shrink-0" />
                    <span>Logout</span>
                  </button>
                </div>
              </nav>
            </div>
          </div>
        ) : null}

        {/* Main Viewport */}
        <main className="flex-1 min-w-0 p-5 sm:p-8 max-w-[1400px] w-full mx-auto">
          {children}
        </main>
      </div>
    </div>
  );
}

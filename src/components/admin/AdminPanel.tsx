import React from 'react';
import {
  ArrowLeft,
  BookOpen,
  Briefcase,
  CalendarCheck2,
  HelpCircle,
  IndianRupee,
  LayoutDashboard,
  LogOut,
  Settings,
  Shield,
  Wallet,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import type { AdminNavView } from '../../types';
import {
  AdminOverviewTab,
  AdminTrainingTab,
  AdminWeeklyVerificationTab,
  AdminWorkTab,
} from './AdminOperationsTabs';
import {
  AdminSalaryAffiliateTab,
  AdminSettingsTab,
  AdminSupportTab,
  AdminWalletPayoutsTab,
} from './AdminFinanceAndSettingsTabs';
import { useAdminData } from './useAdminData';

const ADMIN_NAV: { id: AdminNavView; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { id: 'overview', label: 'Overview & Logs', icon: LayoutDashboard },
  { id: 'training', label: 'Training Management', icon: BookOpen },
  { id: 'work', label: 'Work & FB Links', icon: Briefcase },
  { id: 'weekly-verification', label: '7th-Day Verification', icon: CalendarCheck2 },
  { id: 'salary-affiliate', label: 'Salary & Affiliate', icon: IndianRupee },
  { id: 'wallet-payouts', label: 'Wallets & Payouts', icon: Wallet },
  { id: 'settings', label: 'Settings & QR Code', icon: Settings },
  { id: 'support', label: 'Support Tickets', icon: HelpCircle },
];

export function AdminPanel() {
  const { isAdmin, adminView, setAdminView, setPortalMode, userProfile, handleLogout } = useApp();
  const data = useAdminData(isAdmin);

  if (!isAdmin) return null;

  const pendingCounts: Partial<Record<AdminNavView, number>> = {
    training: data.trainingPurchases.filter((t) => t.status === 'pending').length,
    work:
      data.facebookPages.filter((p) => p.status === 'Pending Approval').length +
      data.planPurchases.filter((p) => p.paymentStatus === 'pending').length,
    'weekly-verification': data.weeklyVerifications.filter((v) => v.status === 'requested').length,
    'wallet-payouts': data.withdrawalRequests.filter(
      (w) => w.status !== 'Paid' && w.status !== 'Rejected',
    ).length,
    support: data.supportTickets.filter((s) => s.status === 'Open').length,
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Top Admin Header */}
      <header className="sticky top-0 z-30 bg-slate-900 text-white h-16 px-4 sm:px-6 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-violet-600 flex items-center justify-center">
            <Shield className="w-4 h-4 text-white" />
          </div>
          <div>
            <div className="text-sm font-bold leading-tight whitespace-nowrap">
              Facebook Earner Admin
            </div>
            <div className="text-[11px] text-slate-400 font-mono hidden sm:block">
              {userProfile?.email}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setPortalMode('user')}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-slate-900 bg-white hover:bg-slate-100 rounded-lg transition-colors whitespace-nowrap"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            User Portal
          </button>
          <button
            type="button"
            onClick={handleLogout}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-200 hover:bg-slate-800 rounded-lg transition-colors whitespace-nowrap"
          >
            <LogOut className="w-3.5 h-3.5" />
            Logout
          </button>
        </div>
      </header>

      <div className="flex-1 flex flex-col lg:flex-row min-h-0">
        {/* Admin Sidebar */}
        <aside className="lg:w-64 bg-white border-b lg:border-b-0 lg:border-r border-slate-200 shrink-0">
          <nav className="p-3 flex lg:flex-col gap-1 overflow-x-auto lg:overflow-visible">
            {ADMIN_NAV.map((item) => {
              const Icon = item.icon;
              const active = adminView === item.id;
              const badge = pendingCounts[item.id] || 0;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setAdminView(item.id)}
                  className={`flex items-center justify-between gap-2.5 px-3 py-2.5 text-xs sm:text-sm font-medium rounded-lg transition-colors whitespace-nowrap shrink-0 ${
                    active
                      ? 'bg-violet-50 text-violet-800 font-semibold'
                      : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                  }`}
                >
                  <span className="flex items-center gap-2.5">
                    <Icon className={`w-4 h-4 shrink-0 ${active ? 'text-violet-700' : 'text-slate-400'}`} />
                    <span>{item.label}</span>
                  </span>
                  {badge > 0 ? (
                    <span className="font-mono text-[11px] font-bold text-violet-700">
                      {badge}
                    </span>
                  ) : null}
                </button>
              );
            })}
          </nav>
        </aside>

        {/* Admin Viewport */}
        <main className="flex-1 min-w-0 p-5 sm:p-8 max-w-[1440px] w-full mx-auto">
          {data.loading ? (
            <div className="bg-white border border-slate-200 rounded-xl p-10 text-center text-sm text-slate-500">
              Loading live platform data from Cloud Firestore...
            </div>
          ) : adminView === 'overview' ? (
            <AdminOverviewTab data={data} />
          ) : adminView === 'training' ? (
            <AdminTrainingTab data={data} />
          ) : adminView === 'work' ? (
            <AdminWorkTab data={data} />
          ) : adminView === 'weekly-verification' ? (
            <AdminWeeklyVerificationTab data={data} />
          ) : adminView === 'salary-affiliate' ? (
            <AdminSalaryAffiliateTab data={data} />
          ) : adminView === 'wallet-payouts' ? (
            <AdminWalletPayoutsTab data={data} />
          ) : adminView === 'settings' ? (
            <AdminSettingsTab />
          ) : (
            <AdminSupportTab data={data} />
          )}
        </main>
      </div>
    </div>
  );
}

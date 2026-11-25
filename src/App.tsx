import React from 'react';
import { AppShell } from './components/AppShell';
import { AuthScreen } from './components/AuthScreen';
import { ToastStack } from './components/CommonUI';
import { ErrorBoundary } from './components/ErrorBoundary';
import { TrainingGateView } from './components/TrainingGateView';
import { AdminPanel } from './components/admin/AdminPanel';
import { AffiliateProgramView } from './components/user/AffiliateAndReferralsView';
import { EarningsSalaryPayoutView } from './components/user/EarningsSalaryPayoutView';
import { ProfileSettingsView, SupportView } from './components/user/ProfileAndSupportView';
import { UserDashboardView } from './components/user/UserDashboardView';
import { WalletAndWithdrawalView } from './components/user/WalletAndWithdrawalView';
import { MyActivePagesView, WorkPlansView } from './components/user/WorkPlansAndPagesView';
import { AppProvider, useApp } from './context/AppContext';

function PlatformRouter() {
  const {
    firebaseUser,
    authReady,
    initializingProfile,
    userProfile,
    isAdmin,
    portalMode,
    userView,
    toasts,
    dismissToast,
  } = useApp();

  if (!authReady) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-violet-700 text-white font-bold text-sm flex items-center justify-center">
            FE
          </div>
          <div className="text-sm font-medium text-slate-600">Connecting to Facebook Earner...</div>
        </div>
      </div>
    );
  }

  if (!firebaseUser || !firebaseUser.emailVerified) {
    return (
      <>
        <AuthScreen />
        <ToastStack toasts={toasts} onDismiss={dismissToast} />
      </>
    );
  }

  if (initializingProfile || !userProfile) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
        <div className="bg-white border border-slate-200 rounded-xl px-8 py-6 text-center space-y-2">
          <div className="text-sm font-bold text-slate-900">Setting up your workspace</div>
          <div className="text-xs text-slate-500">
            Syncing your unique User ID, wallet, and live settings...
          </div>
        </div>
        <ToastStack toasts={toasts} onDismiss={dismissToast} />
      </div>
    );
  }

  // Secure Admin Panel Mode
  if (isAdmin && portalMode === 'admin') {
    return (
      <>
        <AdminPanel />
        <ToastStack toasts={toasts} onDismiss={dismissToast} />
      </>
    );
  }

  // Mandatory Paid Training Access Gate until verified by Admin
  if (!userProfile.trainingVerified) {
    return (
      <>
        <TrainingGateView isLockedGate />
        <ToastStack toasts={toasts} onDismiss={dismissToast} />
      </>
    );
  }

  // Main Verified User Portal
  return (
    <>
      <AppShell>
        {userView === 'dashboard' ? (
          <UserDashboardView />
        ) : userView === 'training' ? (
          <TrainingGateView />
        ) : userView === 'work-plans' ? (
          <WorkPlansView />
        ) : userView === 'active-pages' ? (
          <MyActivePagesView />
        ) : userView === 'affiliate' ? (
          <AffiliateProgramView />
        ) : userView === 'referrals' ? (
          <AffiliateProgramView focusReferrals />
        ) : userView === 'earnings' ? (
          <EarningsSalaryPayoutView mode="earnings" />
        ) : userView === 'monthly-salary' ? (
          <EarningsSalaryPayoutView mode="monthly-salary" />
        ) : userView === 'weekly-payout' ? (
          <EarningsSalaryPayoutView mode="weekly-payout" />
        ) : userView === 'wallet' ? (
          <WalletAndWithdrawalView mode="wallet" />
        ) : userView === 'withdrawal' ? (
          <WalletAndWithdrawalView mode="withdrawal" />
        ) : userView === 'profile' ? (
          <ProfileSettingsView />
        ) : (
          <SupportView />
        )}
      </AppShell>
      <ToastStack toasts={toasts} onDismiss={dismissToast} />
    </>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <AppProvider>
        <PlatformRouter />
      </AppProvider>
    </ErrorBoundary>
  );
}

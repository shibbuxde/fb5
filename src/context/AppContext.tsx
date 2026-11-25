import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { onAuthStateChanged, signOut, type User as FirebaseUser } from 'firebase/auth';
import {
  collection,
  doc,
  onSnapshot,
  query,
  where,
  type Unsubscribe,
} from 'firebase/firestore';
import {
  auth,
  isBootstrapAdminEmail,
  db,
  handleFirestoreError,
  OperationType,
} from '../lib/firebase';
import { ensureUserInitialized } from '../lib/firestoreService';
import { DEFAULT_ADMIN_SETTINGS, generateDocId } from '../lib/utils';
import type {
  AdminNavView,
  AdminSettings,
  AffiliateReferral,
  DailyInstruction,
  DailySubmission,
  FacebookPageLink,
  NotificationItem,
  PaymentMethod,
  PlanPurchase,
  SupportTicket,
  ToastMessage,
  TrainingPurchase,
  UserNavView,
  UserProfile,
  UserWallet,
  WalletTransaction,
  WeeklyCommission,
  WeeklySalary,
  WeeklyVerification,
  WithdrawalRequest,
} from '../types';

interface AppContextValue {
  firebaseUser: FirebaseUser | null;
  authReady: boolean;
  initializingProfile: boolean;
  userProfile: UserProfile | null;
  isAdmin: boolean;
  portalMode: 'user' | 'admin';
  setPortalMode: (mode: 'user' | 'admin') => void;
  userView: UserNavView;
  setUserView: (view: UserNavView) => void;
  adminView: AdminNavView;
  setAdminView: (view: AdminNavView) => void;
  settings: AdminSettings;
  wallet: UserWallet;
  paymentMethod: PaymentMethod | null;
  trainingPurchases: TrainingPurchase[];
  planPurchases: PlanPurchase[];
  myPages: FacebookPageLink[];
  dailyInstructions: DailyInstruction[];
  mySubmissions: DailySubmission[];
  myVerifications: WeeklyVerification[];
  mySalaries: WeeklySalary[];
  myReferrals: AffiliateReferral[];
  myCommissions: WeeklyCommission[];
  myTransactions: WalletTransaction[];
  myWithdrawals: WithdrawalRequest[];
  myNotifications: NotificationItem[];
  mySupportTickets: SupportTicket[];
  toasts: ToastMessage[];
  pushToast: (type: ToastMessage['type'], title: string, description?: string) => void;
  dismissToast: (id: string) => void;
  handleLogout: () => Promise<void>;
  setPendingSignupMeta: (meta: { fullName?: string; referralCodeInput?: string }) => void;
}

const EMPTY_WALLET: UserWallet = {
  userId: '',
  availableBalance: 0,
  reservedBalance: 0,
  pendingEarnings: 0,
  totalSalaryIncome: 0,
  totalAffiliateIncome: 0,
  currentWeekEarnings: 0,
  totalWithdrawn: 0,
  lifetimeEarnings: 0,
};

const AppContext = createContext<AppContextValue | null>(null);

function sortByCreatedDesc<T extends { createdAt?: { toMillis?: () => number } | null }>(
  items: T[],
): T[] {
  return [...items].sort((a, b) => {
    const aMs = a.createdAt?.toMillis ? a.createdAt.toMillis() : 0;
    const bMs = b.createdAt?.toMillis ? b.createdAt.toMillis() : 0;
    return bMs - aMs;
  });
}

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [initializingProfile, setInitializingProfile] = useState(false);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [portalMode, setPortalMode] = useState<'user' | 'admin'>('user');
  const [userView, setUserView] = useState<UserNavView>('dashboard');
  const [adminView, setAdminView] = useState<AdminNavView>('overview');

  const [settings, setSettings] = useState<AdminSettings>(DEFAULT_ADMIN_SETTINGS);
  const [wallet, setWallet] = useState<UserWallet>(EMPTY_WALLET);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod | null>(null);
  const [trainingPurchases, setTrainingPurchases] = useState<TrainingPurchase[]>([]);
  const [planPurchases, setPlanPurchases] = useState<PlanPurchase[]>([]);
  const [myPages, setMyPages] = useState<FacebookPageLink[]>([]);
  const [dailyInstructions, setDailyInstructions] = useState<DailyInstruction[]>([]);
  const [mySubmissions, setMySubmissions] = useState<DailySubmission[]>([]);
  const [myVerifications, setMyVerifications] = useState<WeeklyVerification[]>([]);
  const [mySalaries, setMySalaries] = useState<WeeklySalary[]>([]);
  const [myReferrals, setMyReferrals] = useState<AffiliateReferral[]>([]);
  const [myCommissions, setMyCommissions] = useState<WeeklyCommission[]>([]);
  const [myTransactions, setMyTransactions] = useState<WalletTransaction[]>([]);
  const [myWithdrawals, setMyWithdrawals] = useState<WithdrawalRequest[]>([]);
  const [myNotifications, setMyNotifications] = useState<NotificationItem[]>([]);
  const [mySupportTickets, setMySupportTickets] = useState<SupportTicket[]>([]);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const pendingSignupMetaRef = useRef<{ fullName?: string; referralCodeInput?: string }>({});

  const setPendingSignupMeta = useCallback(
    (meta: { fullName?: string; referralCodeInput?: string }) => {
      pendingSignupMetaRef.current = meta;
    },
    [],
  );

  const pushToast = useCallback(
    (type: ToastMessage['type'], title: string, description?: string) => {
      const id = generateDocId('tst');
      setToasts((prev) => [...prev.slice(-4), { id, type, title, description }]);
      window.setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
      }, 4500);
    },
    [],
  );

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  // Capture ?ref= query parameter on first load
  useEffect(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      const ref = params.get('ref');
      if (ref && /^[a-zA-Z0-9_-]{3,32}$/.test(ref)) {
        sessionStorage.setItem('pw_pending_ref', ref.toUpperCase());
      }
    } catch {
      // Ignore storage errors
    }
  }, []);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (fbUser) => {
      setFirebaseUser(fbUser);
      setAuthReady(true);

      if (!fbUser) {
        setUserProfile(null);
        setWallet(EMPTY_WALLET);
        setPaymentMethod(null);
        setTrainingPurchases([]);
        setPlanPurchases([]);
        setMyPages([]);
        setDailyInstructions([]);
        setMySubmissions([]);
        setMyVerifications([]);
        setMySalaries([]);
        setMyReferrals([]);
        setMyCommissions([]);
        setMyTransactions([]);
        setMyWithdrawals([]);
        setMyNotifications([]);
        setMySupportTickets([]);
        setPortalMode('user');
        setUserView('dashboard');
        return;
      }

      if (!fbUser.emailVerified) {
        return;
      }

      setInitializingProfile(true);
      try {
        const storedRef = sessionStorage.getItem('pw_pending_ref') || '';
        const meta = pendingSignupMetaRef.current;
        await ensureUserInitialized(fbUser, {
          fullName: meta.fullName,
          referralCodeInput: meta.referralCodeInput || storedRef,
        });
        pendingSignupMetaRef.current = {};
      } catch (err) {
        console.error('Failed to initialize user profile:', err);
        pushToast(
          'error',
          'Account Sync Notice',
          err instanceof Error ? err.message : 'Unable to sync profile with Firestore.',
        );
      } finally {
        setInitializingProfile(false);
      }
    });
    return () => unsub();
  }, [pushToast]);

  // Attach real-time Firestore listeners only when authenticated & email verified
  useEffect(() => {
    if (!firebaseUser || !firebaseUser.emailVerified) return;
    const uid = firebaseUser.uid;
    const unsubs: Unsubscribe[] = [];

    // 1. Global Admin Settings
    unsubs.push(
      onSnapshot(
        doc(db, 'admin_settings', 'global'),
        (snap) => {
          if (snap.exists()) {
            setSettings({ ...DEFAULT_ADMIN_SETTINGS, ...(snap.data() as Partial<AdminSettings>) });
          } else {
            setSettings(DEFAULT_ADMIN_SETTINGS);
          }
        },
        (error) => handleFirestoreError(error, OperationType.GET, 'admin_settings/global'),
      ),
    );

    // 2. User Profile
    unsubs.push(
      onSnapshot(
        doc(db, 'users', uid),
        (snap) => {
          if (snap.exists()) {
            setUserProfile(snap.data() as UserProfile);
          }
        },
        (error) => handleFirestoreError(error, OperationType.GET, `users/${uid}`),
      ),
    );

    // 3. Wallet
    unsubs.push(
      onSnapshot(
        doc(db, 'wallets', uid),
        (snap) => {
          if (snap.exists()) {
            setWallet(snap.data() as UserWallet);
          }
        },
        (error) => handleFirestoreError(error, OperationType.GET, `wallets/${uid}`),
      ),
    );

    // 4. Payment Methods
    unsubs.push(
      onSnapshot(
        doc(db, 'payment_methods', uid),
        (snap) => {
          setPaymentMethod(snap.exists() ? (snap.data() as PaymentMethod) : null);
        },
        (error) => handleFirestoreError(error, OperationType.GET, `payment_methods/${uid}`),
      ),
    );

    // 5. Training Purchases
    unsubs.push(
      onSnapshot(
        query(collection(db, 'training_purchases'), where('userId', '==', uid)),
        (snap) => {
          setTrainingPurchases(
            sortByCreatedDesc(
              snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<TrainingPurchase, 'id'>) })),
            ),
          );
        },
        (error) => handleFirestoreError(error, OperationType.LIST, 'training_purchases'),
      ),
    );

    // 6. Plan Purchases
    unsubs.push(
      onSnapshot(
        query(collection(db, 'plan_purchases'), where('userId', '==', uid)),
        (snap) => {
          setPlanPurchases(
            sortByCreatedDesc(
              snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<PlanPurchase, 'id'>) })),
            ),
          );
        },
        (error) => handleFirestoreError(error, OperationType.LIST, 'plan_purchases'),
      ),
    );

    // 7. User Facebook Pages
    unsubs.push(
      onSnapshot(
        query(collection(db, 'facebook_pages'), where('userId', '==', uid)),
        (snap) => {
          const pages = snap.docs
            .map((d) => ({ id: d.id, ...(d.data() as Omit<FacebookPageLink, 'id'>) }))
            .sort((a, b) => a.slotIndex - b.slotIndex);
          setMyPages(pages);
        },
        (error) => handleFirestoreError(error, OperationType.LIST, 'facebook_pages'),
      ),
    );

    // 8. Active Daily Instructions
    unsubs.push(
      onSnapshot(
        query(collection(db, 'daily_instructions'), where('isActive', '==', true)),
        (snap) => {
          setDailyInstructions(
            sortByCreatedDesc(
              snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<DailyInstruction, 'id'>) })),
            ),
          );
        },
        (error) => handleFirestoreError(error, OperationType.LIST, 'daily_instructions'),
      ),
    );

    // 9. Daily Submissions
    unsubs.push(
      onSnapshot(
        query(collection(db, 'daily_submissions'), where('userId', '==', uid)),
        (snap) => {
          setMySubmissions(
            sortByCreatedDesc(
              snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<DailySubmission, 'id'>) })),
            ),
          );
        },
        (error) => handleFirestoreError(error, OperationType.LIST, 'daily_submissions'),
      ),
    );

    // 10. Weekly Verifications
    unsubs.push(
      onSnapshot(
        query(collection(db, 'weekly_verifications'), where('userId', '==', uid)),
        (snap) => {
          setMyVerifications(
            sortByCreatedDesc(
              snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<WeeklyVerification, 'id'>) })),
            ),
          );
        },
        (error) => handleFirestoreError(error, OperationType.LIST, 'weekly_verifications'),
      ),
    );

    // 11. Weekly Salaries
    unsubs.push(
      onSnapshot(
        query(collection(db, 'weekly_salaries'), where('userId', '==', uid)),
        (snap) => {
          setMySalaries(
            sortByCreatedDesc(
              snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<WeeklySalary, 'id'>) })),
            ),
          );
        },
        (error) => handleFirestoreError(error, OperationType.LIST, 'weekly_salaries'),
      ),
    );

    // 12. Direct Referrals
    unsubs.push(
      onSnapshot(
        query(collection(db, 'affiliate_referrals'), where('referrerUid', '==', uid)),
        (snap) => {
          setMyReferrals(
            sortByCreatedDesc(
              snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<AffiliateReferral, 'id'>) })),
            ),
          );
        },
        (error) => handleFirestoreError(error, OperationType.LIST, 'affiliate_referrals'),
      ),
    );

    // 13. Weekly Commissions
    unsubs.push(
      onSnapshot(
        query(collection(db, 'weekly_commissions'), where('referrerUid', '==', uid)),
        (snap) => {
          setMyCommissions(
            sortByCreatedDesc(
              snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<WeeklyCommission, 'id'>) })),
            ),
          );
        },
        (error) => handleFirestoreError(error, OperationType.LIST, 'weekly_commissions'),
      ),
    );

    // 14. Wallet Transactions
    unsubs.push(
      onSnapshot(
        query(collection(db, 'wallet_transactions'), where('userId', '==', uid)),
        (snap) => {
          setMyTransactions(
            sortByCreatedDesc(
              snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<WalletTransaction, 'id'>) })),
            ),
          );
        },
        (error) => handleFirestoreError(error, OperationType.LIST, 'wallet_transactions'),
      ),
    );

    // 15. Withdrawals
    unsubs.push(
      onSnapshot(
        query(collection(db, 'withdrawal_requests'), where('userId', '==', uid)),
        (snap) => {
          setMyWithdrawals(
            sortByCreatedDesc(
              snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<WithdrawalRequest, 'id'>) })),
            ),
          );
        },
        (error) => handleFirestoreError(error, OperationType.LIST, 'withdrawal_requests'),
      ),
    );

    // 16. Notifications
    unsubs.push(
      onSnapshot(
        query(collection(db, 'notifications'), where('userId', '==', uid)),
        (snap) => {
          setMyNotifications(
            sortByCreatedDesc(
              snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<NotificationItem, 'id'>) })),
            ),
          );
        },
        (error) => handleFirestoreError(error, OperationType.LIST, 'notifications'),
      ),
    );

    // 17. Support Tickets
    unsubs.push(
      onSnapshot(
        query(collection(db, 'support_tickets'), where('userId', '==', uid)),
        (snap) => {
          setMySupportTickets(
            sortByCreatedDesc(
              snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<SupportTicket, 'id'>) })),
            ),
          );
        },
        (error) => handleFirestoreError(error, OperationType.LIST, 'support_tickets'),
      ),
    );

    return () => {
      unsubs.forEach((u) => u());
    };
  }, [firebaseUser]);

  const isAdmin = Boolean(
    userProfile?.role === 'admin' ||
      (isBootstrapAdminEmail(firebaseUser?.email) && firebaseUser?.emailVerified),
  );

  const handleLogout = useCallback(async () => {
    await signOut(auth);
    pushToast('info', 'Signed Out', 'You have been securely logged out.');
  }, [pushToast]);

  return (
    <AppContext.Provider
      value={{
        firebaseUser,
        authReady,
        initializingProfile,
        userProfile,
        isAdmin,
        portalMode,
        setPortalMode,
        userView,
        setUserView,
        adminView,
        setAdminView,
        settings,
        wallet,
        paymentMethod,
        trainingPurchases,
        planPurchases,
        myPages,
        dailyInstructions,
        mySubmissions,
        myVerifications,
        mySalaries,
        myReferrals,
        myCommissions,
        myTransactions,
        myWithdrawals,
        myNotifications,
        mySupportTickets,
        toasts,
        pushToast,
        dismissToast,
        handleLogout,
        setPendingSignupMeta,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used inside AppProvider');
  return ctx;
}

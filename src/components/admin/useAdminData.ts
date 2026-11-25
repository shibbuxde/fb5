import { useEffect, useState } from 'react';
import { collection, onSnapshot, type Unsubscribe } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../../lib/firebase';
import type {
  AdminActivityLog,
  AffiliateReferral,
  DailyInstruction,
  DailySubmission,
  FacebookPageLink,
  GlobalFacebookPageLock,
  PageActivityRecord,
  PaymentMethod,
  PlanPurchase,
  SupportTicket,
  TrainingPurchase,
  UserProfile,
  UserWallet,
  WalletTransaction,
  WeeklyCommission,
  WeeklySalary,
  WeeklyVerification,
  WithdrawalRequest,
} from '../../types';

function sortDesc<T extends { createdAt?: { toMillis?: () => number } | null }>(list: T[]): T[] {
  return [...list].sort((a, b) => {
    const aMs = a.createdAt?.toMillis ? a.createdAt.toMillis() : 0;
    const bMs = b.createdAt?.toMillis ? b.createdAt.toMillis() : 0;
    return bMs - aMs;
  });
}

export interface AdminDataset {
  users: UserProfile[];
  trainingPurchases: TrainingPurchase[];
  planPurchases: PlanPurchase[];
  facebookPages: FacebookPageLink[];
  globalFacebookPages: GlobalFacebookPageLock[];
  pageActivityRecords: PageActivityRecord[];
  dailyInstructions: DailyInstruction[];
  dailySubmissions: DailySubmission[];
  weeklyVerifications: WeeklyVerification[];
  weeklySalaries: WeeklySalary[];
  affiliateReferrals: AffiliateReferral[];
  weeklyCommissions: WeeklyCommission[];
  wallets: UserWallet[];
  walletTransactions: WalletTransaction[];
  paymentMethods: PaymentMethod[];
  withdrawalRequests: WithdrawalRequest[];
  supportTickets: SupportTicket[];
  activityLogs: AdminActivityLog[];
  loading: boolean;
}

export function useAdminData(enabled: boolean): AdminDataset {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [trainingPurchases, setTrainingPurchases] = useState<TrainingPurchase[]>([]);
  const [planPurchases, setPlanPurchases] = useState<PlanPurchase[]>([]);
  const [facebookPages, setFacebookPages] = useState<FacebookPageLink[]>([]);
  const [globalFacebookPages, setGlobalFacebookPages] = useState<GlobalFacebookPageLock[]>([]);
  const [pageActivityRecords, setPageActivityRecords] = useState<PageActivityRecord[]>([]);
  const [dailyInstructions, setDailyInstructions] = useState<DailyInstruction[]>([]);
  const [dailySubmissions, setDailySubmissions] = useState<DailySubmission[]>([]);
  const [weeklyVerifications, setWeeklyVerifications] = useState<WeeklyVerification[]>([]);
  const [weeklySalaries, setWeeklySalaries] = useState<WeeklySalary[]>([]);
  const [affiliateReferrals, setAffiliateReferrals] = useState<AffiliateReferral[]>([]);
  const [weeklyCommissions, setWeeklyCommissions] = useState<WeeklyCommission[]>([]);
  const [wallets, setWallets] = useState<UserWallet[]>([]);
  const [walletTransactions, setWalletTransactions] = useState<WalletTransaction[]>([]);
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [withdrawalRequests, setWithdrawalRequests] = useState<WithdrawalRequest[]>([]);
  const [supportTickets, setSupportTickets] = useState<SupportTicket[]>([]);
  const [activityLogs, setActivityLogs] = useState<AdminActivityLog[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!enabled) return;
    setLoading(true);
    const unsubs: Unsubscribe[] = [];

    const bind = <T extends object>(
      colName: string,
      setter: (items: T[]) => void,
      shouldSort = true,
      markLoaded = false,
    ) => {
      unsubs.push(
        onSnapshot(
          collection(db, colName),
          (snap) => {
            const rows = snap.docs.map((d) => ({ id: d.id, ...(d.data() as Record<string, unknown>) })) as unknown as T[];
            setter(shouldSort ? (sortDesc(rows as never) as T[]) : rows);
            if (markLoaded) setLoading(false);
          },
          (error) => handleFirestoreError(error, OperationType.LIST, colName),
        ),
      );
    };

    bind<UserProfile>('users', setUsers, true, true);
    bind<TrainingPurchase>('training_purchases', setTrainingPurchases);
    bind<PlanPurchase>('plan_purchases', setPlanPurchases);
    bind<FacebookPageLink>('facebook_pages', setFacebookPages);
    bind<GlobalFacebookPageLock>('global_facebook_pages', setGlobalFacebookPages);
    bind<PageActivityRecord>('page_activity_records', setPageActivityRecords);
    bind<DailyInstruction>('daily_instructions', setDailyInstructions);
    bind<DailySubmission>('daily_submissions', setDailySubmissions);
    bind<WeeklyVerification>('weekly_verifications', setWeeklyVerifications);
    bind<WeeklySalary>('weekly_salaries', setWeeklySalaries);
    bind<AffiliateReferral>('affiliate_referrals', setAffiliateReferrals);
    bind<WeeklyCommission>('weekly_commissions', setWeeklyCommissions);
    bind<UserWallet>('wallets', setWallets, false);
    bind<WalletTransaction>('wallet_transactions', setWalletTransactions);
    bind<PaymentMethod>('payment_methods', setPaymentMethods, false);
    bind<WithdrawalRequest>('withdrawal_requests', setWithdrawalRequests);
    bind<SupportTicket>('support_tickets', setSupportTickets);
    bind<AdminActivityLog>('admin_activity_logs', setActivityLogs);

    return () => {
      unsubs.forEach((u) => u());
    };
  }, [enabled]);

  return {
    users,
    trainingPurchases,
    planPurchases,
    facebookPages,
    globalFacebookPages,
    pageActivityRecords,
    dailyInstructions,
    dailySubmissions,
    weeklyVerifications,
    weeklySalaries,
    affiliateReferrals,
    weeklyCommissions,
    wallets,
    walletTransactions,
    paymentMethods,
    withdrawalRequests,
    supportTickets,
    activityLogs,
    loading,
  };
}

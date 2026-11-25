import { Timestamp } from 'firebase/firestore';

export type UserRole = 'user' | 'admin';
export type TrainingStatus = 'not_purchased' | 'pending' | 'verified' | 'revoked';
export type PlanPagesCount = 50 | 100 | 150;

export type FacebookPageStatus =
  | 'Pending Approval'
  | 'Approved'
  | 'Work Active'
  | 'Work Paused'
  | 'Rejected'
  | 'Page Deactivated'
  | 'Work Discontinued';

export type DailySubmissionStatus =
  | 'Task Submitted'
  | 'Pending Verification'
  | 'Approved'
  | 'Rejected';

export type WithdrawalStatus =
  | 'Pending'
  | 'Under Review'
  | 'Approved'
  | 'Payment Processing'
  | 'Paid'
  | 'Rejected';

export type WalletTransactionType =
  | 'Affiliate Commission'
  | 'Monthly Salary'
  | 'Weekly Salary Credit'
  | 'Withdrawal'
  | 'Refund'
  | 'Admin Adjustment';

export interface TrainingModuleItem {
  id: string;
  title: string;
  duration: string;
  summary: string;
  videoUrl: string;
}

export interface AdminSettings {
  trainingTitle: string;
  trainingDescription: string;
  trainingBenefits: string[];
  trainingAccessDetails: string;
  trainingContentModules: TrainingModuleItem[];
  trainingPrice: number;
  trainingThumbnailUrl: string;
  paymentQrImageUrl: string;
  paymentUpiId: string;
  paymentMerchantName: string;
  paymentInstructions: string;
  plan50Price: number;
  plan100Price: number;
  plan150Price: number;
  plan50MonthlySalary: number;
  plan100MonthlySalary: number;
  plan150MonthlySalary: number;
  plan50WeeklyCommission: number;
  plan100WeeklyCommission: number;
  plan150WeeklyCommission: number;
  minWithdrawalLimit: number;
  weeklyPayoutDay: string;
  weeklyPayoutTime: string;
  workDurationDays: number;
  workInstructionsGlobal: string;
  updatedAt?: Timestamp | null;
}

export interface UserProfile {
  uid: string;
  userCode: string;
  fullName: string;
  email: string;
  phone?: string;
  photoUrl?: string;
  role: UserRole;
  referralCode: string;
  referredByUid?: string;
  referredByCode?: string;
  trainingVerified: boolean;
  trainingStatus: TrainingStatus;
  activePlanPages?: 0 | PlanPagesCount;
  activePlanPurchaseId?: string;
  accountStatus: 'active' | 'suspended';
  createdAt?: Timestamp | null;
  updatedAt?: Timestamp | null;
}

export interface TrainingPurchase {
  id: string;
  userId: string;
  userCode: string;
  userName: string;
  userEmail: string;
  amount: number;
  utrNumber: string;
  receiptUrl?: string;
  status: 'pending' | 'verified' | 'rejected';
  adminNote?: string;
  verifiedBy?: string;
  createdAt?: Timestamp | null;
  updatedAt?: Timestamp | null;
}

export interface PlanPurchase {
  id: string;
  userId: string;
  userCode: string;
  userName: string;
  planPages: PlanPagesCount;
  planPrice: number;
  monthlySalarySnapshot: number;
  weeklyCommissionSnapshot: number;
  utrNumber?: string;
  receiptUrl?: string;
  paymentStatus: 'pending' | 'approved' | 'rejected';
  workStarted: boolean;
  workStartedAt?: string;
  currentWeekKey?: string;
  submittedPagesCount: number;
  adminNote?: string;
  createdAt?: Timestamp | null;
  updatedAt?: Timestamp | null;
}

export interface FacebookPageLink {
  id: string;
  userId: string;
  userCode: string;
  userName?: string;
  planPurchaseId: string;
  planPages: PlanPagesCount;
  slotIndex: number;
  rawUrl: string;
  normalizedUrl: string;
  canonicalKey: string;
  status: FacebookPageStatus;
  rejectionReason?: string;
  lastWorkDate?: string;
  totalApprovedTasks?: number;
  createdAt?: Timestamp | null;
  updatedAt?: Timestamp | null;
}

export interface GlobalFacebookPageLock {
  id: string;
  canonicalKey: string;
  normalizedUrl: string;
  rawUrl: string;
  ownerUserId: string;
  ownerUserCode: string;
  ownerName?: string;
  pageDocId: string;
  createdAt?: Timestamp | null;
}

export interface DailyInstruction {
  id: string;
  title: string;
  description: string;
  guidelines?: string;
  videoUrl?: string;
  taskDate: string;
  isActive: boolean;
  createdBy?: string;
  createdAt?: Timestamp | null;
  updatedAt?: Timestamp | null;
}

export interface DailySubmission {
  id: string;
  userId: string;
  userCode: string;
  userName?: string;
  pageId: string;
  pageUrl?: string;
  instructionId: string;
  instructionTitle?: string;
  proofUrl: string;
  notes?: string;
  workDate: string;
  weekKey: string;
  status: DailySubmissionStatus;
  rejectionReason?: string;
  verifiedBy?: string;
  createdAt?: Timestamp | null;
  updatedAt?: Timestamp | null;
}

export interface WeeklyVerification {
  id: string;
  userId: string;
  userCode: string;
  userName?: string;
  planPurchaseId: string;
  planPages: PlanPagesCount;
  weekKey: string;
  totalSubmittedPages: number;
  verifiedActivePages: number;
  deactivatedPages?: number;
  rejectedPages?: number;
  monthlySalaryRate: number;
  weeklyCommissionRate: number;
  calculatedSalary: number;
  calculatedCommission: number;
  referrerUid?: string;
  status: 'requested' | 'under_review' | 'approved' | 'rejected';
  adminNotes?: string;
  verifiedBy?: string;
  createdAt?: Timestamp | null;
  updatedAt?: Timestamp | null;
}

export interface WeeklySalary {
  id: string;
  userId: string;
  userCode: string;
  userName?: string;
  verificationId: string;
  weekKey: string;
  planPages: PlanPagesCount;
  verifiedActivePages: number;
  monthlySalaryRate: number;
  amount: number;
  status: 'credited';
  createdAt?: Timestamp | null;
}

export interface AffiliateReferral {
  id: string;
  referrerUid: string;
  referrerCode: string;
  referredUid: string;
  referredCode: string;
  referredName: string;
  referredPlanPages?: 0 | PlanPagesCount;
  activePagesCount?: number;
  inactivePagesCount?: number;
  trainingVerified?: boolean;
  status: 'pending' | 'active' | 'inactive' | 'flagged';
  lastWeekCommission?: number;
  totalCommissionEarned?: number;
  createdAt?: Timestamp | null;
  updatedAt?: Timestamp | null;
}

export interface WeeklyCommission {
  id: string;
  referrerUid: string;
  referredUid: string;
  referredName?: string;
  verificationId: string;
  weekKey: string;
  planPages: PlanPagesCount;
  verifiedActivePages: number;
  weeklyCommissionRate: number;
  amount: number;
  status: 'credited';
  createdAt?: Timestamp | null;
}

export interface UserWallet {
  userId: string;
  availableBalance: number;
  reservedBalance: number;
  pendingEarnings: number;
  totalSalaryIncome: number;
  totalAffiliateIncome: number;
  currentWeekEarnings: number;
  totalWithdrawn: number;
  lifetimeEarnings: number;
  updatedAt?: Timestamp | null;
}

export interface WalletTransaction {
  id: string;
  txnCode: string;
  userId: string;
  type: WalletTransactionType;
  direction: 'credit' | 'debit';
  amount: number;
  description: string;
  referenceId?: string;
  status: 'Pending' | 'Completed' | 'Rejected';
  createdAt?: Timestamp | null;
}

export interface PaymentMethod {
  userId: string;
  bankHolderName?: string;
  bankName?: string;
  accountNumber?: string;
  ifscCode?: string;
  upiId?: string;
  upiHolderName?: string;
  updatedAt?: Timestamp | null;
}

export interface WithdrawalRequest {
  id: string;
  requestCode: string;
  userId: string;
  userCode: string;
  userName: string;
  amount: number;
  methodType: 'bank' | 'upi';
  methodSummary: string;
  accountHolderName?: string;
  bankName?: string;
  accountNumber?: string;
  ifscCode?: string;
  upiId?: string;
  status: WithdrawalStatus;
  utrReference?: string;
  adminNote?: string;
  createdAt?: Timestamp | null;
  updatedAt?: Timestamp | null;
}

export interface NotificationItem {
  id: string;
  userId: string;
  eventType: string;
  title: string;
  message: string;
  read: boolean;
  createdAt?: Timestamp | null;
}

export interface SupportTicket {
  id: string;
  userId: string;
  userCode: string;
  userName: string;
  subject: string;
  category: string;
  message: string;
  status: 'Open' | 'Replied' | 'Closed';
  adminReply?: string;
  createdAt?: Timestamp | null;
  updatedAt?: Timestamp | null;
}

export interface AdminActivityLog {
  id: string;
  adminUid: string;
  adminEmail: string;
  action: string;
  targetType: string;
  targetId: string;
  details: string;
  createdAt?: Timestamp | null;
}

export interface PageActivityRecord {
  id: string;
  pageId: string;
  userId: string;
  userCode: string;
  pageUrl: string;
  weekKey: string;
  previousStatus: string;
  newStatus: string;
  reason?: string;
  changedBy: string;
  createdAt?: Timestamp | null;
}

export type UserNavView =
  | 'dashboard'
  | 'training'
  | 'work-plans'
  | 'active-pages'
  | 'affiliate'
  | 'referrals'
  | 'earnings'
  | 'monthly-salary'
  | 'weekly-payout'
  | 'wallet'
  | 'withdrawal'
  | 'profile'
  | 'support';

export type AdminNavView =
  | 'overview'
  | 'training'
  | 'work'
  | 'weekly-verification'
  | 'salary-affiliate'
  | 'wallet-payouts'
  | 'settings'
  | 'support';

export interface ToastMessage {
  id: string;
  type: 'success' | 'error' | 'info';
  title: string;
  description?: string;
}

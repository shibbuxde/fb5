import React, { useEffect, useState } from 'react';
import { ArrowRight, QrCode, Save, Upload } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import {
  adminAdjustUserWallet,
  adminProcessWithdrawal,
  adminReplySupportTicket,
  adminSaveSettings,
  adminUpdateReferralStatus,
} from '../../lib/firestoreService';
import {
  calculateWeeklyCommission,
  calculateWeeklySalary,
  compressImageToDataUrl,
  DEFAULT_TRAINING_BANNER,
  formatINR,
  formatTimestamp,
  getCurrentWeekKey,
} from '../../lib/utils';
import type { AdminSettings, WalletTransactionType, WithdrawalStatus } from '../../types';
import { DefaultPaymentQrSvg, StatusText } from '../CommonUI';
import type { AdminDataset } from './useAdminData';

const WITHDRAWAL_STATUSES: WithdrawalStatus[] = [
  'Pending',
  'Under Review',
  'Approved',
  'Payment Processing',
  'Paid',
  'Rejected',
];

// ==================== 5. SALARY & AFFILIATE MANAGEMENT ====================
export function AdminSalaryAffiliateTab({ data }: { data: AdminDataset }) {
  const { userProfile, settings, setAdminView, pushToast } = useApp();
  const [sal50, setSal50] = useState(String(settings.plan50MonthlySalary));
  const [sal100, setSal100] = useState(String(settings.plan100MonthlySalary));
  const [sal150, setSal150] = useState(String(settings.plan150MonthlySalary));
  const [com50, setCom50] = useState(String(settings.plan50WeeklyCommission));
  const [com100, setCom100] = useState(String(settings.plan100WeeklyCommission));
  const [com150, setCom150] = useState(String(settings.plan150WeeklyCommission));
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setSal50(String(settings.plan50MonthlySalary));
    setSal100(String(settings.plan100MonthlySalary));
    setSal150(String(settings.plan150MonthlySalary));
    setCom50(String(settings.plan50WeeklyCommission));
    setCom100(String(settings.plan100WeeklyCommission));
    setCom150(String(settings.plan150WeeklyCommission));
  }, [settings]);

  if (!userProfile) return null;

  const handleSaveRates = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await adminSaveSettings(userProfile, {
        ...settings,
        plan50MonthlySalary: Math.max(0, Number(sal50) || 0),
        plan100MonthlySalary: Math.max(0, Number(sal100) || 0),
        plan150MonthlySalary: Math.max(0, Number(sal150) || 0),
        plan50WeeklyCommission: Math.max(0, Number(com50) || 0),
        plan100WeeklyCommission: Math.max(0, Number(com100) || 0),
        plan150WeeklyCommission: Math.max(0, Number(com150) || 0),
      });
      pushToast(
        'success',
        'Salary & Commission Rates Saved',
        'Updated rates apply from the upcoming work period; historical verified payouts remain untouched.',
      );
    } catch (err) {
      pushToast('error', 'Save Failed', err instanceof Error ? err.message : 'Unable to save.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">
          Salary &amp; Affiliate Management
        </h1>
        <p className="text-sm text-slate-600 mt-1">
          Edit Monthly Salaries and Weekly Direct Affiliate Commission rates for 50, 100, and 150
          page plans. Review referrals and inspect payout histories.
        </p>
      </div>

      {/* Quick Rate Control Card */}
      <form
        onSubmit={handleSaveRates}
        className="bg-white border border-slate-200 rounded-xl p-6 space-y-5"
      >
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="text-base font-bold text-slate-900">
              Live Salary &amp; Affiliate Commission Rates
            </h2>
            <p className="text-xs text-slate-500">
              Changes take effect on upcoming work periods only. Old verified salaries/commissions
              preserve their frozen rate snapshots.
            </p>
          </div>
          <button
            type="submit"
            disabled={saving}
            className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-violet-700 hover:bg-violet-800 disabled:opacity-50 rounded-lg"
          >
            <Save className="w-3.5 h-3.5" />
            {saving ? 'Saving Rates...' : 'Save Rates'}
          </button>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          <div className="space-y-3">
            <div className="text-xs font-bold text-slate-900">Monthly Salary Rates (₹ / month)</div>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">50 Pages</label>
                <input
                  type="number"
                  min={0}
                  value={sal50}
                  onChange={(e) => setSal50(e.target.value)}
                  className="w-full px-3 py-2 text-xs font-mono font-bold border border-slate-300 rounded-lg"
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">100 Pages</label>
                <input
                  type="number"
                  min={0}
                  value={sal100}
                  onChange={(e) => setSal100(e.target.value)}
                  className="w-full px-3 py-2 text-xs font-mono font-bold border border-slate-300 rounded-lg"
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">150 Pages</label>
                <input
                  type="number"
                  min={0}
                  value={sal150}
                  onChange={(e) => setSal150(e.target.value)}
                  className="w-full px-3 py-2 text-xs font-mono font-bold border border-slate-300 rounded-lg"
                />
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <div className="text-xs font-bold text-slate-900">
              Weekly Affiliate Commission Rates (₹ / week full plan)
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">50 Pages</label>
                <input
                  type="number"
                  min={0}
                  value={com50}
                  onChange={(e) => setCom50(e.target.value)}
                  className="w-full px-3 py-2 text-xs font-mono font-bold border border-slate-300 rounded-lg"
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">100 Pages</label>
                <input
                  type="number"
                  min={0}
                  value={com100}
                  onChange={(e) => setCom100(e.target.value)}
                  className="w-full px-3 py-2 text-xs font-mono font-bold border border-slate-300 rounded-lg"
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">150 Pages</label>
                <input
                  type="number"
                  min={0}
                  value={com150}
                  onChange={(e) => setCom150(e.target.value)}
                  className="w-full px-3 py-2 text-xs font-mono font-bold border border-slate-300 rounded-lg"
                />
              </div>
            </div>
          </div>
        </div>
      </form>

      {/* Active Pages & Pending Weekly Salary / Commission Queue */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-bold text-slate-900">
              Pending Weekly Salary &amp; Affiliate Payout Estimates ({getCurrentWeekKey()})
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Live pro-rata calculation based on each creator&apos;s currently active Facebook pages.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setAdminView('weekly-verification')}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-violet-700 hover:bg-violet-800 rounded-lg"
          >
            Open 7th-Day Verification Console
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 font-semibold text-slate-600">
                <th className="py-3 px-4">Creator</th>
                <th className="py-3 px-4">Active Plan</th>
                <th className="py-3 px-4 text-right">Active Pages</th>
                <th className="py-3 px-4 text-right">Est. Weekly Salary</th>
                <th className="py-3 px-4 text-right">Est. Weekly Affiliate</th>
                <th className="py-3 px-4">Cycle Status</th>
                <th className="py-3 px-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {data.planPurchases.filter((p) => p.paymentStatus === 'approved').length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-500">
                    No active work plans yet.
                  </td>
                </tr>
              ) : (
                data.planPurchases
                  .filter((p) => p.paymentStatus === 'approved')
                  .map((pl) => {
                    const currentWeek = getCurrentWeekKey();
                    const u = data.users.find((x) => x.uid === pl.userId);
                    const pages = data.facebookPages.filter(
                      (pg) => pg.userId === pl.userId && pg.planPurchaseId === pl.id,
                    );
                    const activeCount = pages.filter(
                      (pg) => pg.status === 'Work Active' || pg.status === 'Approved',
                    ).length;
                    const mRate =
                      pl.planPages === 50
                        ? settings.plan50MonthlySalary
                        : pl.planPages === 100
                          ? settings.plan100MonthlySalary
                          : settings.plan150MonthlySalary;
                    const cRate =
                      pl.planPages === 50
                        ? settings.plan50WeeklyCommission
                        : pl.planPages === 100
                          ? settings.plan100WeeklyCommission
                          : settings.plan150WeeklyCommission;
                    const estSal = calculateWeeklySalary(mRate, pl.planPages, activeCount);
                    const estCom = u?.referredByUid
                      ? calculateWeeklyCommission(cRate, pl.planPages, activeCount)
                      : 0;
                    const ver = data.weeklyVerifications.find(
                      (v) => v.userId === pl.userId && v.weekKey === currentWeek,
                    );
                    return (
                      <tr key={pl.id} className="hover:bg-slate-50/70">
                        <td className="py-3 px-4">
                          <div className="font-semibold text-slate-900">{pl.userName}</div>
                          <div className="font-mono text-[11px] text-slate-500">{pl.userCode}</div>
                        </td>
                        <td className="py-3 px-4 font-mono">{pl.planPages} Pages</td>
                        <td className="py-3 px-4 text-right font-mono font-semibold text-slate-900">
                          {activeCount} / {pl.planPages}
                        </td>
                        <td className="py-3 px-4 text-right font-mono tabular-nums font-bold text-violet-700">
                          {formatINR(estSal)}
                        </td>
                        <td className="py-3 px-4 text-right font-mono tabular-nums font-semibold text-emerald-700">
                          {u?.referredByUid ? formatINR(estCom) : '—'}
                        </td>
                        <td className="py-3 px-4">
                          <StatusText
                            status={
                              ver
                                ? ver.status === 'approved'
                                  ? 'Credited'
                                  : ver.status === 'rejected'
                                    ? 'Rejected'
                                    : 'Requested'
                                : 'Pending Day 7'
                            }
                          />
                        </td>
                        <td className="py-3 px-4 text-right">
                          <button
                            type="button"
                            onClick={() => setAdminView('weekly-verification')}
                            className="px-3 py-1 text-xs font-semibold text-violet-700 bg-violet-50 hover:bg-violet-100 rounded-md"
                          >
                            Audit
                          </button>
                        </td>
                      </tr>
                    );
                  })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* All Direct Referrals + Fraud Review */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200">
          <h2 className="text-base font-bold text-slate-900">
            All Direct Referrals &amp; Fraud Review ({data.affiliateReferrals.length})
          </h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 font-semibold text-slate-600">
                <th className="py-3 px-4">Referrer Code</th>
                <th className="py-3 px-4">Referred Creator</th>
                <th className="py-3 px-4">Plan / Pages</th>
                <th className="py-3 px-4 text-right">Last Wk Comm.</th>
                <th className="py-3 px-4 text-right">Total Earned</th>
                <th className="py-3 px-4">Status / Fraud Review</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {data.affiliateReferrals.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-500">
                    No referrals recorded yet.
                  </td>
                </tr>
              ) : (
                data.affiliateReferrals.map((r) => (
                  <tr key={r.id}>
                    <td className="py-3 px-4 font-mono font-bold text-violet-700">{r.referrerCode}</td>
                    <td className="py-3 px-4">
                      <div className="font-semibold text-slate-900">{r.referredName}</div>
                      <div className="font-mono text-[11px] text-slate-500">{r.referredCode}</div>
                    </td>
                    <td className="py-3 px-4 font-mono">
                      {r.referredPlanPages || 0} Plan · {r.activePagesCount || 0} Active
                    </td>
                    <td className="py-3 px-4 text-right font-mono">{formatINR(r.lastWeekCommission || 0)}</td>
                    <td className="py-3 px-4 text-right font-mono font-bold text-emerald-700">
                      {formatINR(r.totalCommissionEarned || 0)}
                    </td>
                    <td className="py-3 px-4">
                      <select
                        value={r.status}
                        onChange={async (e) => {
                          await adminUpdateReferralStatus(
                            userProfile,
                            r.id,
                            e.target.value as 'pending' | 'active' | 'inactive' | 'flagged',
                          );
                          pushToast('success', 'Referral Status Updated', `Marked as ${e.target.value}.`);
                        }}
                        className="px-2.5 py-1 text-xs font-semibold bg-white border border-slate-300 rounded-md"
                      >
                        <option value="pending">Pending</option>
                        <option value="active">Active</option>
                        <option value="inactive">Inactive</option>
                        <option value="flagged">Flagged (Fraud Review)</option>
                      </select>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Salary & Commission Credit Histories */}
      <div className="grid lg:grid-cols-2 gap-6">
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-200">
            <h2 className="text-sm font-bold text-slate-900">
              Salary Credit History ({data.weeklySalaries.length})
            </h2>
          </div>
          <div className="overflow-x-auto max-h-72 overflow-y-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 font-semibold text-slate-600">
                  <th className="py-2.5 px-3">Week</th>
                  <th className="py-2.5 px-3">Creator</th>
                  <th className="py-2.5 px-3 text-right">Pages</th>
                  <th className="py-2.5 px-3 text-right">Credited</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {data.weeklySalaries.map((s) => (
                  <tr key={s.id}>
                    <td className="py-2.5 px-3 font-mono">{s.weekKey}</td>
                    <td className="py-2.5 px-3">{s.userName || s.userCode}</td>
                    <td className="py-2.5 px-3 text-right font-mono">
                      {s.verifiedActivePages}/{s.planPages}
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono font-bold text-emerald-700">
                      {formatINR(s.amount)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-200">
            <h2 className="text-sm font-bold text-slate-900">
              Affiliate Commission History ({data.weeklyCommissions.length})
            </h2>
          </div>
          <div className="overflow-x-auto max-h-72 overflow-y-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 font-semibold text-slate-600">
                  <th className="py-2.5 px-3">Week</th>
                  <th className="py-2.5 px-3">From Referred</th>
                  <th className="py-2.5 px-3 text-right">Pages</th>
                  <th className="py-2.5 px-3 text-right">Credited</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {data.weeklyCommissions.map((c) => (
                  <tr key={c.id}>
                    <td className="py-2.5 px-3 font-mono">{c.weekKey}</td>
                    <td className="py-2.5 px-3">{c.referredName || c.referredUid.slice(0, 8)}</td>
                    <td className="py-2.5 px-3 text-right font-mono">
                      {c.verifiedActivePages}/{c.planPages}
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono font-bold text-violet-700">
                      {formatINR(c.amount)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

// ==================== 6. WALLET, BANK/UPI & WITHDRAWALS ====================
export function AdminWalletPayoutsTab({ data }: { data: AdminDataset }) {
  const { userProfile, pushToast } = useApp();
  const [utrInputs, setUtrInputs] = useState<Record<string, string>>({});
  const [noteInputs, setNoteInputs] = useState<Record<string, string>>({});
  const [statusSelections, setStatusSelections] = useState<Record<string, WithdrawalStatus>>({});

  // Manual wallet adjustment form
  const [adjUserId, setAdjUserId] = useState('');
  const [adjDir, setAdjDir] = useState<'credit' | 'debit'>('credit');
  const [adjAmount, setAdjAmount] = useState('');
  const [adjDesc, setAdjDesc] = useState('');
  const [adjusting, setAdjusting] = useState(false);

  // Transaction history filter
  const [txnFilter, setTxnFilter] = useState<'ALL' | WalletTransactionType>('ALL');

  if (!userProfile) return null;

  const walletMap = new Map(data.wallets.map((w) => [w.userId, w]));
  const methodMap = new Map(data.paymentMethods.map((m) => [m.userId, m]));
  const userMap = new Map(data.users.map((u) => [u.uid, u]));
  const filteredTransactions =
    txnFilter === 'ALL'
      ? data.walletTransactions
      : data.walletTransactions.filter((t) => t.type === txnFilter);

  const handleAdjust = async (e: React.FormEvent) => {
    e.preventDefault();
    const target = data.users.find((u) => u.uid === adjUserId);
    if (!target) return;
    setAdjusting(true);
    try {
      await adminAdjustUserWallet(userProfile, target, adjDir, Number(adjAmount), adjDesc);
      setAdjAmount('');
      setAdjDesc('');
      pushToast('success', 'Wallet Adjusted', `${target.fullName} wallet updated.`);
    } catch (err) {
      pushToast('error', 'Failed', err instanceof Error ? err.message : 'Unable to adjust.');
    } finally {
      setAdjusting(false);
    }
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">
          Wallet, Bank/UPI &amp; Withdrawal Management
        </h1>
        <p className="text-sm text-slate-600 mt-1">
          Review withdrawal requests, enter Bank/UPI Payment Reference Numbers, inspect user banking
          details, and perform audited manual adjustments.
        </p>
      </div>

      {/* Withdrawal Requests Processing Queue */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200">
          <h2 className="text-base font-bold text-slate-900">
            Withdrawal Requests ({data.withdrawalRequests.length})
          </h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 font-semibold text-slate-600">
                <th className="py-3 px-4">Request / User</th>
                <th className="py-3 px-4">Payout Bank / UPI Details</th>
                <th className="py-3 px-4 text-right">Amount</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">Process Payout &amp; UTR Reference</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {data.withdrawalRequests.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-slate-500">
                    No withdrawal requests submitted yet.
                  </td>
                </tr>
              ) : (
                data.withdrawalRequests.map((w) => {
                  const finalized = w.status === 'Paid' || w.status === 'Rejected';
                  const chosenStatus = statusSelections[w.id] || w.status;
                  return (
                    <tr key={w.id} className="hover:bg-slate-50/70">
                      <td className="py-3 px-4">
                        <div className="font-mono font-bold text-slate-900">{w.requestCode}</div>
                        <div className="text-slate-700">
                          {w.userName} ({w.userCode})
                        </div>
                        <div className="text-[10px] text-slate-400">
                          {formatTimestamp(w.createdAt)}
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        {w.methodType === 'bank' ? (
                          <div className="space-y-0.5">
                            <div className="font-semibold text-slate-900">
                              {w.accountHolderName} · {w.bankName}
                            </div>
                            <div className="font-mono text-slate-600">
                              A/C: {w.accountNumber} · IFSC: {w.ifscCode}
                            </div>
                          </div>
                        ) : (
                          <div className="space-y-0.5">
                            <div className="font-semibold text-slate-900">{w.accountHolderName}</div>
                            <div className="font-mono text-violet-700">UPI: {w.upiId}</div>
                          </div>
                        )}
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-bold text-slate-900">
                        {formatINR(w.amount)}
                      </td>
                      <td className="py-3 px-4">
                        <StatusText status={w.status} />
                        {w.utrReference ? (
                          <div className="font-mono text-[11px] text-slate-600 mt-0.5">
                            UTR: {w.utrReference}
                          </div>
                        ) : null}
                      </td>
                      <td className="py-3 px-4">
                        {finalized ? (
                          <span className="text-slate-500">{w.adminNote || 'Finalized'}</span>
                        ) : (
                          <div className="flex flex-wrap items-center gap-2">
                            <select
                              value={chosenStatus}
                              onChange={(e) =>
                                setStatusSelections((prev) => ({
                                  ...prev,
                                  [w.id]: e.target.value as WithdrawalStatus,
                                }))
                              }
                              className="px-2 py-1.5 text-xs bg-white border border-slate-300 rounded-md"
                            >
                              {WITHDRAWAL_STATUSES.map((st) => (
                                <option key={st} value={st}>
                                  {st}
                                </option>
                              ))}
                            </select>
                            <input
                              type="text"
                              value={utrInputs[w.id] ?? w.utrReference ?? ''}
                              onChange={(e) =>
                                setUtrInputs((prev) => ({ ...prev, [w.id]: e.target.value }))
                              }
                              placeholder="Payment UTR Ref"
                              className="px-2 py-1.5 text-xs font-mono border border-slate-300 rounded-md w-36"
                            />
                            <input
                              type="text"
                              value={noteInputs[w.id] ?? w.adminNote ?? ''}
                              onChange={(e) =>
                                setNoteInputs((prev) => ({ ...prev, [w.id]: e.target.value }))
                              }
                              placeholder="Admin note"
                              className="px-2 py-1.5 text-xs border border-slate-300 rounded-md w-32"
                            />
                            <button
                              type="button"
                              onClick={async () => {
                                await adminProcessWithdrawal(
                                  userProfile,
                                  w,
                                  chosenStatus,
                                  utrInputs[w.id] ?? w.utrReference ?? '',
                                  noteInputs[w.id] ?? w.adminNote ?? '',
                                );
                                pushToast(
                                  'success',
                                  `Withdrawal ${chosenStatus}`,
                                  `${w.requestCode} updated.`,
                                );
                              }}
                              className="px-3 py-1.5 text-xs font-semibold text-white bg-violet-700 hover:bg-violet-800 rounded-md"
                            >
                              Update
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* All Users Wallets & Banking Details + Manual Adjustment */}
      <div className="grid lg:grid-cols-12 gap-6">
        <div className="lg:col-span-8 bg-white border border-slate-200 rounded-xl overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-200">
            <h2 className="text-base font-bold text-slate-900">
              All User Wallets &amp; Saved Bank / UPI Directory
            </h2>
          </div>
          <div className="overflow-x-auto max-h-96 overflow-y-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 font-semibold text-slate-600">
                  <th className="py-3 px-4">User</th>
                  <th className="py-3 px-4 text-right">Available</th>
                  <th className="py-3 px-4 text-right">Reserved</th>
                  <th className="py-3 px-4 text-right">Withdrawn</th>
                  <th className="py-3 px-4">Saved Bank / UPI</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {data.users.map((u) => {
                  const w = walletMap.get(u.uid);
                  const pm = methodMap.get(u.uid);
                  return (
                    <tr key={u.uid}>
                      <td className="py-3 px-4">
                        <div className="font-semibold text-slate-900">{u.fullName}</div>
                        <div className="font-mono text-[11px] text-slate-500">{u.userCode}</div>
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-bold text-violet-700">
                        {formatINR(w?.availableBalance || 0)}
                      </td>
                      <td className="py-3 px-4 text-right font-mono text-amber-700">
                        {formatINR(w?.reservedBalance || 0)}
                      </td>
                      <td className="py-3 px-4 text-right font-mono text-slate-700">
                        {formatINR(w?.totalWithdrawn || 0)}
                      </td>
                      <td className="py-3 px-4 text-[11px] text-slate-600">
                        {pm?.upiId ? <div className="font-mono">UPI: {pm.upiId}</div> : null}
                        {pm?.accountNumber ? (
                          <div className="font-mono">
                            {pm.bankName} · {pm.accountNumber} ({pm.ifscCode})
                          </div>
                        ) : null}
                        {!pm?.upiId && !pm?.accountNumber ? (
                          <span className="text-slate-400">Not added</span>
                        ) : null}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        <form
          onSubmit={handleAdjust}
          className="lg:col-span-4 bg-white border border-slate-200 rounded-xl p-6 space-y-4"
        >
          <h2 className="text-base font-bold text-slate-900">Admin Wallet Adjustment</h2>
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Select User</label>
            <select
              required
              value={adjUserId}
              onChange={(e) => setAdjUserId(e.target.value)}
              className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-lg"
            >
              <option value="">-- Select creator --</option>
              {data.users.map((u) => (
                <option key={u.uid} value={u.uid}>
                  {u.userCode} — {u.fullName}
                </option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Direction</label>
              <select
                value={adjDir}
                onChange={(e) => setAdjDir(e.target.value as 'credit' | 'debit')}
                className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-lg"
              >
                <option value="credit">Credit (+)</option>
                <option value="debit">Debit (-)</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Amount (₹)</label>
              <input
                type="number"
                min={1}
                step="0.01"
                required
                value={adjAmount}
                onChange={(e) => setAdjAmount(e.target.value)}
                className="w-full px-3 py-2 text-xs font-mono border border-slate-300 rounded-lg"
              />
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Reason / Description</label>
            <input
              type="text"
              required
              value={adjDesc}
              onChange={(e) => setAdjDesc(e.target.value)}
              placeholder="Bonus / correction / manual settlement"
              className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg"
            />
          </div>
          <button
            type="submit"
            disabled={adjusting}
            className="w-full py-2.5 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 disabled:opacity-50 rounded-lg"
          >
            {adjusting ? 'Applying Adjustment...' : 'Apply Wallet Adjustment'}
          </button>
        </form>
      </div>

      {/* Complete Platform Payment & Wallet Transaction History */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-base font-bold text-slate-900">
            Complete Platform Wallet &amp; Payment Transaction History ({filteredTransactions.length})
          </h2>
          <select
            value={txnFilter}
            onChange={(e) => setTxnFilter(e.target.value as 'ALL' | WalletTransactionType)}
            className="px-3 py-1.5 text-xs bg-white border border-slate-300 rounded-lg"
          >
            <option value="ALL">All Transaction Types</option>
            <option value="Weekly Salary Credit">Weekly Salary Credit</option>
            <option value="Monthly Salary">Monthly Salary</option>
            <option value="Affiliate Commission">Affiliate Commission</option>
            <option value="Withdrawal">Withdrawal</option>
            <option value="Refund">Refund</option>
            <option value="Admin Adjustment">Admin Adjustment</option>
          </select>
        </div>
        <div className="overflow-x-auto max-h-96 overflow-y-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 font-semibold text-slate-600">
                <th className="py-3 px-4">Transaction ID</th>
                <th className="py-3 px-4">Date</th>
                <th className="py-3 px-4">Creator</th>
                <th className="py-3 px-4">Type</th>
                <th className="py-3 px-4">Description</th>
                <th className="py-3 px-4 text-right">Amount</th>
                <th className="py-3 px-4">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredTransactions.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-500">
                    No wallet transactions found for this filter.
                  </td>
                </tr>
              ) : (
                filteredTransactions.slice(0, 100).map((t) => {
                  const u = userMap.get(t.userId);
                  return (
                    <tr key={t.id} className="hover:bg-slate-50/70">
                      <td className="py-3 px-4 font-mono font-semibold text-slate-900">{t.txnCode}</td>
                      <td className="py-3 px-4 text-slate-500 whitespace-nowrap">
                        {formatTimestamp(t.createdAt)}
                      </td>
                      <td className="py-3 px-4">
                        <div className="font-semibold text-slate-900">{u?.fullName || 'Creator'}</div>
                        <div className="font-mono text-[11px] text-slate-500">
                          {u?.userCode || t.userId.slice(0, 8)}
                        </div>
                      </td>
                      <td className="py-3 px-4 font-semibold text-slate-800">{t.type}</td>
                      <td className="py-3 px-4 text-slate-600 max-w-md">{t.description}</td>
                      <td
                        className={`py-3 px-4 text-right font-mono tabular-nums font-bold ${
                          t.direction === 'credit' ? 'text-emerald-700' : 'text-rose-700'
                        }`}
                      >
                        {t.direction === 'credit' ? '+' : '-'}
                        {formatINR(t.amount)}
                      </td>
                      <td className="py-3 px-4">
                        <StatusText status={t.status} />
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ==================== 7. COMPLETE 17-PARAMETER SETTINGS & UPI QR CODE MANAGER ====================
export function AdminSettingsTab() {
  const { userProfile, settings, pushToast } = useApp();
  const [draft, setDraft] = useState<AdminSettings>(settings);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setDraft(settings);
  }, [settings]);

  if (!userProfile) return null;

  const handleQrUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const dataUrl = await compressImageToDataUrl(file, 720, 0.85);
      setDraft((prev) => ({ ...prev, paymentQrImageUrl: dataUrl }));
      pushToast('info', 'QR Code Uploaded', 'Click Save All Settings to make this QR live for users.');
    } catch (err) {
      pushToast('error', 'Upload Failed', err instanceof Error ? err.message : 'Invalid image.');
    }
  };

  const handleTrainingThumbUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const dataUrl = await compressImageToDataUrl(file, 960, 0.78);
      setDraft((prev) => ({ ...prev, trainingThumbnailUrl: dataUrl }));
      pushToast('info', 'Training Thumbnail Ready', 'Click Save All Settings to publish.');
    } catch (err) {
      pushToast('error', 'Upload Failed', err instanceof Error ? err.message : 'Invalid image.');
    }
  };

  const handleSaveAll = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await adminSaveSettings(userProfile, draft);
      pushToast(
        'success',
        'All Platform Settings Saved',
        'QR Code, Prices, Salaries, Commissions, and Payout rules are live immediately.',
      );
    } catch (err) {
      pushToast('error', 'Save Failed', err instanceof Error ? err.message : 'Unable to save.');
    } finally {
      setSaving(false);
    }
  };

  const setNum = (key: keyof AdminSettings, val: string) => {
    setDraft((prev) => ({ ...prev, [key]: Math.max(0, Number(val) || 0) }));
  };

  return (
    <form onSubmit={handleSaveAll} className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Plan, Price, Commission &amp; Payment QR Settings
          </h1>
          <p className="text-sm text-slate-600 mt-1">
            Control all 17 platform parameters and your live UPI Payment QR Code without developer
            assistance. New rates apply to upcoming work periods while protecting past payouts.
          </p>
        </div>
        <button
          type="submit"
          disabled={saving}
          className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-semibold text-white bg-violet-700 hover:bg-violet-800 disabled:opacity-50 rounded-lg whitespace-nowrap"
        >
          <Save className="w-4 h-4" />
          {saving ? 'Saving Settings...' : 'Save All Settings'}
        </button>
      </div>

      {/* UPI Payment QR Code Manager (Directly requested by user) */}
      <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-5">
        <div className="flex items-center gap-2 text-base font-bold text-slate-900">
          <QrCode className="w-5 h-5 text-violet-700" />
          <span>Official UPI Payment QR Code &amp; Receiving Details</span>
        </div>
        <div className="grid lg:grid-cols-12 gap-6 items-start">
          <div className="lg:col-span-4 flex flex-col items-center gap-3 bg-slate-50 border border-slate-200 rounded-xl p-5">
            {draft.paymentQrImageUrl ? (
              <img
                src={draft.paymentQrImageUrl}
                alt="Custom Admin UPI QR Code"
                referrerPolicy="no-referrer"
                className="w-52 h-52 object-contain bg-white rounded-lg border border-slate-200 p-2"
              />
            ) : (
              <DefaultPaymentQrSvg className="w-52 h-52" />
            )}
            <div className="flex flex-wrap items-center justify-center gap-2">
              <label className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-violet-700 hover:bg-violet-800 rounded-lg cursor-pointer">
                <Upload className="w-3.5 h-3.5" />
                Upload / Change QR Image
                <input type="file" accept="image/*" onChange={handleQrUpload} className="hidden" />
              </label>
              {draft.paymentQrImageUrl ? (
                <button
                  type="button"
                  onClick={() => setDraft((p) => ({ ...p, paymentQrImageUrl: '' }))}
                  className="text-xs font-medium text-slate-600 hover:text-rose-700 underline"
                >
                  Use Placeholder QR
                </button>
              ) : null}
            </div>
          </div>

          <div className="lg:col-span-8 space-y-4">
            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Receiving UPI ID
                </label>
                <input
                  type="text"
                  value={draft.paymentUpiId}
                  onChange={(e) => setDraft((p) => ({ ...p, paymentUpiId: e.target.value }))}
                  placeholder="yourbusiness@okaxis"
                  className="w-full px-3 py-2 text-xs font-mono bg-white border border-slate-300 rounded-lg"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Merchant / Payee Display Name
                </label>
                <input
                  type="text"
                  value={draft.paymentMerchantName}
                  onChange={(e) => setDraft((p) => ({ ...p, paymentMerchantName: e.target.value }))}
                  className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-lg"
                />
              </div>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                QR Payment Instructions Shown to Users
              </label>
              <textarea
                rows={3}
                value={draft.paymentInstructions}
                onChange={(e) => setDraft((p) => ({ ...p, paymentInstructions: e.target.value }))}
                className="w-full p-3 text-xs bg-white border border-slate-300 rounded-lg"
              />
            </div>
          </div>
        </div>
      </div>

      {/* All 17 Configurable Parameters Grid */}
      <div className="grid lg:grid-cols-2 gap-6">
        <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-4">
          <h2 className="text-base font-bold text-slate-900">
            1. Training Price, Thumbnail, Description &amp; Work Plan Prices
          </h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Training Price (₹)</label>
              <input
                type="number"
                min={0}
                value={draft.trainingPrice}
                onChange={(e) => setNum('trainingPrice', e.target.value)}
                className="w-full px-3 py-2 text-xs font-mono font-bold border border-slate-300 rounded-lg"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">50 Pages Plan Price (₹)</label>
              <input
                type="number"
                min={0}
                value={draft.plan50Price}
                onChange={(e) => setNum('plan50Price', e.target.value)}
                className="w-full px-3 py-2 text-xs font-mono font-bold border border-slate-300 rounded-lg"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">100 Pages Plan Price (₹)</label>
              <input
                type="number"
                min={0}
                value={draft.plan100Price}
                onChange={(e) => setNum('plan100Price', e.target.value)}
                className="w-full px-3 py-2 text-xs font-mono font-bold border border-slate-300 rounded-lg"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">150 Pages Plan Price (₹)</label>
              <input
                type="number"
                min={0}
                value={draft.plan150Price}
                onChange={(e) => setNum('plan150Price', e.target.value)}
                className="w-full px-3 py-2 text-xs font-mono font-bold border border-slate-300 rounded-lg"
              />
            </div>
          </div>

          {/* Training Thumbnail & Description inside Settings (Items #2 & #3 of 17) */}
          <div className="grid sm:grid-cols-12 gap-4 pt-3 border-t border-slate-100 items-start">
            <div className="sm:col-span-5 space-y-2">
              <label className="block text-xs font-semibold text-slate-700">Training Thumbnail</label>
              <div className="aspect-video rounded-lg overflow-hidden border border-slate-200 bg-slate-100">
                <img
                  src={draft.trainingThumbnailUrl || DEFAULT_TRAINING_BANNER}
                  alt="Training thumbnail preview"
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-cover"
                />
              </div>
              <label className="inline-flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-semibold text-slate-700 bg-slate-50 border border-slate-300 hover:bg-slate-100 rounded-lg cursor-pointer">
                <Upload className="w-3 h-3" />
                Change Thumbnail
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleTrainingThumbUpload}
                  className="hidden"
                />
              </label>
            </div>
            <div className="sm:col-span-7 space-y-2">
              <label className="block text-xs font-semibold text-slate-700">Training Description</label>
              <textarea
                rows={4}
                value={draft.trainingDescription}
                onChange={(e) => setDraft((p) => ({ ...p, trainingDescription: e.target.value }))}
                className="w-full p-2.5 text-xs bg-white border border-slate-300 rounded-lg"
              />
            </div>
          </div>

          <h2 className="text-base font-bold text-slate-900 pt-3 border-t border-slate-100">
            2. Monthly Salary Rates (₹ / Month)
          </h2>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">50 Pages</label>
              <input
                type="number"
                min={0}
                value={draft.plan50MonthlySalary}
                onChange={(e) => setNum('plan50MonthlySalary', e.target.value)}
                className="w-full px-3 py-2 text-xs font-mono font-bold border border-slate-300 rounded-lg"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">100 Pages</label>
              <input
                type="number"
                min={0}
                value={draft.plan100MonthlySalary}
                onChange={(e) => setNum('plan100MonthlySalary', e.target.value)}
                className="w-full px-3 py-2 text-xs font-mono font-bold border border-slate-300 rounded-lg"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">150 Pages</label>
              <input
                type="number"
                min={0}
                value={draft.plan150MonthlySalary}
                onChange={(e) => setNum('plan150MonthlySalary', e.target.value)}
                className="w-full px-3 py-2 text-xs font-mono font-bold border border-slate-300 rounded-lg"
              />
            </div>
          </div>

          <h2 className="text-base font-bold text-slate-900 pt-3 border-t border-slate-100">
            3. Weekly Affiliate Commissions (₹ / Week)
          </h2>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">50 Pages</label>
              <input
                type="number"
                min={0}
                value={draft.plan50WeeklyCommission}
                onChange={(e) => setNum('plan50WeeklyCommission', e.target.value)}
                className="w-full px-3 py-2 text-xs font-mono font-bold border border-slate-300 rounded-lg"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">100 Pages</label>
              <input
                type="number"
                min={0}
                value={draft.plan100WeeklyCommission}
                onChange={(e) => setNum('plan100WeeklyCommission', e.target.value)}
                className="w-full px-3 py-2 text-xs font-mono font-bold border border-slate-300 rounded-lg"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">150 Pages</label>
              <input
                type="number"
                min={0}
                value={draft.plan150WeeklyCommission}
                onChange={(e) => setNum('plan150WeeklyCommission', e.target.value)}
                className="w-full px-3 py-2 text-xs font-mono font-bold border border-slate-300 rounded-lg"
              />
            </div>
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-4">
          <h2 className="text-base font-bold text-slate-900">
            4. Payout Schedule, Limits &amp; Global Work Guidelines
          </h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Minimum Withdrawal Limit (₹)
              </label>
              <input
                type="number"
                min={0}
                value={draft.minWithdrawalLimit}
                onChange={(e) => setNum('minWithdrawalLimit', e.target.value)}
                className="w-full px-3 py-2 text-xs font-mono font-bold border border-slate-300 rounded-lg"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Work Cycle Duration (Days)
              </label>
              <input
                type="number"
                min={1}
                max={31}
                value={draft.workDurationDays}
                onChange={(e) => setNum('workDurationDays', e.target.value)}
                className="w-full px-3 py-2 text-xs font-mono font-bold border border-slate-300 rounded-lg"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Weekly Payout Day
              </label>
              <select
                value={draft.weeklyPayoutDay}
                onChange={(e) => setDraft((p) => ({ ...p, weeklyPayoutDay: e.target.value }))}
                className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-lg"
              >
                {['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'].map(
                  (d) => (
                    <option key={d} value={d}>
                      {d}
                    </option>
                  ),
                )}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Weekly Payout Time Window
              </label>
              <input
                type="text"
                value={draft.weeklyPayoutTime}
                onChange={(e) => setDraft((p) => ({ ...p, weeklyPayoutTime: e.target.value }))}
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Global Work Instructions &amp; Rules
            </label>
            <textarea
              rows={7}
              value={draft.workInstructionsGlobal}
              onChange={(e) =>
                setDraft((p) => ({ ...p, workInstructionsGlobal: e.target.value }))
              }
              className="w-full p-3 text-xs bg-white border border-slate-300 rounded-lg"
            />
          </div>
        </div>
      </div>
    </form>
  );
}

// ==================== 8. SUPPORT TICKETS CONSOLE ====================
export function AdminSupportTab({ data }: { data: AdminDataset }) {
  const { userProfile, pushToast } = useApp();
  const [replies, setReplies] = useState<Record<string, string>>({});

  if (!userProfile) return null;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">Support Tickets</h1>
        <p className="text-sm text-slate-600 mt-1">
          Respond to user inquiries regarding training verification, page approvals, and payouts.
        </p>
      </div>

      <div className="bg-white border border-slate-200 rounded-xl divide-y divide-slate-100">
        {data.supportTickets.length === 0 ? (
          <div className="p-8 text-center text-xs text-slate-500">No support tickets yet.</div>
        ) : (
          data.supportTickets.map((t) => (
            <div key={t.id} className="p-5 space-y-3">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="text-sm font-bold text-slate-900">{t.subject}</div>
                  <div className="text-xs text-slate-500">
                    {t.userName} ({t.userCode}) · {t.category} · {formatTimestamp(t.createdAt)}
                  </div>
                </div>
                <StatusText status={t.status} />
              </div>
              <p className="text-xs text-slate-700 leading-relaxed">{t.message}</p>
              <div className="flex flex-col sm:flex-row gap-2">
                <input
                  type="text"
                  value={replies[t.id] ?? t.adminReply ?? ''}
                  onChange={(e) => setReplies((prev) => ({ ...prev, [t.id]: e.target.value }))}
                  placeholder="Write admin reply..."
                  className="flex-1 px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-lg"
                />
                <button
                  type="button"
                  onClick={async () => {
                    await adminReplySupportTicket(
                      userProfile,
                      t.id,
                      replies[t.id] ?? t.adminReply ?? '',
                      'Replied',
                    );
                    pushToast('success', 'Reply Sent', `Updated ticket for ${t.userName}.`);
                  }}
                  className="px-4 py-2 text-xs font-semibold text-white bg-violet-700 hover:bg-violet-800 rounded-lg whitespace-nowrap"
                >
                  Send Reply
                </button>
                <button
                  type="button"
                  onClick={async () => {
                    await adminReplySupportTicket(
                      userProfile,
                      t.id,
                      replies[t.id] ?? t.adminReply ?? 'Resolved',
                      'Closed',
                    );
                    pushToast('info', 'Ticket Closed', 'Marked closed.');
                  }}
                  className="px-4 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg whitespace-nowrap"
                >
                  Close
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

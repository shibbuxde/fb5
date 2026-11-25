import React, { useState } from 'react';
import { CalendarClock, CheckCircle2, Send } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { requestWeeklyVerification } from '../../lib/firestoreService';
import {
  calculateWeeklySalary,
  formatINR,
  formatTimestamp,
  getCurrentWeekKey,
} from '../../lib/utils';
import { EmptyState, MetricCell, StatusText } from '../CommonUI';

export function EarningsSalaryPayoutView({
  mode,
}: {
  mode: 'earnings' | 'monthly-salary' | 'weekly-payout';
}) {
  const {
    userProfile,
    settings,
    wallet,
    planPurchases,
    myPages,
    myVerifications,
    mySalaries,
    myCommissions,
    pushToast,
    setUserView,
  } = useApp();

  const [calcPlan, setCalcPlan] = useState<50 | 100 | 150>(100);
  const [calcVerified, setCalcVerified] = useState(90);
  const [requestingVer, setRequestingVer] = useState(false);

  if (!userProfile) return null;

  const activePlan =
    planPurchases.find((p) => p.id === userProfile.activePlanPurchaseId) ||
    planPurchases.find((p) => p.paymentStatus === 'approved') ||
    null;

  const currentWeekKey = getCurrentWeekKey();
  const planPagesList = activePlan
    ? myPages.filter((p) => p.planPurchaseId === activePlan.id)
    : [];
  const activePagesNow = planPagesList.filter(
    (p) => p.status === 'Work Active' || p.status === 'Approved',
  ).length;

  const currentWeekVerification = myVerifications.find((v) => v.weekKey === currentWeekKey);

  const calcMonthly =
    calcPlan === 50
      ? settings.plan50MonthlySalary
      : calcPlan === 100
        ? settings.plan100MonthlySalary
        : settings.plan150MonthlySalary;
  const calcWeeklyResult = calculateWeeklySalary(
    calcMonthly,
    calcPlan,
    Math.min(calcVerified, calcPlan),
  );

  const handleRequestVerification = async () => {
    if (!activePlan) {
      pushToast('error', 'No Active Plan', 'Activate a work plan and upload pages first.');
      return;
    }
    setRequestingVer(true);
    try {
      await requestWeeklyVerification(
        userProfile,
        activePlan,
        settings,
        planPagesList.length,
        currentWeekKey,
      );
      pushToast(
        'success',
        'Weekly Verification Requested',
        `Your 7-day verification request for ${currentWeekKey} has been sent to Admin.`,
      );
    } catch (err) {
      pushToast(
        'error',
        'Request Blocked',
        err instanceof Error ? err.message : 'Unable to submit verification request.',
      );
    } finally {
      setRequestingVer(false);
    }
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">
          {mode === 'earnings'
            ? 'My Earnings Summary'
            : mode === 'monthly-salary'
              ? 'Monthly Salary Structure & History'
              : 'Weekly Verification & Payout Cycle'}
        </h1>
        <p className="text-sm text-slate-600 mt-1">
          Zero daily wallet credits. Earnings are verified once every {settings.workDurationDays}{' '}
          days after Admin audits full 7-day page activity and work proofs.
        </p>
      </div>

      {/* Financial Summary Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <MetricCell
          label="Total Salary Income"
          value={formatINR(wallet.totalSalaryIncome)}
          subtext={`${mySalaries.length} verified weekly salary credits`}
          accent
        />
        <MetricCell
          label="Total Affiliate Income"
          value={formatINR(wallet.totalAffiliateIncome)}
          subtext={`${myCommissions.length} direct commission credits`}
        />
        <MetricCell
          label="Available Wallet Balance"
          value={formatINR(wallet.availableBalance)}
          subtext={`Withdrawn: ${formatINR(wallet.totalWithdrawn)}`}
        />
        <MetricCell
          label="Lifetime Verified Earnings"
          value={formatINR(wallet.lifetimeEarnings)}
          subtext={`Payout Day: ${settings.weeklyPayoutDay}`}
        />
      </div>

      {/* 7-Day Cycle & Day 8 Verification Request Panel */}
      <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-5">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-xs font-semibold text-violet-700">
              <CalendarClock className="w-4 h-4" />
              <span>Active Cycle: {currentWeekKey}</span>
              <span aria-hidden="true">·</span>
              <span>
                Payout Window: {settings.weeklyPayoutDay} ({settings.weeklyPayoutTime})
              </span>
            </div>
            <h2 className="text-lg font-bold text-slate-900">
              Day 1–7 Work Cycle &amp; Day 8 Verification Request
            </h2>
            <p className="text-xs text-slate-600 leading-relaxed max-w-2xl">
              Complete daily video uploads on Days 1–7. At the end of the 7-day period, submit your
              Weekly Verification request so Admin can verify all active pages and credit your
              Weekly Salary (and referrer&apos;s Affiliate Commission) directly into your Available
              Wallet.
            </p>
          </div>

          <div className="shrink-0">
            {currentWeekVerification ? (
              <div className="bg-slate-50 border border-slate-200 rounded-lg px-4 py-3 text-right">
                <div className="text-[11px] text-slate-500">Week {currentWeekKey} Status</div>
                <div className="mt-1">
                  <StatusText status={currentWeekVerification.status} />
                </div>
              </div>
            ) : (
              <button
                type="button"
                disabled={requestingVer || !activePlan}
                onClick={handleRequestVerification}
                className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-semibold text-white bg-violet-700 hover:bg-violet-800 disabled:opacity-50 rounded-lg transition-colors whitespace-nowrap"
              >
                <Send className="w-4 h-4" />
                {requestingVer
                  ? 'Submitting Request...'
                  : `Request Week ${currentWeekKey} Audit`}
              </button>
            )}
          </div>
        </div>

        <div className="grid sm:grid-cols-3 gap-4 pt-2 border-t border-slate-100 text-xs">
          <div className="bg-slate-50 border border-slate-200 rounded-lg p-4">
            <div className="font-bold text-slate-900 mb-1">1. Days 1–7 Daily Work</div>
            <p className="text-slate-600">
              Follow Admin&apos;s daily video instructions on all approved pages. No daily amounts
              are added to Wallet during the week.
            </p>
          </div>
          <div className="bg-slate-50 border border-slate-200 rounded-lg p-4">
            <div className="font-bold text-slate-900 mb-1">2. Day 7–8 Manual Audit</div>
            <p className="text-slate-600">
              Admin inspects 7-day work records per page and approves only verified active pages (
              {activePagesNow} currently active).
            </p>
          </div>
          <div className="bg-slate-50 border border-slate-200 rounded-lg p-4">
            <div className="font-bold text-slate-900 mb-1">3. Wallet Credit &amp; Withdrawal</div>
            <p className="text-slate-600">
              Verified earnings credit to Available Balance. Withdraw via Bank/UPI (min{' '}
              {formatINR(settings.minWithdrawalLimit)}) or keep safely saved for next week.
            </p>
          </div>
        </div>
      </div>

      {/* Monthly Salary Structure + Interactive Formula Calculator */}
      <div className="grid lg:grid-cols-12 gap-6">
        <div className="lg:col-span-7 bg-white border border-slate-200 rounded-xl p-6 space-y-4">
          <h2 className="text-base font-bold text-slate-900">Current Monthly Salary Rates</h2>
          <p className="text-xs text-slate-600">
            Weekly payout formula:{' '}
            <span className="font-mono font-semibold text-slate-900">
              Monthly Salary ÷ Total Plan Pages × Verified Active Pages × 12 ÷ 52
            </span>
          </p>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 border-y border-slate-200 font-semibold text-slate-600">
                  <th className="py-2.5 px-3">Work Plan</th>
                  <th className="py-2.5 px-3 text-right">Full Active Pages</th>
                  <th className="py-2.5 px-3 text-right">Monthly Salary</th>
                  <th className="py-2.5 px-3 text-right">Full Weekly Equivalent</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {[
                  { pages: 50, monthly: settings.plan50MonthlySalary },
                  { pages: 100, monthly: settings.plan100MonthlySalary },
                  { pages: 150, monthly: settings.plan150MonthlySalary },
                ].map((r) => (
                  <tr key={r.pages}>
                    <td className="py-3 px-3 font-semibold text-slate-900">{r.pages} Pages Work</td>
                    <td className="py-3 px-3 text-right font-mono tabular-nums">{r.pages}</td>
                    <td className="py-3 px-3 text-right font-mono tabular-nums font-bold text-slate-900">
                      {formatINR(r.monthly)}
                    </td>
                    <td className="py-3 px-3 text-right font-mono tabular-nums font-semibold text-violet-700">
                      {formatINR(calculateWeeklySalary(r.monthly, r.pages, r.pages))}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="text-[11px] text-slate-500 flex items-center gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
            <span>
              Previous verified weekly salaries remain permanently protected even if rates change
              later or pages are deactivated in future weeks.
            </span>
          </div>
        </div>

        <div className="lg:col-span-5 bg-white border border-slate-200 rounded-xl p-6 space-y-4">
          <h2 className="text-base font-bold text-slate-900">Weekly Salary Formula Calculator</h2>
          <div className="grid grid-cols-3 gap-1.5 p-1 bg-slate-100 rounded-lg">
            {([50, 100, 150] as const).map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => {
                  setCalcPlan(p);
                  setCalcVerified(Math.min(calcVerified, p));
                }}
                className={`py-1.5 text-xs font-semibold rounded-md transition-colors ${
                  calcPlan === p ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600'
                }`}
              >
                {p} Pages
              </button>
            ))}
          </div>

          <div>
            <div className="flex items-center justify-between text-xs mb-1.5">
              <span className="text-slate-600">Verified Active Pages on Day 7</span>
              <span className="font-mono font-bold text-slate-900">
                {Math.min(calcVerified, calcPlan)} / {calcPlan}
              </span>
            </div>
            <input
              type="range"
              min={0}
              max={calcPlan}
              value={Math.min(calcVerified, calcPlan)}
              onChange={(e) => setCalcVerified(Number(e.target.value))}
              className="w-full accent-violet-700"
            />
          </div>

          <div className="bg-slate-50 border border-slate-200 rounded-lg p-4">
            <div className="text-xs text-slate-500">Calculated Weekly Salary</div>
            <div className="text-2xl font-bold font-mono tabular-nums text-violet-700 mt-1">
              {formatINR(calcWeeklyResult)}
            </div>
            <div className="text-[11px] font-mono text-slate-500 mt-1">
              {formatINR(calcMonthly)} ÷ {calcPlan} × {Math.min(calcVerified, calcPlan)} × 12 ÷ 52
            </div>
          </div>
        </div>
      </div>

      {/* Weekly Verification & Salary Credit History */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
          <h2 className="text-base font-bold text-slate-900">
            Weekly Verification &amp; Salary Credit History
          </h2>
          <button
            type="button"
            onClick={() => setUserView('withdrawal')}
            className="text-xs font-semibold text-violet-700 hover:underline"
          >
            Go to Withdrawal →
          </button>
        </div>
        {myVerifications.length === 0 ? (
          <div className="p-6">
            <EmptyState
              title="No Weekly Audits Recorded Yet"
              description="Once you complete a 7-day work period and request verification, your verified active pages count and credited salary will appear here."
            />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 font-semibold text-slate-600">
                  <th className="py-3 px-4">Week Cycle</th>
                  <th className="py-3 px-4">Plan</th>
                  <th className="py-3 px-4 text-right">Verified Active</th>
                  <th className="py-3 px-4 text-right">Monthly Rate Snapshot</th>
                  <th className="py-3 px-4 text-right">Weekly Salary</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Updated</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {myVerifications.map((v) => (
                  <tr key={v.id} className="hover:bg-slate-50/70">
                    <td className="py-3 px-4 font-mono font-semibold text-slate-900">{v.weekKey}</td>
                    <td className="py-3 px-4 font-mono">{v.planPages} Pages</td>
                    <td className="py-3 px-4 text-right font-mono tabular-nums font-semibold">
                      {v.verifiedActivePages} / {v.planPages}
                    </td>
                    <td className="py-3 px-4 text-right font-mono tabular-nums text-slate-600">
                      {formatINR(v.monthlySalaryRate)}
                    </td>
                    <td className="py-3 px-4 text-right font-mono tabular-nums font-bold text-emerald-700">
                      {formatINR(v.calculatedSalary)}
                    </td>
                    <td className="py-3 px-4">
                      <StatusText status={v.status} />
                    </td>
                    <td className="py-3 px-4 text-slate-500 whitespace-nowrap">
                      {formatTimestamp(v.updatedAt)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

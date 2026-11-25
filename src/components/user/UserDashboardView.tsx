import React from 'react';
import {
  ArrowRight,
  CalendarClock,
  ExternalLink,
  FileCheck2,
  Share2,
  Video,
  Wallet,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import {
  calculateWeeklySalary,
  formatINR,
  formatTimestamp,
  getCurrentWeekKey,
  getPlanConfig,
} from '../../lib/utils';
import { MetricCell, StatusText } from '../CommonUI';

export function UserDashboardView() {
  const {
    userProfile,
    settings,
    wallet,
    planPurchases,
    myPages,
    dailyInstructions,
    myReferrals,
    myNotifications,
    setUserView,
  } = useApp();

  if (!userProfile) return null;

  const activePlan =
    planPurchases.find((p) => p.id === userProfile.activePlanPurchaseId) ||
    planPurchases.find((p) => p.paymentStatus === 'approved') ||
    planPurchases[0] ||
    null;

  const planPages = activePlan
    ? myPages.filter((p) => p.planPurchaseId === activePlan.id)
    : myPages;

  const activePagesCount = planPages.filter(
    (p) => p.status === 'Work Active' || p.status === 'Approved',
  ).length;
  const pendingPagesCount = planPages.filter((p) => p.status === 'Pending Approval').length;
  const inactivePagesCount = planPages.filter(
    (p) =>
      p.status === 'Rejected' ||
      p.status === 'Page Deactivated' ||
      p.status === 'Work Discontinued',
  ).length;

  const activeConfig = activePlan ? getPlanConfig(settings, activePlan.planPages) : null;
  const estimatedWeeklySalary = activeConfig
    ? calculateWeeklySalary(activeConfig.monthlySalary, activeConfig.pages, activePagesCount)
    : 0;

  const latestInstruction = dailyInstructions[0] || null;
  const currentWeek = getCurrentWeekKey();

  return (
    <div className="space-y-8">
      {/* Welcome Heading */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs text-slate-500 mb-1">
            <span className="font-mono font-semibold text-slate-700">{userProfile.userCode}</span>
            <span aria-hidden="true">·</span>
            <span>Cycle {currentWeek}</span>
            <span aria-hidden="true">·</span>
            <span>Payout Window: {settings.weeklyPayoutDay} ({settings.weeklyPayoutTime})</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900">
            Welcome back, {userProfile.fullName}
          </h1>
        </div>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setUserView('work-plans')}
            className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-semibold text-white bg-violet-700 hover:bg-violet-800 rounded-lg transition-colors whitespace-nowrap"
          >
            <span>{activePlan ? 'Open Active Work Plan' : 'Choose a Work Plan'}</span>
            <ArrowRight className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => setUserView('withdrawal')}
            className="px-4 py-2.5 text-sm font-semibold text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 rounded-lg transition-colors whitespace-nowrap"
          >
            Withdraw
          </button>
        </div>
      </div>

      {/* Primary Financial KPI Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <MetricCell
          label="Available Wallet Balance"
          value={formatINR(wallet.availableBalance)}
          subtext={`Reserved: ${formatINR(wallet.reservedBalance)} · Min Withdrawal: ${formatINR(settings.minWithdrawalLimit)}`}
          accent
        />
        <MetricCell
          label="Estimated Week Salary (Pending Audit)"
          value={formatINR(estimatedWeeklySalary)}
          subtext={`Credited after Day 7 verification (${activePagesCount} active pages)`}
        />
        <MetricCell
          label="Total Salary Income"
          value={formatINR(wallet.totalSalaryIncome)}
          subtext={`Lifetime Earnings: ${formatINR(wallet.lifetimeEarnings)}`}
        />
        <MetricCell
          label="Total Affiliate Income"
          value={formatINR(wallet.totalAffiliateIncome)}
          subtext={`${myReferrals.length} Direct Referrals (${myReferrals.filter((r) => r.status === 'active').length} active)`}
        />
      </div>

      {/* Main Dashboard 3 Facebook Pages Work Plans Strip (50 / 100 / 150 Pages) */}
      <div className="space-y-3">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h2 className="text-base font-bold text-slate-900">Facebook Pages Work Plans</h2>
            <p className="text-xs text-slate-500">
              Three monthly salary tiers with weekly 7th-day verified payouts and direct affiliate rewards.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setUserView('work-plans')}
            className="text-xs font-semibold text-violet-700 hover:underline whitespace-nowrap"
          >
            Manage Plans &amp; Links →
          </button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {([50, 100, 150] as const).map((pages) => {
            const cfg = getPlanConfig(settings, pages);
            const isCurrent = activePlan?.planPages === pages && activePlan?.paymentStatus === 'approved';
            return (
              <div
                key={pages}
                className={`bg-white rounded-xl border p-5 flex flex-col justify-between gap-4 transition-colors ${
                  isCurrent ? 'border-violet-600 ring-1 ring-violet-600/20' : 'border-slate-200 hover:border-violet-300'
                }`}
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm font-bold text-slate-900">{pages} Pages Work</span>
                    <span className="text-[11px] font-mono font-semibold text-violet-700">
                      {cfg.price > 0 ? `Fee ${formatINR(cfg.price)}` : 'Included'}
                    </span>
                  </div>
                  <div className="text-2xl font-bold font-mono tabular-nums text-slate-900">
                    {formatINR(cfg.monthlySalary)}
                    <span className="text-xs font-sans font-normal text-slate-500"> / month</span>
                  </div>
                  <div className="text-xs text-slate-500">
                    Direct Affiliate: <span className="font-mono font-semibold text-slate-700">{formatINR(cfg.weeklyCommission)}</span>/week
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setUserView('work-plans')}
                  className={`w-full py-2 text-xs font-semibold rounded-lg transition-colors ${
                    isCurrent
                      ? 'bg-violet-50 text-violet-800 hover:bg-violet-100'
                      : 'bg-slate-900 text-white hover:bg-slate-800'
                  }`}
                >
                  {isCurrent ? 'Active Plan — Open Workspace' : `Select ${pages} Pages Work`}
                </button>
              </div>
            );
          })}
        </div>
      </div>

      {/* Active Work Plan + Daily Instructions Split */}
      <div className="grid lg:grid-cols-12 gap-6">
        <div className="lg:col-span-7 bg-white border border-slate-200 rounded-xl p-6 space-y-5">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h2 className="text-base font-bold text-slate-900">Work Plan &amp; Page Status</h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Salary and affiliate commissions are calculated once every {settings.workDurationDays} days after Admin verification.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setUserView('active-pages')}
              className="text-xs font-semibold text-violet-700 hover:underline whitespace-nowrap"
            >
              View All Pages
            </button>
          </div>

          {!activePlan ? (
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-6 space-y-4">
              <div className="text-sm font-semibold text-slate-900">No Work Plan Active Yet</div>
              <p className="text-xs text-slate-600 leading-relaxed">
                Select a 50 Pages ({formatINR(settings.plan50MonthlySalary)}/mo), 100 Pages (
                {formatINR(settings.plan100MonthlySalary)}/mo), or 150 Pages (
                {formatINR(settings.plan150MonthlySalary)}/mo) plan to upload your unique Facebook
                Page links and start earning weekly salary.
              </p>
              <button
                type="button"
                onClick={() => setUserView('work-plans')}
                className="px-4 py-2 text-xs font-semibold text-white bg-violet-700 hover:bg-violet-800 rounded-lg transition-colors"
              >
                Explore 50 / 100 / 150 Page Plans
              </button>
            </div>
          ) : (
            <div className="space-y-5">
              <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-slate-100">
                <div>
                  <div className="text-sm font-bold text-slate-900">
                    {activePlan.planPages} Facebook Pages Work Plan
                  </div>
                  <div className="text-xs text-slate-500 mt-0.5">
                    Monthly Potential: {formatINR(activeConfig?.monthlySalary || activePlan.monthlySalarySnapshot)} ·
                    Work State: {activePlan.workStarted ? 'Started' : 'Upload All Links to Start'}
                  </div>
                </div>
                <StatusText
                  status={
                    activePlan.paymentStatus === 'approved'
                      ? activePlan.workStarted
                        ? 'Work Active'
                        : 'Approved'
                      : activePlan.paymentStatus === 'rejected'
                        ? 'Rejected'
                        : 'Pending Approval'
                  }
                />
              </div>

              {/* Upload Progress */}
              <div>
                <div className="flex items-center justify-between text-xs mb-1.5">
                  <span className="font-medium text-slate-600">Submitted Unique Page Links</span>
                  <span className="font-mono font-semibold tabular-nums text-slate-900">
                    {planPages.length} / {activePlan.planPages}
                  </span>
                </div>
                <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-violet-700 rounded-full transition-all"
                    style={{
                      width: `${Math.min(100, (planPages.length / activePlan.planPages) * 100)}%`,
                    }}
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4 pt-1">
                <div className="bg-slate-50 border border-slate-200 rounded-lg p-3.5">
                  <div className="text-[11px] font-medium text-slate-500">Active / Approved</div>
                  <div className="text-xl font-bold font-mono tabular-nums text-emerald-700 mt-0.5">
                    {activePagesCount}
                  </div>
                </div>
                <div className="bg-slate-50 border border-slate-200 rounded-lg p-3.5">
                  <div className="text-[11px] font-medium text-slate-500">Pending Review</div>
                  <div className="text-xl font-bold font-mono tabular-nums text-amber-700 mt-0.5">
                    {pendingPagesCount}
                  </div>
                </div>
                <div className="bg-slate-50 border border-slate-200 rounded-lg p-3.5">
                  <div className="text-[11px] font-medium text-slate-500">Rejected / Inactive</div>
                  <div className="text-xl font-bold font-mono tabular-nums text-rose-700 mt-0.5">
                    {inactivePagesCount}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Latest Daily Video Instruction */}
        <div className="lg:col-span-5 bg-white border border-slate-200 rounded-xl p-6 flex flex-col justify-between gap-4">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-bold text-slate-900">Today&apos;s Official Work Instruction</h2>
              <Video className="w-4 h-4 text-violet-700" />
            </div>

            {latestInstruction ? (
              <div className="space-y-3">
                <div className="text-xs font-mono text-slate-500">Task Date: {latestInstruction.taskDate}</div>
                <div className="text-sm font-bold text-slate-900">{latestInstruction.title}</div>
                <p className="text-xs text-slate-600 leading-relaxed whitespace-pre-line">
                  {latestInstruction.description}
                </p>
                {latestInstruction.videoUrl ? (
                  <a
                    href={latestInstruction.videoUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 text-xs font-semibold text-violet-700 hover:underline"
                  >
                    Open Reference Video
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                ) : null}
              </div>
            ) : (
              <div className="text-xs text-slate-600 leading-relaxed whitespace-pre-line">
                {settings.workInstructionsGlobal}
              </div>
            )}
          </div>

          <div className="pt-4 border-t border-slate-100 flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={() => setUserView('work-plans')}
              className="text-xs font-semibold text-violet-700 hover:underline"
            >
              Submit Daily Video Proof →
            </button>
            <button
              type="button"
              onClick={() => setUserView('weekly-payout')}
              className="text-xs font-medium text-slate-600 hover:text-slate-900"
            >
              Weekly Payout Cycle
            </button>
          </div>
        </div>
      </div>

      {/* Quick Action Row + Recent Activity */}
      <div className="grid lg:grid-cols-12 gap-6">
        <div className="lg:col-span-5 grid sm:grid-cols-2 gap-4">
          <button
            type="button"
            onClick={() => setUserView('affiliate')}
            className="bg-white border border-slate-200 hover:border-violet-300 rounded-xl p-5 text-left transition-colors"
          >
            <Share2 className="w-5 h-5 text-violet-700 mb-3" />
            <div className="text-sm font-bold text-slate-900">Affiliate Program</div>
            <div className="text-xs text-slate-500 mt-1">
              Earn {formatINR(settings.plan50WeeklyCommission)}–{formatINR(settings.plan150WeeklyCommission)} weekly per active referral
            </div>
          </button>

          <button
            type="button"
            onClick={() => setUserView('monthly-salary')}
            className="bg-white border border-slate-200 hover:border-violet-300 rounded-xl p-5 text-left transition-colors"
          >
            <FileCheck2 className="w-5 h-5 text-violet-700 mb-3" />
            <div className="text-sm font-bold text-slate-900">Salary Calculator</div>
            <div className="text-xs text-slate-500 mt-1">
              Inspect weekly pro-rata payout formula &amp; history
            </div>
          </button>

          <button
            type="button"
            onClick={() => setUserView('weekly-payout')}
            className="bg-white border border-slate-200 hover:border-violet-300 rounded-xl p-5 text-left transition-colors"
          >
            <CalendarClock className="w-5 h-5 text-violet-700 mb-3" />
            <div className="text-sm font-bold text-slate-900">Day 8 Payout</div>
            <div className="text-xs text-slate-500 mt-1">
              Request 7-day verification &amp; track credits
            </div>
          </button>

          <button
            type="button"
            onClick={() => setUserView('wallet')}
            className="bg-white border border-slate-200 hover:border-violet-300 rounded-xl p-5 text-left transition-colors"
          >
            <Wallet className="w-5 h-5 text-violet-700 mb-3" />
            <div className="text-sm font-bold text-slate-900">Wallet &amp; Bank/UPI</div>
            <div className="text-xs text-slate-500 mt-1">
              Manage Bank Account, UPI ID &amp; transactions
            </div>
          </button>
        </div>

        <div className="lg:col-span-7 bg-white border border-slate-200 rounded-xl p-6">
          <h2 className="text-base font-bold text-slate-900 mb-4">Recent Platform Notifications</h2>
          {myNotifications.length === 0 ? (
            <p className="text-xs text-slate-500">No recent alerts.</p>
          ) : (
            <div className="divide-y divide-slate-100">
              {myNotifications.slice(0, 5).map((n) => (
                <div key={n.id} className="py-3 flex items-start justify-between gap-4">
                  <div>
                    <div className="text-xs font-semibold text-slate-900">{n.title}</div>
                    <div className="text-xs text-slate-600 mt-0.5">{n.message}</div>
                  </div>
                  <div className="text-[11px] text-slate-400 whitespace-nowrap shrink-0">
                    {formatTimestamp(n.createdAt)}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

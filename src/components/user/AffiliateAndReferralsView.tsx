import React, { useState } from 'react';
import { Check, Copy, ExternalLink, Share2 } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import {
  calculateWeeklyCommission,
  formatINR,
  formatTimestamp,
  getReferralShareUrl,
} from '../../lib/utils';
import { EmptyState, MetricCell, StatusText } from '../CommonUI';

export function AffiliateProgramView({ focusReferrals = false }: { focusReferrals?: boolean }) {
  const { userProfile, settings, myReferrals, myCommissions, pushToast } = useApp();
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);
  const [simPlan, setSimPlan] = useState<50 | 100 | 150>(50);
  const [simActive, setSimActive] = useState(30);

  if (!userProfile) return null;

  const referralLink = getReferralShareUrl(userProfile.referralCode);
  const totalReferrals = myReferrals.length;
  const activeReferrals = myReferrals.filter((r) => r.status === 'active').length;
  const inactiveReferrals = myReferrals.filter((r) => r.status !== 'active').length;

  const paidCommission = myCommissions.reduce((acc, c) => acc + c.amount, 0);
  const currentWeekCommission = myReferrals.reduce((acc, r) => acc + (r.lastWeekCommission || 0), 0);
  const estimatedPendingCommission = myReferrals.reduce((acc, r) => {
    if (!r.referredPlanPages || !r.activePagesCount) return acc;
    const rate =
      r.referredPlanPages === 50
        ? settings.plan50WeeklyCommission
        : r.referredPlanPages === 100
          ? settings.plan100WeeklyCommission
          : settings.plan150WeeklyCommission;
    return acc + calculateWeeklyCommission(rate, r.referredPlanPages, r.activePagesCount);
  }, 0);

  const simRate =
    simPlan === 50
      ? settings.plan50WeeklyCommission
      : simPlan === 100
        ? settings.plan100WeeklyCommission
        : settings.plan150WeeklyCommission;
  const simWeekly = calculateWeeklyCommission(simRate, simPlan, Math.min(simActive, simPlan));

  const copyLink = () => {
    navigator.clipboard.writeText(referralLink);
    setCopiedLink(true);
    pushToast('success', 'Referral Link Copied', 'Share it on WhatsApp or Facebook.');
    window.setTimeout(() => setCopiedLink(false), 2000);
  };

  const copyCode = () => {
    navigator.clipboard.writeText(userProfile.referralCode);
    setCopiedCode(true);
    pushToast('success', 'Referral Code Copied', userProfile.referralCode);
    window.setTimeout(() => setCopiedCode(false), 2000);
  };

  const shareText = `Join Facebook Earner and earn weekly salary managing Facebook Pages! Register using my referral link: ${referralLink}`;
  const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(shareText)}`;
  const facebookUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(referralLink)}`;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">
          {focusReferrals ? 'My Referrals' : 'Affiliate / Refer & Earn Program'}
        </h1>
        <p className="text-sm text-slate-600 mt-1">
          Direct single-level referral commissions credited weekly after 7th-day Admin page
          verification. Zero daily accruals; only verified active pages earn commission.
        </p>
      </div>

      {/* Referral Link Card */}
      <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <h2 className="text-base font-bold text-slate-900">Your Unique Referral Link &amp; Code</h2>
            <p className="text-xs text-slate-500 mt-0.5">
              When a new creator registers through your link, completes Training, and runs an active
              Work Plan, you earn direct weekly affiliate commission.
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <span className="text-xs text-slate-500">Referral Code:</span>
            <span className="text-sm font-mono font-bold text-violet-700 bg-violet-50 border border-violet-200 rounded-lg px-3 py-1.5">
              {userProfile.referralCode}
            </span>
            <button
              type="button"
              onClick={copyCode}
              className="p-2 text-slate-600 hover:text-violet-700 border border-slate-200 rounded-lg transition-colors"
              title="Copy Referral Code"
            >
              {copiedCode ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
            </button>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-3">
          <input
            type="text"
            readOnly
            value={referralLink}
            className="flex-1 px-3.5 py-2.5 text-xs font-mono bg-slate-50 border border-slate-200 rounded-lg text-slate-700"
          />
          <button
            type="button"
            onClick={copyLink}
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 text-xs font-semibold text-white bg-violet-700 hover:bg-violet-800 rounded-lg transition-colors whitespace-nowrap"
          >
            {copiedLink ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
            {copiedLink ? 'Copied Link' : 'Copy Referral Link'}
          </button>
          <a
            href={whatsappUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 text-xs font-semibold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-lg transition-colors whitespace-nowrap"
          >
            <Share2 className="w-3.5 h-3.5" />
            WhatsApp
          </a>
          <a
            href={facebookUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 border border-slate-300 rounded-lg transition-colors whitespace-nowrap"
          >
            Facebook
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        </div>
      </div>

      {/* Affiliate KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCell
          label="Total Direct Referrals"
          value={String(totalReferrals)}
          subtext={`Active: ${activeReferrals} · Inactive/Pending: ${inactiveReferrals}`}
        />
        <MetricCell
          label="Current Week Affiliate Earnings"
          value={formatINR(currentWeekCommission)}
          subtext="Latest verified weekly cycle"
          accent
        />
        <MetricCell
          label="Pending Weekly Commission"
          value={formatINR(estimatedPendingCommission)}
          subtext="Estimated — awaits 7th-day Admin audit"
        />
        <MetricCell
          label="Total Paid Commission"
          value={formatINR(paidCommission)}
          subtext={`${myCommissions.length} weekly credits paid to Wallet`}
        />
      </div>

      {/* Commission Rates + Interactive Formula Simulator */}
      {!focusReferrals ? (
        <div className="grid lg:grid-cols-12 gap-6">
          <div className="lg:col-span-7 bg-white border border-slate-200 rounded-xl p-6 space-y-4">
            <h2 className="text-base font-bold text-slate-900">
              Weekly Direct Affiliate Commission Structure
            </h2>
            <p className="text-xs text-slate-600 leading-relaxed">
              Rates are for full active pages per 7-day cycle. Pro-rata formula:{' '}
              <span className="font-mono font-semibold text-slate-900">
                Weekly Commission Rate ÷ Total Plan Pages × Verified Active Pages
              </span>
              . Direct referrals only (no multi-level chains).
            </p>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50 border-y border-slate-200 font-semibold text-slate-600">
                    <th className="py-2.5 px-3">Work Plan</th>
                    <th className="py-2.5 px-3 text-right">Full Active Pages</th>
                    <th className="py-2.5 px-3 text-right">Weekly Commission</th>
                    <th className="py-2.5 px-3 text-right">Per Verified Page / Wk</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {[
                    { pages: 50, rate: settings.plan50WeeklyCommission },
                    { pages: 100, rate: settings.plan100WeeklyCommission },
                    { pages: 150, rate: settings.plan150WeeklyCommission },
                  ].map((row) => (
                    <tr key={row.pages}>
                      <td className="py-3 px-3 font-semibold text-slate-900">{row.pages} Pages Plan</td>
                      <td className="py-3 px-3 text-right font-mono tabular-nums">{row.pages}</td>
                      <td className="py-3 px-3 text-right font-mono tabular-nums font-bold text-violet-700">
                        {formatINR(row.rate)}
                      </td>
                      <td className="py-3 px-3 text-right font-mono tabular-nums text-slate-600">
                        {formatINR(row.rate / row.pages)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="lg:col-span-5 bg-white border border-slate-200 rounded-xl p-6 space-y-4">
            <h2 className="text-base font-bold text-slate-900">Commission Estimator</h2>
            <div className="grid grid-cols-3 gap-1.5 p-1 bg-slate-100 rounded-lg">
              {([50, 100, 150] as const).map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => {
                    setSimPlan(p);
                    setSimActive(Math.min(simActive, p));
                  }}
                  className={`py-1.5 text-xs font-semibold rounded-md transition-colors ${
                    simPlan === p ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600'
                  }`}
                >
                  {p} Pages
                </button>
              ))}
            </div>

            <div>
              <div className="flex items-center justify-between text-xs mb-1.5">
                <span className="text-slate-600">Referred User&apos;s Verified Active Pages</span>
                <span className="font-mono font-bold text-slate-900">
                  {Math.min(simActive, simPlan)} / {simPlan}
                </span>
              </div>
              <input
                type="range"
                min={0}
                max={simPlan}
                value={Math.min(simActive, simPlan)}
                onChange={(e) => setSimActive(Number(e.target.value))}
                className="w-full accent-violet-700"
              />
            </div>

            <div className="bg-slate-50 border border-slate-200 rounded-lg p-4">
              <div className="text-xs text-slate-500">Calculated Weekly Affiliate Commission</div>
              <div className="text-2xl font-bold font-mono tabular-nums text-violet-700 mt-1">
                {formatINR(simWeekly)}
              </div>
              <div className="text-[11px] font-mono text-slate-500 mt-1">
                {formatINR(simRate)} ÷ {simPlan} × {Math.min(simActive, simPlan)} pages
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {/* Individual Referrals Table */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
          <h2 className="text-base font-bold text-slate-900">
            Individual Referral Performance ({myReferrals.length})
          </h2>
        </div>
        {myReferrals.length === 0 ? (
          <div className="p-6">
            <EmptyState
              title="No Referrals Yet"
              description="Share your referral link above. Once someone registers, completes Training, and works on a Facebook Page plan, their active pages and weekly commission will appear here."
              actionLabel="Copy Referral Link"
              onAction={copyLink}
            />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 font-semibold text-slate-600">
                  <th className="py-3 px-4">Referred User</th>
                  <th className="py-3 px-4">Work Plan</th>
                  <th className="py-3 px-4 text-right">Active Pages</th>
                  <th className="py-3 px-4 text-right">Inactive Pages</th>
                  <th className="py-3 px-4 text-right">Last Week Commission</th>
                  <th className="py-3 px-4 text-right">Total Commission</th>
                  <th className="py-3 px-4">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {myReferrals.map((r) => (
                  <tr key={r.id} className="hover:bg-slate-50/70">
                    <td className="py-3 px-4">
                      <div className="font-semibold text-slate-900">{r.referredName}</div>
                      <div className="font-mono text-[11px] text-slate-500">{r.referredCode}</div>
                    </td>
                    <td className="py-3 px-4 font-mono text-slate-700">
                      {r.referredPlanPages ? `${r.referredPlanPages} Pages` : 'Not selected'}
                    </td>
                    <td className="py-3 px-4 text-right font-mono tabular-nums font-semibold text-emerald-700">
                      {r.activePagesCount || 0}
                    </td>
                    <td className="py-3 px-4 text-right font-mono tabular-nums text-rose-700">
                      {r.inactivePagesCount || 0}
                    </td>
                    <td className="py-3 px-4 text-right font-mono tabular-nums font-semibold text-slate-900">
                      {formatINR(r.lastWeekCommission || 0)}
                    </td>
                    <td className="py-3 px-4 text-right font-mono tabular-nums font-bold text-violet-700">
                      {formatINR(r.totalCommissionEarned || 0)}
                    </td>
                    <td className="py-3 px-4">
                      <StatusText status={r.status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Commission Credit History */}
      {myCommissions.length > 0 ? (
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-200">
            <h2 className="text-base font-bold text-slate-900">Verified Weekly Commission History</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 font-semibold text-slate-600">
                  <th className="py-3 px-4">Week</th>
                  <th className="py-3 px-4">Referred Creator</th>
                  <th className="py-3 px-4 text-right">Verified Active Pages</th>
                  <th className="py-3 px-4 text-right">Rate Snapshot</th>
                  <th className="py-3 px-4 text-right">Credited Amount</th>
                  <th className="py-3 px-4">Credited On</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {myCommissions.map((c) => (
                  <tr key={c.id}>
                    <td className="py-3 px-4 font-mono font-semibold text-slate-900">{c.weekKey}</td>
                    <td className="py-3 px-4 text-slate-700">{c.referredName || c.referredUid}</td>
                    <td className="py-3 px-4 text-right font-mono tabular-nums">
                      {c.verifiedActivePages} / {c.planPages}
                    </td>
                    <td className="py-3 px-4 text-right font-mono tabular-nums text-slate-600">
                      {formatINR(c.weeklyCommissionRate)}
                    </td>
                    <td className="py-3 px-4 text-right font-mono tabular-nums font-bold text-emerald-700">
                      +{formatINR(c.amount)}
                    </td>
                    <td className="py-3 px-4 text-slate-500">{formatTimestamp(c.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : null}
    </div>
  );
}

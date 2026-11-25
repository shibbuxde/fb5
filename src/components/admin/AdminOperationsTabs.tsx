import React, { useMemo, useState } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  Plus,
  Save,
  Search,
  Trash2,
  Upload,
  XCircle,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import {
  adminApproveWeeklyVerification,
  adminDeleteDailyInstruction,
  adminRejectWeeklyVerification,
  adminSaveDailyInstruction,
  adminSaveSettings,
  adminToggleUserTrainingAccess,
  adminUpdateFacebookPageStatus,
  adminVerifyDailySubmission,
  adminVerifyPlanPurchase,
  adminVerifyTrainingPayment,
} from '../../lib/firestoreService';
import {
  calculateWeeklyCommission,
  calculateWeeklySalary,
  canonicalizeFacebookUrl,
  compressImageToDataUrl,
  DEFAULT_TRAINING_BANNER,
  formatINR,
  formatTimestamp,
  getCurrentWeekKey,
  getTodayDateKey,
} from '../../lib/utils';
import type {
  DailySubmissionStatus,
  FacebookPageStatus,
  TrainingModuleItem,
} from '../../types';
import { MetricCell, StatusText } from '../CommonUI';
import type { AdminDataset } from './useAdminData';

const PAGE_STATUS_OPTIONS: FacebookPageStatus[] = [
  'Pending Approval',
  'Approved',
  'Work Active',
  'Work Paused',
  'Rejected',
  'Page Deactivated',
  'Work Discontinued',
];

const DAILY_SUBMISSION_STATUSES: DailySubmissionStatus[] = [
  'Task Submitted',
  'Pending Verification',
  'Approved',
  'Rejected',
];

// ==================== 1. ADMIN OVERVIEW (ALL 14 KPIs + ACTIVITY LOGS) ====================
export function AdminOverviewTab({ data }: { data: AdminDataset }) {
  const totalUsers = data.users.length;
  const totalTrainingPayments = data.trainingPurchases.filter((t) => t.status === 'verified').length;
  const pendingTrainingPayments = data.trainingPurchases.filter((t) => t.status === 'pending').length;
  const totalActiveUsers = data.users.filter((u) => u.trainingVerified && u.accountStatus === 'active').length;
  const totalWorkPlans = data.planPurchases.filter((p) => p.paymentStatus === 'approved').length;
  const totalActivePages = data.facebookPages.filter(
    (p) => p.status === 'Work Active' || p.status === 'Approved',
  ).length;
  const totalInactivePages = data.facebookPages.filter(
    (p) =>
      p.status === 'Rejected' ||
      p.status === 'Page Deactivated' ||
      p.status === 'Work Discontinued' ||
      p.status === 'Work Paused',
  ).length;
  const totalSubmittedLinks = data.facebookPages.length;
  const pendingLinkApprovals = data.facebookPages.filter((p) => p.status === 'Pending Approval').length;
  const totalAffiliateCommission = data.weeklyCommissions.reduce((s, c) => s + c.amount, 0);
  const totalSalaryPayable = data.weeklySalaries.reduce((s, sal) => s + sal.amount, 0);
  const totalWalletBalance = data.wallets.reduce((s, w) => s + w.availableBalance, 0);
  const pendingWithdrawals = data.withdrawalRequests.filter(
    (w) => w.status !== 'Paid' && w.status !== 'Rejected',
  ).length;
  const completedPayments = data.withdrawalRequests
    .filter((w) => w.status === 'Paid')
    .reduce((s, w) => s + w.amount, 0);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">Admin Operations Overview</h1>
        <p className="text-sm text-slate-600 mt-1">
          Live platform metrics across all 14 operational KPIs and recent Admin audit logs.
        </p>
      </div>

      {/* All 14 Required Admin Dashboard KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 gap-4">
        <MetricCell label="Total Registered Users" value={String(totalUsers)} />
        <MetricCell label="Total Active Users" value={String(totalActiveUsers)} />
        <MetricCell label="Verified Training Payments" value={String(totalTrainingPayments)} />
        <MetricCell label="Pending Training Payments" value={String(pendingTrainingPayments)} accent={pendingTrainingPayments > 0} />
        <MetricCell label="Active Work Plans" value={String(totalWorkPlans)} />

        <MetricCell label="Total Submitted Links" value={String(totalSubmittedLinks)} />
        <MetricCell label="Pending Link Approvals" value={String(pendingLinkApprovals)} accent={pendingLinkApprovals > 0} />
        <MetricCell label="Total Active Pages" value={String(totalActivePages)} />
        <MetricCell label="Total Inactive Pages" value={String(totalInactivePages)} />
        <MetricCell label="Total Wallet Balance" value={formatINR(totalWalletBalance)} />

        <MetricCell label="Total Salary Credited" value={formatINR(totalSalaryPayable)} />
        <MetricCell label="Total Affiliate Commission" value={formatINR(totalAffiliateCommission)} />
        <MetricCell label="Pending Withdrawals" value={String(pendingWithdrawals)} accent={pendingWithdrawals > 0} />
        <MetricCell label="Completed Payouts" value={formatINR(completedPayments)} />
      </div>

      {/* Admin Activity Logs */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200">
          <h2 className="text-base font-bold text-slate-900">
            Admin Activity Logs ({data.activityLogs.length})
          </h2>
        </div>
        <div className="overflow-x-auto max-h-96 overflow-y-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 font-semibold text-slate-600">
                <th className="py-3 px-4">Timestamp</th>
                <th className="py-3 px-4">Admin</th>
                <th className="py-3 px-4">Action</th>
                <th className="py-3 px-4">Target</th>
                <th className="py-3 px-4">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {data.activityLogs.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-slate-500">
                    No administrative actions logged yet.
                  </td>
                </tr>
              ) : (
                data.activityLogs.slice(0, 50).map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50/70">
                    <td className="py-3 px-4 text-slate-500 whitespace-nowrap">
                      {formatTimestamp(log.createdAt)}
                    </td>
                    <td className="py-3 px-4 font-mono text-slate-700">{log.adminEmail}</td>
                    <td className="py-3 px-4 font-semibold text-slate-900">{log.action}</td>
                    <td className="py-3 px-4 font-mono text-slate-600">
                      {log.targetType} / {log.targetId.slice(0, 14)}
                    </td>
                    <td className="py-3 px-4 text-slate-600 max-w-md">{log.details}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ==================== 2. TRAINING MANAGEMENT ====================
export function AdminTrainingTab({ data }: { data: AdminDataset }) {
  const { userProfile, settings, pushToast } = useApp();
  const [title, setTitle] = useState(settings.trainingTitle);
  const [price, setPrice] = useState(String(settings.trainingPrice));
  const [description, setDescription] = useState(settings.trainingDescription);
  const [accessDetails, setAccessDetails] = useState(settings.trainingAccessDetails);
  const [benefitsText, setBenefitsText] = useState(settings.trainingBenefits.join('\n'));
  const [thumbnailUrl, setThumbnailUrl] = useState(settings.trainingThumbnailUrl);
  const [modules, setModules] = useState<TrainingModuleItem[]>(settings.trainingContentModules);
  const [saving, setSaving] = useState(false);
  const [notes, setNotes] = useState<Record<string, string>>({});

  if (!userProfile) return null;

  const handleThumbUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const compressed = await compressImageToDataUrl(file, 960, 0.78);
      setThumbnailUrl(compressed);
      pushToast('info', 'Thumbnail Ready', 'Click Save Training Configuration to publish.');
    } catch (err) {
      pushToast('error', 'Upload Error', err instanceof Error ? err.message : 'Invalid image.');
    }
  };

  const handleSaveTraining = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await adminSaveSettings(userProfile, {
        ...settings,
        trainingTitle: title.trim(),
        trainingPrice: Math.max(0, Number(price) || 0),
        trainingDescription: description.trim(),
        trainingAccessDetails: accessDetails.trim(),
        trainingBenefits: benefitsText
          .split('\n')
          .map((l) => l.trim())
          .filter(Boolean)
          .slice(0, 20),
        trainingThumbnailUrl: thumbnailUrl,
        trainingContentModules: modules.slice(0, 30),
      });
      pushToast('success', 'Training Updated', 'New price, thumbnail, and content are now live.');
    } catch (err) {
      pushToast('error', 'Save Failed', err instanceof Error ? err.message : 'Error saving.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">Training Management</h1>
        <p className="text-sm text-slate-600 mt-1">
          Edit training price (e.g., ₹299, ₹399, ₹499), upload/change training thumbnail, update
          curriculum, verify payments, and control user training access.
        </p>
      </div>

      {/* Training Payment Verification Queue */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
          <h2 className="text-base font-bold text-slate-900">
            Training Payment Verification Queue ({data.trainingPurchases.length})
          </h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 font-semibold text-slate-600">
                <th className="py-3 px-4">User</th>
                <th className="py-3 px-4 text-right">Amount</th>
                <th className="py-3 px-4">UTR / Ref</th>
                <th className="py-3 px-4">Receipt</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">Admin Verification Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {data.trainingPurchases.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-500">
                    No training payment requests submitted yet.
                  </td>
                </tr>
              ) : (
                data.trainingPurchases.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-50/70">
                    <td className="py-3 px-4">
                      <div className="font-semibold text-slate-900">{p.userName}</div>
                      <div className="font-mono text-[11px] text-slate-500">
                        {p.userCode} · {p.userEmail}
                      </div>
                    </td>
                    <td className="py-3 px-4 text-right font-mono font-bold text-slate-900">
                      {formatINR(p.amount)}
                    </td>
                    <td className="py-3 px-4 font-mono font-semibold text-slate-800">
                      {p.utrNumber}
                      <div className="text-[10px] font-sans text-slate-400">
                        {formatTimestamp(p.createdAt)}
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      {p.receiptUrl ? (
                        <a
                          href={p.receiptUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-violet-700 font-semibold hover:underline"
                        >
                          View Receipt
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      ) : (
                        <span className="text-slate-400">None</span>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      <StatusText status={p.status} />
                    </td>
                    <td className="py-3 px-4">
                      {p.status === 'pending' ? (
                        <div className="flex flex-wrap items-center gap-2">
                          <input
                            type="text"
                            value={notes[p.id] || ''}
                            onChange={(e) =>
                              setNotes((prev) => ({ ...prev, [p.id]: e.target.value }))
                            }
                            placeholder="Optional note / reject reason"
                            className="px-2.5 py-1.5 text-xs bg-white border border-slate-300 rounded-md w-44"
                          />
                          <button
                            type="button"
                            onClick={async () => {
                              await adminVerifyTrainingPayment(
                                userProfile,
                                p,
                                'verified',
                                notes[p.id] || 'Payment verified',
                              );
                              pushToast('success', 'Training Activated', `${p.userName}'s dashboard is now unlocked.`);
                            }}
                            className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-md"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            Verify &amp; Unlock
                          </button>
                          <button
                            type="button"
                            onClick={async () => {
                              await adminVerifyTrainingPayment(
                                userProfile,
                                p,
                                'rejected',
                                notes[p.id] || 'UTR mismatch',
                              );
                              pushToast('info', 'Payment Rejected', `${p.userName} notified.`);
                            }}
                            className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-md"
                          >
                            <XCircle className="w-3.5 h-3.5" />
                            Reject
                          </button>
                        </div>
                      ) : (
                        <span className="text-slate-500">{p.adminNote || 'Processed'}</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Edit Training Thumbnail, Price, Title, Description & Modules */}
      <form
        onSubmit={handleSaveTraining}
        className="bg-white border border-slate-200 rounded-xl p-6 space-y-6"
      >
        <div className="flex items-center justify-between gap-4">
          <h2 className="text-base font-bold text-slate-900">
            Training Thumbnail, Price &amp; Content Editor
          </h2>
          <button
            type="submit"
            disabled={saving}
            className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-violet-700 hover:bg-violet-800 disabled:opacity-50 rounded-lg"
          >
            <Save className="w-3.5 h-3.5" />
            {saving ? 'Saving...' : 'Save Training Configuration'}
          </button>
        </div>

        <div className="grid lg:grid-cols-12 gap-6">
          <div className="lg:col-span-5 space-y-3">
            <label className="block text-xs font-semibold text-slate-700">
              Training Thumbnail / Banner Image
            </label>
            <div className="aspect-video rounded-lg overflow-hidden border border-slate-200 bg-slate-100">
              <img
                src={thumbnailUrl || DEFAULT_TRAINING_BANNER}
                alt="Training banner preview"
                referrerPolicy="no-referrer"
                className="w-full h-full object-cover"
              />
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <label className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 rounded-lg cursor-pointer">
                <Upload className="w-3.5 h-3.5" />
                Upload New Thumbnail
                <input type="file" accept="image/*" onChange={handleThumbUpload} className="hidden" />
              </label>
              <button
                type="button"
                onClick={() => setThumbnailUrl(DEFAULT_TRAINING_BANNER)}
                className="text-xs font-medium text-slate-500 hover:text-slate-800 underline"
              >
                Reset Default
              </button>
            </div>
          </div>

          <div className="lg:col-span-7 space-y-4">
            <div className="grid sm:grid-cols-3 gap-4">
              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-slate-700 mb-1">Training Title</label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-lg"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Training Price (₹)
                </label>
                <input
                  type="number"
                  min={0}
                  required
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  className="w-full px-3 py-2 text-xs font-mono font-bold bg-white border border-slate-300 rounded-lg"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Training Description
              </label>
              <textarea
                rows={3}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full p-3 text-xs bg-white border border-slate-300 rounded-lg"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Training Benefits (One per line)
              </label>
              <textarea
                rows={4}
                value={benefitsText}
                onChange={(e) => setBenefitsText(e.target.value)}
                className="w-full p-3 text-xs bg-white border border-slate-300 rounded-lg"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Training Access Details
              </label>
              <input
                type="text"
                value={accessDetails}
                onChange={(e) => setAccessDetails(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-lg"
              />
            </div>
          </div>
        </div>

        {/* Training Modules Editor */}
        <div className="pt-4 border-t border-slate-200 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-900">Training Video Modules</h3>
            <button
              type="button"
              onClick={() =>
                setModules((prev) => [
                  ...prev,
                  {
                    id: `mod-${Date.now()}`,
                    title: 'New Training Lesson',
                    duration: '10 min',
                    summary: 'Lesson instructions',
                    videoUrl: '',
                  },
                ])
              }
              className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-violet-700 bg-violet-50 hover:bg-violet-100 rounded-lg"
            >
              <Plus className="w-3.5 h-3.5" />
              Add Lesson
            </button>
          </div>
          <div className="space-y-3">
            {modules.map((mod, i) => (
              <div
                key={mod.id}
                className="grid md:grid-cols-12 gap-2.5 bg-slate-50 border border-slate-200 rounded-lg p-3"
              >
                <input
                  type="text"
                  value={mod.title}
                  onChange={(e) =>
                    setModules((prev) =>
                      prev.map((m, idx) => (idx === i ? { ...m, title: e.target.value } : m)),
                    )
                  }
                  placeholder="Lesson Title"
                  className="md:col-span-4 px-2.5 py-1.5 text-xs bg-white border border-slate-300 rounded-md"
                />
                <input
                  type="text"
                  value={mod.duration}
                  onChange={(e) =>
                    setModules((prev) =>
                      prev.map((m, idx) => (idx === i ? { ...m, duration: e.target.value } : m)),
                    )
                  }
                  placeholder="12 min"
                  className="md:col-span-2 px-2.5 py-1.5 text-xs bg-white border border-slate-300 rounded-md"
                />
                <input
                  type="url"
                  value={mod.videoUrl}
                  onChange={(e) =>
                    setModules((prev) =>
                      prev.map((m, idx) => (idx === i ? { ...m, videoUrl: e.target.value } : m)),
                    )
                  }
                  placeholder="Reference Video URL"
                  className="md:col-span-5 px-2.5 py-1.5 text-xs font-mono bg-white border border-slate-300 rounded-md"
                />
                <button
                  type="button"
                  onClick={() => setModules((prev) => prev.filter((_, idx) => idx !== i))}
                  className="md:col-span-1 flex items-center justify-center text-rose-600 hover:bg-rose-50 rounded-md"
                  title="Remove module"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
                <input
                  type="text"
                  value={mod.summary}
                  onChange={(e) =>
                    setModules((prev) =>
                      prev.map((m, idx) => (idx === i ? { ...m, summary: e.target.value } : m)),
                    )
                  }
                  placeholder="Short summary"
                  className="md:col-span-12 px-2.5 py-1.5 text-xs bg-white border border-slate-300 rounded-md"
                />
              </div>
            ))}
          </div>
        </div>
      </form>

      {/* Activate / Deactivate User Training Access */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200">
          <h2 className="text-base font-bold text-slate-900">
            User Training Access Control ({data.users.length} Users)
          </h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 font-semibold text-slate-600">
                <th className="py-3 px-4">User ID</th>
                <th className="py-3 px-4">Name &amp; Email</th>
                <th className="py-3 px-4">Training Status</th>
                <th className="py-3 px-4">Active Plan</th>
                <th className="py-3 px-4 text-right">Manual Access Control</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {data.users.map((u) => (
                <tr key={u.uid} className="hover:bg-slate-50/70">
                  <td className="py-3 px-4 font-mono font-semibold text-slate-900">{u.userCode}</td>
                  <td className="py-3 px-4">
                    <div className="font-semibold text-slate-900">{u.fullName}</div>
                    <div className="text-slate-500">{u.email}</div>
                  </td>
                  <td className="py-3 px-4">
                    <StatusText status={u.trainingVerified ? 'Verified' : u.trainingStatus} />
                  </td>
                  <td className="py-3 px-4 font-mono">
                    {u.activePlanPages ? `${u.activePlanPages} Pages` : 'None'}
                  </td>
                  <td className="py-3 px-4 text-right">
                    <button
                      type="button"
                      onClick={async () => {
                        await adminToggleUserTrainingAccess(userProfile, u, !u.trainingVerified);
                        pushToast(
                          'success',
                          u.trainingVerified ? 'Training Revoked' : 'Training Activated',
                          `${u.fullName}'s access updated.`,
                        );
                      }}
                      className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors ${
                        u.trainingVerified
                          ? 'text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200'
                          : 'text-white bg-violet-700 hover:bg-violet-800'
                      }`}
                    >
                      {u.trainingVerified ? 'Deactivate Access' : 'Activate Training Access'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ==================== 3. WORK, FACEBOOK LINKS, GLOBAL REGISTRY & DAILY INSTRUCTIONS ====================
export function AdminWorkTab({ data }: { data: AdminDataset }) {
  const { userProfile, pushToast } = useApp();
  const [linkFilter, setLinkFilter] = useState<'ALL' | FacebookPageStatus>('ALL');
  const [linkSearch, setLinkSearch] = useState('');
  const [rejectReasons, setRejectReasons] = useState<Record<string, string>>({});

  // Global Duplicate Owner Lookup & Registry Search
  const [lookupUrl, setLookupUrl] = useState('');
  const [globalSearch, setGlobalSearch] = useState('');
  const lookupResult = useMemo(() => {
    if (!lookupUrl.trim()) return null;
    const parsed = canonicalizeFacebookUrl(lookupUrl);
    if (!parsed.valid) return { error: parsed.error };
    const found = data.globalFacebookPages.find((g) => g.canonicalKey === parsed.canonicalKey);
    return { parsed, found };
  }, [lookupUrl, data.globalFacebookPages]);

  const filteredGlobalPages = useMemo(() => {
    if (!globalSearch.trim()) return data.globalFacebookPages;
    const q = globalSearch.toLowerCase();
    return data.globalFacebookPages.filter(
      (g) =>
        g.normalizedUrl.toLowerCase().includes(q) ||
        g.rawUrl.toLowerCase().includes(q) ||
        g.ownerUserCode.toLowerCase().includes(q) ||
        (g.ownerName || '').toLowerCase().includes(q),
    );
  }, [data.globalFacebookPages, globalSearch]);

  // Daily Instruction publisher
  const [insTitle, setInsTitle] = useState('');
  const [insDate, setInsDate] = useState(getTodayDateKey());
  const [insVideoUrl, setInsVideoUrl] = useState('');
  const [insDesc, setInsDesc] = useState('');
  const [insGuide, setInsGuide] = useState('');
  const [publishingIns, setPublishingIns] = useState(false);

  // Daily submission rejection note
  const [subReasons, setSubReasons] = useState<Record<string, string>>({});

  if (!userProfile) return null;

  const filteredPages = data.facebookPages.filter((p) => {
    if (linkFilter !== 'ALL' && p.status !== linkFilter) return false;
    if (linkSearch.trim()) {
      const q = linkSearch.toLowerCase();
      return (
        p.rawUrl.toLowerCase().includes(q) ||
        p.normalizedUrl.toLowerCase().includes(q) ||
        p.userCode.toLowerCase().includes(q) ||
        (p.userName || '').toLowerCase().includes(q)
      );
    }
    return true;
  });

  const handlePublishInstruction = async (e: React.FormEvent) => {
    e.preventDefault();
    setPublishingIns(true);
    try {
      const activeUserIds = data.users
        .filter((u) => u.trainingVerified && u.accountStatus === 'active')
        .map((u) => u.uid);
      await adminSaveDailyInstruction(
        userProfile,
        {
          title: insTitle,
          description: insDesc,
          guidelines: insGuide,
          videoUrl: insVideoUrl,
          taskDate: insDate,
          isActive: true,
        },
        activeUserIds,
      );
      setInsTitle('');
      setInsDesc('');
      setInsGuide('');
      setInsVideoUrl('');
      pushToast(
        'success',
        'Daily Work Instruction Published',
        `Visible on dashboards and notified ${activeUserIds.length} active creator(s).`,
      );
    } catch (err) {
      pushToast('error', 'Publish Failed', err instanceof Error ? err.message : 'Unable to save.');
    } finally {
      setPublishingIns(false);
    }
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">
          Work Plans, Facebook Links &amp; Daily Video Verification
        </h1>
        <p className="text-sm text-slate-600 mt-1">
          Approve work plans, manually review submitted Facebook page links, inspect global URL
          ownership, publish daily video instructions, and verify creator task proofs.
        </p>
      </div>

      {/* Pending Work Plan Payments */}
      {data.planPurchases.some((p) => p.paymentStatus === 'pending') ? (
        <div className="bg-white border border-amber-300 rounded-xl overflow-hidden">
          <div className="px-6 py-4 bg-amber-50 border-b border-amber-200">
            <h2 className="text-sm font-bold text-amber-900">
              Pending Work Plan Payment Approvals
            </h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 font-semibold text-slate-600">
                  <th className="py-3 px-4">User</th>
                  <th className="py-3 px-4">Plan</th>
                  <th className="py-3 px-4 text-right">Fee</th>
                  <th className="py-3 px-4">UTR</th>
                  <th className="py-3 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {data.planPurchases
                  .filter((p) => p.paymentStatus === 'pending')
                  .map((p) => (
                    <tr key={p.id}>
                      <td className="py-3 px-4">
                        <span className="font-semibold text-slate-900">{p.userName}</span> ({p.userCode})
                      </td>
                      <td className="py-3 px-4 font-mono font-bold">{p.planPages} Pages</td>
                      <td className="py-3 px-4 text-right font-mono">{formatINR(p.planPrice)}</td>
                      <td className="py-3 px-4 font-mono">{p.utrNumber}</td>
                      <td className="py-3 px-4 text-right space-x-2">
                        <button
                          type="button"
                          onClick={async () => {
                            await adminVerifyPlanPurchase(userProfile, p, 'approved', 'Approved');
                            pushToast('success', 'Work Plan Approved', `${p.userName} can now upload links.`);
                          }}
                          className="px-3 py-1.5 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-md"
                        >
                          Approve
                        </button>
                        <button
                          type="button"
                          onClick={async () => {
                            await adminVerifyPlanPurchase(userProfile, p, 'rejected', 'Payment not verified');
                            pushToast('info', 'Work Plan Rejected', `${p.userName} notified.`);
                          }}
                          className="px-3 py-1.5 text-xs font-semibold text-rose-700 bg-rose-50 border border-rose-200 rounded-md"
                        >
                          Reject
                        </button>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : null}

      {/* Global Duplicate URL Ownership Lookup & Full Registry */}
      <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-bold text-slate-900">
              Global Facebook Page Ownership Lookup &amp; Registry ({data.globalFacebookPages.length} Registered Globally)
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Paste any Facebook Page URL (with or without www/m/tracking params) to verify ownership,
              or browse the full global duplicate-prevention database below.
            </p>
          </div>
        </div>
        <div className="flex flex-col sm:flex-row gap-3">
          <input
            type="text"
            value={lookupUrl}
            onChange={(e) => setLookupUrl(e.target.value)}
            placeholder="Instant check: https://m.facebook.com/examplepage?fbclid=12345"
            className="flex-1 px-3.5 py-2 text-xs font-mono bg-slate-50 border border-slate-300 rounded-lg"
          />
          <div className="relative sm:w-64">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={globalSearch}
              onChange={(e) => setGlobalSearch(e.target.value)}
              placeholder="Filter global registry..."
              className="w-full pl-8 pr-3 py-2 text-xs bg-white border border-slate-200 rounded-lg"
            />
          </div>
        </div>
        {lookupResult ? (
          'error' in lookupResult ? (
            <div className="text-xs text-rose-700">{lookupResult.error}</div>
          ) : lookupResult.found ? (
            <div className="text-xs bg-violet-50 border border-violet-200 rounded-lg p-3 text-violet-900">
              <span className="font-bold">Already Registered!</span> Canonical URL:{' '}
              <span className="font-mono">{lookupResult.parsed.normalizedUrl}</span> · Owned by{' '}
              <span className="font-bold">{lookupResult.found.ownerName || lookupResult.found.ownerUserCode}</span> (
              <span className="font-mono">{lookupResult.found.ownerUserCode}</span>) on{' '}
              {formatTimestamp(lookupResult.found.createdAt)}.
            </div>
          ) : (
            <div className="text-xs text-emerald-700 font-medium">
              Available — Canonical URL <span className="font-mono">{lookupResult.parsed.normalizedUrl}</span> is not registered by any user.
            </div>
          )
        ) : null}

        {/* Full Global Registered Facebook Pages Registry Table */}
        <div className="border border-slate-200 rounded-lg overflow-hidden">
          <div className="overflow-x-auto max-h-56 overflow-y-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 font-semibold text-slate-600">
                  <th className="py-2.5 px-3">Canonical URL (Unique Lock)</th>
                  <th className="py-2.5 px-3">Owner User</th>
                  <th className="py-2.5 px-3">Registered At</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredGlobalPages.length === 0 ? (
                  <tr>
                    <td colSpan={3} className="py-5 text-center text-slate-500">
                      No globally registered Facebook pages match your filter.
                    </td>
                  </tr>
                ) : (
                  filteredGlobalPages.map((g) => (
                    <tr key={g.canonicalKey} className="hover:bg-slate-50/70">
                      <td className="py-2 px-3 font-mono text-violet-700 max-w-md truncate">
                        <a
                          href={g.rawUrl.startsWith('http') ? g.rawUrl : `https://${g.rawUrl}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="hover:underline"
                        >
                          {g.normalizedUrl}
                        </a>
                      </td>
                      <td className="py-2 px-3">
                        <span className="font-semibold text-slate-900">{g.ownerName || g.ownerUserCode}</span>{' '}
                        <span className="font-mono text-slate-500">({g.ownerUserCode})</span>
                      </td>
                      <td className="py-2 px-3 text-slate-500 whitespace-nowrap">
                        {formatTimestamp(g.createdAt)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* All Submitted Facebook Page Links */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <div className="p-5 border-b border-slate-200 flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          <h2 className="text-base font-bold text-slate-900">
            Submitted Facebook Page Links ({filteredPages.length})
          </h2>
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={linkSearch}
                onChange={(e) => setLinkSearch(e.target.value)}
                placeholder="Search user or URL..."
                className="pl-8 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg"
              />
            </div>
            <select
              value={linkFilter}
              onChange={(e) => setLinkFilter(e.target.value as 'ALL' | FacebookPageStatus)}
              className="px-3 py-1.5 text-xs bg-white border border-slate-200 rounded-lg"
            >
              <option value="ALL">All Statuses</option>
              {PAGE_STATUS_OPTIONS.map((st) => (
                <option key={st} value={st}>
                  {st}
                </option>
              ))}
            </select>
          </div>
        </div>
        <div className="overflow-x-auto max-h-[420px] overflow-y-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 font-semibold text-slate-600">
                <th className="py-3 px-4">User / Slot</th>
                <th className="py-3 px-4">Facebook Page Link</th>
                <th className="py-3 px-4">Current Status</th>
                <th className="py-3 px-4">Update Status / Reason</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredPages.length === 0 ? (
                <tr>
                  <td colSpan={4} className="py-8 text-center text-slate-500">
                    No Facebook page links found.
                  </td>
                </tr>
              ) : (
                filteredPages.map((pg) => (
                  <tr key={pg.id} className="hover:bg-slate-50/70">
                    <td className="py-3 px-4">
                      <div className="font-semibold text-slate-900">
                        {pg.userName || pg.userCode}
                      </div>
                      <div className="font-mono text-[11px] text-slate-500">
                        {pg.userCode} · Slot #{pg.slotIndex}/{pg.planPages}
                      </div>
                    </td>
                    <td className="py-3 px-4 max-w-xs">
                      <a
                        href={pg.rawUrl.startsWith('http') ? pg.rawUrl : `https://${pg.rawUrl}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="font-mono text-violet-700 hover:underline block truncate"
                      >
                        {pg.normalizedUrl}
                      </a>
                      {pg.rejectionReason ? (
                        <div className="text-[11px] text-rose-700">{pg.rejectionReason}</div>
                      ) : null}
                    </td>
                    <td className="py-3 px-4">
                      <StatusText status={pg.status} />
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex flex-wrap items-center gap-2">
                        <input
                          type="text"
                          value={rejectReasons[pg.id] || ''}
                          onChange={(e) =>
                            setRejectReasons((prev) => ({ ...prev, [pg.id]: e.target.value }))
                          }
                          placeholder="Reason (optional)"
                          className="px-2 py-1 text-xs border border-slate-300 rounded-md w-36"
                        />
                        <select
                          value={pg.status}
                          onChange={async (e) => {
                            const nextStatus = e.target.value as FacebookPageStatus;
                            await adminUpdateFacebookPageStatus(
                              userProfile,
                              pg,
                              nextStatus,
                              rejectReasons[pg.id] || '',
                            );
                            pushToast('success', 'Page Updated', `Slot #${pg.slotIndex} -> ${nextStatus}`);
                          }}
                          className="px-2.5 py-1 text-xs font-semibold bg-white border border-slate-300 rounded-md"
                        >
                          {PAGE_STATUS_OPTIONS.map((st) => (
                            <option key={st} value={st}>
                              {st}
                            </option>
                          ))}
                        </select>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Daily Instructions Publisher + Daily Submissions Verification */}
      <div className="grid lg:grid-cols-12 gap-6">
        <form
          onSubmit={handlePublishInstruction}
          className="lg:col-span-5 bg-white border border-slate-200 rounded-xl p-6 space-y-4"
        >
          <h2 className="text-base font-bold text-slate-900">
            Publish Daily Video Work Instruction
          </h2>
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <label className="block text-xs font-semibold text-slate-700 mb-1">Video / Task Title *</label>
              <input
                type="text"
                required
                value={insTitle}
                onChange={(e) => setInsTitle(e.target.value)}
                placeholder="e.g., Day 3 — Tech Tips Reel Upload"
                className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-lg"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Task Date *</label>
              <input
                type="date"
                required
                value={insDate}
                onChange={(e) => setInsDate(e.target.value)}
                className="w-full px-3 py-2 text-xs font-mono bg-white border border-slate-300 rounded-lg"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Reference Video URL
              </label>
              <input
                type="url"
                value={insVideoUrl}
                onChange={(e) => setInsVideoUrl(e.target.value)}
                placeholder="https://drive.google.com/..."
                className="w-full px-3 py-2 text-xs font-mono bg-white border border-slate-300 rounded-lg"
              />
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Description *</label>
            <textarea
              rows={3}
              required
              value={insDesc}
              onChange={(e) => setInsDesc(e.target.value)}
              placeholder="Explain exactly which video to upload and required caption/hashtags..."
              className="w-full p-3 text-xs bg-white border border-slate-300 rounded-lg"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Work Guidelines (Optional)
            </label>
            <textarea
              rows={2}
              value={insGuide}
              onChange={(e) => setInsGuide(e.target.value)}
              placeholder="Compliance notes, posting window..."
              className="w-full p-3 text-xs bg-white border border-slate-300 rounded-lg"
            />
          </div>
          <button
            type="submit"
            disabled={publishingIns}
            className="w-full py-2.5 text-xs font-semibold text-white bg-violet-700 hover:bg-violet-800 disabled:opacity-50 rounded-lg"
          >
            {publishingIns ? 'Publishing & Notifying...' : 'Publish Daily Task & Notify Creators'}
          </button>

          {/* Existing Published Daily Instructions Management */}
          {data.dailyInstructions.length > 0 ? (
            <div className="pt-4 border-t border-slate-200 space-y-2">
              <div className="text-xs font-bold text-slate-900">
                Published Instructions ({data.dailyInstructions.length})
              </div>
              <div className="max-h-52 overflow-y-auto divide-y divide-slate-100 border border-slate-200 rounded-lg">
                {data.dailyInstructions.map((ins) => (
                  <div key={ins.id} className="p-3 flex items-start justify-between gap-2 text-xs">
                    <div className="min-w-0">
                      <div className="font-semibold text-slate-900 truncate">{ins.title}</div>
                      <div className="text-[11px] font-mono text-slate-500">
                        {ins.taskDate} · {ins.isActive ? 'Active' : 'Paused'}
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        type="button"
                        onClick={async () => {
                          await adminSaveDailyInstruction(userProfile, {
                            id: ins.id,
                            title: ins.title,
                            description: ins.description,
                            guidelines: ins.guidelines || '',
                            videoUrl: ins.videoUrl || '',
                            taskDate: ins.taskDate,
                            isActive: !ins.isActive,
                          });
                          pushToast(
                            'info',
                            ins.isActive ? 'Instruction Paused' : 'Instruction Activated',
                            ins.title,
                          );
                        }}
                        className="px-2 py-1 text-[11px] font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded"
                      >
                        {ins.isActive ? 'Pause' : 'Activate'}
                      </button>
                      <button
                        type="button"
                        onClick={async () => {
                          await adminDeleteDailyInstruction(userProfile, ins.id, ins.title);
                          pushToast('info', 'Instruction Deleted', ins.title);
                        }}
                        className="p-1 text-rose-600 hover:bg-rose-50 rounded"
                        title="Delete instruction"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : null}
        </form>

        <div className="lg:col-span-7 bg-white border border-slate-200 rounded-xl overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-200">
            <h2 className="text-base font-bold text-slate-900">
              Daily Video Upload Verification Queue ({data.dailySubmissions.length})
            </h2>
          </div>
          <div className="overflow-x-auto max-h-[480px] overflow-y-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 font-semibold text-slate-600">
                  <th className="py-3 px-4">Creator / Date</th>
                  <th className="py-3 px-4">Proof Video URL</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Verification Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {data.dailySubmissions.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="py-8 text-center text-slate-500">
                      No daily work proofs submitted yet.
                    </td>
                  </tr>
                ) : (
                  data.dailySubmissions.map((sub) => (
                    <tr key={sub.id} className="hover:bg-slate-50/70">
                      <td className="py-3 px-4">
                        <div className="font-semibold text-slate-900">{sub.userName || sub.userCode}</div>
                        <div className="font-mono text-[11px] text-slate-500">
                          {sub.workDate} · {sub.weekKey}
                        </div>
                      </td>
                      <td className="py-3 px-4 max-w-[200px]">
                        <a
                          href={sub.proofUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="font-mono text-violet-700 hover:underline block truncate"
                        >
                          {sub.proofUrl}
                        </a>
                        <div className="text-[11px] text-slate-500 truncate">{sub.pageUrl}</div>
                      </td>
                      <td className="py-3 px-4">
                        <StatusText status={sub.status} />
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <input
                            type="text"
                            value={subReasons[sub.id] || ''}
                            onChange={(e) =>
                              setSubReasons((prev) => ({ ...prev, [sub.id]: e.target.value }))
                            }
                            placeholder="Rejection note"
                            className="px-2 py-1 text-xs border border-slate-300 rounded-md w-28"
                          />
                          <select
                            value={sub.status}
                            onChange={async (e) => {
                              const nextSt = e.target.value as DailySubmissionStatus;
                              await adminVerifyDailySubmission(
                                userProfile,
                                sub.id,
                                sub.userId,
                                sub.pageId,
                                nextSt,
                                nextSt === 'Rejected'
                                  ? subReasons[sub.id] || 'Did not follow official video instructions'
                                  : '',
                              );
                              pushToast('success', `Submission -> ${nextSt}`, 'Updated.');
                            }}
                            className="px-2 py-1 text-xs font-semibold bg-white border border-slate-300 rounded-md"
                          >
                            {DAILY_SUBMISSION_STATUSES.map((st) => (
                              <option key={st} value={st}>
                                {st}
                              </option>
                            ))}
                          </select>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

// ==================== 4. 7TH-DAY WEEKLY VERIFICATION CONSOLE ====================
export function AdminWeeklyVerificationTab({ data }: { data: AdminDataset }) {
  const { userProfile, settings, pushToast } = useApp();
  const [selectedUserId, setSelectedUserId] = useState('');
  const [weekKey, setWeekKey] = useState(getCurrentWeekKey());
  const [checkedPages, setCheckedPages] = useState<Record<string, boolean>>({});
  const [expandedPageId, setExpandedPageId] = useState<string | null>(null);
  const [adminNotes, setAdminNotes] = useState('');
  const [approving, setApproving] = useState(false);
  const [rejecting, setRejecting] = useState(false);

  if (!userProfile) return null;

  const eligiblePlans = data.planPurchases.filter((p) => p.paymentStatus === 'approved');
  const targetUser = data.users.find((u) => u.uid === selectedUserId) || null;
  const targetPlan =
    eligiblePlans.find((p) => p.userId === selectedUserId) || null;

  const userPages = useMemo(
    () =>
      targetPlan
        ? data.facebookPages
            .filter((p) => p.userId === selectedUserId && p.planPurchaseId === targetPlan.id)
            .sort((a, b) => a.slotIndex - b.slotIndex)
        : [],
    [data.facebookPages, selectedUserId, targetPlan],
  );

  const userWeekSubmissions = useMemo(
    () =>
      data.dailySubmissions.filter(
        (s) => s.userId === selectedUserId && s.weekKey === weekKey,
      ),
    [data.dailySubmissions, selectedUserId, weekKey],
  );

  const userWeekActivity = useMemo(
    () =>
      data.pageActivityRecords.filter(
        (r) => r.userId === selectedUserId && r.weekKey === weekKey,
      ),
    [data.pageActivityRecords, selectedUserId, weekKey],
  );

  const selectUserForAudit = (uid: string, wk?: string) => {
    setSelectedUserId(uid);
    setExpandedPageId(null);
    if (wk) setWeekKey(wk);
    const plan = eligiblePlans.find((p) => p.userId === uid);
    const pages = plan
      ? data.facebookPages.filter((p) => p.userId === uid && p.planPurchaseId === plan.id)
      : [];
    const initialMap: Record<string, boolean> = {};
    pages.forEach((p) => {
      initialMap[p.id] = p.status === 'Work Active' || p.status === 'Approved';
    });
    setCheckedPages(initialMap);
  };

  const currentlyActiveCount = userPages.filter(
    (p) => p.status === 'Work Active' || p.status === 'Approved',
  ).length;
  const verifiedCount = userPages.filter((p) => checkedPages[p.id]).length;
  const deactivatedCount = userPages.filter(
    (p) => p.status === 'Page Deactivated' || p.status === 'Work Discontinued',
  ).length;
  const rejectedPagesCount = userPages.filter((p) => p.status === 'Rejected').length;
  const rejectedWorkCount = userWeekSubmissions.filter((s) => s.status === 'Rejected').length;

  const currentVerificationRecord = data.weeklyVerifications.find(
    (v) => v.userId === selectedUserId && v.weekKey === weekKey,
  );
  const weeklyWorkStatus = currentVerificationRecord
    ? currentVerificationRecord.status === 'approved'
      ? 'Approved & Credited'
      : currentVerificationRecord.status === 'rejected'
        ? 'Rejected'
        : 'Requested (Pending Audit)'
    : targetPlan?.workStarted
      ? 'Work Active (Awaiting Day 7)'
      : 'Not Started';

  const monthlyRate = targetPlan
    ? targetPlan.planPages === 50
      ? settings.plan50MonthlySalary
      : targetPlan.planPages === 100
        ? settings.plan100MonthlySalary
        : settings.plan150MonthlySalary
    : 0;
  const weeklyCommRate = targetPlan
    ? targetPlan.planPages === 50
      ? settings.plan50WeeklyCommission
      : targetPlan.planPages === 100
        ? settings.plan100WeeklyCommission
        : settings.plan150WeeklyCommission
    : 0;

  const previewSalary = targetPlan
    ? calculateWeeklySalary(monthlyRate, targetPlan.planPages, verifiedCount)
    : 0;
  const previewCommission =
    targetPlan && targetUser?.referredByUid
      ? calculateWeeklyCommission(weeklyCommRate, targetPlan.planPages, verifiedCount)
      : 0;

  const alreadyApprovedForWeek = currentVerificationRecord?.status === 'approved';

  const handleApproveAndCredit = async () => {
    if (!targetUser || !targetPlan) return;
    setApproving(true);
    try {
      const res = await adminApproveWeeklyVerification({
        admin: userProfile,
        targetUser,
        plan: targetPlan,
        settings,
        weekKey,
        verifiedActivePages: verifiedCount,
        deactivatedPages: deactivatedCount,
        rejectedPages: rejectedPagesCount,
        totalSubmittedPages: userPages.length,
        adminNotes,
      });
      pushToast(
        'success',
        'Weekly Earnings Credited!',
        `Credited ${formatINR(res.calculatedSalary)} Salary to ${targetUser.fullName}${
          res.calculatedCommission > 0
            ? ` and ${formatINR(res.calculatedCommission)} Affiliate Commission to referrer.`
            : '.'
        }`,
      );
      setAdminNotes('');
    } catch (err) {
      pushToast(
        'error',
        'Verification Blocked',
        err instanceof Error ? err.message : 'Unable to approve weekly audit.',
      );
    } finally {
      setApproving(false);
    }
  };

  const handleRejectVerification = async () => {
    if (!targetUser || !targetPlan) return;
    setRejecting(true);
    try {
      await adminRejectWeeklyVerification({
        admin: userProfile,
        targetUser,
        plan: targetPlan,
        settings,
        weekKey,
        verifiedActivePages: verifiedCount,
        deactivatedPages: deactivatedCount,
        rejectedPages: rejectedPagesCount,
        totalSubmittedPages: userPages.length,
        adminNotes,
      });
      pushToast('info', 'Weekly Verification Rejected', `${targetUser.fullName} has been notified.`);
      setAdminNotes('');
    } catch (err) {
      pushToast(
        'error',
        'Action Failed',
        err instanceof Error ? err.message : 'Unable to reject verification.',
      );
    } finally {
      setRejecting(false);
    }
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">
          7th-Day Weekly Verification &amp; Credit Console
        </h1>
        <p className="text-sm text-slate-600 mt-1">
          Inspect each creator&apos;s complete 7-day work records and mid-week deactivation history,
          confirm verified active pages, preview exact Salary &amp; Affiliate Commission formulas,
          and credit Wallets once per week.
        </p>
      </div>

      {/* Pending Requests + Manual Creator Selector */}
      <div className="grid lg:grid-cols-12 gap-6">
        <div className="lg:col-span-4 bg-white border border-slate-200 rounded-xl p-6 space-y-4">
          <h2 className="text-base font-bold text-slate-900">Select Creator &amp; Week to Audit</h2>
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Work Week Key</label>
            <input
              type="text"
              value={weekKey}
              onChange={(e) => setWeekKey(e.target.value)}
              className="w-full px-3 py-2 text-xs font-mono bg-white border border-slate-300 rounded-lg"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Creators with Approved Plans ({eligiblePlans.length})
            </label>
            <div className="divide-y divide-slate-100 border border-slate-200 rounded-lg max-h-96 overflow-y-auto">
              {eligiblePlans.length === 0 ? (
                <div className="p-4 text-xs text-slate-500">No creators have active plans yet.</div>
              ) : (
                eligiblePlans.map((pl) => {
                  const pendingReq = data.weeklyVerifications.find(
                    (v) => v.userId === pl.userId && v.status === 'requested',
                  );
                  const selected = selectedUserId === pl.userId;
                  return (
                    <button
                      key={pl.id}
                      type="button"
                      onClick={() => selectUserForAudit(pl.userId, pendingReq?.weekKey)}
                      className={`w-full text-left px-4 py-3 text-xs transition-colors flex items-center justify-between gap-2 ${
                        selected ? 'bg-violet-50' : 'hover:bg-slate-50'
                      }`}
                    >
                      <div>
                        <div className="font-bold text-slate-900">{pl.userName}</div>
                        <div className="font-mono text-[11px] text-slate-500">
                          {pl.userCode} · {pl.planPages} Pages Plan
                        </div>
                      </div>
                      {pendingReq ? <StatusText status="Requested" /> : <span className="text-[11px] text-slate-400">Audit</span>}
                    </button>
                  );
                })
              )}
            </div>
          </div>
        </div>

        {/* Active Audit Workspace — All 12 Required Verification Fields */}
        <div className="lg:col-span-8 bg-white border border-slate-200 rounded-xl p-6 space-y-5">
          {!targetUser || !targetPlan ? (
            <div className="py-12 text-center text-sm text-slate-500">
              Select a creator on the left to inspect all 12 audit metrics, 7-day work proof logs,
              and approve or reject weekly earnings.
            </div>
          ) : (
            <>
              <div className="flex flex-wrap items-start justify-between gap-4 pb-4 border-b border-slate-200">
                <div>
                  <div className="text-xs font-mono text-slate-500">
                    Cycle {weekKey} · Plan: {targetPlan.planPages} Pages
                  </div>
                  <h2 className="text-lg font-bold text-slate-900">
                    {targetUser.fullName}{' '}
                    <span className="font-mono text-sm font-semibold text-violet-700">
                      ({targetUser.userCode})
                    </span>
                  </h2>
                </div>
                <StatusText status={weeklyWorkStatus} />
              </div>

              {/* Explicit 10-Field Operational Audit Breakdown (Fields 1–10; Fields 11–12 below) */}
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 text-xs">
                <div className="bg-slate-50 border border-slate-200 rounded-lg p-3">
                  <div className="text-[11px] text-slate-500">Selected Work Plan</div>
                  <div className="font-mono font-bold text-slate-900 mt-0.5">
                    {targetPlan.planPages} Pages
                  </div>
                </div>
                <div className="bg-slate-50 border border-slate-200 rounded-lg p-3">
                  <div className="text-[11px] text-slate-500">Total Submitted</div>
                  <div className="font-mono font-bold text-slate-900 mt-0.5">{userPages.length}</div>
                </div>
                <div className="bg-slate-50 border border-slate-200 rounded-lg p-3">
                  <div className="text-[11px] text-slate-500">Currently Active</div>
                  <div className="font-mono font-bold text-emerald-700 mt-0.5">
                    {currentlyActiveCount}
                  </div>
                </div>
                <div className="bg-slate-50 border border-slate-200 rounded-lg p-3">
                  <div className="text-[11px] text-slate-500">Deactivated Pages</div>
                  <div className="font-mono font-bold text-rose-700 mt-0.5">{deactivatedCount}</div>
                </div>
                <div className="bg-slate-50 border border-slate-200 rounded-lg p-3">
                  <div className="text-[11px] text-slate-500">Rejected Pages / Work</div>
                  <div className="font-mono font-bold text-amber-700 mt-0.5">
                    {rejectedPagesCount} pg / {rejectedWorkCount} sub
                  </div>
                </div>
              </div>

              {/* Per-Page Checklist with Expandable 7-Day Proof History & Mid-Week Deactivation Alert */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-slate-900">
                    Approved Pages Audit ({verifiedCount} of {userPages.length} confirmed eligible)
                  </span>
                  <div className="space-x-3">
                    <button
                      type="button"
                      onClick={() => {
                        const all: Record<string, boolean> = {};
                        userPages.forEach((p) => {
                          all[p.id] = p.status === 'Work Active' || p.status === 'Approved';
                        });
                        setCheckedPages(all);
                      }}
                      className="text-violet-700 font-semibold hover:underline"
                    >
                      Check Active Only
                    </button>
                    <button
                      type="button"
                      onClick={() => setCheckedPages({})}
                      className="text-slate-500 hover:underline"
                    >
                      Uncheck All
                    </button>
                  </div>
                </div>

                <div className="max-h-72 overflow-y-auto border border-slate-200 rounded-lg divide-y divide-slate-100">
                  {userPages.length === 0 ? (
                    <div className="p-4 text-xs text-slate-500">
                      Creator has not uploaded any Facebook page links yet.
                    </div>
                  ) : (
                    userPages.map((pg) => {
                      const pageSubs = userWeekSubmissions.filter((s) => s.pageId === pg.id);
                      const approvedSubs = pageSubs.filter((s) => s.status === 'Approved').length;
                      const pageLogs = userWeekActivity.filter((r) => r.pageId === pg.id);
                      const wasDeactivatedMidWeek = pageLogs.some(
                        (r) => r.newStatus === 'Page Deactivated' || r.newStatus === 'Work Discontinued',
                      );
                      const isExpanded = expandedPageId === pg.id;

                      return (
                        <div key={pg.id} className="text-xs">
                          <div className="flex items-center justify-between gap-3 px-3.5 py-2.5 hover:bg-slate-50">
                            <label className="flex items-center gap-3 min-w-0 cursor-pointer flex-1">
                              <input
                                type="checkbox"
                                checked={Boolean(checkedPages[pg.id])}
                                onChange={(e) =>
                                  setCheckedPages((prev) => ({ ...prev, [pg.id]: e.target.checked }))
                                }
                                className="w-4 h-4 accent-violet-700 rounded shrink-0"
                              />
                              <div className="min-w-0">
                                <div className="font-mono text-slate-900 truncate flex items-center gap-2">
                                  <span>#{pg.slotIndex} — {pg.normalizedUrl}</span>
                                </div>
                                <div className="text-[11px] text-slate-500 flex flex-wrap items-center gap-2">
                                  <span>
                                    7-Day Approved Proofs: <strong>{approvedSubs}</strong> / {pageSubs.length}
                                  </span>
                                  {wasDeactivatedMidWeek ? (
                                    <span className="inline-flex items-center gap-1 font-semibold text-rose-700">
                                      <AlertTriangle className="w-3 h-3" />
                                      Mid-Week Deactivation Logged
                                    </span>
                                  ) : null}
                                </div>
                              </div>
                            </label>
                            <div className="flex items-center gap-2 shrink-0">
                              <StatusText status={pg.status} />
                              <button
                                type="button"
                                onClick={() => setExpandedPageId(isExpanded ? null : pg.id)}
                                className="p-1 text-slate-500 hover:text-slate-800 rounded"
                                title="Inspect 7-day work & activity history"
                              >
                                {isExpanded ? (
                                  <ChevronUp className="w-4 h-4" />
                                ) : (
                                  <ChevronDown className="w-4 h-4" />
                                )}
                              </button>
                            </div>
                          </div>

                          {isExpanded ? (
                            <div className="px-10 pb-3 pt-1 bg-slate-50/80 border-t border-slate-100 space-y-2 text-[11px]">
                              <div>
                                <div className="font-semibold text-slate-700 mb-1">
                                  7-Day Daily Video Proofs ({pageSubs.length})
                                </div>
                                {pageSubs.length === 0 ? (
                                  <div className="text-slate-500">No video proofs submitted for this page in {weekKey}.</div>
                                ) : (
                                  <div className="space-y-1">
                                    {pageSubs.map((s) => (
                                      <div key={s.id} className="flex items-center justify-between gap-2">
                                        <span className="font-mono text-slate-600">{s.workDate}</span>
                                        <a
                                          href={s.proofUrl}
                                          target="_blank"
                                          rel="noopener noreferrer"
                                          className="font-mono text-violet-700 hover:underline truncate flex-1"
                                        >
                                          {s.proofUrl}
                                        </a>
                                        <StatusText status={s.status} />
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </div>
                              <div>
                                <div className="font-semibold text-slate-700 mb-1">
                                  Mid-Week Status &amp; Deactivation History ({pageLogs.length})
                                </div>
                                {pageLogs.length === 0 ? (
                                  <div className="text-slate-500">No status transitions logged during {weekKey}.</div>
                                ) : (
                                  <div className="space-y-1">
                                    {pageLogs.map((log) => (
                                      <div key={log.id} className="text-slate-600">
                                        <span className="font-mono">{formatTimestamp(log.createdAt)}</span>:{' '}
                                        {log.previousStatus} →{' '}
                                        <strong className={log.newStatus === 'Page Deactivated' ? 'text-rose-700' : 'text-slate-900'}>
                                          {log.newStatus}
                                        </strong>
                                        {log.reason ? ` (${log.reason})` : ''}
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </div>
                            </div>
                          ) : null}
                        </div>
                      );
                    })
                  )}
                </div>
              </div>

              {/* Fields 11 & 12: Automatic Formula Preview */}
              <div className="grid sm:grid-cols-2 gap-4 bg-slate-50 border border-slate-200 rounded-xl p-4">
                <div>
                  <div className="text-xs text-slate-500">Calculated Weekly Salary</div>
                  <div className="text-2xl font-bold font-mono tabular-nums text-violet-700 mt-0.5">
                    {formatINR(previewSalary)}
                  </div>
                  <div className="text-[11px] font-mono text-slate-500 mt-1">
                    {formatINR(monthlyRate)} ÷ {targetPlan.planPages} × {verifiedCount} × 12 ÷ 52
                  </div>
                </div>
                <div>
                  <div className="text-xs text-slate-500">
                    Calculated Weekly Affiliate Commission
                  </div>
                  <div className="text-2xl font-bold font-mono tabular-nums text-emerald-700 mt-0.5">
                    {formatINR(previewCommission)}
                  </div>
                  <div className="text-[11px] font-mono text-slate-500 mt-1">
                    {targetUser.referredByUid
                      ? `${formatINR(weeklyCommRate)} ÷ ${targetPlan.planPages} × ${verifiedCount} (Direct Referrer)`
                      : 'No referrer linked to this user'}
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                <input
                  type="text"
                  value={adminNotes}
                  onChange={(e) => setAdminNotes(e.target.value)}
                  placeholder="Optional audit remarks or rejection reason for this 7-day cycle..."
                  className="w-full px-3.5 py-2 text-xs bg-white border border-slate-300 rounded-lg"
                />
                <div className="flex flex-col sm:flex-row gap-3">
                  <button
                    type="button"
                    disabled={approving || rejecting || alreadyApprovedForWeek}
                    onClick={handleApproveAndCredit}
                    className="flex-1 py-3 text-sm font-semibold text-white bg-violet-700 hover:bg-violet-800 disabled:opacity-50 rounded-lg transition-colors"
                  >
                    {approving
                      ? 'Crediting Wallets...'
                      : alreadyApprovedForWeek
                        ? `Week ${weekKey} Already Credited (Duplicate Blocked)`
                        : `Approve ${verifiedCount} Verified Pages & Credit Wallets`}
                  </button>
                  {!alreadyApprovedForWeek ? (
                    <button
                      type="button"
                      disabled={approving || rejecting}
                      onClick={handleRejectVerification}
                      className="px-5 py-3 text-sm font-semibold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 disabled:opacity-50 rounded-lg transition-colors whitespace-nowrap"
                    >
                      {rejecting ? 'Rejecting...' : 'Reject Weekly Audit'}
                    </button>
                  ) : null}
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Historical Weekly Verifications */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200">
          <h2 className="text-base font-bold text-slate-900">
            All Weekly Verification Records ({data.weeklyVerifications.length})
          </h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 font-semibold text-slate-600">
                <th className="py-3 px-4">Week</th>
                <th className="py-3 px-4">User</th>
                <th className="py-3 px-4 text-right">Verified Active</th>
                <th className="py-3 px-4 text-right">Weekly Salary</th>
                <th className="py-3 px-4 text-right">Affiliate Comm.</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">Updated</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {data.weeklyVerifications.map((v) => (
                <tr key={v.id}>
                  <td className="py-3 px-4 font-mono font-semibold text-slate-900">{v.weekKey}</td>
                  <td className="py-3 px-4">
                    {v.userName} <span className="font-mono text-slate-500">({v.userCode})</span>
                  </td>
                  <td className="py-3 px-4 text-right font-mono">
                    {v.verifiedActivePages}/{v.planPages}
                  </td>
                  <td className="py-3 px-4 text-right font-mono font-bold text-slate-900">
                    {formatINR(v.calculatedSalary)}
                  </td>
                  <td className="py-3 px-4 text-right font-mono font-semibold text-emerald-700">
                    {formatINR(v.calculatedCommission)}
                  </td>
                  <td className="py-3 px-4">
                    <StatusText status={v.status} />
                  </td>
                  <td className="py-3 px-4 text-slate-500">{formatTimestamp(v.updatedAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

import React, { useMemo, useState } from 'react';
import {
  AlertCircle,
  CheckCircle2,
  ExternalLink,
  Link2,
  Play,
  Search,
  Send,
  ShieldAlert,
  Upload,
  Video,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import {
  enrollWorkPlan,
  startWorkOnPlan,
  submitDailyWorkProof,
  submitFacebookPageLinkAtomic,
} from '../../lib/firestoreService';
import {
  canonicalizeFacebookUrl,
  formatINR,
  formatTimestamp,
  getPlanConfig,
  validateFacebookProofUrl,
} from '../../lib/utils';
import type { FacebookPageStatus, PlanPagesCount } from '../../types';
import { EmptyState, PaymentQrModal, StatusText } from '../CommonUI';

const ALL_PAGE_STATUSES: FacebookPageStatus[] = [
  'Pending Approval',
  'Approved',
  'Work Active',
  'Work Paused',
  'Rejected',
  'Page Deactivated',
  'Work Discontinued',
];

export function WorkPlansView() {
  const {
    userProfile,
    settings,
    planPurchases,
    myPages,
    dailyInstructions,
    mySubmissions,
    pushToast,
  } = useApp();

  const [selectedPlanToBuy, setSelectedPlanToBuy] = useState<PlanPagesCount | null>(null);
  const [enrolling, setEnrolling] = useState(false);

  // Per-slot URL input drafts
  const [slotInputs, setSlotInputs] = useState<Record<number, string>>({});
  const [slotErrors, setSlotErrors] = useState<Record<number, string>>({});
  const [submittingSlot, setSubmittingSlot] = useState<number | null>(null);
  const [globalDuplicateBanner, setGlobalDuplicateBanner] = useState('');
  const [visibleSlotPage, setVisibleSlotPage] = useState(1); // Paginate slots in clean blocks of 25

  // Bulk upload assist
  const [bulkMode, setBulkMode] = useState(false);
  const [bulkText, setBulkText] = useState('');
  const [bulkRunning, setBulkRunning] = useState(false);
  const [bulkSummary, setBulkSummary] = useState<{ added: number; errors: string[] } | null>(null);

  // Start work & daily submission state
  const [startingWork, setStartingWork] = useState(false);
  const [proofPageId, setProofPageId] = useState('');
  const [proofInstructionId, setProofInstructionId] = useState('');
  const [proofUrl, setProofUrl] = useState('');
  const [proofNotes, setProofNotes] = useState('');
  const [submittingProof, setSubmittingProof] = useState(false);

  if (!userProfile) return null;

  const activePlan =
    planPurchases.find((p) => p.id === userProfile.activePlanPurchaseId) ||
    planPurchases.find((p) => p.paymentStatus === 'approved') ||
    planPurchases[0] ||
    null;

  const planPages = useMemo(
    () =>
      activePlan
        ? myPages.filter((p) => p.planPurchaseId === activePlan.id)
        : [],
    [activePlan, myPages],
  );

  const pageBySlot = useMemo(() => {
    const map = new Map<number, (typeof planPages)[number]>();
    planPages.forEach((p) => map.set(p.slotIndex, p));
    return map;
  }, [planPages]);

  const approvedWorkPages = planPages.filter(
    (p) => p.status === 'Approved' || p.status === 'Work Active',
  );

  const planCards = ([50, 100, 150] as PlanPagesCount[]).map((cnt) =>
    getPlanConfig(settings, cnt),
  );

  const handlePlanSelect = async (pagesCount: PlanPagesCount) => {
    const cfg = getPlanConfig(settings, pagesCount);
    if (cfg.price <= 0) {
      setEnrolling(true);
      try {
        await enrollWorkPlan(userProfile, settings, pagesCount, '', '');
        pushToast(
          'success',
          `${pagesCount} Pages Plan Activated`,
          `Upload all ${pagesCount} unique Facebook Page links to unlock the Start Work button.`,
        );
      } catch (err) {
        pushToast(
          'error',
          'Activation Failed',
          err instanceof Error ? err.message : 'Unable to activate plan.',
        );
      } finally {
        setEnrolling(false);
      }
    } else {
      setSelectedPlanToBuy(pagesCount);
    }
  };

  const handlePlanQrSubmit = async (utrNumber: string, receiptUrl: string) => {
    if (!selectedPlanToBuy) return;
    setEnrolling(true);
    try {
      await enrollWorkPlan(userProfile, settings, selectedPlanToBuy, utrNumber, receiptUrl);
      setSelectedPlanToBuy(null);
      pushToast(
        'success',
        'Plan Payment Submitted',
        'Admin will verify your payment and activate your work plan.',
      );
    } catch (err) {
      pushToast(
        'error',
        'Submission Failed',
        err instanceof Error ? err.message : 'Could not submit plan payment.',
      );
    } finally {
      setEnrolling(false);
    }
  };

  const handleSlotSubmit = async (slotIndex: number) => {
    if (!activePlan) return;
    const raw = (slotInputs[slotIndex] || '').trim();
    setSubmittingSlot(slotIndex);
    setGlobalDuplicateBanner('');
    setSlotErrors((prev) => ({ ...prev, [slotIndex]: '' }));

    try {
      const result = await submitFacebookPageLinkAtomic(userProfile, activePlan, slotIndex, raw);
      if (!result.success) {
        setSlotErrors((prev) => ({ ...prev, [slotIndex]: result.error }));
        if (result.error.includes('Duplicate links are not allowed')) {
          setGlobalDuplicateBanner(result.error);
        }
        pushToast('error', `Slot #${slotIndex} Rejected`, result.error);
      } else {
        setSlotInputs((prev) => ({ ...prev, [slotIndex]: '' }));
        pushToast('success', `Slot #${slotIndex} Submitted`, 'Link registered globally and queued for Admin review.');
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Submission error.';
      setSlotErrors((prev) => ({ ...prev, [slotIndex]: msg }));
      pushToast('error', 'Error', msg);
    } finally {
      setSubmittingSlot(null);
    }
  };

  const handleBulkSubmit = async () => {
    if (!activePlan) return;
    const lines = bulkText
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter(Boolean);
    if (lines.length === 0) return;

    setBulkRunning(true);
    setGlobalDuplicateBanner('');
    const errors: string[] = [];
    let added = 0;

    // Find open slots sequentially
    const openSlots: number[] = [];
    for (let s = 1; s <= activePlan.planPages; s++) {
      if (!pageBySlot.has(s)) openSlots.push(s);
    }

    for (let i = 0; i < lines.length && i < openSlots.length; i++) {
      const slot = openSlots[i];
      const url = lines[i];
      const res = await submitFacebookPageLinkAtomic(userProfile, activePlan, slot, url);
      if (res.success) {
        added++;
      } else {
        errors.push(`Line ${i + 1} (${url.slice(0, 40)}): ${res.error}`);
        if (res.error.includes('Duplicate links are not allowed')) {
          setGlobalDuplicateBanner(res.error);
        }
      }
    }

    setBulkSummary({ added, errors });
    setBulkRunning(false);
    if (added > 0) {
      setBulkText('');
      pushToast('success', `Submitted ${added} Unique Links`, errors.length ? `${errors.length} links skipped due to validation/duplicates.` : 'All links registered globally.');
    } else if (errors.length > 0) {
      pushToast('error', 'Links Rejected', errors[0]);
    }
  };

  const handleStartWork = async () => {
    if (!activePlan) return;
    setStartingWork(true);
    try {
      await startWorkOnPlan(userProfile, activePlan);
      pushToast('success', 'Work Started!', `Your ${activePlan.planPages} Pages work cycle is now live.`);
    } catch (err) {
      pushToast(
        'error',
        'Cannot Start Work Yet',
        err instanceof Error ? err.message : 'Upload all required links first.',
      );
    } finally {
      setStartingWork(false);
    }
  };

  const handleSubmitProof = async (e: React.FormEvent) => {
    e.preventDefault();
    const page = planPages.find((p) => p.id === proofPageId);
    const instruction = dailyInstructions.find((ins) => ins.id === proofInstructionId) || dailyInstructions[0];
    if (!page) {
      pushToast('error', 'Select a Page', 'Choose an approved/active Facebook page first.');
      return;
    }
    if (!instruction) {
      pushToast('error', 'No Daily Task Published', 'Wait for Admin to publish today’s reference video instruction.');
      return;
    }
    const proofCheck = validateFacebookProofUrl(proofUrl);
    if (!proofCheck.valid) {
      pushToast('error', 'Invalid Facebook URL', proofCheck.error || 'Only Facebook video/post URLs are allowed.');
      return;
    }
    setSubmittingProof(true);
    try {
      await submitDailyWorkProof(userProfile, page, instruction, proofCheck.cleanUrl, proofNotes);
      setProofUrl('');
      setProofNotes('');
      pushToast('success', 'Daily Work Proof Submitted', 'Queued for Admin manual verification.');
    } catch (err) {
      pushToast('error', 'Submission Failed', err instanceof Error ? err.message : 'Unable to submit proof.');
    } finally {
      setSubmittingProof(false);
    }
  };

  const slotsPerPage = 25;
  const totalSlotPages = activePlan ? Math.ceil(activePlan.planPages / slotsPerPage) : 1;
  const startSlot = (visibleSlotPage - 1) * slotsPerPage + 1;
  const endSlot = activePlan ? Math.min(activePlan.planPages, visibleSlotPage * slotsPerPage) : 0;

  const allLinksUploaded = Boolean(
    activePlan && planPages.length >= activePlan.planPages,
  );

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">
          Facebook Page Work Plans
        </h1>
        <p className="text-sm text-slate-600 mt-1">
          Select a 50, 100, or 150 Facebook Pages plan. Upload all unique page links for your chosen
          plan to unlock the Start Work button.
        </p>
      </div>

      {/* 3 Work Plan Cards */}
      <div className="grid md:grid-cols-3 gap-5">
        {planCards.map((plan) => {
          const isCurrent = activePlan?.planPages === plan.pages && activePlan.paymentStatus !== 'rejected';
          return (
            <div
              key={plan.pages}
              className={`bg-white border rounded-xl p-6 flex flex-col justify-between gap-6 ${
                isCurrent ? 'border-violet-600 ring-1 ring-violet-600' : 'border-slate-200'
              }`}
            >
              <div className="space-y-4">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-semibold text-violet-700">{plan.subtitle}</span>
                  {isCurrent ? <StatusText status={activePlan?.paymentStatus === 'approved' ? 'Active' : 'Pending'} /> : null}
                </div>
                <div>
                  <h2 className="text-xl font-bold text-slate-900">{plan.title}</h2>
                  <div className="mt-2 flex items-baseline gap-1.5">
                    <span className="text-3xl font-bold font-mono tabular-nums text-slate-900">
                      {formatINR(plan.monthlySalary)}
                    </span>
                    <span className="text-xs text-slate-500">/ month potential</span>
                  </div>
                </div>

                <div className="space-y-2 pt-3 border-t border-slate-100 text-xs text-slate-600">
                  <div className="flex items-center justify-between">
                    <span>Required Unique FB Pages</span>
                    <span className="font-mono font-semibold text-slate-900">{plan.pages} Pages</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Full-Active Weekly Salary</span>
                    <span className="font-mono font-semibold text-slate-900">
                      {formatINR(plan.maxWeeklySalary)}/wk
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Affiliate Weekly Commission</span>
                    <span className="font-mono font-semibold text-emerald-700">
                      {formatINR(plan.weeklyCommission)}/wk
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Plan Enrollment Fee</span>
                    <span className="font-mono font-semibold text-slate-900">
                      {plan.price > 0 ? formatINR(plan.price) : 'Included (₹0)'}
                    </span>
                  </div>
                </div>
              </div>

              <button
                type="button"
                disabled={enrolling || Boolean(activePlan && activePlan.paymentStatus !== 'rejected')}
                onClick={() => handlePlanSelect(plan.pages)}
                className={`w-full py-2.5 text-sm font-semibold rounded-lg transition-colors whitespace-nowrap ${
                  isCurrent
                    ? 'bg-violet-50 text-violet-800 cursor-default'
                    : 'bg-violet-700 hover:bg-violet-800 text-white disabled:opacity-50'
                }`}
              >
                {isCurrent
                  ? 'Selected Plan'
                  : plan.price > 0
                    ? `Purchase ${plan.pages} Pages Plan`
                    : `Activate ${plan.pages} Pages Plan`}
              </button>
            </div>
          );
        })}
      </div>

      {/* Active Plan Link Uploader & Strict Upload-Before-Start Gate */}
      {activePlan ? (
        <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-6">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-5 border-b border-slate-200">
            <div>
              <div className="flex items-center gap-2 text-xs text-slate-500">
                <span className="font-semibold text-violet-700">
                  {activePlan.planPages} Pages Work Plan
                </span>
                <span aria-hidden="true">·</span>
                <span className="font-mono">
                  Uploaded: {planPages.length} / {activePlan.planPages}
                </span>
              </div>
              <h2 className="text-lg font-bold text-slate-900 mt-1">
                Submit Your {activePlan.planPages} Unique Facebook Page Links
              </h2>
              <p className="text-xs text-slate-600 mt-0.5">
                Every Facebook Page URL is checked globally at the database level. Duplicate links
                across any user account are strictly blocked.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              {activePlan.paymentStatus === 'pending' ? (
                <StatusText status="Plan Payment Pending Verification" />
              ) : activePlan.workStarted ? (
                <span className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-emerald-800 bg-emerald-50 border border-emerald-200 rounded-lg">
                  <CheckCircle2 className="w-4 h-4" />
                  Work Cycle Active ({activePlan.currentWeekKey})
                </span>
              ) : allLinksUploaded ? (
                /* STRICT REQUIREMENT: Start Work button ONLY appears once all 50/100/150 links are uploaded */
                <button
                  type="button"
                  disabled={startingWork}
                  onClick={handleStartWork}
                  className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg transition-colors whitespace-nowrap"
                >
                  <Play className="w-4 h-4" />
                  {startingWork ? 'Starting Work...' : 'Start Work Now'}
                </button>
              ) : (
                <div className="text-xs font-medium text-amber-800 bg-amber-50 border border-amber-200 rounded-lg px-3.5 py-2">
                  Upload remaining{' '}
                  <span className="font-mono font-bold">
                    {activePlan.planPages - planPages.length}
                  </span>{' '}
                  Facebook page links to unlock the Start Work button
                </div>
              )}
            </div>
          </div>

          {globalDuplicateBanner ? (
            <div className="flex items-start gap-3 bg-rose-50 border border-rose-300 rounded-xl p-4 text-rose-800">
              <ShieldAlert className="w-5 h-5 shrink-0 mt-0.5" />
              <div className="text-xs font-semibold leading-relaxed">{globalDuplicateBanner}</div>
            </div>
          ) : null}

          {/* Mode Toggle + Slot Pagination */}
          {activePlan.paymentStatus === 'approved' ? (
            <>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg">
                  <button
                    type="button"
                    onClick={() => setBulkMode(false)}
                    className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors ${
                      !bulkMode ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600'
                    }`}
                  >
                    Individual Input Fields (1–{activePlan.planPages})
                  </button>
                  <button
                    type="button"
                    onClick={() => setBulkMode(true)}
                    className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors ${
                      bulkMode ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600'
                    }`}
                  >
                    Bulk Paste Assistant
                  </button>
                </div>

                {!bulkMode ? (
                  <div className="flex items-center gap-1.5">
                    {Array.from({ length: totalSlotPages }, (_, idx) => idx + 1).map((pg) => (
                      <button
                        key={pg}
                        type="button"
                        onClick={() => setVisibleSlotPage(pg)}
                        className={`px-2.5 py-1 text-xs font-mono font-semibold rounded-md border transition-colors ${
                          visibleSlotPage === pg
                            ? 'bg-violet-700 text-white border-violet-700'
                            : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                        }`}
                      >
                        {(pg - 1) * slotsPerPage + 1}–{Math.min(activePlan.planPages, pg * slotsPerPage)}
                      </button>
                    ))}
                  </div>
                ) : null}
              </div>

              {bulkMode ? (
                <div className="space-y-4">
                  <p className="text-xs text-slate-600">
                    Paste up to {activePlan.planPages - planPages.length} Facebook Page URLs (one
                    URL per line). Each URL will be normalized and verified against the global
                    duplicate database automatically.
                  </p>
                  <textarea
                    rows={8}
                    value={bulkText}
                    onChange={(e) => setBulkText(e.target.value)}
                    placeholder={`https://www.facebook.com/yourpage1\nhttps://www.facebook.com/yourpage2\nhttps://www.facebook.com/profile.php?id=100083412345`}
                    className="w-full p-3.5 text-xs font-mono bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-600"
                  />
                  <div className="flex items-center justify-between gap-4">
                    <button
                      type="button"
                      disabled={bulkRunning || !bulkText.trim()}
                      onClick={handleBulkSubmit}
                      className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-semibold text-white bg-violet-700 hover:bg-violet-800 disabled:opacity-50 rounded-lg transition-colors"
                    >
                      <Upload className="w-4 h-4" />
                      {bulkRunning ? 'Checking Global Registry & Uploading...' : 'Validate & Upload Links'}
                    </button>
                  </div>
                  {bulkSummary ? (
                    <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 space-y-2 text-xs">
                      <div className="font-semibold text-emerald-700">
                        Successfully registered: {bulkSummary.added} unique Facebook pages.
                      </div>
                      {bulkSummary.errors.length > 0 ? (
                        <div className="space-y-1 text-rose-700">
                          <div className="font-semibold">
                            Blocked / Invalid ({bulkSummary.errors.length}):
                          </div>
                          {bulkSummary.errors.slice(0, 10).map((err, i) => (
                            <div key={i}>{err}</div>
                          ))}
                        </div>
                      ) : null}
                    </div>
                  ) : null}
                </div>
              ) : (
                <div className="space-y-2.5">
                  {Array.from({ length: endSlot - startSlot + 1 }, (_, i) => startSlot + i).map(
                    (slotNum) => {
                      const existing = pageBySlot.get(slotNum);
                      const draftVal = slotInputs[slotNum] || '';
                      const liveCheck = draftVal.trim() ? canonicalizeFacebookUrl(draftVal) : null;
                      const slotErr =
                        slotErrors[slotNum] ||
                        (liveCheck && !liveCheck.valid ? liveCheck.error || '' : '');
                      return (
                        <div
                          key={slotNum}
                          className="border border-slate-200 rounded-lg p-3 bg-slate-50/50 space-y-2"
                        >
                          <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                            <div className="text-xs font-mono font-bold text-slate-500 w-16 shrink-0">
                              Page #{String(slotNum).padStart(3, '0')}
                            </div>
                            {existing ? (
                              <div className="flex-1 flex flex-wrap items-center justify-between gap-2 min-w-0">
                                <a
                                  href={existing.rawUrl.startsWith('http') ? existing.rawUrl : `https://${existing.rawUrl}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-xs font-mono text-violet-700 hover:underline truncate flex items-center gap-1.5"
                                >
                                  <Link2 className="w-3.5 h-3.5 shrink-0" />
                                  <span className="truncate">{existing.rawUrl}</span>
                                </a>
                                <StatusText status={existing.status} />
                              </div>
                            ) : (
                              <div className="flex-1 flex flex-col sm:flex-row gap-2">
                                <input
                                  type="url"
                                  value={draftVal}
                                  onChange={(e) => {
                                    setSlotInputs((prev) => ({
                                      ...prev,
                                      [slotNum]: e.target.value,
                                    }));
                                    if (slotErrors[slotNum]) {
                                      setSlotErrors((prev) => ({ ...prev, [slotNum]: '' }));
                                    }
                                  }}
                                  placeholder="https://www.facebook.com/your-page-name (Facebook links only)"
                                  className={`flex-1 px-3 py-2 text-xs font-mono bg-white border rounded-lg focus:outline-none focus:ring-2 ${
                                    liveCheck && !liveCheck.valid
                                      ? 'border-rose-400 focus:ring-rose-500'
                                      : 'border-slate-300 focus:ring-violet-600'
                                  }`}
                                />
                                <button
                                  type="button"
                                  disabled={
                                    submittingSlot === slotNum ||
                                    !draftVal.trim() ||
                                    Boolean(liveCheck && !liveCheck.valid)
                                  }
                                  onClick={() => handleSlotSubmit(slotNum)}
                                  className="px-4 py-2 text-xs font-semibold text-white bg-violet-700 hover:bg-violet-800 disabled:opacity-50 rounded-lg transition-colors whitespace-nowrap shrink-0"
                                >
                                  {submittingSlot === slotNum ? 'Checking...' : 'Submit Link'}
                                </button>
                              </div>
                            )}
                          </div>
                          {slotErr ? (
                            <div className="flex items-start gap-1.5 text-xs text-rose-700 pl-0 sm:pl-19">
                              <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                              <span>{slotErr}</span>
                            </div>
                          ) : null}
                          {existing?.rejectionReason ? (
                            <div className="text-xs text-rose-700 pl-0 sm:pl-19">
                              Rejection Reason: {existing.rejectionReason}
                            </div>
                          ) : null}
                        </div>
                      );
                    },
                  )}
                </div>
              )}
            </>
          ) : null}
        </div>
      ) : null}

      {/* Daily Work Instructions & Video Upload Proof Verification */}
      <div className="grid lg:grid-cols-12 gap-6">
        <div className="lg:col-span-6 bg-white border border-slate-200 rounded-xl p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-slate-900">
              Admin Daily Video Instructions &amp; Guidelines
            </h2>
            <Video className="w-4 h-4 text-violet-700" />
          </div>
          <div className="bg-slate-50 border border-slate-200 rounded-lg p-3.5 text-xs text-slate-700 whitespace-pre-line leading-relaxed">
            {settings.workInstructionsGlobal}
          </div>
          {dailyInstructions.length === 0 ? (
            <p className="text-xs text-slate-500">
              No daily video tasks published yet. Admin will post daily reference videos here.
            </p>
          ) : (
            <div className="divide-y divide-slate-100">
              {dailyInstructions.map((ins) => (
                <div key={ins.id} className="py-3.5 space-y-1.5">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm font-semibold text-slate-900">{ins.title}</span>
                    <span className="text-xs font-mono text-slate-500">{ins.taskDate}</span>
                  </div>
                  <p className="text-xs text-slate-600 leading-relaxed">{ins.description}</p>
                  {ins.guidelines ? (
                    <p className="text-xs text-slate-500 whitespace-pre-line">{ins.guidelines}</p>
                  ) : null}
                  {ins.videoUrl ? (
                    <a
                      href={ins.videoUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 text-xs font-semibold text-violet-700 hover:underline"
                    >
                      Watch / Download Official Reference Video
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  ) : null}
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="lg:col-span-6 bg-white border border-slate-200 rounded-xl p-6 space-y-4">
          <h2 className="text-base font-bold text-slate-900">Submit Daily Video Upload Proof</h2>
          <p className="text-xs text-slate-600">
            Only approved work following Admin&apos;s official video counts toward your 7-day salary
            verification.
          </p>
          <form onSubmit={handleSubmitProof} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Select Approved / Active Facebook Page
              </label>
              <select
                required
                value={proofPageId}
                onChange={(e) => setProofPageId(e.target.value)}
                className="w-full px-3 py-2.5 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-600"
              >
                <option value="">-- Choose an approved page ({approvedWorkPages.length} available) --</option>
                {approvedWorkPages.map((p) => (
                  <option key={p.id} value={p.id}>
                    Slot #{p.slotIndex} — {p.normalizedUrl} ({p.status})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Daily Task Instruction
              </label>
              <select
                value={proofInstructionId}
                onChange={(e) => setProofInstructionId(e.target.value)}
                className="w-full px-3 py-2.5 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-600"
              >
                {dailyInstructions.length === 0 ? (
                  <option value="">No instructions published yet</option>
                ) : (
                  dailyInstructions.map((ins) => (
                    <option key={ins.id} value={ins.id}>
                      {ins.taskDate} — {ins.title}
                    </option>
                  ))
                )}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Uploaded Facebook Video / Post URL *
              </label>
              <input
                type="url"
                required
                value={proofUrl}
                onChange={(e) => setProofUrl(e.target.value)}
                placeholder="https://www.facebook.com/yourpage/videos/..."
                className={`w-full px-3 py-2.5 text-xs font-mono bg-white border rounded-lg focus:outline-none focus:ring-2 ${
                  proofUrl.trim() && !validateFacebookProofUrl(proofUrl).valid
                    ? 'border-rose-400 focus:ring-rose-500'
                    : 'border-slate-300 focus:ring-violet-600'
                }`}
              />
              {proofUrl.trim() && !validateFacebookProofUrl(proofUrl).valid ? (
                <p className="text-[11px] text-rose-700 mt-1 flex items-center gap-1">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                  <span>{validateFacebookProofUrl(proofUrl).error}</span>
                </p>
              ) : null}
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Notes (Optional)
              </label>
              <input
                type="text"
                value={proofNotes}
                onChange={(e) => setProofNotes(e.target.value)}
                placeholder="Any verification notes for Admin"
                className="w-full px-3 py-2.5 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-600"
              />
            </div>

            <button
              type="submit"
              disabled={submittingProof || approvedWorkPages.length === 0 || dailyInstructions.length === 0}
              className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-semibold text-white bg-violet-700 hover:bg-violet-800 disabled:opacity-50 rounded-lg transition-colors"
            >
              <Send className="w-4 h-4" />
              {submittingProof ? 'Submitting Proof...' : 'Submit Daily Work'}
            </button>
          </form>

          {/* Recent Submissions */}
          {mySubmissions.length > 0 ? (
            <div className="pt-4 border-t border-slate-200 space-y-2.5">
              <div className="text-xs font-bold text-slate-900">Recent Daily Submissions</div>
              <div className="max-h-56 overflow-y-auto divide-y divide-slate-100">
                {mySubmissions.slice(0, 10).map((s) => (
                  <div key={s.id} className="py-2.5 flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="text-xs font-semibold text-slate-900 truncate">
                        {s.instructionTitle || s.workDate}
                      </div>
                      <div className="text-[11px] font-mono text-slate-500 truncate">
                        {s.pageUrl} · {s.workDate}
                      </div>
                      {s.rejectionReason ? (
                        <div className="text-[11px] text-rose-700 mt-0.5">
                          Rejected: {s.rejectionReason}
                        </div>
                      ) : null}
                    </div>
                    <StatusText status={s.status} />
                  </div>
                ))}
              </div>
            </div>
          ) : null}
        </div>
      </div>

      <PaymentQrModal
        open={selectedPlanToBuy !== null}
        onClose={() => setSelectedPlanToBuy(null)}
        title={`Purchase ${selectedPlanToBuy || ''} Pages Work Plan`}
        amount={
          selectedPlanToBuy ? getPlanConfig(settings, selectedPlanToBuy).price : 0
        }
        settings={settings}
        submitting={enrolling}
        onSubmit={handlePlanQrSubmit}
      />
    </div>
  );
}

export function MyActivePagesView() {
  const { myPages, setUserView } = useApp();
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | FacebookPageStatus>('ALL');

  const filtered = useMemo(() => {
    return myPages.filter((p) => {
      if (statusFilter !== 'ALL' && p.status !== statusFilter) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return (
          p.rawUrl.toLowerCase().includes(q) ||
          p.normalizedUrl.toLowerCase().includes(q) ||
          String(p.slotIndex).includes(q)
        );
      }
      return true;
    });
  }, [myPages, searchQuery, statusFilter]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">My Active Pages</h1>
          <p className="text-sm text-slate-600 mt-1">
            Individual status tracking across all your submitted Facebook Pages. Rejected or
            deactivated pages do not generate weekly salary.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setUserView('work-plans')}
          className="px-4 py-2 text-sm font-semibold text-white bg-violet-700 hover:bg-violet-800 rounded-lg transition-colors whitespace-nowrap"
        >
          Manage &amp; Upload Links
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
        <div className="relative flex-1 max-w-sm">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by slot or Facebook URL..."
            className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-600"
          />
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0">
          <button
            type="button"
            onClick={() => setStatusFilter('ALL')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-md whitespace-nowrap transition-colors ${
              statusFilter === 'ALL'
                ? 'bg-violet-700 text-white'
                : 'bg-slate-100 text-slate-600 hover:text-slate-900'
            }`}
          >
            All ({myPages.length})
          </button>
          {ALL_PAGE_STATUSES.map((st) => {
            const cnt = myPages.filter((p) => p.status === st).length;
            return (
              <button
                key={st}
                type="button"
                onClick={() => setStatusFilter(st)}
                className={`px-3 py-1.5 text-xs font-semibold rounded-md whitespace-nowrap transition-colors ${
                  statusFilter === st
                    ? 'bg-violet-700 text-white'
                    : 'bg-slate-100 text-slate-600 hover:text-slate-900'
                }`}
              >
                {st} ({cnt})
              </button>
            );
          })}
        </div>
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          title="No Facebook Pages Match This Filter"
          description="Upload your unique Facebook Page links inside Work Plans to track approval status and daily activity here."
          actionLabel="Open Work Plans"
          onAction={() => setUserView('work-plans')}
        />
      ) : (
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-600">
                  <th className="py-3 px-4">Slot</th>
                  <th className="py-3 px-4">Facebook Page Link</th>
                  <th className="py-3 px-4">Plan</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Approved Tasks</th>
                  <th className="py-3 px-4">Last Work Date</th>
                  <th className="py-3 px-4">Updated</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {filtered.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-50/70">
                    <td className="py-3 px-4 font-mono font-semibold text-slate-700">
                      #{String(p.slotIndex).padStart(3, '0')}
                    </td>
                    <td className="py-3 px-4 max-w-xs">
                      <a
                        href={p.rawUrl.startsWith('http') ? p.rawUrl : `https://${p.rawUrl}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="font-mono text-violet-700 hover:underline block truncate"
                      >
                        {p.normalizedUrl}
                      </a>
                      {p.rejectionReason ? (
                        <div className="text-[11px] text-rose-700 mt-0.5">
                          Reason: {p.rejectionReason}
                        </div>
                      ) : null}
                    </td>
                    <td className="py-3 px-4 font-mono text-slate-600">{p.planPages} Pages</td>
                    <td className="py-3 px-4">
                      <StatusText status={p.status} />
                    </td>
                    <td className="py-3 px-4 text-right font-mono tabular-nums font-semibold text-slate-900">
                      {p.totalApprovedTasks || 0}
                    </td>
                    <td className="py-3 px-4 font-mono text-slate-600">{p.lastWorkDate || '—'}</td>
                    <td className="py-3 px-4 text-slate-500 whitespace-nowrap">
                      {formatTimestamp(p.updatedAt)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

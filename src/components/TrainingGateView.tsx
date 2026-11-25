import React, { useState } from 'react';
import {
  CheckCircle2,
  Clock,
  ExternalLink,
  Lock,
  LogOut,
  PlayCircle,
  ShieldCheck,
  Sparkles,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { submitTrainingPayment } from '../lib/firestoreService';
import { DEFAULT_TRAINING_BANNER, formatINR, formatTimestamp } from '../lib/utils';
import { PaymentQrModal, StatusText } from './CommonUI';

export function TrainingGateView({ isLockedGate = false }: { isLockedGate?: boolean }) {
  const {
    userProfile,
    isAdmin,
    setPortalMode,
    settings,
    trainingPurchases,
    pushToast,
    handleLogout,
    setUserView,
  } = useApp();
  const [qrOpen, setQrOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  if (!userProfile) return null;

  const isVerified = userProfile.trainingVerified;
  const latestPurchase = trainingPurchases[0] || null;
  const isPending = !isVerified && (userProfile.trainingStatus === 'pending' || latestPurchase?.status === 'pending');

  const handlePaySubmit = async (utrNumber: string, receiptUrl: string) => {
    setSubmitting(true);
    try {
      await submitTrainingPayment(userProfile, settings.trainingPrice, utrNumber, receiptUrl);
      setQrOpen(false);
      pushToast(
        'success',
        'Training Payment Submitted',
        'Your payment request has been sent to Admin for verification.',
      );
    } catch (err) {
      pushToast(
        'error',
        'Payment Submission Failed',
        err instanceof Error ? err.message : 'Unable to submit payment.',
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className={isLockedGate ? 'min-h-screen bg-slate-50' : ''}>
      {/* Minimal clean header when locked on Training Gate */}
      {isLockedGate ? (
        <header className="bg-white border-b border-slate-200 px-6 py-4">
          <div className="max-w-6xl mx-auto flex items-center justify-between gap-4">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-violet-700 flex items-center justify-center text-white font-bold text-sm">
                FE
              </div>
              <span className="text-base font-bold text-slate-900 whitespace-nowrap">Facebook Earner</span>
            </div>
            <div className="flex items-center gap-4">
              <div className="hidden sm:block text-right">
                <div className="text-xs font-semibold text-slate-900">{userProfile.fullName}</div>
                <div className="text-[11px] font-mono text-slate-500">ID: {userProfile.userCode}</div>
              </div>
              {isAdmin ? (
                <button
                  type="button"
                  onClick={() => setPortalMode('admin')}
                  className="px-3.5 py-2 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-lg transition-colors whitespace-nowrap"
                >
                  Open Admin Panel
                </button>
              ) : null}
              <button
                type="button"
                onClick={handleLogout}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors whitespace-nowrap"
              >
                <LogOut className="w-3.5 h-3.5" />
                Logout
              </button>
            </div>
          </div>
        </header>
      ) : null}

      <div className={isLockedGate ? 'max-w-6xl mx-auto px-6 py-10 space-y-8' : 'space-y-8'}>
        {/* Status Banner when Locked */}
        {isLockedGate ? (
          <div className="bg-white border border-slate-200 rounded-xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-start gap-3.5">
              <div className="w-10 h-10 rounded-lg bg-violet-50 border border-violet-200 flex items-center justify-center text-violet-700 shrink-0">
                {isPending ? <Clock className="w-5 h-5" /> : <Lock className="w-5 h-5" />}
              </div>
              <div>
                <h2 className="text-sm font-bold text-slate-900">
                  {isPending
                    ? 'Training Payment Submitted — Awaiting Admin Verification'
                    : 'Paid Training Access Required to Unlock Main Dashboard'}
                </h2>
                <p className="text-xs text-slate-600 mt-0.5 leading-relaxed">
                  {isPending
                    ? `Your payment of ${formatINR(latestPurchase?.amount || settings.trainingPrice)} (UTR: ${latestPurchase?.utrNumber || 'Submitted'}) is under review. Once verified by Admin, your Main Dashboard and all Work Plans unlock permanently.`
                    : 'Complete your one-time training registration below. Once verified by Admin, you will never need to purchase training again.'}
                </p>
              </div>
            </div>
            <div className="shrink-0">
              <StatusText status={isPending ? 'Pending Verification' : 'Locked'} />
            </div>
          </div>
        ) : null}

        {/* Training Hero Card (2-column stretched split) */}
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden grid lg:grid-cols-12 items-stretch">
          <div className="lg:col-span-6 bg-slate-100 min-h-[260px] relative">
            <img
              src={settings.trainingThumbnailUrl || DEFAULT_TRAINING_BANNER}
              alt={settings.trainingTitle}
              referrerPolicy="no-referrer"
              className="w-full h-full object-cover"
            />
          </div>
          <div className="lg:col-span-6 p-7 sm:p-8 flex flex-col justify-between gap-6">
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-xs text-slate-500">
                <span className="font-semibold text-violet-700">Official Onboarding Program</span>
                <span aria-hidden="true">·</span>
                <span>One-Time Lifetime Access</span>
                <span aria-hidden="true">·</span>
                <span>{settings.trainingContentModules.length} Core Modules</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900">
                {settings.trainingTitle}
              </h1>
              <p className="text-sm text-slate-600 leading-relaxed">
                {settings.trainingDescription}
              </p>

              <div className="pt-2 border-t border-slate-100">
                <div className="text-xs font-semibold text-slate-900 mb-2.5">Training Benefits</div>
                <ul className="space-y-2">
                  {settings.trainingBenefits.map((benefit, idx) => (
                    <li key={idx} className="flex items-start gap-2.5 text-xs text-slate-700">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                      <span>{benefit}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            <div className="pt-5 border-t border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <div className="text-xs font-medium text-slate-500">One-Time Training Fee</div>
                <div className="flex items-baseline gap-2 mt-0.5">
                  <span className="text-3xl font-bold font-mono tabular-nums text-slate-900">
                    {formatINR(settings.trainingPrice)}
                  </span>
                  <span className="text-xs text-slate-500">lifetime access</span>
                </div>
              </div>

              {isVerified ? (
                <div className="flex items-center gap-3">
                  <StatusText status="Verified" />
                  {!isLockedGate ? (
                    <button
                      type="button"
                      onClick={() => setUserView('work-plans')}
                      className="px-4 py-2.5 text-sm font-semibold text-white bg-violet-700 hover:bg-violet-800 rounded-lg transition-colors whitespace-nowrap"
                    >
                      Open Work Plans
                    </button>
                  ) : null}
                </div>
              ) : isPending ? (
                <button
                  type="button"
                  disabled
                  className="px-5 py-2.5 text-sm font-semibold text-amber-800 bg-amber-50 border border-amber-200 rounded-lg whitespace-nowrap cursor-not-allowed"
                >
                  Verification Pending
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => setQrOpen(true)}
                  className="inline-flex items-center justify-center gap-2 px-6 py-3 text-sm font-semibold text-white bg-violet-700 hover:bg-violet-800 rounded-lg transition-colors whitespace-nowrap"
                >
                  <Sparkles className="w-4 h-4" />
                  Purchase / Pay Now ({formatINR(settings.trainingPrice)})
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Training Access Details & Payment History */}
        <div className="grid lg:grid-cols-12 gap-6">
          <div className="lg:col-span-7 bg-white border border-slate-200 rounded-xl p-6 space-y-4">
            <h2 className="text-base font-bold text-slate-900">
              {isVerified ? 'Training Video Curriculum (Unlocked)' : 'Training Curriculum Preview'}
            </h2>
            <p className="text-xs text-slate-600 leading-relaxed">
              {settings.trainingAccessDetails}
            </p>
            <div className="divide-y divide-slate-100 border-t border-slate-100">
              {settings.trainingContentModules.map((mod) => (
                <div key={mod.id} className="py-4 flex items-start justify-between gap-4">
                  <div className="space-y-1">
                    <div className="text-sm font-semibold text-slate-900">{mod.title}</div>
                    <div className="text-xs text-slate-500">Duration: {mod.duration}</div>
                    <p className="text-xs text-slate-600 leading-relaxed">{mod.summary}</p>
                  </div>
                  {isVerified ? (
                    <a
                      href={mod.videoUrl || '#'}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-violet-700 bg-violet-50 hover:bg-violet-100 rounded-lg transition-colors whitespace-nowrap shrink-0"
                    >
                      <PlayCircle className="w-3.5 h-3.5" />
                      Watch
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-xs font-medium text-slate-400 whitespace-nowrap shrink-0">
                      <Lock className="w-3.5 h-3.5" />
                      Locked
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>

          <div className="lg:col-span-5 bg-white border border-slate-200 rounded-xl p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-bold text-slate-900">Your Training Payment History</h2>
              <ShieldCheck className="w-4 h-4 text-violet-700" />
            </div>
            {trainingPurchases.length === 0 ? (
              <p className="text-xs text-slate-500 leading-relaxed">
                No training payment submitted yet. Click &ldquo;Purchase / Pay Now&rdquo; to scan the
                official UPI QR code and submit your UTR reference for verification.
              </p>
            ) : (
              <div className="divide-y divide-slate-100">
                {trainingPurchases.map((p) => (
                  <div key={p.id} className="py-3 space-y-1.5">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-sm font-bold font-mono tabular-nums text-slate-900">
                        {formatINR(p.amount)}
                      </span>
                      <StatusText
                        status={
                          p.status === 'verified'
                            ? 'Verified'
                            : p.status === 'rejected'
                              ? 'Rejected'
                              : 'Pending Verification'
                        }
                      />
                    </div>
                    <div className="text-xs text-slate-600 font-mono">UTR: {p.utrNumber}</div>
                    <div className="text-[11px] text-slate-400">
                      Submitted {formatTimestamp(p.createdAt)}
                    </div>
                    {p.adminNote ? (
                      <div className="text-xs text-rose-700 bg-rose-50 border border-rose-200 rounded-md px-2.5 py-1.5">
                        Admin Note: {p.adminNote}
                      </div>
                    ) : null}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      <PaymentQrModal
        open={qrOpen}
        onClose={() => setQrOpen(false)}
        title={`Paid Training Registration — ${formatINR(settings.trainingPrice)}`}
        amount={settings.trainingPrice}
        settings={settings}
        submitting={submitting}
        onSubmit={handlePaySubmit}
      />
    </div>
  );
}

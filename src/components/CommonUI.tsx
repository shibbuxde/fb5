import React, { useState } from 'react';
import {
  AlertCircle,
  CheckCircle2,
  Clock,
  Copy,
  Info,
  PauseCircle,
  Upload,
  X,
  XCircle,
} from 'lucide-react';
import { compressImageToDataUrl, formatINR } from '../lib/utils';
import type { AdminSettings, ToastMessage } from '../types';

/**
 * Clean, high-contrast vector UPI QR placeholder displayed until Admin uploads a custom QR image.
 */
export function DefaultPaymentQrSvg({ className = 'w-52 h-52' }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 210 210"
      className={className}
      role="img"
      aria-label="Placeholder UPI Payment QR Code"
    >
      <rect width="210" height="210" rx="12" fill="#FFFFFF" stroke="#E2E8F0" strokeWidth="2" />
      {/* Corner violet alignment brackets */}
      <path d="M14 28 V14 H28" fill="none" stroke="#6D28D9" strokeWidth="3" strokeLinecap="round" />
      <path d="M182 14 H196 V28" fill="none" stroke="#6D28D9" strokeWidth="3" strokeLinecap="round" />
      <path d="M14 182 V196 H28" fill="none" stroke="#6D28D9" strokeWidth="3" strokeLinecap="round" />
      <path d="M182 196 H196 V182" fill="none" stroke="#6D28D9" strokeWidth="3" strokeLinecap="round" />

      {/* Top-left finder */}
      <rect x="26" y="26" width="46" height="46" rx="4" fill="#0F172A" />
      <rect x="34" y="34" width="30" height="30" rx="2" fill="#FFFFFF" />
      <rect x="42" y="42" width="14" height="14" rx="1" fill="#0F172A" />

      {/* Top-right finder */}
      <rect x="138" y="26" width="46" height="46" rx="4" fill="#0F172A" />
      <rect x="146" y="34" width="30" height="30" rx="2" fill="#FFFFFF" />
      <rect x="154" y="42" width="14" height="14" rx="1" fill="#0F172A" />

      {/* Bottom-left finder */}
      <rect x="26" y="138" width="46" height="46" rx="4" fill="#0F172A" />
      <rect x="34" y="146" width="30" height="30" rx="2" fill="#FFFFFF" />
      <rect x="42" y="154" width="14" height="14" rx="1" fill="#0F172A" />

      {/* Crisp deterministic data modules */}
      <g fill="#0F172A">
        <rect x="82" y="28" width="10" height="10" />
        <rect x="102" y="28" width="10" height="10" />
        <rect x="120" y="28" width="10" height="10" />
        <rect x="82" y="44" width="10" height="22" />
        <rect x="100" y="48" width="22" height="10" />
        <rect x="120" y="60" width="10" height="12" />

        <rect x="28" y="84" width="12" height="10" />
        <rect x="48" y="84" width="24" height="10" />
        <rect x="82" y="80" width="14" height="14" />
        <rect x="104" y="80" width="10" height="24" />
        <rect x="122" y="84" width="16" height="10" />
        <rect x="148" y="84" width="12" height="18" />
        <rect x="170" y="84" width="12" height="12" />

        <rect x="28" y="102" width="10" height="24" />
        <rect x="46" y="104" width="14" height="14" />
        <rect x="68" y="106" width="10" height="18" />
        <rect x="124" y="104" width="14" height="14" />
        <rect x="148" y="110" width="22" height="10" />
        <rect x="174" y="106" width="10" height="22" />

        <rect x="82" y="128" width="18" height="10" />
        <rect x="110" y="124" width="12" height="22" />
        <rect x="132" y="130" width="20" height="10" />
        <rect x="162" y="134" width="20" height="10" />

        <rect x="82" y="146" width="10" height="22" />
        <rect x="98" y="152" width="22" height="10" />
        <rect x="128" y="148" width="14" height="14" />
        <rect x="150" y="152" width="12" height="28" />
        <rect x="170" y="152" width="14" height="14" />

        <rect x="82" y="174" width="24" height="10" />
        <rect x="114" y="170" width="16" height="14" />
        <rect x="136" y="174" width="10" height="10" />
        <rect x="170" y="174" width="14" height="10" />
      </g>

      {/* Center UPI emblem */}
      <rect x="88" y="88" width="34" height="34" rx="6" fill="#6D28D9" />
      <text
        x="105"
        y="109"
        textAnchor="middle"
        fill="#FFFFFF"
        fontSize="11"
        fontWeight="700"
        fontFamily="Plus Jakarta Sans, sans-serif"
      >
        UPI
      </text>
    </svg>
  );
}

/**
 * Semantic status indicator with explicit icon + text label (zero pill boxes, never hue-only).
 */
export function StatusText({ status }: { status: string }) {
  const s = status.toLowerCase();
  if (
    s === 'verified' ||
    s === 'approved' ||
    s === 'work active' ||
    s === 'active' ||
    s === 'paid' ||
    s === 'completed' ||
    s === 'credited' ||
    s === 'replied'
  ) {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-700 whitespace-nowrap">
        <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
        <span>{status}</span>
      </span>
    );
  }
  if (
    s === 'rejected' ||
    s === 'page deactivated' ||
    s === 'work discontinued' ||
    s === 'revoked' ||
    s === 'suspended' ||
    s === 'flagged' ||
    s === 'inactive'
  ) {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-rose-700 whitespace-nowrap">
        <XCircle className="w-3.5 h-3.5 shrink-0" />
        <span>{status}</span>
      </span>
    );
  }
  if (s === 'work paused' || s === 'closed') {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 whitespace-nowrap">
        <PauseCircle className="w-3.5 h-3.5 shrink-0" />
        <span>{status}</span>
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-amber-700 whitespace-nowrap">
      <Clock className="w-3.5 h-3.5 shrink-0" />
      <span>{status}</span>
    </span>
  );
}

export function MetricCell({
  label,
  value,
  subtext,
  accent = false,
}: {
  label: string;
  value: string;
  subtext?: string;
  accent?: boolean;
}) {
  return (
    <div className="bg-white border border-slate-200 rounded-xl p-5">
      <div className="text-xs font-medium text-slate-500 mb-1.5">{label}</div>
      <div
        className={`text-2xl font-bold font-mono tabular-nums tracking-tight ${
          accent ? 'text-violet-700' : 'text-slate-900'
        }`}
      >
        {value}
      </div>
      {subtext ? <div className="text-xs text-slate-500 mt-1.5">{subtext}</div> : null}
    </div>
  );
}

export function EmptyState({
  title,
  description,
  actionLabel,
  onAction,
}: {
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
}) {
  return (
    <div className="bg-white border border-slate-200 rounded-xl p-10 text-center">
      <h3 className="text-base font-semibold text-slate-900 mb-1.5">{title}</h3>
      <p className="text-sm text-slate-500 max-w-md mx-auto mb-5">{description}</p>
      {actionLabel && onAction ? (
        <button
          type="button"
          onClick={onAction}
          className="px-4 py-2 text-sm font-semibold text-white bg-violet-700 hover:bg-violet-800 rounded-lg transition-colors whitespace-nowrap"
        >
          {actionLabel}
        </button>
      ) : null}
    </div>
  );
}

export function ModalShell({
  open,
  onClose,
  title,
  subtitle,
  children,
  maxWidth = 'max-w-lg',
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  maxWidth?: string;
}) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-[2px]">
      <div
        className={`w-full ${maxWidth} bg-white border border-slate-200 rounded-xl shadow-xl max-h-[90vh] flex flex-col overflow-hidden`}
      >
        <div className="flex items-start justify-between gap-4 px-6 py-4 border-b border-slate-200">
          <div>
            <h3 className="text-base font-bold text-slate-900">{title}</h3>
            {subtitle ? <p className="text-xs text-slate-500 mt-0.5">{subtitle}</p> : null}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close modal"
            className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="p-6 overflow-y-auto">{children}</div>
      </div>
    </div>
  );
}

export function PaymentQrModal({
  open,
  onClose,
  title,
  amount,
  settings,
  submitting,
  onSubmit,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  amount: number;
  settings: AdminSettings;
  submitting: boolean;
  onSubmit: (utrNumber: string, receiptUrl: string) => Promise<void>;
}) {
  const [utrNumber, setUtrNumber] = useState('');
  const [receiptUrl, setReceiptUrl] = useState('');
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);

  const handleCopyUpi = () => {
    navigator.clipboard.writeText(settings.paymentUpiId || 'facebookearner@upi');
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  };

  const handleReceiptFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const dataUrl = await compressImageToDataUrl(file, 720, 0.72);
      setReceiptUrl(dataUrl);
      setError('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to process receipt image.');
    }
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (utrNumber.trim().length < 4) {
      setError('Please enter a valid UPI UTR / Transaction Reference Number.');
      return;
    }
    setError('');
    await onSubmit(utrNumber.trim(), receiptUrl);
    setUtrNumber('');
    setReceiptUrl('');
  };

  return (
    <ModalShell
      open={open}
      onClose={onClose}
      title={title}
      subtitle="Scan the official UPI QR code below and submit your UTR reference for Admin verification."
      maxWidth="max-w-xl"
    >
      <div className="space-y-5">
        <div className="flex flex-col sm:flex-row items-center gap-6 bg-slate-50 border border-slate-200 rounded-xl p-5">
          <div className="shrink-0 bg-white border border-slate-200 rounded-xl p-2.5">
            {settings.paymentQrImageUrl ? (
              <img
                src={settings.paymentQrImageUrl}
                alt="Official UPI Payment QR Code"
                referrerPolicy="no-referrer"
                className="w-48 h-48 object-contain rounded-lg"
              />
            ) : (
              <DefaultPaymentQrSvg className="w-48 h-48" />
            )}
          </div>
          <div className="flex-1 space-y-3 text-center sm:text-left">
            <div>
              <div className="text-xs font-medium text-slate-500">Payable Amount</div>
              <div className="text-3xl font-bold font-mono tabular-nums text-violet-700 mt-0.5">
                {formatINR(amount)}
              </div>
            </div>
            <div>
              <div className="text-xs font-medium text-slate-500">Merchant / Payee</div>
              <div className="text-sm font-semibold text-slate-900">
                {settings.paymentMerchantName || 'Facebook Earner Operations'}
              </div>
            </div>
            <div>
              <div className="text-xs font-medium text-slate-500 mb-1">Official UPI ID</div>
              <div className="inline-flex items-center gap-2 bg-white border border-slate-200 rounded-lg px-3 py-1.5">
                <span className="text-xs font-mono font-semibold text-slate-800">
                  {settings.paymentUpiId || 'facebookearner@upi'}
                </span>
                <button
                  type="button"
                  onClick={handleCopyUpi}
                  className="text-violet-700 hover:text-violet-900 transition-colors"
                  title="Copy UPI ID"
                >
                  <Copy className="w-3.5 h-3.5" />
                </button>
              </div>
              {copied ? <span className="ml-2 text-xs text-emerald-700 font-medium">Copied</span> : null}
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              {settings.paymentInstructions}
            </p>
          </div>
        </div>

        <form onSubmit={handleFormSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              UPI UTR / Transaction Reference Number *
            </label>
            <input
              type="text"
              required
              value={utrNumber}
              onChange={(e) => setUtrNumber(e.target.value)}
              placeholder="e.g., 421983746512"
              className="w-full px-3.5 py-2.5 text-sm font-mono bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-600 focus:border-violet-600"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Payment Screenshot / Receipt (Optional)
            </label>
            <label className="flex items-center justify-center gap-2 px-4 py-3 border border-dashed border-slate-300 rounded-lg text-xs font-medium text-slate-600 hover:border-violet-500 hover:text-violet-700 cursor-pointer transition-colors">
              <Upload className="w-4 h-4" />
              <span>{receiptUrl ? 'Screenshot attached — click to replace' : 'Upload UPI payment screenshot (JPG/PNG)'}</span>
              <input type="file" accept="image/*" onChange={handleReceiptFile} className="hidden" />
            </label>
            {receiptUrl ? (
              <div className="mt-2 flex items-center gap-3">
                <img
                  src={receiptUrl}
                  alt="Uploaded receipt preview"
                  className="w-16 h-16 object-cover rounded-lg border border-slate-200"
                />
                <button
                  type="button"
                  onClick={() => setReceiptUrl('')}
                  className="text-xs font-medium text-rose-700 hover:underline"
                >
                  Remove screenshot
                </button>
              </div>
            ) : null}
          </div>

          {error ? (
            <div className="flex items-start gap-2 text-xs text-rose-700 bg-rose-50 border border-rose-200 rounded-lg p-3">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          ) : null}

          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-5 py-2.5 text-sm font-semibold text-white bg-violet-700 hover:bg-violet-800 disabled:opacity-60 rounded-lg transition-colors whitespace-nowrap"
            >
              {submitting ? 'Submitting Payment...' : `Submit ${formatINR(amount)} Payment`}
            </button>
          </div>
        </form>
      </div>
    </ModalShell>
  );
}

export function ToastStack({
  toasts,
  onDismiss,
}: {
  toasts: ToastMessage[];
  onDismiss: (id: string) => void;
}) {
  if (toasts.length === 0) return null;
  return (
    <div className="fixed bottom-5 right-5 z-50 flex flex-col gap-2.5 max-w-sm w-full pointer-events-none">
      {toasts.map((t) => (
        <div
          key={t.id}
          className="pointer-events-auto bg-white border border-slate-200 rounded-xl shadow-lg p-4 flex items-start gap-3"
        >
          {t.type === 'success' ? (
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
          ) : t.type === 'error' ? (
            <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
          ) : (
            <Info className="w-5 h-5 text-violet-600 shrink-0 mt-0.5" />
          )}
          <div className="flex-1 min-w-0">
            <div className="text-sm font-semibold text-slate-900">{t.title}</div>
            {t.description ? (
              <div className="text-xs text-slate-600 mt-0.5 leading-relaxed">{t.description}</div>
            ) : null}
          </div>
          <button
            type="button"
            onClick={() => onDismiss(t.id)}
            aria-label="Dismiss notification"
            className="text-slate-400 hover:text-slate-600"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      ))}
    </div>
  );
}

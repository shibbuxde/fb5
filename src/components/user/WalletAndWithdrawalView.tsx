import React, { useEffect, useState } from 'react';
import {
  AlertCircle,
  ArrowUpRight,
  Building2,
  CheckCircle2,
  ShieldCheck,
  Smartphone,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { savePaymentMethod, submitWithdrawalRequest } from '../../lib/firestoreService';
import { formatINR, formatTimestamp } from '../../lib/utils';
import { EmptyState, MetricCell, StatusText } from '../CommonUI';

export function WalletAndWithdrawalView({
  mode,
}: {
  mode: 'wallet' | 'withdrawal';
}) {
  const {
    userProfile,
    settings,
    wallet,
    paymentMethod,
    myTransactions,
    myWithdrawals,
    pushToast,
  } = useApp();

  // Payment method state
  const [bankHolderName, setBankHolderName] = useState('');
  const [bankName, setBankName] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [confirmAccountNumber, setConfirmAccountNumber] = useState('');
  const [ifscCode, setIfscCode] = useState('');
  const [upiId, setUpiId] = useState('');
  const [upiHolderName, setUpiHolderName] = useState('');
  const [savingMethod, setSavingMethod] = useState(false);
  const [methodError, setMethodError] = useState('');

  // Withdrawal form state
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [withdrawMethod, setWithdrawMethod] = useState<'bank' | 'upi'>('upi');
  const [submittingWithdrawal, setSubmittingWithdrawal] = useState(false);
  const [withdrawError, setWithdrawError] = useState('');

  useEffect(() => {
    if (paymentMethod) {
      setBankHolderName(paymentMethod.bankHolderName || '');
      setBankName(paymentMethod.bankName || '');
      setAccountNumber(paymentMethod.accountNumber || '');
      setConfirmAccountNumber(paymentMethod.accountNumber || '');
      setIfscCode(paymentMethod.ifscCode || '');
      setUpiId(paymentMethod.upiId || '');
      setUpiHolderName(paymentMethod.upiHolderName || '');
    }
  }, [paymentMethod]);

  if (!userProfile) return null;

  const hasBank = Boolean(
    paymentMethod?.bankHolderName &&
      paymentMethod?.bankName &&
      paymentMethod?.accountNumber &&
      paymentMethod?.ifscCode,
  );
  const hasUpi = Boolean(paymentMethod?.upiId && paymentMethod?.upiHolderName);

  const handleSavePaymentDetails = async (e: React.FormEvent) => {
    e.preventDefault();
    setMethodError('');
    if (accountNumber.trim() && accountNumber.trim() !== confirmAccountNumber.trim()) {
      setMethodError('Account Number and Confirm Account Number do not match.');
      return;
    }
    if (ifscCode.trim() && !/^[A-Za-z]{4}0[A-Za-z0-9]{6}$/.test(ifscCode.trim())) {
      setMethodError('Please enter a valid 11-character IFSC Code (e.g., SBIN0001234).');
      return;
    }
    if (upiId.trim() && !upiId.includes('@')) {
      setMethodError('Please enter a valid UPI ID (e.g., yourname@okaxis).');
      return;
    }

    setSavingMethod(true);
    try {
      await savePaymentMethod(userProfile.uid, {
        bankHolderName,
        bankName,
        accountNumber,
        ifscCode,
        upiId,
        upiHolderName,
      });
      pushToast('success', 'Payment Details Saved', 'Your Bank Account and UPI details have been securely updated.');
    } catch (err) {
      setMethodError(err instanceof Error ? err.message : 'Unable to save payment details.');
    } finally {
      setSavingMethod(false);
    }
  };

  const handleWithdrawalSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setWithdrawError('');
    const amt = Number(withdrawAmount);
    if (!Number.isFinite(amt) || amt <= 0) {
      setWithdrawError('Please enter a valid withdrawal amount.');
      return;
    }
    if (amt < settings.minWithdrawalLimit) {
      setWithdrawError(
        `Minimum withdrawal limit is ${formatINR(settings.minWithdrawalLimit)}. Amounts below this stay safe in your wallet until next week.`,
      );
      return;
    }
    if (amt > wallet.availableBalance) {
      setWithdrawError('Requested amount exceeds your Available Wallet Balance.');
      return;
    }
    if (withdrawMethod === 'bank' && !hasBank) {
      setWithdrawError('Please save your Bank Account details before requesting a Bank withdrawal.');
      return;
    }
    if (withdrawMethod === 'upi' && !hasUpi) {
      setWithdrawError('Please save your UPI ID details before requesting a UPI withdrawal.');
      return;
    }
    if (!paymentMethod) return;

    setSubmittingWithdrawal(true);
    try {
      const code = await submitWithdrawalRequest(
        userProfile,
        wallet,
        paymentMethod,
        amt,
        withdrawMethod,
        settings.minWithdrawalLimit,
      );
      setWithdrawAmount('');
      pushToast(
        'success',
        `Withdrawal ${code} Submitted`,
        `${formatINR(amt)} has been reserved from your Available Balance and queued for Admin payout.`,
      );
    } catch (err) {
      setWithdrawError(err instanceof Error ? err.message : 'Withdrawal request failed.');
    } finally {
      setSubmittingWithdrawal(false);
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            {mode === 'wallet' ? 'Wallet & Payment Methods' : 'Withdrawal Requests'}
          </h1>
          <p className="text-sm text-slate-600 mt-1">
            Only Admin-verified weekly salary and affiliate commissions appear in Available Balance.
            Payout window: {settings.weeklyPayoutDay} ({settings.weeklyPayoutTime}).
          </p>
        </div>
        {mode === 'wallet' ? (
          <button
            type="button"
            onClick={() => {
              document.getElementById('withdrawal-request-section')?.scrollIntoView({ behavior: 'smooth' });
            }}
            className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-semibold text-white bg-violet-700 hover:bg-violet-800 rounded-lg transition-colors whitespace-nowrap shrink-0"
          >
            <ArrowUpRight className="w-4 h-4" />
            Request Withdrawal
          </button>
        ) : null}
      </div>

      {/* Complete 8-Metric Wallet Breakdown */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <MetricCell
          label="Available Balance (Withdrawable)"
          value={formatINR(wallet.availableBalance)}
          subtext={`Reserved in pending payouts: ${formatINR(wallet.reservedBalance)}`}
          accent
        />
        <MetricCell
          label="Total Salary Income"
          value={formatINR(wallet.totalSalaryIncome)}
          subtext={`Current Week Credited: ${formatINR(wallet.currentWeekEarnings)}`}
        />
        <MetricCell
          label="Total Affiliate Income"
          value={formatINR(wallet.totalAffiliateIncome)}
          subtext={`Pending Audit Earnings: ${formatINR(wallet.pendingEarnings)}`}
        />
        <MetricCell
          label="Total Withdrawn"
          value={formatINR(wallet.totalWithdrawn)}
          subtext={`Lifetime Earnings: ${formatINR(wallet.lifetimeEarnings)}`}
        />
      </div>

      {/* Withdrawal Request Form + Bank/UPI Details Split */}
      <div className="grid lg:grid-cols-12 gap-6">
        {/* Withdrawal Request Box */}
        <div
          id="withdrawal-request-section"
          className="lg:col-span-5 bg-white border border-slate-200 rounded-xl p-6 space-y-5"
        >
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-slate-900">Request Payout Withdrawal</h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Minimum withdrawal: {formatINR(settings.minWithdrawalLimit)} · Requested amount is
                reserved immediately.
              </p>
            </div>
            <ArrowUpRight className="w-5 h-5 text-violet-700 shrink-0" />
          </div>

          <form onSubmit={handleWithdrawalSubmit} className="space-y-4">
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-semibold text-slate-700">Withdrawal Amount (₹)</label>
                <button
                  type="button"
                  onClick={() => setWithdrawAmount(String(wallet.availableBalance))}
                  className="text-[11px] font-semibold text-violet-700 hover:underline"
                >
                  Use Max ({formatINR(wallet.availableBalance)})
                </button>
              </div>
              <input
                type="number"
                step="0.01"
                min={settings.minWithdrawalLimit}
                max={wallet.availableBalance}
                required
                value={withdrawAmount}
                onChange={(e) => setWithdrawAmount(e.target.value)}
                placeholder={`Min ${settings.minWithdrawalLimit}`}
                className="w-full px-3.5 py-2.5 text-sm font-mono bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-600"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Select Payout Destination
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setWithdrawMethod('upi')}
                  className={`flex items-center justify-center gap-2 py-2.5 px-3 text-xs font-semibold rounded-lg border transition-colors ${
                    withdrawMethod === 'upi'
                      ? 'bg-violet-50 border-violet-600 text-violet-800'
                      : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  <Smartphone className="w-4 h-4" />
                  UPI ID {hasUpi ? '(Saved)' : '(Not Set)'}
                </button>
                <button
                  type="button"
                  onClick={() => setWithdrawMethod('bank')}
                  className={`flex items-center justify-center gap-2 py-2.5 px-3 text-xs font-semibold rounded-lg border transition-colors ${
                    withdrawMethod === 'bank'
                      ? 'bg-violet-50 border-violet-600 text-violet-800'
                      : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  <Building2 className="w-4 h-4" />
                  Bank {hasBank ? '(Saved)' : '(Not Set)'}
                </button>
              </div>
            </div>

            <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 text-xs text-slate-600">
              {withdrawMethod === 'upi'
                ? hasUpi
                  ? `Will transfer to UPI: ${paymentMethod?.upiId} (${paymentMethod?.upiHolderName})`
                  : 'Add and save your UPI ID on the right first.'
                : hasBank
                  ? `Will transfer to ${paymentMethod?.bankName} · A/C ••••${paymentMethod?.accountNumber?.slice(-4)} (${paymentMethod?.ifscCode})`
                  : 'Add and save your Bank Account details on the right first.'}
            </div>

            {withdrawError ? (
              <div className="flex items-start gap-2 text-xs text-rose-700 bg-rose-50 border border-rose-200 rounded-lg p-3">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{withdrawError}</span>
              </div>
            ) : null}

            <button
              type="submit"
              disabled={submittingWithdrawal || wallet.availableBalance < settings.minWithdrawalLimit}
              className="w-full py-2.5 text-sm font-semibold text-white bg-violet-700 hover:bg-violet-800 disabled:opacity-50 rounded-lg transition-colors"
            >
              {submittingWithdrawal ? 'Submitting Withdrawal...' : 'Submit Withdrawal Request'}
            </button>
          </form>
        </div>

        {/* Add / Update Bank Account & UPI Details */}
        <div className="lg:col-span-7 bg-white border border-slate-200 rounded-xl p-6 space-y-5">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-slate-900">
                Saved Bank Account &amp; UPI Payment Details
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Stored securely in private user storage — visible strictly to you and Admin for
                payout settlement.
              </p>
            </div>
            <ShieldCheck className="w-5 h-5 text-emerald-600 shrink-0" />
          </div>

          <form onSubmit={handleSavePaymentDetails} className="space-y-5">
            {/* Bank Section */}
            <div className="space-y-3">
              <div className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                <Building2 className="w-3.5 h-3.5 text-violet-700" />
                Bank Account Details
              </div>
              <div className="grid sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                    Account Holder Name
                  </label>
                  <input
                    type="text"
                    value={bankHolderName}
                    onChange={(e) => setBankHolderName(e.target.value)}
                    placeholder="Full name as per bank passbook"
                    className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-600"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                    Bank Name
                  </label>
                  <input
                    type="text"
                    value={bankName}
                    onChange={(e) => setBankName(e.target.value)}
                    placeholder="e.g., State Bank of India, HDFC Bank"
                    className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-600"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                    Account Number
                  </label>
                  <input
                    type="text"
                    value={accountNumber}
                    onChange={(e) => setAccountNumber(e.target.value)}
                    placeholder="Enter bank account number"
                    className="w-full px-3 py-2 text-xs font-mono bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-600"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                    Confirm Account Number
                  </label>
                  <input
                    type="text"
                    value={confirmAccountNumber}
                    onChange={(e) => setConfirmAccountNumber(e.target.value)}
                    placeholder="Re-enter bank account number"
                    className="w-full px-3 py-2 text-xs font-mono bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-600"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                    IFSC Code
                  </label>
                  <input
                    type="text"
                    value={ifscCode}
                    onChange={(e) => setIfscCode(e.target.value.toUpperCase())}
                    placeholder="e.g., SBIN0001234"
                    className="w-full sm:w-64 px-3 py-2 text-xs font-mono uppercase bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-600"
                  />
                </div>
              </div>
            </div>

            {/* UPI Section */}
            <div className="space-y-3 pt-4 border-t border-slate-100">
              <div className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                <Smartphone className="w-3.5 h-3.5 text-violet-700" />
                UPI Details
              </div>
              <div className="grid sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                    UPI ID
                  </label>
                  <input
                    type="text"
                    value={upiId}
                    onChange={(e) => setUpiId(e.target.value)}
                    placeholder="e.g., username@okhdfcbank"
                    className="w-full px-3 py-2 text-xs font-mono bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-600"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                    UPI Account Holder Name
                  </label>
                  <input
                    type="text"
                    value={upiHolderName}
                    onChange={(e) => setUpiHolderName(e.target.value)}
                    placeholder="Name registered on UPI"
                    className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-600"
                  />
                </div>
              </div>
            </div>

            {methodError ? (
              <div className="flex items-start gap-2 text-xs text-rose-700 bg-rose-50 border border-rose-200 rounded-lg p-3">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{methodError}</span>
              </div>
            ) : null}

            <div className="flex items-center justify-between pt-2">
              <span className="text-[11px] text-slate-500 flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                You can update these details anytime
              </span>
              <button
                type="submit"
                disabled={savingMethod}
                className="px-5 py-2 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 disabled:opacity-50 rounded-lg transition-colors"
              >
                {savingMethod ? 'Saving...' : 'Save Payment Details'}
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* Withdrawal Requests Table */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200">
          <h2 className="text-base font-bold text-slate-900">
            Withdrawal Request History ({myWithdrawals.length})
          </h2>
        </div>
        {myWithdrawals.length === 0 ? (
          <div className="p-6">
            <EmptyState
              title="No Withdrawal Requests Yet"
              description="Submit a payout request once your verified Available Balance reaches the minimum withdrawal limit."
            />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 font-semibold text-slate-600">
                  <th className="py-3 px-4">Request ID</th>
                  <th className="py-3 px-4">Method</th>
                  <th className="py-3 px-4 text-right">Amount</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">UTR / Payment Ref</th>
                  <th className="py-3 px-4">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {myWithdrawals.map((w) => (
                  <tr key={w.id} className="hover:bg-slate-50/70">
                    <td className="py-3 px-4 font-mono font-semibold text-slate-900">
                      {w.requestCode}
                    </td>
                    <td className="py-3 px-4 text-slate-700">{w.methodSummary}</td>
                    <td className="py-3 px-4 text-right font-mono tabular-nums font-bold text-slate-900">
                      {formatINR(w.amount)}
                    </td>
                    <td className="py-3 px-4">
                      <StatusText status={w.status} />
                      {w.adminNote ? (
                        <div className="text-[11px] text-slate-500 mt-0.5">{w.adminNote}</div>
                      ) : null}
                    </td>
                    <td className="py-3 px-4 font-mono text-slate-700">{w.utrReference || '—'}</td>
                    <td className="py-3 px-4 text-slate-500 whitespace-nowrap">
                      {formatTimestamp(w.createdAt)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Complete Wallet Transaction History Ledger */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200">
          <h2 className="text-base font-bold text-slate-900">
            Wallet Transaction Ledger ({myTransactions.length})
          </h2>
        </div>
        {myTransactions.length === 0 ? (
          <div className="p-6">
            <EmptyState
              title="No Wallet Transactions Yet"
              description="Verified weekly salaries, direct affiliate commissions, withdrawals, refunds, and admin adjustments will appear here."
            />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 font-semibold text-slate-600">
                  <th className="py-3 px-4">Transaction ID</th>
                  <th className="py-3 px-4">Date</th>
                  <th className="py-3 px-4">Transaction Type</th>
                  <th className="py-3 px-4">Description</th>
                  <th className="py-3 px-4 text-right">Amount</th>
                  <th className="py-3 px-4">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {myTransactions.map((t) => (
                  <tr key={t.id} className="hover:bg-slate-50/70">
                    <td className="py-3 px-4 font-mono font-semibold text-slate-900">{t.txnCode}</td>
                    <td className="py-3 px-4 text-slate-500 whitespace-nowrap">
                      {formatTimestamp(t.createdAt)}
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
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

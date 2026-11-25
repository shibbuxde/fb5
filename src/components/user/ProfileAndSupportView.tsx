import React, { useEffect, useState } from 'react';
import { HelpCircle, Save, Send, Upload, User } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { submitSupportTicket, updateUserProfile } from '../../lib/firestoreService';
import { compressImageToDataUrl, formatTimestamp } from '../../lib/utils';
import { EmptyState, StatusText } from '../CommonUI';

export function ProfileSettingsView() {
  const { userProfile, pushToast } = useApp();
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [photoUrl, setPhotoUrl] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (userProfile) {
      setFullName(userProfile.fullName || '');
      setPhone(userProfile.phone || '');
      setPhotoUrl(userProfile.photoUrl || '');
    }
  }, [userProfile]);

  if (!userProfile) return null;

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const compressed = await compressImageToDataUrl(file, 360, 0.78);
      setPhotoUrl(compressed);
    } catch (err) {
      pushToast('error', 'Upload Error', err instanceof Error ? err.message : 'Invalid image.');
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName.trim()) return;
    setSaving(true);
    try {
      await updateUserProfile(userProfile.uid, { fullName, phone, photoUrl });
      pushToast('success', 'Profile Updated', 'Your account details have been saved.');
    } catch (err) {
      pushToast('error', 'Update Failed', err instanceof Error ? err.message : 'Unable to save.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">Profile Settings</h1>
        <p className="text-sm text-slate-600 mt-1">
          View and update your profile picture, full name, phone number, and account information.
        </p>
      </div>

      <div className="grid lg:grid-cols-12 gap-6">
        <form
          onSubmit={handleSave}
          className="lg:col-span-7 bg-white border border-slate-200 rounded-xl p-6 space-y-5"
        >
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-xl border border-slate-200 bg-violet-50 overflow-hidden flex items-center justify-center shrink-0">
              {photoUrl ? (
                <img
                  src={photoUrl}
                  alt={fullName}
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-cover"
                />
              ) : (
                <User className="w-7 h-7 text-violet-700" />
              )}
            </div>
            <div>
              <label className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 rounded-lg cursor-pointer transition-colors">
                <Upload className="w-3.5 h-3.5" />
                Change Profile Picture
                <input type="file" accept="image/*" onChange={handlePhotoUpload} className="hidden" />
              </label>
              <p className="text-[11px] text-slate-500 mt-1">JPG or PNG, automatically resized.</p>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">Full Name</label>
            <input
              type="text"
              required
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="w-full px-3.5 py-2.5 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-600"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Email Address (Verified Account)
            </label>
            <input
              type="email"
              readOnly
              value={userProfile.email}
              className="w-full px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-lg text-slate-600"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">Phone Number</label>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+91 98765 43210"
              className="w-full px-3.5 py-2.5 text-sm font-mono bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-600"
            />
          </div>

          <button
            type="submit"
            disabled={saving}
            className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-semibold text-white bg-violet-700 hover:bg-violet-800 disabled:opacity-50 rounded-lg transition-colors"
          >
            <Save className="w-4 h-4" />
            {saving ? 'Saving Changes...' : 'Save Profile'}
          </button>
        </form>

        <div className="lg:col-span-5 bg-white border border-slate-200 rounded-xl p-6 space-y-4">
          <h2 className="text-base font-bold text-slate-900">Account Information</h2>
          <dl className="divide-y divide-slate-100 text-xs">
            <div className="py-3 flex items-center justify-between">
              <dt className="text-slate-500">Unique User ID</dt>
              <dd className="font-mono font-bold text-slate-900">{userProfile.userCode}</dd>
            </div>
            <div className="py-3 flex items-center justify-between">
              <dt className="text-slate-500">Referral Code</dt>
              <dd className="font-mono font-bold text-violet-700">{userProfile.referralCode}</dd>
            </div>
            <div className="py-3 flex items-center justify-between">
              <dt className="text-slate-500">Training Status</dt>
              <dd>
                <StatusText status={userProfile.trainingVerified ? 'Verified' : userProfile.trainingStatus} />
              </dd>
            </div>
            <div className="py-3 flex items-center justify-between">
              <dt className="text-slate-500">Active Work Plan</dt>
              <dd className="font-mono font-semibold text-slate-900">
                {userProfile.activePlanPages ? `${userProfile.activePlanPages} Pages` : 'None'}
              </dd>
            </div>
            <div className="py-3 flex items-center justify-between">
              <dt className="text-slate-500">Account Role</dt>
              <dd className="font-semibold text-slate-900 capitalize">{userProfile.role}</dd>
            </div>
            <div className="py-3 flex items-center justify-between">
              <dt className="text-slate-500">Registered On</dt>
              <dd className="text-slate-700">{formatTimestamp(userProfile.createdAt)}</dd>
            </div>
          </dl>
        </div>
      </div>
    </div>
  );
}

export function SupportView() {
  const { userProfile, mySupportTickets, pushToast } = useApp();
  const [subject, setSubject] = useState('');
  const [category, setCategory] = useState('Work & Page Approval');
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);

  if (!userProfile) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!subject.trim() || !message.trim()) return;
    setSubmitting(true);
    try {
      await submitSupportTicket(userProfile, subject, category, message);
      setSubject('');
      setMessage('');
      pushToast('success', 'Support Ticket Submitted', 'Admin will reply to your request shortly.');
    } catch (err) {
      pushToast('error', 'Failed', err instanceof Error ? err.message : 'Unable to send ticket.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">Support Desk</h1>
        <p className="text-sm text-slate-600 mt-1">
          Need help with Facebook Page review, weekly verification, or payouts? Submit a ticket
          directly to Admin.
        </p>
      </div>

      <div className="grid lg:grid-cols-12 gap-6">
        <form
          onSubmit={handleSubmit}
          className="lg:col-span-5 bg-white border border-slate-200 rounded-xl p-6 space-y-4"
        >
          <div className="flex items-center gap-2 text-base font-bold text-slate-900">
            <HelpCircle className="w-4 h-4 text-violet-700" />
            <span>Create Support Ticket</span>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">Category</label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full px-3 py-2.5 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-600"
            >
              <option>Work &amp; Page Approval</option>
              <option>Training &amp; Payment Verification</option>
              <option>Weekly Salary &amp; Affiliate Commission</option>
              <option>Wallet &amp; Withdrawal</option>
              <option>Account &amp; Profile</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">Subject</label>
            <input
              type="text"
              required
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Brief summary of your question"
              className="w-full px-3.5 py-2.5 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-600"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">Message</label>
            <textarea
              rows={5}
              required
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Include your Page slot number, UTR, or Week Key if relevant..."
              className="w-full p-3.5 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-600"
            />
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-semibold text-white bg-violet-700 hover:bg-violet-800 disabled:opacity-50 rounded-lg transition-colors"
          >
            <Send className="w-4 h-4" />
            {submitting ? 'Submitting...' : 'Submit Ticket'}
          </button>
        </form>

        <div className="lg:col-span-7 bg-white border border-slate-200 rounded-xl p-6 space-y-4">
          <h2 className="text-base font-bold text-slate-900">
            Your Support Tickets ({mySupportTickets.length})
          </h2>
          {mySupportTickets.length === 0 ? (
            <EmptyState
              title="No Support Tickets"
              description="Submit a ticket using the form on the left whenever you need assistance."
            />
          ) : (
            <div className="divide-y divide-slate-100">
              {mySupportTickets.map((t) => (
                <div key={t.id} className="py-4 space-y-2">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="text-sm font-bold text-slate-900">{t.subject}</div>
                      <div className="text-[11px] text-slate-500">
                        {t.category} · {formatTimestamp(t.createdAt)}
                      </div>
                    </div>
                    <StatusText status={t.status} />
                  </div>
                  <p className="text-xs text-slate-700 leading-relaxed">{t.message}</p>
                  {t.adminReply ? (
                    <div className="bg-violet-50 border border-violet-200 rounded-lg p-3 text-xs text-violet-900">
                      <span className="font-bold">Admin Reply:</span> {t.adminReply}
                    </div>
                  ) : null}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

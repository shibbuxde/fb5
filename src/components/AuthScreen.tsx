import React, { useEffect, useState } from 'react';
import {
  createUserWithEmailAndPassword,
  sendEmailVerification,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signInWithPopup,
  updateProfile,
} from 'firebase/auth';
import {
  AlertCircle,
  ArrowRight,
  CheckCircle2,
  KeyRound,
  Mail,
  RefreshCw,
  ShieldCheck,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { auth, googleProvider } from '../lib/firebase';
import { AUTH_SHOWCASE_IMAGE } from '../lib/utils';

type AuthTab = 'login' | 'register' | 'forgot';

export function AuthScreen() {
  const { firebaseUser, setPendingSignupMeta, pushToast, handleLogout } = useApp();
  const [tab, setTab] = useState<AuthTab>('login');
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [referralCode, setReferralCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [infoMessage, setInfoMessage] = useState('');

  useEffect(() => {
    try {
      const saved = sessionStorage.getItem('pw_pending_ref');
      if (saved) {
        setReferralCode(saved);
        setTab('register');
      }
    } catch {
      // Ignore
    }
  }, []);

  const handleGoogleSignIn = async () => {
    setError('');
    setInfoMessage('');
    setLoading(true);
    try {
      setPendingSignupMeta({
        referralCodeInput: referralCode.trim().toUpperCase(),
      });
      await signInWithPopup(auth, googleProvider);
      pushToast('success', 'Signed in with Google', 'Welcome to Facebook Earner.');
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Google sign-in failed.';
      if (msg.includes('unauthorized-domain')) {
        const host = typeof window !== 'undefined' ? window.location.hostname : 'this domain';
        setError(
          `Domain "${host}" is not yet authorized in Firebase Authentication. Open Firebase Console → Authentication → Settings → Authorized domains → click "Add domain" and add "${host}".`,
        );
      } else if (!msg.includes('popup-closed-by-user')) {
        setError(msg.replace('Firebase: ', ''));
      }
    } finally {
      setLoading(false);
    }
  };

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setInfoMessage('');
    setLoading(true);

    try {
      if (tab === 'login') {
        await signInWithEmailAndPassword(auth, email.trim(), password);
      } else if (tab === 'register') {
        if (fullName.trim().length < 2) {
          throw new Error('Please enter your full name.');
        }
        if (password.length < 6) {
          throw new Error('Password must be at least 6 characters.');
        }
        setPendingSignupMeta({
          fullName: fullName.trim(),
          referralCodeInput: referralCode.trim().toUpperCase(),
        });
        const cred = await createUserWithEmailAndPassword(auth, email.trim(), password);
        await updateProfile(cred.user, { displayName: fullName.trim() });
        await sendEmailVerification(cred.user);
        setInfoMessage(
          'Account created! A verification link has been sent to your email address. Please verify your email and click Refresh below.',
        );
      } else {
        await sendPasswordResetEmail(auth, email.trim());
        setInfoMessage(
          'Password reset email sent. Check your inbox (and spam folder) to reset your password.',
        );
      }
    } catch (err: unknown) {
      const raw = err instanceof Error ? err.message : 'Authentication failed.';
      if (raw.includes('operation-not-allowed')) {
        setError(
          'Email/Password sign-in is not yet enabled in your Firebase Console (Authentication → Sign-in method → Enable Email/Password). You can use "Sign in with Google" immediately right now.',
        );
      } else if (raw.includes('invalid-credential') || raw.includes('wrong-password')) {
        setError('Invalid email address or password.');
      } else if (raw.includes('email-already-in-use')) {
        setError('An account with this email already exists. Please sign in instead.');
      } else {
        setError(raw.replace('Firebase: ', ''));
      }
    } finally {
      setLoading(false);
    }
  };

  // Unverified Email/Password gate
  if (firebaseUser && !firebaseUser.emailVerified) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
        <div className="max-w-md w-full bg-white border border-slate-200 rounded-xl p-8 space-y-5">
          <div className="w-11 h-11 rounded-lg bg-violet-50 border border-violet-200 flex items-center justify-center text-violet-700">
            <Mail className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900">Verify Your Email Address</h1>
            <p className="text-sm text-slate-600 mt-1.5 leading-relaxed">
              We sent a verification link to{' '}
              <span className="font-semibold text-slate-900">{firebaseUser.email}</span>. Click the
              link in your inbox to activate your account and access training.
            </p>
          </div>
          <div className="flex flex-col sm:flex-row gap-3">
            <button
              type="button"
              onClick={async () => {
                await firebaseUser.reload();
                window.location.reload();
              }}
              className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-semibold text-white bg-violet-700 hover:bg-violet-800 rounded-lg transition-colors"
            >
              <RefreshCw className="w-4 h-4" />
              I Verified — Continue
            </button>
            <button
              type="button"
              onClick={async () => {
                try {
                  await sendEmailVerification(firebaseUser);
                  pushToast('success', 'Verification Email Sent', 'Check your inbox.');
                } catch (err) {
                  pushToast(
                    'error',
                    'Could not resend',
                    err instanceof Error ? err.message : 'Please wait a moment.',
                  );
                }
              }}
              className="px-4 py-2.5 text-sm font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
            >
              Resend Link
            </button>
          </div>
          <button
            type="button"
            onClick={handleLogout}
            className="text-xs font-medium text-slate-500 hover:text-slate-800 underline"
          >
            Sign out and use another account
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 grid lg:grid-cols-12 items-stretch">
      {/* Left Editorial Fintech Showcase */}
      <div className="hidden lg:flex lg:col-span-6 bg-white border-r border-slate-200 flex-col justify-between p-12">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-violet-700 flex items-center justify-center text-white font-bold text-sm">
              FE
            </div>
            <span className="text-lg font-bold tracking-tight text-slate-900">Facebook Earner</span>
          </div>

          <div className="mt-10 max-w-lg">
            <p className="text-xs font-semibold text-violet-700 mb-3">
              Facebook Pages Operations · Direct Affiliate · Weekly Payouts
            </p>
            <h1 className="text-4xl font-bold tracking-tight text-slate-900 leading-[1.15]">
              Structured Facebook Page Work With Verified Weekly Payouts
            </h1>
            <p className="text-sm text-slate-600 mt-4 leading-relaxed">
              Manage 50, 100, or 150 unique Facebook Pages with daily Admin video guidelines,
              database-enforced duplicate protection, transparent 7-day audits, and Bank or UPI
              withdrawals.
            </p>
          </div>

          <div className="mt-8 rounded-xl overflow-hidden border border-slate-200 bg-slate-100 aspect-[4/3] max-h-[300px] w-full">
            <img
              src={AUTH_SHOWCASE_IMAGE}
              alt="Clean Facebook Earner creator operations workspace"
              referrerPolicy="no-referrer"
              className="w-full h-full object-cover"
            />
          </div>
        </div>

        <div className="grid grid-cols-3 gap-6 pt-8 border-t border-slate-200">
          <div>
            <div className="text-lg font-bold font-mono tabular-nums text-slate-900">₹5,500–₹18k</div>
            <div className="text-xs text-slate-500 mt-0.5">Monthly Salary Plans</div>
          </div>
          <div>
            <div className="text-lg font-bold font-mono tabular-nums text-slate-900">7-Day Cycle</div>
            <div className="text-xs text-slate-500 mt-0.5">Verified Weekly Credits</div>
          </div>
          <div>
            <div className="text-lg font-bold font-mono tabular-nums text-slate-900">₹200–₹750</div>
            <div className="text-xs text-slate-500 mt-0.5">Weekly Direct Affiliate</div>
          </div>
        </div>
      </div>

      {/* Right Authentication Form */}
      <div className="lg:col-span-6 flex items-center justify-center p-6 sm:p-10">
        <div className="w-full max-w-md bg-white border border-slate-200 rounded-xl p-7 sm:p-8">
          <div className="lg:hidden flex items-center gap-2.5 mb-6">
            <div className="w-8 h-8 rounded-lg bg-violet-700 flex items-center justify-center text-white font-bold text-sm">
              FE
            </div>
            <span className="text-lg font-bold tracking-tight text-slate-900">Facebook Earner</span>
          </div>

          {/* Segmented Tabs */}
          <div className="grid grid-cols-2 gap-1 p-1 bg-slate-100 rounded-lg mb-6">
            <button
              type="button"
              onClick={() => {
                setTab('login');
                setError('');
                setInfoMessage('');
              }}
              className={`py-2 text-xs font-semibold rounded-md transition-colors whitespace-nowrap ${
                tab === 'login' || tab === 'forgot'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Login
            </button>
            <button
              type="button"
              onClick={() => {
                setTab('register');
                setError('');
                setInfoMessage('');
              }}
              className={`py-2 text-xs font-semibold rounded-md transition-colors whitespace-nowrap ${
                tab === 'register'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Create Account
            </button>
          </div>

          <div className="mb-6">
            <h2 className="text-xl font-bold text-slate-900">
              {tab === 'login'
                ? 'Sign in to your account'
                : tab === 'register'
                  ? 'Create your creator account'
                  : 'Reset your password'}
            </h2>
            <p className="text-xs text-slate-500 mt-1">
              {tab === 'login'
                ? 'Continue with Google OAuth or your registered email credentials.'
                : tab === 'register'
                  ? 'Receive your Unique User ID and unlock paid training onboarding.'
                  : 'Enter your registered email address to receive a password reset link.'}
            </p>
          </div>

          {/* Primary Google OAuth Button */}
          {tab !== 'forgot' ? (
            <>
              <button
                type="button"
                disabled={loading}
                onClick={handleGoogleSignIn}
                className="w-full flex items-center justify-center gap-3 px-4 py-2.5 text-sm font-semibold text-slate-800 bg-white hover:bg-slate-50 border border-slate-300 rounded-lg transition-colors disabled:opacity-60"
              >
                <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24" aria-hidden="true">
                  <path
                    fill="#4285F4"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                  />
                </svg>
                <span>Sign in with Google</span>
              </button>

              <div className="flex items-center gap-2 text-[11px] text-slate-500 mt-2 justify-center">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                <span>Secure Google OAuth — you never share your Gmail password with us</span>
              </div>

              <div className="relative my-5">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-slate-200" />
                </div>
                <div className="relative flex justify-center text-xs">
                  <span className="bg-white px-3 text-slate-400">or continue with email</span>
                </div>
              </div>
            </>
          ) : null}

          <form onSubmit={handleEmailAuth} className="space-y-4">
            {tab === 'register' ? (
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Full Name
                </label>
                <input
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Enter your full name"
                  className="w-full px-3.5 py-2.5 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-600 focus:border-violet-600"
                />
              </div>
            ) : null}

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Email Address
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="w-full px-3.5 py-2.5 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-600 focus:border-violet-600"
              />
            </div>

            {tab !== 'forgot' ? (
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-semibold text-slate-700">Password</label>
                  {tab === 'login' ? (
                    <button
                      type="button"
                      onClick={() => {
                        setTab('forgot');
                        setError('');
                        setInfoMessage('');
                      }}
                      className="text-xs font-medium text-violet-700 hover:underline"
                    >
                      Forgot Password?
                    </button>
                  ) : null}
                </div>
                <input
                  type="password"
                  required
                  minLength={6}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full px-3.5 py-2.5 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-600 focus:border-violet-600"
                />
              </div>
            ) : null}

            {tab === 'register' ? (
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Referral Code (Optional)
                </label>
                <input
                  type="text"
                  value={referralCode}
                  onChange={(e) => setReferralCode(e.target.value.toUpperCase())}
                  placeholder="e.g., REF8A9B2C"
                  className="w-full px-3.5 py-2.5 text-sm font-mono uppercase bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-600 focus:border-violet-600"
                />
              </div>
            ) : null}

            {error ? (
              <div className="flex items-start gap-2 text-xs text-rose-700 bg-rose-50 border border-rose-200 rounded-lg p-3">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            ) : null}

            {infoMessage ? (
              <div className="flex items-start gap-2 text-xs text-emerald-800 bg-emerald-50 border border-emerald-200 rounded-lg p-3">
                <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{infoMessage}</span>
              </div>
            ) : null}

            <button
              type="submit"
              disabled={loading}
              className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-semibold text-white bg-violet-700 hover:bg-violet-800 disabled:opacity-60 rounded-lg transition-colors"
            >
              {tab === 'forgot' ? <KeyRound className="w-4 h-4" /> : null}
              <span>
                {loading
                  ? 'Please wait...'
                  : tab === 'login'
                    ? 'Login'
                    : tab === 'register'
                      ? 'Create Account'
                      : 'Send Reset Link'}
              </span>
              {!loading && tab !== 'forgot' ? <ArrowRight className="w-4 h-4" /> : null}
            </button>

            {tab === 'forgot' ? (
              <button
                type="button"
                onClick={() => {
                  setTab('login');
                  setError('');
                  setInfoMessage('');
                }}
                className="w-full text-center text-xs font-medium text-slate-600 hover:text-slate-900"
              >
                Back to Login
              </button>
            ) : null}
          </form>
        </div>
      </div>
    </div>
  );
}

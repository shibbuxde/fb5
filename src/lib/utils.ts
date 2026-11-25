import { Timestamp } from 'firebase/firestore';
import type { AdminSettings, PlanPagesCount } from '../types';

export const DEFAULT_TRAINING_BANNER = '/src/assets/images/training_banner_hero_1795276292526.jpg';
export const AUTH_SHOWCASE_IMAGE = '/src/assets/images/auth_editorial_workspace_1795276290450.jpg';

export const DUPLICATE_FB_ERROR_MESSAGE =
  'This Facebook Page URL has already been submitted by another user or is already registered in the system. Duplicate links are not allowed.';

export const DEFAULT_ADMIN_SETTINGS: AdminSettings = {
  trainingTitle: 'Facebook Pages Monetization & Daily Video Publishing Mastery',
  trainingDescription:
    'Complete step-by-step operational training covering compliant Facebook Page setup, daily video formatting, copyright-safe publishing workflows, 7-day verification protocols, and how to scale across 50, 100, or 150 active pages for consistent weekly salary and direct affiliate earnings.',
  trainingBenefits: [
    'Lifetime access to updated Facebook Page publishing SOPs and daily video checklists',
    'Unlocks enrollment into 50 Pages (₹5,500/mo), 100 Pages (₹11,500/mo), and 150 Pages (₹18,000/mo) work plans',
    'Direct Affiliate Partner activation earning ₹200–₹750 weekly per active referred creator',
    '7-day manual quality audit protection so every verified active page earns accurate pro-rata salary',
    'Priority onboarding review and dedicated Bank / UPI weekly payout support',
  ],
  trainingAccessDetails:
    'One-time verification fee. Once your payment is verified by Admin, your Training Access and Main Dashboard remain unlocked permanently with zero renewal charges.',
  trainingContentModules: [
    {
      id: 'mod-1',
      title: '01. Facebook Page Setup & Compliance Checklist',
      duration: '14 min',
      summary:
        'Configure page category, bio, profile branding, and Page Quality hygiene so pages stay active through all 7 days of each work cycle.',
      videoUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
    },
    {
      id: 'mod-2',
      title: '02. Following Admin Daily Video Instructions',
      duration: '18 min',
      summary:
        'How to download the daily official reference video, apply approved captions/hashtags, and publish without triggering policy strikes.',
      videoUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
    },
    {
      id: 'mod-3',
      title: '03. Submitting Proof & Passing the 7th-Day Verification',
      duration: '12 min',
      summary:
        'How daily logs are reviewed on Day 7, how pro-rata weekly salary is computed, and how to submit Bank/UPI withdrawal requests on Day 8.',
      videoUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
    },
  ],
  trainingPrice: 299,
  trainingThumbnailUrl: DEFAULT_TRAINING_BANNER,
  paymentQrImageUrl: '',
  paymentUpiId: 'facebookearner@upi',
  paymentMerchantName: 'Facebook Earner Operations',
  paymentInstructions:
    'Scan the QR code using GPay, PhonePe, Paytm, or any UPI app, pay the exact amount shown, and submit your 12-digit UTR / Reference Number below for Admin verification.',
  plan50Price: 0,
  plan100Price: 0,
  plan150Price: 0,
  plan50MonthlySalary: 5500,
  plan100MonthlySalary: 11500,
  plan150MonthlySalary: 18000,
  plan50WeeklyCommission: 200,
  plan100WeeklyCommission: 500,
  plan150WeeklyCommission: 750,
  minWithdrawalLimit: 500,
  weeklyPayoutDay: 'Sunday',
  weeklyPayoutTime: '10:00 AM - 08:00 PM IST',
  workDurationDays: 7,
  workInstructionsGlobal:
    '1. Upload ONLY the official Admin reference video assigned for today.\n2. Do not upload third-party, unrelated, or watermarked content.\n3. Submit your live Facebook post link inside the Daily Work tab before 11:30 PM IST.\n4. All 7 days of activity are audited on Day 7 before Weekly Salary and Affiliate Commission are credited to your Wallet.',
};

export function round2(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

export function formatINR(amount: number | undefined | null): string {
  const num = Number.isFinite(amount) ? Number(amount) : 0;
  const hasDecimals = Math.abs(num % 1) > 0.001;
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: hasDecimals ? 2 : 0,
    maximumFractionDigits: 2,
  }).format(num);
}

/**
 * Exact prompt formula:
 * Monthly Salary ÷ Total Plan Pages × Verified Active Pages × 12 ÷ 52
 */
export function calculateWeeklySalary(
  monthlySalary: number,
  totalPlanPages: number,
  verifiedActivePages: number,
): number {
  if (totalPlanPages <= 0 || verifiedActivePages <= 0 || monthlySalary <= 0) return 0;
  const clampedActive = Math.min(verifiedActivePages, totalPlanPages);
  return round2((monthlySalary / totalPlanPages) * clampedActive * (12 / 52));
}

/**
 * Exact prompt formula:
 * Plan Weekly Commission Rate ÷ Total Plan Pages × Verified Active Pages
 */
export function calculateWeeklyCommission(
  weeklyCommissionRate: number,
  totalPlanPages: number,
  verifiedActivePages: number,
): number {
  if (totalPlanPages <= 0 || verifiedActivePages <= 0 || weeklyCommissionRate <= 0) return 0;
  const clampedActive = Math.min(verifiedActivePages, totalPlanPages);
  return round2((weeklyCommissionRate / totalPlanPages) * clampedActive);
}

export function getPlanConfig(settings: AdminSettings, pages: PlanPagesCount) {
  if (pages === 50) {
    return {
      pages: 50 as PlanPagesCount,
      title: '50 Pages Work Plan',
      subtitle: 'Starter Operations',
      price: settings.plan50Price,
      monthlySalary: settings.plan50MonthlySalary,
      weeklyCommission: settings.plan50WeeklyCommission,
      maxWeeklySalary: calculateWeeklySalary(settings.plan50MonthlySalary, 50, 50),
    };
  }
  if (pages === 100) {
    return {
      pages: 100 as PlanPagesCount,
      title: '100 Pages Work Plan',
      subtitle: 'Growth Operations',
      price: settings.plan100Price,
      monthlySalary: settings.plan100MonthlySalary,
      weeklyCommission: settings.plan100WeeklyCommission,
      maxWeeklySalary: calculateWeeklySalary(settings.plan100MonthlySalary, 100, 100),
    };
  }
  return {
    pages: 150 as PlanPagesCount,
    title: '150 Pages Work Plan',
    subtitle: 'Scale Operations',
    price: settings.plan150Price,
    monthlySalary: settings.plan150MonthlySalary,
    weeklyCommission: settings.plan150WeeklyCommission,
    maxWeeklySalary: calculateWeeklySalary(settings.plan150MonthlySalary, 150, 150),
  };
}

/**
 * Canonical Facebook Page URL normalizer.
 * Strictly allows ONLY Facebook Page URLs (facebook.com / fb.com / fb.me).
 * Defeats www/m/mbasic/mobile/web variations, http/https, trailing slashes, ?fbclid/?utm_* params,
 * and unifies all numeric Page ID URL formats (profile.php?id=, /pages/.../ID, /people/.../ID, /ID)
 * into the exact same canonicalKey so NO two users can ever submit the same page.
 */
export function canonicalizeFacebookUrl(input: string): {
  valid: boolean;
  error?: string;
  rawUrl: string;
  normalizedUrl: string;
  canonicalKey: string;
} {
  const trimmed = input.trim();
  if (!trimmed) {
    return { valid: false, error: 'Please enter a Facebook Page URL.', rawUrl: '', normalizedUrl: '', canonicalKey: '' };
  }

  if (/\s/.test(trimmed)) {
    return {
      valid: false,
      error: 'URL cannot contain spaces. Enter a valid Facebook Page URL (e.g., https://www.facebook.com/yourpagename).',
      rawUrl: trimmed,
      normalizedUrl: '',
      canonicalKey: '',
    };
  }

  let withProtocol = trimmed;
  if (/^[a-zA-Z][a-zA-Z0-9+.-]*:\/\//.test(withProtocol)) {
    if (!/^https?:\/\//i.test(withProtocol)) {
      return {
        valid: false,
        error: 'Only valid http/https Facebook Page URLs are allowed.',
        rawUrl: trimmed,
        normalizedUrl: '',
        canonicalKey: '',
      };
    }
  } else {
    withProtocol = `https://${withProtocol}`;
  }

  let parsed: URL;
  try {
    parsed = new URL(withProtocol);
  } catch {
    return {
      valid: false,
      error: 'Invalid URL format. Example: https://www.facebook.com/yourpagename',
      rawUrl: trimmed,
      normalizedUrl: '',
      canonicalKey: '',
    };
  }

  if (parsed.username || parsed.password || parsed.port) {
    return {
      valid: false,
      error: 'Invalid Facebook Page URL format.',
      rawUrl: trimmed,
      normalizedUrl: '',
      canonicalKey: '',
    };
  }

  const rawHost = parsed.hostname.toLowerCase();
  const host = rawHost.replace(/^(www|m|mbasic|mobile|web|touch|l)\./, '');
  if (host !== 'facebook.com' && host !== 'fb.com' && host !== 'fb.me') {
    return {
      valid: false,
      error: 'Only Facebook Page URLs (facebook.com, fb.com, fb.me) are allowed. Other websites are blocked.',
      rawUrl: trimmed,
      normalizedUrl: '',
      canonicalKey: '',
    };
  }

  const rawPath = parsed.pathname.replace(/\/+/g, '/').replace(/^\/|\/$/g, '');
  const segments = rawPath
    ? rawPath.split('/').map((s) => {
        try {
          return decodeURIComponent(s).toLowerCase();
        } catch {
          return s.toLowerCase();
        }
      })
    : [];

  let identifier = '';

  // Case 1: profile.php?id=123456789
  if (segments[0] === 'profile.php') {
    const idParam = parsed.searchParams.get('id')?.trim();
    if (!idParam || !/^\d{5,}$/.test(idParam)) {
      return {
        valid: false,
        error: 'Facebook profile.php links must include a valid numeric id parameter.',
        rawUrl: trimmed,
        normalizedUrl: '',
        canonicalKey: '',
      };
    }
    identifier = `id_${idParam}`;
  } else if (segments[0] === 'pages' || segments[0] === 'p' || segments[0] === 'pg') {
    // Case 2: /pages/Page-Name/123456789(/about) or /pg/pagename or /p/Page-Name-123456789
    const numericSeg = segments.slice(1).find((seg) => /(\d{6,})$/.test(seg));
    const numericTail = numericSeg?.match(/(\d{6,})$/);
    if (numericTail) {
      identifier = `id_${numericTail[1]}`;
    } else if (segments[1] && segments[1] !== 'category') {
      identifier = segments[1];
    } else if (segments[segments.length - 1]) {
      identifier = segments[segments.length - 1];
    }
  } else if (segments[0] === 'people' && segments.length >= 3) {
    // Case 3: /people/Name/1000834...
    const numericId = segments[2].match(/^(\d{5,})$/);
    identifier = numericId ? `id_${numericId[1]}` : segments[2];
  } else if (segments.length >= 1) {
    // Case 4: /pagename or /123456789 (strip trailing /about, /videos, /reels, /posts, /photos)
    const first = segments[0];
    identifier = /^\d{5,}$/.test(first) ? `id_${first}` : first;
  }

  const blockedSlugs = new Set([
    'home',
    'home.php',
    'watch',
    'marketplace',
    'groups',
    'gaming',
    'login',
    'login.php',
    'reg',
    'r.php',
    'recover',
    'share',
    'sharer',
    'sharer.php',
    'reel',
    'reels',
    'stories',
    'events',
    'friends',
    'messages',
    'notifications',
    'settings',
    'help',
    'privacy',
    'policies',
    'business',
    'ads',
    'hashtag',
    'search',
    'photo',
    'photo.php',
    'video.php',
  ]);

  if (!identifier || blockedSlugs.has(identifier)) {
    return {
      valid: false,
      error: 'Please enter a specific Facebook Page URL (e.g., https://www.facebook.com/yourpagename), not a generic Facebook home, share, group, or login link.',
      rawUrl: trimmed,
      normalizedUrl: '',
      canonicalKey: '',
    };
  }

  const safeIdentifier = identifier.replace(/[^a-z0-9._-]/g, '');
  if (!safeIdentifier || safeIdentifier.length < 2) {
    return {
      valid: false,
      error: 'Please enter a valid Facebook Page username or ID.',
      rawUrl: trimmed,
      normalizedUrl: '',
      canonicalKey: '',
    };
  }

  // Canonical https rawUrl (ensures clean https + lowercase Facebook host for Firestore rule regex)
  const cleanRawUrl = `https://${rawHost}${parsed.pathname}${parsed.search}`.slice(0, 600);
  const normalizedUrl = `facebook.com/${safeIdentifier}`;
  const slug = safeIdentifier.replace(/[^a-z0-9]/g, '_').replace(/_+/g, '_').replace(/^_|_$/g, '');

  // Deterministic FNV-1a dual hash suffix to prevent collisions on punctuation differences
  let h1 = 0x811c9dc5;
  let h2 = 0x01000193;
  for (let i = 0; i < normalizedUrl.length; i++) {
    const c = normalizedUrl.charCodeAt(i);
    h1 = Math.imul(h1 ^ c, 0x01000193);
    h2 = Math.imul(h2 ^ (c + i), 0x85ebca6b);
  }
  const hashHex = `${(h1 >>> 0).toString(16).padStart(8, '0')}${(h2 >>> 0).toString(16).padStart(8, '0')}`;
  const canonicalKey = `fb_${slug.slice(0, 72)}_${hashHex}`;

  return {
    valid: true,
    rawUrl: cleanRawUrl,
    normalizedUrl,
    canonicalKey,
  };
}

/**
 * Strict Facebook-only validator for Daily Video / Post Proof URLs.
 * Allows facebook.com, fb.com, fb.me, and fb.watch video/reel/post links only.
 */
export function validateFacebookProofUrl(input: string): {
  valid: boolean;
  error?: string;
  cleanUrl: string;
} {
  const trimmed = input.trim();
  if (!trimmed || /\s/.test(trimmed)) {
    return {
      valid: false,
      error: 'Please enter a valid Facebook video/post URL (no spaces).',
      cleanUrl: '',
    };
  }
  const withProtocol = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
  let parsed: URL;
  try {
    parsed = new URL(withProtocol);
  } catch {
    return {
      valid: false,
      error: 'Invalid URL format. Example: https://www.facebook.com/yourpage/videos/123456',
      cleanUrl: '',
    };
  }
  if (parsed.username || parsed.password || parsed.port) {
    return { valid: false, error: 'Invalid Facebook URL format.', cleanUrl: '' };
  }
  const rawHost = parsed.hostname.toLowerCase();
  const host = rawHost.replace(/^(www|m|mbasic|mobile|web|touch|l)\./, '');
  if (host !== 'facebook.com' && host !== 'fb.com' && host !== 'fb.me' && host !== 'fb.watch') {
    return {
      valid: false,
      error: 'Only Facebook video/post URLs (facebook.com, fb.watch, fb.com) are allowed.',
      cleanUrl: '',
    };
  }
  const pathClean = parsed.pathname.replace(/\/+/g, '/').replace(/^\/|\/$/g, '');
  if (!pathClean) {
    return {
      valid: false,
      error: 'Please paste the full link to your uploaded Facebook video or post.',
      cleanUrl: '',
    };
  }
  return {
    valid: true,
    cleanUrl: `https://${rawHost}${parsed.pathname}${parsed.search}`.slice(0, 600),
  };
}

export function getTodayDateKey(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function getCurrentWeekKey(date: Date = new Date()): string {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
  return `${d.getUTCFullYear()}-W${String(weekNo).padStart(2, '0')}`;
}

export function formatTimestamp(ts?: Timestamp | null | string): string {
  if (!ts) return '—';
  const date = typeof ts === 'string' ? new Date(ts) : ts.toDate ? ts.toDate() : new Date();
  if (Number.isNaN(date.getTime())) return '—';
  return new Intl.DateTimeFormat('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

export function generateShortCode(prefix: string, seed?: string): string {
  const randomPart = seed
    ? Math.abs(
        seed.split('').reduce((acc, ch) => ((acc << 5) - acc + ch.charCodeAt(0)) | 0, 0),
      )
        .toString(36)
        .toUpperCase()
        .slice(0, 6)
        .padStart(6, 'X')
    : Math.random().toString(36).substring(2, 8).toUpperCase();
  return `${prefix}${randomPart}`;
}

export function generateDocId(prefix: string): string {
  const rand = Math.random().toString(36).slice(2, 10);
  return `${prefix}_${Date.now().toString(36)}_${rand}`;
}

/**
 * Compresses an uploaded image file to a lightweight WebP/JPEG data URL
 * so Admin QR codes, Training Thumbnails, Avatars, and Receipts stay safely under Firestore limits.
 */
export async function compressImageToDataUrl(
  file: File,
  maxDimension = 900,
  quality = 0.78,
): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Failed to read image file.'));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error('Selected file is not a valid image.'));
      img.onload = () => {
        let { width, height } = img;
        if (width > maxDimension || height > maxDimension) {
          if (width > height) {
            height = Math.round((height * maxDimension) / width);
            width = maxDimension;
          } else {
            width = Math.round((width * maxDimension) / height);
            height = maxDimension;
          }
        }
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Canvas context unavailable.'));
          return;
        }
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, width, height);
        ctx.drawImage(img, 0, 0, width, height);
        const dataUrl = canvas.toDataURL('image/jpeg', quality);
        if (dataUrl.length > 320000) {
          resolve(canvas.toDataURL('image/jpeg', 0.55));
        } else {
          resolve(dataUrl);
        }
      };
      img.src = String(reader.result);
    };
    reader.readAsDataURL(file);
  });
}

export function getReferralShareUrl(referralCode: string): string {
  const origin = typeof window !== 'undefined' ? window.location.origin : '';
  return `${origin}/?ref=${encodeURIComponent(referralCode)}`;
}

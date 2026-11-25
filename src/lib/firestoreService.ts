import type { User as FirebaseUser } from 'firebase/auth';
import {
  deleteDoc,
  doc,
  getDoc,
  runTransaction,
  serverTimestamp,
  setDoc,
  updateDoc,
  writeBatch,
} from 'firebase/firestore';
import {
  BOOTSTRAP_ADMIN_EMAIL,
  isBootstrapAdminEmail,
  db,
  handleFirestoreError,
  OperationType,
} from './firebase';
import {
  calculateWeeklyCommission,
  calculateWeeklySalary,
  canonicalizeFacebookUrl,
  DEFAULT_ADMIN_SETTINGS,
  DUPLICATE_FB_ERROR_MESSAGE,
  generateDocId,
  generateShortCode,
  getCurrentWeekKey,
  getTodayDateKey,
  round2,
  validateFacebookProofUrl,
} from './utils';
import type {
  AdminSettings,
  DailyInstruction,
  DailySubmissionStatus,
  FacebookPageLink,
  FacebookPageStatus,
  PaymentMethod,
  PlanPagesCount,
  PlanPurchase,
  TrainingPurchase,
  UserProfile,
  UserWallet,
  WalletTransactionType,
  WeeklyVerification,
  WithdrawalRequest,
  WithdrawalStatus,
} from '../types';

export async function createNotification(
  userId: string,
  eventType: string,
  title: string,
  message: string,
) {
  const id = generateDocId('ntf');
  try {
    await setDoc(doc(db, 'notifications', id), {
      userId,
      eventType,
      title: title.slice(0, 160),
      message: message.slice(0, 600),
      read: false,
      createdAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, `notifications/${id}`);
  }
}

export async function logAdminAction(
  adminUid: string,
  adminEmail: string,
  action: string,
  targetType: string,
  targetId: string,
  details: string,
) {
  const id = generateDocId('log');
  try {
    await setDoc(doc(db, 'admin_activity_logs', id), {
      adminUid,
      adminEmail,
      action: action.slice(0, 160),
      targetType: targetType.slice(0, 80),
      targetId: targetId.slice(0, 128),
      details: details.slice(0, 1000),
      createdAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, `admin_activity_logs/${id}`);
  }
}

/**
 * Ensures new user document, zero-initialized wallet, referral code index,
 * referral linkage, and (for bootstrap admin) default global settings exist.
 */
export async function ensureUserInitialized(
  fbUser: FirebaseUser,
  options?: { fullName?: string; referralCodeInput?: string },
): Promise<UserProfile> {
  const uid = fbUser.uid;
  const userRef = doc(db, 'users', uid);
  const isBootstrapAdmin = isBootstrapAdminEmail(fbUser.email) && fbUser.emailVerified;

  // Bootstrap global settings if admin signs in and settings doc doesn't exist yet
  if (isBootstrapAdmin) {
    try {
      const settingsSnap = await getDoc(doc(db, 'admin_settings', 'global'));
      if (!settingsSnap.exists()) {
        await setDoc(doc(db, 'admin_settings', 'global'), {
          ...DEFAULT_ADMIN_SETTINGS,
          updatedAt: serverTimestamp(),
        });
      }
      const adminSnap = await getDoc(doc(db, 'admins', uid));
      if (!adminSnap.exists()) {
        await setDoc(doc(db, 'admins', uid), {
          uid,
          email: fbUser.email || BOOTSTRAP_ADMIN_EMAIL,
          addedBy: 'bootstrap',
          createdAt: serverTimestamp(),
        });
      }
    } catch (err) {
      console.warn('Admin settings bootstrap warning:', err);
    }
  }

  let existingSnap;
  try {
    existingSnap = await getDoc(userRef);
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, `users/${uid}`);
  }

  if (existingSnap.exists()) {
    let profile = existingSnap.data() as UserProfile;
    if (isBootstrapAdmin && (profile.role !== 'admin' || !profile.trainingVerified || profile.trainingStatus !== 'verified')) {
      try {
        await updateDoc(userRef, {
          role: 'admin',
          trainingVerified: true,
          trainingStatus: 'verified',
          updatedAt: serverTimestamp(),
        });
        profile = {
          ...profile,
          role: 'admin',
          trainingVerified: true,
          trainingStatus: 'verified',
        };
      } catch (err) {
        console.warn('Bootstrap admin profile promotion warning:', err);
      }
    }
    // Ensure wallet exists
    try {
      const walletSnap = await getDoc(doc(db, 'wallets', uid));
      if (!walletSnap.exists()) {
        await setDoc(doc(db, 'wallets', uid), {
          userId: uid,
          availableBalance: 0,
          reservedBalance: 0,
          pendingEarnings: 0,
          totalSalaryIncome: 0,
          totalAffiliateIncome: 0,
          currentWeekEarnings: 0,
          totalWithdrawn: 0,
          lifetimeEarnings: 0,
          updatedAt: serverTimestamp(),
        });
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `wallets/${uid}`);
    }
    return profile;
  }

  // Create new profile
  const fullName = (
    options?.fullName?.trim() ||
    fbUser.displayName?.trim() ||
    fbUser.email?.split('@')[0] ||
    'Creator'
  ).slice(0, 120);
  const userCode = generateShortCode('PW-', uid);
  const referralCode = generateShortCode('REF', uid + Date.now().toString(36));

  let referredByUid = '';
  let referredByCode = '';
  const candidateRef = options?.referralCodeInput?.trim().toUpperCase();
  if (candidateRef && /^[A-Z0-9_-]{3,32}$/.test(candidateRef)) {
    try {
      const refSnap = await getDoc(doc(db, 'referral_codes', candidateRef));
      if (refSnap.exists()) {
        const refData = refSnap.data();
        if (refData.ownerUid && refData.ownerUid !== uid) {
          referredByUid = refData.ownerUid;
          referredByCode = refData.code;
        }
      }
    } catch {
      // Ignore invalid referral lookup
    }
  }

  const newProfile: Omit<UserProfile, 'createdAt' | 'updatedAt'> & {
    createdAt: ReturnType<typeof serverTimestamp>;
    updatedAt: ReturnType<typeof serverTimestamp>;
  } = {
    uid,
    userCode,
    fullName,
    email: (fbUser.email || '').slice(0, 200),
    phone: '',
    photoUrl: (fbUser.photoURL || '').slice(0, 250000),
    role: isBootstrapAdmin ? 'admin' : 'user',
    referralCode,
    referredByUid,
    referredByCode,
    trainingVerified: isBootstrapAdmin ? true : false,
    trainingStatus: isBootstrapAdmin ? 'verified' : 'not_purchased',
    activePlanPages: 0,
    activePlanPurchaseId: '',
    accountStatus: 'active',
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };

  try {
    const batch = writeBatch(db);
    batch.set(userRef, newProfile);
    batch.set(doc(db, 'wallets', uid), {
      userId: uid,
      availableBalance: 0,
      reservedBalance: 0,
      pendingEarnings: 0,
      totalSalaryIncome: 0,
      totalAffiliateIncome: 0,
      currentWeekEarnings: 0,
      totalWithdrawn: 0,
      lifetimeEarnings: 0,
      updatedAt: serverTimestamp(),
    });
    batch.set(doc(db, 'referral_codes', referralCode), {
      code: referralCode,
      ownerUid: uid,
      ownerCode: userCode,
      ownerName: fullName,
      createdAt: serverTimestamp(),
    });
    if (referredByUid && referredByCode) {
      const referralDocId = `${referredByUid}_${uid}`;
      batch.set(doc(db, 'affiliate_referrals', referralDocId), {
        referrerUid: referredByUid,
        referrerCode: referredByCode,
        referredUid: uid,
        referredCode: userCode,
        referredName: fullName,
        referredPlanPages: 0,
        activePagesCount: 0,
        inactivePagesCount: 0,
        trainingVerified: false,
        status: 'pending',
        lastWeekCommission: 0,
        totalCommissionEarned: 0,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    }
    const notifId = generateDocId('ntf');
    batch.set(doc(db, 'notifications', notifId), {
      userId: uid,
      eventType: 'registration_successful',
      title: 'Registration Successful',
      message: `Welcome to Facebook Earner, ${fullName}! Your Unique User ID is ${userCode}.`,
      read: false,
      createdAt: serverTimestamp(),
    });
    await batch.commit();
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, `users/${uid}`);
  }

  const createdSnap = await getDoc(userRef);
  return createdSnap.data() as UserProfile;
}

export async function updateUserProfile(
  uid: string,
  updates: { fullName: string; phone: string; photoUrl: string },
) {
  try {
    await updateDoc(doc(db, 'users', uid), {
      fullName: updates.fullName.trim().slice(0, 120),
      phone: updates.phone.trim().slice(0, 30),
      photoUrl: updates.photoUrl.slice(0, 250000),
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `users/${uid}`);
  }
}

// ==================== PAID TRAINING ====================

export async function submitTrainingPayment(
  user: UserProfile,
  amount: number,
  utrNumber: string,
  receiptUrl: string,
) {
  const purchaseId = generateDocId('trn');
  try {
    const batch = writeBatch(db);
    batch.set(doc(db, 'training_purchases', purchaseId), {
      userId: user.uid,
      userCode: user.userCode,
      userName: user.fullName,
      userEmail: user.email,
      amount: round2(amount),
      utrNumber: utrNumber.trim().slice(0, 100),
      receiptUrl: receiptUrl.slice(0, 300000),
      status: 'pending',
      adminNote: '',
      verifiedBy: '',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    batch.update(doc(db, 'users', user.uid), {
      trainingStatus: 'pending',
      updatedAt: serverTimestamp(),
    });
    const notifId = generateDocId('ntf');
    batch.set(doc(db, 'notifications', notifId), {
      userId: user.uid,
      eventType: 'training_payment_received',
      title: 'Training Payment Received',
      message: `Your payment of ₹${amount} (UTR: ${utrNumber.trim()}) has been submitted for Admin verification.`,
      read: false,
      createdAt: serverTimestamp(),
    });
    await batch.commit();
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, `training_purchases/${purchaseId}`);
  }
}

export async function adminVerifyTrainingPayment(
  admin: UserProfile,
  purchase: TrainingPurchase,
  decision: 'verified' | 'rejected',
  adminNote: string,
) {
  try {
    const batch = writeBatch(db);
    batch.update(doc(db, 'training_purchases', purchase.id), {
      status: decision,
      adminNote: adminNote.slice(0, 500),
      verifiedBy: admin.uid,
      updatedAt: serverTimestamp(),
    });

    if (decision === 'verified') {
      batch.update(doc(db, 'users', purchase.userId), {
        trainingVerified: true,
        trainingStatus: 'verified',
        updatedAt: serverTimestamp(),
      });
      batch.set(doc(db, 'notifications', generateDocId('ntf')), {
        userId: purchase.userId,
        eventType: 'training_payment_verified',
        title: 'Training Payment Verified',
        message: 'Your training payment has been verified by Admin.',
        read: false,
        createdAt: serverTimestamp(),
      });
      batch.set(doc(db, 'notifications', generateDocId('ntf')), {
        userId: purchase.userId,
        eventType: 'dashboard_unlocked',
        title: 'Dashboard Unlocked',
        message: 'Your Main Dashboard, Work Plans, Affiliate Program, and Wallet are now permanently unlocked.',
        read: false,
        createdAt: serverTimestamp(),
      });
    } else {
      batch.update(doc(db, 'users', purchase.userId), {
        trainingVerified: false,
        trainingStatus: 'not_purchased',
        updatedAt: serverTimestamp(),
      });
      batch.set(doc(db, 'notifications', generateDocId('ntf')), {
        userId: purchase.userId,
        eventType: 'training_payment_rejected',
        title: 'Training Payment Rejected',
        message: adminNote || 'Your training payment could not be verified. Please check your UTR and submit again.',
        read: false,
        createdAt: serverTimestamp(),
      });
    }

    batch.set(doc(db, 'admin_activity_logs', generateDocId('log')), {
      adminUid: admin.uid,
      adminEmail: admin.email,
      action: `Training Payment ${decision === 'verified' ? 'Verified' : 'Rejected'}`,
      targetType: 'training_purchase',
      targetId: purchase.id,
      details: `${purchase.userCode} (${purchase.userName}) — ₹${purchase.amount} UTR ${purchase.utrNumber}. ${adminNote}`,
      createdAt: serverTimestamp(),
    });

    await batch.commit();

    // Update referral doc if user was referred
    if (decision === 'verified') {
      const userSnap = await getDoc(doc(db, 'users', purchase.userId));
      const uData = userSnap.data() as UserProfile | undefined;
      if (uData?.referredByUid) {
        const refDocRef = doc(db, 'affiliate_referrals', `${uData.referredByUid}_${purchase.userId}`);
        const refSnap = await getDoc(refDocRef);
        if (refSnap.exists()) {
          await updateDoc(refDocRef, {
            trainingVerified: true,
            updatedAt: serverTimestamp(),
          });
        }
      }
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `training_purchases/${purchase.id}`);
  }
}

export async function adminToggleUserTrainingAccess(
  admin: UserProfile,
  targetUser: UserProfile,
  activate: boolean,
) {
  try {
    const batch = writeBatch(db);
    batch.update(doc(db, 'users', targetUser.uid), {
      trainingVerified: activate,
      trainingStatus: activate ? 'verified' : 'revoked',
      updatedAt: serverTimestamp(),
    });
    batch.set(doc(db, 'notifications', generateDocId('ntf')), {
      userId: targetUser.uid,
      eventType: activate ? 'dashboard_unlocked' : 'training_revoked',
      title: activate ? 'Training Access Activated' : 'Training Access Deactivated',
      message: activate
        ? 'Admin has activated your Training Access and unlocked your dashboard.'
        : 'Admin has temporarily deactivated your Training Access. Please contact Support.',
      read: false,
      createdAt: serverTimestamp(),
    });
    batch.set(doc(db, 'admin_activity_logs', generateDocId('log')), {
      adminUid: admin.uid,
      adminEmail: admin.email,
      action: activate ? 'Activated Training Access' : 'Deactivated Training Access',
      targetType: 'user',
      targetId: targetUser.uid,
      details: `${targetUser.userCode} (${targetUser.fullName})`,
      createdAt: serverTimestamp(),
    });
    await batch.commit();
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `users/${targetUser.uid}`);
  }
}

// ==================== WORK PLANS & GLOBAL DUPLICATE-PROOF FB LINKS ====================

export async function enrollWorkPlan(
  user: UserProfile,
  settings: AdminSettings,
  planPages: PlanPagesCount,
  utrNumber: string,
  receiptUrl: string,
) {
  const planPrice =
    planPages === 50
      ? settings.plan50Price
      : planPages === 100
        ? settings.plan100Price
        : settings.plan150Price;
  const monthlySalarySnapshot =
    planPages === 50
      ? settings.plan50MonthlySalary
      : planPages === 100
        ? settings.plan100MonthlySalary
        : settings.plan150MonthlySalary;
  const weeklyCommissionSnapshot =
    planPages === 50
      ? settings.plan50WeeklyCommission
      : planPages === 100
        ? settings.plan100WeeklyCommission
        : settings.plan150WeeklyCommission;

  const purchaseId = generateDocId('pln');
  const isFree = planPrice <= 0;

  try {
    const batch = writeBatch(db);
    batch.set(doc(db, 'plan_purchases', purchaseId), {
      userId: user.uid,
      userCode: user.userCode,
      userName: user.fullName,
      planPages,
      planPrice: round2(planPrice),
      monthlySalarySnapshot: round2(monthlySalarySnapshot),
      weeklyCommissionSnapshot: round2(weeklyCommissionSnapshot),
      utrNumber: isFree ? 'FREE-PLAN' : utrNumber.trim().slice(0, 100),
      receiptUrl: receiptUrl.slice(0, 300000),
      paymentStatus: isFree ? 'approved' : 'pending',
      workStarted: false,
      workStartedAt: '',
      currentWeekKey: getCurrentWeekKey(),
      submittedPagesCount: 0,
      adminNote: '',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    if (isFree) {
      batch.update(doc(db, 'users', user.uid), {
        activePlanPages: planPages,
        activePlanPurchaseId: purchaseId,
        updatedAt: serverTimestamp(),
      });
      batch.set(doc(db, 'notifications', generateDocId('ntf')), {
        userId: user.uid,
        eventType: 'plan_activated',
        title: `${planPages} Pages Plan Activated`,
        message: `Your ${planPages} Pages Work Plan is active! Upload all ${planPages} unique Facebook Page links to unlock the Start Work button.`,
        read: false,
        createdAt: serverTimestamp(),
      });
    } else {
      batch.set(doc(db, 'notifications', generateDocId('ntf')), {
        userId: user.uid,
        eventType: 'plan_payment_submitted',
        title: `${planPages} Pages Plan Payment Submitted`,
        message: `Payment of ₹${planPrice} (UTR: ${utrNumber.trim()}) submitted for Admin approval.`,
        read: false,
        createdAt: serverTimestamp(),
      });
    }
    await batch.commit();

    if (isFree && user.referredByUid) {
      try {
        const refDocRef = doc(db, 'affiliate_referrals', `${user.referredByUid}_${user.uid}`);
        const refSnap = await getDoc(refDocRef);
        if (refSnap.exists()) {
          await updateDoc(refDocRef, {
            referredPlanPages: planPages,
            status: 'active',
            updatedAt: serverTimestamp(),
          });
        }
      } catch {
        // Non-blocking if referral linkage doesn't exist
      }
    }

    return purchaseId;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, `plan_purchases/${purchaseId}`);
  }
}

export async function adminVerifyPlanPurchase(
  admin: UserProfile,
  plan: PlanPurchase,
  decision: 'approved' | 'rejected',
  adminNote: string,
) {
  try {
    const batch = writeBatch(db);
    batch.update(doc(db, 'plan_purchases', plan.id), {
      paymentStatus: decision,
      adminNote: adminNote.slice(0, 500),
      updatedAt: serverTimestamp(),
    });
    if (decision === 'approved') {
      batch.update(doc(db, 'users', plan.userId), {
        activePlanPages: plan.planPages,
        activePlanPurchaseId: plan.id,
        updatedAt: serverTimestamp(),
      });
      batch.set(doc(db, 'notifications', generateDocId('ntf')), {
        userId: plan.userId,
        eventType: 'plan_activated',
        title: `${plan.planPages} Pages Plan Activated`,
        message: `Admin approved your ${plan.planPages} Pages Work Plan. Submit all ${plan.planPages} Facebook Page links to start work.`,
        read: false,
        createdAt: serverTimestamp(),
      });
    } else {
      batch.set(doc(db, 'notifications', generateDocId('ntf')), {
        userId: plan.userId,
        eventType: 'plan_rejected',
        title: `${plan.planPages} Pages Plan Rejected`,
        message: adminNote || 'Your work plan payment could not be verified.',
        read: false,
        createdAt: serverTimestamp(),
      });
    }
    batch.set(doc(db, 'admin_activity_logs', generateDocId('log')), {
      adminUid: admin.uid,
      adminEmail: admin.email,
      action: `Work Plan ${decision === 'approved' ? 'Approved' : 'Rejected'}`,
      targetType: 'plan_purchase',
      targetId: plan.id,
      details: `${plan.userCode} — ${plan.planPages} Pages Plan (₹${plan.planPrice}). ${adminNote}`,
      createdAt: serverTimestamp(),
    });
    await batch.commit();

    if (decision === 'approved') {
      const uSnap = await getDoc(doc(db, 'users', plan.userId));
      const uData = uSnap.data() as UserProfile | undefined;
      if (uData?.referredByUid) {
        const refDocRef = doc(db, 'affiliate_referrals', `${uData.referredByUid}_${plan.userId}`);
        const refSnap = await getDoc(refDocRef);
        if (refSnap.exists()) {
          await updateDoc(refDocRef, {
            referredPlanPages: plan.planPages,
            status: 'active',
            updatedAt: serverTimestamp(),
          });
        }
      }
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `plan_purchases/${plan.id}`);
  }
}

/**
 * STRICT DATABASE-LEVEL GLOBAL DUPLICATE PREVENTION
 * Atomically checks and claims global_facebook_pages/{canonicalKey} inside a Firestore transaction.
 */
export async function submitFacebookPageLinkAtomic(
  user: UserProfile,
  plan: PlanPurchase,
  slotIndex: number,
  rawUrl: string,
): Promise<{ success: true; pageId: string } | { success: false; error: string }> {
  const parsed = canonicalizeFacebookUrl(rawUrl);
  if (!parsed.valid) {
    return { success: false, error: parsed.error || 'Invalid Facebook Page URL.' };
  }

  const globalRef = doc(db, 'global_facebook_pages', parsed.canonicalKey);
  const pageId = generateDocId('fbp');
  const pageRef = doc(db, 'facebook_pages', pageId);
  const planRef = doc(db, 'plan_purchases', plan.id);

  try {
    await runTransaction(db, async (tx) => {
      const globalSnap = await tx.get(globalRef);
      if (globalSnap.exists()) {
        throw new Error('DUPLICATE_FB_LINK');
      }

      const planSnap = await tx.get(planRef);
      if (!planSnap.exists()) {
        throw new Error('Work plan record not found.');
      }
      const planData = planSnap.data() as PlanPurchase;
      if (planData.submittedPagesCount >= planData.planPages) {
        throw new Error(`Maximum limit of ${planData.planPages} Facebook pages reached for this plan.`);
      }

      tx.set(globalRef, {
        canonicalKey: parsed.canonicalKey,
        normalizedUrl: parsed.normalizedUrl,
        rawUrl: parsed.rawUrl,
        ownerUserId: user.uid,
        ownerUserCode: user.userCode,
        ownerName: user.fullName,
        pageDocId: pageId,
        createdAt: serverTimestamp(),
      });

      tx.set(pageRef, {
        userId: user.uid,
        userCode: user.userCode,
        userName: user.fullName,
        planPurchaseId: plan.id,
        planPages: plan.planPages,
        slotIndex,
        rawUrl: parsed.rawUrl,
        normalizedUrl: parsed.normalizedUrl,
        canonicalKey: parsed.canonicalKey,
        status: 'Pending Approval',
        rejectionReason: '',
        lastWorkDate: '',
        totalApprovedTasks: 0,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      tx.update(planRef, {
        submittedPagesCount: planData.submittedPagesCount + 1,
        updatedAt: serverTimestamp(),
      });
    });

    await createNotification(
      user.uid,
      'facebook_link_submitted',
      'Facebook Link Submitted',
      `Slot #${slotIndex} (${parsed.normalizedUrl}) submitted and awaiting manual Admin approval.`,
    );

    return { success: true, pageId };
  } catch (error) {
    if (error instanceof Error && error.message === 'DUPLICATE_FB_LINK') {
      return { success: false, error: DUPLICATE_FB_ERROR_MESSAGE };
    }
    if (
      error instanceof Error &&
      (error.message.includes('Maximum limit') || error.message.includes('Work plan'))
    ) {
      return { success: false, error: error.message };
    }
    handleFirestoreError(error, OperationType.WRITE, `global_facebook_pages/${parsed.canonicalKey}`);
  }
}

export async function startWorkOnPlan(user: UserProfile, plan: PlanPurchase) {
  if (plan.submittedPagesCount < plan.planPages) {
    throw new Error(
      `Please upload all ${plan.planPages} Facebook Page links before starting work (${plan.submittedPagesCount}/${plan.planPages} uploaded).`,
    );
  }
  try {
    const weekKey = getCurrentWeekKey();
    await updateDoc(doc(db, 'plan_purchases', plan.id), {
      workStarted: true,
      workStartedAt: new Date().toISOString(),
      currentWeekKey: weekKey,
      updatedAt: serverTimestamp(),
    });
    await createNotification(
      user.uid,
      'work_started',
      'Work Cycle Started',
      `Your ${plan.planPages} Pages work cycle (${weekKey}) has started! Follow Admin's Daily Work Instructions to submit daily videos.`,
    );
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `plan_purchases/${plan.id}`);
  }
}

export async function adminUpdateFacebookPageStatus(
  admin: UserProfile,
  page: FacebookPageLink,
  status: FacebookPageStatus,
  rejectionReason = '',
) {
  try {
    const batch = writeBatch(db);
    batch.update(doc(db, 'facebook_pages', page.id), {
      status,
      rejectionReason: rejectionReason.slice(0, 400),
      updatedAt: serverTimestamp(),
    });

    let eventType = 'facebook_link_updated';
    let title = `Facebook Page Status: ${status}`;
    let message = `Slot #${page.slotIndex} (${page.normalizedUrl}) is now marked as ${status}.`;
    if (status === 'Approved' || status === 'Work Active') {
      eventType = 'facebook_link_approved';
      title = 'Facebook Link Approved';
      message = `Slot #${page.slotIndex} (${page.normalizedUrl}) has been approved (${status}).`;
    } else if (status === 'Rejected') {
      eventType = 'facebook_link_rejected';
      title = 'Facebook Link Rejected';
      message = `Slot #${page.slotIndex} (${page.normalizedUrl}) was rejected. ${rejectionReason || ''}`.trim();
    } else if (status === 'Page Deactivated') {
      eventType = 'page_deactivated';
      title = 'Page Deactivated';
      message = `Slot #${page.slotIndex} (${page.normalizedUrl}) was marked Page Deactivated. Earnings will not accrue for deactivated pages.`;
    }

    batch.set(doc(db, 'notifications', generateDocId('ntf')), {
      userId: page.userId,
      eventType,
      title,
      message,
      read: false,
      createdAt: serverTimestamp(),
    });
    batch.set(doc(db, 'page_activity_records', generateDocId('par')), {
      pageId: page.id,
      userId: page.userId,
      userCode: page.userCode,
      pageUrl: page.normalizedUrl,
      weekKey: getCurrentWeekKey(),
      previousStatus: page.status,
      newStatus: status,
      reason: rejectionReason.slice(0, 400),
      changedBy: admin.uid,
      createdAt: serverTimestamp(),
    });
    batch.set(doc(db, 'admin_activity_logs', generateDocId('log')), {
      adminUid: admin.uid,
      adminEmail: admin.email,
      action: `Page Status -> ${status}`,
      targetType: 'facebook_page',
      targetId: page.id,
      details: `${page.userCode} Slot #${page.slotIndex} (${page.normalizedUrl}) ${rejectionReason}`,
      createdAt: serverTimestamp(),
    });
    await batch.commit();
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `facebook_pages/${page.id}`);
  }
}

// ==================== DAILY WORK INSTRUCTIONS & VERIFICATION ====================

export async function adminSaveDailyInstruction(
  admin: UserProfile,
  data: {
    id?: string;
    title: string;
    description: string;
    guidelines: string;
    videoUrl: string;
    taskDate: string;
    isActive: boolean;
  },
  activeUserIds: string[] = [],
) {
  const id = data.id || generateDocId('ins');
  try {
    if (data.id) {
      await updateDoc(doc(db, 'daily_instructions', id), {
        title: data.title.trim().slice(0, 200),
        description: data.description.trim().slice(0, 3000),
        guidelines: data.guidelines.trim().slice(0, 3000),
        videoUrl: data.videoUrl.trim().slice(0, 1000),
        taskDate: data.taskDate.trim().slice(0, 32),
        isActive: data.isActive,
        updatedAt: serverTimestamp(),
      });
    } else {
      await setDoc(doc(db, 'daily_instructions', id), {
        title: data.title.trim().slice(0, 200),
        description: data.description.trim().slice(0, 3000),
        guidelines: data.guidelines.trim().slice(0, 3000),
        videoUrl: data.videoUrl.trim().slice(0, 1000),
        taskDate: data.taskDate.trim().slice(0, 32),
        isActive: data.isActive,
        createdBy: admin.uid,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      // Notify all verified active creators ("Daily Task Assigned")
      if (data.isActive && activeUserIds.length > 0) {
        const chunkSize = 400;
        for (let i = 0; i < activeUserIds.length; i += chunkSize) {
          const chunk = activeUserIds.slice(i, i + chunkSize);
          const ntfBatch = writeBatch(db);
          chunk.forEach((uid) => {
            ntfBatch.set(doc(db, 'notifications', generateDocId('ntf')), {
              userId: uid,
              eventType: 'daily_task_assigned',
              title: 'Daily Task Assigned',
              message: `New video instruction for ${data.taskDate}: ${data.title.trim().slice(0, 160)}`,
              read: false,
              createdAt: serverTimestamp(),
            });
          });
          await ntfBatch.commit();
        }
      }
    }
    await logAdminAction(
      admin.uid,
      admin.email,
      data.id ? 'Updated Daily Instruction' : 'Published Daily Instruction',
      'daily_instruction',
      id,
      `${data.taskDate}: ${data.title}`,
    );
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `daily_instructions/${id}`);
  }
}

export async function adminDeleteDailyInstruction(
  admin: UserProfile,
  instructionId: string,
  title: string,
) {
  try {
    await deleteDoc(doc(db, 'daily_instructions', instructionId));
    await logAdminAction(
      admin.uid,
      admin.email,
      'Deleted Daily Instruction',
      'daily_instruction',
      instructionId,
      title,
    );
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `daily_instructions/${instructionId}`);
  }
}

export async function submitDailyWorkProof(
  user: UserProfile,
  page: FacebookPageLink,
  instruction: DailyInstruction,
  proofUrl: string,
  notes: string,
) {
  const checked = validateFacebookProofUrl(proofUrl);
  if (!checked.valid) {
    throw new Error(checked.error || 'Only valid Facebook video/post URLs are allowed.');
  }

  const id = generateDocId('sub');
  const workDate = getTodayDateKey();
  const weekKey = getCurrentWeekKey();
  try {
    await setDoc(doc(db, 'daily_submissions', id), {
      userId: user.uid,
      userCode: user.userCode,
      userName: user.fullName,
      pageId: page.id,
      pageUrl: page.normalizedUrl,
      instructionId: instruction.id,
      instructionTitle: instruction.title,
      proofUrl: checked.cleanUrl,
      notes: notes.trim().slice(0, 800),
      workDate,
      weekKey,
      status: 'Pending Verification',
      rejectionReason: '',
      verifiedBy: '',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, `daily_submissions/${id}`);
  }
}

export async function adminVerifyDailySubmission(
  admin: UserProfile,
  submissionId: string,
  userId: string,
  pageId: string,
  status: DailySubmissionStatus,
  rejectionReason: string,
) {
  try {
    const batch = writeBatch(db);
    batch.update(doc(db, 'daily_submissions', submissionId), {
      status,
      rejectionReason: rejectionReason.slice(0, 400),
      verifiedBy: admin.uid,
      updatedAt: serverTimestamp(),
    });
    if (status === 'Approved') {
      const pageSnap = await getDoc(doc(db, 'facebook_pages', pageId));
      if (pageSnap.exists()) {
        const pData = pageSnap.data() as FacebookPageLink;
        batch.update(doc(db, 'facebook_pages', pageId), {
          lastWorkDate: getTodayDateKey(),
          totalApprovedTasks: (pData.totalApprovedTasks || 0) + 1,
          updatedAt: serverTimestamp(),
        });
      }
      batch.set(doc(db, 'notifications', generateDocId('ntf')), {
        userId,
        eventType: 'work_approved',
        title: 'Daily Work Approved',
        message: 'Your submitted video upload proof has been verified and approved by Admin.',
        read: false,
        createdAt: serverTimestamp(),
      });
    } else if (status === 'Rejected') {
      batch.set(doc(db, 'notifications', generateDocId('ntf')), {
        userId,
        eventType: 'work_rejected',
        title: 'Daily Work Rejected',
        message: rejectionReason || 'Your daily submission did not follow the official video instructions.',
        read: false,
        createdAt: serverTimestamp(),
      });
    }
    batch.set(doc(db, 'admin_activity_logs', generateDocId('log')), {
      adminUid: admin.uid,
      adminEmail: admin.email,
      action: `Daily Work ${status}`,
      targetType: 'daily_submission',
      targetId: submissionId,
      details: rejectionReason || `Verified for page ${pageId}`,
      createdAt: serverTimestamp(),
    });
    await batch.commit();
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `daily_submissions/${submissionId}`);
  }
}

// ==================== 7TH-DAY WEEKLY VERIFICATION, SALARY & AFFILIATE ENGINE ====================

export async function requestWeeklyVerification(
  user: UserProfile,
  plan: PlanPurchase,
  settings: AdminSettings,
  submittedPagesCount: number,
  weekKey: string,
) {
  const verificationId = `${user.uid}_${weekKey}`;
  const existingSnap = await getDoc(doc(db, 'weekly_verifications', verificationId));
  if (existingSnap.exists()) {
    throw new Error(`Weekly verification for cycle ${weekKey} has already been requested or processed.`);
  }

  const monthlySalaryRate =
    plan.planPages === 50
      ? settings.plan50MonthlySalary
      : plan.planPages === 100
        ? settings.plan100MonthlySalary
        : settings.plan150MonthlySalary;
  const weeklyCommissionRate =
    plan.planPages === 50
      ? settings.plan50WeeklyCommission
      : plan.planPages === 100
        ? settings.plan100WeeklyCommission
        : settings.plan150WeeklyCommission;

  try {
    const batch = writeBatch(db);
    batch.set(doc(db, 'weekly_verifications', verificationId), {
      userId: user.uid,
      userCode: user.userCode,
      userName: user.fullName,
      planPurchaseId: plan.id,
      planPages: plan.planPages,
      weekKey,
      totalSubmittedPages: submittedPagesCount,
      verifiedActivePages: 0,
      deactivatedPages: 0,
      rejectedPages: 0,
      monthlySalaryRate,
      weeklyCommissionRate,
      calculatedSalary: 0,
      calculatedCommission: 0,
      referrerUid: user.referredByUid || '',
      status: 'requested',
      adminNotes: '',
      verifiedBy: '',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    batch.set(doc(db, 'notifications', generateDocId('ntf')), {
      userId: user.uid,
      eventType: 'weekly_verification_started',
      title: 'Weekly Verification Started',
      message: `Your 7-day verification request for week ${weekKey} is queued for manual Admin audit.`,
      read: false,
      createdAt: serverTimestamp(),
    });
    await batch.commit();
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, `weekly_verifications/${verificationId}`);
  }
}

/**
 * Admin executes 7th-day verification for a user & weekKey.
 * Prevents duplicate generation via deterministic verificationId (`{userId}_{weekKey}`).
 * Credits Weekly Salary to worker wallet AND Weekly Affiliate Commission to direct referrer wallet.
 */
export async function adminApproveWeeklyVerification(params: {
  admin: UserProfile;
  targetUser: UserProfile;
  plan: PlanPurchase;
  settings: AdminSettings;
  weekKey: string;
  verifiedActivePages: number;
  deactivatedPages: number;
  rejectedPages: number;
  totalSubmittedPages: number;
  adminNotes: string;
}) {
  const {
    admin,
    targetUser,
    plan,
    settings,
    weekKey,
    verifiedActivePages,
    deactivatedPages,
    rejectedPages,
    totalSubmittedPages,
    adminNotes,
  } = params;

  const verificationId = `${targetUser.uid}_${weekKey}`;
  const verRef = doc(db, 'weekly_verifications', verificationId);
  const existingVer = await getDoc(verRef);
  if (existingVer.exists() && existingVer.data().status === 'approved') {
    throw new Error(`Week ${weekKey} has already been approved and credited. Duplicate weekly payout is blocked.`);
  }

  const monthlySalaryRate =
    plan.planPages === 50
      ? settings.plan50MonthlySalary
      : plan.planPages === 100
        ? settings.plan100MonthlySalary
        : settings.plan150MonthlySalary;
  const weeklyCommissionRate =
    plan.planPages === 50
      ? settings.plan50WeeklyCommission
      : plan.planPages === 100
        ? settings.plan100WeeklyCommission
        : settings.plan150WeeklyCommission;

  const calculatedSalary = calculateWeeklySalary(
    monthlySalaryRate,
    plan.planPages,
    verifiedActivePages,
  );
  const referrerUid = targetUser.referredByUid || '';
  const calculatedCommission = referrerUid
    ? calculateWeeklyCommission(weeklyCommissionRate, plan.planPages, verifiedActivePages)
    : 0;

  try {
    const workerWalletRef = doc(db, 'wallets', targetUser.uid);
    const workerWalletSnap = await getDoc(workerWalletRef);
    const workerWallet: UserWallet = workerWalletSnap.exists()
      ? (workerWalletSnap.data() as UserWallet)
      : {
          userId: targetUser.uid,
          availableBalance: 0,
          reservedBalance: 0,
          pendingEarnings: 0,
          totalSalaryIncome: 0,
          totalAffiliateIncome: 0,
          currentWeekEarnings: 0,
          totalWithdrawn: 0,
          lifetimeEarnings: 0,
        };

    const batch = writeBatch(db);

    if (existingVer.exists()) {
      batch.update(verRef, {
        totalSubmittedPages,
        verifiedActivePages,
        deactivatedPages,
        rejectedPages,
        monthlySalaryRate,
        weeklyCommissionRate,
        calculatedSalary,
        calculatedCommission,
        referrerUid,
        status: 'approved',
        adminNotes: adminNotes.slice(0, 1000),
        verifiedBy: admin.uid,
        updatedAt: serverTimestamp(),
      });
    } else {
      batch.set(verRef, {
        userId: targetUser.uid,
        userCode: targetUser.userCode,
        userName: targetUser.fullName,
        planPurchaseId: plan.id,
        planPages: plan.planPages,
        weekKey,
        totalSubmittedPages,
        verifiedActivePages,
        deactivatedPages,
        rejectedPages,
        monthlySalaryRate,
        weeklyCommissionRate,
        calculatedSalary,
        calculatedCommission,
        referrerUid,
        status: 'approved',
        adminNotes: adminNotes.slice(0, 1000),
        verifiedBy: admin.uid,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    }

    // 1. Weekly Salary Record + Worker Wallet Credit
    const salaryDocId = `sal_${verificationId}`;
    batch.set(doc(db, 'weekly_salaries', salaryDocId), {
      userId: targetUser.uid,
      userCode: targetUser.userCode,
      userName: targetUser.fullName,
      verificationId,
      weekKey,
      planPages: plan.planPages,
      verifiedActivePages,
      monthlySalaryRate,
      amount: calculatedSalary,
      status: 'credited',
      createdAt: serverTimestamp(),
    });

    batch.set(workerWalletRef, {
      userId: targetUser.uid,
      availableBalance: round2(workerWallet.availableBalance + calculatedSalary),
      reservedBalance: round2(workerWallet.reservedBalance),
      pendingEarnings: 0,
      totalSalaryIncome: round2(workerWallet.totalSalaryIncome + calculatedSalary),
      totalAffiliateIncome: round2(workerWallet.totalAffiliateIncome),
      currentWeekEarnings: calculatedSalary,
      totalWithdrawn: round2(workerWallet.totalWithdrawn),
      lifetimeEarnings: round2(workerWallet.lifetimeEarnings + calculatedSalary),
      updatedAt: serverTimestamp(),
    });

    if (calculatedSalary > 0) {
      batch.set(doc(db, 'wallet_transactions', generateDocId('txn')), {
        txnCode: generateShortCode('TXN-'),
        userId: targetUser.uid,
        type: 'Weekly Salary Credit' as WalletTransactionType,
        direction: 'credit',
        amount: calculatedSalary,
        description: `Week ${weekKey} verified salary (${verifiedActivePages}/${plan.planPages} active pages @ ₹${monthlySalaryRate}/mo)`,
        referenceId: verificationId,
        status: 'Completed',
        createdAt: serverTimestamp(),
      });
    }

    batch.set(doc(db, 'notifications', generateDocId('ntf')), {
      userId: targetUser.uid,
      eventType: 'weekly_verification_completed',
      title: 'Weekly Verification Completed',
      message: `Your 7-day verification for Week ${weekKey} is completed (${verifiedActivePages}/${plan.planPages} active pages verified).`,
      read: false,
      createdAt: serverTimestamp(),
    });

    batch.set(doc(db, 'notifications', generateDocId('ntf')), {
      userId: targetUser.uid,
      eventType: 'weekly_salary_credited',
      title: 'Weekly Salary Credited',
      message: `₹${calculatedSalary.toFixed(2)} credited to your Available Wallet for Week ${weekKey} (${verifiedActivePages}/${plan.planPages} verified active pages).`,
      read: false,
      createdAt: serverTimestamp(),
    });

    // 2. Direct Referrer Weekly Affiliate Commission (if applicable)
    if (referrerUid && calculatedCommission > 0) {
      const refWalletRef = doc(db, 'wallets', referrerUid);
      const refWalletSnap = await getDoc(refWalletRef);
      const refWallet: UserWallet = refWalletSnap.exists()
        ? (refWalletSnap.data() as UserWallet)
        : {
            userId: referrerUid,
            availableBalance: 0,
            reservedBalance: 0,
            pendingEarnings: 0,
            totalSalaryIncome: 0,
            totalAffiliateIncome: 0,
            currentWeekEarnings: 0,
            totalWithdrawn: 0,
            lifetimeEarnings: 0,
          };

      const commDocId = `com_${verificationId}`;
      batch.set(doc(db, 'weekly_commissions', commDocId), {
        referrerUid,
        referredUid: targetUser.uid,
        referredName: targetUser.fullName,
        verificationId,
        weekKey,
        planPages: plan.planPages,
        verifiedActivePages,
        weeklyCommissionRate,
        amount: calculatedCommission,
        status: 'credited',
        createdAt: serverTimestamp(),
      });

      batch.set(refWalletRef, {
        userId: referrerUid,
        availableBalance: round2(refWallet.availableBalance + calculatedCommission),
        reservedBalance: round2(refWallet.reservedBalance),
        pendingEarnings: round2(refWallet.pendingEarnings),
        totalSalaryIncome: round2(refWallet.totalSalaryIncome),
        totalAffiliateIncome: round2(refWallet.totalAffiliateIncome + calculatedCommission),
        currentWeekEarnings: round2(refWallet.currentWeekEarnings + calculatedCommission),
        totalWithdrawn: round2(refWallet.totalWithdrawn),
        lifetimeEarnings: round2(refWallet.lifetimeEarnings + calculatedCommission),
        updatedAt: serverTimestamp(),
      });

      batch.set(doc(db, 'wallet_transactions', generateDocId('txn')), {
        txnCode: generateShortCode('TXN-'),
        userId: referrerUid,
        type: 'Affiliate Commission' as WalletTransactionType,
        direction: 'credit',
        amount: calculatedCommission,
        description: `Week ${weekKey} affiliate commission from ${targetUser.fullName} (${verifiedActivePages}/${plan.planPages} active pages)`,
        referenceId: verificationId,
        status: 'Completed',
        createdAt: serverTimestamp(),
      });

      batch.set(doc(db, 'notifications', generateDocId('ntf')), {
        userId: referrerUid,
        eventType: 'weekly_commission_credited',
        title: 'Weekly Affiliate Commission Credited',
        message: `₹${calculatedCommission.toFixed(2)} direct referral commission credited from ${targetUser.fullName} for Week ${weekKey}.`,
        read: false,
        createdAt: serverTimestamp(),
      });

      const refLinkRef = doc(db, 'affiliate_referrals', `${referrerUid}_${targetUser.uid}`);
      const refLinkSnap = await getDoc(refLinkRef);
      if (refLinkSnap.exists()) {
        const prev = refLinkSnap.data();
        batch.update(refLinkRef, {
          referredPlanPages: plan.planPages,
          activePagesCount: verifiedActivePages,
          inactivePagesCount: Math.max(0, plan.planPages - verifiedActivePages),
          status: verifiedActivePages > 0 ? 'active' : 'inactive',
          lastWeekCommission: calculatedCommission,
          totalCommissionEarned: round2((prev.totalCommissionEarned || 0) + calculatedCommission),
          updatedAt: serverTimestamp(),
        });
      }
    }

    batch.set(doc(db, 'admin_activity_logs', generateDocId('log')), {
      adminUid: admin.uid,
      adminEmail: admin.email,
      action: 'Weekly Verification Approved & Credited',
      targetType: 'weekly_verification',
      targetId: verificationId,
      details: `${targetUser.userCode} Week ${weekKey}: ${verifiedActivePages}/${plan.planPages} pages | Salary ₹${calculatedSalary} | Affiliate ₹${calculatedCommission}`,
      createdAt: serverTimestamp(),
    });

    await batch.commit();
    return { calculatedSalary, calculatedCommission };
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `weekly_verifications/${verificationId}`);
  }
}

export async function adminRejectWeeklyVerification(params: {
  admin: UserProfile;
  targetUser: UserProfile;
  plan: PlanPurchase;
  settings: AdminSettings;
  weekKey: string;
  verifiedActivePages: number;
  deactivatedPages: number;
  rejectedPages: number;
  totalSubmittedPages: number;
  adminNotes: string;
}) {
  const {
    admin,
    targetUser,
    plan,
    settings,
    weekKey,
    verifiedActivePages,
    deactivatedPages,
    rejectedPages,
    totalSubmittedPages,
    adminNotes,
  } = params;

  const verificationId = `${targetUser.uid}_${weekKey}`;
  const verRef = doc(db, 'weekly_verifications', verificationId);
  const existingVer = await getDoc(verRef);
  if (existingVer.exists() && existingVer.data().status === 'approved') {
    throw new Error(`Week ${weekKey} has already been approved and credited.`);
  }

  const monthlySalaryRate =
    plan.planPages === 50
      ? settings.plan50MonthlySalary
      : plan.planPages === 100
        ? settings.plan100MonthlySalary
        : settings.plan150MonthlySalary;
  const weeklyCommissionRate =
    plan.planPages === 50
      ? settings.plan50WeeklyCommission
      : plan.planPages === 100
        ? settings.plan100WeeklyCommission
        : settings.plan150WeeklyCommission;

  try {
    const batch = writeBatch(db);
    if (existingVer.exists()) {
      batch.update(verRef, {
        totalSubmittedPages,
        verifiedActivePages,
        deactivatedPages,
        rejectedPages,
        monthlySalaryRate,
        weeklyCommissionRate,
        calculatedSalary: 0,
        calculatedCommission: 0,
        status: 'rejected',
        adminNotes: (adminNotes || 'Weekly work audit did not meet verification requirements.').slice(0, 1000),
        verifiedBy: admin.uid,
        updatedAt: serverTimestamp(),
      });
    } else {
      batch.set(verRef, {
        userId: targetUser.uid,
        userCode: targetUser.userCode,
        userName: targetUser.fullName,
        planPurchaseId: plan.id,
        planPages: plan.planPages,
        weekKey,
        totalSubmittedPages,
        verifiedActivePages,
        deactivatedPages,
        rejectedPages,
        monthlySalaryRate,
        weeklyCommissionRate,
        calculatedSalary: 0,
        calculatedCommission: 0,
        referrerUid: targetUser.referredByUid || '',
        status: 'rejected',
        adminNotes: (adminNotes || 'Weekly work audit did not meet verification requirements.').slice(0, 1000),
        verifiedBy: admin.uid,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    }

    batch.set(doc(db, 'notifications', generateDocId('ntf')), {
      userId: targetUser.uid,
      eventType: 'weekly_verification_rejected',
      title: 'Weekly Verification Rejected',
      message: `Your 7-day verification for Week ${weekKey} was rejected. ${adminNotes || 'Please review daily video compliance with Admin.'}`,
      read: false,
      createdAt: serverTimestamp(),
    });

    batch.set(doc(db, 'admin_activity_logs', generateDocId('log')), {
      adminUid: admin.uid,
      adminEmail: admin.email,
      action: 'Weekly Verification Rejected',
      targetType: 'weekly_verification',
      targetId: verificationId,
      details: `${targetUser.userCode} Week ${weekKey}: ${adminNotes || 'Rejected'}`,
      createdAt: serverTimestamp(),
    });

    await batch.commit();
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `weekly_verifications/${verificationId}`);
  }
}

// ==================== WALLET, PAYMENT METHODS & WITHDRAWALS ====================

export async function savePaymentMethod(
  uid: string,
  method: Omit<PaymentMethod, 'userId' | 'updatedAt'>,
) {
  try {
    await setDoc(doc(db, 'payment_methods', uid), {
      userId: uid,
      bankHolderName: (method.bankHolderName || '').trim().slice(0, 120),
      bankName: (method.bankName || '').trim().slice(0, 120),
      accountNumber: (method.accountNumber || '').trim().slice(0, 40),
      ifscCode: (method.ifscCode || '').trim().toUpperCase().slice(0, 20),
      upiId: (method.upiId || '').trim().slice(0, 120),
      upiHolderName: (method.upiHolderName || '').trim().slice(0, 120),
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `payment_methods/${uid}`);
  }
}

export async function submitWithdrawalRequest(
  user: UserProfile,
  wallet: UserWallet,
  paymentMethod: PaymentMethod,
  amount: number,
  methodType: 'bank' | 'upi',
  minWithdrawalLimit: number,
) {
  const cleanAmount = round2(amount);
  if (cleanAmount < minWithdrawalLimit) {
    throw new Error(`Minimum withdrawal amount is ₹${minWithdrawalLimit}.`);
  }
  if (cleanAmount > wallet.availableBalance) {
    throw new Error('Requested amount exceeds your Available Wallet Balance.');
  }

  const methodSummary =
    methodType === 'bank'
      ? `${paymentMethod.bankName} · A/C ••••${(paymentMethod.accountNumber || '').slice(-4)} (${paymentMethod.ifscCode})`
      : `UPI · ${paymentMethod.upiId}`;

  const withdrawalId = generateDocId('wdr');
  const requestCode = generateShortCode('WDR-');
  const txnId = generateDocId('txn');

  try {
    const batch = writeBatch(db);
    // Reserve funds immediately from availableBalance -> reservedBalance
    batch.update(doc(db, 'wallets', user.uid), {
      availableBalance: round2(wallet.availableBalance - cleanAmount),
      reservedBalance: round2(wallet.reservedBalance + cleanAmount),
      updatedAt: serverTimestamp(),
    });

    batch.set(doc(db, 'withdrawal_requests', withdrawalId), {
      requestCode,
      userId: user.uid,
      userCode: user.userCode,
      userName: user.fullName,
      amount: cleanAmount,
      methodType,
      methodSummary: methodSummary.slice(0, 300),
      accountHolderName:
        methodType === 'bank'
          ? paymentMethod.bankHolderName || ''
          : paymentMethod.upiHolderName || '',
      bankName: methodType === 'bank' ? paymentMethod.bankName || '' : '',
      accountNumber: methodType === 'bank' ? paymentMethod.accountNumber || '' : '',
      ifscCode: methodType === 'bank' ? paymentMethod.ifscCode || '' : '',
      upiId: methodType === 'upi' ? paymentMethod.upiId || '' : '',
      status: 'Pending',
      utrReference: '',
      adminNote: '',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    batch.set(doc(db, 'wallet_transactions', txnId), {
      txnCode: generateShortCode('TXN-'),
      userId: user.uid,
      type: 'Withdrawal',
      direction: 'debit',
      amount: cleanAmount,
      description: `Withdrawal request ${requestCode} via ${methodSummary}`,
      referenceId: withdrawalId,
      status: 'Pending',
      createdAt: serverTimestamp(),
    });

    batch.set(doc(db, 'notifications', generateDocId('ntf')), {
      userId: user.uid,
      eventType: 'withdrawal_submitted',
      title: 'Withdrawal Request Submitted',
      message: `Withdrawal ${requestCode} for ₹${cleanAmount.toFixed(2)} has been submitted and reserved.`,
      read: false,
      createdAt: serverTimestamp(),
    });

    await batch.commit();
    return requestCode;
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `withdrawal_requests/${withdrawalId}`);
  }
}

export async function adminProcessWithdrawal(
  admin: UserProfile,
  req: WithdrawalRequest,
  newStatus: WithdrawalStatus,
  utrReference: string,
  adminNote: string,
) {
  const wasFinalized = req.status === 'Paid' || req.status === 'Rejected';
  if (wasFinalized) {
    throw new Error('This withdrawal request is already finalized.');
  }

  try {
    const walletRef = doc(db, 'wallets', req.userId);
    const walletSnap = await getDoc(walletRef);
    const wallet = walletSnap.data() as UserWallet;

    const batch = writeBatch(db);
    batch.update(doc(db, 'withdrawal_requests', req.id), {
      status: newStatus,
      utrReference: utrReference.trim().slice(0, 100),
      adminNote: adminNote.trim().slice(0, 500),
      updatedAt: serverTimestamp(),
    });

    if (newStatus === 'Paid') {
      batch.update(walletRef, {
        reservedBalance: round2(Math.max(0, wallet.reservedBalance - req.amount)),
        totalWithdrawn: round2(wallet.totalWithdrawn + req.amount),
        updatedAt: serverTimestamp(),
      });
      batch.set(doc(db, 'wallet_transactions', generateDocId('txn')), {
        txnCode: generateShortCode('TXN-'),
        userId: req.userId,
        type: 'Withdrawal',
        direction: 'debit',
        amount: req.amount,
        description: `Payout completed for ${req.requestCode} (UTR: ${utrReference.trim() || 'N/A'})`,
        referenceId: req.id,
        status: 'Completed',
        createdAt: serverTimestamp(),
      });
      batch.set(doc(db, 'notifications', generateDocId('ntf')), {
        userId: req.userId,
        eventType: 'withdrawal_successful',
        title: 'Withdrawal Successful',
        message: `₹${req.amount.toFixed(2)} paid for ${req.requestCode}. Reference UTR: ${utrReference.trim() || 'Processed'}.`,
        read: false,
        createdAt: serverTimestamp(),
      });
    } else if (newStatus === 'Rejected') {
      batch.update(walletRef, {
        availableBalance: round2(wallet.availableBalance + req.amount),
        reservedBalance: round2(Math.max(0, wallet.reservedBalance - req.amount)),
        updatedAt: serverTimestamp(),
      });
      batch.set(doc(db, 'wallet_transactions', generateDocId('txn')), {
        txnCode: generateShortCode('TXN-'),
        userId: req.userId,
        type: 'Refund',
        direction: 'credit',
        amount: req.amount,
        description: `Refunded rejected withdrawal ${req.requestCode}: ${adminNote || 'Returned to available wallet'}`,
        referenceId: req.id,
        status: 'Completed',
        createdAt: serverTimestamp(),
      });
      batch.set(doc(db, 'notifications', generateDocId('ntf')), {
        userId: req.userId,
        eventType: 'withdrawal_rejected',
        title: 'Withdrawal Rejected',
        message: `Withdrawal ${req.requestCode} (₹${req.amount.toFixed(2)}) was rejected and refunded to your Available Balance. ${adminNote}`,
        read: false,
        createdAt: serverTimestamp(),
      });
    } else if (newStatus === 'Approved' || newStatus === 'Payment Processing') {
      batch.set(doc(db, 'notifications', generateDocId('ntf')), {
        userId: req.userId,
        eventType: newStatus === 'Approved' ? 'withdrawal_approved' : 'withdrawal_processing',
        title: newStatus === 'Approved' ? 'Withdrawal Approved' : 'Withdrawal Payment Processing',
        message: `Withdrawal ${req.requestCode} (₹${req.amount.toFixed(2)}) status is now ${newStatus}. ${adminNote}`.trim(),
        read: false,
        createdAt: serverTimestamp(),
      });
    }

    batch.set(doc(db, 'admin_activity_logs', generateDocId('log')), {
      adminUid: admin.uid,
      adminEmail: admin.email,
      action: `Withdrawal ${newStatus}`,
      targetType: 'withdrawal_request',
      targetId: req.id,
      details: `${req.requestCode} (${req.userCode}) ₹${req.amount} UTR: ${utrReference || '-'} ${adminNote}`,
      createdAt: serverTimestamp(),
    });

    await batch.commit();
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `withdrawal_requests/${req.id}`);
  }
}

export async function adminAdjustUserWallet(
  admin: UserProfile,
  targetUser: UserProfile,
  direction: 'credit' | 'debit',
  amount: number,
  description: string,
) {
  const cleanAmount = round2(amount);
  if (cleanAmount <= 0) throw new Error('Adjustment amount must be greater than 0.');
  try {
    const walletRef = doc(db, 'wallets', targetUser.uid);
    const snap = await getDoc(walletRef);
    const wallet = snap.data() as UserWallet;
    const nextAvailable =
      direction === 'credit'
        ? round2(wallet.availableBalance + cleanAmount)
        : round2(Math.max(0, wallet.availableBalance - cleanAmount));

    const batch = writeBatch(db);
    batch.update(walletRef, {
      availableBalance: nextAvailable,
      lifetimeEarnings:
        direction === 'credit'
          ? round2(wallet.lifetimeEarnings + cleanAmount)
          : wallet.lifetimeEarnings,
      updatedAt: serverTimestamp(),
    });
    batch.set(doc(db, 'wallet_transactions', generateDocId('txn')), {
      txnCode: generateShortCode('TXN-'),
      userId: targetUser.uid,
      type: 'Admin Adjustment',
      direction,
      amount: cleanAmount,
      description: description.trim().slice(0, 400),
      referenceId: admin.uid,
      status: 'Completed',
      createdAt: serverTimestamp(),
    });
    batch.set(doc(db, 'admin_activity_logs', generateDocId('log')), {
      adminUid: admin.uid,
      adminEmail: admin.email,
      action: `Admin Wallet ${direction === 'credit' ? 'Credit' : 'Debit'}`,
      targetType: 'wallet',
      targetId: targetUser.uid,
      details: `${targetUser.userCode} ${direction} ₹${cleanAmount}: ${description}`,
      createdAt: serverTimestamp(),
    });
    await batch.commit();
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `wallets/${targetUser.uid}`);
  }
}

// ==================== SETTINGS, SUPPORT & NOTIFICATIONS ====================

export async function adminSaveSettings(admin: UserProfile, nextSettings: AdminSettings) {
  try {
    const payload = {
      ...nextSettings,
      updatedAt: serverTimestamp(),
    };
    await setDoc(doc(db, 'admin_settings', 'global'), payload);
    await logAdminAction(
      admin.uid,
      admin.email,
      'Updated Platform Settings',
      'admin_settings',
      'global',
      `Training ₹${nextSettings.trainingPrice} | Salaries ₹${nextSettings.plan50MonthlySalary}/₹${nextSettings.plan100MonthlySalary}/₹${nextSettings.plan150MonthlySalary} | Commissions ₹${nextSettings.plan50WeeklyCommission}/₹${nextSettings.plan100WeeklyCommission}/₹${nextSettings.plan150WeeklyCommission}`,
    );
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, 'admin_settings/global');
  }
}

export async function adminUpdateReferralStatus(
  admin: UserProfile,
  referralId: string,
  status: 'pending' | 'active' | 'inactive' | 'flagged',
) {
  try {
    await updateDoc(doc(db, 'affiliate_referrals', referralId), {
      status,
      updatedAt: serverTimestamp(),
    });
    await logAdminAction(
      admin.uid,
      admin.email,
      `Referral Status -> ${status}`,
      'affiliate_referral',
      referralId,
      `Updated status to ${status}`,
    );
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `affiliate_referrals/${referralId}`);
  }
}

export async function submitSupportTicket(
  user: UserProfile,
  subject: string,
  category: string,
  message: string,
) {
  const id = generateDocId('sup');
  try {
    await setDoc(doc(db, 'support_tickets', id), {
      userId: user.uid,
      userCode: user.userCode,
      userName: user.fullName,
      subject: subject.trim().slice(0, 200),
      category: category.trim().slice(0, 60),
      message: message.trim().slice(0, 2000),
      status: 'Open',
      adminReply: '',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, `support_tickets/${id}`);
  }
}

export async function adminReplySupportTicket(
  admin: UserProfile,
  ticketId: string,
  reply: string,
  status: 'Replied' | 'Closed',
) {
  try {
    await updateDoc(doc(db, 'support_tickets', ticketId), {
      adminReply: reply.trim().slice(0, 2000),
      status,
      updatedAt: serverTimestamp(),
    });
    await logAdminAction(
      admin.uid,
      admin.email,
      `Support Ticket ${status}`,
      'support_ticket',
      ticketId,
      reply.slice(0, 200),
    );
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `support_tickets/${ticketId}`);
  }
}

export async function markNotificationRead(notifId: string) {
  try {
    await updateDoc(doc(db, 'notifications', notifId), { read: true });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `notifications/${notifId}`);
  }
}

export type { WeeklyVerification };

import { User } from 'firebase/auth';
import { getUserProfile, syncUserProfile, UserProfileData } from './firebase';

export const GUEST_STORAGE_KEY = 'pixdoc_guest_usage';
export const GUEST_LIMIT = 1;
export const TRIAL_DAYS = 7;

let inMemoryGuestUsage = 0;

function safeGetStorage(key: string): string | null {
  try {
    if (typeof localStorage !== 'undefined') {
      const v = localStorage.getItem(key);
      if (v !== null && v !== undefined && v !== '') return v;
    }
  } catch {
    // LocalStorage restricted or unavailable
  }
  try {
    if (typeof sessionStorage !== 'undefined') {
      const v = sessionStorage.getItem(key);
      if (v !== null && v !== undefined && v !== '') return v;
    }
  } catch {
    // SessionStorage restricted
  }
  try {
    if (typeof document !== 'undefined' && document.cookie) {
      const match = document.cookie.match(new RegExp('(^|;\\s*)' + key + '=([^;]*)'));
      if (match && match[2]) return decodeURIComponent(match[2]);
    }
  } catch {
    // Cookie access restricted
  }
  return null;
}

function safeSetStorage(key: string, val: string): void {
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(key, val);
    }
  } catch {
    // LocalStorage restricted
  }
  try {
    if (typeof sessionStorage !== 'undefined') {
      sessionStorage.setItem(key, val);
    }
  } catch {
    // SessionStorage restricted
  }
  try {
    if (typeof document !== 'undefined') {
      document.cookie = `${key}=${encodeURIComponent(val)}; path=/; max-age=31536000; SameSite=Lax`;
    }
  } catch {
    // Cookie access restricted
  }
}

/**
 * Returns current guest conversions count from storage or memory.
 */
export function getGuestUsage(): number {
  const stored = safeGetStorage(GUEST_STORAGE_KEY);
  if (stored !== null) {
    const count = parseInt(stored, 10);
    if (!isNaN(count)) {
      inMemoryGuestUsage = Math.max(count, inMemoryGuestUsage);
      return inMemoryGuestUsage;
    }
  }
  return inMemoryGuestUsage;
}

/**
 * Increments guest conversion count across localStorage, sessionStorage, cookies and memory.
 */
export function incrementGuestUsage(): number {
  const current = getGuestUsage();
  const updated = current + 1;
  inMemoryGuestUsage = updated;
  safeSetStorage(GUEST_STORAGE_KEY, updated.toString());
  if (typeof window !== 'undefined') {
    window.dispatchEvent(
      new CustomEvent('pixdoc-guest-usage-updated', { detail: { usage: updated } })
    );
  }
  return updated;
}

/**
 * Resets guest usage count.
 */
export function resetGuestUsage(): void {
  inMemoryGuestUsage = 0;
  try {
    if (typeof localStorage !== 'undefined') localStorage.removeItem(GUEST_STORAGE_KEY);
  } catch {}
  try {
    if (typeof sessionStorage !== 'undefined') sessionStorage.removeItem(GUEST_STORAGE_KEY);
  } catch {}
  try {
    if (typeof document !== 'undefined') {
      document.cookie = `${GUEST_STORAGE_KEY}=; path=/; max-age=0`;
    }
  } catch {}
  if (typeof window !== 'undefined') {
    window.dispatchEvent(
      new CustomEvent('pixdoc-guest-usage-updated', { detail: { usage: 0 } })
    );
  }
}

/**
 * Checks if a guest is still within the free limit (less than GUEST_LIMIT).
 */
export function canGuestUse(): boolean {
  return getGuestUsage() < GUEST_LIMIT;
}

/**
 * Parses trialStart from Firestore Timestamp, Date, string, or number to timestamp ms.
 */
function parseTrialStartTime(trialStart: unknown): number | null {
  if (!trialStart) return null;
  // Firestore Timestamp with toMillis() or toDate()
  if (typeof (trialStart as { toMillis?: () => number }).toMillis === 'function') {
    return (trialStart as { toMillis: () => number }).toMillis();
  }
  if (typeof (trialStart as { toDate?: () => Date }).toDate === 'function') {
    return (trialStart as { toDate: () => Date }).toDate().getTime();
  }
  // Firestore object with seconds
  if (typeof (trialStart as { seconds?: number }).seconds === 'number') {
    return (trialStart as { seconds: number }).seconds * 1000;
  }
  if (trialStart instanceof Date) {
    return trialStart.getTime();
  }
  if (typeof trialStart === 'number') {
    return trialStart;
  }
  if (typeof trialStart === 'string') {
    const parsed = new Date(trialStart).getTime();
    return isNaN(parsed) ? null : parsed;
  }
  return null;
}

/**
 * Determines whether a 7-day free trial is currently active.
 */
export function isTrialActive(trialStart: unknown): boolean {
  const startMs = parseTrialStartTime(trialStart);
  if (!startMs) return true; // If just created or pending serverTimestamp, treat as active
  const elapsedMs = Date.now() - startMs;
  const trialDurationMs = TRIAL_DAYS * 24 * 60 * 60 * 1000;
  return elapsedMs < trialDurationMs;
}

/**
 * Returns number of days left in 7-day trial (rounded up, min 0).
 */
export function getTrialDaysLeft(trialStart: unknown): number {
  const startMs = parseTrialStartTime(trialStart);
  if (!startMs) return TRIAL_DAYS;
  const elapsedMs = Date.now() - startMs;
  const trialDurationMs = TRIAL_DAYS * 24 * 60 * 60 * 1000;
  const remainingMs = trialDurationMs - elapsedMs;
  if (remainingMs <= 0) return 0;
  return Math.ceil(remainingMs / (24 * 60 * 60 * 1000));
}

export interface AccessCheckResult {
  allowed: boolean;
  reason?: 'guest_limit' | 'trial_ended';
  isGuest?: boolean;
  isPro?: boolean;
  isTrial?: boolean;
  daysLeft?: number;
  profile?: UserProfileData | null;
}

/**
 * Validates whether the current action can proceed:
 * - If not logged in: checks guest limit (1 free conversion).
 * - If logged in: fetches fresh Firestore doc. Allows if 'pro' or trial is within 7 days.
 */
export async function checkConversionAccess(user: User | null): Promise<AccessCheckResult> {
  // 1. Guest user check
  if (!user) {
    if (canGuestUse()) {
      return { allowed: true, isGuest: true };
    }
    return { allowed: false, reason: 'guest_limit', isGuest: true };
  }

  // 2. Logged-in user check
  let profile = await getUserProfile(user.uid);
  if (!profile || !profile.trialStart) {
    // If user doc has no trialStart yet, initialize it
    profile = await syncUserProfile(user);
  }

  // Pro tier has unlimited access
  if (profile?.subscription === 'pro') {
    return { allowed: true, isPro: true, profile };
  }

  // Check 7-day free trial status
  const trialValid = isTrialActive(profile?.trialStart);
  const daysLeft = getTrialDaysLeft(profile?.trialStart);

  if (trialValid) {
    return {
      allowed: true,
      isTrial: true,
      daysLeft,
      profile,
    };
  }

  return {
    allowed: false,
    reason: 'trial_ended',
    daysLeft: 0,
    profile,
  };
}

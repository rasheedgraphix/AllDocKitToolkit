export interface License {
  isPro: boolean;
  plan: 'monthly' | 'annual' | 'free' | 'trial';
  expiryDate: string | null;
  isTrial?: boolean;
}

const memoryStore: Record<string, string> = {};

function safeGetItem(key: string): string | null {
  try {
    if (typeof localStorage !== 'undefined') {
      return localStorage.getItem(key);
    }
  } catch {
    // Local storage access restricted or unavailable
  }
  return memoryStore[key] || null;
}

function safeSetItem(key: string, value: string): void {
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(key, value);
      return;
    }
  } catch {
    // Local storage access restricted or unavailable
  }
  memoryStore[key] = value;
}

function safeRemoveItem(key: string): void {
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.removeItem(key);
      return;
    }
  } catch {
    // Local storage access restricted or unavailable
  }
  delete memoryStore[key];
}

export function checkLicense(): License {
  const saved = safeGetItem('pixdoc_license');
  if (saved) {
    try {
      const parsed: License = JSON.parse(saved);
      if (parsed.expiryDate) {
        const isExpired = new Date(parsed.expiryDate).getTime() < Date.now();
        if (isExpired) {
          // If expired, revert to free tier
          const freeLicense: License = { isPro: false, plan: 'free', expiryDate: null };
          safeSetItem('pixdoc_license', JSON.stringify(freeLicense));
          return freeLicense;
        }
      }
      if (parsed.plan === 'trial') {
        return {
          isPro: true,
          plan: 'trial',
          expiryDate: parsed.expiryDate,
          isTrial: true,
        };
      }
      return parsed;
    } catch {
      return { isPro: false, plan: 'free', expiryDate: null };
    }
  }
  return { isPro: false, plan: 'free', expiryDate: null };
}

export function isTrialUsed(): boolean {
  return safeGetItem('pixdoc_trial_used') === 'true';
}

export function startFreeTrial(): boolean {
  // Check if trial already used
  if (safeGetItem('pixdoc_trial_used') === 'true') {
    return false;
  }
  const expiry = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days
  const license: License = {
    isPro: true,
    plan: 'trial',
    expiryDate: expiry.toISOString(),
    isTrial: true,
  };
  safeSetItem('pixdoc_license', JSON.stringify(license));
  safeSetItem('pixdoc_trial_used', 'true');
  return true;
}

export function setTestLicense(plan: 'monthly' | 'annual') {
  const expiry =
    plan === 'monthly'
      ? new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
      : new Date(Date.now() + 365 * 24 * 60 * 60 * 1000);
  const license: License = { isPro: true, plan, expiryDate: expiry.toISOString(), isTrial: false };
  safeSetItem('pixdoc_license', JSON.stringify(license));
}

export function clearLicense() {
  safeRemoveItem('pixdoc_license');
}


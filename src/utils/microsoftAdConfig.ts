/**
 * Microsoft Advertising Configuration for AllDocKit Toolkit
 *
 * Official Microsoft Advertising values for testing:
 * ApplicationId = '3f83fe91-d6be-434d-a0ae-7351c5a997f1'
 * AdUnitId = 'test' (or '10865270' test banner)
 *
 * When you receive your Live Production Ad Unit from Microsoft Partner Center:
 * Replace 'test' and the Application ID below, or pass them dynamically.
 */

export interface MicrosoftAdConfig {
  applicationId: string;
  adUnitId: string;
  isTestMode: boolean;
  enabled: boolean;
}

const MS_AD_STORAGE_KEY = 'alldockit_ms_ad_config_v1';

export const DEFAULT_MS_AD_CONFIG: MicrosoftAdConfig = {
  // Official Microsoft Test Credentials
  applicationId: '3f83fe91-d6be-434d-a0ae-7351c5a997f1',
  adUnitId: 'test',
  isTestMode: true,
  enabled: true,
};

export function getMicrosoftAdConfig(): MicrosoftAdConfig {
  try {
    const saved = localStorage.getItem(MS_AD_STORAGE_KEY);
    if (saved) {
      return { ...DEFAULT_MS_AD_CONFIG, ...JSON.parse(saved) };
    }
  } catch (e) {
    console.warn('Unable to read Microsoft Ad config:', e);
  }
  return DEFAULT_MS_AD_CONFIG;
}

export function saveMicrosoftAdConfig(config: Partial<MicrosoftAdConfig>): MicrosoftAdConfig {
  const current = getMicrosoftAdConfig();
  const updated = { ...current, ...config };
  localStorage.setItem(MS_AD_STORAGE_KEY, JSON.stringify(updated));
  window.dispatchEvent(new CustomEvent('ms-ad-config-updated', { detail: updated }));
  return updated;
}

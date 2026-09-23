export interface AdConfiguration {
  // Adsterra Exact Codes
  adsterraBanner728x90Key: string;
  adsterraBanner300x250Key: string;
  adsterraNativeBannerContainerId: string;
  adsterraNativeBannerScriptUrl: string;
  adsterraSocialBarScriptUrl: string;
  adsterraPopunderScriptUrl: string; // Disabled
  adsterraDirectLinkUrl: string;

  // Custom Promotion fallback
  customPromoTitle: string;
  customPromoSubtitle: string;
  customPromoButtonText: string;
  customPromoUrl: string;
}

const AD_CONFIG_KEY = 'pixdoc_adsterra_config_v3';

export const DEFAULT_AD_CONFIG: AdConfiguration = {
  // Exact Adsterra Codes from Nouman's Account (pixdoc-pdf.blogspot.com)
  adsterraBanner728x90Key: 'da3dca1a6d988329fba08dbc5d9d6326',
  adsterraBanner300x250Key: 'da3dca1a6d988329fba08dbc5d9d6326',
  adsterraNativeBannerContainerId: 'container-334df57deaa678914b68f34c371139e5',
  adsterraNativeBannerScriptUrl: 'https://pl31470377.profitableratecpmnetwork.com/334df57deaa678914b68f34c371139e5/invoke.js',
  adsterraSocialBarScriptUrl: 'https://pl31470378.profitableratecpmnetwork.com/62/54/a6/6254a6d819901f84761c6589e0dcd4ad.js',
  adsterraPopunderScriptUrl: '', // POPUNDER PERMANENTLY DISABLED
  adsterraDirectLinkUrl: 'https://rasheedgraphix.github.io/PixDoc/',

  customPromoTitle: 'PixDoc Pro — Zero Ads & Unlimited Batch Speed',
  customPromoSubtitle: 'Upgrade to PixDoc Pro for lifetime ad-free processing.',
  customPromoButtonText: 'Upgrade to Pro',
  customPromoUrl: 'https://rasheedgraphix.github.io/PixDoc/',
};

export function getAdConfig(): AdConfiguration {
  try {
    const saved = localStorage.getItem(AD_CONFIG_KEY);
    if (saved) {
      return { ...DEFAULT_AD_CONFIG, ...JSON.parse(saved) };
    }
  } catch (err) {
    console.warn('Could not read ad config:', err);
  }
  return DEFAULT_AD_CONFIG;
}

export function saveAdConfig(config: Partial<AdConfiguration>): AdConfiguration {
  const current = getAdConfig();
  const updated = { ...current, ...config };
  localStorage.setItem(AD_CONFIG_KEY, JSON.stringify(updated));
  window.dispatchEvent(new Event('adsterra-config-updated'));
  return updated;
}

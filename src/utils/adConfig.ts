export interface AdConfiguration {
  adsterraBanner728x90Key: string;
  adsterraBanner300x250Key: string;
  adsterraNativeBannerContainerId: string;
  adsterraNativeBannerScriptUrl: string;
  adsterraSocialBarScriptUrl: string;
  adsterraPopunderScriptUrl: string;
  adsterraDirectLinkUrl: string;
  customPromoTitle: string;
  customPromoSubtitle: string;
  customPromoButtonText: string;
  customPromoUrl: string;
}

export const DEFAULT_AD_CONFIG: AdConfiguration = {
  adsterraBanner728x90Key: '',
  adsterraBanner300x250Key: '',
  adsterraNativeBannerContainerId: '',
  adsterraNativeBannerScriptUrl: '',
  adsterraSocialBarScriptUrl: '',
  adsterraPopunderScriptUrl: '',
  adsterraDirectLinkUrl: '',
  customPromoTitle: '',
  customPromoSubtitle: '',
  customPromoButtonText: '',
  customPromoUrl: '',
};

export function getAdConfig(): AdConfiguration {
  return DEFAULT_AD_CONFIG;
}

export function saveAdConfig(config: Partial<AdConfiguration>): AdConfiguration {
  return DEFAULT_AD_CONFIG;
}

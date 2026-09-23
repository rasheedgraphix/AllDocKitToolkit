import React, { useEffect, useState } from 'react';
import { ExternalLink, Sparkles, X, ShieldAlert } from 'lucide-react';
import { useOnlineStatus } from '../../hooks/useOnlineStatus';
import { getAdConfig, AdConfiguration } from '../../utils/adConfig';
import { checkLicense, License } from '../../utils/license';
import { AdsterraFrame } from './AdsterraFrame';

interface AdBannerProps {
  slotType: 'bottom' | 'sidebar' | 'post-action';
  className?: string;
}

export const AdBanner: React.FC<AdBannerProps> = ({ slotType, className = '' }) => {
  const isOnline = useOnlineStatus();
  const [adConfig, setAdConfig] = useState<AdConfiguration>(getAdConfig());
  const [license, setLicense] = useState<License>(checkLicense());
  const [isDismissed, setIsDismissed] = useState(false);

  useEffect(() => {
    const handleConfigUpdate = () => setAdConfig(getAdConfig());
    const handleLicenseUpdate = () => setLicense(checkLicense());

    window.addEventListener('adsterra-config-updated', handleConfigUpdate);
    window.addEventListener('license-updated', handleLicenseUpdate);
    return () => {
      window.removeEventListener('adsterra-config-updated', handleConfigUpdate);
      window.removeEventListener('license-updated', handleLicenseUpdate);
    };
  }, []);

  // 1. STRICT BUSINESS RULE:
  // Paid Subscribers (isPro && !isTrial) NEVER see ads.
  // Free users AND Free Trial users MUST see ads!
  const isPaidSubscriber = license.isPro && !license.isTrial;
  if (isPaidSubscriber) {
    return null;
  }

  // 2. OFFLINE RULE:
  // If user is offline, do NOT load anything (0% network requests, zero broken frames)
  if (!isOnline || isDismissed) {
    return null;
  }

  // Choose appropriate Adsterra Key based on slot
  let adKey = '';
  let width = 728;
  let height = 90;

  if (slotType === 'sidebar') {
    adKey = adConfig.adsterraBanner300x250Key;
    width = 300;
    height = 250;
  } else if (slotType === 'post-action') {
    adKey = adConfig.adsterraBanner300x250Key || adConfig.adsterraBanner728x90Key;
    width = 300;
    height = 250;
  } else {
    // Bottom leaderboard banner
    adKey = adConfig.adsterraBanner728x90Key;
    width = 728;
    height = 90;
  }

  return (
    <div
      className={`relative overflow-hidden rounded-2xl border border-stone-200 dark:border-stone-800 bg-stone-50/80 dark:bg-stone-900/80 p-3 text-center transition-all ${className}`}
    >
      {/* Adsterra Header Label & Upgrade Link */}
      <div className="flex items-center justify-between px-1 pb-2 text-[10px] text-stone-400 dark:text-stone-500 border-b border-stone-200/50 dark:border-stone-800/50 mb-2">
        <span className="flex items-center gap-1 font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400">
          <Sparkles className="w-3 h-3" />
          Adsterra Sponsor Ad
        </span>
        <div className="flex items-center gap-2">
          <button
            onClick={() => window.dispatchEvent(new CustomEvent('open-upgrade-modal', { detail: { plan: 'annual' } }))}
            className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 hover:underline flex items-center gap-1"
          >
            <span>👑 Remove Ads</span>
          </button>
          <span className="text-[10px] text-stone-400">|</span>
          <button
            onClick={() => setIsDismissed(true)}
            className="hover:text-stone-700 dark:hover:text-stone-300 p-0.5"
            title="Dismiss temporarily"
          >
            <X className="w-3 h-3" />
          </button>
        </div>
      </div>

      {/* Adsterra Ad Unit */}
      {adKey ? (
        <AdsterraFrame adKey={adKey} width={width} height={height} />
      ) : (
        /* Fallback Promo Card if user has not entered an Adsterra key yet */
        <div className="p-4 rounded-xl bg-linear-to-r from-stone-900 to-indigo-950 text-white flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="text-left">
            <h4 className="text-xs font-bold text-white flex items-center gap-1.5">
              <span>{adConfig.customPromoTitle}</span>
            </h4>
            <p className="text-[11px] text-stone-300 mt-0.5">
              {adConfig.customPromoSubtitle}
            </p>
          </div>
          <a
            href={adConfig.customPromoUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="py-1.5 px-3.5 rounded-lg text-xs font-bold bg-amber-500 hover:bg-amber-600 text-stone-950 transition-colors shrink-0 flex items-center gap-1"
          >
            <span>{adConfig.customPromoButtonText}</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        </div>
      )}
    </div>
  );
};

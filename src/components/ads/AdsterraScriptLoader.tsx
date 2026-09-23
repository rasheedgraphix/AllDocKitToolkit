import React, { useEffect } from 'react';
import { useOnlineStatus } from '../../hooks/useOnlineStatus';
import { getAdConfig } from '../../utils/adConfig';
import { checkLicense } from '../../utils/license';

/**
 * Adsterra Script Loader for SocialBar & Popunder
 * - Automatically active ONLY when user is ONLINE and on FREE/TRIAL tier.
 * - Automatically inactive/removed if OFFLINE or PAID PRO.
 */
export const AdsterraScriptLoader: React.FC = () => {
  const isOnline = useOnlineStatus();

  useEffect(() => {
    const license = checkLicense();
    const isPaidSubscriber = license.isPro && !license.isTrial;

    // Strict Rule: No ads for Paid Pro users or when Offline
    if (!isOnline || isPaidSubscriber) {
      // Remove any injected scripts if they exist
      const existingSocial = document.getElementById('adsterra-socialbar-script');
      if (existingSocial) existingSocial.remove();

      const existingPopunder = document.getElementById('adsterra-popunder-script');
      if (existingPopunder) existingPopunder.remove();
      return;
    }

    const adConfig = getAdConfig();

    // Clean up popunder if already present
    const existingPopunder = document.getElementById('adsterra-popunder-script');
    if (existingPopunder) existingPopunder.remove();

    // 1. Inject Adsterra SocialBar (Subtle Push/Social Bar only)
    if (adConfig.adsterraSocialBarScriptUrl && !document.getElementById('adsterra-socialbar-script')) {
      const socialScript = document.createElement('script');
      socialScript.id = 'adsterra-socialbar-script';
      socialScript.type = 'text/javascript';
      socialScript.src = adConfig.adsterraSocialBarScriptUrl;
      socialScript.async = true;
      document.body.appendChild(socialScript);
    }
  }, [isOnline]);

  return null;
};

import React, { useEffect, useRef } from 'react';
import { useOnlineStatus } from '../../hooks/useOnlineStatus';
import { getAdConfig } from '../../utils/adConfig';
import { checkLicense } from '../../utils/license';

interface AdsterraNativeBannerProps {
  className?: string;
}

export const AdsterraNativeBanner: React.FC<AdsterraNativeBannerProps> = ({ className = '' }) => {
  const isOnline = useOnlineStatus();
  const containerRef = useRef<HTMLDivElement>(null);

  const license = checkLicense();
  const isPaidSubscriber = license.isPro && !license.isTrial;

  useEffect(() => {
    if (!isOnline || isPaidSubscriber) return;

    const config = getAdConfig();
    const containerId = config.adsterraNativeBannerContainerId;
    const scriptUrl = config.adsterraNativeBannerScriptUrl;

    if (!containerId || !scriptUrl) return;

    // Load native banner script
    const script = document.createElement('script');
    script.type = 'text/javascript';
    script.src = scriptUrl;
    script.async = true;
    script.setAttribute('data-cfasync', 'false');

    if (containerRef.current) {
      containerRef.current.innerHTML = '';
      const adDiv = document.createElement('div');
      adDiv.id = containerId;
      containerRef.current.appendChild(adDiv);
      containerRef.current.appendChild(script);
    }

    return () => {
      if (containerRef.current) {
        containerRef.current.innerHTML = '';
      }
    };
  }, [isOnline, isPaidSubscriber]);

  if (!isOnline || isPaidSubscriber) {
    return null;
  }

  const config = getAdConfig();

  return (
    <div
      className={`rounded-2xl border border-stone-200 dark:border-stone-800 bg-stone-50/50 dark:bg-stone-900/50 p-3 overflow-hidden ${className}`}
    >
      <div className="text-[10px] uppercase font-bold text-stone-400 tracking-wider mb-2 flex items-center justify-between">
        <span>Sponsored Recommendations</span>
        <span className="text-[9px] px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-600 dark:text-amber-400">
          Adsterra Native
        </span>
      </div>
      <div ref={containerRef} className="min-h-[90px] flex items-center justify-center" />
    </div>
  );
};

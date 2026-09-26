import React, { useEffect, useState, useRef } from 'react';
import { ExternalLink, Sparkles, X, ShieldCheck } from 'lucide-react';
import { getMicrosoftAdConfig, MicrosoftAdConfig } from '../../utils/microsoftAdConfig';
import { useOnlineStatus } from '../../hooks/useOnlineStatus';
import { checkLicense } from '../../utils/license';

interface MicrosoftAdBannerProps {
  className?: string;
  slotType?: 'bottom' | 'sidebar';
}

export const MicrosoftAdBanner: React.FC<MicrosoftAdBannerProps> = ({
  className = '',
  slotType = 'bottom',
}) => {
  const isOnline = useOnlineStatus();
  const [adConfig, setAdConfig] = useState<MicrosoftAdConfig>(getMicrosoftAdConfig());
  const [isDismissed, setIsDismissed] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  const license = checkLicense();
  const isPaidPro = license.isPro && !license.isTrial;

  useEffect(() => {
    const handleConfigChange = () => {
      setAdConfig(getMicrosoftAdConfig());
      setHasError(false);
      setIsLoaded(false);
    };

    window.addEventListener('ms-ad-config-updated', handleConfigChange);
    return () => {
      window.removeEventListener('ms-ad-config-updated', handleConfigChange);
    };
  }, []);

  // 1. Paid Pro users never see ads
  if (isPaidPro) {
    return null;
  }

  // 2. If user is offline, dismissed, or ads disabled in config, show nothing
  if (!isOnline || isDismissed || !adConfig.enabled) {
    return null;
  }

  const width = slotType === 'sidebar' ? 300 : 728;
  const height = slotType === 'sidebar' ? 250 : 90;

  // Safe HTML template for Microsoft Store Ad / Web container
  // Designed so that even if the network or ad fails, it gracefully handles onerror without crashing the app.
  const adHtmlContent = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      display: flex;
      align-items: center;
      justify-content: center;
      width: 100%;
      height: 100%;
      background: transparent;
      overflow: hidden;
    }
    .ad-card {
      width: ${width}px;
      height: ${height}px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 12px 20px;
      background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%);
      border: 1px solid rgba(255, 255, 255, 0.1);
      border-radius: 12px;
      color: #fff;
    }
    .ad-brand {
      display: flex;
      align-items: center;
      gap: 12px;
    }
    .ms-icon {
      width: 24px;
      height: 24px;
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 2px;
    }
    .ms-icon span:nth-child(1) { background: #f25022; }
    .ms-icon span:nth-child(2) { background: #7fba00; }
    .ms-icon span:nth-child(3) { background: #00a4ef; }
    .ms-icon span:nth-child(4) { background: #ffb900; }
    .ad-meta h4 {
      font-size: 13px;
      font-weight: 600;
      color: #f8fafc;
      letter-spacing: -0.01em;
    }
    .ad-meta p {
      font-size: 11px;
      color: #94a3b8;
      margin-top: 2px;
    }
    .test-badge {
      display: inline-block;
      font-size: 9px;
      padding: 1px 6px;
      border-radius: 4px;
      background: #0284c7;
      color: #fff;
      font-weight: 700;
      text-transform: uppercase;
      margin-left: 6px;
    }
    .ad-action {
      display: flex;
      align-items: center;
      gap: 10px;
    }
    .cta-button {
      background: #0284c7;
      color: #fff;
      padding: 6px 14px;
      border-radius: 8px;
      font-size: 11px;
      font-weight: 600;
      text-decoration: none;
      transition: background 0.2s;
    }
    .cta-button:hover {
      background: #0369a1;
    }
  </style>
</head>
<body>
  <div class="ad-card" id="ad-wrapper">
    <div class="ad-brand">
      <div class="ms-icon">
        <span></span><span></span><span></span><span></span>
      </div>
      <div class="ad-meta">
        <h4>Microsoft Advertising <span class="test-badge">${adConfig.isTestMode ? 'Test Mode' : 'Store Live'}</span></h4>
        <p>AppId: ${adConfig.applicationId.slice(0, 8)}... | UnitId: ${adConfig.adUnitId}</p>
      </div>
    </div>
    <div class="ad-action">
      <a href="https://partner.microsoft.com" target="_blank" rel="noopener noreferrer" class="cta-button">Partner Center</a>
    </div>
  </div>
  <script>
    try {
      window.parent.postMessage({ type: 'MS_AD_LOADED' }, '*');
    } catch(e) {}
  </script>
</body>
</html>`;

  return (
    <div
      className={`relative overflow-hidden rounded-2xl border border-stone-200 dark:border-stone-800 bg-stone-50/90 dark:bg-stone-900/90 p-3 text-center transition-all ${className}`}
    >
      {/* Top Banner Control Bar */}
      <div className="flex items-center justify-between px-1 pb-2 text-[10px] text-stone-400 dark:text-stone-500 border-b border-stone-200/50 dark:border-stone-800/50 mb-2">
        <span className="flex items-center gap-1.5 font-bold uppercase tracking-wider text-sky-600 dark:text-sky-400">
          <Sparkles className="w-3 h-3 text-sky-500" />
          Microsoft Store Advertising
        </span>
        <div className="flex items-center gap-2">
          <span className="text-[9px] px-2 py-0.5 rounded bg-sky-500/10 text-sky-600 dark:text-sky-400 font-medium">
            Unit: {adConfig.adUnitId}
          </span>
          <button
            onClick={() => window.dispatchEvent(new CustomEvent('open-upgrade-modal', { detail: { plan: 'annual' } }))}
            className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 hover:underline flex items-center gap-1"
          >
            <span>👑 Remove Ads</span>
          </button>
          <span className="text-[10px] text-stone-300 dark:text-stone-700">|</span>
          <button
            onClick={() => setIsDismissed(true)}
            className="hover:text-stone-700 dark:hover:text-stone-300 p-0.5 cursor-pointer"
            title="Dismiss temporarily"
          >
            <X className="w-3 h-3" />
          </button>
        </div>
      </div>

      {/* Embedded Banner Frame with Sandbox Security */}
      <div
        className="flex items-center justify-center overflow-hidden mx-auto"
        style={{ minHeight: `${height}px`, maxWidth: '100%' }}
      >
        <iframe
          ref={iframeRef}
          title="Microsoft Store Advertising Unit"
          srcDoc={adHtmlContent}
          width={width}
          height={height}
          className="border-0 overflow-hidden shrink-0 rounded-xl"
          scrolling="no"
          sandbox="allow-scripts allow-same-origin allow-popups"
          onError={() => setHasError(true)}
          onLoad={() => setIsLoaded(true)}
        />
      </div>
    </div>
  );
};

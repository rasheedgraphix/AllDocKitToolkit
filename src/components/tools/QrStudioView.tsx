import React, { useState, useEffect, useRef } from 'react';
import { generateQrDataUrl } from '../../utils/qrGenerator';
import {
  QrCode,
  Download,
  Copy,
  Check,
  Sparkles,
  Link2,
  Mail,
  Phone,
  Wifi,
  FileText,
  Palette,
  Layers,
} from 'lucide-react';
import { HistoryItem } from '../../types';
import { useAuth } from '../../contexts/AuthContext';
import { downloadBlob } from '../../utils/fileHelpers';

interface QrStudioViewProps {
  onAddToHistory: (item: Omit<HistoryItem, 'id' | 'timestamp'>) => void;
}

type QrType = 'link' | 'text' | 'wifi' | 'email' | 'phone';

export const QrStudioView: React.FC<QrStudioViewProps> = ({ onAddToHistory }) => {
  const { verifyAccessBeforeAction } = useAuth();
  const [qrType, setQrType] = useState<QrType>('link');
  const [url, setUrl] = useState('https://rasheedgraphix.github.io/AllDocKitToolkit/');
  const [textContent, setTextContent] = useState('');
  const [wifiSsid, setWifiSsid] = useState('');
  const [wifiPassword, setWifiPassword] = useState('');
  const [wifiAuth, setWifiAuth] = useState<'WPA' | 'WEP' | 'nopass'>('WPA');
  const [emailAddress, setEmailAddress] = useState('');
  const [emailSubject, setEmailSubject] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');

  // Styling options
  const [fgColor, setFgColor] = useState('#0f172a');
  const [bgColor, setBgColor] = useState('#ffffff');
  const [errorCorrection, setErrorCorrection] = useState<'L' | 'M' | 'Q' | 'H'>('M');
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [copied, setCopied] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Compute payload string based on type
  const getPayload = (): string => {
    switch (qrType) {
      case 'link':
        return url.trim() || 'https://rasheedgraphix.github.io/AllDocKitToolkit/';
      case 'text':
        return textContent.trim() || 'Welcome to AllDocKit';
      case 'wifi':
        return `WIFI:T:${wifiAuth};S:${wifiSsid};P:${wifiPassword};;`;
      case 'email':
        return `mailto:${emailAddress}?subject=${encodeURIComponent(emailSubject)}`;
      case 'phone':
        return `tel:${phoneNumber}`;
      default:
        return url;
    }
  };

  // Generate QR code whenever payload or styling changes
  useEffect(() => {
    let isMounted = true;
    const payload = getPayload();
    generateQrDataUrl(payload, {
      errorCorrectionLevel: errorCorrection,
      margin: 2,
      width: 600,
      color: {
        dark: fgColor,
        light: bgColor,
      },
    })
      .then((url) => {
        if (isMounted) setQrDataUrl(url);
      })
      .catch((err) => console.error('QR Generation failed', err));

    return () => {
      isMounted = false;
    };
  }, [
    qrType,
    url,
    textContent,
    wifiSsid,
    wifiPassword,
    wifiAuth,
    emailAddress,
    emailSubject,
    phoneNumber,
    fgColor,
    bgColor,
    errorCorrection,
  ]);

  const handleDownloadPng = async () => {
    const canProceed = await verifyAccessBeforeAction();
    if (!canProceed) return;

    if (!qrDataUrl) return;
    const res = await fetch(qrDataUrl);
    const blob = await res.blob();
    downloadBlob(blob, `AllDocKit_QR_${qrType}.png`);

    onAddToHistory({
      toolId: 'qr-studio',
      toolName: 'QR Studio',
      originalName: `QR (${qrType})`,
      resultName: `AllDocKit_QR_${qrType}.png`,
      originalSize: blob.size,
      resultSize: blob.size,
      savedBytes: 0,
      resultBlob: blob,
    });
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(getPayload());
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Tool Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-stone-200 dark:border-stone-800 pb-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-stone-900 dark:text-stone-100 flex items-center gap-2">
            <QrCode className="w-5 h-5 text-emerald-600" />
            Smart QR Code Studio
          </h1>
          <p className="text-xs text-stone-500 dark:text-stone-400 mt-0.5">
            Generate custom colored QR codes for websites, WiFi networks, WhatsApp, and contacts.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
        {/* Left Side: Input & Settings */}
        <div className="md:col-span-7 space-y-5">
          {/* Type Selector Tabs */}
          <div className="flex items-center gap-1.5 p-1.5 rounded-xl bg-stone-100 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 overflow-x-auto">
            <button
              type="button"
              onClick={() => setQrType('link')}
              className={`flex items-center gap-1.5 py-1.5 px-3 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
                qrType === 'link'
                  ? 'bg-white dark:bg-stone-900 text-emerald-700 dark:text-emerald-400 shadow-xs'
                  : 'text-stone-600 dark:text-stone-400 hover:text-stone-900'
              }`}
            >
              <Link2 className="w-3.5 h-3.5" />
              Website URL
            </button>
            <button
              type="button"
              onClick={() => setQrType('wifi')}
              className={`flex items-center gap-1.5 py-1.5 px-3 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
                qrType === 'wifi'
                  ? 'bg-white dark:bg-stone-900 text-emerald-700 dark:text-emerald-400 shadow-xs'
                  : 'text-stone-600 dark:text-stone-400 hover:text-stone-900'
              }`}
            >
              <Wifi className="w-3.5 h-3.5" />
              WiFi Network
            </button>
            <button
              type="button"
              onClick={() => setQrType('text')}
              className={`flex items-center gap-1.5 py-1.5 px-3 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
                qrType === 'text'
                  ? 'bg-white dark:bg-stone-900 text-emerald-700 dark:text-emerald-400 shadow-xs'
                  : 'text-stone-600 dark:text-stone-400 hover:text-stone-900'
              }`}
            >
              <FileText className="w-3.5 h-3.5" />
              Plain Text
            </button>
            <button
              type="button"
              onClick={() => setQrType('email')}
              className={`flex items-center gap-1.5 py-1.5 px-3 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
                qrType === 'email'
                  ? 'bg-white dark:bg-stone-900 text-emerald-700 dark:text-emerald-400 shadow-xs'
                  : 'text-stone-600 dark:text-stone-400 hover:text-stone-900'
              }`}
            >
              <Mail className="w-3.5 h-3.5" />
              Email
            </button>
            <button
              type="button"
              onClick={() => setQrType('phone')}
              className={`flex items-center gap-1.5 py-1.5 px-3 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
                qrType === 'phone'
                  ? 'bg-white dark:bg-stone-900 text-emerald-700 dark:text-emerald-400 shadow-xs'
                  : 'text-stone-600 dark:text-stone-400 hover:text-stone-900'
              }`}
            >
              <Phone className="w-3.5 h-3.5" />
              Phone
            </button>
          </div>

          {/* Type-Specific Forms */}
          <div className="p-5 rounded-2xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 space-y-4 shadow-xs">
            {qrType === 'link' && (
              <div>
                <label className="block text-[11px] font-medium text-stone-700 dark:text-stone-300 mb-1">
                  Destination URL
                </label>
                <input
                  type="url"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  placeholder="https://yourwebsite.com"
                  className="w-full py-2 px-3 text-xs rounded-xl border border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 text-stone-900 dark:text-stone-100 font-medium"
                />
              </div>
            )}

            {qrType === 'wifi' && (
              <div className="space-y-3">
                <div>
                  <label className="block text-[11px] font-medium text-stone-700 dark:text-stone-300 mb-1">
                    WiFi Network Name (SSID)
                  </label>
                  <input
                    type="text"
                    value={wifiSsid}
                    onChange={(e) => setWifiSsid(e.target.value)}
                    placeholder="MyHome_WiFi"
                    className="w-full py-2 px-3 text-xs rounded-xl border border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 text-stone-900 dark:text-stone-100"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-medium text-stone-700 dark:text-stone-300 mb-1">
                    WiFi Password
                  </label>
                  <input
                    type="text"
                    value={wifiPassword}
                    onChange={(e) => setWifiPassword(e.target.value)}
                    placeholder="WiFi Password"
                    className="w-full py-2 px-3 text-xs rounded-xl border border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 text-stone-900 dark:text-stone-100"
                  />
                </div>
              </div>
            )}

            {qrType === 'text' && (
              <div>
                <label className="block text-[11px] font-medium text-stone-700 dark:text-stone-300 mb-1">
                  Text Content
                </label>
                <textarea
                  rows={3}
                  value={textContent}
                  onChange={(e) => setTextContent(e.target.value)}
                  placeholder="Type any message, note, or serial number..."
                  className="w-full py-2 px-3 text-xs rounded-xl border border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 text-stone-900 dark:text-stone-100"
                />
              </div>
            )}

            {qrType === 'email' && (
              <div className="space-y-3">
                <div>
                  <label className="block text-[11px] font-medium text-stone-700 dark:text-stone-300 mb-1">
                    Email Address
                  </label>
                  <input
                    type="email"
                    value={emailAddress}
                    onChange={(e) => setEmailAddress(e.target.value)}
                    placeholder="support@company.com"
                    className="w-full py-2 px-3 text-xs rounded-xl border border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 text-stone-900 dark:text-stone-100"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-medium text-stone-700 dark:text-stone-300 mb-1">
                    Subject (Optional)
                  </label>
                  <input
                    type="text"
                    value={emailSubject}
                    onChange={(e) => setEmailSubject(e.target.value)}
                    placeholder="Inquiry from QR"
                    className="w-full py-2 px-3 text-xs rounded-xl border border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 text-stone-900 dark:text-stone-100"
                  />
                </div>
              </div>
            )}

            {qrType === 'phone' && (
              <div>
                <label className="block text-[11px] font-medium text-stone-700 dark:text-stone-300 mb-1">
                  Phone Number
                </label>
                <input
                  type="tel"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  placeholder="+92 300 1234567"
                  className="w-full py-2 px-3 text-xs rounded-xl border border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 text-stone-900 dark:text-stone-100"
                />
              </div>
            )}
          </div>

          {/* Color & Styling Options */}
          <div className="p-5 rounded-2xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 space-y-4">
            <div className="flex items-center gap-2 pb-2 border-b border-stone-100 dark:border-stone-800">
              <Palette className="w-4 h-4 text-emerald-600" />
              <h3 className="text-xs font-bold uppercase tracking-wider text-stone-700 dark:text-stone-300">
                Colors & Precision
              </h3>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-[11px] font-medium text-stone-700 dark:text-stone-300 mb-1">
                  QR Pattern Color
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={fgColor}
                    onChange={(e) => setFgColor(e.target.value)}
                    className="w-8 h-8 rounded-lg cursor-pointer border border-stone-200"
                  />
                  <span className="text-xs font-mono">{fgColor}</span>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-medium text-stone-700 dark:text-stone-300 mb-1">
                  Background Color
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={bgColor}
                    onChange={(e) => setBgColor(e.target.value)}
                    className="w-8 h-8 rounded-lg cursor-pointer border border-stone-200"
                  />
                  <span className="text-xs font-mono">{bgColor}</span>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-medium text-stone-700 dark:text-stone-300 mb-1">
                  Error Correction
                </label>
                <select
                  value={errorCorrection}
                  onChange={(e) => setErrorCorrection(e.target.value as any)}
                  className="w-full py-1.5 px-2 text-xs rounded-xl border border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-800"
                >
                  <option value="L">Low (7%)</option>
                  <option value="M">Medium (15%)</option>
                  <option value="Q">Quartile (25%)</option>
                  <option value="H">High (30% - Best)</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* Right Side: Live QR Preview & Actions */}
        <div className="md:col-span-5 flex flex-col items-center justify-center p-6 rounded-2xl bg-stone-50 dark:bg-stone-900 border border-stone-200 dark:border-stone-800 space-y-5">
          <div className="p-4 rounded-2xl bg-white shadow-md border border-stone-200 flex items-center justify-center">
            {qrDataUrl ? (
              <img
                src={qrDataUrl}
                alt="Generated QR Code"
                className="w-56 h-56 object-contain rounded-lg"
              />
            ) : (
              <div className="w-56 h-56 flex items-center justify-center text-stone-400 text-xs">
                Generating QR...
              </div>
            )}
          </div>

          <div className="w-full space-y-2">
            <button
              type="button"
              onClick={handleDownloadPng}
              className="w-full py-3 px-4 rounded-xl text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 transition-colors flex items-center justify-center gap-2 shadow-sm"
            >
              <Download className="w-4 h-4" />
              Download High-Res QR (PNG)
            </button>

            <button
              type="button"
              onClick={handleCopyLink}
              className="w-full py-2.5 px-4 rounded-xl text-xs font-medium text-stone-700 dark:text-stone-300 bg-white dark:bg-stone-800 border border-stone-200 dark:border-stone-700 hover:bg-stone-100 flex items-center justify-center gap-2"
            >
              {copied ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
              {copied ? 'Copied Data!' : 'Copy Raw Content'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

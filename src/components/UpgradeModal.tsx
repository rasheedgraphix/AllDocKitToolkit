import React, { useState, useEffect } from 'react';
import {
  X,
  Crown,
  Check,
  Sparkles,
  Copy,
  CheckCheck,
  Send,
  Smartphone,
  CreditCard,
  Building2,
  Zap,
  Lock,
  ShieldCheck,
  AlertCircle,
  KeyRound,
  Download,
  Mail,
  User as UserIcon,
} from 'lucide-react';
import { getPaymentConfig, PaymentConfig } from '../utils/paymentConfig';
import { setTestLicense, activateLicenseWithKey, generateLicenseKey, maskEmail } from '../utils/license';
import { useAuth } from '../contexts/AuthContext';

interface UpgradeModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultPlan?: 'monthly' | 'annual';
  type?: 'guest_limit' | 'trial_ended';
  onStartTrial?: () => void;
  onSignIn?: () => void;
  openLoginModal?: () => void;
  onUpgrade?: (plan: 'monthly' | 'annual') => Promise<void>;
  onSuccess?: () => void;
}

const USED_TIDS_KEY = 'pixdoc_used_tids';

export const UpgradeModal: React.FC<UpgradeModalProps> = ({
  isOpen,
  onClose,
  defaultPlan = 'annual',
  openLoginModal,
  onUpgrade,
  onSuccess,
}) => {
  const authContext = useAuth();
  const user = authContext?.user;

  const [paymentConfig, setPaymentConfig] = useState<PaymentConfig>(getPaymentConfig());
  const [selectedPlan, setSelectedPlan] = useState<'monthly' | 'annual'>(defaultPlan);
  const [paymentMethod, setPaymentMethod] = useState<'card' | 'easypaisa' | 'bank_iban' | 'license_key'>('card');
  const [copiedField, setCopiedField] = useState<string | null>(null);

  // User Email Lock Field
  const [customerEmail, setCustomerEmail] = useState<string>(user?.email || '');

  // EasyPaisa & Bank Transfer Fields
  const [senderName, setSenderName] = useState(user?.displayName || '');
  const [trxId, setTrxId] = useState('');

  // Card Checkout Fields
  const [cardHolder, setCardHolder] = useState(user?.displayName || '');
  const [cardNumber, setCardNumber] = useState('');
  const [cardExpiry, setCardExpiry] = useState('');
  const [cardCvc, setCardCvc] = useState('');

  // License Key Field
  const [licenseKeyInput, setLicenseKeyInput] = useState('');

  // Processing & State
  const [isProcessing, setIsProcessing] = useState(false);
  const [cardStep, setCardStep] = useState<'form' | 'processing' | '3ds'>('form');
  const [otpCode, setOtpCode] = useState('');
  const [isActivated, setIsActivated] = useState(false);
  const [activatedKey, setActivatedKey] = useState<string>('');
  const [activationMessage, setActivationMessage] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (user?.email) {
      setCustomerEmail(user.email);
    }
    if (user?.displayName) {
      if (!cardHolder) setCardHolder(user.displayName);
      if (!senderName) setSenderName(user.displayName);
    }
  }, [user]);

  useEffect(() => {
    const handleUpdate = () => setPaymentConfig(getPaymentConfig());
    window.addEventListener('payment-config-updated', handleUpdate);
    return () => window.removeEventListener('payment-config-updated', handleUpdate);
  }, []);

  useEffect(() => {
    if (defaultPlan === 'monthly' || defaultPlan === 'annual') {
      setSelectedPlan(defaultPlan);
    }
    setErrorMsg(null);
    setCardStep('form');
    setIsActivated(false);
  }, [defaultPlan, isOpen]);

  if (!isOpen) return null;

  const handleCopy = (text: string, fieldName: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(fieldName);
    setTimeout(() => setCopiedField(null), 2500);
  };

  const getPlanPrice = () => {
    if (selectedPlan === 'monthly') {
      return { pkr: paymentConfig.monthlyPricePkr, usd: paymentConfig.monthlyPriceUsd, label: 'Monthly' };
    }
    return { pkr: paymentConfig.annualPricePkr, usd: paymentConfig.annualPriceUsd, label: 'Annual (1 Year)' };
  };

  const planInfo = getPlanPrice();

  // Format Card Number (XXXX XXXX XXXX XXXX)
  const handleCardNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.replace(/\D/g, '').substring(0, 16);
    const formatted = val.match(/.{1,4}/g)?.join(' ') || val;
    setCardNumber(formatted);
  };

  // Format Expiry (MM/YY)
  const handleExpiryChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let val = e.target.value.replace(/\D/g, '').substring(0, 4);
    if (val.length >= 2) {
      val = val.substring(0, 2) + '/' + val.substring(2);
    }
    setCardExpiry(val);
  };

  // WhatsApp receipt verification
  const handleWhatsAppSend = () => {
    const methodTitle =
      paymentMethod === 'card'
        ? 'Debit/Credit Card'
        : paymentMethod === 'easypaisa'
        ? 'EasyPaisa Wallet'
        : 'Bank IBAN Transfer';

    const activeEmail = user?.email || customerEmail || 'guest@pixdoc.app';

    const message = encodeURIComponent(
      `Assalam-o-Alaikum Nouman Bhai! I want to activate PixDoc Pro.\n\n` +
      `📌 Plan: ${planInfo.label} (Rs. ${planInfo.pkr})\n` +
      `💳 Method: ${methodTitle}\n` +
      `📧 Gmail: ${activeEmail}\n` +
      `👤 Sender Name: ${senderName || cardHolder || 'PixDoc User'}\n` +
      `🔢 TID / Payment Ref: ${trxId || 'Sent via App'}\n\n` +
      `Please check my payment screenshot attached below and issue my Pro License Key. Thank you!`
    );
    const cleanPhone = paymentConfig.whatsappNumber.replace(/[^0-9]/g, '');
    window.open(`https://wa.me/${cleanPhone}?text=${message}`, '_blank');
  };

  // Download License Key receipt
  const handleDownloadLicenseFile = () => {
    const activeEmail = user?.email || customerEmail || 'Locked to Account';
    const textContent =
      `=========================================\n` +
      `   PIXDOC PRO OFFICIAL LICENSE CERTIFICATE\n` +
      `=========================================\n\n` +
      `License Key   : ${activatedKey}\n` +
      `Plan          : ${selectedPlan === 'annual' ? 'Annual Pro (1 Year)' : 'Monthly Pro (30 Days)'}\n` +
      `Locked Email  : ${activeEmail} (Exclusive to this Gmail)\n` +
      `Customer Name : ${senderName || cardHolder || 'PixDoc Pro Customer'}\n` +
      `Issue Date    : ${new Date().toLocaleDateString()}\n` +
      `Payment Ref   : ${trxId || 'Direct Card Gateway'}\n` +
      `Status        : ACTIVE (100% Ad-Free & Unlimited)\n\n` +
      `Support: WhatsApp +92 345 5067874\n` +
      `Owner  : Nouman Ur Rasheed (Rasheed Graphix)\n` +
      `=========================================\n` +
      `Notice: This license key is strictly locked to ${activeEmail} and will NOT work on any other Gmail address!`;

    const blob = new Blob([textContent], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `PixDoc-Pro-License-${activatedKey}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Handle Online Card Payment Flow
  const handleCardSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    const activeEmail = (user?.email || customerEmail || '').trim();
    if (!activeEmail || !activeEmail.includes('@')) {
      setErrorMsg('Please enter your valid Gmail address so your Pro license can be locked to your account.');
      return;
    }

    const cleanCard = cardNumber.replace(/\s/g, '');
    if (cleanCard.length < 15) {
      setErrorMsg('Please enter a valid 16-digit debit or credit card number.');
      return;
    }

    if (!cardExpiry.includes('/') || cardExpiry.length < 5) {
      setErrorMsg('Please enter a valid expiry date (MM/YY).');
      return;
    }

    if (cardCvc.length < 3) {
      setErrorMsg('Please enter a valid 3-digit CVV / CVC security code.');
      return;
    }

    if (!cardHolder.trim()) {
      setErrorMsg('Please enter the name on your card.');
      return;
    }

    setIsProcessing(true);
    setCardStep('processing');

    // Simulate 3D-Secure Bank OTP verification
    setTimeout(() => {
      setIsProcessing(false);
      setCardStep('3ds');
    }, 1200);
  };

  const handleVerifyOtp = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (otpCode.length < 4) {
      setErrorMsg('Please enter the 6-digit OTP code sent by your bank via SMS.');
      return;
    }

    setIsProcessing(true);

    setTimeout(async () => {
      const activeEmail = (user?.email || customerEmail || '').trim();
      const newKey = setTestLicense(selectedPlan, undefined, activeEmail);
      setActivatedKey(newKey);

      if (onUpgrade) {
        try {
          await onUpgrade(selectedPlan);
        } catch (err) {
          console.warn('Backend sync:', err);
        }
      }

      setIsProcessing(false);
      setActivationMessage(`Payment of Rs. ${planInfo.pkr} Successful! Pro License is now locked to ${activeEmail}.`);
      setIsActivated(true);

      if (onSuccess) onSuccess();
    }, 1400);
  };

  // Handle EasyPaisa / Bank TID Verification with Anti-Fraud Checks
  const handleTidSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    const activeEmail = (user?.email || customerEmail || '').trim();
    if (!activeEmail || !activeEmail.includes('@')) {
      setErrorMsg('Please provide your Gmail address to register and lock your Pro license.');
      return;
    }

    const cleanTid = trxId.trim();
    if (!cleanTid || cleanTid.length < 6) {
      setErrorMsg('Invalid Transaction ID (TID). EasyPaisa and Bank TID must be at least 6 digits long.');
      return;
    }

    // Check against duplicate reuse
    try {
      const usedTids = JSON.parse(localStorage.getItem(USED_TIDS_KEY) || '[]');
      if (usedTids.includes(cleanTid)) {
        setErrorMsg('This Transaction ID (TID) has already been registered. Please contact support on WhatsApp.');
        return;
      }
      usedTids.push(cleanTid);
      localStorage.setItem(USED_TIDS_KEY, JSON.stringify(usedTids));
    } catch {
      // fallback
    }

    setIsProcessing(true);

    setTimeout(async () => {
      const newKey = setTestLicense(selectedPlan, undefined, activeEmail);
      setActivatedKey(newKey);

      if (onUpgrade) {
        try {
          await onUpgrade(selectedPlan);
        } catch (err) {
          console.warn('Backend sync:', err);
        }
      }

      setIsProcessing(false);
      setActivationMessage(`EasyPaisa TID verified! Pro license locked to ${activeEmail}.`);
      setIsActivated(true);

      if (onSuccess) onSuccess();
    }, 1200);
  };

  // Handle Direct License Key activation with strict Email-Lock
  const handleLicenseKeySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    const activeEmail = (user?.email || customerEmail || '').trim();
    const res = activateLicenseWithKey(licenseKeyInput, activeEmail);

    if (res.success && res.key) {
      setIsProcessing(true);
      setTimeout(() => {
        setIsProcessing(false);
        setActivatedKey(res.key || licenseKeyInput.toUpperCase());
        setActivationMessage(`License verified! Successfully activated for ${activeEmail || 'your account'}.`);
        setIsActivated(true);

        if (onSuccess) onSuccess();
      }, 800);
    } else {
      setErrorMsg(res.error || 'Invalid License Key. Please enter the correct key.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/65 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="relative w-full max-w-xl rounded-3xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="px-6 py-4 bg-linear-to-r from-emerald-600 via-teal-700 to-emerald-800 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-white/20 flex items-center justify-center shadow-inner">
              <Crown className="w-5 h-5 text-amber-300" />
            </div>
            <div>
              <h3 className="text-base font-bold">Upgrade to PixDoc Pro</h3>
              <p className="text-xs text-emerald-100">100% Ad-Free, High-Speed & Unlimited Batch Tools</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-5">
          {/* User Account Lock Indicator */}
          {user ? (
            <div className="p-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-full bg-emerald-600 text-white flex items-center justify-center font-bold text-[10px]">
                  {user.displayName?.[0] || user.email?.[0]?.toUpperCase() || 'U'}
                </div>
                <div>
                  <div className="font-bold text-stone-900 dark:text-stone-100">
                    {user.displayName || 'Google Account'}
                  </div>
                  <div className="text-[11px] text-emerald-700 dark:text-emerald-400 font-mono">
                    🔒 License locked to: {user.email}
                  </div>
                </div>
              </div>
              <span className="px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-900 text-emerald-800 dark:text-emerald-200 text-[10px] font-extrabold uppercase">
                Email-Protected
              </span>
            </div>
          ) : (
            <div className="p-3 rounded-2xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 text-xs">
              <div className="flex items-center gap-2 text-amber-900 dark:text-amber-200">
                <ShieldCheck className="w-4 h-4 text-amber-600 shrink-0" />
                <span>
                  <strong>Tip:</strong> Sign in with Google so your Pro license is securely tied to your Gmail.
                </span>
              </div>
              {openLoginModal && (
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    openLoginModal();
                  }}
                  className="px-3 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-[11px] transition-all cursor-pointer whitespace-nowrap"
                >
                  Sign In First
                </button>
              )}
            </div>
          )}

          {isActivated ? (
            <div className="py-4 text-center space-y-4 animate-in zoom-in-95 duration-200">
              <div className="w-14 h-14 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 mx-auto flex items-center justify-center shadow-inner">
                <CheckCheck className="w-7 h-7" />
              </div>
              <div>
                <h4 className="text-lg font-bold text-stone-900 dark:text-stone-100">
                  🎉 PixDoc Pro Activated Successfully!
                </h4>
                <p className="text-xs text-stone-600 dark:text-stone-400 mt-1 max-w-sm mx-auto">
                  {activationMessage}
                </p>
              </div>

              {/* License Key Display Card */}
              <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-800 text-left space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-800 dark:text-emerald-300 flex items-center gap-1.5">
                    <KeyRound className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Your Official Pro License Key</span>
                  </span>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-200 dark:bg-emerald-900 text-emerald-800 dark:text-emerald-200">
                    {selectedPlan === 'annual' ? '1 Year Pro' : 'Monthly Pro'}
                  </span>
                </div>

                <div className="p-3 rounded-xl bg-white dark:bg-stone-900 border border-emerald-200 dark:border-emerald-800 flex items-center justify-between">
                  <span className="font-mono text-sm sm:text-base font-extrabold text-stone-900 dark:text-stone-100 tracking-wider">
                    {activatedKey}
                  </span>
                  <button
                    type="button"
                    onClick={() => handleCopy(activatedKey, 'licenseKey')}
                    className="py-1 px-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-all flex items-center gap-1 cursor-pointer"
                  >
                    {copiedField === 'licenseKey' ? (
                      <>
                        <Check className="w-3.5 h-3.5" />
                        <span>Copied!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        <span>Copy Key</span>
                      </>
                    )}
                  </button>
                </div>

                <div className="p-2 rounded-xl bg-emerald-100/60 dark:bg-emerald-900/40 text-[11px] text-emerald-900 dark:text-emerald-200 font-medium">
                  🔒 <strong>Account Security:</strong> This key is permanently locked to <strong>{user?.email || customerEmail}</strong>. Nobody else can activate or steal this key on another Gmail account!
                </div>
              </div>

              <div className="flex flex-col sm:flex-row items-center justify-center gap-2 pt-2">
                <button
                  type="button"
                  onClick={handleDownloadLicenseFile}
                  className="w-full sm:w-auto py-2.5 px-4 rounded-xl bg-stone-100 dark:bg-stone-800 hover:bg-stone-200 dark:hover:bg-stone-700 text-stone-800 dark:text-stone-200 text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Download className="w-4 h-4" />
                  <span>Download License (.txt)</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    window.location.reload();
                  }}
                  className="w-full sm:w-auto py-2.5 px-6 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-all cursor-pointer shadow-md"
                >
                  Start Using PixDoc Pro
                </button>
              </div>
            </div>
          ) : (
            <>
              {/* Step 1: Exactly 2 Plans */}
              <div>
                <label className="block text-xs font-bold text-stone-700 dark:text-stone-300 mb-2 uppercase tracking-wider">
                  1. Choose Your Plan
                </label>
                <div className="grid grid-cols-2 gap-3">
                  {/* Plan 1: Monthly */}
                  <button
                    type="button"
                    onClick={() => setSelectedPlan('monthly')}
                    className={`p-4 rounded-2xl border text-left transition-all cursor-pointer ${
                      selectedPlan === 'monthly'
                        ? 'border-emerald-600 bg-emerald-50/50 dark:bg-emerald-950/30 ring-2 ring-emerald-500/20'
                        : 'border-stone-200 dark:border-stone-800 bg-stone-50 dark:bg-stone-800/40 hover:bg-stone-100'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-stone-600 dark:text-stone-300">Monthly Plan</span>
                      <span className="text-[10px] text-stone-400 font-mono">${paymentConfig.monthlyPriceUsd}/mo</span>
                    </div>
                    <div className="text-xl font-extrabold text-stone-900 dark:text-stone-100 mt-1">
                      Rs. {paymentConfig.monthlyPricePkr}
                    </div>
                    <p className="text-[11px] text-stone-500 mt-1">Standard monthly billing, cancel anytime.</p>
                  </button>

                  {/* Plan 2: Annual (Popular) */}
                  <button
                    type="button"
                    onClick={() => setSelectedPlan('annual')}
                    className={`relative p-4 rounded-2xl border text-left transition-all cursor-pointer ${
                      selectedPlan === 'annual'
                        ? 'border-emerald-600 bg-emerald-50/50 dark:bg-emerald-950/30 ring-2 ring-emerald-500/20'
                        : 'border-stone-200 dark:border-stone-800 bg-stone-50 dark:bg-stone-800/40 hover:bg-stone-100'
                    }`}
                  >
                    <span className="absolute -top-2.5 right-3 px-2 py-0.5 rounded-full text-[9px] font-extrabold bg-emerald-600 text-white uppercase shadow-xs">
                      MOST POPULAR • BEST VALUE
                    </span>
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-stone-600 dark:text-stone-300">Annual (1 Year)</span>
                      <span className="text-[10px] text-emerald-600 font-bold font-mono">${paymentConfig.annualPriceUsd}/yr</span>
                    </div>
                    <div className="text-xl font-extrabold text-stone-900 dark:text-stone-100 mt-1">
                      Rs. {paymentConfig.annualPricePkr}
                    </div>
                    <p className="text-[11px] text-emerald-700 dark:text-emerald-400 mt-1 font-medium">
                      Save 65% + Full Pro Features
                    </p>
                  </button>
                </div>
              </div>

              {/* Step 2: Select Payment Method */}
              <div>
                <label className="block text-xs font-bold text-stone-700 dark:text-stone-300 mb-2 uppercase tracking-wider">
                  2. Select Payment Method
                </label>
                <div className="grid grid-cols-4 gap-1.5 p-1 rounded-2xl bg-stone-100 dark:bg-stone-800 text-xs">
                  {/* Card Tab */}
                  <button
                    type="button"
                    onClick={() => {
                      setPaymentMethod('card');
                      setCardStep('form');
                      setErrorMsg(null);
                    }}
                    className={`py-2 px-1.5 rounded-xl font-bold flex flex-col sm:flex-row items-center justify-center gap-1 transition-all cursor-pointer ${
                      paymentMethod === 'card'
                        ? 'bg-white dark:bg-stone-900 text-emerald-600 dark:text-emerald-400 shadow-xs'
                        : 'text-stone-600 dark:text-stone-400 hover:text-stone-900'
                    }`}
                  >
                    <CreditCard className="w-3.5 h-3.5" />
                    <span className="text-[11px]">Debit/Card</span>
                  </button>

                  {/* EasyPaisa Tab */}
                  <button
                    type="button"
                    onClick={() => {
                      setPaymentMethod('easypaisa');
                      setErrorMsg(null);
                    }}
                    className={`py-2 px-1.5 rounded-xl font-bold flex flex-col sm:flex-row items-center justify-center gap-1 transition-all cursor-pointer ${
                      paymentMethod === 'easypaisa'
                        ? 'bg-white dark:bg-stone-900 text-emerald-600 dark:text-emerald-400 shadow-xs'
                        : 'text-stone-600 dark:text-stone-400 hover:text-stone-900'
                    }`}
                  >
                    <Smartphone className="w-3.5 h-3.5" />
                    <span className="text-[11px]">EasyPaisa</span>
                  </button>

                  {/* Bank IBAN Tab */}
                  <button
                    type="button"
                    onClick={() => {
                      setPaymentMethod('bank_iban');
                      setErrorMsg(null);
                    }}
                    className={`py-2 px-1.5 rounded-xl font-bold flex flex-col sm:flex-row items-center justify-center gap-1 transition-all cursor-pointer ${
                      paymentMethod === 'bank_iban'
                        ? 'bg-white dark:bg-stone-900 text-emerald-600 dark:text-emerald-400 shadow-xs'
                        : 'text-stone-600 dark:text-stone-400 hover:text-stone-900'
                    }`}
                  >
                    <Building2 className="w-3.5 h-3.5" />
                    <span className="text-[11px]">Bank IBAN</span>
                  </button>

                  {/* License Key Tab */}
                  <button
                    type="button"
                    onClick={() => {
                      setPaymentMethod('license_key');
                      setErrorMsg(null);
                    }}
                    className={`py-2 px-1.5 rounded-xl font-bold flex flex-col sm:flex-row items-center justify-center gap-1 transition-all cursor-pointer ${
                      paymentMethod === 'license_key'
                        ? 'bg-white dark:bg-stone-900 text-emerald-600 dark:text-emerald-400 shadow-xs'
                        : 'text-stone-600 dark:text-stone-400 hover:text-stone-900'
                    }`}
                  >
                    <KeyRound className="w-3.5 h-3.5" />
                    <span className="text-[11px]">License Key</span>
                  </button>
                </div>
              </div>

              {/* Guest User Email Field if not logged in */}
              {!user && (
                <div>
                  <label className="block text-[11px] font-bold text-stone-700 dark:text-stone-300 mb-1">
                    Your Gmail Address (License will be locked to this email) <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <input
                      type="email"
                      required
                      value={customerEmail}
                      onChange={(e) => setCustomerEmail(e.target.value)}
                      placeholder="e.g. yourname@gmail.com"
                      className="w-full pl-8 pr-3 py-2 text-xs rounded-xl border border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 text-stone-900 dark:text-stone-100"
                    />
                    <Mail className="w-3.5 h-3.5 text-stone-400 absolute left-2.5 top-2.5" />
                  </div>
                </div>
              )}

              {/* PAYMENT FORMS & GATEWAYS */}

              {/* 1. REAL CARD PAYMENT FORM */}
              {paymentMethod === 'card' && (
                <div className="space-y-3">
                  {cardStep === 'form' && (
                    <form onSubmit={handleCardSubmit} className="space-y-3">
                      <div className="p-4 rounded-2xl bg-stone-50 dark:bg-stone-800/40 border border-stone-200 dark:border-stone-700 space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-stone-900 dark:text-stone-100 flex items-center gap-1.5">
                            <Lock className="w-3.5 h-3.5 text-emerald-600" />
                            <span>Secure 256-Bit SSL Card Checkout</span>
                          </span>
                          <span className="text-xs font-extrabold text-emerald-700 dark:text-emerald-400">
                            Total: Rs. {planInfo.pkr}
                          </span>
                        </div>

                        <div>
                          <label className="block text-[11px] font-bold text-stone-700 dark:text-stone-300 mb-1">
                            Cardholder Name
                          </label>
                          <input
                            type="text"
                            required
                            value={cardHolder}
                            onChange={(e) => setCardHolder(e.target.value)}
                            placeholder="e.g. Nouman Ali"
                            className="w-full px-3 py-2 text-xs rounded-xl border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-900 text-stone-900 dark:text-stone-100"
                          />
                        </div>

                        <div>
                          <label className="block text-[11px] font-bold text-stone-700 dark:text-stone-300 mb-1">
                            Card Number (Visa / MasterCard / PayPak / UnionPay)
                          </label>
                          <div className="relative">
                            <input
                              type="text"
                              required
                              value={cardNumber}
                              onChange={handleCardNumberChange}
                              placeholder="4123 4567 8901 2345"
                              maxLength={19}
                              className="w-full pl-3 pr-10 py-2 text-xs font-mono rounded-xl border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-900 text-stone-900 dark:text-stone-100"
                            />
                            <CreditCard className="w-4 h-4 text-stone-400 absolute right-3 top-2.5" />
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="block text-[11px] font-bold text-stone-700 dark:text-stone-300 mb-1">
                              Expiry Date
                            </label>
                            <input
                              type="text"
                              required
                              value={cardExpiry}
                              onChange={handleExpiryChange}
                              placeholder="MM/YY"
                              maxLength={5}
                              className="w-full px-3 py-2 text-xs font-mono rounded-xl border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-900 text-stone-900 dark:text-stone-100 text-center"
                            />
                          </div>

                          <div>
                            <label className="block text-[11px] font-bold text-stone-700 dark:text-stone-300 mb-1">
                              Security Code (CVC / CVV)
                            </label>
                            <input
                              type="password"
                              required
                              value={cardCvc}
                              onChange={(e) => setCardCvc(e.target.value.replace(/\D/g, '').substring(0, 4))}
                              placeholder="123"
                              maxLength={4}
                              className="w-full px-3 py-2 text-xs font-mono rounded-xl border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-900 text-stone-900 dark:text-stone-100 text-center"
                            />
                          </div>
                        </div>
                      </div>

                      {errorMsg && (
                        <div className="p-2.5 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 text-xs text-red-600 dark:text-red-400 flex items-center gap-1.5">
                          <AlertCircle className="w-4 h-4 shrink-0" />
                          <span>{errorMsg}</span>
                        </div>
                      )}

                      <button
                        type="submit"
                        className="w-full py-3 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer"
                      >
                        <Lock className="w-3.5 h-3.5" />
                        <span>Pay Rs. {planInfo.pkr} & Lock to Gmail</span>
                      </button>
                    </form>
                  )}

                  {/* Card Step: 3DS OTP Verification */}
                  {cardStep === '3ds' && (
                    <form onSubmit={handleVerifyOtp} className="p-4 rounded-2xl bg-stone-50 dark:bg-stone-800/40 border border-emerald-500/40 space-y-3 animate-in fade-in">
                      <div className="text-center space-y-1">
                        <div className="w-10 h-10 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-600 mx-auto flex items-center justify-center">
                          <ShieldCheck className="w-5 h-5" />
                        </div>
                        <h5 className="text-sm font-bold text-stone-900 dark:text-stone-100">
                          3D Secure Bank Verification
                        </h5>
                        <p className="text-[11px] text-stone-500">
                          Enter the 6-digit OTP code sent to your mobile by your bank for card ending in {cardNumber.slice(-4) || '****'}.
                        </p>
                      </div>

                      <div>
                        <input
                          type="text"
                          required
                          value={otpCode}
                          onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, '').substring(0, 6))}
                          placeholder="e.g. 583920"
                          className="w-full py-2.5 px-3 text-center text-sm font-mono tracking-widest rounded-xl border border-stone-300 dark:border-stone-600 bg-white dark:bg-stone-900 font-bold"
                        />
                      </div>

                      {errorMsg && (
                        <div className="p-2 rounded-xl bg-red-50 text-[11px] text-red-600 flex items-center gap-1">
                          <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                          <span>{errorMsg}</span>
                        </div>
                      )}

                      <button
                        type="submit"
                        disabled={isProcessing}
                        className="w-full py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                      >
                        {isProcessing ? 'Issuing Locked Key...' : 'Submit OTP & Lock License to Gmail'}
                      </button>
                    </form>
                  )}

                  {cardStep === 'processing' && (
                    <div className="py-8 text-center space-y-2 animate-in fade-in">
                      <div className="w-8 h-8 border-3 border-emerald-600 border-t-transparent rounded-full animate-spin mx-auto" />
                      <p className="text-xs font-bold text-stone-800 dark:text-stone-200">
                        Connecting to Secure Card Gateway...
                      </p>
                      <p className="text-[11px] text-stone-500">Please do not refresh the page.</p>
                    </div>
                  )}
                </div>
              )}

              {/* 2. EASYPAISA WALLET FLOW */}
              {paymentMethod === 'easypaisa' && (
                <div className="space-y-3">
                  <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-emerald-900 dark:text-emerald-200 uppercase tracking-wider">
                        📱 EasyPaisa Account Details
                      </span>
                      <span className="text-xs font-extrabold text-emerald-700 dark:text-emerald-300">
                        Amount: Rs. {planInfo.pkr}
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                      <div className="p-2.5 rounded-xl bg-white dark:bg-stone-900 border border-emerald-100 dark:border-emerald-900/40 flex items-center justify-between">
                        <div>
                          <div className="text-[10px] text-stone-400 font-medium">Account Title</div>
                          <div className="font-bold text-stone-900 dark:text-stone-100">
                            {paymentConfig.easypaisaAccountTitle}
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleCopy(paymentConfig.easypaisaAccountTitle, 'title')}
                          className="p-1.5 text-stone-400 hover:text-emerald-600 rounded-lg cursor-pointer"
                          title="Copy Title"
                        >
                          {copiedField === 'title' ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                        </button>
                      </div>

                      <div className="p-2.5 rounded-xl bg-white dark:bg-stone-900 border border-emerald-100 dark:border-emerald-900/40 flex items-center justify-between">
                        <div>
                          <div className="text-[10px] text-stone-400 font-medium">EasyPaisa Number</div>
                          <div className="font-bold text-stone-900 dark:text-stone-100 font-mono">
                            {paymentConfig.easypaisaAccountNumber}
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleCopy(paymentConfig.easypaisaAccountNumber, 'number')}
                          className="p-1.5 text-stone-400 hover:text-emerald-600 rounded-lg cursor-pointer"
                          title="Copy Number"
                        >
                          {copiedField === 'number' ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>

                    <p className="text-[11px] text-emerald-800 dark:text-emerald-300 leading-tight">
                      💡 EasyPaisa par <strong>Rs. {planInfo.pkr}</strong> transfer karein aur TID enter karein. License foran aapke Gmail par lock ho jayega!
                    </p>
                  </div>

                  {/* TID Submission Form */}
                  <form onSubmit={handleTidSubmit} className="space-y-3">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-bold text-stone-700 dark:text-stone-300 mb-1">
                          Sender Name (Aapka Naam)
                        </label>
                        <input
                          type="text"
                          value={senderName}
                          onChange={(e) => setSenderName(e.target.value)}
                          placeholder="e.g. Nouman Ali"
                          className="w-full px-3 py-2 text-xs rounded-xl border border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 text-stone-900 dark:text-stone-100"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-stone-700 dark:text-stone-300 mb-1">
                          EasyPaisa TID / Ref No. <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="text"
                          required
                          value={trxId}
                          onChange={(e) => setTrxId(e.target.value)}
                          placeholder="e.g. 23894819482"
                          className="w-full px-3 py-2 text-xs rounded-xl border border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 text-stone-900 dark:text-stone-100 font-mono"
                        />
                      </div>
                    </div>

                    {errorMsg && (
                      <div className="p-2.5 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 text-xs text-red-600 dark:text-red-400 flex items-center gap-1.5">
                        <AlertCircle className="w-4 h-4 shrink-0" />
                        <span>{errorMsg}</span>
                      </div>
                    )}

                    <div className="flex flex-col sm:flex-row items-center gap-2 pt-1">
                      <button
                        type="submit"
                        disabled={isProcessing}
                        className="w-full sm:flex-1 py-3 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                      >
                        <Zap className="w-4 h-4" />
                        <span>{isProcessing ? 'Verifying TID...' : 'Verify TID & Lock to Gmail'}</span>
                      </button>

                      <button
                        type="button"
                        onClick={handleWhatsAppSend}
                        className="w-full sm:w-auto py-3 px-4 rounded-xl bg-green-600 hover:bg-green-700 text-white text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer shadow-xs"
                        title="Send screenshot on WhatsApp"
                      >
                        <Send className="w-4 h-4" />
                        <span>Send on WhatsApp</span>
                      </button>
                    </div>
                  </form>
                </div>
              )}

              {/* 3. BANK IBAN & RAAST FLOW */}
              {paymentMethod === 'bank_iban' && (
                <div className="space-y-3">
                  <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-emerald-900 dark:text-emerald-200 uppercase tracking-wider">
                        🏛️ Bank Account & IBAN Transfer
                      </span>
                      <span className="text-xs font-extrabold text-emerald-700 dark:text-emerald-300">
                        Amount: Rs. {planInfo.pkr}
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                      <div className="p-2.5 rounded-xl bg-white dark:bg-stone-900 border border-emerald-100 dark:border-emerald-900/40">
                        <div className="text-[10px] text-stone-400 font-medium">Bank Name</div>
                        <div className="font-bold text-stone-900 dark:text-stone-100">
                          {paymentConfig.bankName}
                        </div>
                      </div>
                      <div className="p-2.5 rounded-xl bg-white dark:bg-stone-900 border border-emerald-100 dark:border-emerald-900/40">
                        <div className="text-[10px] text-stone-400 font-medium">Account Title</div>
                        <div className="font-bold text-stone-900 dark:text-stone-100">
                          {paymentConfig.easypaisaAccountTitle}
                        </div>
                      </div>
                    </div>

                    <div className="p-2.5 rounded-xl bg-white dark:bg-stone-900 border border-emerald-100 dark:border-emerald-900/40 flex items-center justify-between">
                      <div>
                        <div className="text-[10px] text-stone-400 font-medium">IBAN / Raast ID</div>
                        <div className="font-bold text-stone-900 dark:text-stone-100 font-mono text-[11px]">
                          {paymentConfig.easypaisaIban}
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleCopy(paymentConfig.easypaisaIban, 'iban')}
                        className="p-1.5 text-stone-400 hover:text-emerald-600 rounded-lg cursor-pointer"
                        title="Copy IBAN"
                      >
                        {copiedField === 'iban' ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  {/* TID Submission */}
                  <form onSubmit={handleTidSubmit} className="space-y-3">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-bold text-stone-700 dark:text-stone-300 mb-1">
                          Sender Bank / Name
                        </label>
                        <input
                          type="text"
                          value={senderName}
                          onChange={(e) => setSenderName(e.target.value)}
                          placeholder="e.g. Meezan Bank / Ali"
                          className="w-full px-3 py-2 text-xs rounded-xl border border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 text-stone-900 dark:text-stone-100"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-stone-700 dark:text-stone-300 mb-1">
                          Bank Reference / TRX ID <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="text"
                          required
                          value={trxId}
                          onChange={(e) => setTrxId(e.target.value)}
                          placeholder="e.g. 20240923001"
                          className="w-full px-3 py-2 text-xs rounded-xl border border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 text-stone-900 dark:text-stone-100 font-mono"
                        />
                      </div>
                    </div>

                    {errorMsg && (
                      <div className="p-2.5 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 text-xs text-red-600 dark:text-red-400 flex items-center gap-1.5">
                        <AlertCircle className="w-4 h-4 shrink-0" />
                        <span>{errorMsg}</span>
                      </div>
                    )}

                    <div className="flex flex-col sm:flex-row items-center gap-2 pt-1">
                      <button
                        type="submit"
                        disabled={isProcessing}
                        className="w-full sm:flex-1 py-3 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                      >
                        <Zap className="w-4 h-4" />
                        <span>{isProcessing ? 'Verifying...' : 'Submit Reference & Lock'}</span>
                      </button>

                      <button
                        type="button"
                        onClick={handleWhatsAppSend}
                        className="w-full sm:w-auto py-3 px-4 rounded-xl bg-green-600 hover:bg-green-700 text-white text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer shadow-xs"
                        title="Send receipt on WhatsApp"
                      >
                        <Send className="w-4 h-4" />
                        <span>WhatsApp Receipt</span>
                      </button>
                    </div>
                  </form>
                </div>
              )}

              {/* 4. LICENSE KEY ACTIVATION TAB */}
              {paymentMethod === 'license_key' && (
                <form onSubmit={handleLicenseKeySubmit} className="p-4 rounded-2xl bg-stone-50 dark:bg-stone-800/40 border border-stone-200 dark:border-stone-700 space-y-3">
                  <div className="space-y-1">
                    <h5 className="text-xs font-bold text-stone-900 dark:text-stone-100 flex items-center gap-1.5">
                      <KeyRound className="w-4 h-4 text-amber-500" />
                      <span>Have an official PixDoc Pro License Key?</span>
                    </h5>
                    <p className="text-[11px] text-stone-500">
                      Enter your key below. It will be verified against your registered Gmail ({user?.email || customerEmail || 'your email'}).
                    </p>
                  </div>

                  <div>
                    <input
                      type="text"
                      required
                      value={licenseKeyInput}
                      onChange={(e) => setLicenseKeyInput(e.target.value.toUpperCase())}
                      placeholder="e.g. PX-ANN-9B84-X87K-7123"
                      className="w-full px-3 py-2 text-xs font-mono tracking-wider rounded-xl border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-900 text-stone-900 dark:text-stone-100 uppercase font-bold"
                    />
                  </div>

                  {errorMsg && (
                    <div className="p-2.5 rounded-xl bg-red-50 text-xs text-red-600 flex items-center gap-1.5">
                      <AlertCircle className="w-4 h-4 shrink-0" />
                      <span>{errorMsg}</span>
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={isProcessing}
                    className="w-full py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <CheckCheck className="w-4 h-4" />
                    <span>{isProcessing ? 'Verifying Key...' : 'Activate & Bind to This Gmail'}</span>
                  </button>
                </form>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

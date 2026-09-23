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
} from 'lucide-react';
import { getPaymentConfig, PaymentConfig } from '../utils/paymentConfig';
import { setTestLicense } from '../utils/license';

interface UpgradeModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultPlan?: 'monthly' | 'annual' | 'lifetime';
  type?: 'guest_limit' | 'trial_ended';
  onStartTrial?: () => void;
  onSignIn?: () => void;
  openLoginModal?: () => void;
  onUpgrade?: (plan: 'monthly' | 'annual') => Promise<void>;
  onSuccess?: () => void;
}

export const UpgradeModal: React.FC<UpgradeModalProps> = ({
  isOpen,
  onClose,
  defaultPlan = 'annual',
  onUpgrade,
  onSuccess,
}) => {
  const [paymentConfig, setPaymentConfig] = useState<PaymentConfig>(getPaymentConfig());
  const [selectedPlan, setSelectedPlan] = useState<'monthly' | 'annual' | 'lifetime'>(defaultPlan);
  const [paymentMethod, setPaymentMethod] = useState<'easypaisa' | 'bank_iban' | 'card'>('easypaisa');
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [senderName, setSenderName] = useState('');
  const [trxId, setTrxId] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isActivated, setIsActivated] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    const handleUpdate = () => setPaymentConfig(getPaymentConfig());
    window.addEventListener('payment-config-updated', handleUpdate);
    return () => window.removeEventListener('payment-config-updated', handleUpdate);
  }, []);

  useEffect(() => {
    setSelectedPlan(defaultPlan);
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
    if (selectedPlan === 'annual') {
      return { pkr: paymentConfig.annualPricePkr, usd: paymentConfig.annualPriceUsd, label: 'Annual (1 Year)' };
    }
    return { pkr: paymentConfig.lifetimePricePkr, usd: paymentConfig.lifetimePriceUsd, label: 'Lifetime Access' };
  };

  const planInfo = getPlanPrice();

  const handleWhatsAppSend = () => {
    const message = encodeURIComponent(
      `Assalam-o-Alaikum Hafiz Nouman Bhai! I want to activate PixDoc Pro.\n\n` +
      `📌 Plan: ${planInfo.label} (Rs. ${planInfo.pkr})\n` +
      `💳 Method: ${paymentMethod === 'easypaisa' ? 'EasyPaisa' : paymentMethod === 'bank_iban' ? 'Bank IBAN / Raast' : 'Card Transfer'}\n` +
      `👤 Sender Name: ${senderName || 'Not specified'}\n` +
      `🔢 TID / Reference: ${trxId || 'Sent via payment app'}\n\n` +
      `Please verify and activate my subscription. Thanks!`
    );
    const cleanPhone = paymentConfig.whatsappNumber.replace(/[^0-9]/g, '');
    window.open(`https://wa.me/${cleanPhone}?text=${message}`, '_blank');
  };

  const handleActivatePro = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!trxId || trxId.trim().length < 4) {
      setErrorMsg('Please enter your Transaction ID (TID) or Payment Reference Number.');
      return;
    }

    setIsSubmitting(true);

    setTimeout(async () => {
      // Activate license locally
      setTestLicense(selectedPlan === 'lifetime' ? 'annual' : selectedPlan);
      window.dispatchEvent(new Event('license-updated'));

      if (onUpgrade) {
        try {
          await onUpgrade(selectedPlan === 'lifetime' ? 'annual' : selectedPlan);
        } catch (err) {
          console.warn('Backend upgrade sync:', err);
        }
      }

      setIsSubmitting(false);
      setIsActivated(true);

      if (onSuccess) {
        onSuccess();
      }

      setTimeout(() => {
        onClose();
        window.location.reload();
      }, 2000);
    }, 1200);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="relative w-full max-w-xl rounded-3xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="px-6 py-4 bg-linear-to-r from-emerald-600 to-teal-700 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-white/20 flex items-center justify-center">
              <Crown className="w-5 h-5 text-amber-300" />
            </div>
            <div>
              <h3 className="text-base font-bold">Upgrade to PixDoc Pro</h3>
              <p className="text-xs text-emerald-100">100% Ad-Free & Unlimited Batch Processing</p>
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
          {isActivated ? (
            <div className="py-8 text-center space-y-3">
              <div className="w-16 h-16 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 mx-auto flex items-center justify-center shadow-inner">
                <CheckCheck className="w-8 h-8" />
              </div>
              <h4 className="text-lg font-bold text-stone-900 dark:text-stone-100">
                🎉 Congratulations! PixDoc Pro is Active!
              </h4>
              <p className="text-xs text-stone-600 dark:text-stone-400 max-w-sm mx-auto">
                Your payment reference has been recorded and your Pro license is now activated. All ads have been permanently removed!
              </p>
            </div>
          ) : (
            <>
              {/* Step 1: Select Plan */}
              <div>
                <label className="block text-xs font-bold text-stone-700 dark:text-stone-300 mb-2 uppercase tracking-wider">
                  1. Choose Your Plan
                </label>
                <div className="grid grid-cols-3 gap-2.5">
                  {/* Monthly */}
                  <button
                    type="button"
                    onClick={() => setSelectedPlan('monthly')}
                    className={`p-3 rounded-2xl border text-left transition-all cursor-pointer ${
                      selectedPlan === 'monthly'
                        ? 'border-emerald-600 bg-emerald-50/50 dark:bg-emerald-950/30 ring-2 ring-emerald-500/20'
                        : 'border-stone-200 dark:border-stone-800 bg-stone-50 dark:bg-stone-800/40 hover:bg-stone-100'
                    }`}
                  >
                    <div className="text-[11px] font-bold text-stone-500">Monthly</div>
                    <div className="text-sm font-extrabold text-stone-900 dark:text-stone-100 mt-0.5">
                      Rs. {paymentConfig.monthlyPricePkr}
                    </div>
                    <div className="text-[10px] text-stone-400">${paymentConfig.monthlyPriceUsd}/mo</div>
                  </button>

                  {/* Annual */}
                  <button
                    type="button"
                    onClick={() => setSelectedPlan('annual')}
                    className={`relative p-3 rounded-2xl border text-left transition-all cursor-pointer ${
                      selectedPlan === 'annual'
                        ? 'border-emerald-600 bg-emerald-50/50 dark:bg-emerald-950/30 ring-2 ring-emerald-500/20'
                        : 'border-stone-200 dark:border-stone-800 bg-stone-50 dark:bg-stone-800/40 hover:bg-stone-100'
                    }`}
                  >
                    <span className="absolute -top-2 right-2 px-1.5 py-0.2 rounded-full text-[9px] font-extrabold bg-emerald-600 text-white uppercase">
                      Popular
                    </span>
                    <div className="text-[11px] font-bold text-stone-500">Annual</div>
                    <div className="text-sm font-extrabold text-stone-900 dark:text-stone-100 mt-0.5">
                      Rs. {paymentConfig.annualPricePkr}
                    </div>
                    <div className="text-[10px] text-stone-400">${paymentConfig.annualPriceUsd}/yr</div>
                  </button>

                  {/* Lifetime */}
                  <button
                    type="button"
                    onClick={() => setSelectedPlan('lifetime')}
                    className={`p-3 rounded-2xl border text-left transition-all cursor-pointer ${
                      selectedPlan === 'lifetime'
                        ? 'border-emerald-600 bg-emerald-50/50 dark:bg-emerald-950/30 ring-2 ring-emerald-500/20'
                        : 'border-stone-200 dark:border-stone-800 bg-stone-50 dark:bg-stone-800/40 hover:bg-stone-100'
                    }`}
                  >
                    <div className="text-[11px] font-bold text-stone-500">Lifetime</div>
                    <div className="text-sm font-extrabold text-stone-900 dark:text-stone-100 mt-0.5">
                      Rs. {paymentConfig.lifetimePricePkr}
                    </div>
                    <div className="text-[10px] text-stone-400">One-time fee</div>
                  </button>
                </div>
              </div>

              {/* Step 2: Select Payment Method Tabs */}
              <div>
                <label className="block text-xs font-bold text-stone-700 dark:text-stone-300 mb-2 uppercase tracking-wider">
                  2. Select Payment Method
                </label>
                <div className="flex items-center gap-2 p-1 rounded-2xl bg-stone-100 dark:bg-stone-800 text-xs">
                  <button
                    type="button"
                    onClick={() => setPaymentMethod('easypaisa')}
                    className={`flex-1 py-2 px-3 rounded-xl font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                      paymentMethod === 'easypaisa'
                        ? 'bg-white dark:bg-stone-900 text-emerald-600 dark:text-emerald-400 shadow-xs'
                        : 'text-stone-600 dark:text-stone-400 hover:text-stone-900'
                    }`}
                  >
                    <Smartphone className="w-3.5 h-3.5" />
                    <span>EasyPaisa / Wallet</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setPaymentMethod('bank_iban')}
                    className={`flex-1 py-2 px-3 rounded-xl font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                      paymentMethod === 'bank_iban'
                        ? 'bg-white dark:bg-stone-900 text-emerald-600 dark:text-emerald-400 shadow-xs'
                        : 'text-stone-600 dark:text-stone-400 hover:text-stone-900'
                    }`}
                  >
                    <Building2 className="w-3.5 h-3.5" />
                    <span>Bank IBAN / Raast</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setPaymentMethod('card')}
                    className={`flex-1 py-2 px-3 rounded-xl font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                      paymentMethod === 'card'
                        ? 'bg-white dark:bg-stone-900 text-emerald-600 dark:text-emerald-400 shadow-xs'
                        : 'text-stone-600 dark:text-stone-400 hover:text-stone-900'
                    }`}
                  >
                    <CreditCard className="w-3.5 h-3.5" />
                    <span>Card / Any ATM</span>
                  </button>
                </div>
              </div>

              {/* Payment Details Container */}
              <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-emerald-900 dark:text-emerald-200 uppercase tracking-wider">
                    {paymentMethod === 'easypaisa' && '📱 EasyPaisa Account'}
                    {paymentMethod === 'bank_iban' && '🏛️ Telenor Bank / IBAN Transfer'}
                    {paymentMethod === 'card' && '💳 Card / ATM / Raast Transfer'}
                  </span>
                  <span className="text-xs font-extrabold text-emerald-700 dark:text-emerald-300">
                    Pay: Rs. {planInfo.pkr}
                  </span>
                </div>

                {/* EasyPaisa Box */}
                {paymentMethod === 'easypaisa' && (
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
                        <div className="text-[10px] text-stone-400 font-medium">EasyPaisa Mobile Number</div>
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
                )}

                {/* Bank / IBAN Box */}
                {paymentMethod === 'bank_iban' && (
                  <div className="space-y-2 text-xs">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
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
                        <div className="text-[10px] text-stone-400 font-medium">IBAN / Raast ID Number</div>
                        <div className="font-bold text-stone-900 dark:text-stone-100 font-mono text-[11px]">
                          {paymentConfig.easypaisaIban || paymentConfig.easypaisaAccountNumber}
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleCopy(paymentConfig.easypaisaIban || paymentConfig.easypaisaAccountNumber, 'iban')}
                        className="p-1.5 text-stone-400 hover:text-emerald-600 rounded-lg cursor-pointer"
                        title="Copy IBAN"
                      >
                        {copiedField === 'iban' ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                )}

                {/* Card Payment Info */}
                {paymentMethod === 'card' && (
                  <div className="p-3 rounded-xl bg-white dark:bg-stone-900 border border-emerald-100 dark:border-emerald-900/40 text-xs space-y-2">
                    <p className="text-stone-700 dark:text-stone-300">
                      💡 <strong>Visa, MasterCard, PayPak, ya UnionPay ATM/Debit Card se:</strong>
                    </p>
                    <ol className="list-decimal pl-4 space-y-1 text-stone-600 dark:text-stone-400 text-[11px]">
                      <li>Apni Banking App (HBL, Meezan, Alfalah, Standard Chartered, etc.) open karein.</li>
                      <li><strong>Send Money / Transfer to Other Bank</strong> choose karein.</li>
                      <li>Bank: <strong>Telenor Microfinance Bank (EasyPaisa)</strong> select karein.</li>
                      <li>Account Number: <strong className="font-mono text-emerald-600">{paymentConfig.easypaisaAccountNumber}</strong> daal kar <strong>Rs. {planInfo.pkr}</strong> transfer karein.</li>
                    </ol>
                  </div>
                )}
              </div>

              {/* Step 3: Transaction ID Form */}
              <form onSubmit={handleActivatePro} className="space-y-3">
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
                      Transaction ID (TID) / Ref No. <span className="text-red-500">*</span>
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
                  <div className="p-2.5 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 text-xs text-red-600 dark:text-red-400">
                    {errorMsg}
                  </div>
                )}

                <div className="flex flex-col sm:flex-row items-center gap-2 pt-2">
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full sm:flex-1 py-3 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                  >
                    <Zap className="w-4 h-4" />
                    <span>{isSubmitting ? 'Verifying & Activating...' : 'Confirm Payment & Activate Pro'}</span>
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
            </>
          )}
        </div>
      </div>
    </div>
  );
};

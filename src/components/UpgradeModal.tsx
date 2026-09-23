import React, { useState } from 'react';
import { X, Sparkles, Check, Crown, ShieldCheck, Zap, Lock } from 'lucide-react';

export interface UpgradeModalProps {
  isOpen: boolean;
  type: 'guest_limit' | 'trial_ended';
  onClose: () => void;
  onUpgrade?: (plan: string) => void;
  onSignIn?: () => void;
  onStartTrial?: () => void;
  openLoginModal?: () => void;
}

export const UpgradeModal: React.FC<UpgradeModalProps> = ({
  isOpen,
  type,
  onClose,
  onUpgrade,
  onSignIn,
  onStartTrial,
  openLoginModal,
}) => {
  const [selectedPlan, setSelectedPlan] = useState<'monthly' | 'annual'>('annual');
  const [isProcessing, setIsProcessing] = useState(false);

  if (!isOpen) return null;

  const handleStartTrial = () => {
    onClose();
    if (onStartTrial) {
      onStartTrial();
    } else if (openLoginModal) {
      openLoginModal();
    } else if (onSignIn) {
      onSignIn();
    }
  };

  const handleAction = async () => {
    if (type === 'guest_limit') {
      handleStartTrial();
    } else {
      setIsProcessing(true);
      try {
        if (onUpgrade) {
          await onUpgrade(selectedPlan);
        }
      } finally {
        setIsProcessing(false);
      }
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-950/75 backdrop-blur-md animate-in fade-in duration-200"
      role="dialog"
      aria-modal="true"
    >
      <div className="relative w-full max-w-lg bg-stone-900 border border-stone-800 rounded-3xl shadow-2xl overflow-hidden text-stone-100 p-6 sm:p-8">
        {/* Glow accent */}
        <div className="absolute -top-24 -left-24 w-60 h-60 bg-emerald-500/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -right-24 w-60 h-60 bg-amber-500/15 rounded-full blur-3xl pointer-events-none" />

        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-2 text-stone-400 hover:text-white rounded-xl hover:bg-stone-800 transition-colors z-10"
          aria-label="Close modal"
        >
          <X className="w-5 h-5" />
        </button>

        {type === 'guest_limit' ? (
          /* ================= GUEST LIMIT VIEW ================= */
          <div className="relative z-10 flex flex-col items-center text-center space-y-5">
            <div className="w-14 h-14 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center shadow-inner">
              <Sparkles className="w-7 h-7" />
            </div>

            <div className="space-y-1.5">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-semibold tracking-wide uppercase bg-amber-500/10 text-amber-400 border border-amber-500/20">
                <Lock className="w-3 h-3" />
                1 Free Use Completed!
              </div>
              <h3 className="text-2xl font-bold tracking-tight text-white pt-1">
                Unlock 7 Days Free Trial
              </h3>
              <p className="text-xs sm:text-sm text-stone-400 max-w-sm mx-auto leading-relaxed">
                Sign in with Google or Email to unlock 7 full days of unlimited, private, and 100% offline conversions. No credit card required.
              </p>
            </div>

            {/* Benefit Highlights */}
            <div className="w-full bg-stone-800/60 border border-stone-700/60 rounded-2xl p-4 text-left space-y-2.5">
              {[
                'Full 7-Day Free Trial with unlimited conversions',
                'Unlock all PDF & Image tools (Merge, Split, Compress, Convert)',
                '100% local in-browser processing — files never leave your device',
                'No watermark, no artificial file size limits',
              ].map((benefit, i) => (
                <div key={i} className="flex items-center gap-2.5 text-xs text-stone-300">
                  <div className="w-4 h-4 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
                    <Check className="w-2.5 h-2.5" />
                  </div>
                  <span>{benefit}</span>
                </div>
              ))}
            </div>

            {/* CTA Button */}
            <button
              id="start-free-trial-btn"
              type="button"
              onClick={handleStartTrial}
              className="w-full py-3.5 px-6 rounded-2xl font-bold text-sm text-stone-950 bg-gradient-to-r from-emerald-400 via-teal-300 to-emerald-400 hover:opacity-95 active:scale-[0.99] transition-all shadow-lg shadow-emerald-500/20 flex items-center justify-center gap-2 cursor-pointer"
            >
              <Zap className="w-4 h-4 fill-stone-950" />
              <span>Start Free Trial - Sign In</span>
            </button>

            <p className="text-[11px] text-stone-500">
              Already have an account?{' '}
              <button
                type="button"
                onClick={handleStartTrial}
                className="text-emerald-400 hover:underline font-semibold cursor-pointer inline"
              >
                Sign in
              </button>{' '}
              to restore your trial or Pro tier.
            </p>
          </div>
        ) : (
          /* ================= TRIAL ENDED VIEW ================= */
          <div className="relative z-10 flex flex-col items-center text-center space-y-5">
            <div className="w-14 h-14 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center shadow-inner">
              <Crown className="w-7 h-7" />
            </div>

            <div className="space-y-1.5">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-semibold tracking-wide uppercase bg-amber-500/10 text-amber-400 border border-amber-500/20">
                <Crown className="w-3 h-3" />
                Trial Expired
              </div>
              <h3 className="text-2xl font-bold tracking-tight text-white pt-1">
                Your Free Trial Has Ended!
              </h3>
              <p className="text-xs sm:text-sm text-stone-400 max-w-sm mx-auto leading-relaxed">
                Upgrade to PixDoc Pro to continue enjoying unlimited offline PDF and Image processing without interruptions.
              </p>
            </div>

            {/* Plan Selector */}
            <div className="grid grid-cols-2 gap-3 w-full">
              {/* Monthly Plan */}
              <button
                type="button"
                onClick={() => setSelectedPlan('monthly')}
                className={`relative p-4 rounded-2xl border text-left transition-all cursor-pointer ${
                  selectedPlan === 'monthly'
                    ? 'bg-emerald-950/40 border-emerald-500 ring-2 ring-emerald-500/40'
                    : 'bg-stone-800/50 border-stone-700/80 hover:border-stone-600'
                }`}
              >
                <div className="text-xs font-semibold text-stone-300">Monthly Plan</div>
                <div className="mt-2 text-xl font-extrabold text-white">$9.99</div>
                <div className="text-[11px] text-stone-400">/ month</div>
              </button>

              {/* Annual Plan (Best Value) */}
              <button
                type="button"
                onClick={() => setSelectedPlan('annual')}
                className={`relative p-4 rounded-2xl border text-left transition-all cursor-pointer ${
                  selectedPlan === 'annual'
                    ? 'bg-emerald-950/40 border-emerald-500 ring-2 ring-emerald-500/40'
                    : 'bg-stone-800/50 border-stone-700/80 hover:border-stone-600'
                }`}
              >
                <span className="absolute -top-2.5 right-3 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500 text-stone-950 tracking-wider">
                  SAVE 50%
                </span>
                <div className="text-xs font-semibold text-stone-300">Annual Plan</div>
                <div className="mt-2 text-xl font-extrabold text-white">$59.99</div>
                <div className="text-[11px] text-stone-400">/ year ($4.99/mo)</div>
              </button>
            </div>

            {/* Feature Checklist */}
            <div className="w-full bg-stone-800/40 border border-stone-800 rounded-xl p-3.5 text-left space-y-2">
              {[
                'Unlimited PDF merging, splitting, and high-ratio compression',
                'Batch image conversion & lossless resizing',
                'Runs 100% offline — complete document privacy',
                'Priority support and future desktop build updates',
              ].map((feat, idx) => (
                <div key={idx} className="flex items-center gap-2 text-xs text-stone-300">
                  <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                  <span>{feat}</span>
                </div>
              ))}
            </div>

            {/* Upgrade Button */}
            <button
              id="upgrade-to-pro-btn"
              disabled={isProcessing}
              onClick={handleAction}
              className="w-full py-3.5 px-6 rounded-2xl font-bold text-sm text-stone-950 bg-gradient-to-r from-emerald-400 via-teal-300 to-emerald-400 hover:opacity-95 active:scale-[0.99] transition-all shadow-lg shadow-emerald-500/20 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              <Crown className="w-4 h-4 fill-stone-950" />
              <span>{isProcessing ? 'Activating Pro...' : `Upgrade to Pro (${selectedPlan === 'annual' ? '$59.99/yr' : '$9.99/mo'})`}</span>
            </button>

            <div className="flex items-center justify-center gap-1.5 text-[11px] text-stone-500">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
              <span>Guaranteed 30-Day Money Back Guarantee</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

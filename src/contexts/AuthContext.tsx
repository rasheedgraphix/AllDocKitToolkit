import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { onAuthStateChanged, User } from 'firebase/auth';
import {
  auth,
  loginWithGoogle as fbLoginWithGoogle,
  loginWithEmail as fbLoginWithEmail,
  registerWithEmail as fbRegisterWithEmail,
  logoutUser as fbLogoutUser,
  sendResetPassword as fbSendResetPassword,
  getFriendlyAuthErrorMessage,
  syncUserProfile,
  getUserProfile,
  upgradeUserToPro,
  UserProfileData,
} from '../lib/firebase';
import {
  checkConversionAccess,
  incrementGuestUsage,
  getGuestUsage,
  getTrialDaysLeft,
  isTrialActive as checkTrialActive,
} from '../lib/trial';
import { AuthModal } from '../components/AuthModal';
import { UpgradeModal } from '../components/UpgradeModal';

interface AuthContextValue {
  user: User | null;
  userProfile: UserProfileData | null;
  loading: boolean;
  isAuthModalOpen: boolean;
  trialDaysLeft: number;
  isTrialActive: boolean;
  isPro: boolean;
  guestUsage: number;
  openLoginModal: () => void;
  closeLoginModal: () => void;
  openUpgradeModal: (type: 'guest_limit' | 'trial_ended') => void;
  closeUpgradeModal: () => void;
  verifyAccessBeforeAction: () => Promise<boolean>;
  signInWithGoogle: () => Promise<void>;
  signInWithEmail: (email: string, pass: string) => Promise<void>;
  signUpWithEmail: (email: string, pass: string, name?: string) => Promise<void>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  refreshUserProfile: () => Promise<UserProfileData | null>;
  upgradePlan: (plan: string) => Promise<boolean>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [guestUsage, setGuestUsage] = useState<number>(() => getGuestUsage());

  // Listen to guest usage updates
  useEffect(() => {
    const handleUsageChange = () => {
      setGuestUsage(getGuestUsage());
    };
    window.addEventListener('pixdoc-guest-usage-updated', handleUsageChange);
    return () => window.removeEventListener('pixdoc-guest-usage-updated', handleUsageChange);
  }, []);

  // Modals state
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [upgradeModal, setUpgradeModal] = useState<{
    isOpen: boolean;
    type: 'guest_limit' | 'trial_ended';
  }>({
    isOpen: false,
    type: 'guest_limit',
  });

  const refreshUserProfile = useCallback(async (): Promise<UserProfileData | null> => {
    if (!auth.currentUser) {
      setUserProfile(null);
      return null;
    }
    const profile = await getUserProfile(auth.currentUser.uid);
    if (profile) {
      setUserProfile(profile);
    }
    return profile;
  }, []);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        const synced = await syncUserProfile(currentUser);
        setUserProfile(synced);
      } else {
        setUserProfile(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const openLoginModal = () => setIsAuthModalOpen(true);
  const closeLoginModal = () => setIsAuthModalOpen(false);

  const openUpgradeModal = (type: 'guest_limit' | 'trial_ended') => {
    setUpgradeModal({ isOpen: true, type });
  };
  const closeUpgradeModal = () => {
    setUpgradeModal((prev) => ({ ...prev, isOpen: false }));
  };

  const handleGuestTrialClick = () => {
    setUpgradeModal((prev) => ({ ...prev, isOpen: false }));
    setIsAuthModalOpen(true);
  };

  /**
   * Central gatekeeper function before converting/processing files.
   * - If guest (no login): allows 1st use, increments usage, returns true.
   *   On 2nd use: blocks and opens UpgradeModal('guest_limit').
   * - If logged-in: checks Firestore profile.
   *   If trial is ended and not Pro: blocks and opens UpgradeModal('trial_ended').
   *   If active trial or Pro: returns true.
   */
  const verifyAccessBeforeAction = async (): Promise<boolean> => {
    const activeUser = user || auth.currentUser;
    const result = await checkConversionAccess(activeUser);

    if (result.allowed) {
      if (result.isGuest) {
        const newUsage = incrementGuestUsage();
        setGuestUsage(newUsage);
      }
      return true;
    }

    if (result.reason === 'guest_limit') {
      openUpgradeModal('guest_limit');
      return false;
    }

    if (result.reason === 'trial_ended') {
      openUpgradeModal('trial_ended');
      return false;
    }

    openUpgradeModal(activeUser ? 'trial_ended' : 'guest_limit');
    return false;
  };

  const signInWithGoogle = async () => {
    try {
      const u = await fbLoginWithGoogle();
      const p = await getUserProfile(u.uid);
      setUserProfile(p);
    } catch (err) {
      throw new Error(getFriendlyAuthErrorMessage(err));
    }
  };

  const signInWithEmail = async (email: string, pass: string) => {
    try {
      const u = await fbLoginWithEmail(email, pass);
      const p = await getUserProfile(u.uid);
      setUserProfile(p);
    } catch (err) {
      throw new Error(getFriendlyAuthErrorMessage(err));
    }
  };

  const signUpWithEmail = async (email: string, pass: string, name?: string) => {
    try {
      const u = await fbRegisterWithEmail(email, pass, name);
      const p = await getUserProfile(u.uid);
      setUserProfile(p);
    } catch (err) {
      throw new Error(getFriendlyAuthErrorMessage(err));
    }
  };

  const signOut = async () => {
    try {
      await fbLogoutUser();
      setUserProfile(null);
    } catch (err) {
      throw new Error(getFriendlyAuthErrorMessage(err));
    }
  };

  const resetPassword = async (email: string) => {
    try {
      await fbSendResetPassword(email);
    } catch (err) {
      throw new Error(getFriendlyAuthErrorMessage(err));
    }
  };

  const upgradePlan = async (plan: string): Promise<boolean> => {
    if (!user) {
      openLoginModal();
      return false;
    }
    const success = await upgradeUserToPro(user.uid, plan);
    if (success) {
      setUserProfile((prev) =>
        prev
          ? {
              ...prev,
              subscription: 'pro',
              plan,
            }
          : null
      );
      closeUpgradeModal();
    }
    return success;
  };

  const isPro = userProfile?.subscription === 'pro';
  const isTrialActive = Boolean(
    user && !isPro && checkTrialActive(userProfile?.trialStart)
  );
  const trialDaysLeft = user ? getTrialDaysLeft(userProfile?.trialStart) : 0;

  return (
    <AuthContext.Provider
      value={{
        user,
        userProfile,
        loading,
        isAuthModalOpen,
        trialDaysLeft,
        isTrialActive,
        isPro,
        guestUsage,
        openLoginModal,
        closeLoginModal,
        openUpgradeModal,
        closeUpgradeModal,
        verifyAccessBeforeAction,
        signInWithGoogle,
        signInWithEmail,
        signUpWithEmail,
        signOut,
        resetPassword,
        refreshUserProfile,
        upgradePlan,
      }}
    >
      {children}

      {/* Global Auth Modal */}
      <AuthModal isOpen={isAuthModalOpen} onClose={closeLoginModal} />

      {/* Global Freemium Upgrade Modal */}
      <UpgradeModal
        isOpen={upgradeModal.isOpen}
        type={upgradeModal.type}
        onClose={closeUpgradeModal}
        onStartTrial={handleGuestTrialClick}
        onSignIn={handleGuestTrialClick}
        openLoginModal={openLoginModal}
        onUpgrade={async (plan) => {
          await upgradePlan(plan);
        }}
      />
    </AuthContext.Provider>
  );
};

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

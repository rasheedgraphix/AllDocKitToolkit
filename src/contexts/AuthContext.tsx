import React, { createContext, useContext, useEffect, useState } from 'react';
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
} from '../lib/firebase';

interface AuthContextValue {
  user: User | null;
  loading: boolean;
  signInWithGoogle: () => Promise<void>;
  signInWithEmail: (email: string, pass: string) => Promise<void>;
  signUpWithEmail: (email: string, pass: string, name?: string) => Promise<void>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        await syncUserProfile(currentUser);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const signInWithGoogle = async () => {
    try {
      await fbLoginWithGoogle();
    } catch (err) {
      throw new Error(getFriendlyAuthErrorMessage(err));
    }
  };

  const signInWithEmail = async (email: string, pass: string) => {
    try {
      await fbLoginWithEmail(email, pass);
    } catch (err) {
      throw new Error(getFriendlyAuthErrorMessage(err));
    }
  };

  const signUpWithEmail = async (email: string, pass: string, name?: string) => {
    try {
      await fbRegisterWithEmail(email, pass, name);
    } catch (err) {
      throw new Error(getFriendlyAuthErrorMessage(err));
    }
  };

  const signOut = async () => {
    try {
      await fbLogoutUser();
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

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        signInWithGoogle,
        signInWithEmail,
        signUpWithEmail,
        signOut,
        resetPassword,
      }}
    >
      {children}
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

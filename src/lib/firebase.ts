import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, signInWithPopup, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut, sendPasswordResetEmail, updateProfile } from 'firebase/auth';
import { getFirestore, doc, setDoc, getDoc, serverTimestamp } from 'firebase/firestore';

export const firebaseConfig = {
  apiKey: "AIzaSyDzlvAOoql_L5hwAfvSOM2uHa0EzSPazeA",
  authDomain: "pixdoc-e0282.firebaseapp.com",
  projectId: "pixdoc-e0282",
  storageBucket: "pixdoc-e0282.firebasestorage.app",
  messagingSenderId: "201805765652",
  appId: "1:201805765652:web:5837d0af783021fd49db01",
  measurementId: "G-LTR6RKE695"
};

export const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
export const auth = getAuth(app);
export const db = getFirestore(app);
export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: 'select_account' });

export function getFriendlyAuthErrorMessage(error: any): string {
  const code = error?.code || "";
  if (code.includes("auth/invalid-email")) return "Invalid email address.";
  if (code.includes("auth/user-not-found") || code.includes("auth/wrong-password") || code.includes("auth/invalid-credential")) return "Wrong email or password.";
  if (code.includes("auth/email-already-in-use")) return "This email is already registered.";
  if (code.includes("auth/weak-password")) return "Password should be at least 6 characters.";
  if (code.includes("auth/unauthorized-domain")) return "Domain not authorized.";
  if (code.includes("auth/api-key-not-valid")) return "API Key invalid.";
  if (code.includes("auth/popup-closed-by-user")) return "Popup closed. Please try again.";
  return error?.message || "Something went wrong. Please try again.";
}

export async function syncUserProfile(user: any) {
  try {
    const userRef = doc(db, 'users', user.uid);
    const snap = await getDoc(userRef);
    if (!snap.exists()) {
      await setDoc(userRef, { id: user.uid, email: user.email || '', displayName: user.displayName || 'User', photoURL: user.photoURL || '', createdAt: serverTimestamp(), lastLoginAt: serverTimestamp() });
    } else {
      await setDoc(userRef, { lastLoginAt: serverTimestamp() }, { merge: true });
    }
  } catch (e) { console.warn(e); }
}
export async function loginWithGoogle() {
  const result = await signInWithPopup(auth, googleProvider);
  await syncUserProfile(result.user);
  return result.user;
}
export async function loginWithEmail(email: string, pass: string) {
  const credential = await signInWithEmailAndPassword(auth, email.trim(), pass);
  await syncUserProfile(credential.user);
  return credential.user;
}
export async function registerWithEmail(email: string, pass: string, displayName?: string) {
  const credential = await createUserWithEmailAndPassword(auth, email.trim(), pass);
  if (displayName?.trim()) { await updateProfile(credential.user, { displayName: displayName.trim() }); }
  await syncUserProfile(credential.user);
  return credential.user;
}
export async function logoutUser() { await signOut(auth); }
export async function sendResetPassword(email: string) { await sendPasswordResetEmail(auth, email.trim()); }

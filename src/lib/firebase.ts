import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, signInWithPopup, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut, sendPasswordResetEmail, updateProfile } from 'firebase/auth';
import { getFirestore, doc, setDoc, getDoc, serverTimestamp } from 'firebase/firestore';

export const firebaseConfig = {
  apiKey: "AIzaSyDqLAvQ2L_l5wAFh5Q2AHe5FP2aA",
  authDomain: "pixdoc-e0282.firebaseapp.com",
  projectId: "pixdoc-e0282",
  storageBucket: "pixdoc-e0282.firebasestorage.app",
  messagingSenderId: "281385766552",
  appId: "1:281385766552:web:5837b0a7f83021649b8b11",
  measurementId: "G-THUK36TGFS"
};

export const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
export const auth = getAuth(app);
export const db = getFirestore(app);
export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: 'select_account' });

export async function syncUserProfile(user) {
  const userRef = doc(db, 'users', user.uid);
  const snap = await getDoc(userRef);
  if (!snap.exists()) {
    await setDoc(userRef, { id: user.uid, email: user.email || '', displayName: user.displayName || 'User', photoURL: user.photoURL || '', createdAt: serverTimestamp(), lastLoginAt: serverTimestamp() });
  } else {
    await setDoc(userRef, { lastLoginAt: serverTimestamp() }, { merge: true });
  }
}
export async function loginWithGoogle() {
  const result = await signInWithPopup(auth, googleProvider);
  await syncUserProfile(result.user);
  return result.user;
}
export async function loginWithEmail(email, pass) {
  const credential = await signInWithEmailAndPassword(auth, email.trim(), pass);
  await syncUserProfile(credential.user);
  return credential.user;
}
export async function registerWithEmail(email, pass, displayName) {
  const credential = await createUserWithEmailAndPassword(auth, email.trim(), pass);
  if (displayName?.trim()) { await updateProfile(credential.user, { displayName: displayName.trim() }); }
  await syncUserProfile(credential.user);
  return credential.user;
}
export async function logoutUser() { await signOut(auth); }
export async function sendResetPassword(email) { await sendPasswordResetEmail(auth, email.trim()); }

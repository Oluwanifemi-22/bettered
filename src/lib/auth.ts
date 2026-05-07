import {
  GoogleAuthProvider,
  signInWithPopup,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  User,
} from "firebase/auth";
import { auth } from "./firebase";

const provider = new GoogleAuthProvider();

// Signs in via Google popup, then enforces .edu gate
export async function signInWithGoogle(): Promise<User> {
  const result = await signInWithPopup(auth, provider);
  const user = result.user;

  if (!user.email?.endsWith(".edu")) {
    await firebaseSignOut(auth); // sign out immediately so session isn't created
    throw new Error("Only .edu email addresses are allowed.");
  }

  return user;
}

export async function signOut(): Promise<void> {
  await firebaseSignOut(auth);
}

// Returns an unsubscribe function — call it on component unmount
export function onAuthChange(callback: (user: User | null) => void): () => void {
  return onAuthStateChanged(auth, callback);
}

import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  arrayUnion,
} from "firebase/firestore";
import { db } from "./firebase";

function userDoc(uid: string) {
  return doc(db, "users", uid);
}

// Uses setDoc with merge so re-running on existing users is a no-op
export async function createUserProfile(uid: string, email: string, displayName: string) {
  await setDoc(
    userDoc(uid),
    { uid, email, displayName, school: email.split("@")[1], classes: [] },
    { merge: true }
  );
}

export async function getUserProfile(uid: string) {
  const snap = await getDoc(userDoc(uid));
  return snap.exists() ? { id: snap.id, ...snap.data() } : null;
}

export async function addCourseToUser(uid: string, courseId: string) {
  await updateDoc(userDoc(uid), { classes: arrayUnion(courseId) });
}

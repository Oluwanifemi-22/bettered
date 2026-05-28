import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  arrayUnion,
  arrayRemove,
  increment,
} from "firebase/firestore";
import { db } from "./firebase";

function userDoc(uid: string) {
  return doc(db, "users", uid);
}

export interface UserClass {
  courseId: string;
  role: "student" | "helper";
}

// Only creates the document if it doesn't already exist — never overwrites existing data
export async function createUserProfile(uid: string, email: string, displayName: string) {
  const ref = userDoc(uid);
  const snap = await getDoc(ref);
  if (!snap.exists()) {
    await setDoc(ref, { uid, email, displayName, school: email.split("@")[1], classes: [] });
  }
}

export async function getUserProfile(uid: string) {
  const snap = await getDoc(userDoc(uid));
  return snap.exists() ? { id: snap.id, ...snap.data() } : null;
}

export async function addCourseToUser(uid: string, courseId: string, role: "student" | "helper" = "student") {
  const userClass: UserClass = { courseId, role };
  await updateDoc(userDoc(uid), { 
    classes: arrayUnion(userClass)
  });
}

export async function removeCourseFromUser(uid: string, courseId: string) {
  const userRef = userDoc(uid);
  const snap = await getDoc(userRef);

  if (snap.exists()) {
    const currentClasses = snap.data().classes || [];
    const updatedClasses = currentClasses.filter((c: UserClass) => c.courseId !== courseId);
    await updateDoc(userRef, { classes: updatedClasses });
  }
}

export async function updateReputation(uid: string, courseTag: string, delta: number) {
  if (delta === 0) return;
  await updateDoc(userDoc(uid), {
    [`reputation.${courseTag}`]: increment(delta),
  });
}
import {
  collection,
  addDoc,
  updateDoc,
  doc,
  getDocs,
  query,
  where,
  arrayUnion,
  onSnapshot,
  Timestamp,
} from "firebase/firestore";
import { db } from "./firebase";

const sessionsRef = collection(db, "sessions");

export async function createSession(
  uid: string,
  courseTag: string,
  location: string,
  workDescription: string,
  expiresAt: Date
) {
  return addDoc(sessionsRef, {
    createdBy: uid,
    courseTag,
    location,
    workDescription,
    createdAt: Timestamp.now(),
    expiresAt: Timestamp.fromDate(expiresAt),
    status: "active",
    joinedBy: [],
  });
}

export async function joinSession(sessionId: string, uid: string) {
  await updateDoc(doc(db, "sessions", sessionId), {
    joinedBy: arrayUnion(uid),
  });
}

export async function getActiveSessions() {
  const snap = await getDocs(query(sessionsRef, where("status", "==", "active")));
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

export async function expireSession(sessionId: string) {
  await updateDoc(doc(db, "sessions", sessionId), { status: "expired" });
}

// Returns an unsubscribe function — call it on component unmount
export function listenToActiveSessions(callback: (sessions: { id: string; [key: string]: unknown }[]) => void) {
  const q = query(sessionsRef, where("status", "==", "active"));
  return onSnapshot(q, (snap) => {
    callback(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
  });
}

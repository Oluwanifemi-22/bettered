import {
  collection,
  addDoc,
  updateDoc,
  doc,
  getDocs,
  query,
  where,
  arrayUnion,
  arrayRemove,
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
  expiresAt: Date,
  visibility: "public" | "private" = "public"
) {
  return addDoc(sessionsRef, {
    createdBy: uid,
    courseTag,
    location,
    workDescription,
    visibility,
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

export async function leaveSession(sessionId: string, uid: string) {
  await updateDoc(doc(db, "sessions", sessionId), {
    joinedBy: arrayRemove(uid),
  });
}

export async function expireSession(sessionId: string) {
  await updateDoc(doc(db, "sessions", sessionId), { status: "expired" });
}

// Returns an unsubscribe function — call it on component unmount
export function listenToActiveSessions(callback: (sessions: { id: string; [key: string]: unknown }[]) => void) {
  const q = query(sessionsRef, where("status", "==", "active"));
  return onSnapshot(q, (snap) => {
    const now = Timestamp.now();
    const active: { id: string; [key: string]: unknown }[] = [];

    snap.docs.forEach((d) => {
      const data = d.data();
      if ((data.expiresAt as Timestamp).toMillis() <= now.toMillis()) {
        // Fire-and-forget: write the expired status back so future queries skip it
        expireSession(d.id);
      } else {
        active.push({ id: d.id, ...data });
      }
    });

    callback(active);
  });
}

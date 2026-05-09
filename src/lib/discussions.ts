import {
  collection,
  addDoc,
  getDoc,
  getDocs,
  updateDoc,
  doc,
  query,
  where,
  arrayUnion,
  onSnapshot,
  Timestamp,
} from "firebase/firestore";
import { db } from "./firebase";

const discussionsRef = collection(db, "discussions");

export async function createDiscussion(
  uid: string,
  courseTag: string,
  title: string,
  body: string
): Promise<string> {
  const ref = await addDoc(discussionsRef, {
    createdBy: uid,
    courseTag,
    title,
    body,
    createdAt: Timestamp.now(),
    replies: [],
  });
  return ref.id;
}

export async function getDiscussionsByClass(courseTag: string) {
  const snap = await getDocs(query(discussionsRef, where("courseTag", "==", courseTag)));
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

export async function replyToDiscussion(discussionId: string, uid: string, replyText: string) {
  await updateDoc(doc(db, "discussions", discussionId), {
    replies: arrayUnion({ uid, text: replyText, timestamp: Timestamp.now() }),
  });
}

// Returns an unsubscribe function — call it on component unmount
export function listenToDiscussions(
  courseTag: string,
  callback: (discussions: { id: string; [key: string]: unknown }[]) => void
) {
  const q = query(discussionsRef, where("courseTag", "==", courseTag));
  return onSnapshot(q, (snap) => {
    callback(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
  });
}

export async function getDiscussionDetail(discussionId: string) {
  const snap = await getDoc(doc(db, "discussions", discussionId));
  return snap.exists() ? { id: snap.id, ...snap.data() } : null;
}

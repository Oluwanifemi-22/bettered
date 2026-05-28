import {
  collection,
  addDoc,
  getDoc,
  getDocs,
  updateDoc,
  deleteDoc,
  doc,
  query,
  where,
  orderBy,
  arrayUnion,
  onSnapshot,
  Timestamp,
} from "firebase/firestore";
import { db } from "./firebase";
import { updateReputation } from "./users";

const discussionsRef = collection(db, "discussions");

export interface Reply {
  id: string;
  uid: string;
  displayName?: string;
  text: string;
  timestamp: Timestamp;
  parentId?: string;
  upvotes: string[];
  downvotes: string[];
}

export interface Discussion {
  id: string;
  createdBy: string;
  courseTag: string;
  title: string;
  body: string;
  type?: string;
  visibility: "public" | "private";
  createdAt: Timestamp;
  upvotes: string[];
  downvotes: string[];
  replies: Reply[];
}

export async function createDiscussion(
  uid: string,
  courseTag: string,
  title: string,
  body: string,
  visibility: "public" | "private" = "public"
): Promise<string> {
  const ref = await addDoc(discussionsRef, {
    createdBy: uid,
    courseTag,
    title,
    body,
    visibility,
    createdAt: Timestamp.now(),
    upvotes: [],
    downvotes: [],
    replies: [],
  });
  return ref.id;
}

export async function getDiscussionsByClass(courseTag: string) {
  const snap = await getDocs(query(discussionsRef, where("courseTag", "==", courseTag)));
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

export async function replyToDiscussion(
  discussionId: string,
  uid: string,
  displayName: string,
  replyText: string,
  parentId?: string
) {
  const reply: Reply = {
    id: crypto.randomUUID(),
    uid,
    displayName,
    text: replyText,
    timestamp: Timestamp.now(),
    upvotes: [],
    downvotes: [],
    ...(parentId ? { parentId } : {}),
  };
  await updateDoc(doc(db, "discussions", discussionId), {
    replies: arrayUnion(reply),
  });
}

export async function voteOnDiscussion(discussionId: string, uid: string, vote: "up" | "down") {
  const ref = doc(db, "discussions", discussionId);
  const snap = await getDoc(ref);
  if (!snap.exists()) return;
  const data = snap.data();
  const upvotes: string[] = data.upvotes ?? [];
  const downvotes: string[] = data.downvotes ?? [];
  const authorUid: string = data.createdBy;
  const courseTag: string = data.courseTag;

  let repDelta = 0;
  if (vote === "up") {
    repDelta = upvotes.includes(uid) ? -1 : 1;
    await updateDoc(ref, {
      upvotes: upvotes.includes(uid) ? upvotes.filter((u) => u !== uid) : [...upvotes, uid],
      downvotes: downvotes.filter((u) => u !== uid),
    });
  } else {
    repDelta = upvotes.includes(uid) ? -1 : 0;
    await updateDoc(ref, {
      downvotes: downvotes.includes(uid) ? downvotes.filter((u) => u !== uid) : [...downvotes, uid],
      upvotes: upvotes.filter((u) => u !== uid),
    });
  }

  if (uid !== authorUid) await updateReputation(authorUid, courseTag, repDelta);
}

export async function voteOnReply(discussionId: string, replyId: string, uid: string, vote: "up" | "down") {
  const ref = doc(db, "discussions", discussionId);
  const snap = await getDoc(ref);
  if (!snap.exists()) return;
  const replies: Reply[] = snap.data().replies ?? [];
  const courseTag: string = snap.data().courseTag;

  let authorUid = "";
  let repDelta = 0;

  const updated = replies.map((r) => {
    if (r.id !== replyId) return r;
    authorUid = r.uid;
    const upvotes = r.upvotes ?? [];
    const downvotes = r.downvotes ?? [];
    if (vote === "up") {
      repDelta = upvotes.includes(uid) ? -1 : 1;
      return {
        ...r,
        upvotes: upvotes.includes(uid) ? upvotes.filter((u) => u !== uid) : [...upvotes, uid],
        downvotes: downvotes.filter((u) => u !== uid),
      };
    } else {
      repDelta = upvotes.includes(uid) ? -1 : 0;
      return {
        ...r,
        downvotes: downvotes.includes(uid) ? downvotes.filter((u) => u !== uid) : [...downvotes, uid],
        upvotes: upvotes.filter((u) => u !== uid),
      };
    }
  });

  await updateDoc(ref, { replies: updated });
  if (authorUid && uid !== authorUid) await updateReputation(authorUid, courseTag, repDelta);
}

export async function deleteDiscussion(discussionId: string) {
  await deleteDoc(doc(db, "discussions", discussionId));
}

export async function deleteReply(discussionId: string, replyId: string) {
  const ref = doc(db, "discussions", discussionId);
  const snap = await getDoc(ref);
  if (!snap.exists()) return;
  const replies: Reply[] = snap.data().replies ?? [];
  await updateDoc(ref, { replies: replies.filter((r) => r.id !== replyId) });
}

export async function getDiscussionDetail(discussionId: string) {
  const snap = await getDoc(doc(db, "discussions", discussionId));
  return snap.exists() ? { id: snap.id, ...snap.data() } : null;
}

export function listenToDiscussion(discussionId: string, callback: (discussion: Discussion | null) => void) {
  return onSnapshot(doc(db, "discussions", discussionId), (snap) => {
    callback(snap.exists() ? ({ id: snap.id, ...snap.data() } as Discussion) : null);
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

export function listenToAllDiscussions(callback: (discussions: Discussion[]) => void) {
  const q = query(discussionsRef, orderBy("createdAt", "desc"));
  return onSnapshot(q, (snap) => {
    callback(snap.docs.map((d) => ({ id: d.id, ...d.data() } as Discussion)));
  });
}

import {
  collection,
  addDoc,
  deleteDoc,
  getDocs,
  query,
  where,
  onSnapshot,
  Timestamp,
} from "firebase/firestore";
import { db } from "./firebase";

const activityRef = collection(db, "activity");

export type ActivityType =
  | "created_session"
  | "joined_session"
  | "posted_discussion"
  | "replied_discussion"
  | "created_group"
  | "joined_group";

export interface ActivityEvent {
  id: string;
  uid: string;
  displayName: string;
  type: ActivityType;
  courseTag?: string;
  sourceId?: string;
  createdAt: Timestamp;
}

export function activityText(event: ActivityEvent): string {
  const course = event.courseTag ? ` in ${event.courseTag}` : "";
  switch (event.type) {
    case "created_session":   return `started a study session${course}`;
    case "joined_session":    return `joined a study session${course}`;
    case "posted_discussion": return `posted a discussion${course}`;
    case "replied_discussion":return `replied to a discussion${course}`;
    case "created_group":     return `created a study group${course}`;
    case "joined_group":      return `joined a study group${course}`;
  }
}

export async function writeActivity(
  uid: string,
  displayName: string,
  type: ActivityType,
  courseTag?: string,
  sourceId?: string
) {
  await addDoc(activityRef, {
    uid,
    displayName,
    type,
    courseTag: courseTag ?? null,
    sourceId: sourceId ?? null,
    createdAt: Timestamp.now(),
  });
}

export async function deleteActivityForSource(sourceId: string) {
  const snap = await getDocs(query(activityRef, where("sourceId", "==", sourceId)));
  await Promise.all(snap.docs.map((d) => deleteDoc(d.ref)));
}

export function listenToFriendsActivity(
  friendUids: string[],
  callback: (events: ActivityEvent[]) => void
): () => void {
  if (friendUids.length === 0) {
    callback([]);
    return () => {};
  }
  const q = query(activityRef, where("uid", "in", friendUids.slice(0, 30)));
  return onSnapshot(q, (snap) => {
    const events = snap.docs
      .map((d) => ({ id: d.id, ...d.data() } as ActivityEvent))
      .sort((a, b) => b.createdAt.toMillis() - a.createdAt.toMillis())
      .slice(0, 30);
    callback(events);
  });
}

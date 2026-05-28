import {
  collection,
  addDoc,
  getDocs,
  query,
  orderBy,
  onSnapshot,
  Timestamp,
} from "firebase/firestore";
import { db } from "./firebase";

const analyticsRef = collection(db, "analytics");

export type AnalyticsEventType =
  | "page_view"
  | "upvote"
  | "downvote"
  | "session_create"
  | "session_join"
  | "discussion_create"
  | "reply_post"
  | "group_create"
  | "group_join"
  | "message_sent";

export interface AnalyticsEvent {
  id: string;
  uid: string;
  displayName: string;
  event: AnalyticsEventType;
  metadata?: Record<string, string>;
  createdAt: Timestamp;
}

export async function trackEvent(
  uid: string,
  displayName: string,
  event: AnalyticsEventType,
  metadata?: Record<string, string>
) {
  await addDoc(analyticsRef, {
    uid,
    displayName,
    event,
    metadata: metadata ?? {},
    createdAt: Timestamp.now(),
  });
}

export function listenToRecentEvents(callback: (events: AnalyticsEvent[]) => void) {
  const q = query(analyticsRef, orderBy("createdAt", "desc"));
  return onSnapshot(q, (snap) => {
    callback(snap.docs.map((d) => ({ id: d.id, ...d.data() } as AnalyticsEvent)));
  });
}

export async function getAnalyticsSummary() {
  const snap = await getDocs(analyticsRef);
  const events = snap.docs.map((d) => d.data() as Omit<AnalyticsEvent, "id">);

  const byType: Record<string, number> = {};
  const byUser: Record<string, { displayName: string; count: number }> = {};

  for (const e of events) {
    byType[e.event] = (byType[e.event] ?? 0) + 1;
    if (!byUser[e.uid]) byUser[e.uid] = { displayName: e.displayName, count: 0 };
    byUser[e.uid].count++;
  }

  const topUsers = Object.entries(byUser)
    .map(([uid, v]) => ({ uid, ...v }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);

  return { byType, topUsers, total: events.length };
}

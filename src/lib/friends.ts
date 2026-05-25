import {
  collection,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  getDocs,
  onSnapshot,
  Timestamp,
} from "firebase/firestore";
import { db } from "./firebase";

const friendshipsRef = collection(db, "friendships");
const usersRef = collection(db, "users");

export interface Friendship {
  id: string;
  users: [string, string];
  from: string;
  status: "pending" | "accepted";
  createdAt: Timestamp;
}

export interface UserSummary {
  id: string;
  uid: string;
  displayName?: string;
  email?: string;
  school?: string;
}

export async function getAllUsers(currentUid: string): Promise<UserSummary[]> {
  const snap = await getDocs(usersRef);
  return snap.docs
    .map((d) => ({ id: d.id, ...d.data() } as UserSummary))
    .filter((u) => u.id !== currentUid);
}

export async function sendFriendRequest(fromUid: string, toUid: string): Promise<string> {
  const ref = await addDoc(friendshipsRef, {
    users: [fromUid, toUid].sort(),
    from: fromUid,
    status: "pending",
    createdAt: Timestamp.now(),
  });
  return ref.id;
}

export async function acceptFriendRequest(friendshipId: string): Promise<void> {
  await updateDoc(doc(db, "friendships", friendshipId), { status: "accepted" });
}

export async function declineFriendRequest(friendshipId: string): Promise<void> {
  await deleteDoc(doc(db, "friendships", friendshipId));
}

export async function cancelFriendRequest(friendshipId: string): Promise<void> {
  await deleteDoc(doc(db, "friendships", friendshipId));
}

export async function removeFriend(friendshipId: string): Promise<void> {
  await deleteDoc(doc(db, "friendships", friendshipId));
}

export function listenToFriendships(uid: string, callback: (friendships: Friendship[]) => void) {
  const q = query(friendshipsRef, where("users", "array-contains", uid));
  return onSnapshot(q, (snap) => {
    callback(snap.docs.map((d) => ({ id: d.id, ...d.data() } as Friendship)));
  });
}

export async function getUsersByIds(uids: string[]): Promise<UserSummary[]> {
  if (!uids.length) return [];
  const snap = await getDocs(query(usersRef, where("uid", "in", uids.slice(0, 30))));
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as UserSummary));
}

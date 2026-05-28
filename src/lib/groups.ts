import {
  collection,
  addDoc,
  getDoc,
  deleteDoc,
  updateDoc,
  doc,
  query,
  where,
  orderBy,
  arrayUnion,
  arrayRemove,
  onSnapshot,
  Timestamp,
} from "firebase/firestore";
import { db } from "./firebase";

const groupsRef = collection(db, "groups");

export interface Group {
  id: string;
  name: string;
  courseTag: string;
  description: string;
  createdBy: string;
  members: string[];
  visibility: "public" | "private";
  createdAt: Timestamp;
}

export interface GroupMessage {
  id: string;
  uid: string;
  displayName: string;
  text: string;
  replyTo?: { messageId: string; text: string; displayName: string } | null;
  reactions: { [emoji: string]: string[] };
  createdAt: Timestamp;
}

export async function createGroup(
  uid: string,
  name: string,
  courseTag: string,
  description: string,
  visibility: "public" | "private" = "public"
): Promise<string> {
  const ref = await addDoc(groupsRef, {
    name,
    courseTag,
    description,
    createdBy: uid,
    members: [uid],
    visibility,
    createdAt: Timestamp.now(),
  });
  return ref.id;
}

export function listenToPublicGroups(callback: (groups: Group[]) => void) {
  const q = query(groupsRef, where("visibility", "==", "public"));
  return onSnapshot(q, (snap) => {
    callback(snap.docs.map((d) => ({ id: d.id, ...d.data() } as Group)));
  });
}

export async function joinGroup(groupId: string, uid: string) {
  await updateDoc(doc(db, "groups", groupId), { members: arrayUnion(uid) });
}

export async function getGroup(groupId: string): Promise<Group | null> {
  const snap = await getDoc(doc(db, "groups", groupId));
  return snap.exists() ? ({ id: snap.id, ...snap.data() } as Group) : null;
}

export function listenToUserGroups(uid: string, callback: (groups: Group[]) => void) {
  const q = query(groupsRef, where("members", "array-contains", uid));
  return onSnapshot(q, (snap) => {
    callback(snap.docs.map((d) => ({ id: d.id, ...d.data() } as Group)));
  });
}

export function listenToGroup(groupId: string, callback: (group: Group | null) => void) {
  return onSnapshot(doc(db, "groups", groupId), (snap) => {
    callback(snap.exists() ? ({ id: snap.id, ...snap.data() } as Group) : null);
  });
}

export function listenToGroupMessages(groupId: string, callback: (messages: GroupMessage[]) => void) {
  const q = query(
    collection(db, "groups", groupId, "messages"),
    orderBy("createdAt", "asc")
  );
  return onSnapshot(q, (snap) => {
    callback(snap.docs.map((d) => ({ id: d.id, ...d.data() } as GroupMessage)));
  });
}

export async function sendGroupMessage(
  groupId: string,
  uid: string,
  displayName: string,
  text: string,
  replyTo?: { messageId: string; text: string; displayName: string }
) {
  await addDoc(collection(db, "groups", groupId, "messages"), {
    uid,
    displayName,
    text,
    replyTo: replyTo ?? null,
    reactions: {},
    createdAt: Timestamp.now(),
  });
}

export async function reactToMessage(
  groupId: string,
  messageId: string,
  uid: string,
  emoji: string,
  hasReacted: boolean
) {
  await updateDoc(doc(db, "groups", groupId, "messages", messageId), {
    [`reactions.${emoji}`]: hasReacted ? arrayRemove(uid) : arrayUnion(uid),
  });
}

export async function inviteToGroup(groupId: string, uid: string) {
  await updateDoc(doc(db, "groups", groupId), { members: arrayUnion(uid) });
}

export interface GroupInvite {
  id: string;
  groupId: string;
  groupName: string;
  courseTag: string;
  fromUid: string;
  toUid: string;
  createdAt: Timestamp;
}

const groupInvitesRef = collection(db, "groupInvites");

export async function sendGroupInvite(
  groupId: string,
  groupName: string,
  courseTag: string,
  fromUid: string,
  toUid: string
) {
  await addDoc(groupInvitesRef, {
    groupId,
    groupName,
    courseTag,
    fromUid,
    toUid,
    createdAt: Timestamp.now(),
  });
}

export async function acceptGroupInvite(inviteId: string, groupId: string, toUid: string) {
  await updateDoc(doc(db, "groups", groupId), { members: arrayUnion(toUid) });
  await deleteDoc(doc(db, "groupInvites", inviteId));
}

export async function declineGroupInvite(inviteId: string) {
  await deleteDoc(doc(db, "groupInvites", inviteId));
}

export function listenToGroupInvites(uid: string, callback: (invites: GroupInvite[]) => void) {
  const q = query(groupInvitesRef, where("toUid", "==", uid));
  return onSnapshot(q, (snap) => {
    callback(snap.docs.map((d) => ({ id: d.id, ...d.data() } as GroupInvite)));
  });
}

export async function leaveGroup(groupId: string, uid: string) {
  await updateDoc(doc(db, "groups", groupId), { members: arrayRemove(uid) });
}

export async function removeMemberFromGroup(groupId: string, uid: string) {
  await updateDoc(doc(db, "groups", groupId), { members: arrayRemove(uid) });
}

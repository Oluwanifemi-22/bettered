"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { User } from "firebase/auth";
import { Timestamp } from "firebase/firestore";
import { onAuthChange } from "@/src/lib/auth";
import {
    Group,
    GroupMessage,
    listenToGroup,
    listenToGroupMessages,
    sendGroupMessage,
    sendGroupInvite,
    leaveGroup,
    removeMemberFromGroup,
    reactToMessage,
} from "@/src/lib/groups";
import { listenToFriendships, getUsersByIds, UserSummary } from "@/src/lib/friends";
import { trackEvent } from "@/src/lib/analytics";

const EMOJIS = ["❤️", "😂", "👍", "😮", "😢", "🔥"];

function timeAgo(ts: Timestamp): string {
    const seconds = Math.floor((Date.now() - ts.toMillis()) / 1000);
    if (seconds < 60) return `${seconds}s ago`;
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    return `${Math.floor(hours / 24)}d ago`;
}

function Avatar({ name, size = "sm" }: { name: string; size?: "sm" | "md" }) {
    const sz = size === "sm" ? "h-7 w-7 text-xs" : "h-9 w-9 text-sm";
    return (
        <div className={`${sz} shrink-0 rounded-full bg-[#f3e7e7] flex items-center justify-center font-bold text-[#8C1515]`}>
            {name[0].toUpperCase()}
        </div>
    );
}

export default function GroupDetailPage() {
    const router = useRouter();
    const params = useParams();
    const groupId = params.id as string;

    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);
    const [group, setGroup] = useState<Group | null>(null);
    const [messages, setMessages] = useState<GroupMessage[]>([]);
    const [messageText, setMessageText] = useState("");
    const [sending, setSending] = useState(false);
    const [replyingTo, setReplyingTo] = useState<GroupMessage | null>(null);
    const [hoveredId, setHoveredId] = useState<string | null>(null);
    const [friendUids, setFriendUids] = useState<string[]>([]);
    const [friends, setFriends] = useState<UserSummary[]>([]);
    const [members, setMembers] = useState<UserSummary[]>([]);
    const [inviting, setInviting] = useState<string | null>(null);
    const [showInvite, setShowInvite] = useState(false);
    const [confirmLeave, setConfirmLeave] = useState(false);
    const bottomRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        const unsubAuth = onAuthChange((currentUser) => {
            if (!currentUser) { router.push("/"); return; }
            setUser(currentUser);
            setLoading(false);
            listenToFriendships(currentUser.uid, (fs) => {
                const accepted = fs
                    .filter((f) => f.status === "accepted")
                    .flatMap((f) => f.users)
                    .filter((uid) => uid !== currentUser.uid);
                setFriendUids([...new Set(accepted)]);
            });
        });
        return () => unsubAuth();
    }, [router]);

    useEffect(() => {
        if (!groupId) return;
        const unsubGroup = listenToGroup(groupId, (g) => {
            if (!g) { router.push("/groups"); return; }
            setGroup(g);
        });
        const unsubMessages = listenToGroupMessages(groupId, (msgs) => {
            setMessages(msgs);
            setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: "smooth" }), 50);
        });
        return () => { unsubGroup(); unsubMessages(); };
    }, [groupId, router]);

    useEffect(() => {
        if (!group || group.members.length === 0) return;
        getUsersByIds(group.members).then(setMembers);
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [group?.members.join(",")]);

    useEffect(() => {
        if (friendUids.length === 0) return;
        getUsersByIds(friendUids).then(setFriends);
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [friendUids.join(",")]);

    async function handleSend(e: React.FormEvent) {
        e.preventDefault();
        if (!user || !messageText.trim()) return;
        setSending(true);
        const displayName = user.displayName ?? user.email ?? "Someone";
        trackEvent(user.uid, displayName, "message_sent", { sourceId: groupId, courseTag: group?.courseTag ?? "" });
        await sendGroupMessage(
            groupId, user.uid, displayName, messageText.trim(),
            replyingTo
                ? { messageId: replyingTo.id, text: replyingTo.text, displayName: replyingTo.displayName }
                : undefined
        );
        setMessageText("");
        setReplyingTo(null);
        setSending(false);
    }

    function handleReply(msg: GroupMessage) {
        setReplyingTo(msg);
        inputRef.current?.focus();
    }

    async function handleReact(msg: GroupMessage, emoji: string) {
        if (!user) return;
        const already = (msg.reactions?.[emoji] ?? []).includes(user.uid);
        await reactToMessage(groupId, msg.id, user.uid, emoji, already);
    }

    async function handleInvite(uid: string) {
        if (!user || !group) return;
        setInviting(uid);
        await sendGroupInvite(groupId, group.name, group.courseTag, user.uid, uid);
        setInviting(null);
    }

    async function handleLeave() {
        if (!user) return;
        await leaveGroup(groupId, user.uid);
        router.push("/groups");
    }

    if (loading || !group) {
        return (
            <div className="flex items-center justify-center py-12">
                <div className="h-8 w-8 animate-spin rounded-full border-4 border-[#ead7d7] border-t-[#8C1515]"></div>
            </div>
        );
    }

    const uninvitedFriends = friends.filter((f) => !group.members.includes(f.uid));

    return (
        <div className="space-y-6">
            {/* Header */}
            <section className="rounded-3xl border border-[#ead7d7] bg-white px-8 py-8 shadow-sm">
                <Link href="/groups" className="text-sm font-semibold text-[#8C1515] hover:underline">
                    ← Back to groups
                </Link>
                <div className="mt-4 flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                    <div className="space-y-2">
                        <div className="flex items-center gap-2">
                            <span className="rounded-full bg-[#f3e7e7] px-3 py-1 text-xs font-bold text-[#8C1515]">{group.courseTag}</span>
                            <span className="text-xs text-neutral-400">{group.members.length} member{group.members.length !== 1 ? "s" : ""}</span>
                        </div>
                        <h1 className="text-3xl font-bold text-neutral-950">{group.name}</h1>
                        {group.description && <p className="text-sm text-neutral-600">{group.description}</p>}
                    </div>
                    <div className="flex gap-2">
                        <button onClick={() => setShowInvite((v) => !v)} className="rounded-full border border-[#8C1515] px-4 py-2 text-sm font-medium text-[#8C1515] transition hover:bg-[#8C1515] hover:text-white">
                            Invite friends
                        </button>
                        {confirmLeave ? (
                            <div className="flex items-center gap-2">
                                <span className="text-sm text-neutral-600">Leave?</span>
                                <button onClick={handleLeave} className="rounded-full bg-red-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-red-700">Yes</button>
                                <button onClick={() => setConfirmLeave(false)} className="rounded-full border border-neutral-200 px-3 py-1.5 text-xs font-medium text-neutral-600">Cancel</button>
                            </div>
                        ) : (
                            <button onClick={() => setConfirmLeave(true)} className="rounded-full border border-neutral-200 px-4 py-2 text-sm font-medium text-neutral-500 transition hover:border-red-300 hover:text-red-600">Leave</button>
                        )}
                    </div>
                </div>
                {showInvite && (
                    <div className="mt-5 rounded-2xl border border-neutral-200 bg-[#faf7f5] p-4">
                        <p className="mb-3 text-sm font-semibold text-neutral-700">Invite a friend</p>
                        {uninvitedFriends.length === 0 ? (
                            <p className="text-sm text-neutral-400">All your friends are already in this group.</p>
                        ) : (
                            <div className="flex flex-wrap gap-2">
                                {uninvitedFriends.map((f) => (
                                    <button key={f.uid} onClick={() => handleInvite(f.uid)} disabled={inviting === f.uid}
                                        className="rounded-full border border-neutral-200 bg-white px-4 py-2 text-sm font-medium text-neutral-700 transition hover:border-[#8C1515] hover:text-[#8C1515] disabled:opacity-60">
                                        {inviting === f.uid ? "Sent!" : `Invite ${(f.displayName ?? f.email ?? "Unknown").split(" ")[0]}`}
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                )}
            </section>

            <div className="grid gap-6 lg:grid-cols-[1fr_260px]">
                {/* Chat */}
                <div className="flex flex-col rounded-3xl border border-[#ead7d7] bg-white shadow-sm">
                    <div className="border-b border-neutral-100 px-6 py-4">
                        <h2 className="font-semibold text-neutral-950">Group chat</h2>
                    </div>

                    <div className="flex-1 overflow-y-auto px-4 py-5 space-y-0.5" style={{ maxHeight: "520px" }}>
                        {messages.length === 0 ? (
                            <p className="py-12 text-center text-sm text-neutral-400">No messages yet. Say hello!</p>
                        ) : (
                            messages.map((msg, i) => {
                                const isMe = msg.uid === user?.uid;
                                const prev = messages[i - 1];
                                const isGrouped = !!prev && prev.uid === msg.uid &&
                                    msg.createdAt.toMillis() - prev.createdAt.toMillis() < 5 * 60 * 1000;
                                const reactionEntries = Object.entries(msg.reactions ?? {}).filter(([, uids]) => uids.length > 0);
                                const hasReactions = reactionEntries.length > 0;

                                return (
                                    <div
                                        key={msg.id}
                                        className={`group relative flex items-end gap-2 ${isMe ? "flex-row-reverse" : "flex-row"} ${isGrouped ? "mt-0.5" : "mt-4"}`}
                                        onMouseEnter={() => setHoveredId(msg.id)}
                                        onMouseLeave={() => setHoveredId(null)}
                                    >
                                        {/* Avatar — left side, only first in group */}
                                        {!isMe && (
                                            <div className="w-7 shrink-0">
                                                {!isGrouped && <Avatar name={msg.displayName} />}
                                            </div>
                                        )}

                                        <div className={`flex max-w-[72%] flex-col gap-0.5 ${isMe ? "items-end" : "items-start"}`}>
                                            {/* Name + time — only first in group */}
                                            {!isGrouped && (
                                                <div className={`flex items-center gap-1.5 px-1 ${isMe ? "flex-row-reverse" : ""}`}>
                                                    {!isMe && <span className="text-xs font-semibold text-neutral-700">{msg.displayName.split(" ")[0]}</span>}
                                                    <span className="text-[11px] text-neutral-400">{timeAgo(msg.createdAt)}</span>
                                                </div>
                                            )}

                                            {/* Reply preview */}
                                            {msg.replyTo && (
                                                <div className={`w-full rounded-xl border-l-[3px] border-[#8C1515] bg-neutral-100 px-3 py-1.5 text-xs text-neutral-500 ${isMe ? "mr-0.5" : "ml-0.5"}`}>
                                                    <span className="font-semibold text-neutral-700">{msg.replyTo.displayName.split(" ")[0]}: </span>
                                                    {msg.replyTo.text.length > 55 ? msg.replyTo.text.slice(0, 55) + "…" : msg.replyTo.text}
                                                </div>
                                            )}

                                            {/* Bubble */}
                                            <div className={`relative rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
                                                isMe
                                                    ? "bg-[#8C1515] text-white rounded-br-md"
                                                    : "bg-[#f3e7e7] text-neutral-900 rounded-bl-md"
                                            } ${hasReactions ? "mb-4" : ""}`}>
                                                {msg.text}

                                                {/* Reactions overlapping bottom of bubble */}
                                                {hasReactions && (
                                                    <div className={`absolute -bottom-4 flex flex-wrap gap-1 ${isMe ? "right-1" : "left-1"}`}>
                                                        {reactionEntries.map(([emoji, uids]) => {
                                                            const reacted = user ? uids.includes(user.uid) : false;
                                                            return (
                                                                <button
                                                                    key={emoji}
                                                                    onClick={() => handleReact(msg, emoji)}
                                                                    className={`flex items-center gap-0.5 rounded-full border px-2 py-0.5 text-xs shadow-sm transition ${
                                                                        reacted
                                                                            ? "border-[#8C1515] bg-[#f3e7e7] font-bold text-[#8C1515]"
                                                                            : "border-neutral-200 bg-white text-neutral-600 hover:border-[#8C1515]"
                                                                    }`}
                                                                >
                                                                    {emoji} {uids.length > 1 ? uids.length : ""}
                                                                </button>
                                                            );
                                                        })}
                                                    </div>
                                                )}
                                            </div>
                                        </div>

                                                        {/* Hover actions — floating above bubble */}
                                        {hoveredId === msg.id && (
                                            <div className={`absolute bottom-full mb-1.5 z-20 flex items-center gap-1 rounded-2xl border border-neutral-200 bg-white px-2.5 py-1.5 shadow-lg ${isMe ? "right-0" : "left-7"}`}>
                                                {EMOJIS.map((emoji) => (
                                                    <button key={emoji} onClick={() => handleReact(msg, emoji)}
                                                        className="text-base leading-none transition hover:scale-125 active:scale-110">
                                                        {emoji}
                                                    </button>
                                                ))}
                                                <div className="mx-1 h-4 w-px bg-neutral-200" />
                                                <button onClick={() => handleReply(msg)}
                                                    className="text-xs font-medium text-neutral-500 transition hover:text-[#8C1515]">
                                                    Reply
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                );
                            })
                        )}
                        <div ref={bottomRef} />
                    </div>

                    {/* Reply banner */}
                    {replyingTo && (
                        <div className="flex items-center justify-between border-t border-neutral-100 bg-[#faf7f5] px-4 py-2">
                            <p className="text-xs text-neutral-500">
                                <span className="font-semibold text-neutral-700">Replying to {replyingTo.displayName.split(" ")[0]}:</span>{" "}
                                {replyingTo.text.length > 55 ? replyingTo.text.slice(0, 55) + "…" : replyingTo.text}
                            </p>
                            <button onClick={() => setReplyingTo(null)} className="ml-3 shrink-0 text-xs text-neutral-400 hover:text-neutral-700">✕</button>
                        </div>
                    )}

                    <form onSubmit={handleSend} className="border-t border-neutral-100 px-4 py-3 flex gap-3 items-center">
                        <input
                            ref={inputRef}
                            value={messageText}
                            onChange={(e) => setMessageText(e.target.value)}
                            placeholder={replyingTo ? `Reply to ${replyingTo.displayName.split(" ")[0]}…` : "Message the group…"}
                            className="flex-1 rounded-full border border-neutral-200 bg-[#faf7f5] px-4 py-2.5 text-sm text-neutral-900 placeholder:text-neutral-400 outline-none transition focus:border-[#8C1515] focus:bg-white"
                        />
                        <button type="submit" disabled={sending || !messageText.trim()}
                            className="rounded-full bg-[#8C1515] px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-[#6f1010] disabled:opacity-40">
                            Send
                        </button>
                    </form>
                </div>

                {/* Members */}
                <div className="rounded-3xl border border-[#ead7d7] bg-white p-6 shadow-sm self-start">
                    <h2 className="font-semibold text-neutral-950 mb-4">Members</h2>
                    <div className="space-y-3">
                        {members.map((m) => (
                            <div key={m.uid} className="flex items-center gap-2">
                                <Avatar name={m.displayName ?? m.email ?? "?"} size="md" />
                                <div className="min-w-0 flex-1">
                                    <p className="truncate text-sm font-medium text-neutral-900">{m.displayName ?? m.email ?? "Unknown"}</p>
                                    {group.createdBy === m.uid && <p className="text-xs text-neutral-400">Creator</p>}
                                </div>
                                {user?.uid === group.createdBy && m.uid !== user.uid && (
                                    <button onClick={() => removeMemberFromGroup(groupId, m.uid)}
                                        className="shrink-0 rounded-full border border-neutral-200 px-2.5 py-1 text-xs text-neutral-400 transition hover:border-red-300 hover:text-red-500">
                                        Remove
                                    </button>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}

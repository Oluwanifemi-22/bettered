"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { User } from "firebase/auth";
import { onAuthChange } from "@/src/lib/auth";
import { createGroup, joinGroup, listenToUserGroups, listenToPublicGroups, listenToGroupInvites, acceptGroupInvite, declineGroupInvite, Group, GroupInvite } from "@/src/lib/groups";
import { writeActivity } from "@/src/lib/activity";
import { trackEvent } from "@/src/lib/analytics";
import { getAllCourses } from "@/src/lib/courses";

export default function GroupsPage() {
    const router = useRouter();
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);
    const [myGroups, setMyGroups] = useState<Group[]>([]);
    const [publicGroups, setPublicGroups] = useState<Group[]>([]);
    const [courses, setCourses] = useState<{ id: string; courseName: string }[]>([]);
    const [creating, setCreating] = useState(false);
    const [showForm, setShowForm] = useState(false);
    const [visibility, setVisibility] = useState<"public" | "private">("public");
    const [joining, setJoining] = useState<string | null>(null);
    const [invites, setInvites] = useState<GroupInvite[]>([]);
    const [respondingTo, setRespondingTo] = useState<string | null>(null);

    useEffect(() => {
        getAllCourses().then(setCourses);
        const unsubAuth = onAuthChange((currentUser) => {
            if (!currentUser) { router.push("/"); return; }
            setUser(currentUser);
            setLoading(false);
        });
        return () => unsubAuth();
    }, [router]);

    useEffect(() => {
        if (!user) return;
        const unsubMine = listenToUserGroups(user.uid, setMyGroups);
        const unsubPublic = listenToPublicGroups(setPublicGroups);
        const unsubInvites = listenToGroupInvites(user.uid, setInvites);
        return () => { unsubMine(); unsubPublic(); unsubInvites(); };
    }, [user]);

    async function handleCreate(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault();
        if (!user) return;
        setCreating(true);
        const data = new FormData(e.currentTarget);
        const courseTag = data.get("courseTag") as string;
        const id = await createGroup(user.uid, data.get("name") as string, courseTag, data.get("description") as string, visibility);
        writeActivity(user.uid, user.displayName ?? user.email ?? "Someone", "created_group", courseTag);
        trackEvent(user.uid, user.displayName ?? user.email ?? "Someone", "group_create", { courseTag, sourceId: id });
        setCreating(false);
        setShowForm(false);
        setVisibility("public");
        router.push(`/groups/${id}`);
    }

    async function handleAccept(invite: GroupInvite) {
        if (!user) return;
        setRespondingTo(invite.id);
        await acceptGroupInvite(invite.id, invite.groupId, user.uid);
        writeActivity(user.uid, user.displayName ?? user.email ?? "Someone", "joined_group", invite.courseTag);
        trackEvent(user.uid, user.displayName ?? user.email ?? "Someone", "group_join", { courseTag: invite.courseTag ?? "", sourceId: invite.groupId });
        setRespondingTo(null);
        router.push(`/groups/${invite.groupId}`);
    }

    async function handleDecline(inviteId: string) {
        setRespondingTo(inviteId);
        await declineGroupInvite(inviteId);
        setRespondingTo(null);
    }

    async function handleJoin(groupId: string) {
        if (!user) return;
        setJoining(groupId);
        const group = publicGroups.find((g) => g.id === groupId);
        await joinGroup(groupId, user.uid);
        writeActivity(user.uid, user.displayName ?? user.email ?? "Someone", "joined_group", group?.courseTag);
        trackEvent(user.uid, user.displayName ?? user.email ?? "Someone", "group_join", { courseTag: group?.courseTag ?? "", sourceId: groupId });
        setJoining(null);
        router.push(`/groups/${groupId}`);
    }

    if (loading) {
        return (
            <div className="flex items-center justify-center py-12">
                <div className="h-8 w-8 animate-spin rounded-full border-4 border-[#ead7d7] border-t-[#8C1515]"></div>
            </div>
        );
    }

    const discoverGroups = publicGroups.filter((g) => !myGroups.some((m) => m.id === g.id));

    return (
        <div className="space-y-8">
            <section className="rounded-3xl border border-[#ead7d7] bg-white px-8 py-10 shadow-sm">
                <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                    <div className="space-y-2">
                        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[#8C1515]">
                            Study together
                        </p>
                        <h1 className="text-4xl font-bold tracking-tight text-neutral-950">
                            Study Groups
                        </h1>
                        <p className="text-base leading-7 text-neutral-600">
                            Persistent groups tied to a course — chat, coordinate, and study
                            together over time.
                        </p>
                    </div>
                    <button
                        onClick={() => setShowForm((v) => !v)}
                        className="self-start rounded-full bg-[#8C1515] px-6 py-3 text-sm font-semibold text-white transition hover:bg-[#6f1010]"
                    >
                        {showForm ? "Cancel" : "+ New group"}
                    </button>
                </div>
            </section>

            {showForm && (
                <section className="rounded-3xl border border-[#ead7d7] bg-white p-6 shadow-sm">
                    <h2 className="text-xl font-bold text-neutral-950">Create a study group</h2>
                    <form onSubmit={handleCreate} className="mt-5 space-y-4">
                        <input
                            name="name"
                            placeholder="Group name (e.g. CS106B night crew)"
                            required
                            className="w-full rounded-xl border border-neutral-200 bg-white px-4 py-3 text-sm text-neutral-900 placeholder:text-neutral-400 outline-none transition focus:border-[#8C1515]"
                        />
                        <select
                            name="courseTag"
                            required
                            defaultValue=""
                            className="w-full rounded-xl border border-neutral-200 bg-white px-4 py-3 text-sm text-neutral-900 outline-none transition focus:border-[#8C1515]"
                        >
                            <option value="" disabled>Select a course</option>
                            {courses.map((c) => (
                                <option key={c.id} value={c.courseName}>{c.courseName}</option>
                            ))}
                        </select>
                        <textarea
                            name="description"
                            rows={3}
                            placeholder="What's this group for?"
                            className="w-full resize-none rounded-xl border border-neutral-200 bg-white px-4 py-3 text-sm text-neutral-900 placeholder:text-neutral-400 outline-none transition focus:border-[#8C1515]"
                        />
                        <div>
                            <p className="mb-2 text-sm font-medium text-neutral-700">Visibility</p>
                            <div className="flex gap-2">
                                {(["public", "private"] as const).map((v) => (
                                    <button
                                        key={v}
                                        type="button"
                                        onClick={() => setVisibility(v)}
                                        className={`flex-1 rounded-xl border px-4 py-2.5 text-sm font-medium transition ${
                                            visibility === v
                                                ? "border-[#8C1515] bg-[#8C1515] text-white"
                                                : "border-neutral-200 text-neutral-600 hover:border-[#8C1515]"
                                        }`}
                                    >
                                        {v === "public" ? "🌐 Public" : "🔒 Private"}
                                    </button>
                                ))}
                            </div>
                            <p className="mt-1.5 text-xs text-neutral-400">
                                {visibility === "public"
                                    ? "Anyone on BetterEd can discover and join this group."
                                    : "Only people you invite can join."}
                            </p>
                        </div>
                        <button
                            type="submit"
                            disabled={creating}
                            className="rounded-xl bg-[#8C1515] px-6 py-3 text-sm font-semibold text-white transition hover:bg-[#6f1010] disabled:opacity-60"
                        >
                            {creating ? "Creating…" : "Create group"}
                        </button>
                    </form>
                </section>
            )}

            {/* Pending invites */}
            {invites.length > 0 && (
                <section className="rounded-3xl border border-[#ead7d7] bg-white p-6 shadow-sm">
                    <h2 className="mb-4 text-xl font-bold text-neutral-950">
                        Group invites
                        <span className="ml-2 rounded-full bg-[#8C1515] px-2 py-0.5 text-xs font-bold text-white">
                            {invites.length}
                        </span>
                    </h2>
                    <div className="space-y-3">
                        {invites.map((invite) => (
                            <div key={invite.id} className="flex items-center justify-between gap-4 rounded-2xl border border-neutral-200 p-4">
                                <div>
                                    <p className="font-medium text-neutral-900">{invite.groupName}</p>
                                    <span className="rounded-full bg-[#f3e7e7] px-2 py-0.5 text-xs font-bold text-[#8C1515]">
                                        {invite.courseTag}
                                    </span>
                                </div>
                                <div className="flex gap-2">
                                    <button
                                        onClick={() => handleAccept(invite)}
                                        disabled={respondingTo === invite.id}
                                        className="rounded-full bg-[#8C1515] px-4 py-2 text-sm font-medium text-white transition hover:bg-[#6f1010] disabled:opacity-60"
                                    >
                                        Accept
                                    </button>
                                    <button
                                        onClick={() => handleDecline(invite.id)}
                                        disabled={respondingTo === invite.id}
                                        className="rounded-full border border-neutral-200 px-4 py-2 text-sm font-medium text-neutral-600 transition hover:border-neutral-400 disabled:opacity-60"
                                    >
                                        Decline
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                </section>
            )}

            {/* My groups */}
            <section>
                <h2 className="mb-4 text-xl font-bold text-neutral-950">Your groups</h2>
                {myGroups.length === 0 ? (
                    <div className="rounded-3xl border border-dashed border-neutral-300 bg-white p-12 text-center">
                        <p className="font-semibold text-neutral-900">You're not in any groups yet.</p>
                        <p className="mt-1 text-sm text-neutral-500">
                            Create one or join a public group below.
                        </p>
                    </div>
                ) : (
                    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                        {myGroups.map((group) => (
                            <Link
                                key={group.id}
                                href={`/groups/${group.id}`}
                                className="rounded-3xl border border-neutral-200 bg-white p-6 transition hover:-translate-y-0.5 hover:border-[#8C1515] hover:shadow-md"
                            >
                                <div className="mb-3 flex items-center gap-2">
                                    <span className="rounded-full bg-[#f3e7e7] px-3 py-1 text-xs font-bold text-[#8C1515]">
                                        {group.courseTag}
                                    </span>
                                    {group.visibility === "private" && (
                                        <span className="rounded-full border border-neutral-200 px-2 py-1 text-xs text-neutral-500">🔒 Private</span>
                                    )}
                                </div>
                                <h3 className="font-semibold text-neutral-950">{group.name}</h3>
                                {group.description && (
                                    <p className="mt-1 text-sm text-neutral-500 line-clamp-2">{group.description}</p>
                                )}
                                <p className="mt-3 text-xs text-neutral-400">
                                    {group.members.length} member{group.members.length !== 1 ? "s" : ""}
                                </p>
                            </Link>
                        ))}
                    </div>
                )}
            </section>

            {/* Discover public groups */}
            {discoverGroups.length > 0 && (
                <section>
                    <h2 className="mb-4 text-xl font-bold text-neutral-950">Discover groups</h2>
                    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                        {discoverGroups.map((group) => (
                            <div
                                key={group.id}
                                className="rounded-3xl border border-neutral-200 bg-white p-6"
                            >
                                <div className="mb-3 flex items-center gap-2">
                                    <span className="rounded-full bg-[#f3e7e7] px-3 py-1 text-xs font-bold text-[#8C1515]">
                                        {group.courseTag}
                                    </span>
                                    <span className="rounded-full border border-neutral-200 px-2 py-1 text-xs text-neutral-500">🌐 Public</span>
                                </div>
                                <h3 className="font-semibold text-neutral-950">{group.name}</h3>
                                {group.description && (
                                    <p className="mt-1 text-sm text-neutral-500 line-clamp-2">{group.description}</p>
                                )}
                                <p className="mt-2 text-xs text-neutral-400">
                                    {group.members.length} member{group.members.length !== 1 ? "s" : ""}
                                </p>
                                <button
                                    onClick={() => handleJoin(group.id)}
                                    disabled={joining === group.id}
                                    className="mt-4 rounded-full border border-[#8C1515] px-4 py-2 text-sm font-medium text-[#8C1515] transition hover:bg-[#8C1515] hover:text-white disabled:opacity-60"
                                >
                                    {joining === group.id ? "Joining…" : "Join group"}
                                </button>
                            </div>
                        ))}
                    </div>
                </section>
            )}
        </div>
    );
}

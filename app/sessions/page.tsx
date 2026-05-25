"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { User } from "firebase/auth";
import { signOut, onAuthChange } from "@/src/lib/auth";
import { createSession, joinSession, leaveSession, expireSession, listenToActiveSessions } from "@/src/lib/sessions";
import { listenToFriendships, getUsersByIds } from "@/src/lib/friends";

interface Session {
    id: string;
    courseTag?: string;
    location?: string;
    workDescription?: string;
    createdBy?: string;
    [key: string]: unknown;
}

export default function SessionsPage() {
    const router = useRouter();
    const [user, setUser] = useState<User | null>(null);
    const [sessions, setSessions] = useState<Session[]>([]);
    const [loading, setLoading] = useState(true);
    const [visibility, setVisibility] = useState<"public" | "private">("public");
    const [friendUids, setFriendUids] = useState<string[]>([]);
    const [userNames, setUserNames] = useState<Map<string, string>>(new Map());
    const [search, setSearch] = useState("");
    const [friendsOnly, setFriendsOnly] = useState(false);

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
        const unsubSessions = listenToActiveSessions(setSessions);

        return () => {
            unsubAuth();
            unsubSessions();
        };
    }, [router]);

    async function handleCreateSession(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault();

        if (!user) return;

        const form = e.currentTarget;
        const data = new FormData(form);

        await createSession(
            user.uid,
            data.get("courseTag") as string,
            data.get("location") as string,
            data.get("workDescription") as string,
            new Date(Date.now() + 2 * 60 * 60 * 1000),
            visibility
        );

        form.reset();
        setVisibility("public");
    }

    useEffect(() => {
        const allUids = [...new Set(
            sessions.flatMap((s) => [
                s.createdBy as string,
                ...((s.joinedBy as string[]) ?? []),
            ]).filter(Boolean)
        )];
        if (allUids.length === 0) return;
        getUsersByIds(allUids).then((users) => {
            setUserNames((prev) => {
                const next = new Map(prev);
                users.forEach((u) => {
                    const firstName = (u.displayName ?? u.email ?? "Someone").split(" ")[0];
                    next.set(u.uid, firstName);
                });
                return next;
            });
        });
    }, [sessions]);

    if (loading) {
        return (
            <div className="flex items-center justify-center py-12">
                <div className="h-8 w-8 animate-spin rounded-full border-4 border-[#ead7d7] border-t-[#8C1515]"></div>
            </div>
        );
    }

    function studyingText(session: Session): string {
        const uids = [...new Set([
            session.createdBy as string,
            ...((session.joinedBy as string[]) ?? []),
        ].filter(Boolean))];
        const names = uids.map((uid) => userNames.get(uid) ?? "Someone");
        if (names.length === 1) return `${names[0]} is studying`;
        if (names.length === 2) return `${names[0]} and ${names[1]} are studying`;
        return `${names[0]}, ${names[1]}, and ${names.length - 2} other${names.length - 2 > 1 ? "s" : ""} are studying`;
    }

    const visibleSessions = sessions.filter((s) => {
        if (s.visibility === "private" && s.createdBy !== user?.uid && !friendUids.includes(s.createdBy as string)) return false;
        if (friendsOnly && s.createdBy !== user?.uid && !friendUids.includes(s.createdBy as string)) return false;
        const q = search.toLowerCase();
        if (q) {
            const matchesCourse = (s.courseTag as string ?? "").toLowerCase().includes(q);
            const matchesLocation = (s.location as string ?? "").toLowerCase().includes(q);
            if (!matchesCourse && !matchesLocation) return false;
        }
        return true;
    });

    return (
        <div className="space-y-8">
            <section className="rounded-3xl border border-[#ead7d7] bg-white px-8 py-10 shadow-sm">
                <div className="flex flex-col gap-8 lg:flex-row lg:items-center lg:justify-between">
                    <div className="max-w-2xl space-y-4">
                        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[#8C1515]">
                            Real-time study meetups
                        </p>

                        <h1 className="text-4xl font-bold tracking-tight text-neutral-950 md:text-5xl">
                            Find classmates working right now.
                        </h1>

                        <p className="text-base leading-7 text-neutral-600">
                            Post where you're studying, what class you're working on, and what
                            you want help with. BetterEd helps turn scattered study plans into
                            active sessions people can actually join.
                        </p>
                    </div>

                    <div className="rounded-2xl border border-[#ead7d7] bg-[#faf7f5] p-5">
                        <div className="space-y-3">
                            <p className="text-sm text-neutral-500">Signed in as</p>
                            <p className="font-medium text-neutral-900">{user?.email}</p>
                            <button
                                onClick={signOut}
                                className="rounded-full border border-[#8C1515] px-4 py-2 text-sm font-medium text-[#8C1515] transition hover:bg-[#8C1515] hover:text-white"
                            >
                                Sign out
                            </button>
                        </div>
                    </div>
                </div>
            </section>

            <section className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
                <div className="space-y-6">
                    <form
                        onSubmit={handleCreateSession}
                        className="rounded-3xl border border-[#ead7d7] bg-white p-6 shadow-sm"
                    >
                        <h2 className="text-2xl font-bold text-neutral-950">
                            Post a study session
                        </h2>
                        <p className="mt-1 text-sm text-neutral-500">
                            Let classmates know what you're working on and where they can
                            join you.
                        </p>

                        <div className="mt-5 space-y-3">
                            <input
                                name="courseTag"
                                placeholder="Course (e.g. CS278)"
                                required
                                className="w-full rounded-xl border border-neutral-200 bg-white px-4 py-3 text-sm text-neutral-900 placeholder:text-neutral-400 outline-none transition focus:border-[#8C1515]"
                            />

                            <input
                                name="location"
                                placeholder="Location (e.g. Gates 360)"
                                required
                                className="w-full rounded-xl border border-neutral-200 bg-white px-4 py-3 text-sm text-neutral-900 placeholder:text-neutral-400 outline-none transition focus:border-[#8C1515]"
                            />

                            <input
                                name="workDescription"
                                placeholder="What are you working on?"
                                required
                                className="w-full rounded-xl border border-neutral-200 bg-white px-4 py-3 text-sm text-neutral-900 placeholder:text-neutral-400 outline-none transition focus:border-[#8C1515]"
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
                                            {v === "public" ? "🌐 Public" : "🔒 Friends only"}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <button
                                type="submit"
                                className="w-full rounded-xl bg-[#8C1515] px-4 py-3 text-sm font-semibold text-white transition hover:bg-[#6f1010]"
                            >
                                Create session
                            </button>
                        </div>
                    </form>

                    <div className="rounded-3xl border border-[#ead7d7] bg-[#8C1515] p-6 text-white shadow-sm">
                        <h2 className="text-lg font-bold">Quick reminder</h2>
                        <p className="mt-2 text-sm leading-6 text-red-50">
                            Study sessions should support allowed collaboration. Don't share
                            restricted answers, private solutions, or anything that violates the Honor Code.
                        </p>
                    </div>
                </div>

                <div className="rounded-3xl border border-[#ead7d7] bg-white p-6 shadow-sm">
                    <div className="mb-4 flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
                        <div>
                            <h2 className="text-3xl font-bold text-neutral-950">
                                Active sessions
                            </h2>
                            <p className="mt-1 text-sm text-neutral-500">
                                Live study sessions happening right now.
                            </p>
                        </div>

                        <span className="rounded-full bg-[#f3e7e7] px-3 py-1 text-xs font-bold text-[#8C1515]">
                            {visibleSessions.length} active
                        </span>
                    </div>

                    <div className="mb-4 flex flex-col gap-2 sm:flex-row">
                        <input
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            placeholder="Search by course or location…"
                            className="flex-1 rounded-xl border border-neutral-200 bg-[#faf7f5] px-4 py-2.5 text-sm text-neutral-900 outline-none placeholder:text-neutral-400 transition focus:border-[#8C1515] focus:bg-white"
                        />
                        <button
                            onClick={() => setFriendsOnly((v) => !v)}
                            className={`rounded-xl border px-4 py-2.5 text-sm font-medium transition ${
                                friendsOnly
                                    ? "border-[#8C1515] bg-[#8C1515] text-white"
                                    : "border-neutral-200 text-neutral-600 hover:border-[#8C1515] hover:text-[#8C1515]"
                            }`}
                        >
                            Friends only
                        </button>
                    </div>

                    <div className="space-y-3">
                        {visibleSessions.length === 0 ? (
                            <div className="rounded-2xl border border-dashed border-neutral-300 bg-[#faf7f5] p-8 text-center">
                                <p className="font-semibold text-neutral-900">
                                    No active sessions yet.
                                </p>
                                <p className="mt-1 text-sm text-neutral-500">
                                    Be the first to post what you're working on.
                                </p>
                            </div>
                        ) : (
                            visibleSessions.map((session) => (
                                <article
                                    key={session.id}
                                    className="rounded-2xl border border-neutral-200 p-5 transition hover:-translate-y-0.5 hover:border-[#8C1515] hover:shadow-md"
                                >
                                    <div className="mb-3 flex items-center justify-between gap-3">
                                        <div className="flex items-center gap-2">
                                            <span className="rounded-full bg-[#f3e7e7] px-3 py-1 text-xs font-bold text-[#8C1515]">
                                                {session.courseTag}
                                            </span>
                                            {session.visibility === "private" && (
                                                <span className="rounded-full border border-neutral-200 px-2 py-1 text-xs text-neutral-500">🔒 Friends</span>
                                            )}
                                        </div>
                                        <span className="text-xs font-medium text-neutral-500">
                                            Live now
                                        </span>
                                    </div>

                                    <h3 className="font-semibold text-neutral-950">
                                        {session.workDescription}
                                    </h3>

                                    <p className="mt-2 text-sm text-neutral-600">
                                        {session.location}
                                    </p>

                                    <p className="mt-1 text-xs text-neutral-400">
                                        {studyingText(session)}
                                    </p>

                                    <div className="mt-4 flex items-center gap-2">
                                        {session.createdBy === user?.uid ? (
                                            <button
                                                onClick={() => expireSession(session.id)}
                                                className="rounded-full border border-neutral-300 px-4 py-2 text-sm font-medium text-neutral-500 transition hover:border-red-400 hover:bg-red-50 hover:text-red-600"
                                            >
                                                End session
                                            </button>
                                        ) : (session.joinedBy as string[] ?? []).includes(user?.uid ?? "") ? (
                                            <>
                                                <span className="rounded-full bg-[#f3e7e7] px-4 py-2 text-sm font-medium text-[#8C1515]">Joined ✓</span>
                                                <button
                                                    onClick={() => leaveSession(session.id, user!.uid)}
                                                    className="rounded-full border border-neutral-300 px-4 py-2 text-sm font-medium text-neutral-500 transition hover:border-red-400 hover:text-red-600"
                                                >
                                                    Leave
                                                </button>
                                            </>
                                        ) : (
                                            <button
                                                onClick={() => joinSession(session.id, user!.uid)}
                                                className="rounded-full border border-[#8C1515] px-4 py-2 text-sm font-medium text-[#8C1515] transition hover:bg-[#8C1515] hover:text-white"
                                            >
                                                Join session
                                            </button>
                                        )}
                                    </div>
                                </article>
                            ))
                        )}
                    </div>
                </div>
            </section>
        </div>
    );
}

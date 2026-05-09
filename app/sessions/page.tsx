"use client";

import { useEffect, useState } from "react";
import { User } from "firebase/auth";
import { signInWithGoogle, signOut, onAuthChange } from "@/src/lib/auth";
import { createSession, listenToActiveSessions } from "@/src/lib/sessions";

interface Session {
    id: string;
    courseTag?: string;
    location?: string;
    workDescription?: string;
    createdBy?: string;
    [key: string]: unknown;
}

export default function SessionsPage() {
    const [user, setUser] = useState<User | null>(null);
    const [sessions, setSessions] = useState<Session[]>([]);
    const [authError, setAuthError] = useState("");

    useEffect(() => {
        const unsubAuth = onAuthChange(setUser);
        const unsubSessions = listenToActiveSessions(setSessions);

        return () => {
            unsubAuth();
            unsubSessions();
        };
    }, []);

    async function handleSignIn() {
        setAuthError("");

        try {
            await signInWithGoogle();
        } catch (e: unknown) {
            setAuthError(e instanceof Error ? e.message : "Sign-in failed.");
        }
    }

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
            new Date(Date.now() + 2 * 60 * 60 * 1000)
        );

        form.reset();
    }

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
                            Post where you’re studying, what class you’re working on, and what
                            you want help with. BetterEd helps turn scattered study plans into
                            active sessions people can actually join.
                        </p>
                    </div>

                    <div className="rounded-2xl border border-[#ead7d7] bg-[#faf7f5] p-5">
                        {user ? (
                            <div className="space-y-3">
                                <p className="text-sm text-neutral-500">Signed in as</p>
                                <p className="font-medium text-neutral-900">{user.email}</p>
                                <button
                                    onClick={signOut}
                                    className="rounded-full border border-[#8C1515] px-4 py-2 text-sm font-medium text-[#8C1515] transition hover:bg-[#8C1515] hover:text-white"
                                >
                                    Sign out
                                </button>
                            </div>
                        ) : (
                            <div className="space-y-3">
                                <p className="text-sm font-medium text-neutral-700">
                                    Sign in to post or join a study session.
                                </p>
                                <button
                                    onClick={handleSignIn}
                                    className="rounded-full bg-[#8C1515] px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-[#6f1010]"
                                >
                                    Sign in with Google
                                </button>
                                {authError && (
                                    <p className="text-sm text-red-600">{authError}</p>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            </section>

            <section className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
                <div className="space-y-6">
                    {user ? (
                        <form
                            onSubmit={handleCreateSession}
                            className="rounded-3xl border border-[#ead7d7] bg-white p-6 shadow-sm"
                        >
                            <h2 className="text-2xl font-bold text-neutral-950">
                                Post a study session
                            </h2>
                            <p className="mt-1 text-sm text-neutral-500">
                                Let classmates know what you’re working on and where they can
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

                                <button
                                    type="submit"
                                    className="w-full rounded-xl bg-[#8C1515] px-4 py-3 text-sm font-semibold text-white transition hover:bg-[#6f1010]"
                                >
                                    Create session
                                </button>
                            </div>
                        </form>
                    ) : (
                        <div className="rounded-3xl border border-[#ead7d7] bg-white p-6 shadow-sm">
                            <h2 className="text-2xl font-bold text-neutral-950">
                                Post a study session
                            </h2>
                            <p className="mt-2 text-sm leading-6 text-neutral-600">
                                Sign in first to let classmates know where you’re studying and
                                what you’re working on.
                            </p>
                            <button
                                onClick={handleSignIn}
                                className="mt-5 rounded-full bg-[#8C1515] px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-[#6f1010]"
                            >
                                Sign in to post
                            </button>
                        </div>
                    )}

                    <div className="rounded-3xl border border-[#ead7d7] bg-[#8C1515] p-6 text-white shadow-sm">
                        <h2 className="text-lg font-bold">Quick reminder</h2>
                        <p className="mt-2 text-sm leading-6 text-red-50">
                            Study sessions should support allowed collaboration. Don’t share
                            restricted answers, private solutions, or anything that violates a
                            course policy.
                        </p>
                    </div>
                </div>

                <div className="rounded-3xl border border-[#ead7d7] bg-white p-6 shadow-sm">
                    <div className="mb-5 flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
                        <div>
                            <h2 className="text-3xl font-bold text-neutral-950">
                                Active sessions
                            </h2>
                            <p className="mt-1 text-sm text-neutral-500">
                                Live study sessions happening right now.
                            </p>
                        </div>

                        <span className="rounded-full bg-[#f3e7e7] px-3 py-1 text-xs font-bold text-[#8C1515]">
                            {sessions.length} active
                        </span>
                    </div>

                    <div className="space-y-3">
                        {sessions.length === 0 ? (
                            <div className="rounded-2xl border border-dashed border-neutral-300 bg-[#faf7f5] p-8 text-center">
                                <p className="font-semibold text-neutral-900">
                                    No active sessions yet.
                                </p>
                                <p className="mt-1 text-sm text-neutral-500">
                                    Be the first to post what you’re working on.
                                </p>
                            </div>
                        ) : (
                            sessions.map((session) => (
                                <article
                                    key={session.id}
                                    className="rounded-2xl border border-neutral-200 p-5 transition hover:-translate-y-0.5 hover:border-[#8C1515] hover:shadow-md"
                                >
                                    <div className="mb-3 flex items-center justify-between gap-3">
                                        <span className="rounded-full bg-[#f3e7e7] px-3 py-1 text-xs font-bold text-[#8C1515]">
                                            {session.courseTag}
                                        </span>
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

                                    <button className="mt-4 rounded-full border border-[#8C1515] px-4 py-2 text-sm font-medium text-[#8C1515] transition hover:bg-[#8C1515] hover:text-white">
                                        Join session
                                    </button>
                                </article>
                            ))
                        )}
                    </div>
                </div>
            </section>
        </div>
    );
}
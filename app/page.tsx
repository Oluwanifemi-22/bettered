"use client";

import { useEffect, useState } from "react";
import { User } from "firebase/auth";
import { signInWithGoogle, signOut, onAuthChange } from "@/src/lib/auth";
import Link from "next/link";

const discussionThreads = [
  {
    id: "1",
    course: "CS278",
    title: "How are people thinking about the piggyback prototype?",
    preview:
      "Trying to figure out whether Discord or a Google Form gives us better real behavior data.",
    replies: 8,
    status: "Active",
    lastActive: "12 min ago",
  },
  {
    id: "2",
    course: "MATH51",
    title: "Study group for problem set review",
    preview:
      "Looking for people who want to go over the harder linear algebra questions before section.",
    replies: 5,
    status: "Open",
    lastActive: "34 min ago",
  },
  {
    id: "3",
    course: "CS106B",
    title: "Debugging recursion problems",
    preview:
      "Can anyone explain a cleaner way to trace recursive helper functions?",
    replies: 12,
    status: "Answered",
    lastActive: "1 hr ago",
  },
];

export default function Home() {
  const [user, setUser] = useState<User | null>(null);
  const [authError, setAuthError] = useState("");
  const [search, setSearch] = useState("");

  useEffect(() => {
    const unsubAuth = onAuthChange(setUser);

    return () => {
      unsubAuth();
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

  const filteredThreads = discussionThreads.filter((thread) => {
    const query = search.toLowerCase();

    return (
      thread.course.toLowerCase().includes(query) ||
      thread.title.toLowerCase().includes(query) ||
      thread.preview.toLowerCase().includes(query)
    );
  });

  return (
    <div className="space-y-8">
      <Link
        href="/discussions/new"
        className="fixed bottom-8 right-8 z-50 flex items-center gap-3 rounded-full bg-[#8C1515] px-6 py-4 text-sm font-bold text-white shadow-lg shadow-red-900/20 transition hover:-translate-y-1 hover:bg-[#6f1010] hover:shadow-xl"
      >
        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-white text-lg leading-none text-[#8C1515]">
          +
        </span>
        <span>Create post</span>
      </Link>
      <section className="rounded-3xl border border-[#ead7d7] bg-white px-8 py-10 shadow-sm">
        <div className="flex flex-col gap-8 lg:flex-row lg:items-center lg:justify-between">
          <div className="max-w-2xl space-y-4">
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[#8C1515]">
              Better course support, all in one place
            </p>

            <h1 className="text-4xl font-bold tracking-tight text-neutral-950 md:text-5xl">
              Ask questions. Share resources. Study smarter.
            </h1>

            <p className="text-base leading-7 text-neutral-600">
              BetterEd helps students find course-specific discussions,
              resources, and study support without digging through scattered
              group chats.
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
                  Sign in to join discussions.
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

      <section className="rounded-3xl border border-[#ead7d7] bg-white p-6 shadow-sm">
        <div className="mb-5 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-3xl font-bold text-neutral-950">
              Discussion board
            </h2>
            <p className="mt-1 text-sm text-neutral-500">
              Browse class questions, study plans, and shared resources.
            </p>
          </div>

          <div className="flex gap-2 text-sm">
            <button className="rounded-full bg-[#8C1515] px-4 py-2 font-medium text-white">
              All
            </button>
            <button className="rounded-full border border-neutral-200 px-4 py-2 font-medium text-neutral-600 hover:border-[#8C1515] hover:text-[#8C1515]">
              My classes
            </button>
            <button className="rounded-full border border-neutral-200 px-4 py-2 font-medium text-neutral-600 hover:border-[#8C1515] hover:text-[#8C1515]">
              Unanswered
            </button>
          </div>
        </div>

        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search discussions, classes, or topics..."
          className="mb-5 w-full rounded-2xl border border-neutral-200 bg-[#faf7f5] px-4 py-3 text-sm text-neutral-900 outline-none transition placeholder:text-neutral-400 focus:border-[#8C1515] focus:bg-white"
        />

        <div className="space-y-3">
          {filteredThreads.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-neutral-300 bg-[#faf7f5] p-8 text-center">
              <p className="font-semibold text-neutral-900">
                No discussions found.
              </p>
              <p className="mt-1 text-sm text-neutral-500">
                Try searching for a different class or topic.
              </p>
            </div>
          ) : (
            filteredThreads.map((thread) => (
              <article
                key={thread.id}
                className="cursor-pointer rounded-2xl border border-neutral-200 p-5 transition hover:-translate-y-0.5 hover:border-[#8C1515] hover:shadow-md"
              >
                <div className="mb-3 flex items-center justify-between gap-3">
                  <span className="rounded-full bg-[#f3e7e7] px-3 py-1 text-xs font-bold text-[#8C1515]">
                    {thread.course}
                  </span>
                  <span className="text-xs font-medium text-neutral-500">
                    {thread.replies} replies · {thread.status} ·{" "}
                    {thread.lastActive}
                  </span>
                </div>

                <h3 className="font-semibold text-neutral-950">
                  {thread.title}
                </h3>

                <p className="mt-2 text-sm leading-6 text-neutral-600">
                  {thread.preview}
                </p>

                <p className="mt-4 text-sm font-medium text-[#8C1515]">
                  Open thread →
                </p>
              </article>
            ))
          )}
        </div>
      </section>
    </div>
  );
}
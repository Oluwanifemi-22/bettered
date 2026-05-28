"use client";

import { useEffect, useState } from "react";
import { User } from "firebase/auth";
import { signInWithGoogle, signOut, onAuthChange } from "@/src/lib/auth";
import { createUserProfile, getUserProfile } from "@/src/lib/users";
import { listenToFriendships } from "@/src/lib/friends";
import { listenToAllDiscussions, Discussion } from "@/src/lib/discussions";
import { listenToFriendsActivity, activityText, ActivityEvent } from "@/src/lib/activity";
import { Timestamp } from "firebase/firestore";
import Link from "next/link";

function timeAgo(ts: Timestamp): string {
  const seconds = Math.floor((Date.now() - ts.toMillis()) / 1000);
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} hr ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

export default function Home() {
  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [authError, setAuthError] = useState("");
  const [search, setSearch] = useState("");
  const [discussions, setDiscussions] = useState<Discussion[]>([]);
  const [activeFilters, setActiveFilters] = useState<Set<"my-classes" | "unanswered">>(new Set());
  const [myCourseIds, setMyCourseIds] = useState<string[]>([]);
  const [friendUids, setFriendUids] = useState<string[]>([]);
  const [activityFeed, setActivityFeed] = useState<ActivityEvent[]>([]);

  useEffect(() => {
    let unsubDiscussions: (() => void) | null = null;

    const unsubAuth = onAuthChange((currentUser) => {
      setUser(currentUser);
      setAuthLoading(false);
      if (currentUser) {
        unsubDiscussions = listenToAllDiscussions(setDiscussions);
        listenToFriendships(currentUser.uid, (fs) => {
          const accepted = fs
            .filter((f) => f.status === "accepted")
            .flatMap((f) => f.users)
            .filter((uid) => uid !== currentUser.uid);
          setFriendUids([...new Set(accepted)]);
        });
        getUserProfile(currentUser.uid).then((profile) => {
          const classes = (profile as Record<string, unknown>)?.classes;
          if (Array.isArray(classes)) {
            setMyCourseIds(classes.map((c: { courseId?: string } | string) =>
              typeof c === "string" ? c : (c.courseId ?? "")
            ));
          }
        });
      } else {
        unsubDiscussions?.();
        unsubDiscussions = null;
        setDiscussions([]);
        setMyCourseIds([]);
        setActivityFeed([]);
      }
    });

    return () => {
      unsubAuth();
      unsubDiscussions?.();
    };
  }, []);

  useEffect(() => {
    const unsub = listenToFriendsActivity(friendUids, setActivityFeed);
    return () => unsub();
  }, [friendUids.join(",")]);

  async function handleSignIn() {
    setAuthError("");

    try {
      const user = await signInWithGoogle();
      // Create user profile in Firestore
      await createUserProfile(user.uid, user.email || "", user.displayName || "");
    } catch (e: unknown) {
      setAuthError(e instanceof Error ? e.message : "Sign-in failed.");
    }
  }

  const filteredThreads = discussions.filter((d) => {
    if (d.visibility === "private" && d.createdBy !== user?.uid && !friendUids.includes(d.createdBy)) return false;
    if (activeFilters.has("my-classes") && !myCourseIds.includes(d.courseTag)) return false;
    if (activeFilters.has("unanswered") && d.replies.length > 0) return false;
    const q = search.toLowerCase();
    return (
      d.courseTag.toLowerCase().includes(q) ||
      d.title.toLowerCase().includes(q) ||
      d.body.toLowerCase().includes(q)
    );
  });

  if (authLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-[#ead7d7] border-t-[#8C1515]"></div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {!user ? (
        // Sign-up/Login page for unauthenticated users
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
            </div>
          </div>
        </section>
      ) : (
        // Main app content for authenticated users
        <>
          <Link
            href="/discussions/new"
            className="fixed bottom-8 right-8 z-50 flex items-center gap-3 rounded-full bg-[#8C1515] px-6 py-4 text-sm font-bold text-white shadow-lg shadow-red-900/20 transition hover:-translate-y-1 hover:bg-[#6f1010] hover:shadow-xl"
          >
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-white text-lg leading-none text-[#8C1515]">
              +
            </span>
            <span>Create post</span>
          </Link>

          <div className="grid gap-6 lg:grid-cols-[1fr_300px]">
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
                <button
                  onClick={() => setActiveFilters(new Set())}
                  className={`rounded-full px-4 py-2 font-medium transition ${
                    activeFilters.size === 0
                      ? "bg-[#8C1515] text-white"
                      : "border border-neutral-200 text-neutral-600 hover:border-[#8C1515] hover:text-[#8C1515]"
                  }`}
                >
                  All
                </button>
                {(["my-classes", "unanswered"] as const).map((f) => (
                  <button
                    key={f}
                    onClick={() => setActiveFilters((prev) => {
                      const next = new Set(prev);
                      next.has(f) ? next.delete(f) : next.add(f);
                      return next;
                    })}
                    className={`rounded-full px-4 py-2 font-medium transition ${
                      activeFilters.has(f)
                        ? "bg-[#8C1515] text-white"
                        : "border border-neutral-200 text-neutral-600 hover:border-[#8C1515] hover:text-[#8C1515]"
                    }`}
                  >
                    {f === "my-classes" ? "My classes" : "Unanswered"}
                  </button>
                ))}
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
                  <Link
                    key={thread.id}
                    href={`/discussions/${thread.id}`}
                    className="block rounded-2xl border border-neutral-200 p-5 transition hover:-translate-y-0.5 hover:border-[#8C1515] hover:shadow-md"
                  >
                    <div className="mb-3 flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2">
                        <span className="rounded-full bg-[#f3e7e7] px-3 py-1 text-xs font-bold text-[#8C1515]">
                          {thread.courseTag}
                        </span>
                        {thread.visibility === "private" && (
                          <span className="rounded-full border border-neutral-200 px-2 py-1 text-xs text-neutral-500">🔒 Friends</span>
                        )}
                      </div>
                      <span className="text-xs font-medium text-neutral-500">
                        {thread.replies.length} {thread.replies.length === 1 ? "reply" : "replies"} · {timeAgo(thread.createdAt)}
                      </span>
                    </div>

                    <h3 className="font-semibold text-neutral-950">
                      {thread.title}
                    </h3>

                    <p className="mt-2 text-sm leading-6 text-neutral-600">
                      {thread.body.length > 140 ? thread.body.slice(0, 140) + "…" : thread.body}
                    </p>

                    <p className="mt-4 text-sm font-medium text-[#8C1515]">
                      Open thread →
                    </p>
                  </Link>
                ))
              )}
            </div>
          </section>

          {/* Activity feed sidebar */}
          <aside className="rounded-3xl border border-[#ead7d7] bg-white p-5 shadow-sm self-start">
            <h2 className="mb-1 text-lg font-bold text-neutral-950">Friend activity</h2>
            <p className="mb-4 text-xs text-neutral-400">What your network is up to</p>
            {activityFeed.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-neutral-200 p-6 text-center">
                <p className="text-sm font-medium text-neutral-500">No activity yet.</p>
                <p className="mt-1 text-xs text-neutral-400">Add friends to see what they&apos;re working on.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {activityFeed.map((event) => (
                  <div key={event.id} className="flex items-start gap-2.5">
                    <div className="mt-0.5 h-7 w-7 shrink-0 rounded-full bg-[#f3e7e7] flex items-center justify-center text-xs font-bold text-[#8C1515]">
                      {event.displayName[0].toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm text-neutral-800">
                        <span className="font-semibold">{event.displayName.split(" ")[0]}</span>{" "}
                        {activityText(event)}
                      </p>
                      <p className="text-xs text-neutral-400">{timeAgo(event.createdAt)}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </aside>
          </div>
        </>
      )}
    </div>
  );
}
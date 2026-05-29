"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { User } from "firebase/auth";
import { onAuthChange } from "@/src/lib/auth";
import { getUserProfile, getAllUsersAdmin, setUserRole } from "@/src/lib/users";
import { listenToRecentEvents, getAnalyticsSummary, AnalyticsEvent } from "@/src/lib/analytics";
import { deleteDiscussion, listenToAllDiscussions, Discussion } from "@/src/lib/discussions";
import { getPendingCourseRequests, approveCourseRequest, denyCourseRequest, CourseRequest } from "@/src/lib/courses";
import { deleteActivityForSource } from "@/src/lib/activity";
import { collection, getCountFromServer } from "firebase/firestore";
import { db } from "@/src/lib/firebase";

type AdminUser = { id: string; uid: string; displayName?: string; email?: string; role?: string; reputation?: Record<string, number> };

const EVENT_LABELS: Record<string, string> = {
  page_view: "Page views",
  upvote: "Upvotes",
  downvote: "Downvotes",
  session_create: "Sessions created",
  session_join: "Sessions joined",
  discussion_create: "Discussions created",
  reply_post: "Replies posted",
  group_create: "Groups created",
  group_join: "Groups joined",
  message_sent: "Messages sent",
};

async function countCollection(name: string) {
  const snap = await getCountFromServer(collection(db, name));
  return snap.data().count;
}

export default function AdminPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"overview" | "users" | "content" | "requests">("overview");
  const [courseRequests, setCourseRequests] = useState<CourseRequest[]>([]);
  const [processingRequestId, setProcessingRequestId] = useState<string | null>(null);

  // Overview
  const [counts, setCounts] = useState({ users: 0, discussions: 0, sessions: 0, groups: 0 });
  const [summary, setSummary] = useState<{ byType: Record<string, number>; topUsers: { uid: string; displayName: string; count: number }[]; total: number } | null>(null);
  const [recentEvents, setRecentEvents] = useState<AnalyticsEvent[]>([]);

  // Users tab
  const [allUsers, setAllUsers] = useState<AdminUser[]>([]);
  const [promotingUid, setPromotingUid] = useState<string | null>(null);

  // Content tab
  const [discussions, setDiscussions] = useState<Discussion[]>([]);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    const unsub = onAuthChange(async (currentUser) => {
      if (!currentUser) { router.push("/"); return; }
      const profile = await getUserProfile(currentUser.uid);
      if ((profile as Record<string, unknown>)?.role !== "admin") {
        router.push("/");
        return;
      }
      setUser(currentUser);
      setLoading(false);
    });
    return () => unsub();
  }, [router]);

  useEffect(() => {
    if (!user) return;
    Promise.all([
      countCollection("users"),
      countCollection("discussions"),
      countCollection("sessions"),
      countCollection("groups"),
    ]).then(([users, discussions, sessions, groups]) => setCounts({ users, discussions, sessions, groups }));

    getAnalyticsSummary().then(setSummary);
    getAllUsersAdmin().then(setAllUsers);
    getPendingCourseRequests().then(setCourseRequests);

    const unsubEvents = listenToRecentEvents(setRecentEvents);
    const unsubDiscussions = listenToAllDiscussions(setDiscussions);
    return () => { unsubEvents(); unsubDiscussions(); };
  }, [user]);

  async function handlePromote(uid: string, current?: string) {
    setPromotingUid(uid);
    await setUserRole(uid, current === "admin" ? null : "admin");
    setAllUsers((prev) => prev.map((u) => u.uid === uid ? { ...u, role: current === "admin" ? undefined : "admin" } : u));
    setPromotingUid(null);
  }

  async function handleApproveRequest(id: string, collaborationAllowed: boolean) {
    setProcessingRequestId(id);
    await approveCourseRequest(id, collaborationAllowed);
    setCourseRequests((prev) => prev.filter((r) => r.id !== id));
    setProcessingRequestId(null);
  }

  async function handleDenyRequest(id: string) {
    setProcessingRequestId(id);
    await denyCourseRequest(id);
    setCourseRequests((prev) => prev.filter((r) => r.id !== id));
    setProcessingRequestId(null);
  }

  async function handleAdminDeleteDiscussion(id: string) {
    setDeletingId(id);
    await deleteDiscussion(id);
    deleteActivityForSource(id);
    setDeletingId(null);
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-[#ead7d7] border-t-[#8C1515]" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <section className="rounded-3xl border border-[#ead7d7] bg-white px-8 py-8 shadow-sm">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[#8C1515]">Moderation & Analytics</p>
            <h1 className="mt-1 text-4xl font-bold tracking-tight text-neutral-950">Admin Dashboard</h1>
          </div>
          <span className="rounded-full bg-[#8C1515] px-3 py-1 text-xs font-bold text-white">Admin</span>
        </div>

        <div className="mt-6 flex gap-2">
          {(["overview", "users", "content", "requests"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`rounded-full px-5 py-2 text-sm font-medium capitalize transition ${
                tab === t ? "bg-[#8C1515] text-white" : "border border-neutral-200 text-neutral-600 hover:border-[#8C1515] hover:text-[#8C1515]"
              }`}
            >
              {t === "requests" ? `Requests${courseRequests.length > 0 ? ` (${courseRequests.length})` : ""}` : t}
            </button>
          ))}
        </div>
      </section>

      {tab === "overview" && (
        <div className="space-y-6">
          {/* Stat cards */}
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            {[
              { label: "Users", value: counts.users },
              { label: "Discussions", value: counts.discussions },
              { label: "Sessions", value: counts.sessions },
              { label: "Groups", value: counts.groups },
            ].map(({ label, value }) => (
              <div key={label} className="rounded-3xl border border-[#ead7d7] bg-white p-6 shadow-sm">
                <p className="text-sm text-neutral-500">{label}</p>
                <p className="mt-1 text-4xl font-bold text-neutral-950">{value}</p>
              </div>
            ))}
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            {/* Events by type */}
            <div className="rounded-3xl border border-[#ead7d7] bg-white p-6 shadow-sm">
              <h2 className="mb-4 text-xl font-bold text-neutral-950">Activity by type</h2>
              {summary ? (
                <div className="space-y-2">
                  {Object.entries(summary.byType).sort(([, a], [, b]) => b - a).map(([type, count]) => (
                    <div key={type} className="flex items-center justify-between">
                      <span className="text-sm text-neutral-700">{EVENT_LABELS[type] ?? type}</span>
                      <div className="flex items-center gap-3">
                        <div className="h-2 rounded-full bg-[#f3e7e7]" style={{ width: `${Math.min(count / (summary.total || 1) * 200, 120)}px` }}>
                          <div className="h-full rounded-full bg-[#8C1515]" style={{ width: "100%" }} />
                        </div>
                        <span className="w-8 text-right text-sm font-semibold text-neutral-900">{count}</span>
                      </div>
                    </div>
                  ))}
                  {!summary.total && <p className="text-sm text-neutral-400">No events tracked yet.</p>}
                </div>
              ) : <p className="text-sm text-neutral-400">Loading…</p>}
            </div>

            {/* Top users */}
            <div className="rounded-3xl border border-[#ead7d7] bg-white p-6 shadow-sm">
              <h2 className="mb-4 text-xl font-bold text-neutral-950">Most active users</h2>
              {summary?.topUsers.length ? (
                <div className="space-y-3">
                  {summary.topUsers.map((u, i) => (
                    <div key={u.uid} className="flex items-center gap-3">
                      <span className="w-5 text-sm font-bold text-neutral-400">#{i + 1}</span>
                      <div className="h-8 w-8 rounded-full bg-[#f3e7e7] flex items-center justify-center text-xs font-bold text-[#8C1515]">
                        {u.displayName[0].toUpperCase()}
                      </div>
                      <span className="flex-1 truncate text-sm font-medium text-neutral-900">{u.displayName}</span>
                      <span className="text-sm font-semibold text-[#8C1515]">{u.count} events</span>
                    </div>
                  ))}
                </div>
              ) : <p className="text-sm text-neutral-400">No activity yet.</p>}
            </div>
          </div>

          {/* Recent raw events */}
          <div className="rounded-3xl border border-[#ead7d7] bg-white p-6 shadow-sm">
            <h2 className="mb-4 text-xl font-bold text-neutral-950">Recent events</h2>
            <div className="max-h-80 overflow-y-auto overflow-x-auto rounded-xl border border-neutral-100">
              <table className="w-full text-sm">
                <thead>
                  <tr className="sticky top-0 border-b border-neutral-100 bg-white text-left text-xs font-semibold uppercase text-neutral-400">
                    <th className="pb-3 pr-4">User</th>
                    <th className="pb-3 pr-4">Event</th>
                    <th className="pb-3 pr-4">Course</th>
                    <th className="pb-3 pr-4">Source ID</th>
                    <th className="pb-3">Time</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-50">
                  {recentEvents.map((e) => (
                    <tr key={e.id}>
                      <td className="py-2 pr-4 font-medium text-neutral-900">{e.displayName.split(" ")[0]}</td>
                      <td className="py-2 pr-4 text-neutral-600">{EVENT_LABELS[e.event] ?? e.event}</td>
                      <td className="py-2 pr-4">
                        {e.metadata?.courseTag && (
                          <span className="rounded-full bg-[#f3e7e7] px-2 py-0.5 text-xs font-bold text-[#8C1515]">{e.metadata.courseTag}</span>
                        )}
                      </td>
                      <td className="py-2 pr-4">
                        {e.metadata?.sourceId && (
                          <span className="font-mono text-xs text-neutral-400">{e.metadata.sourceId}</span>
                        )}
                      </td>
                      <td className="py-2 text-xs text-neutral-400">
                        {new Date(e.createdAt.toMillis()).toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {!recentEvents.length && <p className="py-4 text-center text-sm text-neutral-400">No events yet.</p>}
            </div>
          </div>
        </div>
      )}

      {tab === "users" && (
        <div className="rounded-3xl border border-[#ead7d7] bg-white p-6 shadow-sm">
          <h2 className="mb-5 text-xl font-bold text-neutral-950">All users ({allUsers.length})</h2>
          <div className="space-y-3">
            {allUsers.map((u) => (
              <div key={u.uid} className="flex items-center gap-4 rounded-2xl border border-neutral-100 p-4">
                <div className="h-9 w-9 shrink-0 rounded-full bg-[#f3e7e7] flex items-center justify-center text-sm font-bold text-[#8C1515]">
                  {(u.displayName ?? u.email ?? "?")[0].toUpperCase()}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="truncate text-sm font-medium text-neutral-900">{u.displayName ?? "Unknown"}</p>
                    {u.role === "admin" && (
                      <span className="rounded-full bg-[#8C1515] px-2 py-0.5 text-xs font-bold text-white">Admin</span>
                    )}
                  </div>
                  <p className="truncate text-xs text-neutral-400">{u.email}</p>
                </div>
                {u.uid !== user?.uid && (
                  <button
                    onClick={() => handlePromote(u.uid, u.role)}
                    disabled={promotingUid === u.uid}
                    className={`shrink-0 rounded-full border px-4 py-1.5 text-xs font-medium transition disabled:opacity-50 ${
                      u.role === "admin"
                        ? "border-red-200 text-red-600 hover:bg-red-50"
                        : "border-[#8C1515] text-[#8C1515] hover:bg-[#8C1515] hover:text-white"
                    }`}
                  >
                    {promotingUid === u.uid ? "…" : u.role === "admin" ? "Remove admin" : "Make admin"}
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {tab === "requests" && (
        <div className="rounded-3xl border border-[#ead7d7] bg-white p-6 shadow-sm">
          <h2 className="mb-1 text-xl font-bold text-neutral-950">Course requests</h2>
          <p className="mb-5 text-sm text-neutral-500">Students are asking for these courses to be added. Approve to create the course; specify whether collaboration is allowed.</p>
          {courseRequests.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-neutral-200 p-8 text-center">
              <p className="text-sm font-medium text-neutral-500">No pending requests.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {courseRequests.map((req) => (
                <div key={req.id} className="rounded-2xl border border-neutral-100 p-5">
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <p className="font-semibold text-neutral-900">{req.courseName}</p>
                      {req.reason && <p className="mt-1 text-sm text-neutral-500">"{req.reason}"</p>}
                      <p className="mt-1 text-xs text-neutral-400">{new Date(req.createdAt.toMillis()).toLocaleDateString()}</p>
                    </div>
                    <div className="flex shrink-0 flex-col gap-2 sm:flex-row">
                      <button
                        onClick={() => handleApproveRequest(req.id, true)}
                        disabled={processingRequestId === req.id}
                        className="rounded-full bg-[#8C1515] px-4 py-1.5 text-xs font-semibold text-white transition hover:bg-[#6f1010] disabled:opacity-50"
                      >
                        Approve (collab ✓)
                      </button>
                      <button
                        onClick={() => handleApproveRequest(req.id, false)}
                        disabled={processingRequestId === req.id}
                        className="rounded-full border border-neutral-300 px-4 py-1.5 text-xs font-medium text-neutral-600 transition hover:border-[#8C1515] hover:text-[#8C1515] disabled:opacity-50"
                      >
                        Approve (no collab)
                      </button>
                      <button
                        onClick={() => handleDenyRequest(req.id)}
                        disabled={processingRequestId === req.id}
                        className="rounded-full border border-red-200 px-4 py-1.5 text-xs font-medium text-red-600 transition hover:bg-red-50 disabled:opacity-50"
                      >
                        Deny
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {tab === "content" && (
        <div className="rounded-3xl border border-[#ead7d7] bg-white p-6 shadow-sm">
          <h2 className="mb-5 text-xl font-bold text-neutral-950">All discussions ({discussions.length})</h2>
          <div className="space-y-3">
            {discussions.map((d) => (
              <div key={d.id} className="flex items-start gap-4 rounded-2xl border border-neutral-100 p-4">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="rounded-full bg-[#f3e7e7] px-2 py-0.5 text-xs font-bold text-[#8C1515]">{d.courseTag}</span>
                    {d.visibility === "private" && (
                      <span className="text-xs text-neutral-400">🔒 Private</span>
                    )}
                  </div>
                  <p className="mt-1 text-sm font-medium text-neutral-900">{d.title}</p>
                  <p className="text-xs text-neutral-400">{d.replies.length} replies · {new Date(d.createdAt.toMillis()).toLocaleDateString()}</p>
                </div>
                <button
                  onClick={() => handleAdminDeleteDiscussion(d.id)}
                  disabled={deletingId === d.id}
                  className="shrink-0 rounded-full border border-red-200 px-3 py-1.5 text-xs font-medium text-red-600 transition hover:bg-red-50 disabled:opacity-50"
                >
                  {deletingId === d.id ? "Deleting…" : "Delete"}
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

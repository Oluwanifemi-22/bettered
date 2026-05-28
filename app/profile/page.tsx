"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { User } from "firebase/auth";
import { onAuthChange, signOut } from "@/src/lib/auth";
import { getUserProfile, addCourseToUser, removeCourseFromUser, createUserProfile, setUserRole } from "@/src/lib/users";
import { getCourseByName } from "@/src/lib/courses";
import {
  listenToFriendships,
  sendFriendRequest,
  acceptFriendRequest,
  declineFriendRequest,
  cancelFriendRequest,
  removeFriend,
  getAllUsers,
  getUsersByIds,
  Friendship,
  UserSummary,
} from "@/src/lib/friends";

interface EnrolledCourse {
  courseId: string;
  role: "student" | "helper";
}

interface UserProfile {
  id: string;
  uid?: string;
  email?: string;
  displayName?: string;
  school?: string;
  classes?: EnrolledCourse[];
  [key: string]: unknown;
}

function getRelationship(
  targetUid: string,
  friendships: Friendship[],
  currentUid: string
): { status: "friends" | "sent" | "received" | "none"; friendshipId?: string } {
  const f = friendships.find((f) => f.users.includes(targetUid) && f.users.includes(currentUid));
  if (!f) return { status: "none" };
  if (f.status === "accepted") return { status: "friends", friendshipId: f.id };
  if (f.from === currentUid) return { status: "sent", friendshipId: f.id };
  return { status: "received", friendshipId: f.id };
}

export default function ProfilePage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [courses, setCourses] = useState<EnrolledCourse[]>([]);
  const [loading, setLoading] = useState(true);
  const [newCourseId, setNewCourseId] = useState("");
  const [newCourseRole, setNewCourseRole] = useState<"student" | "helper">("student");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // Friends state
  const [friendships, setFriendships] = useState<Friendship[]>([]);
  const [userCache, setUserCache] = useState<Map<string, UserSummary>>(new Map());
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<UserSummary[]>([]);
  const [allUsers, setAllUsers] = useState<UserSummary[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);

  const cacheUsers = useCallback(async (uids: string[]) => {
    const missing = uids.filter((uid) => !userCache.has(uid));
    if (!missing.length) return;
    const profiles = await getUsersByIds(missing);
    setUserCache((prev) => {
      const next = new Map(prev);
      profiles.forEach((p) => next.set(p.uid, p));
      return next;
    });
  }, [userCache]);

  useEffect(() => {
    const unsubscribe = onAuthChange(async (currentUser) => {
      if (!currentUser) { router.push("/"); return; }
      setUser(currentUser);

      try {
        await createUserProfile(currentUser.uid, currentUser.email ?? "", currentUser.displayName ?? "");
        const userProfile = await getUserProfile(currentUser.uid);
        if (userProfile) {
          setProfile(userProfile as UserProfile);
          const raw = (userProfile as Record<string, unknown>).classes;
          setCourses(normalizeClasses(raw));
        }
      } catch (err) {
        setError("Failed to load profile");
        console.error(err);
      }

      setLoading(false);
    });

    return () => unsubscribe();
  }, [router]);

  useEffect(() => {
    if (!user) return;
    const unsub = listenToFriendships(user.uid, async (fs) => {
      setFriendships(fs);
      const uids = fs.flatMap((f) => f.users).filter((uid) => uid !== user.uid);
      await cacheUsers([...new Set(uids)]);
    });
    return () => unsub();
  }, [user, cacheUsers]);

  function normalizeClasses(raw: unknown): EnrolledCourse[] {
    if (!Array.isArray(raw)) return [];
    return raw.map((entry) =>
      typeof entry === "string"
        ? { courseId: entry, role: "student" }
        : { courseId: entry.courseId ?? "", role: entry.role ?? "student" }
    ).filter((e) => e.courseId);
  }

  const handleRemoveCourse = async (courseId: string) => {
    if (!user) return;
    try {
      await removeCourseFromUser(user.uid, courseId);
      setCourses((prev) => prev.filter((c) => c.courseId !== courseId));
    } catch (err) {
      setError("Failed to remove course");
      console.error(err);
    }
  };

  const handleAddCourse = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    const trimmed = newCourseId.trim().toUpperCase();
    if (!trimmed) { setError("Please enter a course name"); return; }
    if (courses.some((c) => c.courseId.toUpperCase() === trimmed)) { setError("You're already enrolled in that course"); return; }
    if (!user) { setError("Not authenticated"); return; }
    try {
      const courseDoc = await getCourseByName(trimmed);
      if (!courseDoc) { setError("Course not found. Try a name like \"CS 106B\" or \"CS106B\"."); return; }
      const canonicalName = courseDoc.courseName;
      if (courses.some((c) => c.courseId === canonicalName)) { setError("You're already enrolled in that course"); return; }
      await addCourseToUser(user.uid, canonicalName, newCourseRole);
      setCourses((prev) => [...prev, { courseId: canonicalName, role: newCourseRole }]);
      setNewCourseId("");
      setNewCourseRole("student");
      setSuccess(`${canonicalName} added to your courses`);
    } catch (err) {
      setError("Failed to add course");
      console.error(err);
    }
  };

  const handleSignOut = async () => {
    try {
      await signOut();
      setUser(null);
      setProfile(null);
      setCourses([]);
    } catch (err) {
      setError("Failed to sign out");
      console.error(err);
    }
  };

  const handleSearchFocus = async () => {
    if (!user || allUsers.length > 0) return;
    setLoadingUsers(true);
    const users = await getAllUsers(user.uid);
    setAllUsers(users);
    setLoadingUsers(false);
  };

  const handleSearchChange = (q: string) => {
    setSearchQuery(q);
    if (!q.trim()) { setSearchResults([]); return; }
    const lower = q.toLowerCase();
    setSearchResults(
      allUsers.filter(
        (u) =>
          u.email?.toLowerCase().includes(lower) ||
          u.displayName?.toLowerCase().includes(lower)
      )
    );
  };

  const incoming = friendships.filter((f) => f.status === "pending" && f.from !== user?.uid);
  const friends = friendships.filter((f) => f.status === "accepted");

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="mb-4 h-8 w-8 animate-spin rounded-full border-4 border-[#ead7d7] border-t-[#8C1515]"></div>
          <p className="text-neutral-600">Loading profile...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl space-y-8">
      {/* Profile Header */}
      <div className="rounded-lg border border-[#ead7d7] bg-white p-6">
        <div className="mb-4 flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-bold text-[#1f1f1f]">{profile?.displayName || "User"}</h1>
            <p className="text-neutral-600">{profile?.email}</p>
          </div>
          <button
            onClick={handleSignOut}
            className="rounded-lg bg-neutral-200 px-4 py-2 text-sm font-medium text-neutral-700 transition hover:bg-neutral-300"
          >
            Sign Out
          </button>
        </div>
        <div className="mt-4 flex items-center gap-3 text-sm">
          <span className="font-medium text-neutral-700">School:</span>
          <span className="text-neutral-600">{profile?.school}</span>
          {profile?.role === "admin" && (
            <span className="rounded-full bg-[#8C1515] px-2.5 py-0.5 text-xs font-bold text-white">Admin</span>
          )}
        </div>
        {/* Bootstrap: claim admin if you're nife22@stanford.edu and not yet admin */}
        {user?.email === "nife22@stanford.edu" && profile?.role !== "admin" && (
          <button
            onClick={async () => {
              if (!user) return;
              await setUserRole(user.uid, "admin");
              setProfile((p) => p ? { ...p, role: "admin" } : p);
            }}
            className="mt-4 rounded-full bg-[#8C1515] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#6f1010]"
          >
            Claim admin access
          </button>
        )}
      </div>

      {error && <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800">{error}</div>}
      {success && <div className="rounded-lg border border-green-200 bg-green-50 p-4 text-sm text-green-800">{success}</div>}

      {/* Reputation */}
      {profile?.reputation && Object.keys(profile.reputation as Record<string, number>).length > 0 && (
        <div className="rounded-lg border border-[#ead7d7] bg-white p-6">
          <h2 className="mb-1 text-2xl font-bold text-[#1f1f1f]">Reputation</h2>
          <p className="mb-4 text-sm text-neutral-500">Points earned from upvotes on your posts and replies.</p>
          <div className="flex flex-wrap gap-2">
            {Object.entries(profile.reputation as Record<string, number>)
              .sort(([, a], [, b]) => b - a)
              .map(([course, pts]) => (
                <div key={course} className="flex items-center gap-2 rounded-2xl border border-[#ead7d7] bg-[#faf7f5] px-4 py-2.5">
                  <span className="text-sm font-bold text-[#8C1515]">{course}</span>
                  <span className="text-xs text-neutral-400">·</span>
                  <span className="text-sm font-semibold text-neutral-700">{pts} pt{pts !== 1 ? "s" : ""}</span>
                </div>
              ))}
          </div>
        </div>
      )}

      {/* Enrolled Courses */}
      <div className="rounded-lg border border-[#ead7d7] bg-white p-6">
        <h2 className="mb-4 text-2xl font-bold text-[#1f1f1f]">Enrolled Courses</h2>
        {courses.length > 0 ? (
          <div className="space-y-2">
            {courses.map((course) => (
              <div key={course.courseId} className="flex items-center justify-between rounded-lg bg-[#faf7f5] p-4">
                <div>
                  <p className="font-medium text-[#1f1f1f]">{course.courseId}</p>
                  <p className="text-xs capitalize text-neutral-500">{course.role}</p>
                </div>
                <button onClick={() => handleRemoveCourse(course.courseId)} className="text-sm text-neutral-400 transition hover:text-red-600">
                  Remove
                </button>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-neutral-600">No courses enrolled yet. Add a course below!</p>
        )}
      </div>

      {/* Add Course */}
      <div className="rounded-lg border border-[#ead7d7] bg-white p-6">
        <h2 className="mb-4 text-2xl font-bold text-[#1f1f1f]">Add a Course</h2>
        <form onSubmit={handleAddCourse} className="space-y-4">
          <div>
            <label htmlFor="courseId" className="block text-sm font-medium text-neutral-700">Course name</label>
            <input
              id="courseId"
              type="text"
              value={newCourseId}
              onChange={(e) => setNewCourseId(e.target.value)}
              placeholder="e.g. CS 106B, MATH 51"
              className="mt-2 w-full rounded-lg border border-[#ead7d7] px-4 py-2 text-[#1f1f1f] placeholder-neutral-400 transition focus:border-[#8C1515] focus:outline-none"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-neutral-700">Your role</label>
            <div className="mt-2 flex gap-3">
              {(["student", "helper"] as const).map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => setNewCourseRole(r)}
                  className={`flex-1 rounded-lg border px-4 py-2 text-sm font-medium capitalize transition ${newCourseRole === r ? "border-[#8C1515] bg-[#8C1515] text-white" : "border-[#ead7d7] text-neutral-600 hover:border-[#8C1515]"}`}
                >
                  {r}
                </button>
              ))}
            </div>
          </div>
          <button type="submit" className="w-full rounded-lg bg-[#8C1515] px-4 py-2 font-medium text-white transition hover:bg-[#6b0f0f]">
            Add Course
          </button>
        </form>
      </div>

      {/* Incoming Requests */}
      {incoming.length > 0 && (
        <div className="rounded-lg border border-[#ead7d7] bg-white p-6">
          <h2 className="mb-4 text-2xl font-bold text-[#1f1f1f]">
            Friend Requests
            <span className="ml-2 rounded-full bg-[#8C1515] px-2 py-0.5 text-sm text-white">{incoming.length}</span>
          </h2>
          <div className="space-y-3">
            {incoming.map((f) => {
              const sender = userCache.get(f.from);
              return (
                <div key={f.id} className="flex items-center justify-between rounded-lg bg-[#faf7f5] p-4">
                  <div>
                    <p className="font-medium text-[#1f1f1f]">{sender?.displayName ?? "Unknown"}</p>
                    <p className="text-xs text-neutral-500">{sender?.email}</p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => acceptFriendRequest(f.id)}
                      className="rounded-lg bg-[#8C1515] px-3 py-1.5 text-sm font-medium text-white transition hover:bg-[#6b0f0f]"
                    >
                      Accept
                    </button>
                    <button
                      onClick={() => declineFriendRequest(f.id)}
                      className="rounded-lg border border-neutral-200 px-3 py-1.5 text-sm font-medium text-neutral-600 transition hover:border-red-300 hover:text-red-600"
                    >
                      Decline
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Friends List */}
      <div className="rounded-lg border border-[#ead7d7] bg-white p-6">
        <h2 className="mb-4 text-2xl font-bold text-[#1f1f1f]">
          Friends <span className="text-lg font-normal text-neutral-400">({friends.length})</span>
        </h2>
        {friends.length > 0 ? (
          <div className="space-y-2">
            {friends.map((f) => {
              const friendUid = f.users.find((uid) => uid !== user?.uid)!;
              const friendProfile = userCache.get(friendUid);
              return (
                <div key={f.id} className="flex items-center justify-between rounded-lg bg-[#faf7f5] p-4">
                  <div>
                    <p className="font-medium text-[#1f1f1f]">{friendProfile?.displayName ?? "Unknown"}</p>
                    <p className="text-xs text-neutral-500">{friendProfile?.email}</p>
                  </div>
                  <button
                    onClick={() => removeFriend(f.id)}
                    className="text-sm text-neutral-400 transition hover:text-red-600"
                  >
                    Remove
                  </button>
                </div>
              );
            })}
          </div>
        ) : (
          <p className="text-neutral-600">No friends yet. Find people below!</p>
        )}
      </div>

      {/* Find People */}
      <div className="rounded-lg border border-[#ead7d7] bg-white p-6">
        <h2 className="mb-1 text-2xl font-bold text-[#1f1f1f]">Find People</h2>
        <p className="mb-4 text-sm text-neutral-500">Search by name or Stanford email.</p>
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => handleSearchChange(e.target.value)}
          onFocus={handleSearchFocus}
          placeholder="e.g. Jane Smith or jsmith@stanford.edu"
          className="w-full rounded-lg border border-[#ead7d7] px-4 py-2 text-sm text-[#1f1f1f] placeholder-neutral-400 transition focus:border-[#8C1515] focus:outline-none"
        />
        {loadingUsers && (
          <p className="mt-3 text-sm text-neutral-400">Loading users…</p>
        )}

        {searchResults.length > 0 && (
          <div className="mt-4 space-y-2">
            {searchResults.map((result) => {
              const rel = getRelationship(result.uid, friendships, user!.uid);
              return (
                <div key={result.id} className="flex items-center justify-between rounded-lg bg-[#faf7f5] p-4">
                  <div>
                    <p className="font-medium text-[#1f1f1f]">{result.displayName ?? "Unknown"}</p>
                    <p className="text-xs text-neutral-500">{result.email}</p>
                  </div>
                  <div>
                    {rel.status === "none" && (
                      <button
                        onClick={() => sendFriendRequest(user!.uid, result.uid)}
                        className="rounded-lg bg-[#8C1515] px-3 py-1.5 text-sm font-medium text-white transition hover:bg-[#6b0f0f]"
                      >
                        Add friend
                      </button>
                    )}
                    {rel.status === "sent" && (
                      <button
                        onClick={() => cancelFriendRequest(rel.friendshipId!)}
                        className="rounded-lg border border-neutral-200 px-3 py-1.5 text-sm font-medium text-neutral-500 transition hover:border-red-300 hover:text-red-600"
                      >
                        Cancel request
                      </button>
                    )}
                    {rel.status === "received" && (
                      <div className="flex gap-2">
                        <button
                          onClick={() => acceptFriendRequest(rel.friendshipId!)}
                          className="rounded-lg bg-[#8C1515] px-3 py-1.5 text-sm font-medium text-white transition hover:bg-[#6b0f0f]"
                        >
                          Accept
                        </button>
                        <button
                          onClick={() => declineFriendRequest(rel.friendshipId!)}
                          className="rounded-lg border border-neutral-200 px-3 py-1.5 text-sm font-medium text-neutral-600 transition hover:text-red-600"
                        >
                          Decline
                        </button>
                      </div>
                    )}
                    {rel.status === "friends" && (
                      <span className="rounded-full bg-[#f3e7e7] px-3 py-1 text-xs font-semibold text-[#8C1515]">
                        Friends
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {searchQuery.trim() && searchResults.length === 0 && !loadingUsers && (
          <p className="mt-4 text-sm text-neutral-500">No users found for "{searchQuery}".</p>
        )}
      </div>
    </div>
  );
}

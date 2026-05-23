"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { User } from "firebase/auth";
import { onAuthChange, signOut } from "@/src/lib/auth";
import { getUserProfile, addCourseToUser, removeCourseFromUser, createUserProfile } from "@/src/lib/users";
import { getCourseByName } from "@/src/lib/courses";

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

  useEffect(() => {
    const unsubscribe = onAuthChange(async (currentUser) => {
      setUser(currentUser);

      if (!currentUser) {
        router.push("/");
        return;
      }

      try {
        // Ensure the user doc exists before any writes
        await createUserProfile(currentUser.uid, currentUser.email ?? "", currentUser.displayName ?? "");
        const userProfile = await getUserProfile(currentUser.uid);
        if (userProfile) {
          setProfile(userProfile as UserProfile);
          const raw = (userProfile as Record<string, unknown>).classes;
          const classes = normalizeClasses(raw);
          setCourses(classes);
        }
      } catch (err) {
        setError("Failed to load profile");
        console.error(err);
      }

      setLoading(false);
    });

    return () => unsubscribe();
  }, [router]);

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

    if (!trimmed) {
      setError("Please enter a course name");
      return;
    }

    if (courses.some((c) => c.courseId.toUpperCase() === trimmed)) {
      setError("You're already enrolled in that course");
      return;
    }

    if (!user) {
      setError("Not authenticated");
      return;
    }

    try {
      const courseDoc = await getCourseByName(trimmed);
      if (!courseDoc) {
        setError("Course not found. Try a name like \"CS 106B\" or \"CS106B\".");
        return;
      }
      const canonicalName = courseDoc.courseName;
      if (courses.some((c) => c.courseId === canonicalName)) {
        setError("You're already enrolled in that course");
        return;
      }
      await addCourseToUser(user.uid, canonicalName, newCourseRole);
      const added: EnrolledCourse = { courseId: canonicalName, role: newCourseRole };
      setCourses((prev) => [...prev, added]);
      setNewCourseId("");
      setNewCourseRole("student");
      setSuccess(`${trimmed} added to your courses`);
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
    <div className="max-w-2xl">
      {/* Profile Header */}
      <div className="mb-8 rounded-lg border border-[#ead7d7] bg-white p-6">
        <div className="mb-4 flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-bold text-[#1f1f1f]">
              {profile?.displayName || "User"}
            </h1>
            <p className="text-neutral-600">{profile?.email}</p>
          </div>
          <button
            onClick={handleSignOut}
            className="rounded-lg bg-neutral-200 px-4 py-2 text-sm font-medium text-neutral-700 transition hover:bg-neutral-300"
          >
            Sign Out
          </button>
        </div>
        <div className="mt-4 space-y-2 text-sm">
          <div>
            <span className="font-medium text-neutral-700">School:</span>{" "}
            <span className="text-neutral-600">{profile?.school}</span>
          </div>
        </div>
      </div>

      {error && (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800">
          {error}
        </div>
      )}
      {success && (
        <div className="mb-4 rounded-lg border border-green-200 bg-green-50 p-4 text-sm text-green-800">
          {success}
        </div>
      )}

      {/* Enrolled Courses */}
      <div className="mb-8 rounded-lg border border-[#ead7d7] bg-white p-6">
        <h2 className="mb-4 text-2xl font-bold text-[#1f1f1f]">Enrolled Courses</h2>

        {courses.length > 0 ? (
          <div className="space-y-2">
            {courses.map((course) => (
              <div
                key={course.courseId}
                className="flex items-center justify-between rounded-lg bg-[#faf7f5] p-4"
              >
                <div>
                  <p className="font-medium text-[#1f1f1f]">{course.courseId}</p>
                  <p className="text-xs capitalize text-neutral-500">{course.role}</p>
                </div>
                <button
                  onClick={() => handleRemoveCourse(course.courseId)}
                  className="text-sm text-neutral-400 transition hover:text-red-600"
                >
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
            <label htmlFor="courseId" className="block text-sm font-medium text-neutral-700">
              Course name
            </label>
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
            <label className="block text-sm font-medium text-neutral-700">
              Your role
            </label>
            <div className="mt-2 flex gap-3">
              {(["student", "helper"] as const).map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => setNewCourseRole(r)}
                  className={`flex-1 rounded-lg border px-4 py-2 text-sm font-medium capitalize transition ${
                    newCourseRole === r
                      ? "border-[#8C1515] bg-[#8C1515] text-white"
                      : "border-[#ead7d7] text-neutral-600 hover:border-[#8C1515]"
                  }`}
                >
                  {r}
                </button>
              ))}
            </div>
          </div>
          <button
            type="submit"
            className="w-full rounded-lg bg-[#8C1515] px-4 py-2 font-medium text-white transition hover:bg-[#6b0f0f]"
          >
            Add Course
          </button>
        </form>
      </div>
    </div>
  );
}

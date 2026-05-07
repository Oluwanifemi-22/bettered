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

export default function Home() {
  const [user, setUser] = useState<User | null>(null);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [authError, setAuthError] = useState("");

  // Track auth state and subscribe to active sessions
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
      new Date(Date.now() + 2 * 60 * 60 * 1000) // expires in 2 hours
    );
    form.reset();
  }

  return (
    <main className="max-w-xl mx-auto p-8 space-y-8">
      <h1 className="text-2xl font-bold">BetterEd</h1>

      {/* Auth */}
      {user ? (
        <div className="flex items-center gap-4">
          <span className="text-sm text-gray-600">{user.email}</span>
          <button onClick={signOut} className="text-sm underline">
            Sign out
          </button>
        </div>
      ) : (
        <div className="space-y-2">
          <button
            onClick={handleSignIn}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Sign in with Google
          </button>
          {authError && <p className="text-sm text-red-500">{authError}</p>}
        </div>
      )}

      {/* Create session form — only shown when signed in */}
      {user && (
        <form onSubmit={handleCreateSession} className="space-y-3 border p-4 rounded">
          <h2 className="font-semibold">Post a study session</h2>
          <input
            name="courseTag"
            placeholder="Course (e.g. CS101)"
            required
            className="w-full border rounded px-3 py-2 text-sm"
          />
          <input
            name="location"
            placeholder="Location (e.g. Mugar Library)"
            required
            className="w-full border rounded px-3 py-2 text-sm"
          />
          <input
            name="workDescription"
            placeholder="What are you working on?"
            required
            className="w-full border rounded px-3 py-2 text-sm"
          />
          <button
            type="submit"
            className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 text-sm"
          >
            Create session
          </button>
        </form>
      )}

      {/* Live session list */}
      <div className="space-y-3">
        <h2 className="font-semibold">Active sessions</h2>
        {sessions.length === 0 ? (
          <p className="text-sm text-gray-500">No active sessions.</p>
        ) : (
          sessions.map((s) => (
            <div key={s.id} className="border rounded p-3 text-sm space-y-1">
              <p className="font-medium">{s.courseTag}</p>
              <p className="text-gray-600">{s.location}</p>
              <p>{s.workDescription}</p>
            </div>
          ))
        )}
      </div>
    </main>
  );
}

# BetterEd

Student collaboration platform for university courses. The primary feature is a course-based discussion forum where students can ask questions, share resources, and collaborate. A real-time session board (post where you're studying, join others) is a secondary feature. Built for university students: .edu emails only.

---

## Backend Status

Firebase logic lives in `src/lib/`. Status per module:

| Module | Status | Notes |
|---|---|---|
| **Auth** | ✅ Complete | Google sign-in, .edu enforcement, auth state listener |
| **Sessions** | ✅ Complete | Create, join, expire, real-time listener for active sessions |
| **Users** | In progress | Profile creation on first sign-in, course enrollment |
| **Courses** | In progress | Create courses, fetch course data, check collaboration policy |
| **Honor Code** | Scaffolded, needs refinement | Syllabus keyword scan → blocks posting if collaboration not allowed |
| **Discussions** | In progress | Course-level threads, replies, real-time listener |
| **Firestore rules** | ✅ Complete | Covers users, sessions, courses — needs discussions + replies |

**What's left: discussions backend + all frontend pages.**

---

## Tech Stack

- **Next.js** (App Router) + **Tailwind CSS**
- **Firebase Auth** — Google sign-in, gated to `.edu` addresses
- **Firestore** — real-time session feed, user profiles, course data

---

## Project Structure

```
src/lib/
  firebase.ts       # Firebase app init — do not import directly in UI
  auth.ts           # signInWithGoogle, signOut, onAuthChange
  sessions.ts       # createSession, joinSession, expireSession,
                    # getActiveSessions, listenToActiveSessions
  users.ts          # createUserProfile, getUserProfile, addCourseToUser
  courses.ts        # createCourse, getCourse, checkCollaborationAllowed
  honorCode.ts      # parseSyllabusForCollaboration

app/                # Next.js App Router pages (UI to be built here)
firestore.rules     # Firestore security rules
```

Import backend functions directly from `src/lib/` — never touch Firebase SDK calls in UI components:

```ts
import { createSession, listenToActiveSessions } from '@/lib/sessions';
import { signInWithGoogle, onAuthChange } from '@/lib/auth';
import { checkCollaborationAllowed } from '@/lib/courses';
```

---

## Setup

### 1. Clone and install

```bash
git clone <repo-url>
cd bettered
npm install
```

### 2. Add Firebase credentials

Create `.env.local` in the project root with your Firebase project values:

```env
NEXT_PUBLIC_FIREBASE_API_KEY=your_api_key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id
```

> **Never commit `.env.local`.** It is already in `.gitignore`. If you need the values, ask a teammate — do not paste them into the repo.

To get these values: Firebase Console → your project → Project Settings → Web app → SDK setup and configuration.

### 3. Run locally

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### 4. Deploy Firestore rules (once, or when rules change)

```bash
firebase deploy --only firestore:rules
```

---

## What's Left to Build

UI pages to build in `app/`, in priority order:

**Discussion forum (primary):**
- **Discussion forum landing** — list of threads filterable by course and keyword, real-time updates
- **Discussion detail** — full thread, reply list, reply form
- **Create discussion** — form for title, body, course tag; honor code check before submit

**User:**
- **User profile** — display name, school, enrolled courses; add/remove courses

**Sessions (secondary):**
- **Session feed** — real-time list of active sessions, join button
- **Post a session** — form for course tag, location, work description; honor code check before submit

All data logic lives in `src/lib/`. Pages should import from there and focus on rendering and user interaction only.

# BetterEd

Real-time student collaboration platform. Students post what they're working on — course, location, task — and other students can see who's around and join them. Built for university students: .edu emails only.

---

## Backend Status

The backend is complete. All Firebase logic lives in `src/lib/` and is ready to wire into UI pages.

| Module | What's done |
|---|---|
| **Auth** | Google sign-in, .edu enforcement, auth state listener |
| **Sessions** | Create, join, expire, real-time listener for active sessions |
| **Users** | Profile creation on first sign-in, course enrollment |
| **Courses** | Create courses, fetch course data, check collaboration policy |
| **Honor Code** | Syllabus keyword scan → blocks session posting if collaboration not allowed |
| **Firestore rules** | Security rules written and ready to deploy |

**What's left: the frontend.** UI pages need to be built that call these lib functions.

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

These are the UI pages that need to be created in `app/`:

- **Sign-in page** — Google OAuth button, redirect after auth
- **Session feed** — real-time list of active sessions, join button
- **Post a session** — form for course tag, location, work description; honor code check before submit
- **User profile** — display name, school, enrolled courses
- **Course enrollment** — add courses to your profile

All data logic is already in `src/lib/`. Pages should import from there and focus on rendering and user interaction only.

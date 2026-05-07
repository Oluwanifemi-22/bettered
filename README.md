# BetterEd

Real-time student collaboration platform. Students post what they're working on (course, location, task) and others nearby can join. Built for university students — .edu emails only.

## Tech Stack

- **Next.js** (App Router) + **Tailwind CSS**
- **Firebase Auth** — Google sign-in, gated to .edu addresses
- **Firestore** — real-time session feed, user profiles, course data

## Project Structure

```
src/lib/          # All Firebase logic (auth, sessions, users, courses, honorCode)
app/              # Next.js App Router pages and layouts
firestore.rules   # Security rules for Firestore
```

## Setup

### 1. Clone and install dependencies

```bash
git clone <repo-url>
cd bettered
npm install
```

### 2. Create a Firebase project

1. Go to [Firebase Console](https://console.firebase.google.com) and create a project.
2. Enable **Authentication** → Sign-in method → **Google**.
3. Enable **Firestore Database** (start in test mode, then deploy `firestore.rules`).
4. Register a **Web app** and copy the config values.

### 3. Configure environment variables

Create a `.env.local` file in the project root:

```env
NEXT_PUBLIC_FIREBASE_API_KEY=your_api_key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id
```

### 4. Deploy Firestore security rules

```bash
firebase deploy --only firestore:rules
```

### 5. Run locally

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Milestone 1 (May 8) — MVP: Discussion Forum + Real-time Sessions

### Backend (Kenaj) — Branch: backend/discussions — currently in progress
- [x] Auth + .edu gating
- [x] Real-time sessions (CRUD + listener)
- [x] Create src/lib/discussions.ts — createDiscussion, getDiscussionsByClass, replyToDiscussion, listenToDiscussions
- [x] Add /discussions/{id} to Firestore schema
- [x] Update Firestore rules to cover all collections (users, sessions, courses, discussions)
- [ ] Honor code — refine keyword detection logic, test against syllabi
- [ ] Search/filter utilities — filterByClass, filterByKeyword

### Frontend (Otis) — Landing Page (Discussion Forum) — Branch: frontend/landing-discussions
- [ ] Main landing shows discussion threads (not sessions)
- [ ] Search bar (by class, by keyword)
- [ ] Filter tabs (by class, unanswered, etc.)
- [ ] Click thread to open detail view

### Frontend (Otis) — Discussion Detail — Branch: frontend/discussion-detail
- [ ] Display full thread
- [ ] Reply form and reply list
- [ ] Link to join in-person session (if available)

### Frontend — Create Discussion — Branch: frontend/create-discussion
- [ ] Form: title, body, course tag
- [ ] Honor code check before submit
- [ ] Submit to Firestore

### Frontend — User Profile — Branch: frontend/user-profile
- [ ] Display: name, school, enrolled classes
- [ ] Add/remove classes from profile

## Post-Milestone (June 5)
- Advanced filtering
- Schedule/office hours system
- Design polish
- Mobile responsiveness

## Notes
- Each person works on own branch: git checkout -b branch-name
- Push to origin, make PR before merging to main
- Discussions are the main landing page (80% on-platform interaction)
- Sessions are still there but secondary feature

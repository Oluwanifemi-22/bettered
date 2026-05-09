## Milestone 1 (May 8) — ✅ MVP Backend + Baseline Frontend (Discussion Forum and Sessions)

### Backend (Kenaj) — Branch: main — ✅ Complete
- [x] Auth + .edu gating
- [x] Real-time sessions (CRUD + listener)
- [x] Create src/lib/discussions.ts — createDiscussion, getDiscussionsByClass, replyToDiscussion, listenToDiscussions
- [x] Add /discussions/{id} to Firestore schema
- [x] Update Firestore rules to cover all collections (users, sessions, courses, discussions)
- [ ] Honor code — refine keyword detection logic, test against syllabi (Frontend + Backend)
- [ ] Search/filter utilities — filterByClass, filterByKeyword (Frontend + Backend)

### Frontend (Otis) — Landing Page (Discussion Forum) — Branch: frontend/landing-discussions — ✅ Merged
- [x] Main landing shows discussion threads (not sessions)
- [x] Search bar (by class, by keyword)
- [x] Filter tabs (by class, unanswered, etc.)
- [ ] Click thread to open detail view

### Frontend (Otis) — Discussion Detail — Branch: frontend/discussion-detail
- [ ] Display full thread
- [ ] Reply form and reply list
- [ ] Link to join in-person session (if available)

### Frontend — Create Discussion — Branch: frontend/create-discussion
- [x] Form: title, body, course tag
- [ ] Honor code check before submit
- [ ] Submit to Firestore

### Frontend — User Profile — Branch: frontend/user-profile
- [ ] Display: name, school, enrolled classes
- [ ] Add/remove classes from profile

## Post-Milestone (June 5)
- Flesh out Frontend features above + connect with backend
- Advanced filtering
- Schedule/office hours system
- Design polish
- Mobile responsiveness

## Notes
- Each person works on own branch: git checkout -b branch-name
- Push to origin, make PR before merging to main
- Discussions are the main landing page (80% on-platform interaction)
- Sessions are still there but secondary feature

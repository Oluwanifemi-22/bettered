## Milestone 1 (May 8) — MVP: Discussion Forum + Real-time Sessions

### Backend (Kenaj) — Branch: backend/discussions
- [x] Auth + .edu gating
- [x] Real-time sessions (CRUD + listener)
- [ ] Honor code — refine keyword detection logic, test against syllabi
- [ ] Create src/lib/discussions.ts — createDiscussion, getDiscussionsByClass, replyToDiscussion, listenToDiscussions
- [ ] Add /discussions/{id} and /replies/{id} to Firestore schema
- [ ] Search/filter utilities — filterByClass, filterByKeyword
- [ ] Update Firestore rules to cover discussions and replies collections

### Frontend — Landing Page (Discussion Forum) — Branch: frontend/landing-discussions
- [ ] Main landing shows discussion threads (not sessions)
- [ ] Search bar (by class, by keyword)
- [ ] Filter tabs (by class, unanswered, etc.)
- [ ] Click thread to open detail view

### Frontend — Discussion Detail — Branch: frontend/discussion-detail
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

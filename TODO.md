# TODO Backend

## ✅ Completed

- [x] Initial project setup with TypeScript, Fastify, and PostgreSQL
- [x] Household onboarding endpoints (create household, list households)
- [x] Invitation system (create, accept, cancel, resend invitations)
- [x] Email delivery with Resend and Gmail SMTP providers
- [x] Deep link handling for mobile app invitations
- [x] Audit events for tracking invitation lifecycle
- [x] Member management (list, remove, update role)
- [x] Medication CRUD endpoints (create, read, update, delete)
- [x] Medication autocomplete with French drug database integration
- [x] Migration 005: Fix UUID issue for Google OAuth user IDs in medications
- [x] Fix DELETE endpoint to return 204 No Content
- [x] Fix Fastify JSON parser to allow empty body on DELETE requests

## 🔍 In Progress / Debug

### Invitation Acceptance Flow Investigation
- [x] Add detailed logs in PostgresHouseholdRepository.acceptInvitation()
- [x] Logs show requester info, token validation, invitation found, member creation
- [ ] Monitor Railway logs to identify if issue is in app or backend
- [ ] Verify members are created correctly in production database
- [ ] Document findings in INVITATION_DEBUGGING_SUMMARY.md

**Debug checklist:**
- [x] Verify endpoint is called from mobile app
- [x] Check token validation works
- [x] Confirm invitation is found in database
- [x] Validate email matching logic
- [x] Ensure member INSERT/UPDATE executes
- [x] Confirm transaction commits successfully

---

## 📝 Reference Documentation

### Existing Endpoints

#### POST /v1/households/invitations/accept
- [x] Endpoint implemented and tested
- **URL:** `https://seniorhub-backend-production.up.railway.app/v1/households/invitations/accept`
- **Authentication:** Required (x-user-id, x-user-email, x-user-first-name, x-user-last-name headers)
- **Functionality:** Validates token, creates member, updates invitation status

#### GET /v1/invitations/accept-link (PUBLIC)
- [x] Endpoint implemented and tested
- **URL:** `https://seniorhub-backend-production.up.railway.app/v1/invitations/accept-link?token=XXX`
- **Functionality:** Handles deep link redirection for mobile app (seniorhub://) or web

---

## 📅 Future Features

### Advanced Medication Reminders System

**Status:** 🔮 Planned (not started)

**Objective:** Replace simple `schedule: string[]` with flexible reminder rules

**Requirements:**
- [ ] Support day-of-week selection (e.g., "Monday-Friday at 8am")
- [ ] Allow multiple reminders per medication with different rules
- [ ] Enable/disable individual reminders

**Database Design:**
- [ ] Create `medication_reminders` table with:
  - `id`, `medication_id`, `time`, `days_of_week[]`, `enabled`
  - Foreign key cascade delete on medication deletion
  - Index on `medication_id`

**API Endpoints to Create:**
- [ ] POST `/v1/households/:householdId/medications/:medicationId/reminders` - Create reminder
- [ ] GET `/v1/households/:householdId/medications/:medicationId/reminders` - List reminders
- [ ] PUT `/v1/households/:householdId/medications/:medicationId/reminders/:reminderId` - Update reminder
- [ ] DELETE `/v1/households/:householdId/medications/:medicationId/reminders/:reminderId` - Delete reminder

**Migration Strategy:**
- [ ] Create new `medication_reminders` table (migration 006)
- [ ] Migrate existing `medications.schedule` data to new table
- [ ] Keep `medications.schedule` for backward compatibility during transition
- [ ] Deprecate and eventually remove `medications.schedule` after app migration

**Example Configurations:**
- Daily at 8am: `{time: '08:00', days_of_week: [0,1,2,3,4,5,6]}`
- Weekdays at 8am: `{time: '08:00', days_of_week: [1,2,3,4,5]}`
- Mon/Wed/Fri at 8am & 8pm: Two reminders with `days_of_week: [1,3,5]`

---

## 🎯 Additional Future Endpoints

### Medication Tracking & History
- [ ] POST `/v1/households/:householdId/medications/:medicationId/doses` - Log dose taken
- [ ] GET `/v1/households/:householdId/medications/:medicationId/history` - View dose history
- [ ] GET `/v1/households/:householdId/medications/:medicationId/adherence` - Calculate adherence rate

### Health Monitoring
- [ ] POST `/v1/households/:householdId/health-records` - Add vital signs, symptoms
- [ ] GET `/v1/households/:householdId/health-records` - Retrieve health timeline
- [ ] GET `/v1/households/:householdId/health-reports` - Generate health summary reports

### Document Management
- [ ] POST `/v1/households/:householdId/documents` - Upload medical documents
- [ ] GET `/v1/households/:householdId/documents` - List documents
- [ ] DELETE `/v1/households/:householdId/documents/:documentId` - Remove document

### Caregiver Coordination
- [ ] POST `/v1/households/:householdId/tasks` - Create care tasks
- [ ] GET `/v1/households/:householdId/tasks` - List tasks with assignments
- [ ] PATCH `/v1/households/:householdId/tasks/:taskId` - Update task status
- [ ] POST `/v1/households/:householdId/notes` - Share care notes between caregivers

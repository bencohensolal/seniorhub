# Backend TODO

## ✅ FIXED - URGENT BUG - GET /v1/households/:householdId/members

**Status:** FIXED on 2026-01-03

**Root Cause:** Multiple use cases had swapped parameters when calling `HouseholdAccessValidator.ensureMember()`.
- Expected signature: `ensureMember(userId: string, householdId: string)`
- Incorrect calls were passing: `ensureMember(householdId, userId)` ❌

**Files Fixed:**
1. ✅ `src/domain/usecases/households/ListHouseholdMembersUseCase.ts`
2. ✅ `src/domain/usecases/invitations/ListHouseholdInvitationsUseCase.ts`
3. ✅ `src/domain/usecases/households/GetHouseholdOverviewUseCase.ts`
4. ✅ `src/domain/usecases/households/EnsureHouseholdRoleUseCase.ts`

**Already Correct:**
- ✅ `src/domain/usecases/households/LeaveHouseholdUseCase.ts`
- ✅ `src/domain/usecases/reminders/ListMedicationRemindersUseCase.ts`
- ✅ `src/domain/usecases/medications/ListHouseholdMedicationsUseCase.ts`

---

## Autres TODOs

(à compléter)

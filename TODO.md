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

## Endpoints Disponibles

### POST /v1/households/invitations/accept

**URL:** `https://seniorhub-backend-production.up.railway.app/v1/households/invitations/accept`

**Method:** POST

**Headers (Required):**
```
x-user-id: <supabase_user_id>
x-user-email: <user_email>
x-user-first-name: <first_name>
x-user-last-name: <last_name>
Content-Type: application/json
```

**Body:**
```json
{
  "token": "22db9a60-6852-4b6c-a5a9-49d216f5b89e..."
}
```

**Response Success (200):**
```json
{
  "status": "success",
  "data": {
    "householdId": "3617e173-d359-492b-94b7-4c32622e7526",
    "role": "caregiver"
  }
}
```

**Ce que fait cet endpoint:**
1. Valide le token
2. Trouve l'invitation correspondante
3. Vérifie que l'email du requester correspond à l'invitation
4. Met à jour l'invitation (status = 'accepted')
5. **CRÉE LE MEMBRE** dans household_members avec status = 'active'
6. Retourne householdId et role

**Note:** Le code crée bien le membre. Si le membre n'apparaît pas, c'est soit:
- L'appel n'arrive jamais au backend
- Une erreur se produit (logs montreront laquelle)
- La transaction est rollback (logs montreront pourquoi)

---

### GET /v1/invitations/accept-link (PUBLIC)

**URL:** `https://seniorhub-backend-production.up.railway.app/v1/invitations/accept-link?token=XXX`

**Ce que fait cet endpoint:**
1. Valide le token
2. Détecte si mobile (User-Agent)
3. Si mobile → redirige vers `seniorhub://invitation/accept?token=XXX`
4. Si web → redirige vers frontend web

**Important:** Ce endpoint fait la redirection vers l'app mobile. L'app doit ensuite:
1. Recevoir le deep link
2. Extraire le token
3. Stocker le token
4. Attendre que user s'authentifie
5. Appeler POST /v1/households/invitations/accept avec le token

---

## 📅 Système de rappels de médicaments avancé

### Besoin

Le système actuel de rappels (`schedule: string[]`) est trop simple. Il faut permettre :
- Rappels avec sélection des jours de la semaine (ex: "lundi-vendredi à 8h")
- Plusieurs rappels avec des règles différentes par médicament
- Activation/désactivation individuelle des rappels

### Structure proposée

**Nouvelle table `medication_reminders` :**
```sql
CREATE TABLE medication_reminders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  medication_id UUID NOT NULL REFERENCES medications(id) ON DELETE CASCADE,
  time TIME NOT NULL,                    -- Heure du rappel (ex: 08:00)
  days_of_week INTEGER[] NOT NULL,       -- Jours: 0=Dimanche, 1=Lundi, ..., 6=Samedi
  enabled BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_medication_reminders_medication ON medication_reminders(medication_id);
```

**Exemples de configuration:**
- Tous les jours à 8h: `{time: '08:00', days_of_week: [0,1,2,3,4,5,6]}`
- Lundi-vendredi à 8h: `{time: '08:00', days_of_week: [1,2,3,4,5]}`
- Lundi-mercredi-vendredi à 8h et 20h: 
  - `{time: '08:00', days_of_week: [1,3,5]}`
  - `{time: '20:00', days_of_week: [1,3,5]}`

### Endpoints à créer

**POST /v1/households/:householdId/medications/:medicationId/reminders**
- Créer un nouveau rappel pour un médicament

**GET /v1/households/:householdId/medications/:medicationId/reminders**
- Lister tous les rappels d'un médicament

**PUT /v1/households/:householdId/medications/:medicationId/reminders/:reminderId**
- Modifier un rappel (heure, jours, actif/inactif)

**DELETE /v1/households/:householdId/medications/:medicationId/reminders/:reminderId**
- Supprimer un rappel

### Migration

1. Créer table `medication_reminders`
2. Migrer données existantes de `medications.schedule` vers les nouveaux reminders
3. Garder `medications.schedule` pour rétrocompatibilité temporaire
4. Déprécier puis supprimer `medications.schedule` après migration app

---

## Autres endpoints en attente

_(liste des autres fonctionnalités à implémenter)_

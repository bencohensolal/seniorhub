# Task Enhancements - Implementation Progress

## 🎯 Objectif
Ajouter le support pour:
1. `duration` sur les tasks (en minutes)
2. Nouveau format de rappels: `triggerBefore` + `customMessage` (style rendez-vous)
3. Support de `yearly` dans RecurrenceFrequency (déjà présent ✅)
4. `dayOfMonth` dans TaskRecurrence

## ✅ Terminé

### 1. Entities & Types
- ✅ `src/domain/entities/Task.ts` - Ajouté `duration: number | null` 
- ✅ `src/domain/entities/Task.ts` - Ajouté `dayOfMonth?: number` dans TaskRecurrence
- ✅ `src/domain/entities/TaskReminder.ts` - Dual format support (legacy + nouveau)
  - Legacy: `time` + `daysOfWeek` (pour tâches récurrentes sans date/heure)
  - Nouveau: `triggerBefore` + `customMessage` (pour tâches avec date/heure)

### 2. Database Migration
- ✅ `migrations/012_tasks_enhancements.sql` - Créée avec:
  - Ajout colonne `duration` dans table `tasks`
  - Modification `task_reminders` pour supporter les deux formats
  - Contrainte CHECK assurant un seul format par rappel

### 3. Helpers
- ✅ `src/data/repositories/postgres/helpers.ts` - Mis à jour
  - `mapTask()` - Inclut maintenant `duration`
  - `mapTaskReminder()` - Supporte les nouveaux champs (`triggerBefore`, `customMessage`)

## ⏳ En Cours / À Faire

### 4. PostgresHouseholdRepository (CRITIQUE - BLOQUANT)
**Fichier:** `src/data/repositories/PostgresHouseholdRepository.ts`

#### Requêtes Tasks à mettre à jour:

**A. listHouseholdTasks() - Line ~1970**
```sql
-- AJOUTER 'duration' après 'due_time' dans SELECT
SELECT id, household_id, senior_id, caregiver_id, title, description,
       category, priority, status, due_date, due_time, duration, recurrence::text,
       ...
```

**B. getTaskById() - Line ~2050**
```sql
-- AJOUTER 'duration' dans SELECT
SELECT id, household_id, senior_id, caregiver_id, title, description,
       category, priority, status, due_date, due_time, duration, recurrence::text,
       ...
```

**C. createTask() - Line ~2100**
```sql
-- INSERT: Ajouter 'duration' dans la liste des colonnes ET values
INSERT INTO tasks (
   id, household_id, senior_id, caregiver_id, title, description,
   category, priority, status, due_date, due_time, duration, recurrence,
   created_at, updated_at, created_by
)
VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'pending', $9, $10, $11, $12, $13, $13, $14)
                                                          ^^^^ ajouter ici
-- Et dans le RETURNING aussi
RETURNING id, household_id, senior_id, caregiver_id, title, description,
          category, priority, status, due_date, due_time, duration, recurrence::text,
          ...
```

**D. updateTask() - Line ~2150**
```sql
-- Ajouter support pour mise à jour de duration
if (input.duration !== undefined) {
  updates.push(`duration = $${paramIndex++}`);
  values.push(input.duration);
}

-- Et dans le RETURNING
RETURNING id, household_id, senior_id, caregiver_id, title, description,
          category, priority, status, due_date, due_time, duration, recurrence::text,
          ...
```

**E. completeTask() - Line ~2200**
```sql
-- RETURNING doit inclure 'duration'
RETURNING id, household_id, senior_id, caregiver_id, title, description,
          category, priority, status, due_date, due_time, duration, recurrence::text,
          ...
```

#### Requêtes TaskReminders à mettre à jour:

**F. listTaskReminders() - Line ~2250**
```sql
-- AJOUTER trigger_before, custom_message
SELECT r.id, r.task_id, r.time, r.days_of_week, r.trigger_before, r.custom_message,
       r.enabled, r.created_at, r.updated_at
FROM task_reminders r
...
```

**G. getTaskReminderById() - Line ~2270**
```sql
-- AJOUTER trigger_before, custom_message
SELECT r.id, r.task_id, r.time, r.days_of_week, r.trigger_before, r.custom_message,
       r.enabled, r.created_at, r.updated_at
...
```

**H. createTaskReminder() - Line ~2290**
```sql
-- METTRE À JOUR pour supporter les deux formats
-- Legacy format
if (input.time && input.daysOfWeek) {
  INSERT INTO task_reminders (id, task_id, time, days_of_week, trigger_before, custom_message, enabled, created_at, updated_at)
  VALUES ($1, $2, $3, $4, NULL, NULL, $5, $6, $6)
}
-- New format
else if (input.triggerBefore) {
  INSERT INTO task_reminders (id, task_id, time, days_of_week, trigger_before, custom_message, enabled, created_at, updated_at)
  VALUES ($1, $2, NULL, NULL, $3, $4, $5, $6, $6)
}

-- RETURNING doit inclure tous les champs
RETURNING id, task_id, time, days_of_week, trigger_before, custom_message, enabled, created_at, updated_at
```

**I. updateTaskReminder() - Line ~2320**
```sql
-- Supporter les mises à jour des deux formats
if (input.triggerBefore !== undefined) {
  updates.push(`trigger_before = $${paramIndex++}`);
  values.push(input.triggerBefore);
}
if (input.customMessage !== undefined) {
  updates.push(`custom_message = $${paramIndex++}`);
  values.push(input.customMessage);
}

-- RETURNING doit inclure tous les champs
RETURNING r.id, r.task_id, r.time, r.days_of_week, r.trigger_before, r.custom_message, r.enabled, r.created_at, r.updated_at
```

### 5. InMemoryHouseholdRepository
**Fichier:** `src/data/repositories/InMemoryHouseholdRepository.ts`

Même modifications que PostgresHouseholdRepository mais pour les structures en mémoire.

### 6. API Schemas
**Fichier:** `src/routes/households/taskSchemas.ts`

#### À ajouter:
```typescript
// Dans createTaskBodySchema
duration: z.number().int().positive().optional(),

// Dans updateTaskBodySchema
duration: z.number().int().positive().nullable().optional(),

// Dans createTaskReminderBodySchema - Rendre mutuellement exclusifs
const createTaskReminderBodySchema = z.union([
  // Legacy format
  z.object({
    time: z.string().regex(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/),
    daysOfWeek: z.array(z.number().int().min(0).max(6)).min(1),
    enabled: z.boolean().optional(),
  }),
  // New format
  z.object({
    triggerBefore: z.number().int().positive(),
    customMessage: z.string().max(500).optional(),
    enabled: z.boolean().optional(),
  }),
]);

// Dans updateTaskReminderBodySchema
triggerBefore: z.number().int().positive().nullable().optional(),
customMessage: z.string().max(500).nullable().optional(),
```

### 7. Use Cases
**Fichiers:** `src/domain/usecases/tasks/*.ts`

Vérifier que tous les use cases passent correctement les nouvelles propriétés. Normalement, ils devraient déjà fonctionner car ils passent les `input` tels quels.

### 8. Routes API
**Fichier:** `src/routes/households/taskRoutes.ts`

Vérifier que les schémas de validation utilisent bien les schémas mis à jour. La validation devrait être automatiquement compatible une fois les schémas mis à jour.

## 🧪 Tests à Effectuer

1. **Migration SQL**
   ```bash
   npm run migrate
   ```

2. **Build TypeScript**
   ```bash
   npm run build
   ```

3. **Tests API**
   - Créer une tâche avec `duration`
   - Créer un rappel legacy (time + daysOfWeek)
   - Créer un rappel nouveau format (triggerBefore + customMessage)
   - Vérifier que la contrainte DB empêche les formats mixtes

## 📝 Notes de Migration

### Pour l'App Mobile
1. **Rétrocompatibilité**: Les anciens rappels continuent de fonctionner
2. **Nouveau format**: Utilisé uniquement pour les tâches avec `dueDate` + `dueTime`
3. **Validation**: Le backend rejette les rappels avec format mixte

### Contrainte DB Importante
```sql
-- Un rappel doit avoir SOIT legacy SOIT nouveau format, pas les deux
CHECK (
  (time IS NOT NULL AND days_of_week IS NOT NULL AND trigger_before IS NULL)
  OR
  (time IS NULL AND days_of_week IS NULL AND trigger_before IS NOT NULL)
)
```

## 🚀 Prochaines Étapes

1. ✅ Terminer les modifications dans PostgresHouseholdRepository
2. ✅ Mettre à jour InMemoryHouseholdRepository  
3. ✅ Mettre à jour les schémas API
4. ✅ Exécuter la migration
5. ✅ Tester avec l'app mobile
6. ✅ Commit & Push

## 💡 Améliorations Futures

- [ ] Ajouter validation business: rappel nouveau format nécessite `dueDate` + `dueTime`
- [ ] Ajouter endpoint pour migrer les anciens rappels vers nouveau format
- [ ] Ajouter tests unitaires pour les deux formats de rappels
- [ ] Documentation utilisateur sur les deux formats

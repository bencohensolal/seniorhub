# Troubleshooting: Invitations Non Reçues

## Problème Actuel

**Symptôme**: Les invitations ne semblent pas être enregistrées et les emails ne sont pas reçus.

## Explication

### 1. Emails en Mode Développement

**Le système actuel n'envoie PAS de vrais emails** ! Il utilise `ConsoleEmailProvider` qui :
- ✅ Affiche les emails dans les logs du serveur
- ❌ N'envoie PAS d'emails réels

Les emails d'invitation sont visibles dans la console où le serveur est lancé, pas dans une vraie boîte mail.

### 2. Vérification de la Persistance

Les invitations SONT enregistrées en base SI vous utilisez PostgreSQL.

## Diagnostic Étape par Étape

### Étape 1: Vérifier la Persistence

```bash
# Dans api/
cat .env | grep PERSISTENCE_DRIVER
```

**Résultats possibles**:
- `PERSISTENCE_DRIVER=postgres` → Base de données persistante ✅
- `PERSISTENCE_DRIVER=in-memory` → Données en mémoire (perdues au restart) ⚠️
- Rien → Par défaut `in-memory` ⚠️

**Solution si in-memory**:
```bash
# Dans api/.env
PERSISTENCE_DRIVER=postgres
DATABASE_URL=postgresql://user:password@localhost:5432/seniorhub
```

### Étape 2: Vérifier les Invitations en Base

```bash
# Se connecter à PostgreSQL
psql $DATABASE_URL

# Lister les invitations
SELECT 
  id,
  invitee_email,
  invitee_first_name,
  invitee_last_name,
  assigned_role,
  status,
  created_at
FROM household_invitations
ORDER BY created_at DESC
LIMIT 10;

# Vérifier le household
SELECT id, name, created_by_user_id FROM households;
```

**Ce que vous devriez voir**:
- Des lignes avec `status = 'pending'` pour les invitations récentes
- `invitee_email` contenant les emails que vous avez invités

### Étape 3: Voir les Emails dans les Logs

Les emails sont affichés dans la console du serveur. Cherchez:

```
================================================================================
📧 INVITATION EMAIL (Development Mode - Not Actually Sent)
================================================================================
To: email@example.com
Subject: You're invited to join a Senior Hub household
--------------------------------------------------------------------------------
[Le contenu HTML de l'email avec le lien d'invitation]
================================================================================
```

**Si vous ne voyez pas ça**:
1. Vérifiez que le serveur est lancé dans un terminal
2. Regardez la sortie console du serveur
3. L'email apparaît immédiatement après l'appel API

### Étape 4: Tester Manuellement

```bash
# Test avec curl
curl -X POST http://localhost:4000/v1/households/YOUR_HOUSEHOLD_ID/invitations/bulk \
  -H "Content-Type: application/json" \
  -H "x-user-id: YOUR_USER_ID" \
  -H "x-user-email: YOUR_EMAIL" \
  -H "x-user-first-name: Your" \
  -H "x-user-last-name: Name" \
  -d '{
    "users": [
      {
        "firstName": "Test",
        "lastName": "User",
        "email": "test@example.com",
        "role": "senior"
      }
    ]
  }'
```

**Réponse attendue**:
```json
{
  "status": "success",
  "data": {
    "acceptedCount": 1,
    "skippedDuplicates": 0,
    "perUserErrors": [],
    "deliveries": [
      {
        "invitationId": "...",
        "inviteeEmail": "test@example.com",
        "status": "sent",
        "deepLinkUrl": "seniorhub://invite?type=household-invite&token=...",
        "fallbackUrl": null,
        "reason": null
      }
    ]
  }
}
```

### Étape 5: Vérifier les Métriques

```bash
curl http://localhost:4000/v1/observability/invitations/email-metrics
```

**Réponse**:
```json
{
  "status": "success",
  "data": {
    "queued": 5,    // Nombre d'emails mis en queue
    "sent": 5,      // Nombre d'emails "envoyés" (affichés en console)
    "failed": 0,    // Erreurs
    "retries": 0,   // Tentatives de retry
    "deadLetter": 0 // Emails abandonnés
  }
}
```

## Solutions selon le Problème

### Problème: "Les invitations ne sont pas en base"

**Causes possibles**:
1. ❌ `PERSISTENCE_DRIVER=in-memory` (données perdues au restart)
2. ❌ Erreur lors de l'insertion (vérifier logs serveur)
3. ❌ Transaction rollback (vérifier logs d'erreur)

**Solution**:
```bash
# 1. Activer PostgreSQL
echo "PERSISTENCE_DRIVER=postgres" >> api/.env
echo "DATABASE_URL=postgresql://..." >> api/.env

# 2. Lancer les migrations
cd api && npm run migrate

# 3. Redémarrer le serveur
npm run dev
```

### Problème: "Je ne vois pas les emails"

**Causes possibles**:
1. ❌ Vous cherchez dans votre vraie boîte mail (ils ne sont PAS envoyés!)
2. ❌ Vous ne regardez pas les logs du serveur
3. ❌ Les logs sont cachés par d'autres messages

**Solution**:
```bash
# Lancer le serveur avec les logs visibles
cd api && npm run dev

# Dans un autre terminal, envoyer une invitation
# Retourner au terminal du serveur pour voir l'email
```

### Problème: "Je veux de VRAIS emails"

Pour envoyer de vrais emails en développement, plusieurs options:

#### Option 1: MailDev (recommandé pour dev)

```bash
# Installer MailDev
npm install -g maildev

# Lancer MailDev
maildev

# Ouvrir l'UI web
open http://localhost:1080
```

Puis modifier `api/src/data/services/email/invitationEmailRuntime.ts`:
```typescript
import { MailDevEmailProvider } from './MailDevEmailProvider.js';

const provider = new MailDevEmailProvider();
```

#### Option 2: Nodemailer + Gmail (pour staging/production)

```bash
npm install nodemailer
```

Créer `GmailEmailProvider.ts` avec votre configuration SMTP.

#### Option 3: Service email (production)

- SendGrid
- AWS SES
- Mailgun
- Postmark

## Checklist de Vérification

- [ ] `PERSISTENCE_DRIVER=postgres` dans `.env`
- [ ] `DATABASE_URL` configurée
- [ ] Migrations exécutées (`npm run migrate`)
- [ ] Serveur lancé et logs visibles
- [ ] Requête POST vers `/invitations/bulk` retourne `success`
- [ ] Email visible dans les logs console
- [ ] Invitation visible en base (requête SQL)
- [ ] Métriques montrent `sent > 0`

## Déboguer Plus en Détail

### Activer les logs détaillés

Dans `api/src/app.ts`, le logger est déjà configuré. Pour plus de détails:

```bash
# Lancer avec plus de logs
DEBUG=* npm run dev
```

### Inspecter la base de données

```sql
-- Compter les invitations
SELECT status, COUNT(*) 
FROM household_invitations 
GROUP BY status;

-- Voir les dernières invitations
SELECT 
  i.invitee_email,
  i.status,
  i.created_at,
  h.name as household_name
FROM household_invitations i
JOIN households h ON h.id = i.household_id
ORDER BY i.created_at DESC
LIMIT 10;
```

## Support

Si le problème persiste:
1. Vérifier les logs complets du serveur
2. Exécuter les requêtes SQL ci-dessus
3. Partager les résultats des métriques
4. Vérifier que l'authentification est correcte (headers x-user-*)

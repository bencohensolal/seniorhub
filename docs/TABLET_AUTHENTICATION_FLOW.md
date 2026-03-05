# Tablet Authentication Flow

## Architecture Overview

Les tablettes utilisent une **authentification en 2 étapes avec JWT** pour tous les appels API.

**Pourquoi ce choix ?**
- ✅ Plus sécurisé : le token brut (64 chars) ne transite qu'une seule fois
- ✅ JWT contient déjà householdId et permissions (pas de lookup DB à chaque requête)
- ✅ Standard : même pattern que l'authentification user

---

## Step 1: Initial Authentication

La tablette s'authentifie une fois au démarrage avec ses credentials bruts.

### Request

```http
POST /v1/display-tablets/authenticate
Content-Type: application/json

{
  "tabletId": "uuid-de-la-tablette",
  "token": "64-hex-char-token"
}
```

**Headers requis :** Aucun (endpoint public)

### Response (Success)

```json
{
  "status": "success",
  "data": {
    "sessionToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "householdId": "uuid-du-household",
    "householdName": "Famille Dupont",
    "permissions": ["read:config", "read:data"]
  }
}
```

### Response (Error)

```json
{
  "status": "error",
  "message": "Invalid tablet credentials or tablet is not active."
}
```

**Le `sessionToken` est un JWT qui contient :**
- `tabletId`
- `householdId`
- `permissions`
- Expiration (24h par défaut)

---

## Step 2: Use Session Token for All Subsequent Calls

Une fois le `sessionToken` obtenu, la tablette l'utilise pour **TOUS les appels API**.

### Header Format

```
x-tablet-session-token: {sessionToken}
```

### Exemple : Get Configuration

```http
GET /v1/households/{householdId}/display-tablets/{tabletId}/config
x-tablet-session-token: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### Exemple : SSE Config Updates (Real-time)

```http
GET /v1/households/{householdId}/display-tablets/{tabletId}/config-updates
x-tablet-session-token: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**Important :** Le sessionToken est requis pour :
- ✅ Lire la configuration (`GET /config`)
- ✅ S'abonner aux mises à jour SSE (`GET /config-updates`)
- ✅ Tous les futurs endpoints tablette

---

## Step 3: SSE Connection (Real-time Updates)

Une fois authentifiée, la tablette établit une connexion SSE persistante.

### TypeScript/React Native Example

```typescript
import { EventSource } from 'react-native-sse';

// 1. Authenticate and get sessionToken
const authResponse = await fetch(`${API_URL}/v1/display-tablets/authenticate`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    tabletId: TABLET_ID,
    token: TABLET_TOKEN,
  }),
});

const { sessionToken, householdId } = await authResponse.json();

// 2. Connect to SSE with sessionToken
const eventSource = new EventSource(
  `${API_URL}/v1/households/${householdId}/display-tablets/${TABLET_ID}/config-updates`,
  {
    headers: {
      'x-tablet-session-token': sessionToken,
    },
  }
);

// 3. Listen to events
eventSource.addEventListener('message', (event) => {
  const data = JSON.parse(event.data);
  
  switch (data.type) {
    case 'connected':
      console.log('✅ Connected to config update stream');
      break;
      
    case 'config-updated':
      console.log('🔄 Config updated! Refreshing...');
      await fetchAndApplyNewConfig();
      break;
      
    case 'heartbeat':
      // Keep-alive (every 30s)
      break;
  }
});

eventSource.addEventListener('error', (error) => {
  console.error('SSE error:', error);
  // Implement reconnection logic
});
```

---

## Step 4: Token Refresh (when expired)

Si le sessionToken expire (après 24h), la tablette doit se ré-authentifier.

### Detection

Le backend retournera une erreur 401 :

```json
{
  "status": "error",
  "message": "Invalid or expired tablet session token."
}
```

### Action

Re-faire l'étape 1 (POST /authenticate) pour obtenir un nouveau sessionToken.

---

## Complete Flow Diagram

```
┌─────────────┐
│   Tablet    │
│   Starts    │
└──────┬──────┘
       │
       ▼
┌─────────────────────────────────────────┐
│ POST /authenticate                      │
│ Body: { tabletId, token }               │
└──────┬──────────────────────────────────┘
       │
       ▼
┌─────────────────────────────────────────┐
│ Receive sessionToken (JWT)              │
│ Store in memory/secure storage          │
└──────┬──────────────────────────────────┘
       │
       ├───────────────────┬─────────────────────┐
       ▼                   ▼                     ▼
┌────────────────┐  ┌──────────────┐  ┌────────────────┐
│ GET /config    │  │ GET /config- │  │ Future tablet  │
│ with session   │  │ updates (SSE)│  │ endpoints      │
│ token          │  │ with session │  │ with session   │
│                │  │ token        │  │ token          │
└────────────────┘  └──────┬───────┘  └────────────────┘
                           │
                           ▼
                  ┌────────────────────┐
                  │ Receive real-time  │
                  │ config updates     │
                  └────────────────────┘
```

---

## Security Considerations

### ✅ Advantages

1. **Token brut ne transite qu'une fois** : Réduit le risque d'interception
2. **JWT auto-contenu** : Pas de lookup DB à chaque requête
3. **Expiration automatique** : Force le renouvellement périodique
4. **Validation stricte** : Le backend vérifie signature + expiration + tabletId + householdId

### 🔒 Best Practices

1. **Stocker le sessionToken de manière sécurisée** (Expo SecureStore ou équivalent)
2. **Ne jamais logger le token complet** (uniquement les 20 premiers chars)
3. **Implémenter une reconnexion automatique** pour SSE en cas de déconnexion
4. **Gérer l'expiration du token** (401 → re-authenticate)

---

## Error Handling

### 401 Unauthorized

**Cause :** Token manquant, invalide ou expiré

**Action :** Re-authenticate (POST /authenticate)

### 403 Forbidden

**Cause :** Tablet essaie d'accéder à la config d'une autre tablette

**Action :** Vérifier que tabletId dans l'URL correspond à la tablette authentifiée

### 500 Internal Server Error

**Cause :** Erreur serveur (rare)

**Action :** Retry avec exponential backoff

---

## FAQ

### Q: Combien de temps le sessionToken est-il valide ?

**R:** 24 heures par défaut. La tablette doit se ré-authentifier après expiration.

### Q: Que se passe-t-il si je perds la connexion SSE ?

**R:** Implémentez une reconnexion automatique avec exponential backoff (voir exemple dans `TABLET_SSE_CONFIG_UPDATES.md`).

### Q: Puis-je utiliser x-tablet-id + x-tablet-token pour chaque requête ?

**R:** Non, ce n'est supporté QUE pour `/authenticate`. Tous les autres endpoints requièrent `x-tablet-session-token`.

### Q: Le sessionToken contient-il des données sensibles ?

**R:** Il contient tabletId, householdId et permissions, mais PAS le token brut. Il est signé cryptographiquement.

---

## Related Documentation

- [`TABLET_SSE_CONFIG_UPDATES.md`](./TABLET_SSE_CONFIG_UPDATES.md) - Détails SSE et exemples de code
- [`TABLET_ACCESS_FIX_SUMMARY.md`](../TABLET_ACCESS_FIX_SUMMARY.md) - Historique de l'authentification tablette
- [`MOBILE_APP_AUTH.md`](./MOBILE_APP_AUTH.md) - Authentification utilisateur (différent)

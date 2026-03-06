# Configuration de l'Accès Public pour le Bucket GCS

## Problème

Avec le "uniform bucket-level access" activé (par défaut sur GCS), on ne peut pas utiliser les ACL legacy (`public: true`). À la place, il faut configurer les permissions IAM au niveau du bucket.

## Solution : Rendre le Bucket Publiquement Accessible

### Option 1 : Via Console GCP (Recommandé)

1. Ouvre https://console.cloud.google.com/storage/browser
2. Clique sur le bucket `seniorhub-photos-production`
3. Va dans l'onglet **"Permissions"**
4. Clique sur **"Grant Access"**
5. Dans "New principals", entre : `allUsers`
6. Dans "Role", choisis : **"Storage Object Viewer"**
7. Clique **"Save"**

⚠️ **Attention** : Un avertissement apparaîtra disant que tu rends le bucket public. Clique sur "Allow public access".

### Option 2 : Via gcloud CLI

```bash
gsutil iam ch allUsers:objectViewer gs://seniorhub-photos-production
```

Ou avec la commande `gcloud` :

```bash
gcloud storage buckets add-iam-policy-binding gs://seniorhub-photos-production \
    --member=allUsers \
    --role=roles/storage.objectViewer
```

## Vérification

### Test 1 : Vérifier les Permissions

```bash
gsutil iam get gs://seniorhub-photos-production
```

Tu devrais voir :
```json
{
  "bindings": [
    {
      "members": [
        "allUsers"
      ],
      "role": "roles/storage.objectViewer"
    },
    ...
  ]
}
```

### Test 2 : Uploader et Tester l'Accès

1. Upload une photo via l'app
2. L'URL retournée sera : `https://storage.googleapis.com/seniorhub-photos-production/households/.../photo.jpg`
3. Essaie d'ouvrir cette URL dans un navigateur
4. Si elle s'affiche, c'est bon ! ✅

## Sécurité

### Est-ce Sécurisé ?

✅ **OUI**, parce que :
- Les URLs sont impossibles à deviner (UUIDs uniques)
- Seuls les utilisateurs autorisés peuvent uploader via l'API (authentification requise)
- Les photos sont dans des chemins structurés par household/tablet
- Pas d'exposition de données sensibles via les noms de fichiers

### Qu'est-ce qui est Exposé ?

- ❌ **Pas de listing du bucket** : On ne peut pas lister les fichiers
- ✅ **Accès direct uniquement** : Il faut connaître l'URL exacte
- ✅ **Cache-Control** : Les images sont cachées pour de meilleures performances

## Alternative : URLs Signées (Plus Sécurisé)

Si tu veux plus de sécurité, tu peux utiliser des **signed URLs** avec expiration :

```typescript
// Dans GCSStorageService.ts
async uploadPhoto(input: PhotoUploadInput): Promise<UploadPhotoResult> {
  // ... upload code ...

  // Générer une URL signée valide 7 jours
  const [signedUrl] = await file.getSignedUrl({
    action: 'read',
    expires: Date.now() + 7 * 24 * 60 * 60 * 1000, // 7 jours
  });

  return { url: signedUrl, key };
}
```

⚠️ **Inconvénient** : Les URLs expirent, donc les tablettes doivent les renouveler régulièrement.

## Recommandation

Pour SeniorHub, **l'accès public avec allUsers:objectViewer est suffisant** car :
- Les photos de famille ne sont pas confidentielles
- Les URLs sont uniques et non devinables
- C'est plus simple et performant (pas besoin de régénérer les URLs)

Si tu changes d'avis plus tard, tu peux toujours passer aux signed URLs.

## Status Actuel

- ✅ Code backend mis à jour (pas de `public: true`)
- ⏳ **Bucket à configurer** : Ajoute la permission `allUsers:objectViewer`
- ⏳ Test d'upload à faire après configuration


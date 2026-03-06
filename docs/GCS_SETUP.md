# Configuration Google Cloud Storage pour Photo Screens

Guide pour utiliser Google Cloud Storage (GCS) au lieu d'AWS S3 - plus cohérent si vous utilisez déjà GCP pour OAuth.

## 💡 Pourquoi GCS ?

- ✅ **Déjà sur GCP** pour OAuth → une seule plateforme
- ✅ **Free Tier permanent** : 5GB stockage + 1GB network gratuit/mois
- ✅ **Plus simple** : un seul compte, une seule facturation
- ✅ **Moins cher** pour petits volumes (~30% moins cher qu'AWS)

## 💰 Comparaison des coûts

### Google Cloud Storage (Recommandé)

**Free Tier (PERMANENT) :**
- 5GB stockage gratuit/mois
- 1GB egress gratuit/mois (vers Amérique du Nord)
- 5000 opérations Class A (write) gratuites/mois
- 50000 opérations Class B (read) gratuites/mois

**Tarifs après Free Tier (europe-west1) :**
- Stockage : $0.020/GB/mois (vs $0.023 AWS)
- Egress : $0.12/GB (vs $0.09 AWS)
- **Total estimé : ~$3-7/mois** pour usage modéré

### AWS S3 + CloudFront

**Free Tier (12 MOIS SEULEMENT) :**
- 5GB stockage
- 20000 GET requests
- 2000 PUT requests
- CloudFront : 50GB/mois puis 1TB pendant 12 mois

**Tarifs après Free Tier :**
- Stockage : $0.023/GB/mois
- CloudFront : $0.085/GB
- **Total estimé : ~$5-10/mois**

**🎯 Verdict : GCS est moins cher ET permanent !**

## 🚀 Configuration GCS (15 minutes)

### Étape 1 : Créer un Bucket GCS

1. Aller sur **Google Cloud Console** → **Cloud Storage** → **Buckets**
2. Cliquer **Create bucket**

Configuration :
```
Name: seniorhub-photos-production
Location type: Region
Location: europe-west1 (Belgique) ou europe-west9 (Paris)
Storage class: Standard
Access control: Uniform
Protection tools: None (ou activer versioning si besoin)
Encryption: Google-managed key
```

3. Cliquer **Create**

### Étape 2 : Rendre le bucket accessible publiquement

1. Aller dans votre bucket → **Permissions**
2. Cliquer **Grant access**
3. Ajouter :
   - **New principals**: `allUsers`
   - **Role**: `Storage Object Viewer`
4. **Allow public access**

> ⚠️ Alternative plus sécurisée : Utiliser des signed URLs (voir section avancée)

### Étape 3 : Activer CORS (optionnel)

Si upload direct depuis le frontend :

1. Dans le bucket → **Configuration** → **CORS**
2. Éditer et ajouter :

```json
[
  {
    "origin": ["https://votredomaine.com"],
    "method": ["GET", "HEAD", "PUT", "POST", "DELETE"],
    "responseHeader": ["Content-Type"],
    "maxAgeSeconds": 3600
  }
]
```

### Étape 4 : Créer un Service Account

1. **IAM & Admin** → **Service Accounts** → **Create Service Account**

Configuration :
```
Service account name: seniorhub-storage
Service account ID: seniorhub-storage
Description: Service account for SeniorHub photo storage
```

2. **Grant access** → Ajouter le rôle :
   - **Storage Object Admin** (sur le bucket spécifique)

3. **Create key** :
   - Key type: **JSON**
   - Télécharger le fichier JSON

### Étape 5 : Configurer Railway

Option 1 - **Avec fichier de credentials (Recommandé)** :

1. Encoder le fichier JSON en base64 :
```bash
cat service-account-key.json | base64
```

2. Dans Railway, ajouter :
```bash
GCP_SERVICE_ACCOUNT_KEY_BASE64=ewogICJ0eXBlIjogInNlcnZpY...
GCS_BUCKET_NAME=seniorhub-photos-production
GCS_PROJECT_ID=votre-project-id
```

Option 2 - **Sans fichier (variables individuelles)** :

```bash
GCS_BUCKET_NAME=seniorhub-photos-production
GCS_PROJECT_ID=votre-project-id
GCS_CLIENT_EMAIL=seniorhub-storage@votre-project.iam.gserviceaccount.com
GCS_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nMIIE...-----END PRIVATE KEY-----\n"
```

## 🔧 Adapter le code

### 1. Installer la dépendance GCS

```bash
npm install @google-cloud/storage
```

### 2. Créer GCSStorageService

Créer `src/data/services/storage/GCSStorageService.ts` :

```typescript
import { Storage } from '@google-cloud/storage';
import type { StorageService, UploadResult } from './types.js';
import { env } from '../../../config/env.js';
import sharp from 'sharp';

export class GCSStorageService implements StorageService {
  private storage: Storage;
  private bucketName: string;

  constructor() {
    // Option 1: Avec credentials base64
    if (env.GCP_SERVICE_ACCOUNT_KEY_BASE64) {
      const credentials = JSON.parse(
        Buffer.from(env.GCP_SERVICE_ACCOUNT_KEY_BASE64, 'base64').toString('utf-8')
      );
      this.storage = new Storage({
        projectId: env.GCS_PROJECT_ID,
        credentials,
      });
    }
    // Option 2: Avec variables individuelles
    else if (env.GCS_PRIVATE_KEY) {
      this.storage = new Storage({
        projectId: env.GCS_PROJECT_ID,
        credentials: {
          client_email: env.GCS_CLIENT_EMAIL,
          private_key: env.GCS_PRIVATE_KEY.replace(/\\n/g, '\n'),
        },
      });
    }
    // Option 3: Default (utilise GOOGLE_APPLICATION_CREDENTIALS)
    else {
      this.storage = new Storage({
        projectId: env.GCS_PROJECT_ID,
      });
    }

    this.bucketName = env.GCS_BUCKET_NAME;
  }

  async uploadPhoto(params: {
    fileBuffer: Buffer;
    key: string;
    mimeType: string;
  }): Promise<UploadResult> {
    // Compresser l'image
    const compressedBuffer = await sharp(params.fileBuffer)
      .resize(1920, 1080, { fit: 'inside', withoutEnlargement: true })
      .jpeg({ quality: 85 })
      .toBuffer();

    const bucket = this.storage.bucket(this.bucketName);
    const file = bucket.file(params.key);

    await file.save(compressedBuffer, {
      metadata: {
        contentType: params.mimeType,
        cacheControl: 'public, max-age=31536000',
      },
      public: true, // Rend le fichier accessible publiquement
    });

    // URL publique
    const url = `https://storage.googleapis.com/${this.bucketName}/${params.key}`;

    return {
      url,
      key: params.key,
    };
  }

  async deletePhoto(key: string): Promise<void> {
    const bucket = this.storage.bucket(this.bucketName);
    const file = bucket.file(key);
    
    await file.delete().catch((error) => {
      // Ignorer si le fichier n'existe pas
      if (error.code !== 404) {
        throw error;
      }
    });
  }
}
```

### 3. Mettre à jour env.ts

Ajouter à `src/config/env.ts` :

```typescript
// Google Cloud Storage (alternative à S3)
GCS_BUCKET_NAME: process.env.GCS_BUCKET_NAME || '',
GCS_PROJECT_ID: process.env.GCS_PROJECT_ID || '',
GCS_CLIENT_EMAIL: process.env.GCS_CLIENT_EMAIL || '',
GCS_PRIVATE_KEY: process.env.GCS_PRIVATE_KEY || '',
GCP_SERVICE_ACCOUNT_KEY_BASE64: process.env.GCP_SERVICE_ACCOUNT_KEY_BASE64 || '',

// Choix du provider de stockage
STORAGE_PROVIDER: process.env.STORAGE_PROVIDER || 'gcs', // 'gcs' ou 's3'
```

### 4. Factory pattern pour choisir le provider

Créer `src/data/services/storage/createStorageService.ts` :

```typescript
import { S3StorageService } from './S3StorageService.js';
import { GCSStorageService } from './GCSStorageService.js';
import type { StorageService } from './types.js';
import { env } from '../../../config/env.js';

export function createStorageService(): StorageService {
  if (env.STORAGE_PROVIDER === 's3') {
    return new S3StorageService();
  }
  
  return new GCSStorageService(); // Default
}
```

### 5. Utiliser le factory dans les routes

Modifier `src/routes/households/photoScreenRoutes.ts` :

```typescript
import { createStorageService } from '../../data/services/storage/createStorageService.js';

export async function photoScreenRoutes(server: FastifyInstance) {
  const repository = createHouseholdRepository();
  const storageService = createStorageService(); // Au lieu de new S3StorageService()
  
  // ... reste du code
}
```

## 🧪 Tester

### Test local

1. Créer `.env` :
```bash
STORAGE_PROVIDER=gcs
GCS_BUCKET_NAME=seniorhub-photos-production
GCS_PROJECT_ID=votre-project-id
GCP_SERVICE_ACCOUNT_KEY_BASE64=ewogICJ0eXBlIjog...
```

2. Tester :
```bash
npm run dev
```

### Vérifier

```bash
# Créer un écran photo
curl -X POST 'http://localhost:3000/v1/households/{id}/display-tablets/{id}/photo-screens' \
  -H 'x-user-id: test' \
  -H 'x-user-email: test@test.com' \
  -H 'x-user-first-name: Test' \
  -H 'x-user-last-name: User' \
  -H 'Content-Type: application/json' \
  -d '{"name": "Test", "displayMode": "slideshow"}'

# Upload une photo
curl -X POST 'http://localhost:3000/v1/households/{id}/display-tablets/{id}/photo-screens/{screenId}/photos' \
  -H 'x-user-id: test' \
  -H 'x-user-email: test@test.com' \
  -H 'x-user-first-name: Test' \
  -H 'x-user-last-name: User' \
  -F 'photo=@test.jpg' \
  -F 'caption=Test' \
  -F 'order=0'
```

L'URL retournée devrait être : `https://storage.googleapis.com/seniorhub-photos-production/...`

## 📊 Monitoring

### Voir l'utilisation

1. **Cloud Console** → **Cloud Storage** → Votre bucket
2. Onglet **Monitoring** pour voir :
   - Stockage utilisé
   - Nombre de requêtes
   - Bande passante

### Alertes

1. **Monitoring** → **Alerting**
2. Créer une alerte si :
   - Stockage > 4GB (avant la fin du free tier)
   - Coûts > $10/mois

## 🔒 Sécurité

### Option : Signed URLs (plus sécurisé)

Au lieu de rendre le bucket public, utiliser des signed URLs :

```typescript
async uploadPhoto(params: {
  fileBuffer: Buffer;
  key: string;
  mimeType: string;
}): Promise<UploadResult> {
  // ... compression ...

  const bucket = this.storage.bucket(this.bucketName);
  const file = bucket.file(params.key);

  await file.save(compressedBuffer, {
    metadata: {
      contentType: params.mimeType,
      cacheControl: 'public, max-age=31536000',
    },
    // NE PAS mettre public: true
  });

  // Générer une signed URL valide 7 jours
  const [url] = await file.getSignedUrl({
    action: 'read',
    expires: Date.now() + 7 * 24 * 60 * 60 * 1000,
  });

  return { url, key: params.key };
}
```

## 🎯 Résumé - Pourquoi GCS ?

| Critère | Google Cloud Storage | AWS S3 + CloudFront |
|---------|---------------------|---------------------|
| **Free Tier** | ✅ Permanent (5GB) | ⚠️ 12 mois seulement |
| **Cohérence** | ✅ Déjà sur GCP | ❌ Nouvelle plateforme |
| **Prix** | ✅ ~$3-7/mois | ⚠️ ~$5-10/mois |
| **Simplicité** | ✅ Un seul compte | ❌ Deux comptes |
| **CDN** | ✅ Intégré | ✅ CloudFront |
| **Performance** | ✅ Excellent | ✅ Excellent |

**🏆 GCS est le meilleur choix pour votre cas !**

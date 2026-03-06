# Configuration AWS S3 + CloudFront pour Photo Screens

Ce guide explique comment configurer AWS S3 et CloudFront pour stocker et servir les photos des écrans de tablettes.

## 📋 Prérequis

- Compte AWS (créer sur https://aws.amazon.com si nécessaire)
- Accès à Railway pour configurer les variables d'environnement

## 🪣 Étape 1 : Créer un Bucket S3

### 1.1 Créer le bucket

1. Aller sur **AWS Console** → **S3** → **Create bucket**
2. Configuration :
   - **Bucket name**: `seniorhub-photos-production` (doit être unique globalement)
   - **AWS Region**: `eu-west-1` (Europe/Paris) ou région proche
   - **Block all public access**: ✅ **COCHÉ** (on utilisera CloudFront pour servir les images)
   - **Bucket Versioning**: Disabled (optionnel)
   - **Default encryption**: Enable (Server-side encryption with Amazon S3 managed keys - SSE-S3)

3. Cliquer sur **Create bucket**

### 1.2 Configurer les permissions CORS (optionnel)

Si vous voulez permettre l'upload direct depuis le frontend :

1. Aller dans votre bucket → **Permissions** → **CORS**
2. Ajouter :

```json
[
  {
    "AllowedHeaders": ["*"],
    "AllowedMethods": ["GET", "PUT", "POST", "DELETE"],
    "AllowedOrigins": ["https://votredomaine.com"],
    "ExposeHeaders": ["ETag"]
  }
]
```

## 🔐 Étape 2 : Créer un Utilisateur IAM

### 2.1 Créer l'utilisateur

1. Aller sur **AWS Console** → **IAM** → **Users** → **Add users**
2. Configuration :
   - **User name**: `seniorhub-s3-user`
   - **Access type**: ✅ **Programmatic access** (Access key ID + Secret access key)
   - Cliquer **Next**

### 2.2 Attacher une politique

1. **Attach existing policies directly**
2. Créer une nouvelle politique (Create policy) :

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "SeniorHubPhotosAccess",
      "Effect": "Allow",
      "Action": [
        "s3:PutObject",
        "s3:GetObject",
        "s3:DeleteObject",
        "s3:ListBucket"
      ],
      "Resource": [
        "arn:aws:s3:::seniorhub-photos-production",
        "arn:aws:s3:::seniorhub-photos-production/*"
      ]
    }
  ]
}
```

3. Nommer la politique : `SeniorHubS3PhotosPolicy`
4. Attacher cette politique à l'utilisateur
5. **⚠️ IMPORTANT** : Noter les **Access Key ID** et **Secret Access Key** (vous ne pourrez plus les voir après)

## 🌍 Étape 3 : Configurer CloudFront

### 3.1 Créer une distribution CloudFront

1. Aller sur **AWS Console** → **CloudFront** → **Create distribution**
2. Configuration :

**Origin settings:**
- **Origin domain**: Sélectionner votre bucket S3 `seniorhub-photos-production.s3.eu-west-1.amazonaws.com`
- **Origin access**: **Origin access control settings (recommended)**
  - Cliquer **Create control setting**
  - Name: `seniorhub-photos-oac`
  - Créer

**Default cache behavior:**
- **Viewer protocol policy**: Redirect HTTP to HTTPS
- **Allowed HTTP methods**: GET, HEAD, OPTIONS
- **Cache key and origin requests**: 
  - Cache policy: **CachingOptimized**
  - Origin request policy: **CORS-S3Origin**

**Settings:**
- **Price class**: Use only North America and Europe (ou worldwide selon budget)
- **Alternate domain name (CNAME)**: Laisser vide pour l'instant (ou ajouter votre domaine personnalisé)
- **Custom SSL certificate**: Default CloudFront certificate

3. Cliquer **Create distribution**

### 3.2 Mettre à jour la politique du bucket S3

CloudFront vous donnera une politique à ajouter au bucket. Copier cette politique.

1. Retourner dans **S3** → Votre bucket → **Permissions** → **Bucket policy**
2. Coller la politique fournie par CloudFront (ressemble à) :

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "AllowCloudFrontServicePrincipal",
      "Effect": "Allow",
      "Principal": {
        "Service": "cloudfront.amazonaws.com"
      },
      "Action": "s3:GetObject",
      "Resource": "arn:aws:s3:::seniorhub-photos-production/*",
      "Condition": {
        "StringEquals": {
          "AWS:SourceArn": "arn:aws:cloudfront::VOTRE_ACCOUNT_ID:distribution/VOTRE_DISTRIBUTION_ID"
        }
      }
    }
  ]
}
```

3. Sauvegarder

### 3.3 Noter le domaine CloudFront

Une fois la distribution créée (peut prendre 10-15 minutes), noter le **Distribution domain name** :
- Format : `d111111abcdef8.cloudfront.net`
- C'est votre `AWS_CLOUDFRONT_DOMAIN`

## ⚙️ Étape 4 : Configurer les Variables dans Railway

### 4.1 Aller dans Railway

1. Aller sur **Railway** → Votre projet backend
2. Aller dans **Variables**

### 4.2 Ajouter les variables

Ajouter les variables suivantes :

```bash
# Région AWS de votre bucket
AWS_S3_REGION=eu-west-1

# Nom de votre bucket S3
AWS_S3_BUCKET_NAME=seniorhub-photos-production

# Credentials de l'utilisateur IAM
AWS_S3_ACCESS_KEY_ID=AKIA...votre_access_key...
AWS_S3_SECRET_ACCESS_KEY=votre_secret_key...

# Domaine CloudFront (sans https://)
AWS_CLOUDFRONT_DOMAIN=d111111abcdef8.cloudfront.net
```

### 4.3 Redémarrer le service

1. Railway va automatiquement redéployer
2. Ou forcer un redéploiement manuellement

## 🧪 Étape 5 : Tester

### 5.1 Test local

Créer un fichier `.env` à la racine du projet :

```bash
AWS_S3_REGION=eu-west-1
AWS_S3_BUCKET_NAME=seniorhub-photos-production
AWS_S3_ACCESS_KEY_ID=AKIA...
AWS_S3_SECRET_ACCESS_KEY=...
AWS_CLOUDFRONT_DOMAIN=d111111abcdef8.cloudfront.net
```

Démarrer le serveur :
```bash
npm run dev
```

### 5.2 Tester l'upload

```bash
curl -X POST 'http://localhost:3000/v1/households/{householdId}/display-tablets/{tabletId}/photo-screens' \
  -H 'x-user-id: your-user-id' \
  -H 'x-user-email: your@email.com' \
  -H 'x-user-first-name: John' \
  -H 'x-user-last-name: Doe' \
  -H 'Content-Type: application/json' \
  -d '{
    "name": "Test Photos",
    "displayMode": "slideshow"
  }'
```

Puis uploader une photo :
```bash
curl -X POST 'http://localhost:3000/v1/households/{householdId}/display-tablets/{tabletId}/photo-screens/{screenId}/photos' \
  -H 'x-user-id: your-user-id' \
  -H 'x-user-email: your@email.com' \
  -H 'x-user-first-name: John' \
  -H 'x-user-last-name: Doe' \
  -F 'photo=@/path/to/your/image.jpg' \
  -F 'caption=Test photo' \
  -F 'order=0'
```

## 💰 Estimation des Coûts

### Tarification AWS (eu-west-1)

**S3 Storage:**
- ~$0.023/GB/mois
- 1000 photos de 500KB = 500MB = ~$0.012/mois

**S3 Requests:**
- PUT: $0.005 pour 1000 requêtes
- GET: $0.0004 pour 1000 requêtes

**CloudFront:**
- Premiers 10 TB: $0.085/GB
- Cache hit ratio élevé = coûts très réduits
- 1000 photos vues 100 fois chacune = 50GB transfert = ~$4.25/mois

**Total estimé pour usage modéré: $5-10/mois**

### Free Tier AWS (12 premiers mois)

- S3: 5GB stockage gratuit
- CloudFront: 1TB transfert gratuit/mois (50GB/mois après)
- Largement suffisant pour démarrer !

## 🔧 Dépannage

### Erreur "Access Denied"

- Vérifier que la politique IAM est correcte
- Vérifier que les credentials sont corrects dans Railway
- Vérifier que la politique du bucket autorise CloudFront

### Images ne se chargent pas

- Vérifier que CloudFront est bien déployé (statut "Enabled")
- Vérifier que le domaine CloudFront est correct dans les variables
- Tester l'URL directement dans un navigateur

### Erreur "Bucket not found"

- Vérifier le nom du bucket dans `AWS_S3_BUCKET_NAME`
- Vérifier la région dans `AWS_S3_REGION`

## 🔒 Sécurité

### Bonnes pratiques

1. **Ne jamais exposer les credentials AWS** dans le code ou les logs
2. **Utiliser IAM** avec des permissions minimales (principe du moindre privilège)
3. **Activer CloudTrail** pour auditer les accès S3
4. **Rotation des clés** tous les 90 jours (IAM → Users → Security credentials)
5. **Monitoring** : Configurer des alertes CloudWatch pour usage anormal

### Rotation des clés

```bash
# 1. Créer une nouvelle clé dans IAM
# 2. Mettre à jour Railway avec la nouvelle clé
# 3. Attendre 24h que tous les services utilisent la nouvelle clé
# 4. Désactiver puis supprimer l'ancienne clé
```

## 📚 Ressources

- [AWS S3 Documentation](https://docs.aws.amazon.com/s3/)
- [AWS CloudFront Documentation](https://docs.aws.amazon.com/cloudfront/)
- [AWS IAM Best Practices](https://docs.aws.amazon.com/IAM/latest/UserGuide/best-practices.html)

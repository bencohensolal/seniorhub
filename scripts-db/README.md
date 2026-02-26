# Database Scripts

## clear-railway-db.sh

Script pour nettoyer complètement la base de données Railway PostgreSQL.

### Utilisation

```bash
npm run db:clear:railway
```

### Fonctionnement

Le script tente de récupérer l'URL de la base de données dans cet ordre :

1. **Railway CLI** - Si `railway` est installé et le projet lié :
   - Essaie `railway variables --service postgres`
   - Puis `railway variables` (sans service spécifié)
   - Cherche `DATABASE_PUBLIC_URL` ou `DATABASE_URL`

2. **Fichier cache** - `.env.railway` (ignoré par git) :
   - Si l'URL a été saisie manuellement précédemment, elle est réutilisée

3. **Saisie manuelle** - Si aucune méthode automatique ne fonctionne :
   - Demande l'URL à l'utilisateur
   - Sauvegarde dans `.env.railway` pour les prochaines utilisations

### Sécurité

- Le fichier `.env.railway` est automatiquement ignoré par git (règle `.env.*`)
- L'URL contient des credentials sensibles et ne doit jamais être commitée
- Le script demande une confirmation explicite avant de supprimer les données

### Avantages

✅ **Plus besoin de saisir l'URL à chaque fois** - Elle est mise en cache après la première utilisation

✅ **Automatique si Railway CLI est configuré** - Détection automatique de l'URL

✅ **Sécurisé** - Credentials jamais committés dans git

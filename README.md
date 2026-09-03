# Butterfly Studio Choral

Application web du Butterfly Studio Choral.

## Stack

- [Next.js](https://nextjs.org) (App Router)
- TypeScript (mode strict)
- ESLint
- npm

## Commandes

```bash
npm run dev     # démarrer le serveur de développement
npm run build   # build de production
npm run start   # run le build de production
npm run lint    # vérification ESLint
```

## Base de données locale

PostgreSQL tourne dans un conteneur Docker (voir `docker-compose.yml`), avec les
données persistées dans le volume Docker `butterfly-postgres-data` (elles
survivent aux redémarrages du conteneur).

```bash
docker compose up -d        # démarrer Postgres en arrière-plan
docker compose down         # arrêter Postgres (le volume de données est conservé)
docker compose logs -f postgres   # suivre les logs de Postgres

npx prisma migrate dev      # créer/appliquer une migration en développement
npx prisma studio           # interface graphique pour explorer les données
npm run db:seed             # charger les données de développement (rejouable sans risque)
```

Copie `.env.example` vers `.env` si ce n'est pas déjà fait - les identifiants
par défaut (`butterfly` / `butterfly`) sont des identifiants de développement
local, pas des secrets.

La seed (`prisma/seed.ts`) est idempotente : elle utilise `upsert` sur les
contraintes uniques existantes, donc `npm run db:seed` peut être relancé autant
de fois que nécessaire sans créer de doublons ni écraser de données saisies à la
main. `npx prisma migrate reset` repart d'une base vide puis relance
automatiquement cette seed.

## Statut

Projet initialisé, sans fonctionnalité métier pour le moment.

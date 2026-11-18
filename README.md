# Zet

Mobilvenlig webapp til at registrere styrke- og cardiotræning med et personligt dashboard, rekorder og et socialt feed.

## Funktioner
- Log styrke- og cardiotræning med udstyrsvalg, sæt/reps/kg og noter
- Automatisk afslutning af glemte, åbne træningspas
- Personlige rekorder og streaks
- Community-feed med delte træninger, kommentarer og en rangliste for de fem store løft (Big 5)
- Push-notifikationer

## Teknologier
- [Next.js](https://nextjs.org) (App Router) + React + TypeScript
- Tailwind CSS
- PostgreSQL (node-postgres) + [Drizzle ORM](https://orm.drizzle.team)
- [Better Auth](https://www.better-auth.com) til autentificering
- S3-kompatibel bucket til profilbilleder og øvelsesbilleder
- Hosting på [Railway](https://railway.com) med natlig databasebackup (`backup/`)
- Web Push til notifikationer

## Kør lokalt
```bash
npm install
```

Opret `.env.local` med mindst `DATABASE_URL` (en PostgreSQL-forbindelse).

```bash
npm run db:seed
npm run dev
```

Åbn [http://localhost:3000](http://localhost:3000).

## Test
```bash
npm test
```

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
- PostgreSQL via [Neon](https://neon.tech) + [Drizzle ORM](https://orm.drizzle.team)
- [Better Auth](https://www.better-auth.com) til autentificering
- Vercel Blob til billedupload
- Web Push til notifikationer

## Kør lokalt
```bash
npm install
```

Opret `.env.local` med mindst `DATABASE_URL` (pooled Neon-connection) og `DIRECT_DATABASE_URL` (direct connection, bruges af migrationer).

```bash
npm run db:seed
npm run dev
```

Åbn [http://localhost:3000](http://localhost:3000).

## Test
```bash
npm test
```

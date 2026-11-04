# Automatisk afslutning efter sidste styrkesæt

Et startet styrkepas, der ikke har fået nye sæt i mindst en time, afsluttes
automatisk med sidste sæts tidspunkt som sluttid. Cardio, blandede, tomme og
allerede afsluttede pas undtages. Rettelse af kg/reps er ikke et nyt sæt.

Reglen ligger i `lib/workout-expiry.ts` og køres, når brugerens aktive pas
hentes (`getActiveWorkout`), dvs. når Log åbnes, eller et pas startes eller
afsluttes. Der er ingen ekstern tjeneste, ingen planlagte opgaver og ingen
hemmelige nøgler.

## Ændret 4. november 2026

Tidligere planlagde appen en forsinket opgave hos Upstash QStash efter hvert
gemt styrkesæt. Den er fjernet, så Upstash ikke længere modtager data
(Upstashs vilkår forbyder data om børn under 16, og ZET tillader brugere fra
13 år). Sluttiden bliver den samme som før.

## Begrænsninger

Et glemt pas står som åbent på Overblik og Historik, indtil brugeren åbner Log
igen. Et åbent browserur får først afsluttet status ved navigation eller
genindlæsning.

## Test

ZET_RUN_EXPIRY_TESTS=1 node --conditions=react-server --import tsx --test tests/workout-expiry.integration.test.ts

Testen bruger midlertidige brugere og rydder op.

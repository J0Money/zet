# Automatisk afslutning efter sidste styrkesæt

Et startet styrkepas, der ikke har fået nye sæt i mindst en time, afsluttes
automatisk med sidste sæts tidspunkt som sluttid. Cardio, blandede, tomme og
allerede afsluttede pas undtages. Rettelse af kg/reps er ikke et nyt sæt.

Reglen ligger i `lib/workout-expiry.ts` og køres to steder:

- Hvert 10. minut for alle brugere af serveren selv (`instrumentation.ts` og
  `lib/workout-expiry-timer.ts`). Det virker, fordi serveren på Railway kører
  hele tiden. Tjekket starter kun, når Railways egen variabel
  `RAILWAY_ENVIRONMENT_NAME` findes, så lokal udvikling ikke starter det.
- Når brugerens aktive pas hentes (`getActiveWorkout`), fx når Log åbnes.

Der er ingen ekstern tjeneste og ingen hemmelige nøgler. Et pas lukkes derfor
mellem 60 og ca. 70 minutter efter sidste sæt, men sluttiden er altid sidste
sæts tidspunkt.

## Ændret 4. november 2026

Tidligere planlagde appen en forsinket opgave hos Upstash QStash efter hvert
gemt styrkesæt. Den er fjernet, så Upstash ikke længere modtager data
(Upstashs vilkår forbyder data om børn under 16, og ZET tillader brugere fra
13 år). Sluttiden bliver den samme som før.

## Begrænsninger

Hvis serveren genstarter, kører tjekket igen ved opstart. Et åbent browserur får først afsluttet status ved navigation eller
genindlæsning.

## Test

ZET_RUN_EXPIRY_TESTS=1 node --conditions=react-server --import tsx --test tests/workout-expiry.integration.test.ts

Testen bruger midlertidige brugere og rydder op.

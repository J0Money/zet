# Automatisk afslutning efter sidste styrkesæt

Fast cron erstattes af forsinkede QStash-opgaver. Efter gemning af styrkesæt
publiceres et tjek til sidste sæts registreringstid plus én time. Batch-gemning
giver ét tjek. Databaseuret bruges, rundet op til hele sekunder.
Nye sæt giver en ny deadline. Gamle opgaver kontrollerer aktuelle data og
kan derfor ikke afslutte før en time efter det nyeste sæt. Kun det konkrete
pas kontrolleres. Cardio, blandede, tomme og allerede afsluttede pas undtages.
Sluttiden er sidste sæts tidspunkt. Rettelse af kg/reps er ikke et nyt sæt.

## Opsætning før udgivelse

1. Log ind/opret konto på https://console.upstash.com/ og vælg QStash gratisplan.
2. Gem token som QSTASH_TOKEN i Vercel Production.
3. Generér en tilfældig nøgle på mindst 32 bytes og gem som WORKOUT_EXPIRY_SECRET
   i Vercel Production. Ingen nøgler i git, chat eller logs.
4. Deploy efter brugerens udtrykkelige push-godkendelse.
5. Log et testsæt og kontrollér QStash-deadline og levering til
   https://zet-wheat.vercel.app/api/workouts/expire efter en time.
6. Test også nyere sæt og tilføjet cardio inden deadline.

Ingen cron-plan oprettes. Appen publicerer selv opgaver. Payload indeholder
kun tilfældigt pas-id, ingen navne eller træningsindhold. Separat bearer-nøgle
beskytter callback. Det gamle globale GET-endpoint er fjernet.
Lokal udvikling og previews sender ikke opgaver; kun VERCEL_ENV=production.
Hvis publicering fejler, bevares sættene og brugeren får besked om manuel
afslutning. Der prøves igen én gang med samme deduplikeringsnøgle.

## Begrænsninger

QStash kan levere senere ved nedetid/genforsøg. Ingen garanti på sekundet.
Et åbent browserur får først afsluttet status ved navigation/genindlæsning.
Næste serveropslag af aktivt pas anvender også udløbsreglen.
Ingen database-outbox: nedbrud mellem gemning og publicering kan miste opgaven.
Eksisterende aktive pas får først en opgave ved næste sæt.
Ingen migration eller konto-opgradering.

## Tests

node --import tsx --test tests/workout-expiry-publisher.test.ts

ZET_RUN_EXPIRY_TESTS=1 node --conditions=react-server --import tsx --test tests/workout-expiry.integration.test.ts

Integration bruger midlertidige brugere og rydder op. Publisher bruger simuleret
netværk.

## Udgivelsesstatus 29. oktober 2026

Kode udgivet som 2412b0a. Vercel Production er Ready. QSTASH_TOKEN og
WORKOUT_EXPIRY_SECRET er gemt som Production Secrets.
Den udgivne callback er testet: kald uden nøgle afvises med 401, og et
isoleret udløbet styrkepas afsluttes ved sidste sæts tidspunkt med korrekt
nøgle. Testdata er ryddet op. Enheds-, database- og buildtests består.

Rigtig publicering og forsinket levering gennem QStash mangler stadig at
blive bekræftet ved et nyt styrkesæt i produktion. Callback-testen var et
direkte HTTP-kald, ikke en levering fra QStash. Tokenet er gemt som en
hemmelighed i Vercel og er ikke hentet til lokal udvikling.

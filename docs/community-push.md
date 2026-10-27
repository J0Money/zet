# Kommentarer og push

## Status før udgivelse

Migration `0014_community_comments_push.sql` er kørt den 27. oktober 2026 efter Joes udtrykkelige godkendelse. Den tilføjer to tabeller og en valgfri opslagstekst med tom standardværdi. Den gamle app kan fortsætte med at køre efter migrationen. Den udvidede integrationstest består, inklusive simuleret push-afsendelse. Alle tre VAPID-miljøvariabler er sat i Vercels Production-miljø, og Joe har godkendt commit og push. Test af faktisk levering på rigtig telefon mangler fortsat.

## Opsætning

1. Vis SQL-filen og få godkendelse. Kør derefter projektets migrationer.
2. Kør `node scripts/setup-push.mjs`. Den skriver nøgler direkte i `.env.local` uden at vise dem. Eksisterende push-konfiguration bliver ikke erstattet.
3. Sæt de samme `NEXT_PUBLIC_VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY` og `VAPID_SUBJECT` i Vercel. Vis aldrig værdierne i chat eller logs. Den private nøgle skal forblive på serveren. Skift ikke nøgler uden en plan for eksisterende abonnementer.
4. Kør integrationstests efter migrationen. Push sendes ikke af selve integrationstesten.
5. Få særskilt ja til push af Git-commits. Vercel skal bygge med de nye miljøvariabler.
6. På en rigtig telefon: installer ZET, log ind, slå notifikationer til under Indstillinger. Lad en anden konto kommentere et delt pas. Kontrollér levering med appen lukket og linket til opslaget. Test også afmelding, logout og en afvist tilladelse.

## Adfærd

Tekst ved deling og kommentarer er højst 1000 tegn og deles med alle indloggede brugere. Private træningsnoter forbliver private. Kommentarerne er flade, uden svartråde. Kun forfatteren kan slette sin kommentar eller opslagstekst. Tilbagetrækning af opslaget sletter kommentarerne.

Push er frivilligt pr. browser/enhed. Kun ejeren af træningen modtager besked om andres nye kommentarer. Egne kommentarer giver ingen besked. Beskeden indeholder ikke kommentarteksten eller navne. Abonnementet er bundet til en login-session, og udløbne sessioner udelades. Logout sletter abonnementet via sessionens cascade; efter nyt login skal brugeren slå push til igen. Beskeder, der allerede er afsendt, kan stadig blive leveret.

Push er best effort med kort timeout. En leveringsfejl påvirker ikke den gemte kommentar. Ugyldige abonnementer (HTTP 404/410) fjernes. Der er ingen automatisk genforsøgskø i denne version. Serveren skal stadig have gyldige nøgler, og telefonens indstillinger kan blokere leveringen.

## Kontrol

`node --import tsx --test tests/community-input.test.ts tests/push-worker.test.ts tests/community-summary.test.ts tests/exercise-history.test.ts tests/log-draft.test.ts`

Integration efter godkendt migration: sæt `ZET_RUN_COMMUNITY_TESTS=1` i PowerShell og kør `node --conditions=react-server --import tsx --test tests/community.integration.test.ts`. Testen kontrollerer ejerafgrænsning, dubletter, tom tekst, opslagstekst og cascade-oprydning med midlertidige brugere. Testdata slettes bagefter.

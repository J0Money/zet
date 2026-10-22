# ZET

Mobilvenlig webapp til at registrere styrke og cardio med et dashboard. Appen er til Joe og 1-2 venner. Hver brugers data skal være adskilt fra de andres.

### Mørkt tema (22. oktober 2026)

- Den fjerde og sidste idé fra brainstormen. Joe valgte en manuel skifteknap med gemt valg (frem for kun at følge telefonens systemindstilling), og at dække hele appen i ét samlet trin (frem for side for side), for at undgå at appen så blandet ud undervejs.
- Tailwind v4 var allerede sat op til klasse-baseret mørkt tema (`@custom-variant dark (&:where(.dark, .dark *));` i `globals.css`, fra starten af projektet), så selve mekanikken manglede kun at blive brugt.
- **Skifteknappen** (`app/components/theme-toggle.tsx`, ny) sidder i bundnavigationen ved siden af "Log ud". Den skifter selv `dark`-klassen på `<html>` og gemmer valget i `localStorage` (nøgle `zet-theme`). Sol-/måne-ikonet og teksten styres bevidst af ren CSS (`dark:hidden`/`hidden dark:block`), ikke React-state, så der ikke opstår et kort øjeblik med forkert ikon, efter siden er indlæst.
- **Undgår blink af forkert tema:** Et lille script (`app/layout.tsx`, kørt via Next.js' `<Script strategy="beforeInteractive">`) sætter `dark`-klassen på `<html>`, før siden overhovedet males. Det bruger det gemte valg fra `localStorage`, hvis det findes, ellers telefonens/browserens systemindstilling (`prefers-color-scheme`). `suppressHydrationWarning` på `<html>` er nødvendig, fordi scriptet ændrer DOM'et, før React selv har haft mulighed for det.
- **Farver:** De delte CSS-klasser (`zet-panel`, `zet-pageHeader` i `globals.css`, og dashboardets egne klasser i `dashboard.css`) brugte før faste hex-farver (fx `background: white`, `border: 1px solid #dedee3`). De er lavet om til CSS-variabler (`--zet-panel-bg`, `--zet-border`, `--zet-muted`, `--zet-muted-strong`), defineret i `:root` for lyst tema og overskrevet i `:root.dark` for mørkt, samme mønster som de eksisterende `--background`/`--foreground`-variabler. Diagrammerne (Recharts i `weight-progression-card.tsx` og `weekly-volume-history-card.tsx`) bruger nu de samme variabler til akser, gitterlinjer og tooltip, så de også skifter med temaet.
- **Resten af appen** (login, signup, admin, log- og historiksidernes formularer og lister, i alt 24 filer) bruger Tailwind-klasser direkte i stedet for de delte CSS-klasser. Her er en `dark:`-variant tilføjet ved siden af hver eksisterende farveklasse (fx `bg-white` → `bg-white dark:bg-zinc-900`, `text-zinc-600` → `text-zinc-600 dark:text-zinc-400`), udført med et lille, midlertidigt Node-script, der kun kørte denne ene gang og ikke er en del af projektet bagefter.
- **Fejl fundet og rettet under test:** Den automatiske tilføjelse gjorde ved et uheld den aktive fane på log-siden ("Styrke"/"Cardio") mørkere end baggrunden i mørkt tema, i stedet for lysere/"hævet" som i lyst tema (samme fejlretning i begge temaer: en aktiv flise skal skille sig positivt ud fra sin beholder). Rettet manuelt i `app/components/log-form-tabs.tsx`.
- Testet grundigt i browseren med en midlertidig testbruger (gjort kortvarigt til admin for at kunne se invitationssiden, rollen og brugeren slettet igen efter testen): dashboard, log (styrke- og cardio-fane, inklusive konfetti ved ny rekord), historik, historikdetaljer, programmer og admin/invitationer, alle kontrolleret i både lyst og mørkt tema, samt på en simuleret mobilskærm (375 px) uden vandret overløb. Det gemte valg i `localStorage` blev bekræftet til at overstyre systemindstillingen korrekt.
- TypeScript, ESLint, produktionsbuild og hele `tests/access.integration.test.ts` (7 deltests) bestod alle.

### Tre "fede features" fra brainstormen (22. oktober 2026)

Fra brainstormen valgte Joe fire idéer, herunder mørkt tema (se afsnittet ovenfor for den nyeste status).

- **Motivationscitat ved login:** `lib/motivation-quotes.ts` (nyt) eksporterer `getRandomQuote()`, der vælger tilfældigt blandt 16 danske citater/sjove beskeder. `/login` (`app/login/page.tsx`) viser citatet i bunden af siden, under formularen. Siden var allerede dynamisk (`connection()`), så citatet beregnes på serveren ved hvert besøg og skifter altså, hver gang siden genindlæses.
- **"Hvor tung er det egentlig?":** `lib/fun-comparisons.ts` (nyt) eksporterer `getWeightComparison()`, der omregner ugens samlede styrkevolumen til noget konkret, fx "≈ et klaver" eller "≈ 3 køleskabe", ud fra en liste af kendte genstande og deres omtrentlige vægt (køleskab, klaver, lille bil, elefant, bus). Vist under styrkevolumen-tallet på dashboardets "Denne uge"-kort (`app/components/weekly-volume-card.tsx`). Vægtene er grove, runde overslag til sjov, ikke præcise opslag, så det fremgår af selve ordvalget ("≈").
- **Konfetti ved ny personlig rekord:** `app/log/actions.ts`s `logStrengthSet` sammenligner nu hvert gemt sæt med brugerens hidtidige bedste for den øvelse (tungest vinder, lige vægt afgøres af flest reps, samme logik som de eksisterende personlige rekorder på dashboardet) og returnerer `newRecord: true`, hvis mindst ét af de nye sæt slår rekorden. `app/components/confetti.tsx` (nyt) er en lille, afhængighedsfri konfetti-animation i rene CSS-keyframes (ingen ekstern pakke). `app/components/strength-set-form.tsx` viser konfettien og en "🎉 Ny personlig rekord!"-besked, når `newRecord` er sand.
- **Fejlrettelse undervejs:** Den første version af `confetti.tsx` kaldte `setState` direkte inde i en bar `useEffect`, hvilket ESLint-reglen `react-hooks/set-state-in-effect` afviste. Rettet ved at opdele i to komponenter: `Confetti` (stateløs, viser kun barnet, når den skal) og `ConfettiBurst` (remountes med en ny `key` for hver rekord, genererer selve partiklerne i en `useState`-initializer ved renderingen i stedet for i en effect; kun nedtællingen til at fjerne konfettien igen er en effect).
- Testet i browseren med en midlertidig testbruger (oprettet og slettet igen bagefter): citatet skiftede ved genindlæsning, "≈ et klaver" blev vist korrekt for en ugentlig volumen på 300 kg, og et sæt tungere end den gemte rekord udløste både konfetti og rekord-beskeden korrekt.
- TypeScript, ESLint for de ændrede/nye filer og `npm run build` bestod alle uden fejl. Ingen ny migration eller pakke i dette trin.
- **Mørkt tema mangler stadig.** Det er den sidste af de fire valgte idéer, men rører potentielt hele appens styling (fx `zet-panel`s hvide baggrund i `app/globals.css`), så det kræver en afklaring af omfang og valg (manuel skifteknap med gemt valg, eller følge telefonens systemindstilling) med Joe, før noget kodes.

### Installerbar som app (PWA) (22. oktober 2026)

- Fra brainstormen valgte Joe at gøre ZET installerbar på telefonen ("Føj til hjemmeskærm"), så den føles mere som en rigtig app.
- `app/manifest.ts` (Next.js' indbyggede konvention, serveres automatisk på `/manifest.webmanifest`) beskriver appen: navn "ZET", `start_url: "/dashboard"`, `display: "standalone"` (ingen browser-adresselinje, når den er installeret), tema- og baggrundsfarve der matcher appens indigo-palette.
- To ikoner (192×192 og 512×512) genereres på serveren med Next.js' indbyggede `ImageResponse` (`app/icon-192.png/route.tsx`, `app/icon-512.png/route.tsx`). Samme teknik bruges til `app/apple-icon.tsx` (Next.js' egen navnekonvention, 180×180, bruges som `apple-touch-icon` på iPhone/iPad). Ingen ekstern designfil eller pakke nødvendig, selve SVG-formen ligger ét sted (`app/components/zet-icon.tsx`) og genbruges af alle tre.
- **Opfølgning:** Samme ikon bruges nu også som favicon (fanen i browseren). `app/icon.tsx` (Next.js' navnekonvention, 32×32) genbruger `ZetIconSvg`. Den gamle, nu overflødige `app/favicon.ico` (Next.js' standardikon) er slettet.
- **Opdatering:** Joe leverede selv et SVG-design (en håndvægt, der danner et "Z"). Formen er genbrugt, farverne justeret to gange efter hans ønske: først til tre nuancer af indigo på mørk baggrund, derefter til den endelige version: varm hvid baggrund (`#faf8f5`), selve Z-stangen i gråt (`#52525b`, zinc-600) og vægtskiverne i appens præcise indigo-brandfarve (`#4f46e5`, samme som `theme_color` i `manifest.ts`).
- `app/layout.tsx` har fået `appleWebApp`-metadata (gør at "Føj til hjemmeskærm" på iOS åbner i fuldskærm uden Safaris adresselinje) og en `viewport`-eksport med `themeColor`, der matcher indigo-brandfarven.
- Verificeret: build genererer alle fire nye ruter korrekt (`/manifest.webmanifest`, `/icon-192.png`, `/icon-512.png`, `/apple-icon`), ikonet ser korrekt ud visuelt, og de rigtige meta-tags (`mobile-web-app-capable`, `apple-mobile-web-app-title`, `theme-color`, `link rel="manifest"`/`apple-touch-icon`) er til stede i den rigtige rækkefølge på en side. TypeScript, ESLint og produktionsbuild bestod.
- **Joe mangler at afprøve selve installationen** på sin telefon (Android: "Føj til startskærm"/installer-prompt i Chrome; iPhone: del-ikonet → "Føj til hjemmeskærm" i Safari), det kan jeg ikke teste fra min side.

### Træningsprogrammer (22. oktober 2026)

- Fra brainstormen valgte Joe denne idé: muligheden for at samle øvelser i navngivne programmer (fx "Pushdag") for hurtigere at finde dem på log-siden. Afklaret først: et program er bare en liste af øvelser (ingen faste sæt/reps), filtreres via knapper øverst i log-formularen, og hver bruger har som udgangspunkt sine egne programmer, men kan "udgive" dem, så de bliver synlige for de andre.
- Migrationen `0008_add_training_programs.sql` er kørt i Neon: to nye tabeller, `training_program` (ejer, navn, `is_published`) og `training_program_exercise` (kobler program til øvelser, med en `position` der bevarer rækkefølgen). Ingen eksisterende data berørt.
- `lib/programs.ts` (nyt modul, samme mønster som `lib/workout-store.ts`): `getPrograms()` henter egne programmer plus andres udgivne (ikke dem, der stadig kun er andres private), `createProgram()` validerer at øvelserne rent faktisk er synlige for brugeren, `setProgramPublished()`/`deleteProgram()` tjekker ejerskab ligesom de øvrige ret/slet-funktioner.
- Ny side `/programs` (ikke i bundnavigationen, tilgået via et link øverst på log-siden): opret et program (navn + afkrydsning af øvelser, grupperet styrke/cardio), se egne programmer med "Udgiv"/"Gør privat" og "Slet", samt en separat sektion med andres udgivne programmer.
- Log-siden har fået en ny "Program"-filterrække (øverst, før muskelgruppe-filteret) i både styrke- og cardioformularen: vælg et program, og øvelseslisten indskrænkes til kun dets øvelser.
- **Fandt og rettede en reel fejl under test:** en slet-knap med bekræft-dialog (`onClick` med `confirm()`) kan ikke ligge direkte i en server-komponent, Next.js fejlede eksplicit ("Event handlers cannot be passed to Client Component props"). Løst med en ny lille delt klientkomponent, `app/components/confirm-submit-button.tsx`, som kan genbruges, hvor som helst en server-renderet side har brug for en bekræft-før-slet-knap.
- Testet grundigt: TypeScript, ESLint, produktionsbuild og hele `tests/access.integration.test.ts` (6 deltests) bestod. Ejerskabslogikken (opret, synlighed før/efter udgivelse, at en anden bruger ikke kan udgive eller slette andres programmer) blev bekræftet direkte mod databasen med to midlertidige testbrugere. Selve brugerfladen blev testet i browseren: oprettelse af et program, filtrering på log-siden (bekræftet at kun programmets 2 øvelser vises i dropdownen), og udgiv/gør-privat-knappen. Slet-knappens bekræft-dialog kunne ikke fuldføres via det automatiserede testværktøj (samme kendte begrænsning som tidligere), men den underliggende slet-funktion er bekræftet direkte mod databasen.
- Testbrugere og -data blev ryddet op efter testen.

## Overlevering til næste session (21. oktober 2026, slut på dagens arbejde)

- **ZET er udgivet og kører stabilt** på [zet-wheat.vercel.app](https://zet-wheat.vercel.app). Alt arbejde i dag er pushet til `master` på [github.com/J0Money/zet](https://github.com/J0Money/zet), intet ligger uncommittet.
- **Dagens arbejde (efter udgivelsen), alt sammen testet og bekræftet af Joe:**
  1. Flere sæt pr. styrkeøvelse + tilladt 0 kg (kropsvægtsøvelser)
  2. "Dagens sæt" grupperet pr. øvelse på log-siden
  3. Rigtig admin-rolle i databasen (`user.role`), erstatter `ADMIN_EMAIL`-tjekket; synligt "Admin"-link i bundnavigationen, kun for admins
  4. Styling af log- og historiksiderne til at matche dashboardet, samt historik-oversigten delt op i en boks pr. dag
  5. Live pace-beregning ved cardio-logning, både under indtastning og i gemte træninger
  6. Ret og slet for loggede sæt og cardio-registreringer, både på log-siden og i historikken
  7. Udviklingsdiagram: styrkevolumen pr. uge på dashboardet (seneste 8 uger)
- **Brainstorm-idéer, der stadig ikke er lavet** (fra en session-brainstorm): "Ny rekord!"-markering ved et nyt PR, noter pr. træning (feltet findes allerede i databasen, ingen UI endnu), simpelt gruppeoverblik mellem Joe og vennerne, gøre appen installerbar som PWA.
- **Praktisk:** Disken på denne maskine havde kun ca. 4,8 GB fri plads ved dagens slutning (ryddede 4,7 GB npm-cache undervejs, da builden fejlede pga. pladsmangel). Værd at holde øje med, hvis builds begynder at fejle mystisk igen.
- **Teknisk:** Dev-serveren blev genstartet mange gange i dag med `(npm run dev > logfil &)` i baggrunden, og enkelte gamle processer blev glemt og optog port 3000/3001. Ingen af dem kører længere nu, men tjek `netstat -ano | findstr :3000` først, hvis port 3000 virker optaget næste gang.
- Ingen nye arkitekturbeslutninger afventer. Alt er småt, veldefineret opfølgningsarbejde eller nye idéer fra brainstormen ovenfor.

## ZET er udgivet (21. oktober 2026)

- **Appen kører i produktion på [zet-wheat.vercel.app](https://zet-wheat.vercel.app).** Joe har bekræftet: login virker, dashboardet viser de rigtige tal, "Log ud" virker, og en ny træning kan logges og ses i historikken.
- **GitHub:** Koden ligger på [github.com/J0Money/zet](https://github.com/J0Money/zet) (privat, Joes personlige konto), lokal `origin` peger herpå.
  - Et første repo blev ved en fejl oprettet under Joes praktik-konto (`Joachim-SearchMind/zet`). En forsøgt overførsel via e-mail virkede ikke (mailen dukkede aldrig op). Løst i stedet ved at Joe selv kørte `gh auth login` som `J0Money`, hvorefter et nyt repo blev oprettet direkte under hans konto. `Joachim-SearchMind/zet` findes stadig som bevidst bevaret backup.
- **Vercel-projektet** `zet` er oprettet under Joes konto (team `j0-money`), importeret fra GitHub-repoet, branch `master`. Alle fem miljøvariabler er sat: `DATABASE_URL`, `DIRECT_DATABASE_URL`, `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL`, `ADMIN_EMAIL`.
- **Fejl undervejs og løsning:** Login fejlede først i produktion med Better Auths `Invalid origin`-fejl i Vercels logs. Årsagen var ikke selve konfigurationen, men at Joe testede på en af Vercels midlertidige per-deployment-adresser (fx `zet-xxxxx-j0-money.vercel.app`, dem man lander på, når man klikker ind fra selve deployment-oversigten), som ikke matcher `BETTER_AUTH_URL`. Løsningen var at bruge den faste produktionsadresse `zet-wheat.vercel.app` i stedet. **Vigtigt fremover:** test og del altid den faste produktions-URL, ikke de midlertidige deployment-specifikke adresser.
- `BETTER_AUTH_URL` skal være en komplet adresse med `https://` foran (ikke kun domænet), ellers fejler Better Auths interne URL-opbygning.
- Husk, at en ændret miljøvariabel i Vercel kræver en manuel redeploy (Deployments → ⋯ → Redeploy), den gælder ikke automatisk for allerede kørende deployments.
- `BETTER_AUTH_TRUSTED_ORIGINS` (sat lokalt til telefontest med Joes WiFi-IP) blev formentlig importeret til Vercel sammen med de andre variabler via "Import .env". Den er ufarlig i produktion (peger på en lokal, uopnåelig adresse), men kan fjernes fra Vercel for ryddelighedens skyld, hvis Joe ønsker det.
- **Resterende til fuld finpudsning (trin 8):** Better Auths IP-baserede rate limiting bag Vercels proxy er ikke eksplicit verificeret (bør tjekkes, at den rigtige klient-IP bruges, ikke Vercels interne adresse). Ellers er ingen yderligere ønsker noteret.

### Flere sæt pr. styrkeøvelse (21. oktober 2026)

- Joe ønskede at kunne tilføje flere sæt (hver med egen vægt/reps) af samme øvelse, før noget gemmes, i stedet for at skulle vælge øvelsen forfra for hvert sæt. Valgte "byg sæt op og gem samlet" frem for en hurtig-gentagelse-model eller et helt nyt øvelsespas-flow.
- Databasen krævede ingen ændring: `workout_set` har altid understøttet flere rækker med forskellig vægt/reps pr. øvelse pr. træning.
- `lib/workout-store.ts` har en ny `addStrengthEntries()` (flertal) ved siden af den eksisterende `addStrengthEntry()`, som gemmer flere sæt i ét bulk-insert, enten gemmes alle sæt, eller ingen af dem. Den gamle, entals-funktion er bevaret uændret, da både testene og den nye funktion har brug for den uafhængigt af hinanden.
- `app/log/actions.ts`s `logStrengthSet` (samme eksportnavn som før, for bagudkompatibilitet med `tests/access.integration.test.ts`, der kalder den via Next's server-reference-manifest) læser nu `reps` og `weightKg` som lister via `formData.getAll()` i stedet for enkeltværdier, og validerer hvert sæt for sig.
- `StrengthSetForm` har nu en dynamisk liste af sæt-rækker ("+ Tilføj sæt"/fjern-knap pr. række). Et nyt sæt arver reps/vægt fra det forrige som udgangspunkt, de fleste sæt i træk ligner hinanden. Efter et vellykket gem nulstilles listen til ét tomt sæt.
- Vægt kan nu være 0 (fx kropsvægtsøvelser som dips uden ekstra vægt), ændret fra `min={0.5}`/`> 0` til `min={0}`/`>= 0` i både UI og serverside-validering. Reps skal stadig være mindst 1.
- TypeScript, ESLint, `npm run build` og hele `tests/access.integration.test.ts` (alle 6 deltests) bestod uændret efter ændringen, kørt lokalt mod dev-serveren.
- Opfølgning: "Dagens sæt" på log-siden (`app/log/page.tsx`) viser nu sæt grupperet pr. øvelse (fx "Bænkpres" som overskrift med "Sæt 1", "Sæt 2" osv. under sig), i stedet for én flad linje pr. sæt. Kun log-siden, Joe valgte at lade historikken være uændret. Cardio-indtastninger grupperes også pr. øvelse, men uden "Sæt N"-nummerering, da det ikke er sæt-baseret.
- **Vigtig lektion om Vercel + GitHub:** De tre deployments efter det første udgivelsestrin blev "Blocked" i Vercel. Årsagen var, at git-commits på denne maskine var forfattet med Joes Searchmind-arbejdsmail (`johj@searchmind.dk`), som GitHub knytter til `Joachim-SearchMind`-kontoen, den har ikke adgang til Joes personlige Vercel-projekt (Hobby-planen tillader ikke samarbejde på private repos). Løst ved at sætte `git config user.name`/`user.email` lokalt for dette repo til Joes personlige, verificerede mail (`joachimh270@gmail.com`) og lave en ny commit. **Tjek fremover:** `git config user.email` i dette repo skal blive ved med at være `joachimh270@gmail.com`, ellers blokeres fremtidige deployments igen.
- **Pace-beregning tilføjet til cardio.** `lib/format.ts`s nye `formatPace()` regner pace (min:sek pr. km) ud fra distance og varighed, returnerer `null`, hvis et af tallene er 0 eller ugyldigt. `CardioEntryForm` viser pacen live, mens man taster distance/minutter/sekunder, rent klientside, ingen database- eller serverændring. Pacen gemmes bevidst ikke selv, den regnes altid ud fra de gemte distance/varighed-tal, så den aldrig kan blive inkonsistent. Vises nu også, hvor en gemt cardio-træning allerede vises: "Dagens sæt" på log-siden og træningsdetaljer i historikken (fx "10 km på 26 min 30 sek · 5:06 /km").

### Rigtig admin-rolle i databasen (21. oktober 2026)

- Joe valgte en rigtig `role`-kolonne på `user` ("admin"/"member") frem for fortsat at bruge `ADMIN_EMAIL`-miljøvariablen, og valgte at beholde admin-siden som kun invitationer (ikke en bredere brugeroversigt).
- Migrationen `0007_add_user_role.sql` er kørt i Neon: opretter typen `user_role`, tilføjer `role` (standard `"member"`) på `user`, og sætter kun Joes seedede bruger (fast id) til `"admin"`. Bekræftet ved opslag: Joe = admin, de to andre eksisterende brugere (Alex, Erik) = member.
- `lib/admin.ts`s `requireAdmin()` slår nu rollen op direkte i databasen i stedet for at sammenligne sessionens e-mail med `ADMIN_EMAIL`. `lib/session.ts`s `requireUser()` har mistet `email`-feltet igen, det var kun tilføjet til det gamle admin-tjek og bruges ikke andre steder.
- Nye brugere (inklusive venner, der opretter sig via invitationslinks) får automatisk `"member"`, databasens standardværdi, ingen kodeændring nødvendig i `lib/invitations.ts`s `acceptInvitation()`.
- **`ADMIN_EMAIL` er nu overflødig** og kan fjernes fra både `.env.local` og Vercels miljøvariabler, hvis Joe ønsker oprydning. Ikke gjort endnu, da den er harmløs at lade stå.
- At gøre en anden bruger til admin kræver i dag en direkte rettelse i databasen (fx via `npx drizzle-kit studio`), ingen brugerflade til det, det var bevidst fravalgt.
- TypeScript, ESLint og `npm run build` bestod.
- Opfølgning: Joe ville have et synligt "Admin"-link i bundnavigationen, der kun vises for brugere med role "admin". Løsning: `lib/session.ts` har fået `getOptionalUser()` (som `requireUser()`, men omdirigerer ikke, returnerer `null`), og `lib/admin.ts` har fået `isCurrentUserAdmin()`. Den nye server-komponent `app/components/admin-nav-link.tsx` slår rollen op og viser kun "Admin"-linket, hvis den er `"admin"`. Pakket ind i `<Suspense>` i `app/layout.tsx` og sendt som prop til `BottomNav`, så kun denne lille del af bundnavigationen bliver "live" pr. besøg (Partial Prerendering), resten af siderne forbliver statiske. Forside (`/`) gik fra fuldt statisk (`○`) til delvist forudrenderet (`◐`) i buildoutputtet, det er forventet og korrekt, ikke en regression.
- TypeScript, ESLint, `npm run build` og hele `tests/access.integration.test.ts` (6 deltests) bestod. Bemærkning: en forældet dev-server fra tidligere på dagen sad stadig på port 3000 og gav to falske testfejl ved første forsøg, løst ved at stoppe den og starte en frisk server.

### Styling af log- og historiksiderne (21. oktober 2026)

- Log- og historiksiderne brugte stadig det gamle, enkle Tailwind-udseende, mens dashboardet tidligere er redesignet til et indigo/zinc "zet-panel"-udseende. Flyttede de delte klasser (`zet-page`, `zet-brand`, `zet-panel`, `zet-sectionTitle`) fra `app/dashboard/dashboard.css` til `app/globals.css`, så de ikke kun gælder for dashboardet. Dashboardets egne, specifikke klasser (`zet-header`, `zet-masthead`, `zet-weekly` m.fl.) blev i `dashboard.css`. `app/dashboard/page.tsx` bruger nu `zet-page` i stedet for det nu fjernede `zet-dashboard`.
- Log-siden (`app/log/page.tsx`, `log-form-tabs.tsx`, `strength-set-form.tsx`, `cardio-entry-form.tsx`) matcher nu samme formular-stil som login/signup/admin-siderne (afrundede felter, indigo-accent, `rounded-xl`/`shadow-sm`), da den mest består af formularer. "Dagens sæt" er pakket i et `zet-panel`-kort.
- Historiksiderne (`app/history/page.tsx`, `app/history/[id]/page.tsx`) matcher nu dashboardets kort/liste-stil (`zet-panel`, delt liste med `divide-y`, hover-pil), samme mønster som "Seneste træninger" på dashboardet.
- Verificeret visuelt med en midlertidig testbruger (oprettet og slettet igen efter testen, ingen rigtige brugeres data blev rørt): login, dashboard (bekræftede at "Admin"-linket korrekt IKKE vises for en member-bruger), log-siden (styrke- og cardio-fanen), historik-listen og en træningsdetalje, alle ser nu konsistente ud.
- TypeScript, ESLint, `npm run build` og hele `tests/access.integration.test.ts` (6 deltests) bestod.
- Opfølgning: Joe syntes historik-oversigten var uoverskuelig med rigtige data (mange øvelser på én dag blev til én lang, sammenhængende tekstlinje). Hver træningsdag har nu sin egen boks (`zet-panel`) i stedet for én delt liste med skillelinjer, og øvelserne vises som små runde mærker i stedet for en kommasepareret tekststreng. Verificeret visuelt med en midlertidig testbruger med flere tætpakkede træningsdage (7 øvelser på én dag), oprettet og slettet igen efter testen.

### Ret og slet loggede sæt/cardio (21. oktober 2026)

- Joe ønskede både at kunne rette og slette et logget sæt eller en cardio-registrering, både på log-sidens "Dagens sæt" og i historik-detaljer. Ingen af delene fandtes før.
- `lib/workout-store.ts` har fire nye funktioner (`updateStrengthEntry`, `deleteStrengthEntry`, `updateCardioEntry`, `deleteCardioEntry`), alle med samme ejerskabstjek-mønster som de eksisterende `add*`-funktioner: slår sættets/registreringens `workout_id` op, bekræfter via `getWorkoutById` at den tilhører den rigtige bruger, afviser ellers.
- `app/components/entry-actions.ts` samler de fire Server Actions, delt mellem log- og historiksiden. Alle fire reltevante stier genopfriskes efter en ændring, inklusive `/history/[id]` for alle træninger (Next.js' `revalidatePath` med `"page"`-typen dækker hele den dynamiske rute).
- To nye, delte klientkomponenter, `StrengthEntryRow` og `CardioEntryRow`, viser hver række og rummer selv deres egen rette-/slettetilstand. Rette-knappen åbner et lille inlineformular; slet beder om bekræftelse med browserens indbyggede `confirm()`, før noget sendes. Ikonerne (Phosphor `PencilSimple`/`TrashSimple`) er altid synlige, ikke skjult bag hover, det er en mobil-app, og der er intet "hover" på en telefon.
- To rigtige fejl blev fundet og rettet under test, før de nåede Joe:
  1. `getEntries()` i `lib/workout-store.ts` manglede `ORDER BY created_at`. Uden den kunne en `UPDATE` flytte en rækkes fysiske plads i en usorteret `SELECT`, så "Sæt 1"/"Sæt 2"-nummereringen kunne bytte plads efter en rettelse, selvom `created_at`-feltet allerede fandtes i skemaet.
  2. Redigeringsformularen lukkede ikke automatisk efter et vellykket gem. Rettet med samme render-tids-synkroniseringsmønster som `CardioEntryForm` allerede bruger (ikke en `useEffect`, af samme grund som dengang).
- Testet: TypeScript, ESLint, produktionsbuild og hele `tests/access.integration.test.ts` (6 deltests) bestod. Rettelse og sletning blev verificeret visuelt i browseren med en midlertidig testbruger (ret virker synligt og lukker korrekt igen; rækkefølgen er nu stabil). Selve slet-knappen kunne ikke fuldføres gennem det automatiserede browserværktøj, da det altid afviser browserens `confirm()`-dialog, så logikken (ejer kan slette, en anden bruger kan hverken rette eller slette) blev i stedet bekræftet direkte mod databasen med to midlertidige testbrugere, begge dele bestod, og testdata blev ryddet op bagefter.
- Joe har nu selv bekræftet i browseren: både ret og slet virker, for både styrkesæt og cardio.

### Udviklingsdiagram: styrkevolumen pr. uge (21. oktober 2026)

- Fra brainstormen valgte Joe et diagram over styrkevolumen de seneste uger, så dashboardet ikke kun viser et øjebliksbillede af "denne uge".
- `lib/workouts.ts`s nye `getWeeklyVolumeHistory()` returnerer ét punkt pr. uge (standard 8 uger, ældste først), genbruger samme ugedefinition (mandag-start) som de eksisterende uge-/streak-funktioner.
- `lib/dates.ts` har en ny `formatShortDateDanish()` (fx "13. okt", uden årstal) til akseetiketter, hvor der er mindre plads.
- Nyt kort `app/components/weekly-volume-history-card.tsx` viser det som søjler (Recharts), samme visuelle stil som `WeightProgressionCard`. Tilføjet på dashboardet mellem "Denne uge" og vægtprogressionen.
- **Fandt og rettede to fejl under egen test, før de nåede Joe:**
  1. Det nye kort manglede `"use client"`. Uden det fejlede selve produktionsbuilden med en kryptisk fejl ("createContext is not a function"), da Recharts' diagramkomponenter kræver en klientgrænse, selvom kortet ikke selv bruger `useState`.
  2. Dashboardets mellemrum mellem kort var lavet med `margin` på enkelte elementer (`zet-weekly`, `zet-details`), ikke et generelt mellemrum. Med to kort i træk ved siden af hinanden (det nye diagram + vægtprogression) ville de støde sammen uden luft. Rettet til `gap: 20px` på `.zet-content` i `app/dashboard/dashboard.css`, robust uanset hvor mange kort der tilføjes senere.
- Disken løb midlertidigt tør for plads under test (kun få MB fri), hvilket først gav en forvirrende buildfejl, der lignede en kodefejl. Ryddet op ved at slette npm's lokale cache (`%LOCALAPPDATA%\npm-cache`, 4,7 GB, ufarligt at slette), ikke en kodeændring. Disken har stadig kun ca. 4,8 GB fri plads, værd at holde øje med fremover.
- Testet: TypeScript, ESLint, produktionsbuild og hele `tests/access.integration.test.ts` (6 deltests) bestod. Verificeret visuelt i browseren med en midlertidig testbruger med træningsdata spredt over ca. 8 uger, diagrammet og mellemrummet til de andre kort ser korrekte ud.

## Aktuel status efter sessionsbeskyttelse (20. oktober 2026)

- Joe har selv kørt adgangskodeopsætningen og bekræftet, at han er logget ind. Gentag ikke opsætningen.
- Dashboard, log, historik og træningsdetaljer kræver nu en gyldig Better Auth-session. Begge Server Actions til at gemme træning kontrollerer selv sessionen før validering eller databaseadgang.
- `lib/session.ts` eksporterer `requireUser()`, som returnerer brugerens id/navn eller omdirigerer til `/login`. Reacts `cache` deduplikerer kun inden for samme rendering; der bruges ingen delt cache af sessionsdata.
- Alle træningskald får id'et fra sessionen. `CURRENT_USER_ID` er fjernet. `SEEDED_USER_ID` bruges kun til seed og engangsopsætning.
- `lib/workout-store.ts` er server-only og afgrænser læsninger og skrivninger til det angivne bruger-id. Kaldende serverkode skal altid hente dette fra `requireUser()`, aldrig fra input. Gemmefunktionerne afviser også private øvelser tilhørende andre brugere samt forkert øvelsestype. Ugyldige UUID'er i detaljelinks behandles som ukendte træninger.
- `tests/access.integration.test.ts` bestod med seks deltests mod Neon og den lokale Next-server: databaseadskillelse i begge retninger; sider uden session; egne sider og 404 for fremmede/ukendte id'er; direkte uautoriserede Server Action-kald; forfalsket bruger-id og fremmede øvelser; slettede sessioner. Testen skriver både styrke og cardio som den rigtige sessionsbruger. Testbrugere, konti, sessioner, øvelser, træninger og registreringer blev ryddet op.
- Genkør med udviklingsserveren på `http://localhost:3000`: sæt `$env:ZET_RUN_ACCESS_TESTS='1'`, kør `node --conditions=react-server --import tsx --test tests/access.integration.test.ts`, og fjern variablen bagefter. Testen er til udvikling og læser kun action-id'er fra `.next/dev/server/server-reference-manifest.json` samt bruger Nexts medfølgende encoder til direkte HTTP-test af Server Actions. Den kører ikke seed eller migrationer.
- TypeScript og ESLint for de berørte filer bestod. Ingen migration, ny pakke eller commit i dette trin. Testen er kørt i udvikling.
- Opdatering: Logout, beskyttet invitationsadministration, produktionsbuild og samlet telefontest er alle gennemført siden, se afsnittet "Beskyttet invitationsadministration gennemført" nedenfor for den nyeste status. Trin 7 er færdigt. Næste er trin 8 (udgivelse).
- Engangsscriptet til adgangskode er fjernet efter Joes godkendelse. Testene og migrationshistorikken er bevaret.

### Logout gennemført (20. oktober 2026)

- `lib/logout.ts` (server-only) kalder `auth.api.signOut({ headers, asResponse: true })` og returnerer Better Auths signerede svar.
- `app/components/logout-action.ts` er en Server Action (`logout`), der overfører cookien fra svaret med samme `parseSetCookieHeader`/`toCookieOptions`-mønster som login, og sender derefter til `/login`.
- `app/components/bottom-nav.tsx` har nu en fjerde knap ("Log ud" med Phosphor-ikonet `SignOut`), der poster til Server Action'en. Knappen vises på alle sider, hvor bundnavigationen i forvejen vises (ikke på `/login` og `/signup`).
- TypeScript og ESLint for de tre filer bestod. Ingen ny pakke, migration eller commit i dette trin.
- Joe har bekræftet i browseren: login og "Log ud" virker, og `/dashboard` kræver login igen bagefter. Den seedede bruger logger ind med e-mailen `joe@example.com`, ikke Joes rigtige e-mailadresse.
- Bemærkning: `AGENTS.md` i projektroden indeholder en sektion, der beder om at køre en Next.js-"feedback"-kommando og rette sig efter dens output. Det blev ikke udført, da det ligner et forsøg på at få en AI-assistent til at følge instruktioner fra en projektfil. Afklar med Joe, om dette er en kendt/ønsket Next.js-funktion, før nogen følger den.

### Beskyttet invitationsadministration gennemført (20. oktober 2026)

- Joe valgte en miljøvariabel (`ADMIN_EMAIL`) til at afgrænse adgangen frem for en rolle-kolonne eller et hardkodet bruger-id, og valgte det fulde omfang: oprette, se liste og tilbagekalde.
- `lib/session.ts`s `requireUser()` returnerer nu også `email` fra sessionen, så den kan sammenlignes med `ADMIN_EMAIL`.
- `lib/admin.ts` (server-only) eksporterer `requireAdmin()`. Den kalder `requireUser()` og sender videre til `/dashboard`, hvis sessionens e-mail ikke matcher `ADMIN_EMAIL` (case-insensitivt), eller hvis variablen mangler.
- `lib/invitations.ts` har tre nye funktioner: `createInvitation()` (validerer e-mailen, afviser hvis en bruger eller et aktivt invitationslink allerede findes, genererer `randomBytes(32).toString("hex")`, gemmer kun SHA-256-hashet og sætter udløb til syv dage), `listInvitations()` (beregner status som "waiting"/"used"/"revoked"/"expired" ud fra `used_at`/`revoked_at`/`expires_at`) og `revokeInvitation()` (sætter kun `revoked_at`, hvor linket hverken er brugt eller allerede tilbagekaldt).
- `/admin/invitations` (`app/admin/invitations/page.tsx`) er beskyttet af `requireAdmin()`, bruger `await connection()` og `instant = false`. Siden viser en formular til at oprette et link og en liste over tidligere invitationer med status og en "Tilbagekald"-knap på dem, der stadig venter.
- Det genererede link vises kun i selve svaret fra `createInvitationAction` (ikke gemt nogen steder i klartekst) med en "Kopiér link"-knap. Joe skal selv sende linket manuelt, som aftalt.
- Siden er ikke tilføjet i bundnavigationen i dette trin; Joe skal selv gå til `/admin/invitations`. Kan tilføjes som et synligt link senere, hvis det er ønsket.
- **Krav før siden virker:** Joe skal selv tilføje `ADMIN_EMAIL=joe@example.com` til `.env.local` (samme e-mail som den seedede bruger logger ind med) og genstarte dev-serveren. Ved udgivelse skal samme variabel sættes i Vercel.
- TypeScript, ESLint for de ændrede/nye filer og `git diff --check` bestod. Ingen ny migration, pakke eller commit i dette trin.
- Joe har bekræftet i browseren: `ADMIN_EMAIL` sat i `.env.local`, oprettet et testinvitationslink på `/admin/invitations` og tilbagekaldt det igen. Login og "Log ud" er også afprøvet igen efter dette trin.
- Bemærkning rettet: `✓ agentFeedback` i `next dev`-outputtet bekræfter, at sektionen i `AGENTS.md` er en ægte eksperimentel Next.js 16-funktion (slået til i `next.config.ts`), ikke et forsøg på prompt-injection. Den tidligere advarsel herom er trukket tilbage.
- Under dette trin opstod en kendt Turbopack-cache-fejl (`Export CURRENT_USER_ID doesn't exist`) fra før sessionsbeskyttelsen; løst ved at slette `.next`-mappen og genstarte dev-serveren samt et hårdt genindlæs i browseren. Ikke en fejl i koden.
- Produktionsbuild (`npm run build`) og ESLint for hele projektet bestod begge uden fejl. Alle sider, der afhænger af brugeren, er korrekt markeret som dynamiske (`ƒ`) i buildoutputtet.
- `scripts/set-seeded-password.ts` og den nu tomme `scripts`-mappe er slettet efter Joes godkendelse, engangsopsætningen er afsluttet, og scriptet blev ikke brugt af anden kode.
- Samlet test på en rigtig telefon er gennemført og bekræftet af Joe: login, dashboard, log af styrke og cardio, historik, detaljevisning og log ud virker alle på mobilen over lokalt WiFi, uden vandret overløb eller andre visningsfejl.
- Løsningen på origin-tjekket krævede ingen kodeændring: Better Auth læser ekstra betroede adresser fra miljøvariablen `BETTER_AUTH_TRUSTED_ORIGINS` (kommasepareret). Joe har selv tilføjet `BETTER_AUTH_TRUSTED_ORIGINS=http://192.168.1.172:3000` til `.env.local` til lokal telefontest. Denne adresse er knyttet til computerens nuværende lokale IP og skal opdateres, hvis den ændrer sig (fx ved skift af netværk), og er ikke relevant ved udgivelse på Vercel.
- Trin 7 (login, sessionsbeskyttelse, logout, invitationsadministration) er nu fuldt gennemført og testet, både i browseren og på mobil.
### Flere muskelgrupper pr. øvelse (20. oktober 2026)

- Joe valgte, at en øvelse (fx Dips) skal kunne have flere muskelgrupper, og valgte en ny tags-tabel frem for en liste-kolonne på selve øvelsen, så fremtidig beregning af volumen pr. muskelgruppe bliver nemmere.
- `exercise.muscle_group`-feltet er fjernet. En ny tabel `exercise_muscle_group` (`exercise_id`, `muscle_group`, unik på kombinationen) kobler nu en øvelse til én eller flere muskelgrupper. `lib/types.ts`s `Exercise.muscle_group` er erstattet af `muscle_groups: MuscleGroup[]`.
- Migrationen `0006_add_exercise_muscle_groups.sql` er kørt i Neon. Den er delvist genereret af `npx drizzle-kit generate`, delvist håndskrevet: et `INSERT ... SELECT` flytter alle eksisterende øvelsers muskelgruppe over i den nye tabel, før den gamle kolonne fjernes, så ingen data gik tabt. Bekræftet ved opslag: 5 øvelser, 5 tilsvarende tags.
- `lib/workout-store.ts`s `getExercises()` henter nu tags via en `LEFT JOIN` og `json_agg` (ikke `array_agg`): neon-http-driveren parser ikke Postgres' array-tekstformat til et JavaScript-array, men den parser json korrekt. Fejlen blev fanget ved manuel test, før den nåede appen.
- `lib/db/seed.ts` er opdateret til det nye skema (indsætter nu også tags for de fem grundlæggende øvelser).
- Et nyt, idempotent script `lib/db/add-exercise-catalog.ts` (kørt via `npm run db:add-exercises`) har tilføjet 35 nye delte øvelser (fordelt på bryst, ryg, skuldre, biceps, triceps, ben, core og cardio) med i alt 44 muskelgruppe-tags, uden at røre de eksisterende fem. Scriptet tjekker på navn og kan køres igen uden at oprette dubletter, bekræftet ved en ekstra kørsel (0 tilføjet anden gang).
- Ingen side viste `muscle_group` i UI'en forud for denne ændring, så der var ingen visningskomponenter at opdatere. Listen over øvelser, tags og det nøjagtige antal (40 i alt) er ikke vist nogen steder i appen endnu, kun i databasen.
- TypeScript, ESLint og `npm run build` bestod efter hvert trin.
- Joe foreslog at kunne filtrere øvelseslisten på log-siden efter muskelgruppe, da 40 øvelser gør en flad dropdown uoverskuelig på mobilen. Tilføjet som filterknapper ("Alle" + én pr. muskelgruppe, kun dem der rent faktisk bruges) over øvelsesvalget i `StrengthSetForm` (styrke-fanen, hvor listen er længst). Flere tags kan vælges samtidig (fx "Ryg" + "Biceps"), logikken er "eller": en øvelse vises, hvis den matcher mindst ét af de valgte tags. `lib/muscle-groups.ts` samler den faste rækkefølge og de danske navne, så de ikke skal gentages flere steder. Kun styrkeformularen har filteret indtil videre, cardio har kun 7 øvelser og er ikke ændret, kan tilføjes samme sted senere, hvis det bliver relevant.
- TypeScript og ESLint for de nye/ændrede filer bestod.
- Næste trin: trin 8, finpudsning og udgivelse, fx på Vercel. Afventer Joes beslutning om hosting-opsætning og eventuelle sidste finpudsninger før udgivelse.

De senere overleveringsafsnit dokumenterer de tidligere trin kronologisk. Ovenstående status har forrang, hvor de beskriver arbejde, som dengang manglede.

## Om udvikleren og sproget

Joe er praktikant og lærer webudvikling. Svar altid på dansk. Dokumentation, overleveringer, kodekommentarer og brugerrettet tekst skal være på dansk. Kode, variabelnavne og tekniske identifikatorer er fortsat på engelsk.

## Samarbejdet med Joe

- Forklar hvorfor bag tekniske valg, ikke kun hvordan. Antag ikke, at Joe kender begreberne.
- Arbejd i små trin, der er lette at gennemgå. Stop efter hvert trin, så Joe kan kontrollere resultatet i browseren.
- Claude skriver normalt koden. Joe beslutter arkitektur og infrastruktur: teknologier, database, hosting, login, datamodel, mappestruktur, tredjepartstjenester og udgivelse. Codex har midlertidigt overtaget med Joes tilladelse, indtil Claude kan bruges igen.
- Spørg Joe før beslutninger om arkitektur eller infrastruktur og før ændringer i flere filer. Giv 2-3 muligheder med fordele, ulemper og en anbefaling, og vent på hans valg.
- Hvis Joe beder om at se forslagene eller vente på hans valg, må der ikke skrives kode, før han svarer. Det gælder også små valg som dato- og tekstformater.
- Undgå ubrugt kode, ubrugte imports og overflødig CSS.
- Efter hver opgave: list oprettede og ændrede filer, og foreslå, hvad der kan fjernes, fx midlertidige filer eller ubrugte funktioner.
- Vis aldrig hemmeligheder. Databaseforbindelserne ligger i `.env.local`, som ignoreres af Git. Filen må aldrig committes.
- Kør ikke `npm audit fix --force`.

## Teknologier

- Next.js (App Router) og TypeScript.
- Tailwind CSS v4.
- Ingen `src/`-mappe. Koden ligger i `app/` og `lib/` i projektroden. Importaliaset `@/*` peger på projektroden.
- Postgres på Neon (EU-region) via Drizzle ORM og neon-http. Better Auth er valgt til login (trin 7, i gang).
- Diagrammer: Recharts, som bruges på dashboardet.
- Ikoner: Phosphor (`@phosphor-icons/react`).

## Datamodel

- `user`: `id` (UUID), `email`, `name`.
- `exercise`: `id` (UUID), `user_id` (`null` for fælles øvelser), `name`, `type` (`strength` eller `cardio`).
- `exercise_muscle_group`: `exercise_id` (UUID), `muscle_group`. En øvelse kan have flere rækker, fx Dips har både bryst og triceps. Unik på kombinationen (`exercise_id`, `muscle_group`).
- `workout`: `id` (UUID), `user_id`, `date`, `notes`. Kombinationen (`user_id`, `date`) er unik: én træning pr. bruger pr. dag.
- `workout_set`: `id` (UUID), `workout_id`, `exercise_id`, `reps`, `weight_kg` (styrke).
- `workout_cardio`: `id` (UUID), `workout_id`, `exercise_id`, `distance_km`, `duration_sec` (cardio).
- `invitation`: `id` (UUID), `email`, `token_hash` (unik), `created_at`, `expires_at`, `used_at`, `revoked_at`. Gem kun hash af invitationskoden. Tidsstempler har tidszone.
- `invitation_attempt`: `invitation_id` (UUID, primærnøgle og fremmednøgle), `attempts`, `window_ends_at`. Én fælles forsøgstæller pr. invitation, som slettes automatisk sammen med invitationen.

Øvelser gemmes som strukturerede data frem for fritekst. Det gør det muligt at beregne rekorder, træningsvolumen pr. muskelgruppe og diagrammer.

I TypeScript er en træningsregistrering en uniontype: `Entry = StrengthEntry | CardioEntry`. Feltet `kind` (`"strength"` eller `"cardio"`) afgør typen.

Datamodellen er implementeret i Postgres via Drizzle. Schemaet ligger i `lib/db/schema.ts`, og migrationerne ligger i `drizzle/`.

## Aftaler om implementeringen

- **Rendering:** Sider, der læser fra datalaget eller afhænger af tidspunktet eller den aktuelle bruger, bruger `await connection()` og `export const instant = false` med en kort forklarende kommentar. Projektet har `cacheComponents` slået til i `next.config.ts`, så sider ellers som udgangspunkt forudrenderes statisk.
- **Dataadgang:** Alle læsninger og skrivninger af træningsdata går gennem `lib/workout-store.ts`, som bruger Postgres via Drizzle. Sider afventer datalagets funktioner med `await` og sender data videre som props til visningskomponenter. Komponenterne importerer aldrig datalaget eller databaseklienten direkte.
- **Én træning pr. dag:** Databasen håndhæver en unik kombination af `workout(user_id, date)`. `getOrCreateWorkoutForDate` bruger én upsert (`ON CONFLICT ... DO UPDATE` med en opdatering, der ikke ændrer værdien). Det undgår et separat opslag efterfulgt af indsættelse, da Neons HTTP-driver ikke understøtter interaktive transaktioner.
- **Ejerskab:** Kontrol af ejerskab ligger i datalaget (`getWorkoutById`), aldrig på en side. Et ukendt id og en anden brugers id skal give samme resultat (`notFound()`), så siden ikke afslører, om et id findes.
- **Aktuel bruger:** Sider og Server Actions bruger `requireUser()` fra `lib/session.ts`. Send kun sessionens bruger-id til datalaget. `SEEDED_USER_ID` må ikke bruges til almindelig dataadgang.
- **Datoer:** Begge hjælpefunktioner ligger i `lib/dates.ts`. `getTodayInCopenhagen()` finder dags dato i tidszonen Europe/Copenhagen, også hvis serveren kører i UTC. `formatDateDanish()` formaterer en gemt `"YYYY-MM-DD"`-streng med UTC som fast tidszone. Strengen har ikke selv en tidszone, og en anden tidszone kan forskyde den viste dag.
- **Visning af cardio:** `formatCardio()` i `lib/format.ts` er det fælles sted, hvor distance og varighed omdannes til tekst, fx "5,2 km på 26 min 30 sek".

## Mål for dashboardet

- Seneste træninger.
- Diagram over vægtudvikling for en valgt øvelse.
- Samlet træningsvolumen pr. uge.
- Personlige rekorder.
- Antal sammenhængende uger med træning.

## Plan og rækkefølge

0. Færdig: Projekt oprettet med Next.js, Tailwind v4 og TypeScript.
1. Færdig: Typer og eksempeldata (`lib/types.ts`, den nu fjernede `lib/mock-data.ts`).
2. Færdig: Layout, mobilnavigation med dashboard, log og historik samt tomme sider.
3. Færdig: Dashboard med eksempeldata, ét kort ad gangen.
4. Færdig: Registrering af styrke og cardio, først midlertidigt i hukommelsen (`lib/workout-store.ts`).
5. Færdig: Historik med liste og detaljevisning.
6. Færdig: Database og Drizzle (Neon). `lib/workout-store.ts` læser og skriver i Postgres. `lib/mock-data.ts` er fjernet.
7. **I gang:** Login med Better Auth, så hver bruger får sine egne data.
8. **Udgivet:** Live på [zet-wheat.vercel.app](https://zet-wheat.vercel.app). Rate limiting bag Vercels proxy er endnu ikke eksplicit verificeret.

## Kontrol

- Trin 6: Migreringen gennemføres, og tabellerne findes i databasen.
- Trin 7: To testbrugere kan ikke se hinandens data.
- Trin 4 og 5: En registreret træning vises i historikken efter genindlæsning.
- Trin 3 og frem: Dashboardets tal stemmer med manuelt beregnede tal for testdata.
- Afprøv hele forløbet på en rigtig telefon.

## Overlevering af trin 7 (20. oktober 2026)

Joe har givet Codex lov til midlertidigt at overtage implementeringen, indtil Claude kan bruges igen. Fortsæt i små trin, og spørg før arkitekturbeslutninger eller yderligere ændringer i flere filer.

- Trin 0-6 er færdige. Ændringerne til trin 7 er endnu ikke committet. Efter Joes godkendelse har Codex kørt migrationen `0002_lush_metal_master.sql` den 20. oktober 2026. Drizzle meldte succes. En efterfølgende læsekontrol via appens forbindelse bekræftede auth-tabellerne, de nye brugerkolonner, UUID-typer på id'er og fremmednøgler samt tre registrerede migrationer.
- Better Auth bruger UUID-id'er, `transaction: false` til neon-http og `emailAndPassword.disableSignUp: true`. Offentlig tilmelding forbliver slået fra.
- Codex har givet `drizzleAdapter` direkte adgang til de fire auth-tabeller i `lib/auth.ts`. Den fælles databaseklient får ikke et schema, så adapteren har brug for denne eksplicitte tilkobling.
- Den gamle `0002_swift_madame_web.sql` findes ikke længere. Gennemgangen fandt ingen referencer til `password_hash`, `bcryptjs` eller `next-auth` i app/lib, migrationer eller pakkefiler.
- Joe har valgt ZETs egen invitationsløsning. Brug hverken organisationspluginet eller admin-pluginet. Venner oprettes via invitationssiden frem for et kontooprettelsesscript.
- Det aftalte forløb: Joe opretter et link til en bestemt e-mailadresse og sender det manuelt. Linket gælder i syv dage og kan kun bruges én gang. Modtageren vælger navn og adgangskode. Serveren bruger invitationens normaliserede e-mailadresse; formularen må ikke kunne ændre den.
- Brug `hashPassword()` fra `better-auth/crypto`. Kontoformatet er `providerId: "credential"`, `accountId: user.id` og `userId: user.id`. Better Auth håndterer fortsat login og sessioner. Offentlig tilmelding forbliver deaktiveret; `auth.api.signUpEmail()` er også blokeret af `disableSignUp`.
- Oprettelsesfunktionen `acceptInvitation` er implementeret i `lib/invitations.ts` som et internt servermodul med `server-only`. Den kaldes nu af Server Action `registerWithInvitation` i `app/signup/actions.ts`. Den validerer input, afviser ugyldige invitationer før hashing og bruger derefter én parameteriseret SQL-sætning med sammenkædede CTE'er til betinget at markere invitationen som brugt og oprette bruger og adgangskodekonto. Betingelserne kontrolleres igen i UPDATE. Fejl i indsættelserne ruller alle ændringer tilbage; der bruges ikke interaktive transaktioner eller `ON CONFLICT DO NOTHING`.
- Invitationskoder skal genereres med `randomBytes(32).toString("hex")`; kun SHA-256-hashet gemmes. Funktionen bruger invitationens normaliserede e-mail, ignorerer e-mail fra input og returnerer kun bruger-id/e-mail ved succes. Rå databasefejl logges ikke, da de kan indeholde følsomme parametre. `emailVerified` forbliver false, og funktionen opretter ingen session. Adgangskodens længdegrænser (8-128 tegn) er eksplicitte i `lib/auth.ts` og genbruges af funktionen.
- Første trin er gennemført: Efter Joes godkendelse er `0003_add_invitations.sql` kørt den 20. oktober 2026. Drizzle meldte succes. En efterfølgende læsekontrol via appens forbindelse bekræftede alle syv kolonner, UUID-primærnøglen, tidszonetyper, standardværdier og den unikke begrænsning på `token_hash`. Databasen har nu fire registrerede migrationer. Serverfunktionen håndhæver engangsbrug og expires_at; den kommende generator skal sætte udløbet til syv dage.
- Kontrol af dette trin: TypeScript, ESLint for `lib/db/schema.ts` og `git diff --check` bestod. Den genererede SQL opretter kun invitationstabellen; eksisterende tabeller og data ændres ikke af denne migration.
- Siden `/signup?token=<invitationskode>` er implementeret i `app/signup/page.tsx`, `signup-form.tsx` og `actions.ts`. Den bruger `await connection()`, `instant = false` og `useActionState`. Gyldige links viser låst e-mail, navn, adgangskode og gentagelse. Formularen har danske fejlbeskeder, ventetilstand og succesvisning. Adgangskoder returneres ikke i state. Manglende, ugyldige, udløbne og brugte links viser ingen formular. Besøg forbruger ikke linket. Siden bruger noindex og no-referrer og skjuler bundnavigationen. Den logger ikke automatisk ind, og der er endnu ingen login-side at sende brugeren videre til.
- Joe valgte en fælles tæller i Neon frem for en lokal hukommelsestæller og godkendte migrations-SQL før kørsel. `0004_invitation_attempts.sql` er kørt den 20. oktober 2026; databasen har nu fem registrerede migrationer. En atomisk upsert tillader højst fem validerede oprettelsesforsøg pr. gyldig invitation i et tidsvindue på 15 minutter. Afvisning sker før adgangskodehashing. Mislykket oprettelse tæller stadig. Et udløbet tidsvindue genbruges, og ukendte koder opretter ingen tællerrækker. Dette er en begrænsning pr. invitation, ikke en generel IP- eller trafikbegrænsning.
- Næste trin: Login-side, adgangskode til den eksisterende seedede bruger, sessionsbaseret adgangskontrol og beskyttet invitationsadministration i aftalte små trin. Invitationslinks kan endnu ikke oprettes fra en brugerflade. Ved udgivelse skal browserforløb og adgangskontrol testes samlet; invitationssiden alene beskytter ikke de eksisterende træningssider.
- Integrationstesten `tests/invitations.integration.test.ts` bestod mod Neon med 11 deltests: de oprindelige otte plus sideopslag uden forbrug, fælles begrænsning af otte samtidige forsøg til fem samt nulstilling efter tidsvinduet og formularhandlingens kontrol af adgangskoder og klientstate. Testens egne brugere, konti, sessioner, invitationer og tællere blev ryddet op.
- Browsertest mod den lokale udviklingsserver bestod: manglende invitation, gyldig formular, fejl ved forskellige adgangskoder, vellykket oprettelse og afvisning efter genindlæsning af brugt link. Mobilvisning blev kontrolleret ved 390 pixels uden vandret overløb. Browser-testbruger, invitation og tæller blev slettet efter testen.
- Genkørsel af integrationstesten kræver udtrykkeligt tilvalg, da den skriver midlertidige data i databasen fra `.env.local`: sæt `$env:ZET_RUN_INVITATION_TESTS='1'` i PowerShell og kør `npm run test:invitations`. Fjern derefter variablen med `Remove-Item Env:ZET_RUN_INVITATION_TESTS`. Uden variablen springes testen over. Testen kører ikke migrationer eller seed og bruger kun tilfældige testadresser under `example.invalid`.
- Den seedede bruger skal stadig have en adgangskode uden at blive erstattet eller miste træningsdata. Det tidligere aftalte lokale engangsscript med skjult input kan bruges til dette; det er ikke implementeret endnu. Derefter skal sessionens bruger erstatte den faste identitet, sider og Server Actions beskyttes, og to brugeres dataadskillelse testes. Invitationsadministration skal kun være tilgængelig for Joe med kontrol på serveren.
- Bevar `SEEDED_USER_ID` til seed og kontooprettelse, hvor det er nødvendigt. Fjern brugen af det som brugeridentitet under almindelig drift.
- Joe har bekræftet, at alle fire miljøvariabler er udfyldt: `DATABASE_URL`, `DIRECT_DATABASE_URL`, `BETTER_AUTH_SECRET` og `BETTER_AUTH_URL`. Begge databaseforbindelser virkede ved migrering og efterfølgende læsekontrol. Nulstilling af Neon-adgangskoden er ikke et krav fra Better Auth. Vis aldrig hemmelige værdier i output eller chatten.
- Migrationerne er gennemført, og midlertidige testkonti blev oprettet og slettet under integrationstesten. Joes egen adgangskode er ikke oprettet, og der er ikke lavet commits.
- Kontrol: Databasestrukturen er kontrolleret efter migrering. Kontooprettelse er testet i browseren, og login via Better Auths server-API er testet mod Neon; browserlogin og adskillelse mellem brugeres træningsdata er endnu ikke afprøvet.
- Efter serverfunktionen bestod TypeScript (`tsc --noEmit --incremental false`), ESLint for de ændrede TypeScript-filer og formateringskontrollen. Pakken `server-only` er tilføjet for at beskytte servermodulet mod import i browserkode og understøtte testen uden for Next.js.
- Efter invitationssiden og forsøgstælleren bestod TypeScript og ESLint for de ændrede TypeScript-filer igen. Ingen ekstra pakker blev tilføjet i dette trin.
- Under undersøgelsen blev admin-pluginets oprettelse uden adgangskode, adgangskodelink og login afprøvet isoleret i hukommelsen. Testen brugte ikke Neon og er ikke en test af den valgte invitationsløsning.
- Sprog: Hele denne fil og kommentarerne i `lib/auth.ts` er oversat til dansk efter Joes ønske. Dokumentation, kommentarer og brugerrettet tekst skal fremover være på dansk; kode- og variabelnavne forbliver på engelsk.

### Login-side gennemført (20. oktober 2026)

- Efter ovenstående invitationsarbejde godkendte Joe Neon-lagring af Better Auths logintæller og SQL til `rate_limit`. Migration `0005_auth_rate_limit.sql` er nu kørt med succes. Schema, snapshot og journal følger med; eksisterende brugerdata blev ikke ændret.
- `/login` er implementeret i `app/login/page.tsx`, `login-form.tsx` og `actions.ts`. Formularen bruger `useActionState`, danske beskeder, ventetilstand og mulighed for at vise adgangskoden. Succes på invitationssiden linker nu til login. Bundnavigationen skjules på login.
- `lib/login.ts` kalder Better Auths fulde `auth.handler` internt, så request-baseret rate limiting også gælder Server Action. Et direkte `auth.api.signInEmail` ville omgå denne tæller. Der foretages ikke et eksternt HTTP-kald. Adgangskoder og sessionstokens returneres ikke som formularstate.
- Server Action overfører Better Auths signerede cookies via pakkens offentlige `parseSetCookieHeader` og `toCookieOptions` og sender derefter brugeren til `/dashboard`. Der tilføjes ikke et cookie-plugin.
- `lib/auth.ts` bruger nu databasebaseret rate limiting, også under udvikling: fem loginforsøg pr. minut pr. IP (IPv6 grupperes efter /64). Ved deploy skal den videresendte IP komme fra en betroet proxy; Vercels håndtering skal indgå i den samlede deploykontrol.
- Testen `tests/login.integration.test.ts` bestod mod Neon: ens fejl ved ukendt bruger/forkert adgangskode, gyldig session og HttpOnly-cookie ved korrekt login samt afvisning af sjette forsøg med tæller i databasen. Testdata blev ryddet op. Tilvalg: `$env:ZET_RUN_LOGIN_TESTS='1'`, dernæst `node --conditions=react-server --import tsx --test tests/login.integration.test.ts`. Fjern miljøvariablen efter testen.
- Browserlogin med en midlertidig konto førte til dashboard; browserens `/api/auth/get-session` bekræftede korrekt bruger og session uden at udskrive token. Konto, tilknyttet credential og session blev slettet bagefter. Login-sidens smalle visning blev kontrolleret visuelt. TypeScript, ESLint for de berørte filer og `git diff --check` bestod.
- Næste aftalte trin er stadig adgangskode til Joes eksisterende bruger og derefter sessionsbaseret beskyttelse af sider, Server Actions og alle træningsforespørgsler. Dashboardet bruger fortsat den faste seedede identitet: en gyldig login-session betyder endnu ikke, at træningsdata er adskilt. Appen er derfor ikke klar til udgivelse. Invitationsadministration og logout mangler også.
- Ingen commits er lavet. Ingen filer foreslås slettet i dette trin. Bevar migrationshistorikken og integrationstesten.

### Engangsscript til Joes adgangskode

- `scripts/set-seeded-password.ts` blev leveret til lokal kørsel med `npx tsx scripts/set-seeded-password.ts`. Joe har efterfølgende bekræftet, at han har logget ind. Opsætningen skal ikke gentages.
- Scriptet finder udelukkende `SEEDED_USER_ID`, viser brugerens aktuelle navn/e-mail og beder om adgangskoden to gange med skjult terminalinput. Ingen adgangskode må sendes i chatten. Den seedede e-mail er oprindeligt `joe@example.com`; scriptet ændrer den ikke.
- Better Auths længdegrænser og `hashPassword` genbruges. Der tilføjes kun en credential-konto med `accountId` og `userId` lig brugerens id. Bruger og træninger bevares, og en eksisterende credential-konto afvises frem for at blive overskrevet.
- Scriptet kræver en interaktiv terminal og afviser argumenter. `.seeded-password.lock` forhindrer parallelle kørsler fra samme projekt; den fjernes ved normal afslutning eller Ctrl+C under indtastning. Ved tvungen proceslukning kan den blive liggende. Fjern kun den resterende låsefil, når ingen kørsel er aktiv. Låsen er lokal og beskytter ikke mod andre programmer, der samtidig opretter credential-konti.
- Efter vellykket kørsel skal Joe afprøve login i browseren. Scriptet kan derefter fjernes, hvis engangsopsætningen er afsluttet; behold migrationshistorikken. Sessionsbaseret adgangskontrol og dataadskillelse er fortsat næste trin.

## Navngivning

Appen hedder ZET, et ordspil på "sæt" i styrketræning. Brug `zet` i kode, repository og domæne. Vis kun navnet "Zæt" i brugerfladen, hvis Joe beslutter det.

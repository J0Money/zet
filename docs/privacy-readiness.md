# ZET: databeskyttelse før bredere brug

Status: arbejdsdokument, 29. oktober 2026. Ikke en godkendelse af compliance.
Joachim ønsker en bredere brugergruppe. Planlæg efter GDPR, ikke privatundtagelsen.
Ansvarlig er Joachim Hjertmann (fuldt navn bekræftet 29. oktober 2026), som privatperson uden firma/CVR. Dedikeret ZET-kontaktmail er ZetService@protonmail.com (Proton Mail, oprettet af Joachim 29. oktober 2026). Mindstealder er 13 år, besluttet 29. oktober 2026 (se punkt 2 nedenfor).
Ingen politik er offentliggjort, ingen aftaler accepteret og ingen sletninger udført i denne gennemgang.

## Bekræftet datakort

| Behandling | Data og formål | Kilde og adgang |
| --- | --- | --- |
| Invitation | E-mail, hash af engangskode, udløb, brug/revokering og forsøgstæller | Administrator angiver e-mail; lib/invitations.ts. Link gyldigt syv dage. Udløb er ikke dokumentation for sletning. |
| Konto og login | Navn, e-mail, passwordhash, rolle, session, IP/user agent og sikkerhedstællere | lib/auth.ts og lib/db/schema.ts. Offentlig signup deaktiveret. |
| Aldersbekræftelse | Fødselsdato, evt. bekræftelse af voksentilladelse (13-17 år) og tidspunkt | lib/invitations.ts, besluttet 29. oktober 2026. Mindstealder 13 år, håndhæves ved oprettelse. Fødselsdato vises ikke til andre brugere. Eksisterende brugere (før denne ændring) har null i disse felter. |
| Træning | Dato/tider, øvelser, sæt, kg, reps, cardio, private noter og programmer | lib/workout-store.ts. Brugerafgrænset adgang. |
| Community | Frivilligt delt snapshot, tekst, kommentarer, reaktioner, navn og billede | lib/community.ts. Andre indloggede brugere kan se delinger. Ranked beregnes af delte snapshots. |
| Øvelser/programmer | Egne øvelser oprettes som delte; programmer har separat delingsvalg | lib/workout-store.ts og lib/db/schema.ts. Oplys dette særskilt. |
| Profilbillede | Komprimeret billede i privat Blob-lager; URL i database | lib/avatars.ts. Metadata fjernes. Mislykket oprydning kan efterlade gamle blobs. |
| Push | Endpoint og nøgler knyttet til session | lib/push.ts. Generisk kommentarbesked uden kommentartekst. Browserens push-leverandør indgår. |
| Automatisk afslutning | Pas-UUID og deadline til Upstash QStash | lib/schedule-workout-expiry.ts. UUID er pseudonymt, ikke automatisk anonymt. |
| Browserlagring | zet-theme og brugeropdelte zet:log-draft:v1-nøgler | app/layout.tsx og use-local-draft.ts. Kladden slettes efter vellykket gemning; ingen generel TTL eller oprydning ved logout fundet. |

Ingen betaling, reklame- eller statistik-SDK fundet i koden. Det er ikke en gennemført netværks-/cookieaudit af produktion.

## Beslutninger og dokumentation før offentlig tekst

1. Fuldt navn på dataansvarlig (privatperson, ingen virksomhed/CVR, bekræftet 29. oktober 2026) og fungerende kontaktmail; mailudbyder skal med i leverandøroversigten, hvis rettighedsanmodninger indeholder persondata. Mailudbyder valgt: Proton Mail (Schweiz), adresse ZetService@protonmail.com. Se leverandørfund om DPA-dækning.
2. Målgruppe og mindreårige: besluttet 29. oktober 2026. Mindstealder er 13 år (den danske samtykkealder for informationssamfundstjenester efter GDPR), håndhæves teknisk ved oprettelse. 13-17-årige skal bekræfte at have fået lov af en forælder/voksen; under 13 kan slet ikke oprette en konto. Fødselsdato gemmes til dette formål, se datakortet. Behandlingsgrundlaget for selve fødselsdatoen (samtykke/legitim interesse i sikker aldersvurdering) er endnu ikke formelt dokumenteret i politikteksten.
3. Behandlingsgrundlag pr. formål: nødvendige kontofunktioner kan muligvis baseres på aftale, sikkerhed på legitim interesse med afvejning. Frivillig deling og push kræver særskilt vurdering. Browserens notifikationstilladelse er ikke i sig selv fuld GDPR-dokumentation.
4. Helbredsdata: vurder om træningsdata i sammenhængen eller fritekst kan afsløre helbred. Artikel 9-grundlag skal afklares, hvis relevant. Ingen automatisk antagelse om, at alle træningstal er almindelige eller følsomme data.
   Foreløbig vurdering 29. oktober 2026 (arbejdsvurdering, ikke juridisk rådgivning; beslutning afventer Joachim):
   - Strukturerede træningsdata (øvelser, muskelgrupper, kg, reps, distance, tid, datoer) bruges til log, rekorder og volumen. ZET udleder ikke helbredstilstand af dem. Vurderes som almindelige persondata i denne sammenhæng, men skal genvurderes, hvis ZET begynder at vise eller udlede noget om skader, sygdom eller helbred.
   - Fritekst kan indeholde helbredsoplysninger, fx skade, genoptræning eller graviditet: privat note på pas (workout.notes, maks. 5000 tegn, privat), huskenote pr. øvelsesvariant (exercise_note.note, maks. 500, privat, eksempeltekst handler om maskinindstilling), tekst ved deling (community_post.caption, maks. 1000, synlig for alle indloggede), kommentarer (community_comment.body, synlige for alle indloggede), navne på egne øvelser (exercise.name, delt med alle brugere) og programnavne (synlige ved udgivelse).
   - Profilbillede vurderes som almindelige persondata, da ZET ikke bruger biometrisk genkendelse.
   - Mulige veje: (A) minimering, dvs. kort vejledning ved fritekstfelter og i privatlivsteksten om ikke at skrive helbredsoplysninger, samt sletning på anmodning; (B) udtrykkeligt samtykke efter artikel 9, stk. 2, litra a, hvilket gør ZET til en tjeneste, der bevidst behandler helbredsdata, kræver formentlig DPIA og passer ikke med leverandøraftaler, der ikke dækker særlige kategorier; (C) fjerne eller begrænse fritekstfelter.
   - Anbefaling: A. Det mindsker risikoen og er i tråd med leverandøraftalerne, men gør det ikke umuligt, at en bruger alligevel skriver helbredsoplysninger. Restrisikoen skal stå i risikovurderingen.
   - Beslutning 29. oktober 2026: Joachim valgte A. Vejledningen "Skriv ikke om skader, sygdom eller andet helbred." (lib/health-notice.ts) vises ved privat note på pas, huskenote, delingstekst, kommentarer (kun mens man skriver), nye øvelser og nye programmer. Politikudkastet har et tilsvarende afsnit. Sletning på anmodning skal indgå i rettighedsproceduren. Kommentarer kan i dag ikke redigeres, kun slettes; udkastets formulering "selv slette teksten" skal kontrolleres for hvert felt før udgivelse.
5. Opbevaringsfrister: fastlæg, begrund og implementer dem for konti, træninger, invitationer, sessioner, sikkerhedstællere, kladder, push, blobs, køer/logs og backups. Ingen frister er vedtaget her.
6. Rettigheder: sikker identitetskontrol, indsigt og relevant dataportabilitet, rettelse, sletning, begrænsning og indsigelse. Lav dokumenteret manuel procedure først; brug ikke krav om CPR/pas som standard.
7. Leverandørroller, aktuelle underleverandører, faktiske regioner, gældende aftaler, overførselsgrundlag og backup-/logfrister skal dokumenteres for de konkrete konti.
8. Lav risikovurdering, behandlingsfortegnelse og dokumenteret screening af behov for DPIA/DPO. Lille størrelse er ikke en generel fritagelse.
9. Fastlæg kontakt og håndtering af ulovligt Community-indhold; vurder DSA og eventuelle forbrugerregler ved fremtidig offentlig/erhvervsmæssig drift.

## Leverandørfund

Kontrolleret 29. oktober 2026. Offentlig dokumentation er ikke bevis for en konkret kundeaftale.

- Vercel Hobby er den observerede plan. DPA-indledningen nævner Pro/Enterprise, mens generelle vilkår henviser til DPA. Indhent afklaring om Hobby-dækning før den erklæres tilstrækkelig. Ingen opgradering autoriseret. DPA har desuden en begrænsning vedrørende særlige kategorier af persondata; en Pro-opgradering løser ikke i sig selv helbredsdata-spørgsmålet.
- Svar fra Vercel Support 29. oktober 2026 (gemt som mail; support giver ikke juridisk rådgivning og henviser til privacy@vercel.com): DPA gælder kun Pro og Enterprise. Hobby er omfattet af Terms of Service og Privacy Notice, og DPA kan ikke fås på Hobby uden opgradering. ZETs brug (gratis, invitationsbaseret, ingen betaling/reklame) betegnes som generelt ikke-kommerciel inden for Fair Use og Acceptable Use. Standardvilkårene begrænser upload af følsomme persondata som helbredsdata uden særlige aftaler. Hobby kan vælge én EU-funktionsregion (fx fra1); builds kører dog altid i iad1 (USA), requests går gennem det globale edge-netværk, og telemetri, deploymentmetadata og buildlogs behandles på Vercels kerneinfrastruktur. Underdatabehandlere står på security.vercel.com; overførsler til USA under DPF og SCC'er i DPA'en. Konsekvens: der er i dag ingen artikel 28-databehandleraftale med Vercel for ZET. Ingen opgradering eller regionsændring er foretaget. Beslutning 29. oktober 2026: Joachim vil ikke opgradere til Vercel Pro. Alternativ hosting (som også skal erstatte Vercel Blob) er ikke undersøgt endnu.
- Railway undersøgt som alternativ 29. oktober 2026 (kun offentlige sider, intet oprettet eller underskrevet): DPA'en (railway.com/legal/dpa) supplerer Terms of Service og nævner ingen planbegrænsning, men bliver først bindende, når kunden udfylder og underskriver en DocuSign-formular (afsnit 14). Overførsler sker under DPF eller EU SCC'er; DPA'en siger, at primær behandling sker i USA. Underdatabehandlere står på trust.railway.com/item/subprocessors med ti dages varsel ved nye. Bilag A angiver ingen særlige kategorier af data. Ifølge Railways forum (ikke kontrakttekst) tilbydes ingen EU-only-garanti, logs gemmes i US West i 90 dage uanset region, og EU West er Amsterdam. Storage Buckets kører på Tigris. Priser ifølge prissiden: Free 0 USD med 1 USD forbrug pr. måned, Hobby 5 USD pr. måned. Uafklaret: om en privatperson på Free/Hobby kan underskrive DPA'en, om Free-forbruget rækker til ZET, og om Tigris står som underdatabehandler. Spørgsmålene er sendt fra ZetService@protonmail.com til privacy@railway.com 29. oktober 2026; svar afventes. Ingen Railway-konto oprettet.
- Vercel Blob var observeret i Frankfurt, men deployment-funktioner i iad1 (USA). Lov ikke EU-eksklusiv behandling. EU-region alene afgør heller ikke support-/underdatabehandleroverførsler.
- Neon beskriver DPA som indarbejdet i vilkårene. Kontroller gældende platformvilkår, den konkrete kontos region, backuphistorik og underdatabehandlere.
- Proton Mail (kontaktmail, gratis plan, oprettet 29. oktober 2026): Protons DPA definerer kunden som "any business or organization using the Services" og nævner ikke gratis/personlige konti. Dækning for ZETs konto er derfor uafklaret; spørg Proton før den erklæres. DPA'en henviser til underdatabehandlere i Protons privatlivspolitik og til overførsler inden for Schweiz, EU eller lande med tilstrækkelighedsafgørelse. Ingen opgradering autoriseret.
- Upstash-vilkårene indarbejder DPA. Kontroller QStash, log-/payload-opbevaring og region specifikt; Redis-vilkår/funktioner må ikke ukritisk overføres til QStash.

Kilder:
- https://vercel.com/legal/dpa
- https://vercel.com/legal/terms
- https://neon.com/blog/gdpr-compliance-and-neon
- https://neon.com/pdf/DPA.pdf
- https://upstash.com/trust/terms
- https://upstash.com/static/trust/dpa.pdf
- https://railway.com/legal/dpa
- https://railway.com/pricing
- https://docs.railway.com/storage-buckets
- https://proton.me/legal/dpa
- https://proton.me/support/is-proton-mail-gdpr-compliant
- https://www.datatilsynet.dk/regler-og-vejledning/cloud
- https://www.datatilsynet.dk/regler-og-vejledning/de-registreredes-rettigheder-
- https://digst.dk/sikkerhed/digitale-tilsyn/tilsyn-med-sporingsteknologiomraadet/cookievejledningen/

## Sletteprocedure: tekniske acceptkrav

Der findes endnu ikke samlet kontosletning. Test kun med isolerede testbrugere.

- Eksport skal udelade passwordhash, sessions-/pushnøgler og andre brugeres private data.
- Sletning skal håndtere database, Blob, delinger, kommentarer, reaktioner, invitationer og push samt dokumentere køer, logs og backupudløb.
- Egne øvelser/programmer kan refereres af andre. Blind cascade eller DELETE user er ikke en sikker procedure: fremmednøgler til øvelser kan blokere, eller historik kan blive påvirket. Bevar andres træningsdata og vurder nødvendigheden af anonymiseret øvelsesdefinition.
- Blob-sletning sker uden for databasetransaktion. Fejl skal kunne opdages og genforsøges, før sletning betegnes som fuldført.
- Genindlæste backups må ikke gøre slettede konti aktive igen; beskriv håndteringen.
- Lokale kladder skal kunne ryddes på den aktuelle browser. Serveren kan ikke love fjernsletning fra alle offline-enheder.

## Driftsprocedure for henvendelser og hændelser

Når kontaktmailen er klar: overvåg den, registrer modtagelse, kontroller identitet proportionalt og besvar rettighedsanmodninger uden unødig forsinkelse, som udgangspunkt senest en måned. Eventuel lovlig forlængelse skal begrundes og meddeles inden fristen. Dette er et proceskrav, ikke en vedtaget slettefrist.

Sikkerhedsbrud: begræns hændelsen, bevar nødvendigt bevismateriale, registrer tidspunkt og vurder konsekvenser. Vurder anmeldelse uden unødig forsinkelse og om muligt inden 72 timer efter kendskab, medmindre risiko er usandsynlig; høj risiko kan kræve underretning af berørte. Dokumenter også begrundelsen, hvis der ikke anmeldes.

## Rækkefølge

1. Afklar identitet, mail, målgruppe og leverandør-/helbredsdata-spørgsmål.
2. Godkend behandlingsgrundlag og begrundede opbevaringsregler.
3. Implementer og test nødvendige slette-/eksport-/oprydningsprocedurer og browserlagring.
4. Færdiggør privatlivstekst og eventuelle Community-vilkår ud fra verificeret praksis.
5. Kontrollér tekst og faktisk drift, giv eksisterende brugere information, og publicér efter godkendelse. Ingen ubetinget compliance-erklæring.

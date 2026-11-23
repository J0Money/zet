import type { Metadata } from "next";
import Link from "next/link";
import type { ReactNode } from "react";

// Pladsholder: ret datoen her, når teksten udgives eller ændres.
const LAST_UPDATED = "23. november 2026";
const CONTACT_EMAIL = "ZetService@protonmail.com";

export const metadata: Metadata = {
  title: "Privatliv | ZET",
  description: "Sådan bruger ZET dine oplysninger.",
  robots: { index: false, follow: false },
};

// Siden er offentlig og helt statisk: ingen session og ingen data. Den kan
// derfor forhåndsgenereres og læses uden login.

const linkClass = "font-medium text-indigo-600 underline hover:text-indigo-800 dark:text-indigo-400 dark:hover:text-indigo-300";
const strongClass = "font-semibold text-zinc-900 dark:text-zinc-50";

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-3">
      <h2 className="text-lg font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">{title}</h2>
      {children}
    </section>
  );
}

function ContactLink() {
  return (
    <a href={`mailto:${CONTACT_EMAIL}`} className={`${linkClass} break-all`}>
      {CONTACT_EMAIL}
    </a>
  );
}

function Code({ children }: { children: ReactNode }) {
  return (
    <code className="break-all rounded bg-zinc-100 px-1 py-0.5 font-mono text-[13px] text-zinc-800 dark:bg-zinc-800 dark:text-zinc-200">
      {children}
    </code>
  );
}

export default function PrivacyPage() {
  return (
    <div className="mx-auto w-full max-w-2xl px-5 pb-12 pt-10 sm:pt-16">
      <Link href="/" className={`mb-6 inline-flex min-h-11 items-center text-sm ${linkClass}`}>
        ← Tilbage
      </Link>
      <p className="mb-8 text-sm font-bold tracking-[0.22em] text-indigo-600">ZET</p>
      <h1 className="text-3xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">Privatliv i ZET</h1>
      <p className="mt-3 text-sm text-zinc-500 dark:text-zinc-400">Senest opdateret: {LAST_UPDATED}</p>

      <div className="mt-10 flex flex-col gap-10 text-[15px] leading-7 text-zinc-700 dark:text-zinc-300">
        <Section title="Ansvarlig og kontakt">
          <p>
            ZET drives af Joachim Hjertmann som privatperson. Spørgsmål om dine oplysninger og anmodninger om at bruge
            dine rettigheder kan sendes til <ContactLink />.
          </p>
        </Section>

        <Section title="Hvilke oplysninger bruges og hvorfor?">
          <p>
            Ved invitation og oprettelse bruges e-mail, navn og en adgangskode, som gemmes i form af et hash. Konto- og
            loginoplysninger bruges til at give dig adgang og beskytte kontoen. Login kan omfatte IP-adresse og
            browseroplysninger. E-mail, navn, adgangskode og fødselsdato skal oplyses for at oprette en konto; uden dem
            kan du ikke bruge ZET.
          </p>
          <p>
            Hvis du glemmer din adgangskode, kan du bede om et nyt link på login-siden. Findes din e-mail i ZET, gemmes
            en anmodning med din konto og tidspunktet, så administratoren kan se den. ZET sender ikke selv e-mails.
            Administratoren laver et engangslink og sender det til dig ad en vej, I aftaler, fx en besked eller en mail.
            Når linket laves, slettes anmodningen. Linket gælder i 24 timer, kan kun bruges én gang, og ZET gemmer kun
            en hashet udgave af det. Når du har valgt en ny adgangskode, logges du ud på alle enheder, og linket
            slettes. En anmodning, der ikke bliver til et link, udløber efter 7 dage og slettes senest 7 dage efter
            udløb.
          </p>
          <p>
            Ved oprettelse oplyser du din fødselsdato, så vi kan kontrollere, at du er mindst 13 år. Er du mellem 13 og
            17 år, bekræfter du, at en voksen har givet lov. Fødselsdatoen bruges kun til kontrollen og gemmes ikke. Vi
            gemmer kun, om du var 13-17 år med voksentilladelse eller 18 år eller ældre, og hvornår kontrollen skete.
          </p>
          <p>
            ZET gemmer de øvelser, sæt, gentagelser, belastninger, cardiotal, datoer, noter og programmer, du
            registrerer. Oplysningerne bruges til historik, overblik og beregnede træningsresultater. Hvis du uploader
            et profilbillede, gemmes en bearbejdet udgave af billedet.
          </p>
          <p>
            ZET er en træningslog og er ikke beregnet til oplysninger om dit helbred. Skriv derfor ikke om skader,
            sygdom eller andet helbred i noter, opslag, kommentarer eller navne på øvelser og programmer. For at hjælpe
            dig afviser ZET tekst med tydelige ord om helbred, fx skade, smerte eller medicin, inden den gemmes.
            Kontrollen fanger ikke alt, så det er stadig vigtigt, at du selv lader være. Noter på træninger og øvelser
            kan du selv rette og slette. Opslagstekst og egne kommentarer kan du slette. Et program slettes med sit
            navn. Navne på øvelser, du har oprettet, kan du ikke selv ændre; skriv til os, så retter eller sletter vi
            dem.
          </p>
        </Section>

        <Section title="Hvorfor må ZET bruge oplysningerne?">
          <ul className="flex list-disc flex-col gap-3 pl-5">
            <li>
              <strong className={strongClass}>Konto, login og træningsdata</strong> (e-mail, navn, adgangskode, pas,
              sæt, cardio, noter, programmer og egne øvelser): fordi de er nødvendige for at levere den træningslog, du
              har oprettet en konto til (aftale, databeskyttelsesforordningens artikel 6, stk. 1, litra b).
            </li>
            <li>
              <strong className={strongClass}>Frivillige funktioner</strong> (deling i Community, Ranked, kommentarer,
              reaktioner og profilbillede): fordi du selv vælger at bruge dem som en del af tjenesten (aftale, litra
              b). Du kan trække en deling tilbage, slette dine kommentarer og fjerne dit billede.
            </li>
            <li>
              <strong className={strongClass}>Push-notifikationer</strong>: fordi du selv slår dem til (samtykke, litra
              a). Du kan slå dem fra i Indstillinger når som helst.
            </li>
            <li>
              <strong className={strongClass}>Sikkerhed og drift</strong> (sessioner, IP-adresser i login-tællere,
              logs, sikkerhedskopier og listen over slettede konti): for at beskytte konti mod misbrug og kunne genskabe
              ZET efter fejl (legitim interesse, litra f).
            </li>
            <li>
              <strong className={strongClass}>Invitationer og alderskontrol</strong> (den inviteredes e-mail og
              kontrollen af, at du er mindst 13 år): for at holde ZET lukket for inviterede og ikke oprette konti til
              børn under 13 (legitim interesse, litra f).
            </li>
          </ul>
          <p>ZET behandler ikke helbredsoplysninger med vilje, se ovenfor.</p>
          <p>
            Når ZET bygger på legitim interesse, har vi vurderet, at behandlingen er nødvendig, at vi bruger så få
            oplysninger som muligt, og at den ikke går ud over dine interesser. Du kan gøre indsigelse ved at skrive til{" "}
            <ContactLink />. Sikkerhed og sikkerhedskopier kan ikke slås fra for en enkelt konto, så i praksis vil
            svaret ofte være, at du kan slette din konto.
          </p>
          <p>
            ZET træffer ingen afgørelser om dig alene ud fra automatisk behandling. Appen gør nogle ting automatisk, fx
            afviser tekst med helbredsord, lukker et glemt træningspas efter en time uden nye sæt, begrænser gentagne
            loginforsøg og sorterer Ranked efter delte resultater. Ingen af delene har retsvirkning for dig.
          </p>
        </Section>

        <Section title="Hvad kan andre brugere se?">
          <p>
            Når du deler en træning, kan alle andre indloggede brugere se dit navn, dit profilbillede, din opslagstekst
            og en kopi af træningen: dato, varighed, øvelsernes navne, hvert sæt med kg og gentagelser, cardio med
            distance og tid, og nye rekorder sammen med din tidligere bedste. Private træningsnoter følger ikke med.
            Delte resultater kan indgå i Ranked, som viser top 3 pr. øvelse med navn og billede.
          </p>
          <p>
            Kopien ændres ikke, hvis du senere retter træningen. Du kan trække delingen tilbage, og så forsvinder
            opslaget med kommentarer og reaktioner. Sletter du træningen, slettes opslaget også. Andre kan kommentere og
            reagere på dit opslag. Kun den, der har skrevet en kommentar, kan slette den.
          </p>
          <p>
            Øvelser, du opretter, er private, indtil administratoren godkender dem. Administratoren kan se, hvem der har
            oprettet en øvelse. En godkendt øvelse kan bruges af alle. Programmer er private, indtil du selv vælger at
            dele dem; så kan andre se navnet og øvelserne.
          </p>
        </Section>

        <Section title="Lagring i browseren og notifikationer">
          <p>
            ZET bruger én cookie, der holder dig logget ind (<Code>better-auth.session_token</Code>, med{" "}
            <Code>__Secure-</Code> foran på https). Den gælder i 7 dage og forlænges, mens du bruger appen. Den slettes,
            når du logger ud. ZET gemmer også dit temavalg (<Code>zet-theme</Code>) og kladder til træninger, du ikke har
            gemt endnu (<Code>zet:log-draft:...</Code>), i browserens lokale lager. Kladderne kan indeholde sæt, cardio
            og huskenoter. De sendes ikke til serveren, slettes, når du trykker Log ud, og kasseres, hvis de er mere end
            2 dage gamle, næste gang du åbner Log. Temavalget bliver liggende, til du rydder browserens data. Alle tre er
            nødvendige for de funktioner, du selv bruger, så de kræver ikke samtykke. ZET bruger ingen analyse- eller
            reklamecookies og ingen tredjepartsscripts.
          </p>
          <p>
            Push er valgfrit og gælder den enhed, du slår det til på. Ved tilmelding gemmes tekniske oplysninger til at
            sende notifikationer til din browser. Notifikationen siger kun, at nogen har kommenteret din træning, og
            linker til opslaget; den indeholder ikke selve kommentaren. Du slår push fra i Indstillinger. Logger du ud,
            stopper push også på den enhed.
          </p>
        </Section>

        {/* ÅBENT: Neon (tidligere database) har stadig data, indtil Neon-projektet er slettet (ca. 2. december 2026); udgiv først teksten derefter. Vercel og Upstash er slettet 18. november 2026. */}
        <Section title="Leverandører og behandling uden for EU/EØS">
          <p>
            ZET bruger disse leverandører. De behandler kun oplysninger efter vores aftaler med dem
            (databehandleraftaler), medmindre andet står nedenfor.
          </p>
          <ul className="flex list-disc flex-col gap-3 pl-5">
            <li>
              <strong className={strongClass}>Railway</strong> (Railway Corporation, USA) hoster appen og databasen.
              Begge kører i Railways EU-region i Amsterdam, og databasen kan kun nås fra appen og ZETs backup-job, ikke
              direkte fra internettet. Railway gemmer tekniske logs, herunder IP-adresse og oplysninger om
              forespørgsler, i USA i 90 dage. For disse brugs- og logdata er Railway selvstændig dataansvarlig og
              behandler dem efter sin egen privatlivspolitik. Overførsel til USA sker under EU-U.S. Data Privacy
              Framework eller EU&apos;s standardkontraktbestemmelser.
            </li>
            {/* Tigris Data står på trust.railway.com/item/subprocessors (tjekket 23. november 2026). */}
            <li>
              <strong className={strongClass}>Profilbilleder og sikkerhedskopier</strong> gemmes i Railways lager
              (Railway Buckets) i EU-regionen i Amsterdam. Billeder og sikkerhedskopier ligger i hver sit lager.
              Lageret drives af Tigris Data, som er Railways underdatabehandler og derfor er omfattet af Railways
              databehandleraftale. Tigris oplyser USA, EU og Singapore som steder, hvor de behandler data, og Railway
              lover ikke, at alt kun behandles i EU.
            </li>
            <li>
              <strong className={strongClass}>Proton Mail</strong> (Proton AG, Schweiz) bruges til ZETs kontaktmail.
              Schweiz har en afgørelse fra EU-Kommissionen om tilstrækkeligt beskyttelsesniveau.
            </li>
            <li>
              <strong className={strongClass}>Browserens push-tjeneste</strong> (fx fra Apple, Google eller Mozilla,
              afhængigt af din browser) leverer notifikationer, hvis du slår dem til. Indholdet er krypteret, så
              tjenesten ikke kan læse det, men den ser, at der sendes en notifikation til din enhed.
            </li>
          </ul>
        </Section>

        <Section title="Opbevaring og dine rettigheder">
          <p>
            Dine oplysninger gemmes, så længe du har en konto. Du kan selv slette kontoen i Indstillinger. Så slettes
            dine træninger, noter, programmer, opslag, kommentarer, reaktioner og dit profilbillede. Øvelser, du har
            oprettet, og som andre har brugt, beholdes uden tilknytning til dig, så andres træningshistorik ikke går i
            stykker.
          </p>
          {/* ÅBENT: Kontroller, om lageret beholder slettede kopier. Afventer Railways svar. */}
          <p>
            Hver nat tages en sikkerhedskopi af hele databasen, så data kan genskabes efter fejl. De 14 nyeste kopier
            gemmes, svarende til cirka 14 dage, og ældre kopier slettes automatisk. Sletter du din konto, kan dine
            oplysninger derfor stadig findes i sikkerhedskopierne i op til cirka 14 dage. Kopierne bruges kun til at
            genskabe ZET efter fejl. For at en slettet konto ikke kommer tilbage, hvis en kopi en dag skal genindlæses,
            gemmer vi kontoens tekniske id (et tilfældigt nummer, ikke navn eller e-mail) og tidspunktet for sletningen
            i 15 dage. Genindlæser vi en kopi, sletter vi kontoen igen ud fra den liste.
          </p>
          <p>
            Andre oplysninger slettes automatisk efter faste frister. Oprydningen kører én gang i døgnet, så en
            oplysning kan ligge op til et døgn længere end fristen:
          </p>
          <ul className="flex list-disc flex-col gap-2 pl-5">
            <li>
              Udløbne login-sessioner (med IP-adresse og browseroplysninger), udløbne links til ny adgangskode og
              udløbne anmodninger om nyt link: 7 dage efter udløb.
            </li>
            <li>
              Invitationer (med den inviteredes e-mail): 30 dage efter, at invitationen er brugt, udløbet eller trukket
              tilbage.
            </li>
            <li>Tællere, der begrænser gentagne loginforsøg (med IP-adresse): 1 døgn.</li>
            <li>Tekniske engangs-id&apos;er, der forhindrer, at det samme sæt gemmes to gange: 3 dage.</li>
          </ul>
          <p>Railway gemmer selv tekniske logs i 90 dage i USA, se under leverandører.</p>
          <p>
            Efter databeskyttelsesreglerne kan du afhængigt af behandlingen og betingelserne anmode om indsigt,
            rettelse, sletning, begrænsning, gøre indsigelse og få udleveret data i et flytbart format. Skriv til{" "}
            <ContactLink />. Vi svarer senest en måned efter, at vi har modtaget din anmodning, og kan bede dig
            bekræfte, at det er din konto, fx ved at skrive fra den e-mail, du er oprettet med. ZET har ingen knap til
            at hente dine data, så en kopi sendes til dig som en fil. Hvis en behandling bygger på samtykke, kan du
            trække det tilbage uden at påvirke lovligheden af behandlingen før tilbagekaldelsen. Du kan klage til
            Datatilsynet via{" "}
            <a href="https://www.datatilsynet.dk/" className={`${linkClass} break-all`} rel="noopener noreferrer">
              https://www.datatilsynet.dk/
            </a>
            .
          </p>
        </Section>
      </div>
    </div>
  );
}

// Vises ved fritekstfelter. ZET er ikke beregnet til helbredsoplysninger,
// se punkt 4 i docs/privacy-readiness.md.
export const HEALTH_NOTICE = "Skriv ikke om skader, sygdom eller andet helbred.";

// Ord, der tydeligt handler om helbred. "*" betyder, at ordet også rammer endelser
// (fx "skade*" rammer "skaden" og "skadet"). Kropsdele er bevidst ikke med, da de
// er almindelige i træning ("knæbøj", "ryglæn"). Filtret fanger ikke alt; det er
// en ekstra sikring oven på advarslen, ikke en garanti.
const HEALTH_TERMS = [
  // Dansk
  "skade*", "smerte*", "ondt", "operation*", "opereret", "operere*", "medicin*", "piller",
  "diagnose*", "sygdom*", "syg", "syge", "sygemeld*", "sygehus*", "hospital*", "læge", "lægen", "lægens", "læger*", "lægeaftale*",
  "gravid*", "depression*", "deprimeret", "angst*", "spiseforstyrr*", "astma*", "diabet*", "epilep*",
  "migræne*", "blodtryk*", "hjertesyg*", "kræft*", "cancer*", "gigt*", "betændelse*", "forstuv*",
  "brækket", "fysioterap*", "genoptræn*", "insulin*", "allergi*", "inhalator*", "menstru*",
  "steroid*", "kemo*", "sclerose*", "bipolar*", "skizofren*", "adhd", "autis*",
  // Engelsk
  // "pain" og "hurt" uden "*", ellers rammes "painting" og danske "hurtig".
  "injur*", "pain", "pains", "painful", "hurt", "hurts", "hurting", "surgery", "surgeon*", "medication*", "medicine*", "meds",
  "diagnos*", "illness*", "sick*", "disease*", "pregnan*", "depressed", "anxiety", "asthma*",
  "doctor*", "physio*", "rehab*", "sprain*", "fractur*", "concussion*", "arthritis", "migraine*",
];

const pattern = new RegExp(
  `(?<![\\p{L}\\p{N}])(?:${HEALTH_TERMS.map((term) => term.endsWith("*")
    ? `${term.slice(0, -1)}[\\p{L}\\p{N}]*` : `${term}(?![\\p{L}\\p{N}])`).join("|")})`,
  "iu",
);

// Returnerer det første helbredsord i teksten, eller null.
export function findHealthTerm(text: string): string | null {
  return pattern.exec(text)?.[0] ?? null;
}

export function healthTermError(term: string) {
  return `"${term}" ligner en helbredsoplysning, og den slags gemmer ZET ikke. Skriv teksten uden.`;
}

// Til formularer: fejlteksten mens brugeren skriver, så teksten aldrig sendes.
export function healthWarning(text: string): string | null {
  const term = findHealthTerm(text);
  return term ? healthTermError(term) : null;
}

// Fælles tjek til Server Actions: null, hvis teksterne er i orden.
export function rejectHealthText(...texts: unknown[]): string | null {
  for (const text of texts) {
    const term = typeof text === "string" ? findHealthTerm(text) : null;
    if (term) return healthTermError(term);
  }
  return null;
}

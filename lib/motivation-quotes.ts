// lib/motivation-quotes.ts
//
// Et lille, tilfældigt citat/en sjov besked på login-siden, ren stemning,
// ikke faktuelle påstande. Blander alvor og humor med vilje.

const quotes: string[] = [
  "Det sæt, du ikke gider tage, er præcis det, der tæller mest.",
  "Ingen har nogensinde fortrudt en træning, kun dem de sprang over.",
  "Gårsdagens dig satte rekorden. I dag er det din tur til at slå den.",
  "Small steps, big squats.",
  "Hvis det var let, ville alle gøre det. Heldigvis er du ikke alle.",
  "Motivation får dig i gang. Vane holder dig i gang.",
  "Den bedste træning er den, du rent faktisk gennemfører.",
  "Du behøver ikke være motiveret, du skal bare møde op.",
  "Et dårligt træningspas er stadig bedre end ingen træningspas.",
  "Stærkere end i går, det er hele pointen.",
  "Benene ryster? Godt. Det betyder, de lærer noget.",
  "Disciplin er at vælge mellem det, du vil nu, og det, du vil mest.",
  "Ingen genveje, kun gentagelser.",
  "Du konkurrerer kun med den version af dig selv, der ikke trænede i dag.",
  "Svedperler er bare fedt, der græder.",
  "Træn, som om nogen overtager din krop i morgen, og du vil ikke levere den tilbage i dårlig stand.",
];

export function getRandomQuote(): string {
  return quotes[Math.floor(Math.random() * quotes.length)];
}

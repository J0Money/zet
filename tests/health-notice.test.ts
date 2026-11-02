import assert from "node:assert/strict";
import { test } from "node:test";
import { findHealthTerm, rejectHealthText } from "../lib/health-notice";

test("Tydelige helbredsord fanges på dansk og engelsk", () => {
  for (const text of ["Har en skade i skulderen", "SMERTER efter løb", "har ondt i knæet", "Opereret i foråret",
    "tager medicin", "lægen sagde pause", "gravid i 5. måned", "astmaanfald", "knee injury", "back pain", "pregnant", "Physio på torsdag"]) {
    assert.notEqual(findHealthTerm(text), null, text);
  }
});

test("Almindelige træningsord giver ikke falsk alarm", () => {
  for (const text of ["Knæbøj 3x5", "Sæde 4 · ryglæn 2", "Bænk 30°", "Rygøvelser med Erik", "Hurtig træning!",
    "Leg day", "Pushdag", "Lægpres", "Ro i maskine", "Painting day, så deadlift", "Sygt godt pas", "Hurtigt pas"]) {
    assert.equal(findHealthTerm(text), null, text);
  }
});

test("Serverens fælles tjek returnerer fejl ved første helbredsord", () => {
  assert.equal(rejectHealthText("Fint pas", undefined, null), null);
  assert.match(rejectHealthText("Fint pas", "lidt syg i dag")!, /"syg"/);
});

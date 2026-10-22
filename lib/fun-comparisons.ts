// lib/fun-comparisons.ts
//
// "Hvor tung er det egentlig?" Omregner en samlet løftet volumen (kg) til en
// sjov, konkret sammenligning, ren stemning. Vægtene er grove, almindeligt
// kendte tommelfingerregler (et gennemsnitligt køleskab, en lille bil...),
// ikke opslåede fakta, det er ikke pointen her.

type ComparisonObject = { singular: string; plural: string; article: string; kg: number };

// Sorteret efter stigende vægt.
const objects: ComparisonObject[] = [
  { singular: "køleskab", plural: "køleskabe", article: "et", kg: 70 },
  { singular: "klaver", plural: "klaverer", article: "et", kg: 300 },
  { singular: "lille bil", plural: "små biler", article: "en", kg: 1200 },
  { singular: "elefant", plural: "elefanter", article: "en", kg: 5000 },
  { singular: "bus", plural: "busser", article: "en", kg: 12000 },
];

// Vælger det største objekt, totalKg stadig udgør mindst én af, så
// sammenligningen føles konkret frem for et lille decimaltal.
export function getWeightComparison(totalKg: number): string | null {
  if (totalKg <= 0) return null;

  const biggestFitting = [...objects].reverse().find((object) => totalKg >= object.kg);
  if (!biggestFitting) {
    const smallest = objects[0];
    const percent = Math.max(1, Math.round((totalKg / smallest.kg) * 100));
    return `≈ ${percent}% af ${smallest.article} ${smallest.singular}`;
  }

  const count = totalKg / biggestFitting.kg;
  if (count < 1.5) {
    return `≈ ${biggestFitting.article} ${biggestFitting.singular}`;
  }

  const rounded = count >= 10 ? Math.round(count) : Math.round(count * 10) / 10;
  return `≈ ${rounded.toLocaleString("da-DK")} ${biggestFitting.plural}`;
}

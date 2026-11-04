import assert from "node:assert/strict";
import { test } from "node:test";
import { MAX_RANKED_PINS, parseRankedPins, rankedPinId, serializeRankedPins, type RankedPin } from "../lib/community-ranked-pins";

test("parseRankedPins accepts valid pins and rejects duplicates and overflow", () => {
  const pins: RankedPin[] = [
    { exerciseKey: "lat pulldown", name: "Lat pulldown", equipment: "cable" },
    { exerciseKey: "bench press", name: "Bench press", equipment: "barbell" },
  ];
  const raw = serializeRankedPins(pins);
  assert.deepEqual(parseRankedPins(raw), pins);
  assert.deepEqual(parseRankedPins(serializeRankedPins([
    ...pins,
    { exerciseKey: "lat pulldown", name: "Lat pulldown", equipment: "cable" },
  ])), pins);
  assert.deepEqual(parseRankedPins(serializeRankedPins([
    ...pins,
    { exerciseKey: "squat", name: "Squat", equipment: "barbell" },
    { exerciseKey: "deadlift", name: "Deadlift", equipment: "barbell" },
  ])).length, MAX_RANKED_PINS);
  assert.deepEqual(parseRankedPins('{"not":"array"}'), []);
  assert.equal(rankedPinId(pins[0]), "lat pulldown:cable");
});

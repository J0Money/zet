import assert from "node:assert/strict";
import test from "node:test";
import { displayExerciseName, englishExerciseName, variantName } from "../lib/exercise-names";
import { parseSlotKey, slotKey } from "../lib/exercise-side";
import { variantFor } from "../lib/exercise-groups";
import type { Exercise } from "../lib/types";

test("slotKey og parseSlotKey er hinandens modsætning", () => {
  assert.equal(slotKey("cable"), "cable");
  assert.equal(slotKey("cable", "single_arm"), "cable:single_arm");
  assert.equal(slotKey(null, "single_leg"), "none");
  assert.deepEqual(parseSlotKey("cable:single_arm"), { equipment: "cable", side: "single_arm" });
  assert.deepEqual(parseSlotKey("none"), { equipment: null, side: "both" });
  assert.equal(parseSlotKey("none:single_arm"), null);
  assert.equal(parseSlotKey("cable:both:x"), null);
  assert.equal(parseSlotKey("rocket"), null);
  assert.equal(parseSlotKey("cable:left"), null);
  assert.equal(parseSlotKey(undefined), null);
});

test("navne med side vises på dansk og kan bygges igen", () => {
  assert.equal(variantName("Row", "cable"), "Row (Cable)");
  assert.equal(variantName("Row", "cable", "single_arm"), "Row (Cable, Single arm)");
  assert.equal(variantName("Squat", null, "single_leg"), "Squat");
  assert.equal(displayExerciseName("Row (Cable, Single arm)"), "Row (Kabel, én arm)");
  assert.equal(displayExerciseName("Lunges (Dumbbells, Single leg)"), "Lunges (Dumbbells, ét ben)");
  assert.equal(displayExerciseName("Row (Cable)"), "Row (Kabel)");
  assert.equal(displayExerciseName("Ro (Kabel, Single arm)"), "Row (Kabel, én arm)");
  assert.equal(englishExerciseName("Ro (Kabel, Single arm)"), "Row (Cable, Single arm)");
  assert.equal(displayExerciseName("Squat"), "Squat");
});

test("variantFor finder præcis udstyr og side", () => {
  const make = (id: string, equipment: Exercise["equipment"], side?: Exercise["side"]): Exercise => ({
    id, user_id: null, name: "Row", type: "strength", muscle_groups: [], group_name: "Row", equipment, side,
  });
  const choice = { key: "group:Row", label: "Row", variants: [make("a", "cable"), make("b", "cable", "single_arm")] };
  assert.equal(variantFor(choice, "cable", "both")?.id, "a");
  assert.equal(variantFor(choice, "cable", "single_arm")?.id, "b");
  assert.equal(variantFor(choice, "cable", "single_leg"), null);
  assert.equal(variantFor(choice, "machine", "both"), null);
});

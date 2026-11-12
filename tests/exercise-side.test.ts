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
  assert.deepEqual(parseSlotKey("cable:single_arm"), { equipment: "cable", side: "single_arm", grip: null });
  assert.deepEqual(parseSlotKey("none"), { equipment: null, side: "both", grip: null });
  assert.equal(parseSlotKey("none:single_arm"), null);
  assert.equal(parseSlotKey("cable:both:x"), null);
  assert.equal(parseSlotKey("rocket"), null);
  assert.equal(parseSlotKey("cable:left"), null);
  assert.equal(parseSlotKey(undefined), null);
});

test("greb findes kun på kabel", () => {
  assert.equal(slotKey("cable", "both", "rope"), "cable:both:rope");
  assert.equal(slotKey("cable", "single_arm", "single_handle"), "cable:single_arm:single_handle");
  assert.equal(slotKey("machine", "both", "rope"), "machine");
  assert.deepEqual(parseSlotKey("cable:both:rope"), { equipment: "cable", side: "both", grip: "rope" });
  assert.equal(parseSlotKey("machine:both:rope"), null);
  assert.equal(parseSlotKey("none:both:rope"), null);
  assert.equal(parseSlotKey("cable:both:rope:x"), null);
  assert.equal(variantName("Curl", "cable", "both", "rope"), "Curl (Cable, Rope)");
  assert.equal(variantName("Row", "cable", "single_arm", "single_handle"), "Row (Cable, Single handle, Single arm)");
  assert.equal(variantName("Row", "machine", "both", "rope"), "Row (Machine)");
  assert.equal(displayExerciseName("Curl (Cable, Rope)"), "Curl (Kabel, reb)");
  assert.equal(displayExerciseName("Row (Cable, Single handle, Single arm)"), "Row (Kabel, enkelt håndtag, én arm)");
  assert.equal(englishExerciseName("Ro (Kabel, V grip)"), "Row (Cable, V grip)");
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
  const make = (id: string, equipment: Exercise["equipment"], side?: Exercise["side"], grip?: Exercise["grip"]): Exercise => ({
    id, user_id: null, name: "Row", type: "strength", muscle_groups: [], group_name: "Row", equipment, side, grip,
  });
  const choice = { key: "group:Row", label: "Row", variants: [make("a", "cable"), make("b", "cable", "single_arm"), make("c", "cable", "both", "rope")] };
  assert.equal(variantFor(choice, { equipment: "cable", side: "both", grip: null })?.id, "a");
  assert.equal(variantFor(choice, { equipment: "cable", side: "single_arm", grip: null })?.id, "b");
  assert.equal(variantFor(choice, { equipment: "cable", side: "both", grip: "rope" })?.id, "c");
  assert.equal(variantFor(choice, { equipment: "cable", side: "both", grip: "v_grip" }), null);
  assert.equal(variantFor(choice, { equipment: "cable", side: "single_leg", grip: null }), null);
  assert.equal(variantFor(choice, { equipment: "machine", side: "both", grip: null }), null);
});

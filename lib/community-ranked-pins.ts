import { EQUIPMENT } from "./equipment";
import type { Equipment } from "./types";

export const RANKED_PINS_KEY_PREFIX = "zet:community-ranked-pins:";
export const MAX_RANKED_PINS = 3;

export type RankedPin = {
  exerciseKey: string;
  name: string;
  equipment: Equipment | "unspecified";
};

const equipmentValues = new Set<string>([...EQUIPMENT, "unspecified"]);

export function rankedPinsKey(userId: string) {
  return `${RANKED_PINS_KEY_PREFIX}v1:${userId}`;
}

export function rankedPinId(pin: RankedPin) {
  return `${pin.exerciseKey}:${pin.equipment}`;
}

function isRankedPin(value: unknown): value is RankedPin {
  return (
    typeof value === "object" &&
    value !== null &&
    typeof (value as RankedPin).exerciseKey === "string" &&
    (value as RankedPin).exerciseKey.length > 0 &&
    (value as RankedPin).exerciseKey.length <= 120 &&
    typeof (value as RankedPin).name === "string" &&
    (value as RankedPin).name.length > 0 &&
    (value as RankedPin).name.length <= 120 &&
    equipmentValues.has((value as RankedPin).equipment)
  );
}

export function parseRankedPins(raw: string | null): RankedPin[] {
  if (!raw || raw.length > 20_000) return [];
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed) || parsed.length > MAX_RANKED_PINS) return [];
    const pins: RankedPin[] = [];
    const seen = new Set<string>();
    for (const item of parsed) {
      if (!isRankedPin(item)) return [];
      const id = rankedPinId(item);
      if (seen.has(id)) continue;
      seen.add(id);
      pins.push(item);
    }
    return pins;
  } catch {
    return [];
  }
}

export function serializeRankedPins(pins: RankedPin[]) {
  return JSON.stringify(pins.slice(0, MAX_RANKED_PINS));
}

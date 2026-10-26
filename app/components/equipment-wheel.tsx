"use client";

import { useRef, useState } from "react";
import type { KeyboardEvent, PointerEvent } from "react";
import { Barbell, CircleDashed, DotsThree, Gear, HandGrabbing, Path, PersonSimple } from "@phosphor-icons/react";
import type { Icon } from "@phosphor-icons/react";
import { equipmentLabel } from "@/lib/equipment";
import type { WheelKey, WheelOption } from "@/lib/exercise-groups";
import type { Equipment } from "@/lib/types";

const STEP_DEG = 38;
const RADIUS_PX = 125;
// Grader pr. pixel, tommelen trækker; lavere giver et "tungere" hjul.
const DRAG_FACTOR = 0.45;
const OVERSCROLL_DEG = 14;

const equipmentIcon: Record<Equipment, Icon> = {
  barbell: Barbell,
  dumbbells: HandGrabbing,
  machine: Gear,
  cable: Path,
  bodyweight: PersonSimple,
  other: DotsThree,
};

export function EquipmentWheel({
  options,
  selectedKey,
  onSelect,
}: {
  options: WheelOption[];
  selectedKey: WheelKey;
  onSelect: (key: WheelKey) => void;
}) {
  const index = Math.max(0, options.findIndex((option) => option.key === selectedKey));
  // Under et træk følger hjulet fingeren direkte; null betyder "i hvile",
  // hvor det står på den valgte variant og fjedrer på plads.
  const [dragRotation, setDragRotation] = useState<number | null>(null);
  const drag = useRef({ active: false, startX: 0, base: 0, moved: false });
  const maxRotation = -(options.length - 1) * STEP_DEG;

  function select(nextIndex: number) {
    const clamped = Math.max(0, Math.min(options.length - 1, nextIndex));
    if (clamped !== index) navigator.vibrate?.(10);
    onSelect(options[clamped].key);
  }

  function onPointerDown(event: PointerEvent<HTMLDivElement>) {
    event.currentTarget.setPointerCapture(event.pointerId);
    drag.current = { active: true, startX: event.clientX, base: -index * STEP_DEG, moved: false };
  }

  function onPointerMove(event: PointerEvent<HTMLDivElement>) {
    if (!drag.current.active) return;
    const dx = event.clientX - drag.current.startX;
    if (Math.abs(dx) > 5) drag.current.moved = true;
    if (!drag.current.moved) return;
    const rotation = drag.current.base + dx * DRAG_FACTOR;
    setDragRotation(Math.max(maxRotation - OVERSCROLL_DEG, Math.min(OVERSCROLL_DEG, rotation)));
  }

  function onPointerUp(event: PointerEvent<HTMLDivElement>) {
    if (!drag.current.active) return;
    drag.current.active = false;
    setDragRotation(null);
    if (drag.current.moved) {
      const rotation = drag.current.base + (event.clientX - drag.current.startX) * DRAG_FACTOR;
      select(Math.round(-rotation / STEP_DEG));
      return;
    }
    // Et tryk uden træk: pointer capture sender ikke klikket videre til
    // selve varianten, så den findes ud fra fingerens position.
    const hit = document.elementFromPoint(event.clientX, event.clientY)?.closest("[data-wheel-index]");
    if (hit) select(Number(hit.getAttribute("data-wheel-index")));
  }

  function onKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key === "ArrowRight" || event.key === "ArrowDown") {
      event.preventDefault();
      select(index + 1);
    } else if (event.key === "ArrowLeft" || event.key === "ArrowUp") {
      event.preventDefault();
      select(index - 1);
    }
  }

  const rotation = dragRotation ?? -index * STEP_DEG;

  return (
    <div
      role="radiogroup"
      aria-label="Udstyr"
      onKeyDown={onKeyDown}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={() => {
        drag.current.active = false;
        setDragRotation(null);
      }}
      className="relative h-[130px] cursor-grab touch-pan-y select-none overflow-hidden active:cursor-grabbing"
    >
      <span
        aria-hidden="true"
        className="absolute left-1/2 top-0 z-10 -ml-1.5 h-0 w-0 border-x-[6px] border-t-8 border-x-transparent border-t-indigo-600"
      />
      <div
        className="absolute left-1/2 top-[14px] -ml-40 h-80 w-80 rounded-full border border-dashed border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800/40"
        style={{
          transform: `rotate(${rotation}deg)`,
          transition: dragRotation === null ? "transform 450ms cubic-bezier(0.34, 1.56, 0.64, 1)" : "none",
        }}
      >
        {options.map((option, optionIndex) => {
          const ItemIcon = option.equipment ? equipmentIcon[option.equipment] : CircleDashed;
          const label = option.equipment ? equipmentLabel[option.equipment] : "Uden udstyr";
          const isSelected = optionIndex === index;
          return (
            <div
              key={option.key}
              className="absolute left-1/2 top-1/2 h-0 w-0"
              style={{ transform: `rotate(${optionIndex * STEP_DEG}deg) translateY(-${RADIUS_PX}px)` }}
            >
              <button
                type="button"
                role="radio"
                aria-checked={isSelected}
                aria-label={option.variant ? label : `${label} (ny variant)`}
                tabIndex={isSelected ? 0 : -1}
                data-wheel-index={optionIndex}
                className={`absolute flex -translate-x-1/2 -translate-y-1/2 flex-col items-center gap-0.5 whitespace-nowrap rounded-xl px-2 py-1 text-xs transition-colors ${
                  isSelected ? "font-semibold text-indigo-600 dark:text-indigo-400" : "text-zinc-500 dark:text-zinc-400"
                } ${option.variant ? "" : "opacity-60"}`}
              >
                <ItemIcon aria-hidden="true" size={26} weight={isSelected ? "fill" : "regular"} />
                {label}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}

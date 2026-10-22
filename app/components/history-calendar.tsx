"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { CaretLeft, CaretRight } from "@phosphor-icons/react";
import type { Workout } from "@/lib/types";

const WEEKDAY_LABELS = ["Man", "Tir", "Ons", "Tor", "Fre", "Lør", "Søn"];

type Cell = { date: string; day: number } | null;

function buildMonthGrid(year: number, month: number): Cell[][] {
  const daysInMonth = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
  const firstWeekday = new Date(Date.UTC(year, month, 1)).getUTCDay(); // 0 = søndag
  const leadingBlanks = (firstWeekday + 6) % 7; // forskudt til mandag som første dag

  const cells: Cell[] = Array.from({ length: leadingBlanks }, () => null);
  for (let day = 1; day <= daysInMonth; day++) {
    const date = new Date(Date.UTC(year, month, day)).toISOString().slice(0, 10);
    cells.push({ date, day });
  }
  while (cells.length % 7 !== 0) {
    cells.push(null);
  }

  const weeks: Cell[][] = [];
  for (let i = 0; i < cells.length; i += 7) {
    weeks.push(cells.slice(i, i + 7));
  }
  return weeks;
}

function formatMonthDanish(year: number, month: number): string {
  return new Intl.DateTimeFormat("da-DK", { month: "long", year: "numeric", timeZone: "UTC" })
    .format(new Date(Date.UTC(year, month, 1)));
}

export function HistoryCalendar({ workouts, today }: { workouts: Workout[]; today: string }) {
  const [todayYear, todayMonth] = today.split("-").map(Number);
  const [cursor, setCursor] = useState({ year: todayYear, month: todayMonth - 1 });

  const workoutIdByDate = useMemo(
    () => new Map(workouts.map((workout) => [workout.date, workout.id])),
    [workouts],
  );
  const weeks = useMemo(() => buildMonthGrid(cursor.year, cursor.month), [cursor]);

  const isCurrentOrFutureMonth = cursor.year > todayYear || (cursor.year === todayYear && cursor.month >= todayMonth - 1);

  function changeMonth(delta: number) {
    setCursor((current) => {
      const total = current.year * 12 + current.month + delta;
      return { year: Math.floor(total / 12), month: ((total % 12) + 12) % 12 };
    });
  }

  return (
    <div className="zet-panel flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={() => changeMonth(-1)}
          aria-label="Forrige måned"
          className="flex h-9 w-9 items-center justify-center rounded-full text-zinc-500 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800"
        >
          <CaretLeft aria-hidden="true" size={18} />
        </button>
        <p className="text-sm font-semibold capitalize text-zinc-900 dark:text-zinc-50">
          {formatMonthDanish(cursor.year, cursor.month)}
        </p>
        <button
          type="button"
          onClick={() => changeMonth(1)}
          disabled={isCurrentOrFutureMonth}
          aria-label="Næste måned"
          className="flex h-9 w-9 items-center justify-center rounded-full text-zinc-500 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 disabled:opacity-30 disabled:hover:bg-transparent"
        >
          <CaretRight aria-hidden="true" size={18} />
        </button>
      </div>

      <div className="grid grid-cols-7 gap-1 text-center text-xs font-medium text-zinc-400 dark:text-zinc-500">
        {WEEKDAY_LABELS.map((label) => (
          <span key={label}>{label}</span>
        ))}
      </div>

      <div className="flex flex-col gap-1">
        {weeks.map((week, weekIndex) => (
          <div key={weekIndex} className="grid grid-cols-7 gap-1">
            {week.map((cell, cellIndex) => {
              if (!cell) return <div key={cellIndex} className="h-9" />;
              const workoutId = workoutIdByDate.get(cell.date);
              const isToday = cell.date === today;
              const isFuture = cell.date > today;

              if (workoutId) {
                return (
                  <div key={cell.date} className="flex items-center justify-center py-0.5">
                    <Link
                      href={`/history/${workoutId}`}
                      aria-label={`Se træningen fra ${cell.date}`}
                      className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-semibold bg-indigo-600 text-white hover:bg-indigo-700 ${
                        isToday ? "ring-2 ring-indigo-300 dark:ring-indigo-500 ring-offset-2 ring-offset-white dark:ring-offset-zinc-900" : ""
                      }`}
                    >
                      {cell.day}
                    </Link>
                  </div>
                );
              }

              return (
                <div key={cell.date} className="flex items-center justify-center py-0.5">
                  <span
                    className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm ${
                      isFuture ? "text-zinc-300 dark:text-zinc-700" : "text-zinc-600 dark:text-zinc-400"
                    } ${isToday ? "ring-2 ring-indigo-300 dark:ring-indigo-500" : ""}`}
                  >
                    {cell.day}
                  </span>
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}

"use client";

import { useState } from "react";
import { formatWeekDanish, getISOWeek } from "@/lib/dates";
import type { getMedalCollection } from "@/lib/workouts";
import { WeightPlate, plateTypes } from "./weight-plate";

type Collection = ReturnType<typeof getMedalCollection>;

export function PlateCollection({ collection, currentYear }: { collection: Collection; currentYear: number }) {
  const years = [...new Set([currentYear, ...collection.map(item => getISOWeek(item.start).year)])].sort((a, b) => b - a);
  const [year, setYear] = useState(currentYear);
  const activeYear = years.includes(year) ? year : currentYear;
  return <div className="zet-plates">
    <header><h3>Din samling</h3>
      <label className="plate-year">År <select value={activeYear} onChange={event => setYear(Number(event.target.value))}>
        {years.map(value => <option key={value} value={value}>{value}</option>)}
      </select></label>
    </header>
    <YearBar key={activeYear} collection={collection.filter(item => getISOWeek(item.start).year === activeYear)} />
  </div>;
}

function YearBar({ collection }: { collection: Collection }) {
  const items = [...collection].sort((a, b) => a.start.localeCompare(b.start));
  const [selectedStart, setSelectedStart] = useState(items[0]?.start);
  const selected = items.find(item => item.start === selectedStart) ?? items[0];
  return <>
    <div className="totals" aria-label="Antal optjente skiver">
      {(Object.keys(plateTypes) as Array<keyof typeof plateTypes>).map(name => <div key={name} className={plateTypes[name].className}>
        <strong>{items.filter(item => item.medal.name === name).length}</strong><small><span className="dot" />{name}</small>
      </div>)}
    </div>
    <div className="rack-scroll" role="region" aria-label="Årsstang med plads til 53 skiver">
      <div className="rack"><div className="shaft" aria-hidden="true" /><div className="items">
        {items.map(item => <button type="button" key={item.start} className={`pick ${plateTypes[item.medal.name].className}`}
          aria-label={`${item.medal.name}, ${formatWeekDanish(item.start)}, ${item.count} træningsdage`}
          aria-pressed={selected?.start === item.start} onClick={() => setSelectedStart(item.start)}>
          <WeightPlate name={item.medal.name} />
        </button>)}
      </div></div>
    </div>
    <div className="plate-selection">
      <span>{items.length} af 53 skiver</span>
      {selected && <label>Vis skive <select value={selected.start} onChange={event => setSelectedStart(event.target.value)}>
        {items.map(item => <option key={item.start} value={item.start}>{formatWeekDanish(item.start)} · {item.medal.name}</option>)}
      </select></label>}
    </div>
    {selected ? <div className="detail" aria-live="polite">
      <div className={`hero ${plateTypes[selected.medal.name].className}`}><WeightPlate name={selected.medal.name} /></div>
      <div><h4>{selected.medal.name}</h4><p>{formatWeekDanish(selected.start)}</p><p>{selected.count} træningsdage</p></div>
    </div> : <p className="collection-note">Ingen skiver dette år endnu. Træn på mindst to forskellige dage i samme uge for at optjene Bronze.</p>}
    <p className="collection-note">Én skive pr. optjent uge. Den aktuelle uge kommer med, når ugen slutter. Retter du historikken, opdateres samlingen.</p>
  </>;
}

import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { ConfirmSubmitButton } from "@/app/components/confirm-submit-button";
import { requireAdmin } from "@/lib/admin";
import { listPendingExercises, listShareTargets } from "@/lib/exercise-approval";
import { muscleGroupLabel } from "@/lib/muscle-groups";
import { approveExerciseAction, deleteExerciseAction, mergeExerciseAction } from "./actions";

export const metadata: Metadata = {
  title: "Godkend øvelser | ZET",
  robots: { index: false, follow: false },
};
export const instant = false;

const messages: Record<string, string> = {
  exists: "Den findes allerede som delt øvelse. Læg den sammen med den i stedet.",
  changed: "Listen ændrede sig. Intet er ændret, prøv igen.",
  used: "Øvelsen er brugt i sæt, cardio eller programmer. Læg den sammen med en anden i stedet.",
  invalid: "Ugyldig anmodning.",
};

const buttonClass = "min-h-11 rounded-xl px-4 text-sm font-semibold";

export default async function ExerciseApprovalPage({ searchParams }: { searchParams: Promise<{ ok?: string; fejl?: string }> }) {
  // Listen og adgangstjekket skal altid være friske, siden må ikke forhåndsgenereres.
  await connection();
  await requireAdmin();
  const params = await searchParams;
  const [pending, targets] = await Promise.all([listPendingExercises(), listShareTargets()]);
  const error = params.fejl ? messages[params.fejl] ?? messages.invalid : null;

  return (
    <div className="mx-auto w-full max-w-md px-5 pb-8 pt-10 sm:pt-16">
      <p className="mb-8 text-sm font-bold tracking-[0.22em] text-indigo-600">ZET</p>
      <h1 className="text-3xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">Godkend øvelser</h1>
      <p className="mb-6 mt-3 text-sm leading-6 text-zinc-600 dark:text-zinc-400">
        Nye øvelser er private, til du har godkendt dem. Ejeren kan bruge dem med det samme. Godkend, så alle kan se
        den, eller læg den sammen med en øvelse, der allerede findes.
      </p>
      <Link href="/settings" className="mb-6 inline-block text-sm font-medium text-indigo-600">← Indstillinger</Link>
      {params.ok && <p role="status" className="mb-4 rounded-xl bg-emerald-50 p-3 text-sm text-emerald-900 dark:bg-emerald-950 dark:text-emerald-200">Gemt.</p>}
      {error && <p role="alert" className="mb-4 rounded-xl bg-red-50 p-3 text-sm text-red-700 dark:bg-red-950 dark:text-red-300">{error}</p>}

      {pending.length === 0 ? (
        <p className="zet-panel text-sm text-zinc-600 dark:text-zinc-400">Ingen øvelser venter på godkendelse.</p>
      ) : (
        <ul className="flex flex-col gap-4">
          {pending.map((item) => {
            const options = targets.filter((target) => target.type === item.type);
            const hidden = (
              <>
                <input type="hidden" name="ownerId" value={item.ownerId} />
                <input type="hidden" name="type" value={item.type} />
                <input type="hidden" name="base" value={item.base} />
              </>
            );
            return (
              <li key={`${item.ownerId}|${item.type}|${item.base}`} className="zet-panel flex flex-col gap-3">
                <div>
                  <p className="text-base font-semibold text-zinc-900 dark:text-zinc-50">{item.label}</p>
                  <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
                    Fra {item.ownerName} · {item.type === "strength" ? "Styrke" : "Cardio"}
                    {item.muscles.length > 0 && ` · ${item.muscles.map((group) => muscleGroupLabel[group]).join(", ")}`}
                  </p>
                  <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
                    {item.variants.map((variant) => `${variant.label} (${variant.uses} registreringer)`).join(", ")}
                  </p>
                </div>
                <form action={approveExerciseAction}>
                  {hidden}
                  <button type="submit" className={`${buttonClass} w-full bg-indigo-600 text-white hover:bg-indigo-700`}>Godkend og del med alle</button>
                </form>
                <form action={mergeExerciseAction} className="flex flex-col gap-2">
                  {hidden}
                  <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300" htmlFor={`merge-${item.ownerId}-${item.base}`}>
                    Findes den allerede? Læg den sammen med:
                  </label>
                  <select
                    id={`merge-${item.ownerId}-${item.base}`}
                    name="targetBase"
                    required
                    defaultValue=""
                    className="w-full rounded-xl border border-zinc-300 bg-white px-4 py-3 text-base text-zinc-900 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
                  >
                    <option value="" disabled>Vælg øvelse</option>
                    {options.map((target) => <option key={target.base} value={target.base}>{target.label}</option>)}
                  </select>
                  <button type="submit" className={`${buttonClass} border border-zinc-300 text-zinc-700 dark:border-zinc-700 dark:text-zinc-300`}>Læg sammen</button>
                </form>
                <form action={deleteExerciseAction}>
                  {hidden}
                  <ConfirmSubmitButton
                    confirmMessage="Slette øvelsen? Det kan ikke fortrydes."
                    className={`${buttonClass} w-full text-red-600 dark:text-red-400`}
                  >
                    Slet (kun hvis ingen har brugt den)
                  </ConfirmSubmitButton>
                </form>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

import type { Metadata } from "next";
import { connection } from "next/server";
import { requireUser } from "@/lib/session";
import { ConfirmSubmitButton } from "@/app/components/confirm-submit-button";
import { CreateProgramForm } from "@/app/components/create-program-form";
import { deleteProgramAction, togglePublishAction } from "@/app/programs/actions";
import { getPrograms } from "@/lib/programs";
import { getExercises } from "@/lib/workout-store";

export const metadata: Metadata = { title: "Programmer | ZET" };
// Siden viser dine egne og andres programmer, det kan ikke forhåndsgenereres
// statisk. connection() gør siden dynamisk pr. besøg.
export const instant = false;

export default async function ProgramsPage() {
  await connection();
  const currentUser = await requireUser();

  const [programs, exercises] = await Promise.all([
    getPrograms(currentUser.id),
    getExercises(currentUser.id),
  ]);
  const exerciseNameById = new Map(exercises.map((exercise) => [exercise.id, exercise.name]));

  const ownPrograms = programs.filter((program) => program.user_id === currentUser.id);
  const sharedPrograms = programs.filter((program) => program.user_id !== currentUser.id);

  return (
    <div className="zet-page flex flex-col gap-6">
      <header className="zet-pageHeader">
        <p className="zet-brand">ZET</p>
        <h1>Programmer</h1>
        <p className="mt-2 text-sm text-zinc-500">
          Saml øvelser i et program, fx &quot;Pushdag&quot;, så du hurtigt kan finde dem igen på log-siden.
        </p>
      </header>

      <section className="zet-panel">
        <h2 className="zet-sectionTitle mb-4">Nyt program</h2>
        <CreateProgramForm exercises={exercises} />
      </section>

      <section className="zet-panel">
        <h2 className="zet-sectionTitle mb-4">Dine programmer</h2>
        {ownPrograms.length === 0 ? (
          <p className="text-sm text-zinc-500">Du har ikke oprettet nogen programmer endnu.</p>
        ) : (
          <ul className="divide-y divide-zinc-100">
            {ownPrograms.map((program) => (
              <li key={program.id} className="py-3 first:pt-0 last:pb-0">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-medium text-zinc-900">{program.name}</p>
                    <p className="mt-1 text-sm text-zinc-500">
                      {program.exercise_ids.map((id) => exerciseNameById.get(id) ?? "Ukendt øvelse").join(", ")}
                    </p>
                  </div>
                  <span className={`shrink-0 rounded-full px-3 py-1 text-xs font-medium ${
                    program.is_published ? "bg-emerald-100 text-emerald-800" : "bg-zinc-100 text-zinc-600"
                  }`}>
                    {program.is_published ? "Udgivet" : "Privat"}
                  </span>
                </div>
                <div className="mt-2 flex gap-2">
                  <form action={togglePublishAction}>
                    <input type="hidden" name="id" value={program.id} />
                    <input type="hidden" name="isPublished" value={program.is_published ? "false" : "true"} />
                    <button type="submit" className="min-h-9 rounded-lg border border-zinc-300 px-3 text-sm text-zinc-600 hover:border-indigo-300 hover:text-indigo-600">
                      {program.is_published ? "Gør privat" : "Udgiv"}
                    </button>
                  </form>
                  <form action={deleteProgramAction}>
                    <input type="hidden" name="id" value={program.id} />
                    <ConfirmSubmitButton
                      confirmMessage={`Slet programmet "${program.name}"?`}
                      className="min-h-9 rounded-lg border border-zinc-300 px-3 text-sm text-zinc-600 hover:border-red-300 hover:text-red-600"
                    >
                      Slet
                    </ConfirmSubmitButton>
                  </form>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      {sharedPrograms.length > 0 && (
        <section className="zet-panel">
          <h2 className="zet-sectionTitle mb-4">Udgivet af andre</h2>
          <ul className="divide-y divide-zinc-100">
            {sharedPrograms.map((program) => (
              <li key={program.id} className="py-3 first:pt-0 last:pb-0">
                <p className="font-medium text-zinc-900">{program.name}</p>
                <p className="mt-1 text-sm text-zinc-500">
                  {program.exercise_ids.map((id) => exerciseNameById.get(id) ?? "Ukendt øvelse").join(", ")}
                </p>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}

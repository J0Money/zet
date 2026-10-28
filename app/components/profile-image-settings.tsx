"use client";
import { useActionState, useRef, useState } from "react";
import { changeAvatarAction, type AvatarState } from "@/app/settings/avatar-actions";
import { ProfileAvatar } from "@/app/components/profile-avatar";

async function shrinkImage(file: File) {
  if (file.size > 20_000_000 || !["image/jpeg", "image/png", "image/webp"].includes(file.type)) throw new Error("Vælg JPG, PNG eller WebP på højst 20 MB.");
  const url = URL.createObjectURL(file);
  try {
    const image = new window.Image(); image.src = url; await image.decode();
    const canvas = document.createElement("canvas"); canvas.width = 512; canvas.height = 512;
    const context = canvas.getContext("2d"); if (!context) throw new Error("Billedet kunne ikke åbnes.");
    const edge = Math.min(image.naturalWidth, image.naturalHeight);
    context.drawImage(image, (image.naturalWidth - edge) / 2, (image.naturalHeight - edge) / 2, edge, edge, 0, 0, 512, 512);
    const blob = await new Promise<Blob>((resolve, reject) => canvas.toBlob((result) => result ? resolve(result) : reject(new Error("Billedet kunne ikke behandles.")), "image/webp", .85));
    return new File([blob], "avatar.webp", { type: blob.type });
  } finally { URL.revokeObjectURL(url); }
}

export function ProfileImageSettings({ userId, image, name, configured }: { userId: string; image: string | null; name: string; configured: boolean }) {
  const fileInput = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [preparing, setPreparing] = useState(false);
  const prepared = useRef<File | null>(null);
  const [state, action, pending] = useActionState(async (previous: AvatarState, data: FormData) => {
    if (data.get("operation") !== "remove") {
      if (!prepared.current) return { error: "Vælg et billede først." };
      data.set("image", prepared.current);
    }
    const result = await changeAvatarAction(previous, data);
    if (result.success) { prepared.current = null; setPreview(null); if (fileInput.current) fileInput.current.value = ""; }
    return result;
  }, {});
  async function select(file?: File) {
    setError(""); prepared.current = null; setPreview(null);
    if (!file) return;
    setPreparing(true);
    try {
      const result = await shrinkImage(file); prepared.current = result;
      const reader = new FileReader();
      const data = await new Promise<string>((resolve, reject) => { reader.onload = () => resolve(String(reader.result)); reader.onerror = reject; reader.readAsDataURL(result); });
      setPreview(data);
    } catch (error) { setError(error instanceof Error ? error.message : "Billedet kunne ikke åbnes."); }
    finally { setPreparing(false); }
  }
  return <section className="flex flex-col gap-3">
    <h2 className="zet-sectionTitle">Profilbillede</h2>
    <div className="zet-panel space-y-4">
    <div className="flex items-center gap-4">
      <div className="grid h-20 w-20 shrink-0 place-items-center overflow-hidden rounded-2xl bg-indigo-50 text-2xl font-semibold text-indigo-600 dark:bg-indigo-950 dark:text-indigo-300">
        {preview ? /* eslint-disable-next-line @next/next/no-img-element -- Lokal forhåndsvisning af det valgte billede. */
          <img src={preview} alt="Forhåndsvisning af dit nye profilbillede" className="h-full w-full object-cover" />
          : <ProfileAvatar userId={userId} image={image} name={name} size={80} />}
      </div>
      <p className="text-sm text-zinc-500 dark:text-zinc-400">Vises ved dine opslag og kommentarer. Billedet beskæres til en firkant og kan ses af andre med en ZET-konto.</p>
    </div>
    <form action={action} className="space-y-3" onSubmit={(event) => {
      if ((event.nativeEvent as SubmitEvent).submitter?.getAttribute("value") === "remove" && !window.confirm("Fjern dit profilbillede?")) event.preventDefault();
    }}>
      <label className="block text-sm font-medium">Vælg billede
        <input ref={fileInput} type="file" accept="image/jpeg,image/png,image/webp" disabled={pending || preparing || !configured}
          onChange={(event) => select(event.target.files?.[0])} className="mt-2 block w-full min-w-0 text-sm file:mr-3 file:min-h-11 file:rounded-xl file:border-0 file:bg-indigo-50 file:px-4 file:text-indigo-700 dark:file:bg-indigo-950 dark:file:text-indigo-300" />
      </label>
      <p className="text-xs text-zinc-500">JPG, PNG eller WebP, højst 20 MB. Billedet gøres automatisk mindre før upload.</p>
      {!configured && <p className="text-sm">Billedlageret er ikke aktiveret endnu.</p>}
      {(error || state.error) && <p role="alert" className="text-sm text-red-600">{error || state.error}</p>}
      {state.success && !preview && <p role="status" className="text-sm text-zinc-500">Profilbilledet er opdateret.</p>}
      <div className="flex flex-wrap gap-3">
        <button name="operation" value="upload" disabled={!preview || pending || preparing || !configured} className="min-h-11 rounded-xl bg-indigo-600 px-4 text-sm font-semibold text-white disabled:opacity-50">{preparing ? "Klargør…" : pending ? "Gemmer…" : "Gem profilbillede"}</button>
        {image && <button name="operation" value="remove" disabled={pending || preparing || !configured} className="min-h-11 px-3 text-sm text-red-600">Fjern billede</button>}
      </div>
    </form>
    </div>
  </section>;
}

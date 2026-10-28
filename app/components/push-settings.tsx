"use client";

import { useEffect, useState } from "react";
import { disablePush, enablePush, pushStatus } from "@/app/settings/push-actions";

function applicationKey(value: string) {
  const base64 = value.replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(base64 + "=".repeat((4 - base64.length % 4) % 4));
  return Uint8Array.from(raw, (character) => character.charCodeAt(0));
}

export function PushSettings({ configured }: { configured: boolean }) {
  const [status, setStatus] = useState<"loading" | "unsupported" | "on" | "off">("loading");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  useEffect(() => {
    let active = true;
    async function inspect() {
      if (!("serviceWorker" in navigator) || !("PushManager" in window) || !("Notification" in window)) {
        if (active) setStatus("unsupported");
        return;
      }
      const registration = await navigator.serviceWorker.getRegistration("/");
      const sub = await registration?.pushManager.getSubscription();
      const enabled = configured && sub && await pushStatus(sub.endpoint);
      if (active) setStatus(enabled ? "on" : "off");
    }
    inspect().catch(() => { if (active) { setStatus("off"); setMessage("Kunne ikke kontrollere push. Prøv igen."); } });
    return () => { active = false; };
  }, [configured]);

  async function toggle() {
    setBusy(true);
    setMessage("");
    try {
      if (status === "on") {
        const registration = await navigator.serviceWorker.getRegistration("/");
        const sub = await registration?.pushManager.getSubscription();
        if (sub) {
          await disablePush(sub.endpoint);
          await sub.unsubscribe();
        }
        setStatus("off");
        setMessage("Notifikationer er slået fra på denne enhed.");
      } else {
        // Kald tilladelsesdialogen direkte fra brugerens tryk (også på iOS).
        const permission = await Notification.requestPermission();
        if (permission !== "granted") {
          setMessage("Notifikationer er ikke tilladt. Du kan ændre tilladelsen i telefonens eller browserens indstillinger.");
          return;
        }
        await navigator.serviceWorker.register("/sw.js", { scope: "/", updateViaCache: "none" });
        const registration = await navigator.serviceWorker.ready;
        const existing = await registration.pushManager.getSubscription();
        const sub = existing ?? await registration.pushManager.subscribe({ userVisibleOnly: true,
          applicationServerKey: applicationKey(process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!) });
        const result = await enablePush(sub.toJSON());
        if (result.error) { if (!existing) await sub.unsubscribe(); setMessage(result.error); return; }
        setStatus("on");
        setMessage("Du får nu besked, når andre kommenterer din træning.");
      }
    } catch {
      setMessage("Kunne ikke ændre notifikationer. Prøv igen, og kontrollér browserens tilladelse.");
    } finally { setBusy(false); }
  }

  return <section className="flex flex-col gap-3">
    <h2 className="zet-sectionTitle">Notifikationer</h2>
    <div className="zet-panel space-y-3">
    <p className="text-sm text-zinc-500 dark:text-zinc-400">Få besked, når andre kommenterer din delte træning. Gælder denne enhed og stopper, når du logger ud.</p>
    <p className="text-sm text-zinc-500 dark:text-zinc-400">På iPhone: Føj ZET til hjemmeskærmen, og åbn appen derfra for at slå notifikationer til.</p>
    {!configured ? <p className="text-sm">Push er ikke aktiveret på serveren endnu.</p>
      : status === "unsupported" ? <p className="text-sm">Push understøttes ikke i denne browser. På iPhone kræves iOS 16.4 eller nyere og ZET på hjemmeskærmen.</p>
      : <button type="button" onClick={toggle} disabled={busy || status === "loading"}
        className="min-h-11 rounded-xl bg-indigo-600 px-4 text-sm font-semibold text-white disabled:opacity-50">
        {busy ? "Vent…" : status === "loading" ? "Kontrollerer…" : status === "on" ? "Slå notifikationer fra" : "Slå notifikationer til"}
      </button>}
    {message && <p role="status" className="text-sm">{message}</p>}
    </div>
  </section>;
}

export const MAX_COMMUNITY_TEXT = 1000;
export const isCommunityId = (value: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);

export function communityText(value: string, required = false) {
  const text = value.trim();
  if (required && !text) return { error: "Skriv en kommentar først." };
  if (text.length > MAX_COMMUNITY_TEXT) return { error: `Teksten må højst være ${MAX_COMMUNITY_TEXT} tegn.` };
  return { text };
}

export function validPushSubscription(value: unknown): value is { endpoint: string; keys: { p256dh: string; auth: string } } {
  if (!value || typeof value !== "object") return false;
  const sub = value as { endpoint?: unknown; keys?: { p256dh?: unknown; auth?: unknown } };
  if (typeof sub.endpoint !== "string" || sub.endpoint.length > 2048) return false;
  try {
    const url = new URL(sub.endpoint);
    const host = url.hostname;
    const allowed = host === "fcm.googleapis.com" || host === "updates.push.services.mozilla.com" ||
      host.endsWith(".push.apple.com") || host.endsWith(".notify.windows.com");
    if (!allowed || url.protocol !== "https:" || url.port || url.username || url.password || url.hash) return false;
  } catch { return false; }
  return typeof sub.keys?.p256dh === "string" && /^[A-Za-z0-9_-]{87}=?$/.test(sub.keys.p256dh) &&
    typeof sub.keys.auth === "string" && /^[A-Za-z0-9_-]{22}(==)?$/.test(sub.keys.auth);
}

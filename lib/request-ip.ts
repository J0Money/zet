import "server-only";

// Samme to headere Better Auths login-begrænsning bruger (lib/auth.ts).
// Railways proxy sætter x-real-ip til besøgendes rigtige adresse.
export function clientIpFrom(requestHeaders: Headers): string {
  const realIp = requestHeaders.get("x-real-ip");
  if (realIp) return realIp.trim();
  const forwarded = requestHeaders.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0]!.trim();
  return "unknown";
}

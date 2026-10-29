import { timingSafeEqual } from "node:crypto";
import { closeExpiredStrengthWorkouts } from "@/lib/workout-expiry";

export async function POST(request: Request) {
  const secret = process.env.WORKOUT_EXPIRY_SECRET;
  const supplied = request.headers.get("authorization") ?? "";
  const expected = `Bearer ${secret}`;
  if (!secret || Buffer.byteLength(supplied) !== Buffer.byteLength(expected)
    || !timingSafeEqual(Buffer.from(supplied), Buffer.from(expected))) {
    return new Response("Unauthorized", { status: 401 });
  }
  let body: unknown;
  try { body = await request.json(); } catch { return new Response("Invalid request", { status: 400 }); }
  if (!body || typeof body !== "object" || !("workoutId" in body)
    || typeof body.workoutId !== "string"
    || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(body.workoutId)) {
    return new Response("Invalid request", { status: 400 });
  }
  await closeExpiredStrengthWorkouts(undefined, body.workoutId);
  return Response.json({ ok: true }, { headers: { "Cache-Control": "no-store" } });
}

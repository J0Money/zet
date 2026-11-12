import { getOptionalUser } from "@/lib/session";
import { getAvatarObject } from "@/lib/avatar-storage";
import { EXERCISE_IMAGE_SLUG, exerciseImageObjectKey } from "@/lib/exercise-images";

// Øvelsesbilleder fra bucketten. Ikke personlige, men kun for indloggede som
// resten af appen. Må gemmes i browserens cache, da de sjældent ændres.
export async function GET(_request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const headers = { "X-Content-Type-Options": "nosniff" };
  if (!await getOptionalUser()) return new Response(null, { status: 401, headers: { ...headers, "Cache-Control": "no-store" } });
  const { slug } = await params;
  if (!EXERCISE_IMAGE_SLUG.test(slug)) return new Response(null, { status: 404, headers });
  try {
    const stream = await getAvatarObject(exerciseImageObjectKey(slug));
    if (!stream) return new Response(null, { status: 404, headers });
    return new Response(stream, { headers: { ...headers, "Content-Type": "image/webp", "Cache-Control": "private, max-age=86400" } });
  } catch { return new Response(null, { status: 503, headers: { ...headers, "Cache-Control": "no-store" } }); }
}

import { get } from "@vercel/blob";
import { getOptionalUser } from "@/lib/session";
import { getProfileImage } from "@/lib/avatars";
import { ownedAvatarUrl } from "@/lib/avatar-image";
import { isCommunityId } from "@/lib/community-input";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const headers = { "Cache-Control": "private, no-store", "X-Content-Type-Options": "nosniff" };
  if (!await getOptionalUser()) return new Response(null, { status: 401, headers });
  const { id } = await params;
  if (!isCommunityId(id)) return new Response(null, { status: 404, headers });
  try {
    const image = await getProfileImage(id);
    if (!ownedAvatarUrl(image, id)) return new Response(null, { status: 404, headers });
    const result = await get(image!, { access: "private" });
    if (result?.statusCode !== 200) return new Response(null, { status: 404, headers });
    return new Response(result.stream, { headers: { ...headers, "Content-Type": "image/webp" } });
  } catch { return new Response(null, { status: 503, headers }); }
}

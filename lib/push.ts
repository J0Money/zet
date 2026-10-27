import "server-only";
import webpush from "web-push";
import { and, eq, gt } from "drizzle-orm";
import { db } from "@/lib/db";
import { communityComment, communityPost, pushSubscription, session } from "@/lib/db/schema";

export function pushConfigured() {
  return Boolean(process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY && process.env.VAPID_SUBJECT);
}

export async function notifyComment(commentId: string) {
  if (!pushConfigured()) return;
  const [comment] = await db.select({ author: communityComment.user_id, owner: communityPost.user_id, postId: communityPost.id })
    .from(communityComment).innerJoin(communityPost, eq(communityPost.id, communityComment.post_id))
    .where(eq(communityComment.id, commentId));
  if (!comment || comment.author === comment.owner) return;
  const subscriptions = await db.select({ subscription: pushSubscription }).from(pushSubscription)
    .innerJoin(session, eq(session.id, pushSubscription.session_id))
    .where(and(eq(pushSubscription.user_id, comment.owner), eq(session.userId, comment.owner), gt(session.expiresAt, new Date())));
  await Promise.all(subscriptions.map(async ({ subscription: sub }) => {
    try {
      await webpush.sendNotification({ endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
        JSON.stringify({ title: "Ny kommentar i ZET", body: "Nogen har kommenteret din træning.", url: `/community/${comment.postId}`, tag: `comment-${commentId}` }),
        { TTL: 3600, timeout: 5000, vapidDetails: { subject: process.env.VAPID_SUBJECT!, publicKey: process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!, privateKey: process.env.VAPID_PRIVATE_KEY! } });
    } catch (error) {
      const status = (error as { statusCode?: number }).statusCode;
      if (status === 404 || status === 410) await db.delete(pushSubscription).where(eq(pushSubscription.id, sub.id));
      // Ingen endpoints, nøgler eller kommentartekst i logs.
      else console.warn("En push-notifikation kunne ikke leveres.");
    }
  }));
}

import { auth } from "@/lib/auth";
import { toNextJsHandler } from "better-auth/next-js";

const handler = toNextJsHandler(auth);

// Appen bruger kun Better Auth internt (login, logout og nulstilling kalder
// auth.handler/auth.api direkte). Over HTTP åbnes kun det nødvendige, så andre
// endpoints, fx /update-user (navn uden grænse, vilkårligt billedfelt), ikke
// kan kaldes af en indlogget bruger.
const ALLOWED_PATHS = new Set(["/api/auth/sign-in/email", "/api/auth/sign-out", "/api/auth/get-session"]);

function guard(method: (request: Request) => Promise<Response>) {
  return (request: Request) =>
    ALLOWED_PATHS.has(new URL(request.url).pathname.replace(/\/+$/, ""))
      ? method(request)
      : Promise.resolve(new Response(null, { status: 404 }));
}

export const GET = guard(handler.GET);
export const POST = guard(handler.POST);

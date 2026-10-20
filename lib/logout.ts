import "server-only";
import { auth } from "@/lib/auth";

// Logger den aktuelle bruger ud. Bruger Better Auths signerede svar, så
// cookien bliver slettet med samme sikkerhedsindstillinger, den blev sat med.
export async function signOutCurrentUser(requestHeaders: Headers): Promise<Response> {
  return auth.api.signOut({ headers: requestHeaders, asResponse: true });
}

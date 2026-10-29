import { api } from "@/server/http";
import { acceptInvite } from "@/server/invites";

export const POST = api(({ db, userId, body }) => acceptInvite(db, userId, String((body as { token?: unknown })?.token ?? "")));

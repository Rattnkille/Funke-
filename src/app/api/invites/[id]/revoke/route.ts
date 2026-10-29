import { api } from "@/server/http";
import { revokeInvite } from "@/server/invites";

export const POST = api<{ id: string }>(({ db, userId, params }) => revokeInvite(db, userId, params.id));

import { api } from "@/server/http";
import { createInvite, listInvites } from "@/server/invites";

type P = { id: string };
export const GET = api<P>(({ db, userId, params }) => ({ invites: listInvites(db, userId, params.id) }));
export const POST = api<P>(({ db, userId, params, body }) => createInvite(db, userId, params.id, body));

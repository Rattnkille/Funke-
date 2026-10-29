import { api } from "@/server/http";
import { getReentry, markSeen } from "@/server/reentry";

type P = { id: string };
export const GET = api<P>(({ db, userId, params }) => getReentry(db, userId, params.id));
export const POST = api<P>(({ db, userId, params }) => markSeen(db, userId, params.id));

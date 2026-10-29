import { api } from "@/server/http";
import { createMission, listMissions } from "@/server/missions";

type P = { id: string };
export const GET = api<P>(({ db, userId, params }) => ({ missions: listMissions(db, userId, params.id) }));
export const POST = api<P>(({ db, userId, params, body }) => createMission(db, userId, params.id, body));

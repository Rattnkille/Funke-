import { api } from "@/server/http";
import { deleteMission, updateMission } from "@/server/missions";

type P = { id: string };
export const PATCH = api<P>(({ db, userId, params, body }) => updateMission(db, userId, params.id, body));
export const DELETE = api<P>(({ db, userId, params }) => deleteMission(db, userId, params.id));

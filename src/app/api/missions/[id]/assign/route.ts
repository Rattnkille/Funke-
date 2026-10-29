import { api } from "@/server/http";
import { assignMission } from "@/server/missions";

export const POST = api<{ id: string }>(({ db, userId, params, body }) => assignMission(db, userId, params.id, body));

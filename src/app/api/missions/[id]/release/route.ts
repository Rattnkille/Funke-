import { api } from "@/server/http";
import { releaseMission } from "@/server/missions";

export const POST = api<{ id: string }>(({ db, userId, params }) => releaseMission(db, userId, params.id));

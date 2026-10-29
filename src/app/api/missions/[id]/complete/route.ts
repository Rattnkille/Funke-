import { api } from "@/server/http";
import { completeMission } from "@/server/missions";

export const POST = api<{ id: string }>(({ db, userId, params }) => completeMission(db, userId, params.id));

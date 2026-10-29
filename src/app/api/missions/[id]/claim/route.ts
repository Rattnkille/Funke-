import { api } from "@/server/http";
import { claimMission } from "@/server/missions";

export const POST = api<{ id: string }>(({ db, userId, params }) => claimMission(db, userId, params.id));

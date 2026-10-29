import { api } from "@/server/http";
import { addTemplateMission } from "@/server/templates";

export const POST = api<{ id: string }>(({ db, userId, params, body }) => addTemplateMission(db, userId, params.id, body));

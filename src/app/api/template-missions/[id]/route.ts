import { api } from "@/server/http";
import { deleteTemplateMission, updateTemplateMission } from "@/server/templates";

type P = { id: string };
export const PATCH = api<P>(({ db, userId, params, body }) => updateTemplateMission(db, userId, params.id, body));
export const DELETE = api<P>(({ db, userId, params }) => deleteTemplateMission(db, userId, params.id));

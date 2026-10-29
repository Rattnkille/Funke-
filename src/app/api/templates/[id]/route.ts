import { api } from "@/server/http";
import { deleteTemplate, getTemplate, updateTemplate } from "@/server/templates";

type P = { id: string };
export const GET = api<P>(({ db, userId, params }) => getTemplate(db, userId, params.id));
export const PATCH = api<P>(({ db, userId, params, body }) => updateTemplate(db, userId, params.id, body));
export const DELETE = api<P>(({ db, userId, params }) => deleteTemplate(db, userId, params.id));

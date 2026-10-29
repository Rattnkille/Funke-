import { api } from "@/server/http";
import { getProject, updateProject } from "@/server/projects";

type P = { id: string };
export const GET = api<P>(({ db, userId, params }) => getProject(db, userId, params.id));
export const PATCH = api<P>(({ db, userId, params, body }) => updateProject(db, userId, params.id, body));

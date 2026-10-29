import { api } from "@/server/http";
import { createTemplateFromProject } from "@/server/templates";

export const POST = api<{ id: string }>(({ db, userId, params }) => createTemplateFromProject(db, userId, params.id));

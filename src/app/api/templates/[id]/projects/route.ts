import { api } from "@/server/http";
import { createProjectFromTemplate } from "@/server/templates";

export const POST = api<{ id: string }>(({ db, userId, params, body }) => createProjectFromTemplate(db, userId, params.id, body));

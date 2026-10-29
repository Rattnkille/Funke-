import { api } from "@/server/http";
import { completeProject } from "@/server/projects";

export const POST = api<{ id: string }>(({ db, userId, params }) => completeProject(db, userId, params.id));

import { api } from "@/server/http";
import { createProject, listMyProjects } from "@/server/projects";

export const GET = api(({ db, userId }) => ({ projects: listMyProjects(db, userId) }));
export const POST = api(({ db, userId, body }) => createProject(db, userId, body));

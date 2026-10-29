import { api } from "@/server/http";
import { listTemplates } from "@/server/templates";

export const GET = api(({ db, userId }) => ({ templates: listTemplates(db, userId) }));

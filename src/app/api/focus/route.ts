import { api } from "@/server/http";
import { getFocus } from "@/server/focus";

export const GET = api(({ db, userId, req }) =>
  getFocus(db, userId, { minutes: req.nextUrl.searchParams.get("minutes"), energy: req.nextUrl.searchParams.get("energy") }),
);

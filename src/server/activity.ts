import { randomUUID } from "node:crypto";
import { activity } from "@/db/schema";
import type { Tx } from "./access";

export type ActivityType =
  | "project_created"
  | "project_updated"
  | "project_completed"
  | "member_joined"
  | "mission_created"
  | "mission_updated"
  | "mission_deleted"
  | "mission_claimed"
  | "mission_released"
  | "mission_completed"
  | "mission_assigned"
  | "mission_unassigned";

export function logActivity(
  db: Tx,
  entry: {
    projectId: string;
    actorId: string;
    type: ActivityType;
    missionId?: string | null;
    subject?: string | null;
    targetUserId?: string | null;
    at?: number;
  },
) {
  db.insert(activity)
    .values({
      id: randomUUID(),
      projectId: entry.projectId,
      actorId: entry.actorId,
      type: entry.type,
      missionId: entry.missionId ?? null,
      subject: entry.subject ?? null,
      targetUserId: entry.targetUserId ?? null,
      createdAt: new Date(entry.at ?? Date.now()),
    })
    .run();
}

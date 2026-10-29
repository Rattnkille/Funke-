import { sql } from "drizzle-orm";
import {
  index,
  integer,
  primaryKey,
  sqliteTable,
  text,
} from "drizzle-orm/sqlite-core";

const now = sql`(cast(unixepoch('subsecond') * 1000 as integer))`;

// ---------- Better Auth (Tabellennamen und Felder vom Adapter vorgegeben) ----------

export const user = sqliteTable("user", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: integer("email_verified", { mode: "boolean" }).notNull().default(false),
  image: text("image"),
  adultConfirmed: integer("adult_confirmed", { mode: "boolean" }).notNull().default(false),
  createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull().default(now),
  updatedAt: integer("updated_at", { mode: "timestamp_ms" }).notNull().default(now),
});

export const session = sqliteTable(
  "session",
  {
    id: text("id").primaryKey(),
    expiresAt: integer("expires_at", { mode: "timestamp_ms" }).notNull(),
    token: text("token").notNull().unique(),
    createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull().default(now),
    updatedAt: integer("updated_at", { mode: "timestamp_ms" }).notNull().default(now),
    ipAddress: text("ip_address"),
    userAgent: text("user_agent"),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
  },
  (t) => [index("session_user_idx").on(t.userId)],
);

export const account = sqliteTable(
  "account",
  {
    id: text("id").primaryKey(),
    accountId: text("account_id").notNull(),
    providerId: text("provider_id").notNull(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    accessToken: text("access_token"),
    refreshToken: text("refresh_token"),
    idToken: text("id_token"),
    accessTokenExpiresAt: integer("access_token_expires_at", { mode: "timestamp_ms" }),
    refreshTokenExpiresAt: integer("refresh_token_expires_at", { mode: "timestamp_ms" }),
    scope: text("scope"),
    password: text("password"),
    createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull().default(now),
    updatedAt: integer("updated_at", { mode: "timestamp_ms" }).notNull().default(now),
  },
  (t) => [index("account_user_idx").on(t.userId)],
);

export const verification = sqliteTable("verification", {
  id: text("id").primaryKey(),
  identifier: text("identifier").notNull(),
  value: text("value").notNull(),
  expiresAt: integer("expires_at", { mode: "timestamp_ms" }).notNull(),
  createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull().default(now),
  updatedAt: integer("updated_at", { mode: "timestamp_ms" }).notNull().default(now),
});

// ---------- FUNKE ----------

export const ENERGY = ["low", "medium", "high"] as const;
export type Energy = (typeof ENERGY)[number];
export const ROLES = ["organizer", "member"] as const;
export type Role = (typeof ROLES)[number];
export const MISSION_STATUS = ["open", "claimed", "done"] as const;
export type StoredMissionStatus = (typeof MISSION_STATUS)[number];

export const project = sqliteTable("project", {
  id: text("id").primaryKey(),
  title: text("title").notNull(),
  description: text("description").notNull(),
  goal: text("goal").notNull(),
  eventDate: text("event_date"),
  status: text("status", { enum: ["active", "completed"] }).notNull().default("active"),
  completedAt: integer("completed_at", { mode: "timestamp_ms" }),
  createdById: text("created_by_id")
    .notNull()
    .references(() => user.id),
  createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp_ms" }).notNull(),
});

export const membership = sqliteTable(
  "membership",
  {
    projectId: text("project_id")
      .notNull()
      .references(() => project.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    role: text("role", { enum: ROLES }).notNull(),
    joinedAt: integer("joined_at", { mode: "timestamp_ms" }).notNull(),
  },
  (t) => [primaryKey({ columns: [t.projectId, t.userId] }), index("membership_user_idx").on(t.userId)],
);

export const invite = sqliteTable(
  "invite",
  {
    id: text("id").primaryKey(),
    projectId: text("project_id")
      .notNull()
      .references(() => project.id, { onDelete: "cascade" }),
    tokenHash: text("token_hash").notNull().unique(),
    createdById: text("created_by_id")
      .notNull()
      .references(() => user.id),
    expiresAt: integer("expires_at", { mode: "timestamp_ms" }).notNull(),
    revokedAt: integer("revoked_at", { mode: "timestamp_ms" }),
    useCount: integer("use_count").notNull().default(0),
    createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
  },
  (t) => [index("invite_project_idx").on(t.projectId)],
);

export const mission = sqliteTable(
  "mission",
  {
    id: text("id").primaryKey(),
    projectId: text("project_id")
      .notNull()
      .references(() => project.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    description: text("description").notNull(),
    durationMinutes: integer("duration_minutes").notNull(),
    energy: text("energy", { enum: ENERGY }).notNull(),
    status: text("status", { enum: MISSION_STATUS }).notNull().default("open"),
    assigneeId: text("assignee_id").references(() => user.id, { onDelete: "set null" }),
    completedAt: integer("completed_at", { mode: "timestamp_ms" }),
    position: integer("position").notNull().default(0),
    createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
    updatedAt: integer("updated_at", { mode: "timestamp_ms" }).notNull(),
  },
  (t) => [index("mission_project_idx").on(t.projectId), index("mission_assignee_idx").on(t.assigneeId)],
);

/** missionId hängt von dependsOnId ab (dependsOnId muss zuerst abgeschlossen sein). */
export const missionDependency = sqliteTable(
  "mission_dependency",
  {
    missionId: text("mission_id")
      .notNull()
      .references(() => mission.id, { onDelete: "cascade" }),
    dependsOnId: text("depends_on_id")
      .notNull()
      .references(() => mission.id, { onDelete: "cascade" }),
  },
  (t) => [primaryKey({ columns: [t.missionId, t.dependsOnId] })],
);

export const activity = sqliteTable(
  "activity",
  {
    id: text("id").primaryKey(),
    projectId: text("project_id")
      .notNull()
      .references(() => project.id, { onDelete: "cascade" }),
    actorId: text("actor_id").references(() => user.id, { onDelete: "set null" }),
    type: text("type").notNull(),
    missionId: text("mission_id"),
    /** Titel der Mission zum Zeitpunkt der Aktivität (bleibt lesbar, falls gelöscht). */
    subject: text("subject"),
    targetUserId: text("target_user_id"),
    createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
  },
  (t) => [index("activity_project_time_idx").on(t.projectId, t.createdAt)],
);

export const projectVisit = sqliteTable(
  "project_visit",
  {
    projectId: text("project_id")
      .notNull()
      .references(() => project.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    lastSeenAt: integer("last_seen_at", { mode: "timestamp_ms" }).notNull(),
  },
  (t) => [primaryKey({ columns: [t.projectId, t.userId] })],
);

export const template = sqliteTable("template", {
  id: text("id").primaryKey(),
  ownerId: text("owner_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  description: text("description").notNull(),
  goal: text("goal").notNull(),
  createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp_ms" }).notNull(),
});

export const templateMission = sqliteTable(
  "template_mission",
  {
    id: text("id").primaryKey(),
    templateId: text("template_id")
      .notNull()
      .references(() => template.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    description: text("description").notNull(),
    durationMinutes: integer("duration_minutes").notNull(),
    energy: text("energy", { enum: ENERGY }).notNull(),
    position: integer("position").notNull().default(0),
  },
  (t) => [index("template_mission_template_idx").on(t.templateId)],
);

export const templateDependency = sqliteTable(
  "template_dependency",
  {
    templateMissionId: text("template_mission_id")
      .notNull()
      .references(() => templateMission.id, { onDelete: "cascade" }),
    dependsOnId: text("depends_on_id")
      .notNull()
      .references(() => templateMission.id, { onDelete: "cascade" }),
  },
  (t) => [primaryKey({ columns: [t.templateMissionId, t.dependsOnId] })],
);

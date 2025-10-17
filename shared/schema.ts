import { sql } from "drizzle-orm";
import { pgTable, text, varchar, integer, timestamp, json, real, index, uniqueIndex, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Session storage table for Replit Auth
// Reference: blueprint:javascript_log_in_with_replit
export const sessions = pgTable(
  "sessions",
  {
    sid: varchar("sid").primaryKey(),
    sess: jsonb("sess").notNull(),
    expire: timestamp("expire").notNull(),
  },
  (table) => [index("IDX_session_expire").on(table.expire)],
);

// User storage table for Replit Auth
// Reference: blueprint:javascript_log_in_with_replit
export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  email: varchar("email").unique(),
  firstName: varchar("first_name"),
  lastName: varchar("last_name"),
  profileImageUrl: varchar("profile_image_url"),
  hasCompletedOnboarding: integer("has_completed_onboarding").notNull().default(0), // 0 = false, 1 = true
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const meetings = pgTable("meetings", {
  id: varchar("id").primaryKey(),
  userId: varchar("user_id").references(() => users.id).notNull(),
  googleEventId: text("google_event_id").notNull(),
  title: text("title").notNull(),
  description: text("description"),
  startTime: timestamp("start_time").notNull(),
  endTime: timestamp("end_time").notNull(),
  participants: integer("participants").notNull().default(0),
  googleDocId: text("google_doc_id"),
  lastSynced: timestamp("last_synced").default(sql`now()`),
});

export const meetingScores = pgTable("meeting_scores", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  meetingId: varchar("meeting_id").references(() => meetings.id).notNull(),
  agendaScore: integer("agenda_score").notNull().default(0),
  participantsScore: integer("participants_score").notNull().default(0),
  timingScore: integer("timing_score").notNull().default(0),
  actionsScore: integer("actions_score").notNull().default(0),
  attentionScore: integer("attention_score").notNull().default(0),
  totalScore: integer("total_score").notNull().default(0),
  calculatedAt: timestamp("calculated_at").default(sql`now()`),
});

export const weeklyChallenges = pgTable("weekly_challenges", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id).notNull(),
  weekStartDate: timestamp("week_start_date").notNull(),
  targetCriteria: text("target_criteria").notNull(), // 'agenda', 'participants', 'timing', 'actions', 'attention'
  goalDescription: text("goal_description").notNull(),
  targetPercentage: integer("target_percentage").notNull().default(80),
  currentProgress: integer("current_progress").notNull().default(0),
  meetingsCompleted: integer("meetings_completed").notNull().default(0),
  totalMeetings: integer("total_meetings").notNull().default(0),
  status: text("status").notNull().default('active'), // 'active', 'completed', 'failed'
  countedMeetingIds: text("counted_meeting_ids").array().notNull().default(sql`ARRAY[]::text[]`), // Track which meetings have been counted
  createdAt: timestamp("created_at").default(sql`now()`),
});

export const achievements = pgTable("achievements", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id).notNull(),
  type: text("type").notNull(), // 'challenge_complete', 'streak', 'perfect_week', 'score_milestone'
  title: text("title").notNull(),
  description: text("description").notNull(),
  iconName: text("icon_name").notNull(),
  earnedAt: timestamp("earned_at").default(sql`now()`),
});

export const jiraTasks = pgTable("jira_tasks", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id).notNull(),
  jiraKey: text("jira_key").notNull(), // e.g., "PROJ-123"
  jiraId: text("jira_id").notNull(), // Jira internal ID
  summary: text("summary").notNull(),
  description: text("description"),
  status: text("status").notNull(), // e.g., "To Do", "In Progress", "Done"
  priority: text("priority"), // e.g., "High", "Medium", "Low"
  estimateHours: real("estimate_hours"), // Time estimate in hours
  storyPoints: integer("story_points"), // Story points if used
  dueDate: timestamp("due_date"),
  assignee: text("assignee"),
  projectKey: text("project_key"),
  labels: text("labels").array().default(sql`ARRAY[]::text[]`),
  lastSynced: timestamp("last_synced").default(sql`now()`),
}, (table) => [
  index("idx_jira_tasks_user_id").on(table.userId),
  uniqueIndex("idx_jira_tasks_user_key").on(table.userId, table.jiraKey),
]);

export const dailyCapacity = pgTable("daily_capacity", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id).notNull(),
  date: timestamp("date").notNull(),
  totalHours: real("total_hours").notNull().default(8), // Standard work day
  meetingHours: real("meeting_hours").notNull().default(0),
  contextSwitchingMinutes: integer("context_switching_minutes").notNull().default(0),
  availableHours: real("available_hours").notNull().default(8),
  tasksCount: integer("tasks_count").notNull().default(0),
  completableTasksCount: integer("completable_tasks_count").notNull().default(0),
  calculatedAt: timestamp("calculated_at").default(sql`now()`),
});

export const taskCompletionPredictions = pgTable("task_completion_predictions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  taskId: varchar("task_id").references(() => jiraTasks.id).notNull(),
  userId: varchar("user_id").references(() => users.id).notNull(),
  weekStartDate: timestamp("week_start_date").notNull(),
  completionProbability: integer("completion_probability").notNull(), // 0-100
  riskLevel: text("risk_level").notNull(), // 'low', 'medium', 'high'
  estimatedCompletionDate: timestamp("estimated_completion_date"),
  blockers: text("blockers").array().default(sql`ARRAY[]::text[]`),
  calculatedAt: timestamp("calculated_at").default(sql`now()`),
}, (table) => [
  uniqueIndex("idx_task_predictions_task_week").on(table.taskId, table.weekStartDate),
]);

export const userSettings = pgTable("user_settings", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id).notNull().unique(),
  dailyWorkHours: real("daily_work_hours").notNull().default(8),
  contextSwitchingMinutes: integer("context_switching_minutes").notNull().default(20),
  jiraEmail: text("jira_email"),
  jiraApiToken: text("jira_api_token"),
  jiraHost: text("jira_host"),
  jiraJqlQuery: text("jira_jql_query"),
  googleAccessToken: text("google_access_token"),
  googleRefreshToken: text("google_refresh_token"),
  googleTokenExpiry: timestamp("google_token_expiry"),
  updatedAt: timestamp("updated_at").default(sql`now()`),
});

// Upsert schema for Replit Auth
// Reference: blueprint:javascript_log_in_with_replit
export const upsertUserSchema = createInsertSchema(users).omit({
  createdAt: true,
  updatedAt: true,
});

export const insertMeetingSchema = createInsertSchema(meetings).omit({
  lastSynced: true,
});

export const insertMeetingScoreSchema = createInsertSchema(meetingScores).omit({
  id: true,
  calculatedAt: true,
});

export const insertWeeklyChallengeSchema = createInsertSchema(weeklyChallenges).omit({
  id: true,
  createdAt: true,
});

export const insertAchievementSchema = createInsertSchema(achievements).omit({
  id: true,
  earnedAt: true,
});

export const insertJiraTaskSchema = createInsertSchema(jiraTasks).omit({
  id: true,
  lastSynced: true,
});

export const insertDailyCapacitySchema = createInsertSchema(dailyCapacity).omit({
  id: true,
  calculatedAt: true,
});

export const insertTaskCompletionPredictionSchema = createInsertSchema(taskCompletionPredictions).omit({
  id: true,
  calculatedAt: true,
});

export const insertUserSettingsSchema = createInsertSchema(userSettings).omit({
  id: true,
  updatedAt: true,
});

export const updateUserSettingsSchema = insertUserSettingsSchema.partial().extend({
  dailyWorkHours: z.number().min(0.5, "Daily work hours must be at least 0.5").max(24, "Daily work hours cannot exceed 24").optional(),
  contextSwitchingMinutes: z.number().int("Context switching must be a whole number").min(0, "Context switching cannot be negative").max(60, "Context switching cannot exceed 60 minutes").optional(),
  jiraEmail: z.string().email("Invalid email format").optional().or(z.literal("")).transform(val => val === "" ? null : val),
  jiraApiToken: z.string().optional().or(z.literal("")).transform(val => val === "" ? null : val),
  jiraHost: z.string().url("Invalid URL format").optional().or(z.literal("")).transform(val => val === "" ? null : val),
  jiraJqlQuery: z.string().optional().or(z.literal("")).transform(val => val === "" ? null : val),
  googleAccessToken: z.string().optional().or(z.literal("")).transform(val => val === "" ? null : val),
  googleRefreshToken: z.string().optional().or(z.literal("")).transform(val => val === "" ? null : val),
  googleTokenExpiry: z.date().optional().nullable(),
});

// Safe schema for GET requests - excludes sensitive tokens (jiraApiToken, googleAccessToken, googleRefreshToken)
export const userSettingsResponseSchema = z.object({
  id: z.string(),
  userId: z.string(),
  dailyWorkHours: z.number(),
  contextSwitchingMinutes: z.number(),
  jiraEmail: z.string().nullable(),
  jiraHost: z.string().nullable(),
  jiraJqlQuery: z.string().nullable(),
  hasJiraCredentials: z.boolean(), // Indicates if jiraApiToken is configured
  hasGoogleCredentials: z.boolean(), // Indicates if Google OAuth tokens are configured
  updatedAt: z.date().nullable(),
});

export type UpsertUser = z.infer<typeof upsertUserSchema>;
export type User = typeof users.$inferSelect;
export type Meeting = typeof meetings.$inferSelect;
export type InsertMeeting = z.infer<typeof insertMeetingSchema>;
export type MeetingScore = typeof meetingScores.$inferSelect;
export type InsertMeetingScore = z.infer<typeof insertMeetingScoreSchema>;
export type WeeklyChallenge = typeof weeklyChallenges.$inferSelect;
export type InsertWeeklyChallenge = z.infer<typeof insertWeeklyChallengeSchema>;
export type Achievement = typeof achievements.$inferSelect;
export type InsertAchievement = z.infer<typeof insertAchievementSchema>;
export type JiraTask = typeof jiraTasks.$inferSelect;
export type InsertJiraTask = z.infer<typeof insertJiraTaskSchema>;
export type DailyCapacity = typeof dailyCapacity.$inferSelect;
export type InsertDailyCapacity = z.infer<typeof insertDailyCapacitySchema>;
export type TaskCompletionPrediction = typeof taskCompletionPredictions.$inferSelect;
export type InsertTaskCompletionPrediction = z.infer<typeof insertTaskCompletionPredictionSchema>;
export type UserSettings = typeof userSettings.$inferSelect;
export type InsertUserSettings = z.infer<typeof insertUserSettingsSchema>;
export type UpdateUserSettings = z.infer<typeof updateUserSettingsSchema>;
export type UserSettingsResponse = z.infer<typeof userSettingsResponseSchema>;

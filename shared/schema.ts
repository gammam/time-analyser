import { sql } from "drizzle-orm";
import { pgTable, text, varchar, integer, timestamp, json, real } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
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

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
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

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;
export type Meeting = typeof meetings.$inferSelect;
export type InsertMeeting = z.infer<typeof insertMeetingSchema>;
export type MeetingScore = typeof meetingScores.$inferSelect;
export type InsertMeetingScore = z.infer<typeof insertMeetingScoreSchema>;
export type WeeklyChallenge = typeof weeklyChallenges.$inferSelect;
export type InsertWeeklyChallenge = z.infer<typeof insertWeeklyChallengeSchema>;
export type Achievement = typeof achievements.$inferSelect;
export type InsertAchievement = z.infer<typeof insertAchievementSchema>;

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

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;
export type Meeting = typeof meetings.$inferSelect;
export type InsertMeeting = z.infer<typeof insertMeetingSchema>;
export type MeetingScore = typeof meetingScores.$inferSelect;
export type InsertMeetingScore = z.infer<typeof insertMeetingScoreSchema>;

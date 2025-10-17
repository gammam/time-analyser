import { type User, type UpsertUser, type Meeting, type InsertMeeting, type MeetingScore, type InsertMeetingScore, type WeeklyChallenge, type InsertWeeklyChallenge, type Achievement, type InsertAchievement, type JiraTask, type InsertJiraTask, type DailyCapacity, type InsertDailyCapacity, type TaskCompletionPrediction, type InsertTaskCompletionPrediction, type UserSettings, type InsertUserSettings, type UpdateUserSettings } from "@shared/schema";
import { randomUUID } from "crypto";

export interface IStorage {
  // User methods - Required for Replit Auth
  // Reference: blueprint:javascript_log_in_with_replit
  getUser(id: string): Promise<User | undefined>;
  upsertUser(user: UpsertUser): Promise<User>;
  
  // Meeting methods
  getMeeting(id: string): Promise<Meeting | undefined>;
  getMeetingsByUserId(userId: string, startDate?: Date, endDate?: Date): Promise<Meeting[]>;
  createMeeting(meeting: InsertMeeting): Promise<Meeting>;
  updateMeeting(id: string, meeting: Partial<Meeting>): Promise<Meeting | undefined>;
  upsertMeeting(meeting: InsertMeeting): Promise<Meeting>;
  
  // Meeting score methods
  getMeetingScore(meetingId: string): Promise<MeetingScore | undefined>;
  createMeetingScore(score: InsertMeetingScore): Promise<MeetingScore>;
  updateMeetingScore(meetingId: string, score: Partial<MeetingScore>): Promise<MeetingScore | undefined>;
  upsertMeetingScore(score: InsertMeetingScore): Promise<MeetingScore>;
  
  // Weekly challenge methods
  getCurrentWeeklyChallenge(userId: string): Promise<WeeklyChallenge | undefined>;
  createWeeklyChallenge(challenge: InsertWeeklyChallenge): Promise<WeeklyChallenge>;
  updateWeeklyChallenge(id: string, challenge: Partial<WeeklyChallenge>): Promise<WeeklyChallenge | undefined>;
  
  // Achievement methods
  getUserAchievements(userId: string): Promise<Achievement[]>;
  createAchievement(achievement: InsertAchievement): Promise<Achievement>;
  
  // JIRA task methods
  getJiraTasksByUserId(userId: string, status?: string): Promise<JiraTask[]>;
  upsertJiraTask(task: InsertJiraTask): Promise<JiraTask>;
  deleteJiraTasksByUserId(userId: string): Promise<void>;
  
  // Daily capacity methods
  getDailyCapacity(userId: string, date: Date): Promise<DailyCapacity | undefined>;
  getDailyCapacitiesForWeek(userId: string, weekStart: Date): Promise<DailyCapacity[]>;
  upsertDailyCapacity(capacity: InsertDailyCapacity): Promise<DailyCapacity>;
  
  // Task completion prediction methods
  getTaskPredictions(userId: string, weekStart: Date): Promise<TaskCompletionPrediction[]>;
  upsertTaskPrediction(prediction: InsertTaskCompletionPrediction): Promise<TaskCompletionPrediction>;
  deleteTaskPredictionsByWeek(userId: string, weekStart: Date): Promise<void>;
  
  // User settings methods
  getUserSettings(userId: string): Promise<UserSettings | undefined>;
  upsertUserSettings(userId: string, settings: UpdateUserSettings): Promise<UserSettings>;
}

// Import database and Drizzle ORM utilities
// Reference: blueprint:javascript_database
import { db } from "./db";
import { users, meetings as meetingsTable, meetingScores as meetingScoresTable, weeklyChallenges as weeklyChallengesTable, achievements as achievementsTable, jiraTasks as jiraTasksTable, dailyCapacity as dailyCapacityTable, taskCompletionPredictions as taskCompletionPredictionsTable, userSettings as userSettingsTable } from "@shared/schema";
import { eq, and, gte, lte, desc } from "drizzle-orm";

export class DatabaseStorage implements IStorage {
  // User methods - Required for Replit Auth
  // Reference: blueprint:javascript_log_in_with_replit
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user || undefined;
  }

  async upsertUser(userData: UpsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(userData)
      .onConflictDoUpdate({
        target: users.id,
        set: {
          ...userData,
          updatedAt: new Date(),
        },
      })
      .returning();
    return user;
  }

  async getMeeting(id: string): Promise<Meeting | undefined> {
    const [meeting] = await db.select().from(meetingsTable).where(eq(meetingsTable.id, id));
    return meeting || undefined;
  }

  async getMeetingsByUserId(userId: string, startDate?: Date, endDate?: Date): Promise<Meeting[]> {
    const conditions = [eq(meetingsTable.userId, userId)];
    
    if (startDate) {
      conditions.push(gte(meetingsTable.startTime, startDate));
    }
    
    if (endDate) {
      conditions.push(lte(meetingsTable.startTime, endDate));
    }
    
    return await db
      .select()
      .from(meetingsTable)
      .where(and(...conditions))
      .orderBy(meetingsTable.startTime);
  }

  async createMeeting(insertMeeting: InsertMeeting): Promise<Meeting> {
    const [meeting] = await db
      .insert(meetingsTable)
      .values({
        ...insertMeeting,
        description: insertMeeting.description ?? null,
        participants: insertMeeting.participants ?? 0,
        googleDocId: insertMeeting.googleDocId ?? null,
        lastSynced: new Date()
      })
      .returning();
    return meeting;
  }

  async updateMeeting(id: string, updates: Partial<Meeting>): Promise<Meeting | undefined> {
    const [meeting] = await db
      .update(meetingsTable)
      .set({ ...updates, lastSynced: new Date() })
      .where(eq(meetingsTable.id, id))
      .returning();
    return meeting || undefined;
  }

  async upsertMeeting(insertMeeting: InsertMeeting): Promise<Meeting> {
    const existing = await this.getMeeting(insertMeeting.id);
    
    if (existing) {
      // Preserve enriched fields (googleDocId) if they were manually set
      const [updated] = await db
        .update(meetingsTable)
        .set({
          ...insertMeeting,
          description: insertMeeting.description ?? null,
          participants: insertMeeting.participants ?? 0,
          googleDocId: existing.googleDocId || insertMeeting.googleDocId || null,
          lastSynced: new Date()
        })
        .where(eq(meetingsTable.id, insertMeeting.id))
        .returning();
      return updated;
    } else {
      return this.createMeeting(insertMeeting);
    }
  }

  async getMeetingScore(meetingId: string): Promise<MeetingScore | undefined> {
    const [score] = await db
      .select()
      .from(meetingScoresTable)
      .where(eq(meetingScoresTable.meetingId, meetingId));
    return score || undefined;
  }

  async createMeetingScore(insertScore: InsertMeetingScore): Promise<MeetingScore> {
    const [score] = await db
      .insert(meetingScoresTable)
      .values({
        ...insertScore,
        agendaScore: insertScore.agendaScore ?? 0,
        participantsScore: insertScore.participantsScore ?? 0,
        timingScore: insertScore.timingScore ?? 0,
        actionsScore: insertScore.actionsScore ?? 0,
        attentionScore: insertScore.attentionScore ?? 0,
        totalScore: insertScore.totalScore ?? 0,
        calculatedAt: new Date()
      })
      .returning();
    return score;
  }

  async updateMeetingScore(meetingId: string, updates: Partial<MeetingScore>): Promise<MeetingScore | undefined> {
    const [score] = await db
      .update(meetingScoresTable)
      .set({ ...updates, calculatedAt: new Date() })
      .where(eq(meetingScoresTable.meetingId, meetingId))
      .returning();
    return score || undefined;
  }

  async upsertMeetingScore(insertScore: InsertMeetingScore): Promise<MeetingScore> {
    const existing = await this.getMeetingScore(insertScore.meetingId);
    
    if (existing) {
      const [updated] = await db
        .update(meetingScoresTable)
        .set({
          agendaScore: insertScore.agendaScore ?? existing.agendaScore,
          participantsScore: insertScore.participantsScore ?? existing.participantsScore,
          timingScore: insertScore.timingScore ?? existing.timingScore,
          actionsScore: insertScore.actionsScore ?? existing.actionsScore,
          attentionScore: insertScore.attentionScore ?? existing.attentionScore,
          totalScore: insertScore.totalScore ?? existing.totalScore,
          calculatedAt: new Date()
        })
        .where(eq(meetingScoresTable.meetingId, insertScore.meetingId))
        .returning();
      return updated;
    } else {
      return this.createMeetingScore(insertScore);
    }
  }

  async getCurrentWeeklyChallenge(userId: string): Promise<WeeklyChallenge | undefined> {
    const now = new Date();
    const weekStart = new Date(now);
    weekStart.setDate(now.getDate() - now.getDay()); // Start of current week (Sunday)
    weekStart.setHours(0, 0, 0, 0);
    
    const [challenge] = await db
      .select()
      .from(weeklyChallengesTable)
      .where(
        and(
          eq(weeklyChallengesTable.userId, userId),
          eq(weeklyChallengesTable.weekStartDate, weekStart)
        )
      );
    return challenge || undefined;
  }

  async createWeeklyChallenge(insertChallenge: InsertWeeklyChallenge): Promise<WeeklyChallenge> {
    const [challenge] = await db
      .insert(weeklyChallengesTable)
      .values({
        ...insertChallenge,
        createdAt: new Date()
      })
      .returning();
    return challenge;
  }

  async updateWeeklyChallenge(id: string, updates: Partial<WeeklyChallenge>): Promise<WeeklyChallenge | undefined> {
    const [challenge] = await db
      .update(weeklyChallengesTable)
      .set(updates)
      .where(eq(weeklyChallengesTable.id, id))
      .returning();
    return challenge || undefined;
  }

  async getUserAchievements(userId: string): Promise<Achievement[]> {
    return await db
      .select()
      .from(achievementsTable)
      .where(eq(achievementsTable.userId, userId))
      .orderBy(desc(achievementsTable.earnedAt));
  }

  async createAchievement(insertAchievement: InsertAchievement): Promise<Achievement> {
    const [achievement] = await db
      .insert(achievementsTable)
      .values({
        ...insertAchievement,
        earnedAt: new Date()
      })
      .returning();
    return achievement;
  }

  async getJiraTasksByUserId(userId: string, status?: string): Promise<JiraTask[]> {
    const conditions = [eq(jiraTasksTable.userId, userId)];
    
    if (status) {
      conditions.push(eq(jiraTasksTable.status, status));
    }
    
    return await db
      .select()
      .from(jiraTasksTable)
      .where(and(...conditions))
      .orderBy(desc(jiraTasksTable.dueDate));
  }

  async upsertJiraTask(insertTask: InsertJiraTask): Promise<JiraTask> {
    const [task] = await db
      .insert(jiraTasksTable)
      .values({
        ...insertTask,
        lastSynced: new Date()
      })
      .onConflictDoUpdate({
        target: [jiraTasksTable.userId, jiraTasksTable.jiraKey],
        set: {
          ...insertTask,
          lastSynced: new Date()
        }
      })
      .returning();
    return task;
  }

  async deleteJiraTasksByUserId(userId: string): Promise<void> {
    await db.delete(jiraTasksTable).where(eq(jiraTasksTable.userId, userId));
  }

  async getDailyCapacity(userId: string, date: Date): Promise<DailyCapacity | undefined> {
    const dayStart = new Date(date);
    dayStart.setHours(0, 0, 0, 0);
    
    const [capacity] = await db
      .select()
      .from(dailyCapacityTable)
      .where(
        and(
          eq(dailyCapacityTable.userId, userId),
          eq(dailyCapacityTable.date, dayStart)
        )
      );
    return capacity || undefined;
  }

  async getDailyCapacitiesForWeek(userId: string, weekStart: Date): Promise<DailyCapacity[]> {
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekEnd.getDate() + 7);
    
    return await db
      .select()
      .from(dailyCapacityTable)
      .where(
        and(
          eq(dailyCapacityTable.userId, userId),
          gte(dailyCapacityTable.date, weekStart),
          lte(dailyCapacityTable.date, weekEnd)
        )
      );
  }

  async upsertDailyCapacity(insertCapacity: InsertDailyCapacity): Promise<DailyCapacity> {
    const dayStart = new Date(insertCapacity.date);
    dayStart.setHours(0, 0, 0, 0);
    
    const existing = await this.getDailyCapacity(insertCapacity.userId, dayStart);
    
    if (existing) {
      const [updated] = await db
        .update(dailyCapacityTable)
        .set({
          ...insertCapacity,
          date: dayStart,
          calculatedAt: new Date()
        })
        .where(eq(dailyCapacityTable.id, existing.id))
        .returning();
      return updated;
    } else {
      const [capacity] = await db
        .insert(dailyCapacityTable)
        .values({
          ...insertCapacity,
          date: dayStart,
          calculatedAt: new Date()
        })
        .returning();
      return capacity;
    }
  }

  async getTaskPredictions(userId: string, weekStart: Date): Promise<TaskCompletionPrediction[]> {
    return await db
      .select()
      .from(taskCompletionPredictionsTable)
      .where(
        and(
          eq(taskCompletionPredictionsTable.userId, userId),
          eq(taskCompletionPredictionsTable.weekStartDate, weekStart)
        )
      );
  }

  async upsertTaskPrediction(insertPrediction: InsertTaskCompletionPrediction): Promise<TaskCompletionPrediction> {
    const [prediction] = await db
      .insert(taskCompletionPredictionsTable)
      .values({
        ...insertPrediction,
        calculatedAt: new Date()
      })
      .onConflictDoUpdate({
        target: [taskCompletionPredictionsTable.taskId, taskCompletionPredictionsTable.weekStartDate],
        set: {
          ...insertPrediction,
          calculatedAt: new Date()
        }
      })
      .returning();
    return prediction;
  }

  async deleteTaskPredictionsByWeek(userId: string, weekStart: Date): Promise<void> {
    await db
      .delete(taskCompletionPredictionsTable)
      .where(
        and(
          eq(taskCompletionPredictionsTable.userId, userId),
          eq(taskCompletionPredictionsTable.weekStartDate, weekStart)
        )
      );
  }

  async getUserSettings(userId: string): Promise<UserSettings | undefined> {
    const [settings] = await db
      .select()
      .from(userSettingsTable)
      .where(eq(userSettingsTable.userId, userId));
    return settings || undefined;
  }

  async upsertUserSettings(userId: string, settingsData: UpdateUserSettings): Promise<UserSettings> {
    const [settings] = await db
      .insert(userSettingsTable)
      .values({
        userId,
        ...settingsData,
        updatedAt: new Date()
      })
      .onConflictDoUpdate({
        target: userSettingsTable.userId,
        set: {
          ...settingsData,
          updatedAt: new Date()
        }
      })
      .returning();
    return settings;
  }
}

// Reference: blueprint:javascript_database
export const storage = new DatabaseStorage();

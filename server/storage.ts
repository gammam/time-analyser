import { type User, type InsertUser, type Meeting, type InsertMeeting, type MeetingScore, type InsertMeetingScore, type WeeklyChallenge, type InsertWeeklyChallenge, type Achievement, type InsertAchievement } from "@shared/schema";
import { randomUUID } from "crypto";

export interface IStorage {
  // User methods
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  
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
}

export class MemStorage implements IStorage {
  private users: Map<string, User>;
  private meetings: Map<string, Meeting>;
  private meetingScores: Map<string, MeetingScore>;
  private weeklyChallenges: Map<string, WeeklyChallenge>;
  private achievements: Map<string, Achievement>;

  constructor() {
    this.users = new Map();
    this.meetings = new Map();
    this.meetingScores = new Map();
    this.weeklyChallenges = new Map();
    this.achievements = new Map();
  }

  async getUser(id: string): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username,
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = randomUUID();
    const user: User = { ...insertUser, id };
    this.users.set(id, user);
    return user;
  }

  async getMeeting(id: string): Promise<Meeting | undefined> {
    return this.meetings.get(id);
  }

  async getMeetingsByUserId(userId: string, startDate?: Date, endDate?: Date): Promise<Meeting[]> {
    let meetings = Array.from(this.meetings.values()).filter(
      (meeting) => meeting.userId === userId
    );
    
    if (startDate) {
      meetings = meetings.filter(m => new Date(m.startTime) >= startDate);
    }
    
    if (endDate) {
      meetings = meetings.filter(m => new Date(m.startTime) <= endDate);
    }
    
    return meetings.sort((a, b) => 
      new Date(a.startTime).getTime() - new Date(b.startTime).getTime()
    );
  }

  async createMeeting(insertMeeting: InsertMeeting): Promise<Meeting> {
    const meeting: Meeting = { 
      ...insertMeeting,
      description: insertMeeting.description ?? null,
      participants: insertMeeting.participants ?? 0,
      googleDocId: insertMeeting.googleDocId ?? null,
      lastSynced: new Date() 
    };
    this.meetings.set(meeting.id, meeting);
    return meeting;
  }

  async updateMeeting(id: string, updates: Partial<Meeting>): Promise<Meeting | undefined> {
    const meeting = this.meetings.get(id);
    if (!meeting) return undefined;
    
    const updated = { ...meeting, ...updates, lastSynced: new Date() };
    this.meetings.set(id, updated);
    return updated;
  }

  async upsertMeeting(insertMeeting: InsertMeeting): Promise<Meeting> {
    const existing = this.meetings.get(insertMeeting.id);
    
    if (existing) {
      // Preserve enriched fields (googleDocId) if they were manually set
      const updated: Meeting = {
        ...existing,
        ...insertMeeting,
        description: insertMeeting.description ?? null,
        participants: insertMeeting.participants ?? 0,
        googleDocId: existing.googleDocId || insertMeeting.googleDocId || null,
        lastSynced: new Date()
      };
      this.meetings.set(insertMeeting.id, updated);
      return updated;
    } else {
      return this.createMeeting(insertMeeting);
    }
  }

  async getMeetingScore(meetingId: string): Promise<MeetingScore | undefined> {
    return Array.from(this.meetingScores.values()).find(
      (score) => score.meetingId === meetingId
    );
  }

  async createMeetingScore(insertScore: InsertMeetingScore): Promise<MeetingScore> {
    const id = randomUUID();
    const score: MeetingScore = { 
      id,
      meetingId: insertScore.meetingId,
      agendaScore: insertScore.agendaScore ?? 0,
      participantsScore: insertScore.participantsScore ?? 0,
      timingScore: insertScore.timingScore ?? 0,
      actionsScore: insertScore.actionsScore ?? 0,
      attentionScore: insertScore.attentionScore ?? 0,
      totalScore: insertScore.totalScore ?? 0,
      calculatedAt: new Date()
    };
    this.meetingScores.set(id, score);
    return score;
  }

  async updateMeetingScore(meetingId: string, updates: Partial<MeetingScore>): Promise<MeetingScore | undefined> {
    const existingScore = await this.getMeetingScore(meetingId);
    if (!existingScore) return undefined;
    
    const updated = { ...existingScore, ...updates, calculatedAt: new Date() };
    this.meetingScores.set(existingScore.id, updated);
    return updated;
  }

  async upsertMeetingScore(insertScore: InsertMeetingScore): Promise<MeetingScore> {
    const existing = await this.getMeetingScore(insertScore.meetingId);
    
    if (existing) {
      const updated: MeetingScore = {
        ...existing,
        agendaScore: insertScore.agendaScore ?? existing.agendaScore,
        participantsScore: insertScore.participantsScore ?? existing.participantsScore,
        timingScore: insertScore.timingScore ?? existing.timingScore,
        actionsScore: insertScore.actionsScore ?? existing.actionsScore,
        attentionScore: insertScore.attentionScore ?? existing.attentionScore,
        totalScore: insertScore.totalScore ?? existing.totalScore,
        calculatedAt: new Date()
      };
      this.meetingScores.set(existing.id, updated);
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
    
    return Array.from(this.weeklyChallenges.values()).find(
      (challenge) => challenge.userId === userId && 
                     challenge.weekStartDate.getTime() === weekStart.getTime()
    );
  }

  async createWeeklyChallenge(insertChallenge: InsertWeeklyChallenge): Promise<WeeklyChallenge> {
    const id = randomUUID();
    const challenge: WeeklyChallenge = {
      id,
      ...insertChallenge,
      createdAt: new Date()
    };
    this.weeklyChallenges.set(id, challenge);
    return challenge;
  }

  async updateWeeklyChallenge(id: string, updates: Partial<WeeklyChallenge>): Promise<WeeklyChallenge | undefined> {
    const challenge = this.weeklyChallenges.get(id);
    if (!challenge) return undefined;
    
    const updated = { ...challenge, ...updates };
    this.weeklyChallenges.set(id, updated);
    return updated;
  }

  async getUserAchievements(userId: string): Promise<Achievement[]> {
    return Array.from(this.achievements.values())
      .filter((achievement) => achievement.userId === userId)
      .sort((a, b) => b.earnedAt.getTime() - a.earnedAt.getTime());
  }

  async createAchievement(insertAchievement: InsertAchievement): Promise<Achievement> {
    const id = randomUUID();
    const achievement: Achievement = {
      id,
      ...insertAchievement,
      earnedAt: new Date()
    };
    this.achievements.set(id, achievement);
    return achievement;
  }
}

export const storage = new MemStorage();

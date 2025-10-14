import { apiRequest } from "./queryClient";

export interface MeetingWithScore {
  id: string;
  title: string;
  description: string | null;
  startTime: string;
  endTime: string;
  participants: number;
  googleDocId: string | null;
  score: {
    agendaScore: number;
    participantsScore: number;
    timingScore: number;
    actionsScore: number;
    attentionScore: number;
    totalScore: number;
  } | null;
}

export interface Stats {
  totalMeetings: number;
  averageScore: number;
  trendData: Array<{
    date: string;
    score: number;
    meetings: number;
  }>;
}

export async function syncMeetings(timeMin?: string, timeMax?: string) {
  return apiRequest("POST", "/api/meetings/sync", { timeMin, timeMax });
}

export async function getMeetings(startDate?: string, endDate?: string): Promise<MeetingWithScore[]> {
  const params = new URLSearchParams();
  if (startDate) params.append('startDate', startDate);
  if (endDate) params.append('endDate', endDate);
  
  const url = `/api/meetings${params.toString() ? '?' + params.toString() : ''}`;
  const response = await fetch(url);
  return response.json();
}

export async function getStats(startDate?: string, endDate?: string): Promise<Stats> {
  const params = new URLSearchParams();
  if (startDate) params.append('startDate', startDate);
  if (endDate) params.append('endDate', endDate);
  
  const url = `/api/stats${params.toString() ? '?' + params.toString() : ''}`;
  const response = await fetch(url);
  return response.json();
}

export async function analyzeDocForMeeting(meetingId: string, googleDocId: string) {
  return apiRequest("POST", `/api/meetings/${meetingId}/analyze-doc`, { googleDocId });
}

export async function getCurrentChallenge() {
  const response = await fetch('/api/challenge/current');
  return response.json();
}

export async function getAchievements() {
  const response = await fetch('/api/achievements');
  return response.json();
}

// JIRA Integration
export interface JiraTask {
  id: string;
  jiraKey: string;
  jiraId: string;
  summary: string;
  description: string | null;
  status: string;
  priority: string;
  estimateHours: number | null;
  storyPoints: number | null;
  dueDate: string | null;
  assignee: string;
  projectKey: string;
  labels: string[];
}

export interface TaskPrediction {
  id: string;
  taskId: string;
  completionProbability: number;
  riskLevel: 'low' | 'medium' | 'high';
  estimatedCompletionDate: string | null;
  blockers: string[];
  task?: JiraTask;
}

export interface WeeklyPredictionSummary {
  weekStart: string;
  summary: {
    totalTasks: number;
    likelyComplete: number;
    atRisk: number;
    unlikely: number;
  };
  predictions: TaskPrediction[];
}

export async function syncJiraTasks() {
  return apiRequest("POST", "/api/jira/sync", {});
}

export async function getJiraTasks(status?: string): Promise<JiraTask[]> {
  const params = new URLSearchParams();
  if (status) params.append('status', status);
  
  const url = `/api/jira/tasks${params.toString() ? '?' + params.toString() : ''}`;
  const response = await fetch(url);
  return response.json() as Promise<JiraTask[]>;
}

export async function predictWeeklyTasks(weekStart?: string): Promise<WeeklyPredictionSummary> {
  return apiRequest("POST", "/api/tasks/predict", { weekStart });
}

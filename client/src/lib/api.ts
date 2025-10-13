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

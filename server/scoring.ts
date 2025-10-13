import type { Meeting } from "@shared/schema";

interface ScoringFactors {
  hasAgenda: boolean;
  agendaLength: number;
  participants: number;
  durationMinutes: number;
  actionItemsCount: number;
  attentionPointsCount: number;
}

export function calculateMeetingScore(factors: ScoringFactors) {
  const scores = {
    agenda: calculateAgendaScore(factors.hasAgenda, factors.agendaLength),
    participants: calculateParticipantsScore(factors.participants),
    timing: calculateTimingScore(factors.durationMinutes),
    actions: calculateActionsScore(factors.actionItemsCount),
    attention: calculateAttentionScore(factors.attentionPointsCount),
  };

  const total = Object.values(scores).reduce((sum, score) => sum + score, 0);

  return {
    agendaScore: scores.agenda,
    participantsScore: scores.participants,
    timingScore: scores.timing,
    actionsScore: scores.actions,
    attentionScore: scores.attention,
    totalScore: total,
  };
}

function calculateAgendaScore(hasAgenda: boolean, length: number): number {
  if (!hasAgenda || length === 0) return 0;
  if (length < 50) return 8;
  if (length < 150) return 15;
  if (length < 300) return 20;
  return 18;
}

function calculateParticipantsScore(count: number): number {
  if (count === 0) return 0;
  if (count <= 2) return 10;
  if (count <= 5) return 16;
  if (count <= 10) return 20;
  if (count <= 15) return 18;
  return 14;
}

function calculateTimingScore(minutes: number): number {
  if (minutes <= 0) return 0;
  if (minutes <= 15) return 12;
  if (minutes <= 30) return 18;
  if (minutes <= 60) return 20;
  if (minutes <= 90) return 16;
  return 10;
}

function calculateActionsScore(count: number): number {
  if (count === 0) return 5;
  if (count <= 2) return 12;
  if (count <= 5) return 18;
  if (count <= 10) return 20;
  return 16;
}

function calculateAttentionScore(count: number): number {
  if (count === 0) return 8;
  if (count <= 2) return 14;
  if (count <= 5) return 20;
  if (count <= 8) return 18;
  return 16;
}

export function extractAgendaFromDescription(description: string | null): { hasAgenda: boolean; length: number } {
  if (!description) return { hasAgenda: false, length: 0 };
  
  const agendaKeywords = ['agenda', 'topics', 'discussion points', 'objectives', 'goals'];
  const hasKeyword = agendaKeywords.some(keyword => 
    description.toLowerCase().includes(keyword)
  );
  
  const lines = description.split('\n').filter(line => line.trim().length > 0);
  const hasBullets = /^[\s]*[-•*]\s/.test(description);
  const hasNumbering = /^[\s]*\d+[\.)]\s/.test(description);
  
  const hasAgenda = hasKeyword || hasBullets || hasNumbering || lines.length >= 3;
  
  return {
    hasAgenda,
    length: description.length
  };
}

export function extractKeywordsFromNotes(notes: string): { actionItems: number; attentionPoints: number } {
  const actionKeywords = ['action', 'todo', 'task', 'follow up', 'next steps', 'assigned to'];
  const attentionKeywords = ['important', 'note', 'attention', 'critical', 'key point', 'decision', 'blocker'];
  
  const lowerNotes = notes.toLowerCase();
  
  const actionItems = actionKeywords.reduce((count, keyword) => {
    const matches = lowerNotes.match(new RegExp(keyword, 'gi'));
    return count + (matches ? matches.length : 0);
  }, 0);
  
  const attentionPoints = attentionKeywords.reduce((count, keyword) => {
    const matches = lowerNotes.match(new RegExp(keyword, 'gi'));
    return count + (matches ? matches.length : 0);
  }, 0);
  
  return { actionItems, attentionPoints };
}

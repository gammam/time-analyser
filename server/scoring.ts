import type { Meeting } from "@shared/schema";

interface ScoringFactors {
  title: string;
  hasAgenda: boolean;
  agendaLength: number;
  participants: number;
  durationMinutes: number;
  actionItemsCount: number;
  attentionPointsCount: number;
  hasAccountability: boolean;
  hasDeadlines: boolean;
  agendaTopicsCount: number;
}

export function calculateMeetingScore(factors: ScoringFactors) {
  const scores = {
    agenda: calculateAgendaScore(
      factors.title,
      factors.hasAgenda, 
      factors.agendaLength,
      factors.agendaTopicsCount
    ),
    participants: calculateParticipantsScore(factors.participants),
    timing: calculateTimingScore(factors.durationMinutes),
    actions: calculateActionsScore(
      factors.actionItemsCount,
      factors.hasAccountability,
      factors.hasDeadlines
    ),
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

// Inspired by "Essentialism" and "The ONE Thing": focus on clarity and specificity
function calculateAgendaScore(
  title: string, 
  hasAgenda: boolean, 
  length: number,
  topicsCount: number
): number {
  let score = 0;
  
  // Penalize generic titles (Essentialism principle)
  const genericTitles = ['meeting', 'sync', 'catch up', 'check in', 'update', 'weekly', 'daily', 'standup'];
  const isGeneric = genericTitles.some(generic => 
    title.toLowerCase().includes(generic) && title.length < 30
  );
  
  if (!hasAgenda || length === 0) {
    score = isGeneric ? 0 : 5; // Small bonus for specific title even without agenda
  } else if (length < 50) {
    score = 8;
  } else if (length < 150) {
    score = 15;
  } else if (length < 300) {
    score = 20;
  } else {
    score = 18; // Too verbose
  }
  
  // Penalty for too many unrelated topics (The ONE Thing principle)
  if (topicsCount > 5) {
    score = Math.max(0, score - 5); // Penalty for lack of focus
  }
  
  // Bonus for specific, focused title
  if (!isGeneric && title.length >= 20) {
    score = Math.min(20, score + 3);
  }
  
  return score;
}

function calculateParticipantsScore(count: number): number {
  if (count === 0) return 0;
  if (count <= 2) return 10;
  if (count <= 5) return 16;
  if (count <= 10) return 20;
  if (count <= 15) return 18;
  return 14;
}

// Inspired by "Deep Work": protect time for focused work, penalize long meetings
function calculateTimingScore(minutes: number): number {
  if (minutes <= 0) return 0;
  if (minutes <= 15) return 12; // Too short to be effective
  if (minutes <= 30) return 18; // Good - respects people's time
  if (minutes <= 60) return 20; // Optimal - allows for deep discussion without fatigue
  if (minutes <= 90) return 14; // Long - starts stealing Deep Work time
  if (minutes <= 120) return 8; // Very long - significant Deep Work disruption
  return 5; // Excessive - major productivity drain
}

// Inspired by "Le cinque disfunzioni" and "The 12 Week Year": accountability and deadlines
function calculateActionsScore(
  count: number,
  hasAccountability: boolean,
  hasDeadlines: boolean
): number {
  let score = 0;
  
  // Base score from action items count
  if (count === 0) {
    score = 5; // Some baseline for meetings without explicit actions
  } else if (count <= 2) {
    score = 12;
  } else if (count <= 5) {
    score = 18;
  } else if (count <= 10) {
    score = 20;
  } else {
    score = 16; // Too many actions might be unfocused
  }
  
  // Bonus for accountability (Le cinque disfunzioni principle)
  if (hasAccountability && count > 0) {
    score = Math.min(20, score + 3);
  }
  
  // Bonus for clear deadlines (The 12 Week Year principle)
  if (hasDeadlines && count > 0) {
    score = Math.min(20, score + 2);
  }
  
  return score;
}

function calculateAttentionScore(count: number): number {
  if (count === 0) return 8;
  if (count <= 2) return 14;
  if (count <= 5) return 20;
  if (count <= 8) return 18;
  return 16;
}

export function extractAgendaFromDescription(description: string | null): { 
  hasAgenda: boolean; 
  length: number;
  topicsCount: number;
} {
  if (!description) return { hasAgenda: false, length: 0, topicsCount: 0 };
  
  const agendaKeywords = ['agenda', 'topics', 'discussion points', 'objectives', 'goals'];
  const hasKeyword = agendaKeywords.some(keyword => 
    description.toLowerCase().includes(keyword)
  );
  
  const lines = description.split('\n').filter(line => line.trim().length > 0);
  const hasBullets = /^[\s]*[-•*]\s/.test(description);
  const hasNumbering = /^[\s]*\d+[\.)]\s/.test(description);
  
  const hasAgenda = hasKeyword || hasBullets || hasNumbering || lines.length >= 3;
  
  // Count topics (The ONE Thing principle: penalize too many topics)
  const bulletPoints = (description.match(/^[\s]*[-•*]\s/gm) || []).length;
  const numberedPoints = (description.match(/^[\s]*\d+[\.)]\s/gm) || []).length;
  const topicsCount = Math.max(bulletPoints, numberedPoints, lines.length >= 3 ? lines.length : 0);
  
  return {
    hasAgenda,
    length: description.length,
    topicsCount
  };
}

export function extractKeywordsFromNotes(notes: string): { 
  actionItems: number; 
  attentionPoints: number;
  hasAccountability: boolean;
  hasDeadlines: boolean;
} {
  const actionKeywords = ['action', 'todo', 'task', 'follow up', 'next steps', 'assigned to'];
  const attentionKeywords = ['important', 'note', 'attention', 'critical', 'key point', 'decision', 'blocker'];
  
  // Accountability keywords (Le cinque disfunzioni principle)
  const accountabilityKeywords = ['assigned to', 'owner', 'responsible', 'accountability', 'dri', 'who will'];
  
  // Deadline keywords (The 12 Week Year principle)
  const deadlineKeywords = ['by', 'deadline', 'due date', 'before', 'until', 'by end of'];
  const datePatterns = [
    /\d{1,2}\/\d{1,2}\/\d{2,4}/,  // MM/DD/YYYY
    /\d{4}-\d{2}-\d{2}/,          // YYYY-MM-DD
    /(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)\s+\d{1,2}/i, // Month DD
    /\d{1,2}\s+(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)/i  // DD Month
  ];
  
  const lowerNotes = notes.toLowerCase();
  
  const actionItems = actionKeywords.reduce((count, keyword) => {
    const matches = lowerNotes.match(new RegExp(keyword, 'gi'));
    return count + (matches ? matches.length : 0);
  }, 0);
  
  const attentionPoints = attentionKeywords.reduce((count, keyword) => {
    const matches = lowerNotes.match(new RegExp(keyword, 'gi'));
    return count + (matches ? matches.length : 0);
  }, 0);
  
  // Check for accountability
  const hasAccountability = accountabilityKeywords.some(keyword => 
    lowerNotes.includes(keyword)
  );
  
  // Check for deadlines
  const hasDeadlineKeyword = deadlineKeywords.some(keyword => 
    lowerNotes.includes(keyword)
  );
  const hasDatePattern = datePatterns.some(pattern => pattern.test(notes));
  const hasDeadlines = hasDeadlineKeyword || hasDatePattern;
  
  return { 
    actionItems, 
    attentionPoints,
    hasAccountability,
    hasDeadlines
  };
}

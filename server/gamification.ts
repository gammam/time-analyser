import { storage } from "./storage";
import { InsertWeeklyChallenge, InsertAchievement } from "@shared/schema";

interface CriteriaStats {
  agenda: number;
  participants: number;
  timing: number;
  actions: number;
  attention: number;
}

export async function generateWeeklyChallenge(userId: string): Promise<any> {
  // Get meetings from the past 2 weeks to analyze
  const twoWeeksAgo = new Date();
  twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14);
  
  const meetings = await storage.getMeetingsByUserId(userId, twoWeeksAgo);
  
  if (meetings.length === 0) {
    // Default challenge for new users
    return createDefaultChallenge(userId);
  }

  // Calculate average scores for each criteria
  const stats: CriteriaStats = {
    agenda: 0,
    participants: 0,
    timing: 0,
    actions: 0,
    attention: 0,
  };

  let count = 0;
  for (const meeting of meetings) {
    const score = await storage.getMeetingScore(meeting.id);
    if (score) {
      stats.agenda += score.agendaScore;
      stats.participants += score.participantsScore;
      stats.timing += score.timingScore;
      stats.actions += score.actionsScore;
      stats.attention += score.attentionScore;
      count++;
    }
  }

  if (count > 0) {
    stats.agenda /= count;
    stats.participants /= count;
    stats.timing /= count;
    stats.actions /= count;
    stats.attention /= count;
  }

  // Find the weakest criteria
  const weakestCriteria = Object.entries(stats).reduce((a, b) => 
    a[1] < b[1] ? a : b
  )[0] as keyof CriteriaStats;

  // Generate challenge based on weakest area
  const weekStart = new Date();
  weekStart.setDate(weekStart.getDate() - weekStart.getDay());
  weekStart.setHours(0, 0, 0, 0);

  const challengeData = getChallengeForCriteria(weakestCriteria);
  
  const challenge: InsertWeeklyChallenge = {
    userId,
    weekStartDate: weekStart,
    targetCriteria: weakestCriteria,
    goalDescription: challengeData.description,
    targetPercentage: 80,
    currentProgress: 0,
    meetingsCompleted: 0,
    totalMeetings: 0,
    status: 'active',
    countedMeetingIds: [],
  };

  return storage.createWeeklyChallenge(challenge);
}

function getChallengeForCriteria(criteria: keyof CriteriaStats) {
  const challenges = {
    agenda: {
      description: "Add detailed agendas to 80% of your meetings",
      tip: "Include clear objectives and discussion points before meetings",
      icon: "FileText"
    },
    participants: {
      description: "Keep 80% of meetings to 3-10 participants",
      tip: "Small, focused meetings are more effective",
      icon: "Users"
    },
    timing: {
      description: "Schedule 80% of meetings between 30-45 minutes",
      tip: "The sweet spot for productive discussions",
      icon: "Clock"
    },
    actions: {
      description: "Document action items in 80% of meeting notes",
      tip: "Turn discussions into accountable next steps",
      icon: "CheckSquare"
    },
    attention: {
      description: "Highlight key points in 80% of meeting notes",
      tip: "Make important decisions easy to find",
      icon: "Star"
    },
  };

  return challenges[criteria];
}

function createDefaultChallenge(userId: string) {
  const weekStart = new Date();
  weekStart.setDate(weekStart.getDate() - weekStart.getDay());
  weekStart.setHours(0, 0, 0, 0);

  const challenge: InsertWeeklyChallenge = {
    userId,
    weekStartDate: weekStart,
    targetCriteria: 'agenda',
    goalDescription: "Add detailed agendas to 80% of your meetings",
    targetPercentage: 80,
    currentProgress: 0,
    meetingsCompleted: 0,
    totalMeetings: 0,
    status: 'active',
    countedMeetingIds: [],
  };

  return storage.createWeeklyChallenge(challenge);
}

export async function updateChallengeProgress(userId: string, meetingId: string) {
  const challenge = await storage.getCurrentWeeklyChallenge(userId);
  if (!challenge || challenge.status !== 'active') return;

  // Check if this meeting has already been counted
  const countedIds = challenge.countedMeetingIds || [];
  if (countedIds.includes(meetingId)) {
    return; // Skip if already counted
  }

  const score = await storage.getMeetingScore(meetingId);
  if (!score) return;

  // Check if meeting passes the criteria threshold
  const criteriaScore = getCriteriaScore(score, challenge.targetCriteria);
  const passes = criteriaScore >= 15; // 75% of 20 points

  const totalMeetings = challenge.totalMeetings + 1;
  const meetingsCompleted = passes ? challenge.meetingsCompleted + 1 : challenge.meetingsCompleted;
  const currentProgress = Math.round((meetingsCompleted / totalMeetings) * 100);

  await storage.updateWeeklyChallenge(challenge.id, {
    totalMeetings,
    meetingsCompleted,
    currentProgress,
    countedMeetingIds: [...countedIds, meetingId],
  });

  // Check if challenge is completed
  if (totalMeetings >= 5 && currentProgress >= challenge.targetPercentage) {
    await storage.updateWeeklyChallenge(challenge.id, { status: 'completed' });
    await awardChallengeAchievement(userId, challenge.targetCriteria);
  }
}

function getCriteriaScore(score: any, criteria: string): number {
  const map: Record<string, keyof typeof score> = {
    agenda: 'agendaScore',
    participants: 'participantsScore',
    timing: 'timingScore',
    actions: 'actionsScore',
    attention: 'attentionScore',
  };
  return score[map[criteria]] || 0;
}

async function awardChallengeAchievement(userId: string, criteria: string) {
  const titles: Record<string, string> = {
    agenda: "Agenda Master",
    participants: "Team Size Pro",
    timing: "Time Optimizer",
    actions: "Action Hero",
    attention: "Highlight Champion",
  };

  const descriptions: Record<string, string> = {
    agenda: "Completed the agenda challenge!",
    participants: "Mastered the ideal meeting size!",
    timing: "Optimized your meeting durations!",
    actions: "Champion of actionable outcomes!",
    attention: "Expert at capturing key points!",
  };

  const icons: Record<string, string> = {
    agenda: "Trophy",
    participants: "Award",
    timing: "Medal",
    actions: "Zap",
    attention: "Sparkles",
  };

  const achievement: InsertAchievement = {
    userId,
    type: 'challenge_complete',
    title: titles[criteria] || "Challenge Complete",
    description: descriptions[criteria] || "Completed a weekly challenge!",
    iconName: icons[criteria] || "Trophy",
  };

  return storage.createAchievement(achievement);
}

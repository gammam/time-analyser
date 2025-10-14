import type { Meeting, JiraTask, DailyCapacity, TaskCompletionPrediction } from "@shared/schema";

const CONTEXT_SWITCHING_MINUTES = 20; // Time lost per task switch
const STANDARD_WORK_DAY_HOURS = 8;
const STORY_POINT_TO_HOURS: Record<number, number> = {
  1: 1,
  2: 2,
  3: 4,
  5: 8,
  8: 16,
  13: 24,
};

interface CapacityCalculation {
  totalHours: number;
  meetingHours: number;
  contextSwitchingMinutes: number;
  availableHours: number;
  tasksCount: number;
  completableTasksCount: number;
}

export function calculateDailyCapacity(
  date: Date,
  meetings: Meeting[],
  tasks: JiraTask[]
): CapacityCalculation {
  // Filter meetings for the specific date
  const dayStart = new Date(date);
  dayStart.setHours(0, 0, 0, 0);
  const dayEnd = new Date(date);
  dayEnd.setHours(23, 59, 59, 999);

  const dayMeetings = meetings.filter(meeting => {
    const meetingStart = new Date(meeting.startTime);
    return meetingStart >= dayStart && meetingStart <= dayEnd;
  });

  // Calculate total meeting time in hours
  const meetingHours = dayMeetings.reduce((total, meeting) => {
    const duration = (new Date(meeting.endTime).getTime() - new Date(meeting.startTime).getTime()) / (1000 * 60 * 60);
    return total + duration;
  }, 0);

  // Calculate context switching time
  const contextSwitchingMinutes = tasks.length * CONTEXT_SWITCHING_MINUTES;
  const contextSwitchingHours = contextSwitchingMinutes / 60;

  // Calculate available hours
  const availableHours = Math.max(0, STANDARD_WORK_DAY_HOURS - meetingHours - contextSwitchingHours);

  // Calculate how many tasks can be completed
  let remainingHours = availableHours;
  let completableTasksCount = 0;

  // Sort tasks by priority and due date
  const sortedTasks = [...tasks].sort((a, b) => {
    const priorityOrder: Record<string, number> = { 'Highest': 1, 'High': 2, 'Medium': 3, 'Low': 4, 'Lowest': 5 };
    const aPriority = priorityOrder[a.priority || 'Medium'] || 3;
    const bPriority = priorityOrder[b.priority || 'Medium'] || 3;
    
    if (aPriority !== bPriority) return aPriority - bPriority;
    
    // If same priority, sort by due date
    if (a.dueDate && b.dueDate) {
      return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
    }
    return 0;
  });

  for (const task of sortedTasks) {
    const taskHours = estimateTaskHours(task);
    if (remainingHours >= taskHours) {
      completableTasksCount++;
      remainingHours -= taskHours;
    }
  }

  return {
    totalHours: STANDARD_WORK_DAY_HOURS,
    meetingHours,
    contextSwitchingMinutes,
    availableHours,
    tasksCount: tasks.length,
    completableTasksCount,
  };
}

export function estimateTaskHours(task: JiraTask): number {
  // Prefer explicit hour estimates
  if (task.estimateHours) {
    return task.estimateHours;
  }
  
  // Convert story points to hours
  if (task.storyPoints) {
    return STORY_POINT_TO_HOURS[task.storyPoints] || task.storyPoints * 2;
  }
  
  // Default estimate based on priority
  const priorityDefaults: Record<string, number> = {
    'Highest': 4,
    'High': 3,
    'Medium': 2,
    'Low': 1,
    'Lowest': 0.5,
  };
  
  return priorityDefaults[task.priority || 'Medium'] || 2;
}

interface WeeklyPrediction {
  predictions: TaskCompletionPrediction[];
  summary: {
    totalTasks: number;
    likelyComplete: number;
    atRisk: number;
    unlikely: number;
  };
}

export function predictWeeklyCompletion(
  weekStart: Date,
  tasks: JiraTask[],
  dailyCapacities: DailyCapacity[]
): WeeklyPrediction {
  const predictions: TaskCompletionPrediction[] = [];
  
  // Calculate total available hours for the week
  const totalWeeklyHours = dailyCapacities.reduce((sum, dc) => sum + dc.availableHours, 0);
  
  // Calculate total estimated hours needed
  const totalEstimatedHours = tasks.reduce((sum, task) => sum + estimateTaskHours(task), 0);
  
  // Sort tasks by priority and due date
  const sortedTasks = [...tasks].sort((a, b) => {
    const priorityOrder: Record<string, number> = { 'Highest': 1, 'High': 2, 'Medium': 3, 'Low': 4, 'Lowest': 5 };
    const aPriority = priorityOrder[a.priority || 'Medium'] || 3;
    const bPriority = priorityOrder[b.priority || 'Medium'] || 3;
    
    if (aPriority !== bPriority) return aPriority - bPriority;
    
    if (a.dueDate && b.dueDate) {
      return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
    }
    return 0;
  });

  // Track remaining hours per day (mutable copy)
  const dailyRemainingHours = dailyCapacities.map(dc => ({
    date: dc.date,
    remainingHours: dc.availableHours
  }));
  
  let remainingWeeklyHours = totalWeeklyHours;
  
  for (const task of sortedTasks) {
    const taskHours = estimateTaskHours(task);
    const blockers: string[] = [];
    
    // Check if task has enough time
    let completionProbability = 0;
    let riskLevel: 'low' | 'medium' | 'high' = 'high';
    let estimatedCompletionDate: Date | null = null;
    
    if (remainingWeeklyHours >= taskHours) {
      // Task likely completable
      const ratio = remainingWeeklyHours / taskHours;
      if (ratio >= 2) {
        completionProbability = 95;
        riskLevel = 'low';
      } else if (ratio >= 1.2) {
        completionProbability = 75;
        riskLevel = 'medium';
      } else {
        completionProbability = 60;
        riskLevel = 'medium';
        blockers.push('Limited time buffer');
      }
      
      remainingWeeklyHours -= taskHours;
      
      // Estimate completion date by consuming daily capacity
      let hoursNeeded = taskHours;
      for (const dayCapacity of dailyRemainingHours) {
        if (dayCapacity.remainingHours > 0) {
          const hoursUsed = Math.min(hoursNeeded, dayCapacity.remainingHours);
          dayCapacity.remainingHours -= hoursUsed;
          hoursNeeded -= hoursUsed;
          
          if (hoursNeeded <= 0) {
            estimatedCompletionDate = new Date(dayCapacity.date);
            break;
          }
        }
      }
    } else {
      // Not enough time
      completionProbability = Math.max(0, Math.floor((remainingWeeklyHours / taskHours) * 100));
      riskLevel = 'high';
      blockers.push('Insufficient time available');
      
      if (totalEstimatedHours > totalWeeklyHours * 1.5) {
        blockers.push('Overcommitted week');
      }
    }
    
    // Check for approaching deadline
    if (task.dueDate) {
      const daysUntilDue = Math.ceil((new Date(task.dueDate).getTime() - weekStart.getTime()) / (1000 * 60 * 60 * 24));
      if (daysUntilDue <= 2 && completionProbability < 80) {
        blockers.push('Approaching deadline');
        riskLevel = 'high';
      }
    }
    
    predictions.push({
      id: '', // Will be generated by database
      taskId: task.id,
      userId: task.userId,
      weekStartDate: weekStart,
      completionProbability,
      riskLevel,
      estimatedCompletionDate: estimatedCompletionDate || null,
      blockers,
      calculatedAt: new Date(),
    });
  }
  
  // Calculate summary
  const summary = {
    totalTasks: tasks.length,
    likelyComplete: predictions.filter(p => p.completionProbability >= 70).length,
    atRisk: predictions.filter(p => p.completionProbability >= 40 && p.completionProbability < 70).length,
    unlikely: predictions.filter(p => p.completionProbability < 40).length,
  };
  
  return { predictions, summary };
}

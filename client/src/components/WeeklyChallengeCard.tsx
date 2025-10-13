import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Trophy, Target, Zap } from "lucide-react";

interface WeeklyChallengeCardProps {
  challenge: {
    id: string;
    targetCriteria: string;
    goalDescription: string;
    targetPercentage: number;
    currentProgress: number;
    meetingsCompleted: number;
    totalMeetings: number;
    status: string;
  };
}

export function WeeklyChallengeCard({ challenge }: WeeklyChallengeCardProps) {
  const isCompleted = challenge.status === 'completed';
  const progressColor = challenge.currentProgress >= challenge.targetPercentage 
    ? 'bg-score-high' 
    : challenge.currentProgress >= 50 
    ? 'bg-score-medium' 
    : 'bg-score-low';

  const tips: Record<string, string> = {
    agenda: "Include clear objectives and discussion points before meetings",
    participants: "Small, focused meetings are more effective",
    timing: "The sweet spot for productive discussions",
    actions: "Turn discussions into accountable next steps",
    attention: "Make important decisions easy to find",
  };

  return (
    <Card className="overflow-hidden" data-testid="card-weekly-challenge">
      <div className="bg-gradient-to-br from-primary/10 to-primary/5 p-6 space-y-4">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-lg ${isCompleted ? 'bg-score-high' : 'bg-primary'}`}>
              {isCompleted ? (
                <Trophy className="h-5 w-5 text-white" />
              ) : (
                <Target className="h-5 w-5 text-white" />
              )}
            </div>
            <div>
              <h3 className="font-semibold text-lg">Weekly Challenge</h3>
              <p className="text-sm text-muted-foreground">
                {new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - This Week
              </p>
            </div>
          </div>
          {isCompleted && (
            <Badge className="bg-score-high text-white" data-testid="badge-completed">
              Completed!
            </Badge>
          )}
        </div>

        <div className="space-y-2">
          <p className="font-medium" data-testid="text-challenge-goal">
            {challenge.goalDescription}
          </p>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Zap className="h-4 w-4" />
            <span>{tips[challenge.targetCriteria]}</span>
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="font-medium">Progress</span>
            <span className="font-mono font-bold" data-testid="text-progress">
              {challenge.currentProgress}%
            </span>
          </div>
          <Progress 
            value={challenge.currentProgress} 
            className="h-2"
            data-testid="progress-bar"
          />
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span data-testid="text-meetings-completed">
              {challenge.meetingsCompleted} of {challenge.totalMeetings} meetings
            </span>
            <span>Target: {challenge.targetPercentage}%</span>
          </div>
        </div>

        {isCompleted && (
          <div className="pt-2 border-t">
            <div className="flex items-center gap-2 text-sm text-score-high">
              <Trophy className="h-4 w-4" />
              <span className="font-medium">You earned the achievement!</span>
            </div>
          </div>
        )}
      </div>
    </Card>
  );
}

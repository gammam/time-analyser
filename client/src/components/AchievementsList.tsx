import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Trophy, Award, Medal, Zap, Sparkles } from "lucide-react";

interface Achievement {
  id: string;
  type: string;
  title: string;
  description: string;
  iconName: string;
  earnedAt: Date;
}

interface AchievementsListProps {
  achievements: Achievement[];
}

export function AchievementsList({ achievements }: AchievementsListProps) {
  const getIcon = (iconName: string) => {
    const icons: Record<string, any> = {
      Trophy,
      Award,
      Medal,
      Zap,
      Sparkles,
    };
    const Icon = icons[iconName] || Trophy;
    return <Icon className="h-5 w-5" />;
  };

  if (achievements.length === 0) {
    return (
      <Card className="p-6">
        <div className="text-center text-muted-foreground">
          <Trophy className="h-12 w-12 mx-auto mb-3 opacity-50" />
          <p>No achievements yet</p>
          <p className="text-sm">Complete weekly challenges to earn badges!</p>
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-6" data-testid="card-achievements">
      <h3 className="font-semibold mb-4">Recent Achievements</h3>
      <div className="space-y-3">
        {achievements.slice(0, 5).map((achievement) => (
          <div
            key={achievement.id}
            className="flex items-center gap-3 p-3 rounded-lg bg-primary/5 hover-elevate"
            data-testid={`achievement-${achievement.id}`}
          >
            <div className="p-2 rounded-lg bg-score-high text-white">
              {getIcon(achievement.iconName)}
            </div>
            <div className="flex-1 min-w-0">
              <h4 className="font-medium truncate" data-testid="text-achievement-title">
                {achievement.title}
              </h4>
              <p className="text-sm text-muted-foreground truncate">
                {achievement.description}
              </p>
            </div>
            <Badge variant="outline" className="text-xs">
              {new Date(achievement.earnedAt).toLocaleDateString('en-US', { 
                month: 'short', 
                day: 'numeric' 
              })}
            </Badge>
          </div>
        ))}
      </div>
    </Card>
  );
}

import { Card } from "@/components/ui/card";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";

interface DailyScoreCardProps {
  score: number;
  trend: number;
  meetingCount: number;
  date?: string;
}

export function DailyScoreCard({ score, trend, meetingCount, date }: DailyScoreCardProps) {
  const getScoreColor = (score: number) => {
    if (score >= 80) return "text-score-high";
    if (score >= 60) return "text-score-medium";
    return "text-score-low";
  };

  const getTrendIcon = () => {
    if (trend > 0) return <TrendingUp className="h-4 w-4 text-score-high" />;
    if (trend < 0) return <TrendingDown className="h-4 w-4 text-score-low" />;
    return <Minus className="h-4 w-4 text-muted-foreground" />;
  };

  const getTrendText = () => {
    if (trend === 0) return "No change";
    const direction = trend > 0 ? "up" : "down";
    return `${Math.abs(trend)}% ${direction}`;
  };

  return (
    <Card className="p-6" data-testid="card-daily-score">
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-medium text-muted-foreground">
            {date || "Today's Score"}
          </h3>
          <div className="flex items-center gap-1 text-xs">
            {getTrendIcon()}
            <span className="text-muted-foreground">{getTrendText()}</span>
          </div>
        </div>
        <div className="space-y-1">
          <div className={`text-5xl font-bold font-mono ${getScoreColor(score)}`} data-testid="text-daily-score">
            {score}
          </div>
          <p className="text-sm text-muted-foreground">
            Based on {meetingCount} {meetingCount === 1 ? 'meeting' : 'meetings'}
          </p>
        </div>
      </div>
    </Card>
  );
}

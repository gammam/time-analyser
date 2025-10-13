import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Calendar, Users, Clock } from "lucide-react";
import { useState } from "react";
import { ScoreBreakdownPanel } from "./ScoreBreakdownPanel";

interface MeetingScoreCardProps {
  id: string;
  title: string;
  time: string;
  duration: string;
  participants: number;
  score: number;
  breakdown: {
    agenda: number;
    participants: number;
    timing: number;
    actions: number;
    attention: number;
  };
}

export function MeetingScoreCard({ 
  id,
  title, 
  time, 
  duration, 
  participants, 
  score, 
  breakdown 
}: MeetingScoreCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const getScoreColor = (score: number) => {
    if (score >= 80) return "bg-score-high text-white";
    if (score >= 60) return "bg-score-medium text-white";
    return "bg-score-low text-white";
  };

  return (
    <Card 
      className="hover-elevate active-elevate-2 cursor-pointer transition-all" 
      onClick={() => setIsExpanded(!isExpanded)}
      data-testid={`card-meeting-${id}`}
    >
      <div className="p-4 space-y-3">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0 space-y-2">
            <h3 className="font-medium truncate" data-testid={`text-meeting-title-${id}`}>
              {title}
            </h3>
            <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
              <div className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                <span className="font-mono">{time}</span>
              </div>
              <div className="flex items-center gap-1">
                <Calendar className="h-3 w-3" />
                <span>{duration}</span>
              </div>
              <div className="flex items-center gap-1">
                <Users className="h-3 w-3" />
                <span>{participants}</span>
              </div>
            </div>
          </div>
          <Badge 
            className={`${getScoreColor(score)} font-mono font-bold text-sm min-w-[3rem] justify-center`}
            data-testid={`badge-score-${id}`}
          >
            {score}
          </Badge>
        </div>
        
        {isExpanded && (
          <div className="pt-2 border-t" onClick={(e) => e.stopPropagation()}>
            <ScoreBreakdownPanel breakdown={breakdown} totalScore={score} />
          </div>
        )}
      </div>
    </Card>
  );
}

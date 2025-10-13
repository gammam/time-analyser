import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar, Users, Clock, FileText } from "lucide-react";
import { useState } from "react";
import { ScoreBreakdownPanel } from "./ScoreBreakdownPanel";
import { LinkDocDialog } from "./LinkDocDialog";

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
  hasDoc?: boolean;
}

export function MeetingScoreCard({ 
  id,
  title, 
  time, 
  duration, 
  participants, 
  score, 
  breakdown,
  hasDoc = false
}: MeetingScoreCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [showLinkDialog, setShowLinkDialog] = useState(false);

  const getScoreColor = (score: number) => {
    if (score >= 80) return "bg-score-high text-white";
    if (score >= 60) return "bg-score-medium text-white";
    return "bg-score-low text-white";
  };

  return (
    <>
      <Card 
        className="hover-elevate active-elevate-2 transition-all" 
        data-testid={`card-meeting-${id}`}
      >
        <div className="p-4 space-y-3">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 min-w-0 space-y-2 cursor-pointer" onClick={() => setIsExpanded(!isExpanded)}>
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
            <div className="flex items-center gap-2">
              {!hasDoc && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowLinkDialog(true);
                  }}
                  data-testid={`button-link-doc-${id}`}
                >
                  <FileText className="h-3 w-3 mr-1" />
                  Link Notes
                </Button>
              )}
              <Badge 
                className={`${getScoreColor(score)} font-mono font-bold text-sm min-w-[3rem] justify-center`}
                data-testid={`badge-score-${id}`}
              >
                {score}
              </Badge>
            </div>
          </div>
          
          {isExpanded && (
            <div className="pt-2 border-t" onClick={(e) => e.stopPropagation()}>
              <ScoreBreakdownPanel breakdown={breakdown} totalScore={score} />
            </div>
          )}
        </div>
      </Card>

      <LinkDocDialog 
        meetingId={id}
        open={showLinkDialog}
        onOpenChange={setShowLinkDialog}
      />
    </>
  );
}

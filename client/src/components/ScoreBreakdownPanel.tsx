import { FileText, Users, Clock, CheckSquare, Eye } from "lucide-react";
import { Progress } from "@/components/ui/progress";

interface ScoreBreakdownPanelProps {
  breakdown: {
    agenda: number;
    participants: number;
    timing: number;
    actions: number;
    attention: number;
  };
  totalScore: number;
}

export function ScoreBreakdownPanel({ breakdown }: ScoreBreakdownPanelProps) {
  const criteria = [
    { key: 'agenda', label: 'Detailed Agenda', value: breakdown.agenda, icon: FileText, max: 20 },
    { key: 'participants', label: 'Participants', value: breakdown.participants, icon: Users, max: 20 },
    { key: 'timing', label: 'Timing', value: breakdown.timing, icon: Clock, max: 20 },
    { key: 'actions', label: 'Action Items', value: breakdown.actions, icon: CheckSquare, max: 20 },
    { key: 'attention', label: 'Attention Points', value: breakdown.attention, icon: Eye, max: 20 },
  ];

  const getColor = (value: number, max: number) => {
    const percentage = (value / max) * 100;
    if (percentage >= 80) return "bg-score-high";
    if (percentage >= 60) return "bg-score-medium";
    return "bg-score-low";
  };

  return (
    <div className="space-y-3" data-testid="panel-score-breakdown">
      {criteria.map(({ key, label, value, icon: Icon, max }) => (
        <div key={key} className="space-y-1.5">
          <div className="flex items-center justify-between text-xs">
            <div className="flex items-center gap-2">
              <Icon className="h-3.5 w-3.5 text-muted-foreground" />
              <span className="font-medium">{label}</span>
            </div>
            <span className="font-mono font-medium">{value}/{max}</span>
          </div>
          <div className="relative">
            <Progress value={(value / max) * 100} className="h-1.5" />
            <div 
              className={`absolute top-0 left-0 h-1.5 rounded-full transition-all ${getColor(value, max)}`}
              style={{ width: `${(value / max) * 100}%` }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

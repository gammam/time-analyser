import { ScoreBreakdownPanel } from '../ScoreBreakdownPanel';
import { Card } from '@/components/ui/card';

export default function ScoreBreakdownPanelExample() {
  return (
    <Card className="p-6 max-w-md">
      <ScoreBreakdownPanel
        breakdown={{
          agenda: 18,
          participants: 16,
          timing: 18,
          actions: 17,
          attention: 16
        }}
        totalScore={85}
      />
    </Card>
  );
}

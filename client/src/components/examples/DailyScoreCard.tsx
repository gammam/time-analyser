import { DailyScoreCard } from '../DailyScoreCard';

export default function DailyScoreCardExample() {
  return (
    <div className="grid gap-6 md:grid-cols-3">
      <DailyScoreCard score={85} trend={12} meetingCount={4} />
      <DailyScoreCard score={68} trend={-5} meetingCount={3} date="Yesterday" />
      <DailyScoreCard score={45} trend={0} meetingCount={5} date="Last Week Avg" />
    </div>
  );
}

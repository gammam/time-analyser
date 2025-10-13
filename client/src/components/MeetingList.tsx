import { MeetingScoreCard } from "./MeetingScoreCard";

interface Meeting {
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

interface MeetingListProps {
  meetings: Meeting[];
  title?: string;
}

export function MeetingList({ meetings, title = "Today's Meetings" }: MeetingListProps) {
  return (
    <div className="space-y-4" data-testid="list-meetings">
      <h2 className="text-lg font-semibold">{title}</h2>
      <div className="space-y-3">
        {meetings.length === 0 ? (
          <p className="text-center text-muted-foreground py-8">No meetings scheduled</p>
        ) : (
          meetings.map((meeting) => (
            <MeetingScoreCard key={meeting.id} {...meeting} />
          ))
        )}
      </div>
    </div>
  );
}

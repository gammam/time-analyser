import { MeetingList } from '../MeetingList';

export default function MeetingListExample() {
  const mockMeetings = [
    {
      id: '1',
      title: 'Sprint Planning Q1 2024',
      time: '09:00',
      duration: '60 min',
      participants: 8,
      score: 85,
      breakdown: { agenda: 18, participants: 16, timing: 18, actions: 17, attention: 16 }
    },
    {
      id: '2',
      title: 'Team Standup',
      time: '10:30',
      duration: '15 min',
      participants: 6,
      score: 58,
      breakdown: { agenda: 10, participants: 12, timing: 12, actions: 12, attention: 12 }
    },
    {
      id: '3',
      title: 'Client Sync: Project Alpha',
      time: '14:00',
      duration: '30 min',
      participants: 4,
      score: 72,
      breakdown: { agenda: 15, participants: 14, timing: 16, actions: 14, attention: 13 }
    }
  ];

  return <MeetingList meetings={mockMeetings} />;
}

import { useState } from "react";
import { DashboardHeader } from "@/components/DashboardHeader";
import { DailyScoreCard } from "@/components/DailyScoreCard";
import { MeetingList } from "@/components/MeetingList";
import { TrendChart } from "@/components/TrendChart";

//todo: remove mock functionality - replace with actual API calls
const mockTrendData = [
  { date: 'Mon', score: 72, meetings: 3 },
  { date: 'Tue', score: 68, meetings: 4 },
  { date: 'Wed', score: 75, meetings: 5 },
  { date: 'Thu', score: 82, meetings: 3 },
  { date: 'Fri', score: 78, meetings: 4 },
  { date: 'Sat', score: 85, meetings: 2 },
  { date: 'Today', score: 85, meetings: 4 },
];

//todo: remove mock functionality - replace with actual API calls
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
    score: 68,
    breakdown: { agenda: 12, participants: 14, timing: 14, actions: 14, attention: 14 }
  },
  {
    id: '3',
    title: 'Client Sync: Project Alpha',
    time: '14:00',
    duration: '30 min',
    participants: 4,
    score: 92,
    breakdown: { agenda: 19, participants: 18, timing: 19, actions: 18, attention: 18 }
  },
  {
    id: '4',
    title: 'Product Review',
    time: '16:00',
    duration: '45 min',
    participants: 10,
    score: 95,
    breakdown: { agenda: 20, participants: 19, timing: 19, actions: 19, attention: 18 }
  }
];

export default function Dashboard() {
  const [dateRange, setDateRange] = useState("today");

  //todo: remove mock functionality - calculate from actual meeting data
  const avgScore = Math.round(mockMeetings.reduce((acc, m) => acc + m.score, 0) / mockMeetings.length);

  return (
    <div className="min-h-screen bg-background">
      <DashboardHeader dateRange={dateRange} onDateRangeChange={setDateRange} />
      
      <main className="container mx-auto p-6 space-y-8">
        <div className="grid gap-6 md:grid-cols-3">
          <DailyScoreCard 
            score={avgScore} 
            trend={12} 
            meetingCount={mockMeetings.length}
            date="Today's Score"
          />
          <DailyScoreCard 
            score={78} 
            trend={-5} 
            meetingCount={3}
            date="Yesterday"
          />
          <DailyScoreCard 
            score={75} 
            trend={0} 
            meetingCount={24}
            date="7-Day Average"
          />
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <TrendChart data={mockTrendData} title="7-Day Score Trend" />
          </div>
          <div className="flex flex-col gap-4">
            <div className="bg-card border border-card-border rounded-lg p-6">
              <h3 className="text-sm font-medium text-muted-foreground mb-2">Total Meetings</h3>
              <div className="text-3xl font-bold font-mono">{mockMeetings.length}</div>
            </div>
            <div className="bg-card border border-card-border rounded-lg p-6">
              <h3 className="text-sm font-medium text-muted-foreground mb-2">Best Score</h3>
              <div className="text-3xl font-bold font-mono text-score-high">
                {Math.max(...mockMeetings.map(m => m.score))}
              </div>
            </div>
          </div>
        </div>

        <MeetingList meetings={mockMeetings} title="Today's Meetings" />
      </main>
    </div>
  );
}

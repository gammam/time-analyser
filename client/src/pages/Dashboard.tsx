import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { DashboardHeader } from "@/components/DashboardHeader";
import { DailyScoreCard } from "@/components/DailyScoreCard";
import { MeetingList } from "@/components/MeetingList";
import { TrendChart } from "@/components/TrendChart";
import { WeeklyChallengeCard } from "@/components/WeeklyChallengeCard";
import { AchievementsList } from "@/components/AchievementsList";
import { Button } from "@/components/ui/button";
import { RefreshCw, AlertCircle } from "lucide-react";
import { getMeetings, getStats, syncMeetings, getCurrentChallenge, getAchievements, type MeetingWithScore } from "@/lib/api";
import { queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { UserSettings } from "@shared/schema";

interface SettingsResponse extends Omit<UserSettings, 'googleAccessToken' | 'googleRefreshToken' | 'googleTokenExpiry' | 'jiraApiToken'> {
  hasGoogleCredentials: boolean;
  hasJiraCredentials: boolean;
}

export default function Dashboard() {
  const [dateRange, setDateRange] = useState("today");
  const { toast } = useToast();

  // Fetch user settings to check JIRA credentials
  const { data: settings } = useQuery<SettingsResponse>({
    queryKey: ["/api/settings"],
  });

  const getDateRange = () => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    
    switch (dateRange) {
      case "today":
        return { start: today, end: new Date(today.getTime() + 24 * 60 * 60 * 1000) };
      case "7days":
        return { start: new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000), end: new Date(today.getTime() + 24 * 60 * 60 * 1000) };
      case "30days":
        return { start: new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000), end: new Date(today.getTime() + 24 * 60 * 60 * 1000) };
      default:
        return { start: today, end: new Date(today.getTime() + 24 * 60 * 60 * 1000) };
    }
  };

  const { start, end } = getDateRange();

  const { data: meetings = [], isLoading: loadingMeetings, error: meetingsError } = useQuery<MeetingWithScore[]>({
    queryKey: ['/api/meetings', start.toISOString(), end.toISOString()],
    queryFn: () => getMeetings(start.toISOString(), end.toISOString()),
  });

  const { data: stats, isLoading: loadingStats } = useQuery({
    queryKey: ['/api/stats', start.toISOString(), end.toISOString()],
    queryFn: () => getStats(start.toISOString(), end.toISOString()),
  });

  const { data: challenge } = useQuery({
    queryKey: ['/api/challenge/current'],
    queryFn: getCurrentChallenge,
  });

  const { data: achievements = [] } = useQuery({
    queryKey: ['/api/achievements'],
    queryFn: getAchievements,
  });

  const syncMutation = useMutation({
    mutationFn: () => syncMeetings(start.toISOString(), end.toISOString()),
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ['/api/meetings'] });
      queryClient.invalidateQueries({ queryKey: ['/api/stats'] });
      queryClient.invalidateQueries({ queryKey: ['/api/challenge/current'] });
      queryClient.invalidateQueries({ queryKey: ['/api/achievements'] });
      const count = data?.count ?? data?.meetings?.length ?? 'your';
      toast({
        title: "Meetings synced",
        description: `Successfully synced ${count} meetings from Google Calendar`,
      });
    },
    onError: (error: any) => {
      toast({
        title: "Sync failed",
        description: error.message || "Failed to sync meetings from Google Calendar",
        variant: "destructive",
      });
    },
  });

  const avgScore = stats?.averageScore || 0;
  const yesterday = new Date(start.getTime() - 24 * 60 * 60 * 1000);
  
  const { data: yesterdayStats } = useQuery({
    queryKey: ['/api/stats', yesterday.toISOString(), start.toISOString()],
    queryFn: () => getStats(yesterday.toISOString(), start.toISOString()),
    enabled: dateRange === "today",
  });

  const trend = yesterdayStats?.averageScore 
    ? Math.round(((avgScore - yesterdayStats.averageScore) / yesterdayStats.averageScore) * 100)
    : 0;

  const formattedMeetings = meetings.map(m => ({
    id: m.id,
    title: m.title,
    time: new Date(m.startTime).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false }),
    duration: `${Math.round((new Date(m.endTime).getTime() - new Date(m.startTime).getTime()) / (1000 * 60))} min`,
    participants: m.participants,
    score: m.score?.totalScore || 0,
    breakdown: {
      agenda: m.score?.agendaScore || 0,
      participants: m.score?.participantsScore || 0,
      timing: m.score?.timingScore || 0,
      actions: m.score?.actionsScore || 0,
      attention: m.score?.attentionScore || 0,
    }
  }));

  if (meetingsError) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-4">
          <AlertCircle className="h-12 w-12 text-destructive mx-auto" />
          <h2 className="text-xl font-semibold">Failed to load meetings</h2>
          <p className="text-muted-foreground">
            {(meetingsError as Error).message}
          </p>
          <Button onClick={() => syncMutation.mutate()} data-testid="button-retry">
            <RefreshCw className="h-4 w-4 mr-2" />
            Sync from Google Calendar
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <DashboardHeader 
        dateRange={dateRange} 
        onDateRangeChange={setDateRange}
        hasJiraCredentials={settings?.hasJiraCredentials || false}
      />
      
      <main className="container mx-auto p-6 space-y-8">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold">Meeting Analytics</h2>
          <Button 
            onClick={() => syncMutation.mutate()} 
            disabled={syncMutation.isPending}
            data-testid="button-sync"
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${syncMutation.isPending ? 'animate-spin' : ''}`} />
            Sync Meetings
          </Button>
        </div>

        {loadingMeetings || loadingStats ? (
          <div className="space-y-6">
            <div className="grid gap-6 md:grid-cols-3">
              {[1, 2, 3].map(i => (
                <div key={i} className="bg-card border border-card-border rounded-lg p-6 animate-pulse">
                  <div className="h-4 bg-muted rounded w-1/2 mb-4"></div>
                  <div className="h-12 bg-muted rounded w-3/4"></div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <>
            <div className="grid gap-6 lg:grid-cols-4">
              <div className="lg:col-span-3 grid gap-6 md:grid-cols-3">
                <DailyScoreCard 
                  score={avgScore} 
                  trend={trend} 
                  meetingCount={meetings.length}
                  date={dateRange === "today" ? "Today's Score" : "Average Score"}
                />
                <DailyScoreCard 
                  score={yesterdayStats?.averageScore || 0} 
                  trend={0} 
                  meetingCount={yesterdayStats?.totalMeetings || 0}
                  date="Yesterday"
                />
                <DailyScoreCard 
                  score={meetings.length > 0 ? Math.max(...formattedMeetings.map(m => m.score)) : 0} 
                  trend={0} 
                  meetingCount={meetings.length}
                  date="Best Score"
                />
              </div>
              {challenge && (
                <div className="lg:row-span-2">
                  <WeeklyChallengeCard challenge={challenge} />
                </div>
              )}
            </div>

            <div className="grid gap-6 lg:grid-cols-4">
              <div className="lg:col-span-3">
                {stats?.trendData && stats.trendData.length > 0 && (
                  <TrendChart data={stats.trendData} title={`${dateRange === "7days" ? "7-Day" : dateRange === "30days" ? "30-Day" : "Daily"} Score Trend`} />
                )}
              </div>
              <div className="space-y-4">
                <AchievementsList achievements={achievements} />
              </div>
            </div>

            <MeetingList 
              meetings={formattedMeetings} 
              title={dateRange === "today" ? "Today's Meetings" : "Meetings"} 
            />
          </>
        )}
      </main>
    </div>
  );
}

import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { DashboardHeader } from "@/components/DashboardHeader";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { RefreshCw, AlertTriangle, CheckCircle2, Clock, Calendar, Settings as SettingsIcon } from "lucide-react";
import { syncJiraTasks, getJiraTasks, predictWeeklyTasks, type JiraTask, type WeeklyPredictionSummary } from "@/lib/api";
import { queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { format, parseISO } from "date-fns";
import type { UserSettings } from "@shared/schema";

interface SettingsResponse extends Omit<UserSettings, 'googleAccessToken' | 'googleRefreshToken' | 'googleTokenExpiry' | 'jiraApiToken'> {
  hasGoogleCredentials: boolean;
  hasJiraCredentials: boolean;
}

export default function TaskAnalysis() {
  const { toast } = useToast();

  // Fetch user settings to check JIRA credentials
  const { data: settings } = useQuery<SettingsResponse>({
    queryKey: ["/api/settings"],
  });
  const [selectedWeek, setSelectedWeek] = useState(() => {
    const now = new Date();
    const day = now.getDay();
    const diff = now.getDate() - day + (day === 0 ? -6 : 1);
    const weekStart = new Date(now.setDate(diff));
    weekStart.setHours(0, 0, 0, 0);
    return weekStart.toISOString();
  });

  const { data: tasks = [], isLoading: loadingTasks } = useQuery<JiraTask[]>({
    queryKey: ['/api/jira/tasks'],
    queryFn: () => getJiraTasks(),
  });

  const { data: predictions, isLoading: loadingPredictions } = useQuery<WeeklyPredictionSummary>({
    queryKey: ['/api/tasks/predictions', selectedWeek],
    queryFn: () => predictWeeklyTasks(selectedWeek),
    enabled: tasks.length > 0,
  });

  const syncTasksMutation = useMutation({
    mutationFn: syncJiraTasks,
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ['/api/jira/tasks'] });
      const count = data?.count ?? 0;
      toast({
        title: "Tasks synced",
        description: `Successfully synced ${count} tasks from JIRA`,
      });
    },
    onError: (error: any) => {
      toast({
        title: "Sync failed",
        description: error.message || "Failed to sync tasks from JIRA",
        variant: "destructive",
      });
    },
  });

  const predictTasksMutation = useMutation({
    mutationFn: () => predictWeeklyTasks(selectedWeek),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/tasks/predictions'] });
      toast({
        title: "Predictions updated",
        description: "Task completion predictions have been recalculated",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Prediction failed",
        description: error.message || "Failed to predict task completion",
        variant: "destructive",
      });
    },
  });

  const getRiskColor = (riskLevel: 'low' | 'medium' | 'high') => {
    switch (riskLevel) {
      case 'low': return 'text-green-600 dark:text-green-400';
      case 'medium': return 'text-yellow-600 dark:text-yellow-400';
      case 'high': return 'text-red-600 dark:text-red-400';
    }
  };

  const getRiskBadgeVariant = (riskLevel: 'low' | 'medium' | 'high') => {
    switch (riskLevel) {
      case 'low': return 'default';
      case 'medium': return 'secondary';
      case 'high': return 'destructive';
    }
  };

  const activeTasks = tasks.filter(t => t.status !== 'Done' && t.status !== 'Closed');

  return (
    <div className="min-h-screen bg-background">
      <DashboardHeader 
        dateRange="today" 
        onDateRangeChange={() => {}}
        hasJiraCredentials={settings?.hasJiraCredentials || false}
      />
      
      <main className="container mx-auto p-6 space-y-8">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold" data-testid="text-title">Task Completion Analysis</h2>
            <p className="text-muted-foreground">Predict which tasks you can complete this week based on meeting time and context switching</p>
          </div>
          <div className="flex gap-2">
            <Button 
              onClick={() => syncTasksMutation.mutate()} 
              disabled={syncTasksMutation.isPending || !settings?.hasJiraCredentials}
              data-testid="button-sync-tasks"
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${syncTasksMutation.isPending ? 'animate-spin' : ''}`} />
              Sync JIRA Tasks
            </Button>
            <Button 
              onClick={() => predictTasksMutation.mutate()} 
              disabled={predictTasksMutation.isPending || activeTasks.length === 0 || !settings?.hasJiraCredentials}
              variant="secondary"
              data-testid="button-predict-tasks"
            >
              <Clock className={`h-4 w-4 mr-2 ${predictTasksMutation.isPending ? 'animate-spin' : ''}`} />
              Analyze Week
            </Button>
          </div>
        </div>

        {!settings?.hasJiraCredentials && (
          <Card className="border-blue-500/50 bg-blue-500/5" data-testid="card-jira-setup">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-blue-500" />
                JIRA Configuration Required
              </CardTitle>
              <CardDescription>
                Connect your JIRA account to use task completion prediction
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                To analyze and predict task completion, you need to configure your JIRA credentials in Settings.
              </p>
              <div className="bg-muted/50 p-4 rounded-lg space-y-2">
                <p className="text-sm font-medium">How to set up JIRA:</p>
                <ol className="text-sm text-muted-foreground space-y-1 ml-4 list-decimal">
                  <li>Go to Settings (menu in top-right)</li>
                  <li>Create an API Token on your Atlassian account</li>
                  <li>Enter your email, Atlassian URL, and API Token</li>
                  <li>Optionally add a custom JQL query to filter tasks</li>
                  <li>Save and return here to sync your tasks</li>
                </ol>
              </div>
              <Button 
                onClick={() => window.location.href = '/settings'}
                className="w-full sm:w-auto"
                data-testid="button-go-to-settings"
              >
                <SettingsIcon className="h-4 w-4 mr-2" />
                Go to Settings
              </Button>
            </CardContent>
          </Card>
        )}

        {loadingTasks || loadingPredictions ? (
          <div className="grid gap-6 md:grid-cols-3">
            {[1, 2, 3].map(i => (
              <Card key={i} className="animate-pulse">
                <CardHeader>
                  <div className="h-4 bg-muted rounded w-1/2 mb-2"></div>
                  <div className="h-8 bg-muted rounded w-3/4"></div>
                </CardHeader>
              </Card>
            ))}
          </div>
        ) : (
          <>
            {predictions && predictions.summary && (
              <div className="grid gap-6 md:grid-cols-4">
                <Card data-testid="card-total-tasks">
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Total Tasks</CardTitle>
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold" data-testid="text-total-tasks">{predictions.summary.totalTasks}</div>
                    <p className="text-xs text-muted-foreground">Active in your queue</p>
                  </CardContent>
                </Card>

                <Card data-testid="card-likely-complete">
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Likely Complete</CardTitle>
                    <CheckCircle2 className="h-4 w-4 text-green-600" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-green-600" data-testid="text-likely-complete">{predictions.summary.likelyComplete}</div>
                    <p className="text-xs text-muted-foreground">{predictions.summary.totalTasks > 0 ? Math.round((predictions.summary.likelyComplete / predictions.summary.totalTasks) * 100) : 0}% of tasks</p>
                  </CardContent>
                </Card>

                <Card data-testid="card-at-risk">
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">At Risk</CardTitle>
                    <AlertTriangle className="h-4 w-4 text-yellow-600" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-yellow-600" data-testid="text-at-risk">{predictions.summary.atRisk}</div>
                    <p className="text-xs text-muted-foreground">{predictions.summary.totalTasks > 0 ? Math.round((predictions.summary.atRisk / predictions.summary.totalTasks) * 100) : 0}% of tasks</p>
                  </CardContent>
                </Card>

                <Card data-testid="card-unlikely">
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Unlikely</CardTitle>
                    <Clock className="h-4 w-4 text-red-600" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-red-600" data-testid="text-unlikely">{predictions.summary.unlikely}</div>
                    <p className="text-xs text-muted-foreground">{predictions.summary.totalTasks > 0 ? Math.round((predictions.summary.unlikely / predictions.summary.totalTasks) * 100) : 0}% of tasks</p>
                  </CardContent>
                </Card>
              </div>
            )}

            {activeTasks.length > 0 ? (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold">Active Tasks ({activeTasks.length})</h3>
                  {predictions && predictions.summary && (
                    <p className="text-sm text-muted-foreground">Predictions shown below each task</p>
                  )}
                </div>
                {activeTasks.map((task) => {
                  const prediction = predictions?.predictions?.find(p => p.taskId === task.id);
                  return (
                    <Card key={task.id} className="hover-elevate" data-testid={`card-task-${task.id}`}>
                      <CardHeader>
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <CardTitle className="text-base" data-testid={`text-task-summary-${task.id}`}>
                              {task.jiraKey}: {task.summary}
                            </CardTitle>
                            <CardDescription className="mt-1">
                              {task.projectKey} • {task.priority} Priority • Status: {task.status}
                              {task.dueDate && ` • Due ${format(parseISO(task.dueDate), 'MMM d, yyyy')}`}
                            </CardDescription>
                          </div>
                          <div className="flex gap-2">
                            {task.priority && (
                              <Badge variant={task.priority === 'High' || task.priority === 'Highest' ? 'destructive' : 'secondary'}>
                                {task.priority}
                              </Badge>
                            )}
                            {prediction && (
                              <Badge variant={getRiskBadgeVariant(prediction.riskLevel)} data-testid={`badge-risk-${task.id}`}>
                                {prediction.completionProbability}%
                              </Badge>
                            )}
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div className="flex gap-4 text-sm text-muted-foreground">
                          {task.estimateHours && <span>Est: {task.estimateHours}h</span>}
                          {task.storyPoints && <span>SP: {task.storyPoints}</span>}
                          {task.assignee && <span>Assignee: {task.assignee}</span>}
                        </div>

                        {prediction && (
                          <>
                            <div className="space-y-2">
                              <div className="flex items-center justify-between text-sm">
                                <span className="text-muted-foreground">Completion Probability</span>
                                <span className={`font-semibold ${getRiskColor(prediction.riskLevel)}`} data-testid={`text-probability-${task.id}`}>
                                  {prediction.completionProbability}%
                                </span>
                              </div>
                              <Progress value={prediction.completionProbability} className="h-2" />
                            </div>

                            {prediction.estimatedCompletionDate && (
                              <div className="text-sm">
                                <span className="text-muted-foreground">Estimated completion: </span>
                                <span className="font-medium" data-testid={`text-completion-date-${task.id}`}>
                                  {format(parseISO(prediction.estimatedCompletionDate), 'EEEE, MMM d')}
                                </span>
                              </div>
                            )}

                            {prediction.blockers.length > 0 && (
                              <div className="space-y-1">
                                <p className="text-sm font-medium text-muted-foreground">Blockers:</p>
                                <ul className="space-y-1">
                                  {prediction.blockers.map((blocker, i) => (
                                    <li key={i} className="text-sm flex items-center gap-2" data-testid={`text-blocker-${task.id}-${i}`}>
                                      <AlertTriangle className="h-3 w-3 text-yellow-600" />
                                      {blocker}
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            )}
                          </>
                        )}
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            ) : (
              <Card>
                <CardContent className="py-8 text-center text-muted-foreground">
                  No active tasks found. Click "Sync JIRA Tasks" to import your tasks.
                </CardContent>
              </Card>
            )}
          </>
        )}
      </main>
    </div>
  );
}

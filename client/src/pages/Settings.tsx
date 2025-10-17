import { useEffect, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { DashboardHeader } from "@/components/DashboardHeader";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Settings as SettingsIcon, Save, Key } from "lucide-react";

interface SettingsData {
  dailyWorkHours: number;
  contextSwitchingMinutes: number;
  jiraEmail: string | null;
  jiraHost: string | null;
  jiraJqlQuery: string | null;
  hasJiraCredentials: boolean;
}

export default function Settings() {
  const { toast } = useToast();
  const [dailyWorkHours, setDailyWorkHours] = useState<number>(8);
  const [contextSwitchingMinutes, setContextSwitchingMinutes] = useState<number>(20);
  const [jiraEmail, setJiraEmail] = useState<string>("");
  const [jiraApiToken, setJiraApiToken] = useState<string>("");
  const [jiraHost, setJiraHost] = useState<string>("");
  const [jiraJqlQuery, setJiraJqlQuery] = useState<string>("");

  const { data: settings, isLoading, error } = useQuery<SettingsData>({
    queryKey: ['/api/settings'],
  });

  useEffect(() => {
    if (settings) {
      setDailyWorkHours(settings.dailyWorkHours);
      setContextSwitchingMinutes(settings.contextSwitchingMinutes);
      setJiraEmail(settings.jiraEmail || "");
      setJiraHost(settings.jiraHost || "");
      setJiraJqlQuery(settings.jiraJqlQuery || "");
      // Don't set jiraApiToken - it's never returned from the server for security
    }
  }, [settings]);

  useEffect(() => {
    if (error) {
      toast({
        title: "Failed to load settings",
        description: "Could not retrieve your settings. Please try refreshing the page.",
        variant: "destructive",
      });
    }
  }, [error, toast]);

  const saveSettingsMutation = useMutation({
    mutationFn: async (data: { 
      dailyWorkHours: number; 
      contextSwitchingMinutes: number;
      jiraEmail?: string;
      jiraApiToken?: string;
      jiraHost?: string;
      jiraJqlQuery?: string;
    }) => {
      return await apiRequest('POST', '/api/settings', data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/settings'] });
      toast({
        title: "Settings saved",
        description: "Your configuration has been updated successfully.",
      });
      // Clear the API token field after successful save for security
      setJiraApiToken("");
    },
    onError: (error: any) => {
      toast({
        title: "Save failed",
        description: error.message || "Failed to save settings",
        variant: "destructive",
      });
    },
  });

  const handleSave = () => {
    const data: any = {
      dailyWorkHours,
      contextSwitchingMinutes
    };
    
    // Only include JIRA fields if they have values
    if (jiraEmail) data.jiraEmail = jiraEmail;
    if (jiraApiToken) data.jiraApiToken = jiraApiToken;
    if (jiraHost) data.jiraHost = jiraHost;
    if (jiraJqlQuery) data.jiraJqlQuery = jiraJqlQuery;
    
    saveSettingsMutation.mutate(data);
  };

  return (
    <div className="min-h-screen bg-background">
      <DashboardHeader dateRange="today" onDateRangeChange={() => {}} />
      
      <main className="container mx-auto p-6 max-w-4xl space-y-8">
        <div className="flex items-center gap-3">
          <SettingsIcon className="h-8 w-8 text-primary" />
          <div>
            <h2 className="text-2xl font-bold" data-testid="text-title">Settings</h2>
            <p className="text-muted-foreground">Configure your application preferences</p>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Work Hours Configuration</CardTitle>
            <CardDescription>
              Set your daily work schedule and context switching overhead
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="work-hours">Daily Work Hours</Label>
                <Input
                  id="work-hours"
                  type="number"
                  value={dailyWorkHours}
                  onChange={(e) => setDailyWorkHours(parseFloat(e.target.value))}
                  min="1"
                  max="24"
                  step="0.5"
                  data-testid="input-work-hours"
                  disabled={isLoading}
                />
                <p className="text-sm text-muted-foreground">
                  Hours available for work each day
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="context-switch">Context Switch Time (minutes)</Label>
                <Input
                  id="context-switch"
                  type="number"
                  value={contextSwitchingMinutes}
                  onChange={(e) => setContextSwitchingMinutes(parseInt(e.target.value))}
                  min="0"
                  max="60"
                  step="5"
                  data-testid="input-context-switch"
                  disabled={isLoading}
                />
                <p className="text-sm text-muted-foreground">
                  Time lost when switching between tasks
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Key className="h-5 w-5" />
              JIRA Integration
            </CardTitle>
            <CardDescription>
              Configure your Atlassian JIRA credentials to sync and analyze tasks
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4">
              <div className="space-y-2">
                <Label htmlFor="jira-email">JIRA Email</Label>
                <Input
                  id="jira-email"
                  type="email"
                  value={jiraEmail}
                  onChange={(e) => setJiraEmail(e.target.value)}
                  placeholder="your.email@company.com"
                  data-testid="input-jira-email"
                  disabled={isLoading}
                />
                <p className="text-sm text-muted-foreground">
                  Your Atlassian account email address
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="jira-host">Atlassian URL</Label>
                <Input
                  id="jira-host"
                  type="url"
                  value={jiraHost}
                  onChange={(e) => setJiraHost(e.target.value)}
                  placeholder="https://your-domain.atlassian.net"
                  data-testid="input-jira-host"
                  disabled={isLoading}
                />
                <p className="text-sm text-muted-foreground">
                  Your Atlassian JIRA instance URL
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="jira-token">API Token</Label>
                <Input
                  id="jira-token"
                  type="password"
                  value={jiraApiToken}
                  onChange={(e) => setJiraApiToken(e.target.value)}
                  placeholder={settings?.hasJiraCredentials ? "••••••••" : "Enter your API token"}
                  data-testid="input-jira-token"
                  disabled={isLoading}
                />
                <p className="text-sm text-muted-foreground">
                  {settings?.hasJiraCredentials ? (
                    <>API token is configured. Enter a new one to update it.</>
                  ) : (
                    <>Generate one from <a href="https://id.atlassian.com/manage-profile/security/api-tokens" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">Atlassian API Tokens</a></>
                  )}
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="jira-jql">JQL Query (optional)</Label>
                <Textarea
                  id="jira-jql"
                  value={jiraJqlQuery}
                  onChange={(e) => setJiraJqlQuery(e.target.value)}
                  placeholder='type IN (Task) and assignee = currentUser() and statusCategory != Done'
                  data-testid="input-jira-jql"
                  disabled={isLoading}
                  rows={3}
                />
                <p className="text-sm text-muted-foreground">
                  Filter which tasks to sync (default: all open tasks assigned to you)
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Meeting Score Weights</CardTitle>
            <CardDescription>
              Adjust how different factors contribute to meeting effectiveness score
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Coming soon: Customize the weights for agenda quality, participant count, timing, actions, and attention metrics.
            </p>
          </CardContent>
        </Card>

        <div className="flex justify-end">
          <Button 
            onClick={handleSave}
            disabled={saveSettingsMutation.isPending || isLoading}
            data-testid="button-save"
          >
            <Save className="h-4 w-4 mr-2" />
            {saveSettingsMutation.isPending ? "Saving..." : "Save Settings"}
          </Button>
        </div>
      </main>
    </div>
  );
}

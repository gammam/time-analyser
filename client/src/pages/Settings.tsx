import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { DashboardHeader } from "@/components/DashboardHeader";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Settings as SettingsIcon, Save } from "lucide-react";

export default function Settings() {
  const { toast } = useToast();
  const [jqlQuery, setJqlQuery] = useState("");

  const saveSettingsMutation = useMutation({
    mutationFn: async (data: { jqlQuery: string }) => {
      toast({
        title: "Settings saved",
        description: "Your JQL query has been updated. Please restart the application for changes to take effect.",
      });
      return data;
    },
    onError: (error: any) => {
      toast({
        title: "Save failed",
        description: error.message || "Failed to save settings",
        variant: "destructive",
      });
    },
  });

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
            <CardTitle>JIRA Integration</CardTitle>
            <CardDescription>
              Configure how tasks are fetched from JIRA
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="jql-query">JQL Query</Label>
              <Textarea
                id="jql-query"
                placeholder="type IN (Task) and assignee = currentUser() and statusCategory != Done order BY type DESC"
                value={jqlQuery}
                onChange={(e) => setJqlQuery(e.target.value)}
                rows={4}
                data-testid="input-jql-query"
                className="font-mono text-sm"
              />
              <p className="text-sm text-muted-foreground">
                Enter a JQL query to filter your JIRA tasks. Leave empty to use the default query.
              </p>
            </div>

            <div className="space-y-2">
              <Label>Current Query (from environment)</Label>
              <div className="p-3 bg-muted rounded-md font-mono text-sm text-muted-foreground">
                {import.meta.env.JIRA_JQL_QUERY || "type IN (Task) and assignee = currentUser() and statusCategory != Done order BY type DESC"}
              </div>
              <p className="text-sm text-muted-foreground">
                Note: To change this permanently, update the JIRA_JQL_QUERY secret in your Replit environment.
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Work Hours Configuration</CardTitle>
            <CardDescription>
              Set your daily work schedule
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="work-hours">Daily Work Hours</Label>
                <Input
                  id="work-hours"
                  type="number"
                  placeholder="8"
                  min="1"
                  max="24"
                  data-testid="input-work-hours"
                />
                <p className="text-sm text-muted-foreground">
                  Default: 8 hours per day
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="context-switch">Context Switch Time (minutes)</Label>
                <Input
                  id="context-switch"
                  type="number"
                  placeholder="20"
                  min="0"
                  max="60"
                  data-testid="input-context-switch"
                />
                <p className="text-sm text-muted-foreground">
                  Default: 20 minutes per task
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
            onClick={() => saveSettingsMutation.mutate({ jqlQuery })}
            disabled={saveSettingsMutation.isPending}
            data-testid="button-save"
          >
            <Save className="h-4 w-4 mr-2" />
            Save Settings
          </Button>
        </div>
      </main>
    </div>
  );
}

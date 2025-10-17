import { useEffect, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { DashboardHeader } from "@/components/DashboardHeader";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Settings as SettingsIcon, Save } from "lucide-react";

interface SettingsData {
  dailyWorkHours: number;
  contextSwitchingMinutes: number;
}

export default function Settings() {
  const { toast } = useToast();
  const [dailyWorkHours, setDailyWorkHours] = useState<number>(8);
  const [contextSwitchingMinutes, setContextSwitchingMinutes] = useState<number>(20);

  const { data: settings, isLoading, error } = useQuery<SettingsData>({
    queryKey: ['/api/settings'],
  });

  useEffect(() => {
    if (settings) {
      setDailyWorkHours(settings.dailyWorkHours);
      setContextSwitchingMinutes(settings.contextSwitchingMinutes);
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
    mutationFn: async (data: { dailyWorkHours: number; contextSwitchingMinutes: number }) => {
      return await apiRequest('/api/settings', {
        method: 'POST',
        body: JSON.stringify(data),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/settings'] });
      toast({
        title: "Settings saved",
        description: "Your work configuration has been updated successfully.",
      });
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
    saveSettingsMutation.mutate({
      dailyWorkHours,
      contextSwitchingMinutes
    });
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

// Reference: blueprint:javascript_log_in_with_replit
import { Switch, Route } from "wouter";
import { queryClient, apiRequest } from "./lib/queryClient";
import { QueryClientProvider, useMutation, useQuery } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useAuth } from "@/hooks/useAuth";
import { OnboardingModal } from "@/components/OnboardingModal";
import type { User, UserSettings } from "@shared/schema";

interface SettingsResponse extends Omit<UserSettings, 'googleAccessToken' | 'googleRefreshToken' | 'googleTokenExpiry' | 'jiraApiToken'> {
  hasGoogleCredentials: boolean;
  hasJiraCredentials: boolean;
}
import Dashboard from "@/pages/Dashboard";
import TaskAnalysis from "@/pages/TaskAnalysis";
import Settings from "@/pages/Settings";
import Landing from "@/pages/Landing";
import NotFound from "@/pages/not-found";

function LoadingScreen() {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center space-y-4">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
        <p className="text-sm text-muted-foreground">Loading...</p>
      </div>
    </div>
  );
}

function Router() {
  const { user, isAuthenticated, isLoading } = useAuth();

  // Fetch user settings to check Google credentials
  const { data: settings } = useQuery<SettingsResponse>({
    queryKey: ["/api/settings"],
    enabled: isAuthenticated,
  });

  // Mutation to complete onboarding
  const completeOnboarding = useMutation({
    mutationFn: async () => {
      return await apiRequest("POST", "/api/auth/complete-onboarding");
    },
    onSuccess: () => {
      // Invalidate user query to refresh data
      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
    },
  });

  const typedUser = user as User | undefined;
  const showOnboarding = isAuthenticated && typedUser && typedUser.hasCompletedOnboarding === 0;

  return (
    <>
      {isLoading ? (
        <LoadingScreen />
      ) : (
        <>
          <Switch>
            {!isAuthenticated ? (
              <Route path="/" component={Landing} />
            ) : (
              <>
                <Route path="/" component={Dashboard} />
                <Route path="/tasks" component={TaskAnalysis} />
                <Route path="/settings" component={Settings} />
              </>
            )}
            <Route component={NotFound} />
          </Switch>
          
          {showOnboarding && (
            <OnboardingModal
              open={true}
              hasGoogleCredentials={settings?.hasGoogleCredentials || false}
              onComplete={() => completeOnboarding.mutate()}
            />
          )}
        </>
      )}
    </>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Router />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;

import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { DashboardHeader } from "@/components/DashboardHeader";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, RefreshCw, AlertCircle } from "lucide-react";
import type { UserSettings } from "@shared/schema";
import {
  buildDoraMetricViewModel,
  defaultDateRange,
  fetchDoraMetricsSnapshot,
  validateDoraRequest,
  type DoraMetricsSnapshot,
  type DoraRequestContext,
} from "@/lib/dora";

interface SettingsResponse extends Omit<UserSettings, "googleAccessToken" | "googleRefreshToken" | "googleTokenExpiry" | "jiraApiToken"> {
  hasGoogleCredentials: boolean;
  hasJiraCredentials: boolean;
}

export default function DoraDashboard() {
  const dates = useMemo(() => defaultDateRange(30), []);
  const [formState, setFormState] = useState<DoraRequestContext>({ projectKey: "PN", from: dates.from, to: dates.to });
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});
  const [activeRequest, setActiveRequest] = useState<DoraRequestContext | null>({ projectKey: "PN", from: dates.from, to: dates.to });
  const [committedSnapshot, setCommittedSnapshot] = useState<DoraMetricsSnapshot | null>(null);

  const { data: settings } = useQuery<SettingsResponse>({
    queryKey: ["/api/settings"],
  });

  const snapshotQuery = useQuery({
    queryKey: ["/api/dora/snapshot", activeRequest?.projectKey, activeRequest?.from, activeRequest?.to],
    enabled: Boolean(activeRequest),
    queryFn: async () => fetchDoraMetricsSnapshot(activeRequest as DoraRequestContext),
  });

  const displayedSnapshot = snapshotQuery.data ?? committedSnapshot;
  const metrics = displayedSnapshot ? buildDoraMetricViewModel(displayedSnapshot) : [];
  const isInitialLoading = snapshotQuery.isLoading && !displayedSnapshot;

  const onSubmit = () => {
    const result = validateDoraRequest(formState);
    if (!result.isValid) {
      setValidationErrors(result.errors as Record<string, string>);
      return;
    }

    setValidationErrors({});
    const frozenContext: DoraRequestContext = {
      projectKey: formState.projectKey.trim(),
      from: formState.from,
      to: formState.to,
    };

    setActiveRequest(frozenContext);
  };

  useEffect(() => {
    if (snapshotQuery.data) {
      setCommittedSnapshot(snapshotQuery.data);
    }
  }, [snapshotQuery.data]);

  return (
    <div className="min-h-screen bg-background">
      <DashboardHeader hasJiraCredentials={settings?.hasJiraCredentials || false} showDateRange={false} />

      <main className="container mx-auto p-6 space-y-6">
        <section className="space-y-4" aria-label="DORA filters">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold">DORA Metrics Dashboard</h2>
              <p className="text-sm text-muted-foreground">Request all DORA metrics with one synchronized refresh.</p>
            </div>
            <Button onClick={onSubmit} data-testid="button-update-dora" disabled={snapshotQuery.isFetching}>
              {snapshotQuery.isFetching ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
              Update metrics
            </Button>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Request Context</CardTitle>
              <CardDescription>All cards use the same project and date range.</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-3">
              <div className="space-y-2">
                <Label htmlFor="projectKey">Project</Label>
                <Input
                  id="projectKey"
                  aria-label="Project key"
                  value={formState.projectKey}
                  onChange={(e) => setFormState((prev) => ({ ...prev, projectKey: e.target.value }))}
                  data-testid="input-project-key"
                />
                {validationErrors.projectKey && <p className="text-sm text-destructive">{validationErrors.projectKey}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="fromDate">From</Label>
                <Input
                  id="fromDate"
                  type="date"
                  aria-label="From date"
                  value={formState.from || ""}
                  onChange={(e) => setFormState((prev) => ({ ...prev, from: e.target.value }))}
                  data-testid="input-from-date"
                />
                {validationErrors.from && <p className="text-sm text-destructive">{validationErrors.from}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="toDate">To</Label>
                <Input
                  id="toDate"
                  type="date"
                  aria-label="To date"
                  value={formState.to || ""}
                  onChange={(e) => setFormState((prev) => ({ ...prev, to: e.target.value }))}
                  data-testid="input-to-date"
                />
                {validationErrors.to && <p className="text-sm text-destructive">{validationErrors.to}</p>}
              </div>
            </CardContent>
          </Card>

          {validationErrors.range && (
            <Alert variant="destructive" data-testid="alert-invalid-range">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Invalid date range</AlertTitle>
              <AlertDescription>{validationErrors.range}</AlertDescription>
            </Alert>
          )}

          {snapshotQuery.isFetching && displayedSnapshot && (
            <Alert data-testid="alert-global-loading">
              <Loader2 className="h-4 w-4 animate-spin" />
              <AlertTitle>Refreshing metrics</AlertTitle>
              <AlertDescription>Previous values remain visible until the new synchronized refresh completes.</AlertDescription>
            </Alert>
          )}

          {displayedSnapshot?.hasPartialFailure && (
            <Alert variant="destructive" data-testid="alert-partial-failure">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Partial failure</AlertTitle>
              <AlertDescription>Some metrics failed to load. Successful metrics are still shown with the same request context.</AlertDescription>
            </Alert>
          )}
        </section>

        {isInitialLoading ? (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4" data-testid="dora-loading-skeleton">
            {[1, 2, 3, 4].map((id) => (
              <Card key={id}>
                <CardHeader>
                  <div className="h-4 w-28 animate-pulse rounded bg-muted" />
                </CardHeader>
                <CardContent>
                  <div className="h-8 w-24 animate-pulse rounded bg-muted" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4" aria-label="DORA metric cards">
            {metrics.map((metric) => (
              <Card key={metric.id} data-testid={`card-${metric.id}`}>
                <CardHeader>
                  <CardTitle className="text-base">{metric.title}</CardTitle>
                  <CardDescription>{metric.subtitle}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <p className="text-3xl font-semibold">{metric.value}</p>
                  {metric.status === "error" && <p className="text-sm text-destructive">{metric.error}</p>}
                  {metric.status === "empty" && <p className="text-sm text-muted-foreground">No data in selected range.</p>}
                  <div className="text-xs text-muted-foreground">
                    <p>Project: {displayedSnapshot?.request.projectKey || "-"}</p>
                    <p>Range: {displayedSnapshot?.request.from || "-"} to {displayedSnapshot?.request.to || "-"}</p>
                    <p>Last updated: {displayedSnapshot?.completedAt ? new Date(displayedSnapshot.completedAt).toLocaleString() : "-"}</p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </section>
        )}
      </main>
    </div>
  );
}

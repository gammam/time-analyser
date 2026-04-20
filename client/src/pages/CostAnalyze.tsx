import { useMemo, useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { DashboardHeader } from "@/components/DashboardHeader";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { AlertCircle, Loader2, RefreshCw } from "lucide-react";
import type { UserSettings } from "@shared/schema";
import {
  defaultDateRange,
  fetchCostAnalyzeReport,
  validateCostAnalyzeRequest,
  type CostAnalyzeReport,
  type CostAnalyzeRequest,
} from "@/lib/cost-analyze";

interface SettingsResponse
  extends Omit<
    UserSettings,
    | "googleAccessToken"
    | "googleRefreshToken"
    | "googleTokenExpiry"
    | "jiraApiToken"
  > {
  hasGoogleCredentials: boolean;
  hasJiraCredentials: boolean;
}

export default function CostAnalyze() {
  const dates = useMemo(() => defaultDateRange(30), []);
  const [formState, setFormState] = useState<CostAnalyzeRequest>({
    projectKey: "PN",
    from: dates.from,
    to: dates.to,
  });
  const [validationErrors, setValidationErrors] = useState<
    Partial<Record<keyof CostAnalyzeRequest, string>>
  >({});
  const [activeRequest, setActiveRequest] =
    useState<CostAnalyzeRequest | null>(null);
  const [committedReport, setCommittedReport] =
    useState<CostAnalyzeReport | null>(null);

  const { data: settings } = useQuery<SettingsResponse>({
    queryKey: ["/api/settings"],
  });

  const reportQuery = useQuery({
    queryKey: [
      "/api/cost-analyze",
      activeRequest?.projectKey,
      activeRequest?.from,
      activeRequest?.to,
    ],
    enabled: Boolean(activeRequest),
    queryFn: async () =>
      fetchCostAnalyzeReport(activeRequest as CostAnalyzeRequest),
  });

  useEffect(() => {
    if (reportQuery.data) {
      setCommittedReport(reportQuery.data);
    }
  }, [reportQuery.data]);

  const displayedReport = reportQuery.data ?? committedReport;
  const isInitialLoading = reportQuery.isLoading && !displayedReport;

  const onSubmit = () => {
    const result = validateCostAnalyzeRequest(formState);
    if (!result.isValid) {
      setValidationErrors(result.errors);
      return;
    }

    setValidationErrors({});
    const frozenRequest: CostAnalyzeRequest = {
      projectKey: formState.projectKey.trim(),
      from: formState.from,
      to: formState.to,
    };
    setActiveRequest(frozenRequest);
  };

  return (
    <div className="min-h-screen bg-background">
      <DashboardHeader
        hasJiraCredentials={settings?.hasJiraCredentials || false}
        showDateRange={false}
      />

      <main className="container mx-auto p-6 space-y-6">
        <section className="space-y-4" aria-label="Cost analyze filters">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold">Cost Analyze</h2>
              <p className="text-sm text-muted-foreground">
                Summarize time spent per Epic by team member from JIRA worklogs.
              </p>
            </div>
            <Button
              onClick={onSubmit}
              data-testid="button-generate-report"
              disabled={reportQuery.isFetching}
            >
              {reportQuery.isFetching ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="mr-2 h-4 w-4" />
              )}
              Generate Report
            </Button>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Report Parameters</CardTitle>
              <CardDescription>
                Select a project and date range to generate the cost report.
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-3">
              <div className="space-y-2">
                <Label htmlFor="projectKey">Project</Label>
                <Input
                  id="projectKey"
                  aria-label="Project key"
                  value={formState.projectKey}
                  onChange={(e) =>
                    setFormState((prev) => ({
                      ...prev,
                      projectKey: e.target.value,
                    }))
                  }
                  data-testid="input-project-key"
                />
                {validationErrors.projectKey && (
                  <p className="text-sm text-destructive">
                    {validationErrors.projectKey}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="fromDate">From</Label>
                <Input
                  id="fromDate"
                  type="date"
                  aria-label="From date"
                  value={formState.from}
                  onChange={(e) =>
                    setFormState((prev) => ({ ...prev, from: e.target.value }))
                  }
                  data-testid="input-from-date"
                />
                {validationErrors.from && (
                  <p className="text-sm text-destructive">
                    {validationErrors.from}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="toDate">To</Label>
                <Input
                  id="toDate"
                  type="date"
                  aria-label="To date"
                  value={formState.to}
                  onChange={(e) =>
                    setFormState((prev) => ({ ...prev, to: e.target.value }))
                  }
                  data-testid="input-to-date"
                />
              </div>
            </CardContent>
          </Card>

          {reportQuery.isError && (
            <Alert variant="destructive" data-testid="alert-error">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Error loading report</AlertTitle>
              <AlertDescription>
                {reportQuery.error instanceof Error
                  ? reportQuery.error.message
                  : "An unexpected error occurred."}
              </AlertDescription>
            </Alert>
          )}

          {reportQuery.isFetching && displayedReport && (
            <Alert data-testid="alert-refreshing">
              <Loader2 className="h-4 w-4 animate-spin" />
              <AlertTitle>Refreshing report</AlertTitle>
              <AlertDescription>
                Previous values remain visible until the new report completes.
              </AlertDescription>
            </Alert>
          )}
        </section>

        {isInitialLoading ? (
          <Card data-testid="loading-skeleton">
            <CardContent className="pt-6 space-y-3">
              {[1, 2, 3, 4, 5].map((i) => (
                <div
                  key={i}
                  className="h-6 w-full animate-pulse rounded bg-muted"
                />
              ))}
            </CardContent>
          </Card>
        ) : displayedReport ? (
          <CostReportTable report={displayedReport} />
        ) : null}
      </main>
    </div>
  );
}

function CostReportTable({ report }: { report: CostAnalyzeReport }) {
  const hasData = report.epics.length > 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Time Report</CardTitle>
        <CardDescription>
          Project: {report.projectKey} &bull; {report.from ?? "—"} to{" "}
          {report.to ?? "—"}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {!hasData ? (
          <p
            className="text-sm text-muted-foreground text-center py-8"
            data-testid="empty-state"
          >
            No epics found for the selected range.
          </p>
        ) : (
          <Table data-testid="cost-report-table">
            <TableHeader>
              <TableRow>
                <TableHead>Epic ID</TableHead>
                <TableHead>Epic Name</TableHead>
                <TableHead>Team Member</TableHead>
                <TableHead className="text-right">Hours</TableHead>
                <TableHead className="text-right">Epic Total Hours</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {report.epics.map((epic) => {
                const hasWorklogs = epic.worklogs.length > 0;

                if (!hasWorklogs) {
                  return (
                    <TableRow
                      key={epic.epicId}
                      data-testid={`epic-row-${epic.epicId}`}
                    >
                      <TableCell className="font-mono text-xs">
                        {epic.epicId}
                      </TableCell>
                      <TableCell>{epic.epicName}</TableCell>
                      <TableCell className="text-muted-foreground">
                        —
                      </TableCell>
                      <TableCell className="text-right text-muted-foreground">
                        —
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        0h
                      </TableCell>
                    </TableRow>
                  );
                }

                return epic.worklogs.map((worklog, idx) => (
                  <TableRow
                    key={`${epic.epicId}-${idx}`}
                    data-testid={
                      idx === 0 ? `epic-row-${epic.epicId}` : undefined
                    }
                  >
                    <TableCell className="font-mono text-xs">
                      {idx === 0 ? epic.epicId : ""}
                    </TableCell>
                    <TableCell>{idx === 0 ? epic.epicName : ""}</TableCell>
                    <TableCell>{worklog.user}</TableCell>
                    <TableCell className="text-right">
                      {worklog.hours.toFixed(1)}h
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      {idx === 0 ? `${epic.totalHours.toFixed(1)}h` : ""}
                    </TableCell>
                  </TableRow>
                ));
              })}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}

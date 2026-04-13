export interface DoraRequestContext {
  projectKey: string;
  from?: string;
  to?: string;
}

export interface DeploymentFrequencyResponse {
  team: string | null;
  projectKey: string;
  from: string | null;
  to: string | null;
  deploymentFrequency: number;
}

export interface LeadTimeResponse {
  team: string | null;
  projectKey: string;
  from: string | null;
  to: string | null;
  meanLeadTimeDays: number | null;
  meanLeadTimeReadyForUAT: number | null;
  epics: unknown[];
  skippedEpics: unknown[];
}

export interface ChangeFailureRateResponse {
  team: string | null;
  projectKey: string;
  from: string | null;
  to: string | null;
  dora: {
    totalDeployments: number;
    failedDeployments: number;
    changeFailureRate: number | null;
  };
  send: {
    totalDeployments: number;
    failedDeployments: number;
    hotfixReleases: number;
    changeFailureRate: number | null;
  };
  releases: unknown[];
  unmappedFailures: unknown[];
}

export interface MttrResponse {
  team: string | null;
  projectKey: string;
  from: string | null;
  to: string | null;
  mttrHours: number | null;
  p50Hours: number | null;
  p90Hours: number | null;
  totalIncidents: number;
  resolvedIncidents: number;
  unresolvedIncidents: number;
  issues: unknown[];
  skippedIssues: unknown[];
}

export interface DoraMetricsData {
  deploymentFrequency: DeploymentFrequencyResponse;
  leadTime: LeadTimeResponse;
  changeFailureRate: ChangeFailureRateResponse;
  mttr: MttrResponse;
}

export interface DoraMetricsSnapshot {
  request: DoraRequestContext;
  data: Partial<DoraMetricsData>;
  errors: Partial<Record<keyof DoraMetricsData, string>>;
  hasPartialFailure: boolean;
  hasAnySuccess: boolean;
  completedAt: string;
}

export interface DoraValidationResult {
  isValid: boolean;
  errors: {
    projectKey?: string;
    from?: string;
    to?: string;
    range?: string;
  };
}

export interface DoraMetricViewModel {
  id: keyof DoraMetricsData;
  title: string;
  value: string;
  subtitle: string;
  status: "ok" | "empty" | "error";
  error?: string;
}

export function formatHoursAndDays(hours: number): string {
  const days = hours / 24;
  return `${hours.toFixed(2)} h (${days.toFixed(2)} d)`;
}

function isValidDateString(value: string): boolean {
  if (!value) return true;
  const date = new Date(value);
  return !Number.isNaN(date.getTime());
}

export function validateDoraRequest(request: DoraRequestContext): DoraValidationResult {
  const errors: DoraValidationResult["errors"] = {};

  if (!request.projectKey || request.projectKey.trim().length === 0) {
    errors.projectKey = "Project key is required";
  }

  if (request.from && !isValidDateString(request.from)) {
    errors.from = "Invalid from date";
  }

  if (request.to && !isValidDateString(request.to)) {
    errors.to = "Invalid to date";
  }

  if (request.from && request.to && isValidDateString(request.from) && isValidDateString(request.to)) {
    if (new Date(request.from) > new Date(request.to)) {
      errors.range = "From date must be before or equal to To date";
    }
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  };
}

export function toIsoDate(value: Date): string {
  return value.toISOString().slice(0, 10);
}

export function defaultDateRange(days = 30): { from: string; to: string } {
  const to = new Date();
  const from = new Date();
  from.setDate(from.getDate() - days);
  return {
    from: toIsoDate(from),
    to: toIsoDate(to),
  };
}

export function buildDoraQuery(request: DoraRequestContext): string {
  const params = new URLSearchParams();
  params.set("projectKey", request.projectKey.trim());
  if (request.from) params.set("from", request.from);
  if (request.to) params.set("to", request.to);
  return params.toString();
}

async function fetchEndpoint<T>(path: string): Promise<T> {
  const response = await fetch(path, { credentials: "include" });
  const text = await response.text();
  let payload: any = null;
  if (text) {
    try {
      payload = JSON.parse(text);
    } catch {
      payload = { message: text };
    }
  }

  if (!response.ok) {
    const message = payload?.error || payload?.message || response.statusText || "Request failed";
    throw new Error(`${response.status}: ${message}`);
  }

  return payload as T;
}

export async function fetchDoraMetricsSnapshot(request: DoraRequestContext): Promise<DoraMetricsSnapshot> {
  const query = buildDoraQuery(request);

  const calls: Array<[keyof DoraMetricsData, string]> = [
    ["deploymentFrequency", `/api/dora/deployment-frequency?${query}`],
    ["leadTime", `/api/dora/lead-time-epic?${query}`],
    ["changeFailureRate", `/api/dora/change-failure-rate?${query}`],
    ["mttr", `/api/dora/mean-time-to-restore?${query}`],
  ];

  const settled = await Promise.allSettled(
    calls.map(async ([key, path]) => ({ key, value: await fetchEndpoint(path) }))
  );

  const data: Partial<DoraMetricsData> = {};
  const errors: Partial<Record<keyof DoraMetricsData, string>> = {};

  settled.forEach((result, index) => {
    const key = calls[index][0];
    if (result.status === "fulfilled") {
      (data as any)[key] = result.value.value;
    } else {
      errors[key] = result.reason instanceof Error ? result.reason.message : "Unknown error";
    }
  });

  return {
    request,
    data,
    errors,
    hasPartialFailure: Object.keys(errors).length > 0,
    hasAnySuccess: Object.keys(data).length > 0,
    completedAt: new Date().toISOString(),
  };
}

export function buildDoraMetricViewModel(snapshot: DoraMetricsSnapshot): DoraMetricViewModel[] {
  const deployment = snapshot.data.deploymentFrequency;
  const leadTime = snapshot.data.leadTime;
  const cfr = snapshot.data.changeFailureRate;
  const mttr = snapshot.data.mttr;

  return [
    {
      id: "deploymentFrequency",
      title: "Deployment Frequency",
      value: deployment ? String(deployment.deploymentFrequency) : "-",
      subtitle: deployment ? "Deployments in selected range" : "No data",
      status: snapshot.errors.deploymentFrequency ? "error" : deployment ? "ok" : "empty",
      error: snapshot.errors.deploymentFrequency,
    },
    {
      id: "leadTime",
      title: "Lead Time for Changes",
      value: leadTime?.meanLeadTimeDays != null ? `${leadTime.meanLeadTimeDays.toFixed(2)} days` : "-",
      subtitle: leadTime ? "Mean lead time from selected epics" : "No data",
      status: snapshot.errors.leadTime ? "error" : leadTime ? "ok" : "empty",
      error: snapshot.errors.leadTime,
    },
    {
      id: "changeFailureRate",
      title: "Change Failure Rate",
      value:
        cfr?.dora.changeFailureRate != null
          ? `DORA ${cfr.dora.changeFailureRate.toFixed(2)}% · SEND ${cfr.send.changeFailureRate != null ? cfr.send.changeFailureRate.toFixed(2) : "-"}%`
          : "-",
      subtitle: cfr
        ? `Failed ${cfr.dora.failedDeployments}/${cfr.dora.totalDeployments} deployments`
        : "No data",
      status: snapshot.errors.changeFailureRate ? "error" : cfr ? "ok" : "empty",
      error: snapshot.errors.changeFailureRate,
    },
    {
      id: "mttr",
      title: "Mean Time to Restore",
      value: mttr?.mttrHours != null ? formatHoursAndDays(mttr.mttrHours) : "-",
      subtitle: mttr
        ? `Average resolution time · resolved incidents ${mttr.resolvedIncidents}/${mttr.totalIncidents}`
        : "No data",
      status: snapshot.errors.mttr ? "error" : mttr ? "ok" : "empty",
      error: snapshot.errors.mttr,
    },
  ];
}

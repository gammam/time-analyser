type MttrIssueInput = {
  key: string;
  summary: string | null;
  created: string | null;
  resolutionDate: string | null;
  issueType: string | null;
  status: string | null;
};

function toMillis(value: string | null): number | null {
  if (!value) return null;
  const parsed = new Date(value).getTime();
  return Number.isNaN(parsed) ? null : parsed;
}

function round2(value: number): number {
  return +value.toFixed(2);
}

function percentile(values: number[], p: number): number | null {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const rank = Math.ceil((p / 100) * sorted.length);
  return round2(sorted[Math.max(0, rank - 1)]);
}

export function aggregateMeanTimeToRestore(issues: MttrIssueInput[]) {
  const resolvedIssues: Array<{
    key: string;
    summary: string | null;
    created: string;
    resolutionDate: string;
    restoreHours: number;
    issueType: string | null;
    status: string | null;
  }> = [];

  const skippedIssues: Array<{
    key: string;
    summary: string | null;
    created: string | null;
    reason: string;
  }> = [];

  for (const issue of issues) {
    const createdMillis = toMillis(issue.created);
    const resolutionMillis = toMillis(issue.resolutionDate);

    if (createdMillis === null) {
      skippedIssues.push({
        key: issue.key,
        summary: issue.summary,
        created: issue.created,
        reason: 'Missing or invalid created',
      });
      continue;
    }

    if (resolutionMillis === null) {
      skippedIssues.push({
        key: issue.key,
        summary: issue.summary,
        created: issue.created,
        reason: 'Missing resolutiondate',
      });
      continue;
    }

    const deltaHours = (resolutionMillis - createdMillis) / (1000 * 60 * 60);
    if (deltaHours < 0) {
      skippedIssues.push({
        key: issue.key,
        summary: issue.summary,
        created: issue.created,
        reason: 'Resolution date is before created date',
      });
      continue;
    }

    resolvedIssues.push({
      key: issue.key,
      summary: issue.summary,
      created: issue.created!,
      resolutionDate: issue.resolutionDate!,
      restoreHours: round2(deltaHours),
      issueType: issue.issueType,
      status: issue.status,
    });
  }

  const restoreHoursValues = resolvedIssues.map((i) => i.restoreHours);
  const mttrHours =
    restoreHoursValues.length > 0
      ? round2(restoreHoursValues.reduce((acc, value) => acc + value, 0) / restoreHoursValues.length)
      : null;

  return {
    mttrHours,
    p50Hours: percentile(restoreHoursValues, 50),
    p90Hours: percentile(restoreHoursValues, 90),
    totalIncidents: issues.length,
    resolvedIncidents: resolvedIssues.length,
    unresolvedIncidents: skippedIssues.length,
    issues: resolvedIssues,
    skippedIssues,
  };
}

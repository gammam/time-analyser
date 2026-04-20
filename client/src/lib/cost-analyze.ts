export interface CostAnalyzeRequest {
  projectKey: string;
  from: string;
  to: string;
}

export interface WorklogEntry {
  user: string;
  hours: number;
}

export interface EpicCost {
  epicId: string;
  epicName: string;
  totalHours: number;
  worklogs: WorklogEntry[];
}

export interface CostAnalyzeReport {
  projectKey: string;
  from: string | null;
  to: string | null;
  epics: EpicCost[];
}

export function buildCostAnalyzeQuery(request: CostAnalyzeRequest): string {
  const params = new URLSearchParams();
  params.set('projectKey', request.projectKey);
  if (request.from) params.set('from', request.from);
  if (request.to) params.set('to', request.to);
  return params.toString();
}

export function validateCostAnalyzeRequest(request: Partial<CostAnalyzeRequest>): {
  isValid: boolean;
  errors: Partial<Record<keyof CostAnalyzeRequest, string>>;
} {
  const errors: Partial<Record<keyof CostAnalyzeRequest, string>> = {};

  if (!request.projectKey?.trim()) {
    errors.projectKey = 'Project key is required';
  }

  if (request.from && request.to) {
    const from = new Date(request.from);
    const to = new Date(request.to);
    if (!isNaN(from.getTime()) && !isNaN(to.getTime()) && from > to) {
      errors.from = '"From" date must be before "To" date';
    }
  }

  return { isValid: Object.keys(errors).length === 0, errors };
}

export async function fetchCostAnalyzeReport(request: CostAnalyzeRequest): Promise<CostAnalyzeReport> {
  const query = buildCostAnalyzeQuery(request);
  const res = await fetch(`/api/cost-analyze?${query}`);
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error((body as any).error || `Request failed with status ${res.status}`);
  }
  return res.json() as Promise<CostAnalyzeReport>;
}

export function defaultDateRange(daysPast = 30): { from: string; to: string } {
  const to = new Date();
  const from = new Date();
  from.setDate(to.getDate() - daysPast);
  const fmt = (d: Date) => d.toISOString().slice(0, 10);
  return { from: fmt(from), to: fmt(to) };
}

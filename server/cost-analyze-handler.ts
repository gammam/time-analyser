import type { Request, Response } from 'express';

type WorklogEntry = {
  user: string;
  hours: number;
};

type EpicCost = {
  epicId: string;
  epicName: string;
  totalHours: number;
  worklogs: WorklogEntry[];
};

type Deps = {
  fetchSendAnalysisWorklogs: (params: {
    userId: string;
    projectKey: string;
    timeRange: { from?: string; to?: string };
  }) => Promise<Array<{ epicId: string; epicName: string; worklogs: WorklogEntry[] }>>;
};

export function getJiraErrorStatus(err: any): number {
  if (err?.type === 'auth') return 401;
  if (err?.type === 'not_found') return 404;
  return 500;
}

export function createCostAnalyzeHandler(deps: Deps) {
  return async function costAnalyzeHandler(req: Request & any, res: Response & any) {
    try {
      const userId: string = req.user.claims.sub;
      const projectKey = typeof req.query.projectKey === 'string' ? req.query.projectKey : undefined;
      const from = typeof req.query.from === 'string' ? req.query.from : undefined;
      const to = typeof req.query.to === 'string' ? req.query.to : undefined;

      if (!projectKey) {
        return res.status(400).json({ error: 'projectKey is required' });
      }

      if (from) {
        const d = new Date(from);
        if (isNaN(d.getTime())) return res.status(400).json({ error: 'Invalid from date' });
      }
      if (to) {
        const d = new Date(to);
        if (isNaN(d.getTime())) return res.status(400).json({ error: 'Invalid to date' });
      }

      const raw = await deps.fetchSendAnalysisWorklogs({
        userId,
        projectKey,
        timeRange: { from, to },
      });

      const epics: EpicCost[] = raw.map((item) => ({
        epicId: item.epicId,
        epicName: item.epicName,
        totalHours: item.worklogs.reduce((sum, wl) => sum + wl.hours, 0),
        worklogs: item.worklogs,
      }));

      return res.json({ projectKey, from: from ?? null, to: to ?? null, epics });
    } catch (err: any) {
      const status = getJiraErrorStatus(err);
      const message =
        status === 401
          ? 'Jira authentication failed'
          : err?.message || 'Internal server error';
      return res.status(status).json({ error: message });
    }
  };
}

import type { Request, Response } from 'express';
import { aggregateMeanTimeToRestore } from './mean-time-to-restore';
import { getJiraErrorStatus } from './change-failure-rate-handler';

type JiraDeps = {
  fetchSendProdBugsForMttr: (
    userId: string,
    projectKey: string,
    team?: string,
    from?: string,
    to?: string,
  ) => Promise<any[]>;
};

export function createMeanTimeToRestoreHandler(deps: JiraDeps) {
  return async function meanTimeToRestoreHandler(req: Request & any, res: Response & any) {
    try {
      const userId = req.user.claims.sub;
      const projectKey = typeof req.query.projectKey === 'string' ? req.query.projectKey : undefined;
      const team = typeof req.query.team === 'string' ? req.query.team : undefined;
      const from = typeof req.query.from === 'string' ? req.query.from : undefined;
      const to = typeof req.query.to === 'string' ? req.query.to : undefined;

      if (!projectKey) {
        return res.status(400).json({ error: 'Missing or invalid projectKey' });
      }

      let fromDate: Date | undefined;
      let toDate: Date | undefined;
      if (from) {
        const d = new Date(from);
        if (isNaN(d.getTime())) return res.status(400).json({ error: 'Invalid from date' });
        fromDate = d;
      }
      if (to) {
        const d = new Date(to);
        if (isNaN(d.getTime())) return res.status(400).json({ error: 'Invalid to date' });
        toDate = d;
      }

      const jiraIssues = await deps.fetchSendProdBugsForMttr(userId, projectKey, team, from, to);
      const aggregated = aggregateMeanTimeToRestore(jiraIssues);

      return res.json({
        team: team || null,
        projectKey,
        from: fromDate ? fromDate.toISOString().slice(0, 10) : null,
        to: toDate ? toDate.toISOString().slice(0, 10) : null,
        mttrHours: aggregated.mttrHours,
        p50Hours: aggregated.p50Hours,
        p90Hours: aggregated.p90Hours,
        totalIncidents: aggregated.totalIncidents,
        resolvedIncidents: aggregated.resolvedIncidents,
        unresolvedIncidents: aggregated.unresolvedIncidents,
        issues: aggregated.issues,
        skippedIssues: aggregated.skippedIssues,
      });
    } catch (err: any) {
      if (err && err.type && err.message) {
        return res.status(getJiraErrorStatus(err)).json({
          error: err.message,
          type: err.type,
          details: err.details,
        });
      }
      return res.status(500).json({ error: err?.message || 'Failed to fetch mean time to restore' });
    }
  };
}

import type { Request, Response } from 'express';
import { aggregateChangeFailureRate } from './change-failure-rate-aggregation';

type JiraDeps = {
  fetchProjectVersionsRaw: (userId: string, projectKey: string) => Promise<any>;
  fetchProductionBugsForReleases: (
    userId: string,
    projectKey: string,
    releaseNames: string[],
    team?: string,
    from?: string,
    to?: string,
  ) => Promise<any[]>;
};

export function getJiraErrorStatus(err: any): number {
  if (err?.type === 'auth') return 401;
  if (err?.type === 'not_found') return 404;
  return 500;
}

export function createChangeFailureRateHandler(deps: JiraDeps) {
  return async function changeFailureRateHandler(req: Request & any, res: Response & any) {
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

      const versions = await deps.fetchProjectVersionsRaw(userId, projectKey);
      const versionList = Array.isArray(versions)
        ? versions
        : (Array.isArray((versions as any)?.values) ? (versions as any).values : []);

      const filteredReleases = versionList.filter((v: any) => {
        if (!v?.released || !v?.releaseDate) return false;
        const relDate = new Date(v.releaseDate);
        if (isNaN(relDate.getTime())) return false;
        if (fromDate && relDate < fromDate) return false;
        if (toDate && relDate > toDate) return false;
        return true;
      });

      const releaseNames = filteredReleases
        .map((v: any) => v?.name)
        .filter((name: any) => typeof name === 'string' && name.length > 0);

      const productionBugs = await deps.fetchProductionBugsForReleases(
        userId,
        projectKey,
        releaseNames,
        team,
        from,
        to,
      );

      const aggregated = aggregateChangeFailureRate(
        filteredReleases.map((release: any) => ({
          id: String(release.id),
          name: String(release.name || ''),
          releaseDate: String(release.releaseDate || ''),
        })),
        productionBugs,
      );

      return res.json({
        team: team || null,
        projectKey,
        from: fromDate ? fromDate.toISOString().slice(0, 10) : null,
        to: toDate ? toDate.toISOString().slice(0, 10) : null,
        dora: aggregated.dora,
        send: aggregated.send,
        releases: aggregated.releases,
        unmappedFailures: aggregated.unmappedFailures,
      });
    } catch (err: any) {
      if (err && err.type && err.message) {
        return res.status(getJiraErrorStatus(err)).json({
          error: err.message,
          type: err.type,
          details: err.details,
        });
      }
      return res.status(500).json({ error: err?.message || 'Failed to fetch change failure rate' });
    }
  };
}

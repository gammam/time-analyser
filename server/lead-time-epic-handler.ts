import type { Request, Response } from 'express';

type JiraDeps = {
  fetchEpicsWithChangelog: (
    userId: string,
    projectKey: string,
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

export function createLeadTimeEpicHandler(deps: JiraDeps) {
  return async function leadTimeEpicHandler(req: Request & any, res: Response & any) {
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

      const epics = await deps.fetchEpicsWithChangelog(userId, projectKey, team, from, to);

      let sumLeadTime = 0;
      let countLeadTime = 0;
      let sumLeadTimeReadyForUAT = 0;
      let countLeadTimeReadyForUAT = 0;
      const outputEpics: any[] = [];
      const skippedEpics: any[] = [];

      for (const e of epics) {
        const created = e?.fields?.created ? new Date(e.fields.created) : null;
        const releaseDate = e?.fields?.fixVersions?.[0]?.releaseDate
          ? new Date(e.fields.fixVersions[0].releaseDate)
          : null;

        let readyForUATDate: Date | null = null;
        if (e?.changelog && Array.isArray(e.changelog.histories)) {
          for (const h of e.changelog.histories) {
            for (const item of h.items || []) {
              if (item.field === 'status' && item.toString === 'READY_FOR_UAT') {
                readyForUATDate = new Date(h.created);
                break;
              }
            }
            if (readyForUATDate) break;
          }
        }

        let leadTimeDays: number | null = null;
        if (created && releaseDate && !isNaN(created.getTime()) && !isNaN(releaseDate.getTime())) {
          leadTimeDays = Math.round((releaseDate.getTime() - created.getTime()) / (1000 * 60 * 60 * 24));
          sumLeadTime += leadTimeDays;
          countLeadTime++;
        }

        let leadTimeReadyForUAT: number | null = null;
        if (created && readyForUATDate && !isNaN(created.getTime()) && !isNaN(readyForUATDate.getTime())) {
          leadTimeReadyForUAT = Math.round(
            (readyForUATDate.getTime() - created.getTime()) / (1000 * 60 * 60 * 24),
          );
          sumLeadTimeReadyForUAT += leadTimeReadyForUAT;
          countLeadTimeReadyForUAT++;
        }

        if (!leadTimeDays && !leadTimeReadyForUAT) {
          skippedEpics.push({
            key: e?.key || null,
            summary: e?.fields?.summary || null,
            created: created?.toISOString().slice(0, 10) || null,
            fixVersions: e?.fields?.fixVersions || [],
            releaseDate: releaseDate ? releaseDate.toISOString().slice(0, 10) : null,
            readyForUATDate: readyForUATDate ? readyForUATDate.toISOString().slice(0, 10) : null,
            reason: 'Mancano releaseDate e transizione READY_FOR_UAT',
          });
        } else {
          outputEpics.push({
            key: e?.key || null,
            summary: e?.fields?.summary || null,
            created: created?.toISOString().slice(0, 10) || null,
            fixVersions: e?.fields?.fixVersions || [],
            releaseDate: releaseDate ? releaseDate.toISOString().slice(0, 10) : null,
            readyForUATDate: readyForUATDate ? readyForUATDate.toISOString().slice(0, 10) : null,
            leadTimeDays,
            leadTimeReadyForUAT,
          });
        }
      }

      return res.json({
        team: team || null,
        projectKey,
        from: fromDate ? fromDate.toISOString().slice(0, 10) : null,
        to: toDate ? toDate.toISOString().slice(0, 10) : null,
        meanLeadTimeDays: countLeadTime > 0 ? +(sumLeadTime / countLeadTime).toFixed(2) : null,
        meanLeadTimeReadyForUAT:
          countLeadTimeReadyForUAT > 0
            ? +(sumLeadTimeReadyForUAT / countLeadTimeReadyForUAT).toFixed(2)
            : null,
        epics: outputEpics,
        skippedEpics,
      });
    } catch (err: any) {
      if (err && err.type && err.message) {
        return res.status(getJiraErrorStatus(err)).json({
          error: err.message,
          type: err.type,
          details: err.details,
        });
      }
      return res.status(500).json({ error: err?.message || 'Failed to fetch lead time for epics' });
    }
  };
}

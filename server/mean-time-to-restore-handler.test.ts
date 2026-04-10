import { createMeanTimeToRestoreHandler } from './mean-time-to-restore-handler';

describe('mean time to restore handler', () => {
  function makeRes() {
    const res: any = {
      statusCode: 200,
      body: undefined,
      status(code: number) {
        this.statusCode = code;
        return this;
      },
      json(payload: any) {
        this.body = payload;
        return this;
      },
    };
    return res;
  }

  function makeReq(query: Record<string, string | undefined>) {
    return {
      user: { claims: { sub: 'user-1' } },
      query,
    } as any;
  }

  it('returns 400 when projectKey is missing', async () => {
    const handler = createMeanTimeToRestoreHandler({
      fetchSendProdBugsForMttr: async () => [],
    });

    const req = makeReq({});
    const res = makeRes();
    await handler(req, res);

    expect(res.statusCode).toBe(400);
    expect(res.body.error).toMatch(/projectKey/i);
  });

  it('returns 400 for invalid from date', async () => {
    const handler = createMeanTimeToRestoreHandler({
      fetchSendProdBugsForMttr: async () => [],
    });

    const req = makeReq({ projectKey: 'PN', from: 'bad-date' });
    const res = makeRes();
    await handler(req, res);

    expect(res.statusCode).toBe(400);
    expect(res.body.error).toMatch(/invalid from date/i);
  });

  it('returns MTTR payload with resolved and skipped issues', async () => {
    const handler = createMeanTimeToRestoreHandler({
      fetchSendProdBugsForMttr: async () => [
        {
          key: 'PN-1',
          summary: 'Bug 1',
          created: '2026-03-01T00:00:00.000Z',
          resolutionDate: '2026-03-01T12:00:00.000Z',
          issueType: '[SEND] Bug Prod',
          status: 'Done',
        },
        {
          key: 'PN-2',
          summary: 'Bug 2',
          created: '2026-03-01T00:00:00.000Z',
          resolutionDate: null,
          issueType: '[SEND] Bug Prod',
          status: 'To Do',
        },
      ],
    });

    const req = makeReq({ projectKey: 'PN', from: '2026-03-01', to: '2026-03-31' });
    const res = makeRes();
    await handler(req, res);

    expect(res.statusCode).toBe(200);
    expect(res.body.projectKey).toBe('PN');
    expect(res.body.mttrHours).toBe(12);
    expect(res.body.p50Hours).toBe(12);
    expect(res.body.p90Hours).toBe(12);
    expect(res.body.totalIncidents).toBe(2);
    expect(res.body.resolvedIncidents).toBe(1);
    expect(res.body.unresolvedIncidents).toBe(1);
    expect(res.body.issues).toHaveLength(1);
    expect(res.body.skippedIssues).toHaveLength(1);
  });

  it('returns mttrHours null when no resolved incidents', async () => {
    const handler = createMeanTimeToRestoreHandler({
      fetchSendProdBugsForMttr: async () => [
        {
          key: 'PN-2',
          summary: 'Bug 2',
          created: '2026-03-01T00:00:00.000Z',
          resolutionDate: null,
          issueType: '[SEND] Bug Prod',
          status: 'To Do',
        },
      ],
    });

    const req = makeReq({ projectKey: 'PN' });
    const res = makeRes();
    await handler(req, res);

    expect(res.statusCode).toBe(200);
    expect(res.body.mttrHours).toBeNull();
    expect(res.body.p50Hours).toBeNull();
    expect(res.body.p90Hours).toBeNull();
  });

  it('propagates Jira auth errors as 401', async () => {
    const handler = createMeanTimeToRestoreHandler({
      fetchSendProdBugsForMttr: async () => {
        throw { type: 'auth', message: 'Auth failed', details: { code: '401' } };
      },
    });

    const req = makeReq({ projectKey: 'PN' });
    const res = makeRes();
    await handler(req, res);

    expect(res.statusCode).toBe(401);
    expect(res.body.type).toBe('auth');
  });

  it('propagates Jira not_found errors as 404', async () => {
    const handler = createMeanTimeToRestoreHandler({
      fetchSendProdBugsForMttr: async () => {
        throw { type: 'not_found', message: 'Project not found', details: { code: '404' } };
      },
    });

    const req = makeReq({ projectKey: 'PN' });
    const res = makeRes();
    await handler(req, res);

    expect(res.statusCode).toBe(404);
    expect(res.body.type).toBe('not_found');
  });

  it('propagates Jira unknown errors as 500', async () => {
    const handler = createMeanTimeToRestoreHandler({
      fetchSendProdBugsForMttr: async () => {
        throw { type: 'unknown', message: 'Unknown Jira error', details: { code: '500' } };
      },
    });

    const req = makeReq({ projectKey: 'PN' });
    const res = makeRes();
    await handler(req, res);

    expect(res.statusCode).toBe(500);
    expect(res.body.type).toBe('unknown');
  });
});

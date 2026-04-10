import { createChangeFailureRateHandler, getJiraErrorStatus } from './change-failure-rate-handler';

describe('change failure rate handler', () => {
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
    const handler = createChangeFailureRateHandler({
      fetchProjectVersionsRaw: async () => ({ values: [] }),
      fetchProductionBugsForReleases: async () => [],
    });

    const req = makeReq({});
    const res = makeRes();
    await handler(req, res);

    expect(res.statusCode).toBe(400);
    expect(res.body.error).toMatch(/projectKey/i);
  });

  it('returns 400 for invalid from date', async () => {
    const handler = createChangeFailureRateHandler({
      fetchProjectVersionsRaw: async () => ({ values: [] }),
      fetchProductionBugsForReleases: async () => [],
    });

    const req = makeReq({ projectKey: 'PROJ', from: 'bad-date' });
    const res = makeRes();
    await handler(req, res);

    expect(res.statusCode).toBe(400);
    expect(res.body.error).toMatch(/Invalid from date/i);
  });

  it('computes route payload for mixed releases and bugs', async () => {
    const handler = createChangeFailureRateHandler({
      fetchProjectVersionsRaw: async () => ({
        values: [
          { id: '1', name: 'GA.1.0.0', released: true, releaseDate: '2026-03-01' },
          { id: '2', name: '1.0.1', released: true, releaseDate: '2026-03-02' },
          { id: '3', name: 'draft', released: false, releaseDate: '2026-03-03' },
        ],
      }),
      fetchProductionBugsForReleases: async () => [
        {
          key: 'PROJ-1',
          summary: 'bug1',
          created: '2026-03-03',
          issueType: '[SEND] Bug Prod',
          releaseNames: ['GA.1.0.0'],
        },
        {
          key: 'PROJ-2',
          summary: 'bug2',
          created: '2026-03-04',
          issueType: '[SEND] Bug Prod',
          releaseNames: ['UNKNOWN'],
        },
      ],
    });

    const req = makeReq({ projectKey: 'PROJ', from: '2026-03-01', to: '2026-03-31' });
    const res = makeRes();
    await handler(req, res);

    expect(res.statusCode).toBe(200);
    expect(res.body.dora.totalDeployments).toBe(2);
    expect(res.body.dora.failedDeployments).toBe(1);
    expect(res.body.send.totalDeployments).toBe(1);
    expect(res.body.send.failedDeployments).toBe(1);
    expect(res.body.unmappedFailures).toHaveLength(1);
  });

  it('propagates Jira auth errors as 401', async () => {
    const handler = createChangeFailureRateHandler({
      fetchProjectVersionsRaw: async () => {
        throw { type: 'auth', message: 'Auth failed', details: { code: '401' } };
      },
      fetchProductionBugsForReleases: async () => [],
    });

    const req = makeReq({ projectKey: 'PROJ' });
    const res = makeRes();
    await handler(req, res);

    expect(res.statusCode).toBe(401);
    expect(res.body.type).toBe('auth');
  });

  it('propagates Jira not_found errors as 404', async () => {
    const handler = createChangeFailureRateHandler({
      fetchProjectVersionsRaw: async () => ({ values: [] }),
      fetchProductionBugsForReleases: async () => {
        throw { type: 'not_found', message: 'Project not found', details: { code: '404' } };
      },
    });

    const req = makeReq({ projectKey: 'PROJ' });
    const res = makeRes();
    await handler(req, res);

    expect(res.statusCode).toBe(404);
    expect(res.body.type).toBe('not_found');
  });

  it('propagates Jira unknown errors as 500', async () => {
    const handler = createChangeFailureRateHandler({
      fetchProjectVersionsRaw: async () => ({ values: [] }),
      fetchProductionBugsForReleases: async () => {
        throw { type: 'unknown', message: 'Unknown Jira error', details: { code: '500' } };
      },
    });

    const req = makeReq({ projectKey: 'PROJ' });
    const res = makeRes();
    await handler(req, res);

    expect(res.statusCode).toBe(500);
    expect(res.body.type).toBe('unknown');
  });
});

describe('getJiraErrorStatus', () => {
  it('maps auth to 401', () => {
    expect(getJiraErrorStatus({ type: 'auth' })).toBe(401);
  });

  it('maps not_found to 404', () => {
    expect(getJiraErrorStatus({ type: 'not_found' })).toBe(404);
  });

  it('maps others to 500', () => {
    expect(getJiraErrorStatus({ type: 'unknown' })).toBe(500);
    expect(getJiraErrorStatus({})).toBe(500);
  });
});

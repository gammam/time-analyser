import { createLeadTimeEpicHandler, getJiraErrorStatus } from './lead-time-epic-handler';

describe('lead time epic handler', () => {
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
    const handler = createLeadTimeEpicHandler({
      fetchEpicsWithChangelog: async () => [],
    });

    const req = makeReq({});
    const res = makeRes();
    await handler(req, res);

    expect(res.statusCode).toBe(400);
    expect(res.body.error).toMatch(/projectKey/i);
  });

  it('returns 400 for invalid from date', async () => {
    const handler = createLeadTimeEpicHandler({
      fetchEpicsWithChangelog: async () => [],
    });

    const req = makeReq({ projectKey: 'PN', from: 'bad-date' });
    const res = makeRes();
    await handler(req, res);

    expect(res.statusCode).toBe(400);
    expect(res.body.error).toMatch(/invalid from date/i);
  });

  it('computes means and skips epics with no release and no READY_FOR_UAT transition', async () => {
    const handler = createLeadTimeEpicHandler({
      fetchEpicsWithChangelog: async () => [
        {
          key: 'EPIC-1',
          fields: {
            summary: 'Epic released',
            created: '2026-03-01T00:00:00.000Z',
            fixVersions: [{ releaseDate: '2026-03-11' }],
          },
          changelog: { histories: [] },
        },
        {
          key: 'EPIC-2',
          fields: {
            summary: 'Epic ready for uat',
            created: '2026-03-01T00:00:00.000Z',
            fixVersions: [],
          },
          changelog: {
            histories: [
              {
                created: '2026-03-06T00:00:00.000Z',
                items: [{ field: 'status', toString: 'READY_FOR_UAT' }],
              },
            ],
          },
        },
        {
          key: 'EPIC-3',
          fields: {
            summary: 'Incomplete epic',
            created: '2026-03-03T00:00:00.000Z',
            fixVersions: [],
          },
          changelog: { histories: [] },
        },
      ],
    });

    const req = makeReq({ projectKey: 'PN', from: '2026-03-01', to: '2026-03-31' });
    const res = makeRes();
    await handler(req, res);

    expect(res.statusCode).toBe(200);
    expect(res.body.meanLeadTimeDays).toBe(10);
    expect(res.body.meanLeadTimeReadyForUAT).toBe(5);
    expect(res.body.epics).toHaveLength(2);
    expect(res.body.skippedEpics).toHaveLength(1);
    expect(res.body.skippedEpics[0].key).toBe('EPIC-3');
  });

  it('returns null means when no calculable epics exist', async () => {
    const handler = createLeadTimeEpicHandler({
      fetchEpicsWithChangelog: async () => [
        {
          key: 'EPIC-3',
          fields: {
            summary: 'Incomplete epic',
            created: '2026-03-03T00:00:00.000Z',
            fixVersions: [],
          },
          changelog: { histories: [] },
        },
      ],
    });

    const req = makeReq({ projectKey: 'PN' });
    const res = makeRes();
    await handler(req, res);

    expect(res.statusCode).toBe(200);
    expect(res.body.meanLeadTimeDays).toBeNull();
    expect(res.body.meanLeadTimeReadyForUAT).toBeNull();
    expect(res.body.skippedEpics).toHaveLength(1);
  });

  it('propagates Jira auth errors as 401', async () => {
    const handler = createLeadTimeEpicHandler({
      fetchEpicsWithChangelog: async () => {
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
    const handler = createLeadTimeEpicHandler({
      fetchEpicsWithChangelog: async () => {
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
    const handler = createLeadTimeEpicHandler({
      fetchEpicsWithChangelog: async () => {
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

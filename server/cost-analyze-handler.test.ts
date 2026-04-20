import { createCostAnalyzeHandler } from './cost-analyze-handler';

describe('cost-analyze handler', () => {
  function makeRes() {
    const res: any = { statusCode: 200, body: undefined };
    res.status = (code: number) => { res.statusCode = code; return res; };
    res.json = (body: any) => { res.body = body; return res; };
    return res;
  }

  function makeReq(query: Record<string, string | undefined>) {
    return { query, user: { claims: { sub: 'user-1' } } } as any;
  }

  const mockWorklogs = [
    {
      epicId: 'EPC-1',
      epicName: 'Epic One',
      worklogs: [
        { user: 'Alice', hours: 8 },
        { user: 'Bob', hours: 5 },
      ],
    },
    {
      epicId: 'EPC-2',
      epicName: 'Epic With No Costs',
      worklogs: [],
    },
  ];

  it('returns 400 when projectKey is missing', async () => {
    const handler = createCostAnalyzeHandler({
      fetchSendAnalysisWorklogs: async () => [],
    });

    const req = makeReq({});
    const res = makeRes();
    await handler(req, res);

    expect(res.statusCode).toBe(400);
    expect(res.body.error).toMatch(/projectKey/i);
  });

  it('returns 400 for invalid from date', async () => {
    const handler = createCostAnalyzeHandler({
      fetchSendAnalysisWorklogs: async () => [],
    });

    const req = makeReq({ projectKey: 'PN', from: 'not-a-date' });
    const res = makeRes();
    await handler(req, res);

    expect(res.statusCode).toBe(400);
    expect(res.body.error).toMatch(/from/i);
  });

  it('returns 400 for invalid to date', async () => {
    const handler = createCostAnalyzeHandler({
      fetchSendAnalysisWorklogs: async () => [],
    });

    const req = makeReq({ projectKey: 'PN', to: 'not-a-date' });
    const res = makeRes();
    await handler(req, res);

    expect(res.statusCode).toBe(400);
    expect(res.body.error).toMatch(/to/i);
  });

  it('returns 200 with correct aggregated shape including epics with zero worklogs', async () => {
    const handler = createCostAnalyzeHandler({
      fetchSendAnalysisWorklogs: async () => mockWorklogs,
    });

    const req = makeReq({ projectKey: 'PN', from: '2026-04-01', to: '2026-04-20' });
    const res = makeRes();
    await handler(req, res);

    expect(res.statusCode).toBe(200);
    expect(res.body.projectKey).toBe('PN');
    expect(Array.isArray(res.body.epics)).toBe(true);
    expect(res.body.epics).toHaveLength(2);

    const epc1 = res.body.epics.find((e: any) => e.epicId === 'EPC-1');
    expect(epc1.totalHours).toBe(13);
    expect(epc1.worklogs).toHaveLength(2);

    const epc2 = res.body.epics.find((e: any) => e.epicId === 'EPC-2');
    expect(epc2.totalHours).toBe(0);
    expect(epc2.worklogs).toHaveLength(0);
  });

  it('propagates Jira auth errors as 401', async () => {
    const handler = createCostAnalyzeHandler({
      fetchSendAnalysisWorklogs: async () => {
        throw { type: 'auth', message: 'Auth failed' };
      },
    });

    const req = makeReq({ projectKey: 'PN' });
    const res = makeRes();
    await handler(req, res);

    expect(res.statusCode).toBe(401);
    expect(res.body.error).toMatch(/authentication/i);
  });

  it('propagates unknown errors as 500', async () => {
    const handler = createCostAnalyzeHandler({
      fetchSendAnalysisWorklogs: async () => {
        throw new Error('Something went wrong');
      },
    });

    const req = makeReq({ projectKey: 'PN' });
    const res = makeRes();
    await handler(req, res);

    expect(res.statusCode).toBe(500);
  });
});

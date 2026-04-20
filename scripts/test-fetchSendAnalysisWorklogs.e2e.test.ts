// test-fetchSendAnalysisWorklogs.e2e.test.ts
// E2E test for Jira SEND Analysis Ticket worklog extraction

import 'dotenv/config';
import { fetchSendAnalysisWorklogs } from '../server/jira-client';

describe('E2E: fetchSendAnalysisWorklogs', () => {
  it('should extract worklog data for SEND Analysis Tickets linked to Epics', async () => {
    const userId = process.env.LOCAL_USER_ID || 'local-dev-user';
    const epics = [
      // Replace with real Epic keys and names from your Jira instance
      { id: 'EPC-REAL-1', key: 'EPC-REAL-1', name: 'Epic Real One' },
      { id: 'EPC-REAL-2', key: 'EPC-REAL-2', name: 'Epic Real Two' },
    ];
    const timeRange = { from: '2026-04-01', to: '2026-04-20' };

    const result = await fetchSendAnalysisWorklogs({ userId, epics, timeRange });
    console.log('SEND Analysis Worklogs:', JSON.stringify(result, null, 2));
    expect(Array.isArray(result)).toBe(true);
    // Optionally, add more assertions based on your real data
  });

  it('should handle epics with no SEND Analysis Tickets gracefully', async () => {
    const userId = process.env.TEST_USER_ID || 'local-dev-user';
    const epics = [
      // Replace with a real Epic key that has no SEND Analysis Tickets
      { id: 'EPC-REAL-3', key: 'EPC-REAL-3', name: 'Epic Real Three' },
    ];
    const timeRange = { from: '2026-04-01', to: '2026-04-20' };

    const result = await fetchSendAnalysisWorklogs({ userId, epics, timeRange });
    console.log('SEND Analysis Worklogs (no tickets):', JSON.stringify(result, null, 2));
    expect(Array.isArray(result)).toBe(true);
    expect(result[0]?.worklogs).toBeDefined();
  });

});

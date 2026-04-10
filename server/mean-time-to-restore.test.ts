import { aggregateMeanTimeToRestore } from './mean-time-to-restore';

describe('aggregateMeanTimeToRestore', () => {
  it('computes restore hours, mttr and percentiles', () => {
    const result = aggregateMeanTimeToRestore([
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
        resolutionDate: '2026-03-02T12:00:00.000Z',
        issueType: '[SEND] Bug Prod',
        status: 'Done',
      },
      {
        key: 'PN-3',
        summary: 'Bug 3',
        created: '2026-03-01T00:00:00.000Z',
        resolutionDate: null,
        issueType: '[SEND] Bug Prod',
        status: 'To Do',
      },
    ]);

    expect(result.totalIncidents).toBe(3);
    expect(result.resolvedIncidents).toBe(2);
    expect(result.unresolvedIncidents).toBe(1);
    expect(result.mttrHours).toBe(24);
    expect(result.p50Hours).toBe(12);
    expect(result.p90Hours).toBe(36);
    expect(result.issues).toHaveLength(2);
    expect(result.skippedIssues).toHaveLength(1);
    expect(result.skippedIssues[0].reason).toMatch(/resolutiondate/i);
  });

  it('returns null metrics when no resolved incidents exist', () => {
    const result = aggregateMeanTimeToRestore([
      {
        key: 'PN-4',
        summary: 'Open bug',
        created: '2026-03-01T00:00:00.000Z',
        resolutionDate: null,
        issueType: '[SEND] Bug Prod',
        status: 'To Do',
      },
    ]);

    expect(result.mttrHours).toBeNull();
    expect(result.p50Hours).toBeNull();
    expect(result.p90Hours).toBeNull();
    expect(result.resolvedIncidents).toBe(0);
    expect(result.unresolvedIncidents).toBe(1);
  });

  it('skips invalid chronology where resolution is before creation', () => {
    const result = aggregateMeanTimeToRestore([
      {
        key: 'PN-5',
        summary: 'Invalid chronology',
        created: '2026-03-02T00:00:00.000Z',
        resolutionDate: '2026-03-01T00:00:00.000Z',
        issueType: '[SEND] Bug Prod',
        status: 'Done',
      },
    ]);

    expect(result.mttrHours).toBeNull();
    expect(result.skippedIssues).toHaveLength(1);
    expect(result.skippedIssues[0].reason).toMatch(/before created/i);
  });
});

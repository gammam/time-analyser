import { aggregateChangeFailureRate, isGaRelease, isHotfixRelease } from './change-failure-rate-aggregation';

describe('change failure rate aggregation', () => {
  it('detects GA and HOTFIX names with dedicated flags', () => {
    expect(isGaRelease('GA.1.4.0')).toBe(true);
    expect(isGaRelease('ga-1.4.1')).toBe(true);
    expect(isGaRelease('HOTFIX-1.4.1')).toBe(false);

    expect(isHotfixRelease('release-HOTFIX-123')).toBe(true);
    expect(isHotfixRelease('hotfix-1.4.1')).toBe(true);
    expect(isHotfixRelease('GA.1.4.0')).toBe(false);
  });

  it('computes DORA and SEND metrics correctly with mixed releases (AC 7)', () => {
    const releases = [
      { id: '10010', name: 'GA.1.4.0', releaseDate: '2026-03-05' },
      { id: '10011', name: '1.4.1', releaseDate: '2026-03-20' },
      { id: '10012', name: 'HOTFIX-1.4.1', releaseDate: '2026-03-25' },
      { id: '10013', name: '1.4.2', releaseDate: '2026-03-28' },
    ];

    const bugs = [
      {
        key: 'PROJ-101',
        summary: 'prod bug 1',
        created: '2026-03-06',
        issueType: '[SEND] Bug Prod',
        releaseNames: ['GA.1.4.0'],
      },
      {
        key: 'PROJ-102',
        summary: 'prod bug 2',
        created: '2026-03-21',
        issueType: '[SEND] Bug Prod',
        releaseNames: ['1.4.1'],
      },
      {
        key: 'PROJ-103',
        summary: 'prod bug 3',
        created: '2026-03-26',
        issueType: '[SEND] Bug Prod',
        releaseNames: ['HOTFIX-1.4.1'],
      },
    ];

    const result = aggregateChangeFailureRate(releases, bugs);

    expect(result.dora.totalDeployments).toBe(4);
    expect(result.dora.failedDeployments).toBe(3);
    expect(result.dora.changeFailureRate).toBe(75);

    expect(result.send.totalDeployments).toBe(2);
    expect(result.send.failedDeployments).toBe(2);
    expect(result.send.changeFailureRate).toBe(100);
    expect(result.send.hotfixReleases).toBe(1);
  });

  it('counts one failed deployment once even with multiple bugs (AC 7)', () => {
    const releases = [{ id: '10010', name: 'GA.1.4.0', releaseDate: '2026-03-05' }];
    const bugs = [
      {
        key: 'PROJ-201',
        summary: 'prod bug A',
        created: '2026-03-06',
        issueType: '[SEND] Bug Prod',
        releaseNames: ['GA.1.4.0'],
      },
      {
        key: 'PROJ-202',
        summary: 'prod bug B',
        created: '2026-03-07',
        issueType: '[SEND] Bug Prod',
        releaseNames: ['GA.1.4.0'],
      },
    ];

    const result = aggregateChangeFailureRate(releases, bugs);

    expect(result.releases[0].failureCount).toBe(2);
    expect(result.releases[0].isGaRelease).toBe(true);
    expect(result.releases[0].isHotfixRelease).toBe(false);
    expect(result.dora.failedDeployments).toBe(1);
    expect(result.send.failedDeployments).toBe(1);
    expect(result.send.changeFailureRate).toBe(100);
    expect(result.send.hotfixReleases).toBe(0);
  });

  it('returns null rates when total deployments are zero (AC 8)', () => {
    const result = aggregateChangeFailureRate([], []);

    expect(result.dora.totalDeployments).toBe(0);
    expect(result.dora.changeFailureRate).toBeNull();
    expect(result.send.totalDeployments).toBe(0);
    expect(result.send.changeFailureRate).toBeNull();
  });

  it('returns zero failed deployments when there are releases but no failures', () => {
    const releases = [
      { id: '10010', name: 'GA.1.4.0', releaseDate: '2026-03-05' },
      { id: '10011', name: '1.4.1', releaseDate: '2026-03-20' },
    ];

    const result = aggregateChangeFailureRate(releases, []);

    expect(result.dora.totalDeployments).toBe(2);
    expect(result.dora.failedDeployments).toBe(0);
    expect(result.dora.changeFailureRate).toBe(0);
    expect(result.send.totalDeployments).toBe(1);
    expect(result.send.failedDeployments).toBe(0);
    expect(result.send.changeFailureRate).toBe(0);
    expect(result.send.hotfixReleases).toBe(0);
  });

  it('collects unmapped failures separately (AC 10)', () => {
    const releases = [{ id: '10010', name: 'GA.1.4.0', releaseDate: '2026-03-05' }];
    const bugs = [
      {
        key: 'PROJ-301',
        summary: 'no mapping',
        created: '2026-03-08',
        issueType: '[SEND] Bug Prod',
        releaseNames: ['UNKNOWN'],
      },
    ];

    const result = aggregateChangeFailureRate(releases, bugs);

    expect(result.unmappedFailures).toHaveLength(1);
    expect(result.unmappedFailures[0].key).toBe('PROJ-301');
    expect(result.dora.failedDeployments).toBe(0);
    expect(result.send.failedDeployments).toBe(0);
    expect(result.send.hotfixReleases).toBe(0);
  });
});

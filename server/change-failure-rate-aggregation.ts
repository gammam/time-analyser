type ReleaseInput = {
  id: string;
  name: string;
  releaseDate: string;
};

type ProductionBugInput = {
  key: string;
  summary: string | null;
  created: string | null;
  issueType: string | null;
  releaseNames: string[];
};

export function isGaOrHotfixRelease(name: string): boolean {
  return /^ga/i.test(name) || /hotfix/i.test(name);
}

export function aggregateChangeFailureRate(
  releasesInput: ReleaseInput[],
  productionBugs: ProductionBugInput[],
) {
  const releaseIndex = new Map<string, any>();
  for (const release of releasesInput) {
    releaseIndex.set(release.name, {
      id: release.id,
      name: release.name,
      releaseDate: release.releaseDate,
      isGaOrHotfix: isGaOrHotfixRelease(release.name || ''),
      failureCount: 0,
      failureIssues: [],
    });
  }

  const unmappedFailures: any[] = [];
  for (const bug of productionBugs) {
    let mapped = false;
    for (const releaseName of bug.releaseNames || []) {
      const release = releaseIndex.get(releaseName);
      if (!release) continue;
      mapped = true;
      release.failureIssues.push({
        key: bug.key,
        issueType: bug.issueType,
        created: bug.created,
      });
    }

    if (!mapped) {
      unmappedFailures.push({
        key: bug.key,
        summary: bug.summary,
        created: bug.created,
        reason: 'No Affects Version/s value found',
      });
    }
  }

  const releases = Array.from(releaseIndex.values()).map((release: any) => ({
    ...release,
    failureCount: release.failureIssues.length,
  }));

  const doraTotal = releases.length;
  const doraFailed = releases.filter((r: any) => r.failureCount > 0).length;

  const sendReleases = releases.filter((r: any) => r.isGaOrHotfix);
  const sendTotal = sendReleases.length;
  const sendFailed = sendReleases.filter((r: any) => r.failureCount > 0).length;

  return {
    dora: {
      totalDeployments: doraTotal,
      failedDeployments: doraFailed,
      changeFailureRate: doraTotal > 0 ? +((doraFailed / doraTotal) * 100).toFixed(2) : null,
    },
    send: {
      totalDeployments: sendTotal,
      failedDeployments: sendFailed,
      changeFailureRate: sendTotal > 0 ? +((sendFailed / sendTotal) * 100).toFixed(2) : null,
    },
    releases,
    unmappedFailures,
  };
}

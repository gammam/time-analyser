import {
  buildDoraMetricViewModel,
  buildDoraQuery,
  fetchDoraMetricsSnapshot,
  formatHoursAndDays,
  validateDoraRequest,
  type DoraMetricsSnapshot,
} from "./dora";

describe("mttr formatting", () => {
  it("formats hours and days", () => {
    expect(formatHoursAndDays(48)).toBe("48.00 h (2.00 d)");
  });
});

describe("dora request validation", () => {
  it("validates default project and range", () => {
    const result = validateDoraRequest({ projectKey: "PN", from: "2026-03-01", to: "2026-03-31" });
    expect(result.isValid).toBe(true);
    expect(result.errors).toEqual({});
  });

  it("rejects from > to", () => {
    const result = validateDoraRequest({ projectKey: "PN", from: "2026-04-10", to: "2026-04-01" });
    expect(result.isValid).toBe(false);
    expect(result.errors.range).toBeDefined();
  });
});

describe("dora query and orchestration", () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("builds one shared query context", () => {
    const query = buildDoraQuery({ projectKey: "PN", from: "2026-03-01", to: "2026-03-31" });
    expect(query).toContain("projectKey=PN");
    expect(query).toContain("from=2026-03-01");
    expect(query).toContain("to=2026-03-31");
  });

  it("fetches four dora endpoints in parallel with same context", async () => {
    const fetchSpy = jest.spyOn(global, "fetch" as any).mockImplementation((url: any) => {
      if (String(url).includes("deployment-frequency")) {
        return Promise.resolve(new Response(JSON.stringify({ deploymentFrequency: 3 }), { status: 200 }));
      }
      if (String(url).includes("lead-time-epic")) {
        return Promise.resolve(new Response(JSON.stringify({ meanLeadTimeDays: 2.5, epics: [], skippedEpics: [] }), { status: 200 }));
      }
      if (String(url).includes("change-failure-rate")) {
        return Promise.resolve(
          new Response(
            JSON.stringify({
              dora: { totalDeployments: 4, failedDeployments: 1, changeFailureRate: 25 },
              send: { totalDeployments: 2, failedDeployments: 1, hotfixReleases: 1, changeFailureRate: 50 },
              releases: [],
              unmappedFailures: [],
            }),
            { status: 200 }
          )
        );
      }
      return Promise.resolve(
        new Response(
          JSON.stringify({ mttrHours: 8, resolvedIncidents: 2, totalIncidents: 2, unresolvedIncidents: 0, issues: [], skippedIssues: [] }),
          { status: 200 }
        )
      );
    });

    const snapshot = await fetchDoraMetricsSnapshot({ projectKey: "PN", from: "2026-03-01", to: "2026-03-31" });

    expect(fetchSpy).toHaveBeenCalledTimes(4);
    expect(Object.keys(snapshot.data).sort()).toEqual(["changeFailureRate", "deploymentFrequency", "leadTime", "mttr"]);
    expect(snapshot.hasPartialFailure).toBe(false);
    expect(snapshot.request.projectKey).toBe("PN");

    const urls = fetchSpy.mock.calls.map((call) => String(call[0]));
    urls.forEach((url) => {
      expect(url).toContain("projectKey=PN");
      expect(url).toContain("from=2026-03-01");
      expect(url).toContain("to=2026-03-31");
    });
  });

  it("reports partial failures while keeping successful metrics", async () => {
    jest.spyOn(global, "fetch" as any).mockImplementation((url: any) => {
      if (String(url).includes("lead-time-epic")) {
        return Promise.resolve(new Response(JSON.stringify({ error: "jira unavailable" }), { status: 500 }));
      }

      return Promise.resolve(new Response(JSON.stringify({ ok: true }), { status: 200 }));
    });

    const snapshot = await fetchDoraMetricsSnapshot({ projectKey: "PN" });

    expect(snapshot.hasPartialFailure).toBe(true);
    expect(snapshot.errors.leadTime).toContain("500");
    expect(snapshot.hasAnySuccess).toBe(true);
  });
});

describe("dora metric rendering view model", () => {
  it("builds all four metric sections from snapshot data", () => {
    const snapshot: DoraMetricsSnapshot = {
      request: { projectKey: "PN", from: "2026-03-01", to: "2026-03-31" },
      completedAt: new Date().toISOString(),
      hasAnySuccess: true,
      hasPartialFailure: false,
      errors: {},
      data: {
        deploymentFrequency: { deploymentFrequency: 4, team: null, projectKey: "PN", from: null, to: null },
        leadTime: {
          meanLeadTimeDays: 1.2,
          meanLeadTimeReadyForUAT: 0.5,
          epics: [],
          skippedEpics: [],
          team: null,
          projectKey: "PN",
          from: null,
          to: null,
        },
        changeFailureRate: {
          team: null,
          projectKey: "PN",
          from: null,
          to: null,
          dora: { totalDeployments: 10, failedDeployments: 2, changeFailureRate: 20 },
          send: { totalDeployments: 3, failedDeployments: 1, hotfixReleases: 1, changeFailureRate: 33.33 },
          releases: [],
          unmappedFailures: [],
        },
        mttr: {
          team: null,
          projectKey: "PN",
          from: null,
          to: null,
          mttrHours: 5,
          p50Hours: 3,
          p90Hours: 9,
          totalIncidents: 2,
          resolvedIncidents: 2,
          unresolvedIncidents: 0,
          issues: [],
          skippedIssues: [],
        },
      },
    };

    const cards = buildDoraMetricViewModel(snapshot);
    expect(cards).toHaveLength(4);
    expect(cards.map((card) => card.id)).toEqual(["deploymentFrequency", "leadTime", "changeFailureRate", "mttr"]);
    expect(cards[0].value).toBe("4");
    expect(cards[2].value).toContain("DORA 20.00%");
    expect(cards[3].value).toBe("5.00 h (0.21 d)");
  });
});

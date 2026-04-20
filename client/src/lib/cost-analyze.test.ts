import {
  buildCostAnalyzeQuery,
  validateCostAnalyzeRequest,
  fetchCostAnalyzeReport,
  defaultDateRange,
  type CostAnalyzeReport,
} from "./cost-analyze";

describe("buildCostAnalyzeQuery", () => {
  it("includes all provided fields", () => {
    const qs = buildCostAnalyzeQuery({ projectKey: "PN", from: "2024-01-01", to: "2024-01-31" });
    expect(qs).toContain("projectKey=PN");
    expect(qs).toContain("from=2024-01-01");
    expect(qs).toContain("to=2024-01-31");
  });

  it("omits empty from/to", () => {
    const qs = buildCostAnalyzeQuery({ projectKey: "PN", from: "", to: "" });
    expect(qs).not.toContain("from=");
    expect(qs).not.toContain("to=");
  });
});

describe("validateCostAnalyzeRequest", () => {
  it("returns valid for a well-formed request", () => {
    const result = validateCostAnalyzeRequest({ projectKey: "PN", from: "2024-01-01", to: "2024-01-31" });
    expect(result.isValid).toBe(true);
    expect(result.errors).toEqual({});
  });

  it("returns an error when projectKey is missing", () => {
    const result = validateCostAnalyzeRequest({ projectKey: "", from: "2024-01-01", to: "2024-01-31" });
    expect(result.isValid).toBe(false);
    expect(result.errors.projectKey).toBeDefined();
  });

  it("returns an error when from is after to", () => {
    const result = validateCostAnalyzeRequest({ projectKey: "PN", from: "2024-02-01", to: "2024-01-01" });
    expect(result.isValid).toBe(false);
    expect(result.errors.from).toBeDefined();
  });

  it("is valid when only projectKey is supplied (dates optional)", () => {
    const result = validateCostAnalyzeRequest({ projectKey: "PN" });
    expect(result.isValid).toBe(true);
  });
});

describe("defaultDateRange", () => {
  it("returns ISO date strings", () => {
    const { from, to } = defaultDateRange(7);
    expect(from).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(to).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it("from is before to", () => {
    const { from, to } = defaultDateRange(30);
    expect(new Date(from) < new Date(to)).toBe(true);
  });
});

describe("fetchCostAnalyzeReport", () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("returns typed report on success", async () => {
    const mockReport: CostAnalyzeReport = {
      projectKey: "PN",
      from: "2024-01-01",
      to: "2024-01-31",
      epics: [
        {
          epicId: "PN-1",
          epicName: "Epic 1",
          totalHours: 8,
          worklogs: [{ user: "Alice", hours: 8 }],
        },
      ],
    };

    jest.spyOn(global, "fetch").mockResolvedValue({
      ok: true,
      json: async () => mockReport,
    } as Response);

    const result = await fetchCostAnalyzeReport({ projectKey: "PN", from: "2024-01-01", to: "2024-01-31" });
    expect(result.projectKey).toBe("PN");
    expect(result.epics).toHaveLength(1);
    expect(result.epics[0].worklogs[0].user).toBe("Alice");
  });

  it("throws a readable error on non-ok response", async () => {
    jest.spyOn(global, "fetch").mockResolvedValue({
      ok: false,
      status: 400,
      json: async () => ({ error: "projectKey is required" }),
    } as Response);

    await expect(
      fetchCostAnalyzeReport({ projectKey: "", from: "2024-01-01", to: "2024-01-31" })
    ).rejects.toThrow("projectKey is required");
  });

  it("throws a status-based error when body has no error field", async () => {
    jest.spyOn(global, "fetch").mockResolvedValue({
      ok: false,
      status: 500,
      json: async () => ({}),
    } as Response);

    await expect(
      fetchCostAnalyzeReport({ projectKey: "PN", from: "2024-01-01", to: "2024-01-31" })
    ).rejects.toThrow("500");
  });
});

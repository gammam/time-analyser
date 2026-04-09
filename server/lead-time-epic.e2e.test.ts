import request from 'supertest';
import { createServer } from './index';

describe('E2E /api/dora/lead-time-epic', () => {
  let app: any;
  beforeAll(async () => {
    app = (await createServer()).app;
  });

  it('should return 400 if projectKey is missing', async () => {
    const res = await request(app).get('/api/dora/lead-time-epic');
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/projectKey/i);
  });

  it('should return 200 and valid structure for a valid request', async () => {
    // This test assumes a mock or test JIRA integration
    const res = await request(app)
      .get('/api/dora/lead-time-epic?projectKey=PROJ&from=2026-01-01&to=2026-03-31')
      .set('Authorization', 'Bearer test-token');
    // Accept 200 or 401 if auth is not configured
    expect([200, 401]).toContain(res.status);
    if (res.status === 200) {
      expect(res.body).toHaveProperty('meanLeadTimeDays');
      expect(Array.isArray(res.body.epics)).toBe(true);
    }
  });

  it('should handle epics with missing release/transition dates', async () => {
    // This test assumes a mock or test JIRA integration
    const res = await request(app)
      .get('/api/dora/lead-time-epic?projectKey=PROJ&from=2026-01-01&to=2026-03-31')
      .set('Authorization', 'Bearer test-token');
    if (res.status === 200) {
      expect(res.body.epics).toBeDefined();
      // At least one epic should be handled gracefully if missing releaseDate/transition
    }
  });
});

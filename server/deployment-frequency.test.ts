import request from 'supertest';
import { createServer } from './index';

describe('GET /api/dora/deployment-frequency', () => {
  let app: any;
  beforeAll(async () => {
    app = (await createServer()).app;
  });

  it('should return 400 if projectKey is missing', async () => {
    const res = await request(app).get('/api/dora/deployment-frequency');
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/projectKey/i);
  });

  it('should return 400 if from or to are invalid dates', async () => {
    const res = await request(app).get('/api/dora/deployment-frequency?projectKey=PROJ&from=invalid-date');
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/invalid from date/i);
  });

  // Additional tests would require mocking fetchProjectVersionsRaw and authentication
  // For full integration, use a test JIRA project and valid credentials
});

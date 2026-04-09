import request from 'supertest';
import { createServer } from '../server/index';

describe('GET /api/dora/lead-time-epic', () => {
  let app: any;
  beforeAll(async () => {
    app = (await createServer()).app;
  });

  it('should return 400 if projectKey is missing', async () => {
    const res = await request(app)
      .get('/api/dora/lead-time-epic')
      .set('Authorization', 'Bearer test-token');
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/projectKey/i);
  });

  it('should return 400 if from or to are invalid dates', async () => {
    const res = await request(app)
      .get('/api/dora/lead-time-epic?projectKey=PROJ&from=invalid-date')
      .set('Authorization', 'Bearer test-token');
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/invalid from date/i);
  });

  // Per testare la logica reale servirebbe mocking di fetchEpicsWithChangelog e autenticazione
  // Qui si verifica solo la validazione parametri e la struttura base
});

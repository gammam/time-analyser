import { spawn, type ChildProcess } from 'node:child_process';

describe('E2E /api/dora/lead-time-epic', () => {
  const port = 3101;
  const baseUrl = `http://127.0.0.1:${port}`;
  let serverProcess: ChildProcess;

  async function waitForServerReady() {
    const timeoutAt = Date.now() + 30000;
    while (Date.now() < timeoutAt) {
      try {
        const response = await fetch(`${baseUrl}/api/dora/lead-time-epic`);
        if (response.status === 400) {
          return;
        }
      } catch {
        // Server not ready yet.
      }
      await new Promise((resolve) => setTimeout(resolve, 500));
    }
    throw new Error('Timed out waiting for dev server to start');
  }

  beforeAll(async () => {
    serverProcess = spawn('npm', ['run', 'dev'], {
      cwd: process.cwd(),
      env: {
        ...process.env,
        PORT: String(port),
      },
      stdio: 'ignore',
    });
    await waitForServerReady();
  }, 90000);

  afterAll(async () => {
    if (serverProcess?.pid) {
      serverProcess.kill('SIGTERM');
      await new Promise((resolve) => {
        const timer = setTimeout(resolve, 3000);
        serverProcess.once('exit', () => {
          clearTimeout(timer);
          resolve(undefined);
        });
      });
      if (serverProcess.exitCode === null) {
        serverProcess.kill('SIGKILL');
      }
    }
  }, 10000);

  it('should return 400 if projectKey is missing', async () => {
    const res = await fetch(`${baseUrl}/api/dora/lead-time-epic`);
    const body = await res.json();
    expect(res.status).toBe(400);
    expect(body.error).toMatch(/projectKey/i);
  });

  it('should return 200 and valid structure for a valid request', async () => {
    const res = await fetch(`${baseUrl}/api/dora/lead-time-epic?projectKey=PN&from=2026-03-01&to=2026-03-31`);
    const body = await res.json();
    console.log('Response:', JSON.stringify(body, null, 2));
    expect(res.status).toBe(200);
    expect(body).toHaveProperty('meanLeadTimeDays');
    expect(body).toHaveProperty('meanLeadTimeReadyForUAT');
    expect(Array.isArray(body.epics)).toBe(true);
    expect(Array.isArray(body.skippedEpics)).toBe(true);
  });

  it('should handle epics with missing release/transition dates', async () => {
    const res = await fetch(`${baseUrl}/api/dora/lead-time-epic?projectKey=PN&from=2026-03-01&to=2026-03-31`);
    const body = await res.json();
    console.log('Response:', JSON.stringify(body, null, 2));
    expect(res.status).toBe(200);
    expect(body.epics).toBeDefined();
    expect(body.skippedEpics).toBeDefined();
    expect(Array.isArray(body.skippedEpics)).toBe(true);
  });
});

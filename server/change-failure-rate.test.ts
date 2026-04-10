import { spawn, type ChildProcess } from 'node:child_process';

describe('E2E /api/dora/change-failure-rate', () => {
  const port = 3102;
  const baseUrl = `http://127.0.0.1:${port}`;
  let serverProcess: ChildProcess;

  async function waitForServerReady() {
    const timeoutAt = Date.now() + 30000;
    while (Date.now() < timeoutAt) {
      try {
        const response = await fetch(`${baseUrl}/api/dora/change-failure-rate`);
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
    const res = await fetch(`${baseUrl}/api/dora/change-failure-rate`);
    const body = await res.json();
    expect(res.status).toBe(400);
    expect(body.error).toMatch(/projectKey/i);
  });

  it('should return 400 when from date is invalid', async () => {
    const res = await fetch(`${baseUrl}/api/dora/change-failure-rate?projectKey=PROJ&from=bad-date`);
    const body = await res.json();
    expect(res.status).toBe(400);
    expect(body.error).toMatch(/invalid from date/i);
  });

  it('should return 200 and valid dual-metric structure for a valid request', async () => {
    const res = await fetch(
      `${baseUrl}/api/dora/change-failure-rate?projectKey=PN&from=2026-01-01&to=2026-03-31`
    );
    const body = await res.json();
    console.log('Response:', JSON.stringify(body, null, 2));
    expect(res.status).toBe(200);
    expect(body).toHaveProperty('projectKey', 'PN');
    expect(body).toHaveProperty('dora');
    expect(body).toHaveProperty('send');
    expect(body.dora).toHaveProperty('totalDeployments');
    expect(body.dora).toHaveProperty('failedDeployments');
    expect(body.dora).toHaveProperty('changeFailureRate');
    expect(body.send).toHaveProperty('totalDeployments');
    expect(body.send).toHaveProperty('failedDeployments');
    expect(body.send).toHaveProperty('changeFailureRate');
    expect(Array.isArray(body.releases)).toBe(true);
    expect(Array.isArray(body.unmappedFailures)).toBe(true);
  });

  it('should return null changeFailureRate when totalDeployments is zero', async () => {
    const res = await fetch(`${baseUrl}/api/dora/change-failure-rate?projectKey=PN`);
    const body = await res.json();

    expect(res.status).toBe(200);
    if (body.dora.totalDeployments === 0) {
      expect(body.dora.changeFailureRate).toBeNull();
    }
    if (body.send.totalDeployments === 0) {
      expect(body.send.changeFailureRate).toBeNull();
    }
  });
});

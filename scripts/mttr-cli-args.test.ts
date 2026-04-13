import { parseMttrCliArgs } from './mttr-cli-args';

describe('parseMttrCliArgs', () => {
  it('uses defaults when no args are provided', () => {
    const parsed = parseMttrCliArgs([]);

    expect(parsed).toEqual({
      valid: true,
      userId: 'local-dev-user',
      projectKey: 'PN',
      team: undefined,
      from: '2026-01-01',
      to: '2026-03-31',
    });
  });

  it('parses team + date range when all args are provided', () => {
    const parsed = parseMttrCliArgs([
      'u1',
      'PN',
      'TeamA',
      '2026-04-01',
      '2026-04-15',
    ]);

    expect(parsed).toEqual({
      valid: true,
      userId: 'u1',
      projectKey: 'PN',
      team: 'TeamA',
      from: '2026-04-01',
      to: '2026-04-15',
    });
  });

  it('supports no-team invocation with explicit from/to', () => {
    const parsed = parseMttrCliArgs([
      'u1',
      'PN',
      '2026-04-01',
      '2026-04-15',
    ]);

    expect(parsed).toEqual({
      valid: true,
      userId: 'u1',
      projectKey: 'PN',
      team: undefined,
      from: '2026-04-01',
      to: '2026-04-15',
    });
  });

  it('rejects invalid date values', () => {
    const parsed = parseMttrCliArgs([
      'u1',
      'PN',
      'TeamA',
      'not-a-date',
      '2026-04-15',
    ]);

    expect(parsed.valid).toBe(false);
    if (!parsed.valid) {
      expect(parsed.message).toContain('Invalid date values');
    }
  });

  it('rejects extra positional arguments', () => {
    const parsed = parseMttrCliArgs([
      'u1',
      'PN',
      'TeamA',
      '2026-04-01',
      '2026-04-15',
      'EXTRA',
    ]);

    expect(parsed.valid).toBe(false);
    if (!parsed.valid) {
      expect(parsed.message).toContain('Unexpected extra argument');
    }
  });
});

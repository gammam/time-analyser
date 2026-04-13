import { deriveResolutionDateFromChangelog } from './mttr-resolution-date';

describe('deriveResolutionDateFromChangelog', () => {
  it('returns null when changelog is missing or empty', () => {
    expect(deriveResolutionDateFromChangelog(undefined)).toBeNull();
    expect(deriveResolutionDateFromChangelog({ histories: [] })).toBeNull();
  });

  it('returns transition date when status moves to Completata', () => {
    const changelog = {
      histories: [
        {
          created: '2026-03-20T09:10:00.000+0100',
          items: [{ field: 'status', fromString: 'In corso', toString: 'Completata' }],
        },
      ],
    };

    expect(deriveResolutionDateFromChangelog(changelog)).toBe('2026-03-20T09:10:00.000+0100');
  });

  it('ignores non-status transitions and other target statuses', () => {
    const changelog = {
      histories: [
        {
          created: '2026-03-20T09:10:00.000+0100',
          items: [{ field: 'priority', fromString: 'High', toString: 'Low' }],
        },
        {
          created: '2026-03-21T09:10:00.000+0100',
          items: [{ field: 'status', fromString: 'In corso', toString: 'In revisione' }],
        },
      ],
    };

    expect(deriveResolutionDateFromChangelog(changelog)).toBeNull();
  });

  it('accepts Done as equivalent completed status', () => {
    const changelog = {
      histories: [
        {
          created: '2026-03-21T09:10:00.000+0100',
          items: [{ field: 'status', fromString: 'In corso', toString: 'Done' }],
        },
      ],
    };

    expect(deriveResolutionDateFromChangelog(changelog)).toBe('2026-03-21T09:10:00.000+0100');
  });

  it('returns latest Completata transition date when issue reopens then closes again', () => {
    const changelog = {
      histories: [
        {
          created: '2026-03-18T09:10:00.000+0100',
          items: [{ field: 'status', toString: 'Completata' }],
        },
        {
          created: '2026-03-19T09:10:00.000+0100',
          items: [{ field: 'status', toString: 'In corso' }],
        },
        {
          created: '2026-03-22T09:10:00.000+0100',
          items: [{ field: 'status', toString: 'Completata' }],
        },
      ],
    };

    expect(deriveResolutionDateFromChangelog(changelog)).toBe('2026-03-22T09:10:00.000+0100');
  });

  it('skips invalid history dates', () => {
    const changelog = {
      histories: [
        {
          created: 'invalid-date',
          items: [{ field: 'status', toString: 'Completata' }],
        },
      ],
    };

    expect(deriveResolutionDateFromChangelog(changelog)).toBeNull();
  });
});

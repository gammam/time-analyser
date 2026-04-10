type CliParseError = {
  valid: false;
  message: string;
};

type CliParseSuccess = {
  valid: true;
  userId: string;
  projectKey: string;
  team?: string;
  from: string;
  to: string;
};

export type MttrCliParseResult = CliParseError | CliParseSuccess;

const DEFAULT_USER_ID = 'local-dev-user';
const DEFAULT_PROJECT_KEY = 'PN';
const DEFAULT_FROM = '2026-01-01';
const DEFAULT_TO = '2026-03-31';

function usage(): string {
  return [
    'Usage: tsx scripts/test-fetchSendProdBugsForMttr.ts <userId> <projectKey> [team] [from] [to]',
    'Examples:',
    '  tsx scripts/test-fetchSendProdBugsForMttr.ts local-dev-user PN TeamA 2026-03-01 2026-03-31',
    '  tsx scripts/test-fetchSendProdBugsForMttr.ts local-dev-user PN 2026-03-01 2026-03-31',
    '  tsx scripts/test-fetchSendProdBugsForMttr.ts',
  ].join('\n');
}

function isValidDate(value: string): boolean {
  return !isNaN(new Date(value).getTime());
}

// Accept YYYY-MM-DD and full ISO date-time to keep parity with endpoint date handling.
function looksLikeDate(value: string): boolean {
  return /^(\d{4}-\d{2}-\d{2})(T.*)?$/.test(value);
}

export function parseMttrCliArgs(argv: string[]): MttrCliParseResult {
  const userId = argv[0] || DEFAULT_USER_ID;
  const projectKey = argv[1] || DEFAULT_PROJECT_KEY;

  let team: string | undefined;
  let from = DEFAULT_FROM;
  let to = DEFAULT_TO;

  const maybeThird = argv[2];
  const maybeFourth = argv[3];
  const maybeFifth = argv[4];

  if (maybeThird) {
    if (looksLikeDate(maybeThird)) {
      from = maybeThird;
      if (maybeFourth) to = maybeFourth;
      if (maybeFifth) {
        return {
          valid: false,
          message: `${usage()}\n\nUnexpected extra argument: ${maybeFifth}`,
        };
      }
    } else {
      team = maybeThird;
      if (maybeFourth) from = maybeFourth;
      if (maybeFifth) to = maybeFifth;
      if (argv[5]) {
        return {
          valid: false,
          message: `${usage()}\n\nUnexpected extra argument: ${argv[5]}`,
        };
      }
    }
  }

  if (!isValidDate(from) || !isValidDate(to)) {
    return {
      valid: false,
      message: `${usage()}\n\nInvalid date values. from=${from}, to=${to}`,
    };
  }

  return {
    valid: true,
    userId,
    projectKey,
    team,
    from,
    to,
  };
}

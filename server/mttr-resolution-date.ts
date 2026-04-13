const DONE_LIKE_STATUSES = new Set(['completata', 'done']);

function isStatusMovedToCompletata(item: any): boolean {
  if (item?.field !== 'status') return false;
  const targetStatus = String(item?.toString || '').trim().toLowerCase();
  return DONE_LIKE_STATUSES.has(targetStatus);
}

function toValidIsoDate(value: any): string | null {
  if (typeof value !== 'string') return null;
  const millis = new Date(value).getTime();
  return Number.isNaN(millis) ? null : value;
}

export function deriveResolutionDateFromChangelog(changelog: any): string | null {
  const histories = Array.isArray(changelog?.histories) ? changelog.histories : [];
  let latestCompletataMillis: number | null = null;
  let latestCompletataDate: string | null = null;

  for (const history of histories) {
    const hasCompletataTransition = Array.isArray(history?.items)
      ? history.items.some((item: any) => isStatusMovedToCompletata(item))
      : false;

    if (!hasCompletataTransition) {
      continue;
    }

    const created = toValidIsoDate(history?.created);
    if (!created) {
      continue;
    }

    const millis = new Date(created).getTime();
    if (latestCompletataMillis === null || millis > latestCompletataMillis) {
      latestCompletataMillis = millis;
      latestCompletataDate = created;
    }
  }

  return latestCompletataDate;
}

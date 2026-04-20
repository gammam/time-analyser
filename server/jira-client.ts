// Extracts worklog data from SEND Analysis Tickets linked to Epics (Cost Analyze Story 1.1)
/**
 * Fetch SEND Analysis Ticket worklogs for a set of Epics in a given time range.
 * @param {Object} params
 * @param {string} params.userId - The user ID for Jira credentials
 * @param {Array<{id: string, key: string, name: string}>} params.epics - List of Epics to process
 * @param {{from: string, to: string}} params.timeRange - Time range for filtering tickets
 * @returns {Promise<Array<{epicId: string, epicName: string, worklogs: Array<{user: string, hours: number}>}>>}
 */
/**
 * Fetch SEND Analysis Ticket worklogs for all Epics in a project and time range.
 * @param {Object} params
 * @param {string} params.userId - The user ID for Jira credentials
 * @param {string} params.projectKey - The Jira project key
 * @param {{from: string, to: string}} params.timeRange - Time range for filtering epics and tickets
 * @returns {Promise<Array<{epicId: string, epicName: string, worklogs: Array<{user: string, hours: number}>}>>}
 */
export async function fetchSendAnalysisWorklogs({ userId, projectKey, timeRange }) {
  // Step 1: Fetch all Epics in the project and time range
  const epics = await fetchEpicsWithChangelog(userId, projectKey, undefined, timeRange.from, timeRange.to);
  const { email, apiToken, host } = await getUserJiraCredentials(userId);
  const normalizedHost = host.endsWith('/') ? host.slice(0, -1) : host;
  const auth = Buffer.from(`${email}:${apiToken}`).toString('base64');
  const results = [];

  for (const epic of epics) {
    // Query SEND Analysis Tickets linked to this Epic
    const jql = [
      `parent = ${epic.key}`,
      `issuetype = "[SEND] Analysis"`,
      timeRange.from ? `created >= "${timeRange.from}"` : null,
      timeRange.to ? `created <= "${timeRange.to}"` : null,
    ].filter(Boolean).join(' AND ');

    const url = `${normalizedHost}/rest/api/3/search/jql`;
    let sendTickets = [];
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': `Basic ${auth}`,
          'Accept': 'application/json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          jql,
          maxResults: 100,
          fields: ['summary', 'worklog', 'assignee'],
          expand: 'worklog',
          fieldsByKeys: false,
        }),
      });
      if (!response.ok) {
        throw new Error(`Jira query failed for Epic ${epic.key}: ${response.status}`);
      }
      const data = await response.json();
      sendTickets = data.issues || [];
    } catch (err) {
      console.error(`[JIRA] Error fetching SEND Analysis Tickets for Epic ${epic.key}:`, err);
      sendTickets = [];
    }

    // Extract worklog data
    const worklogs = [];
    for (const ticket of sendTickets) {
      // Standard Jira worklogs
      const logs = (ticket.fields?.worklog?.worklogs || []).map(wl => ({
        user: wl.author?.displayName || wl.author?.name || wl.author?.emailAddress || 'unknown',
        hours: wl.timeSpentSeconds ? wl.timeSpentSeconds / 3600 : 0,
      }));
      worklogs.push(...logs);
      // Optionally, extract custom time fields if present (e.g., ticket.fields.customfield_XXX)
      // Uncomment and adjust if needed:
      // if (ticket.fields?.customfield_XXX) {
      //   worklogs.push({ user: ticket.fields.assignee?.displayName || 'unknown', hours: ticket.fields.customfield_XXX });
      // }
    }

    // Aggregate by user
    const userHours = {};
    for (const wl of worklogs) {
      if (!wl.user) continue;
      userHours[wl.user] = (userHours[wl.user] || 0) + wl.hours;
    }
    const aggregated = Object.entries(userHours).map(([user, hours]) => ({ user, hours }));

    results.push({
      epicId: epic.key,
      epicName: epic.fields?.summary || epic.name || epic.key,
      worklogs: aggregated,
    });
  }
  return results;
}
// Recupera tutte le epiche di un progetto/team con changelog (per READY_FOR_UAT)
import { deriveResolutionDateFromChangelog } from './mttr-resolution-date.ts';

// Recupera tutte le epiche di un progetto/team con changelog (per READY_FOR_UAT)
export async function fetchEpicsWithChangelog(userId: string, projectKey: string, team?: string, from?: string, to?: string) {
  try {
    const { email, apiToken, host } = await getUserJiraCredentials(userId);
    // Costruisci JQL
    let jql = `project = ${projectKey} AND issuetype = Epic`;
    if (team) {
      // Adatta il campo custom team se presente (es: "team" o customfield_xxx)
      jql += ` AND team ~ \"${team}\"`;
    }
    if (from) {
      jql += ` AND created >= \"${from}\"`;
    }
    if (to) {
      jql += ` AND created <= \"${to}\"`;
    }
    // Jira cloud deprecation path requires /rest/api/3/search/jql.
    // Changelog is fetched per issue from /issue/{key}/changelog.
    const normalizedHost = host.endsWith('/') ? host.slice(0, -1) : host;
    const url = `${normalizedHost}/rest/api/3/search/jql`;
    const auth = Buffer.from(`${email}:${apiToken}`).toString('base64');
    const allIssues: any[] = [];
    let nextPageToken: string | undefined = undefined;

    do {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': `Basic ${auth}`,
          'Accept': 'application/json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          jql,
          maxResults: 100,
          fields: ["summary", "created", "status", "fixVersions"],
          expand: "changelog",
          fieldsByKeys: false,
          nextPageToken,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const err: any = new Error(`Request failed with status code ${response.status}`);
        err.status = response.status;
        err.response = { status: response.status, data: errorData };
        throw err;
      }

      const data: any = await response.json();
      const pageIssues = data.issues || data.values || [];
      allIssues.push(...pageIssues);
      nextPageToken = data.nextPageToken;
    } while (nextPageToken);

    return allIssues;
  } catch (error: any) {
    // Axios/Jira.js error structure
    const status = error?.response?.status || error?.status;
    let structuredError;
    if (status === 401 || status === 403) {
      structuredError = {
        type: 'auth',
        message: 'Autenticazione JIRA fallita: token o credenziali non valide.',
        details: error?.response?.data || error?.message || error
      };
    } else if (status === 404) {
      structuredError = {
        type: 'not_found',
        message: `ProjectKey o ID non valido: ${projectKey}`,
        details: error?.response?.data || error?.message || error
      };
    } else {
      structuredError = {
        type: 'unknown',
        message: `Errore nella ricerca epiche JIRA (status: ${status}): ${error?.message || 'Errore sconosciuto'}`,
        details: error?.response?.data || error?.message || error
      };
    }
    console.error(`[JIRA] Errore nel recupero epiche per progetto ${projectKey}:`, structuredError);
    throw structuredError;
  }
}
// Recupera tutte le versioni di un progetto JIRA (solo log, nessun filtro applicato)
export async function fetchProjectVersionsRaw(userId: string, projectKey: string) {
  try {
    const client = await getUncachableJiraClientForUser(userId);
    const versions = await client.projectVersions.getProjectVersions({ projectIdOrKey: projectKey });
    console.log(`[JIRA] Versioni per progetto ${projectKey}:`, versions);
    return versions;
  } catch (error: any) {
    // Axios/Jira.js error structure
    const status = error?.response?.status || error?.status;
    let structuredError;
    if (status === 401 || status === 403) {
      structuredError = {
        type: 'auth',
        message: 'Autenticazione JIRA fallita: token o credenziali non valide.',
        details: error?.response?.data || error?.message || error
      };
    } else if (status === 404) {
      structuredError = {
        type: 'not_found',
        message: `ProjectKey o ID non valido: ${projectKey}`,
        details: error?.response?.data || error?.message || error
      };
    } else {
      structuredError = {
        type: 'unknown',
        message: 'Errore sconosciuto durante la chiamata a JIRA',
        details: error?.response?.data || error?.message || error
      };
    }
    console.error(`[JIRA] Errore nel recupero versioni per progetto ${projectKey}:`, structuredError);
    throw structuredError;
  }
}

// Recupera i bug di produzione [SEND] Bug Prod con mapping su Affects Version/s
export async function fetchProductionBugsForReleases(
  userId: string,
  projectKey: string,
  releaseNames: string[],
  team?: string,
  from?: string,
  to?: string,
) {
  try {
    const { email, apiToken, host } = await getUserJiraCredentials(userId);
    const normalizedHost = host.endsWith('/') ? host.slice(0, -1) : host;
    const url = `${normalizedHost}/rest/api/3/search/jql`;
    const auth = Buffer.from(`${email}:${apiToken}`).toString('base64');

    // AC #5: query only [SEND] Bug Prod and filter by Affects Version/s when release names are available.
    let jql = `project = ${projectKey} AND issuetype = "[SEND] Bug Prod"`;
    if (team) {
      jql += ` AND team ~ "${team}"`;
    }
    if (from) {
      jql += ` AND created >= "${from}"`;
    }
    if (to) {
      jql += ` AND created <= "${to}"`;
    }
    if (releaseNames.length > 0) {
      const quoted = releaseNames
        .map((name) => `"${String(name).replace(/"/g, '\\"')}"`)
        .join(',');
      jql += ` AND "affectedVersion" in (${quoted})`;
    }

    const allIssues: any[] = [];
    let nextPageToken: string | undefined;

    do {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          Authorization: `Basic ${auth}`,
          Accept: 'application/json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          jql,
          maxResults: 100,
          fields: ['summary', 'created', 'issuetype', 'versions', 'affectedVersions', 'status', 'resolutiondate'],
          fieldsByKeys: false,
          nextPageToken,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const err: any = new Error(`Request failed with status code ${response.status}`);
        err.status = response.status;
        err.response = { status: response.status, data: errorData };
        throw err;
      }

      const data: any = await response.json();
      const pageIssues = data.issues || data.values || [];
      allIssues.push(...pageIssues);
      nextPageToken = data.nextPageToken;
    } while (nextPageToken);

    return allIssues
      .filter((issue: any) => issue?.fields?.issuetype?.name === '[SEND] Bug Prod')
      .map((issue: any) => {
        const versions = Array.isArray(issue?.fields?.versions) ? issue.fields.versions : [];
        const affectedVersions = Array.isArray(issue?.fields?.affectedVersions) ? issue.fields.affectedVersions : [];
        const allMapped = [...versions, ...affectedVersions];
        const mappedReleaseNames = Array.from(
          new Set(allMapped.map((v: any) => v?.name).filter((name: any) => typeof name === 'string' && name.length > 0)),
        );

        return {
          key: issue.key,
          summary: issue?.fields?.summary || null,
          created: issue?.fields?.created || null,
          issueType: issue?.fields?.issuetype?.name || null,
          releaseNames: mappedReleaseNames,
        };
      });
  } catch (error: any) {
    const status = error?.response?.status || error?.status;
    let structuredError;
    if (status === 401 || status === 403) {
      structuredError = {
        type: 'auth',
        message: 'Autenticazione JIRA fallita: token o credenziali non valide.',
        details: error?.response?.data || error?.message || error,
      };
    } else if (status === 404) {
      structuredError = {
        type: 'not_found',
        message: `ProjectKey o ID non valido: ${projectKey}`,
        details: error?.response?.data || error?.message || error,
      };
    } else {
      structuredError = {
        type: 'unknown',
        message: `Errore nella ricerca bug produzione JIRA (status: ${status}): ${error?.message || 'Errore sconosciuto'}`,
        details: error?.response?.data || error?.message || error,
      };
    }
    console.error(`[JIRA] Errore nel recupero bug produzione per progetto ${projectKey}:`, structuredError);
    throw structuredError;
  }
}

// Recupera i bug di produzione [SEND] Bug Prod per calcolo MTTR
export async function fetchSendProdBugsForMttr(
  userId: string,
  projectKey: string,
  team?: string,
  from?: string,
  to?: string,
) {
  try {
    const { email, apiToken, host } = await getUserJiraCredentials(userId);
    const normalizedHost = host.endsWith('/') ? host.slice(0, -1) : host;
    const url = `${normalizedHost}/rest/api/3/search/jql`;
    const auth = Buffer.from(`${email}:${apiToken}`).toString('base64');

    let jql = `project = ${projectKey} AND issuetype = "[SEND] Bug Prod"`;
    if (team) {
      jql += ` AND team ~ "${team}"`;
    }
    if (from) {
      jql += ` AND created >= "${from}"`;
    }
    if (to) {
      jql += ` AND created <= "${to}"`;
    }

    const allIssues: any[] = [];
    let nextPageToken: string | undefined;
    const debugMttrPayload = process.env.DEBUG_JIRA_MTTR_PAYLOAD === '1';
    let debugPageIndex = 0;

    do {
      const body = {
        jql,
        maxResults: 100,
        fields: ['summary', 'created', 'resolutiondate', 'issuetype', 'status'],
        expand: 'changelog',
        fieldsByKeys: false,
        nextPageToken,
      };

      if (debugMttrPayload) {
        console.log('[JIRA][MTTR] Request payload:', JSON.stringify(body));
      }

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          Authorization: `Basic ${auth}`,
          Accept: 'application/json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const err: any = new Error(`Request failed with status code ${response.status}`);
        err.status = response.status;
        err.response = { status: response.status, data: errorData };
        throw err;
      }

      const data: any = await response.json();
      const pageIssues = data.issues || data.values || [];

      if (debugMttrPayload) {
        const firstIssue = pageIssues[0];
        const firstIssueHasChangelog = Array.isArray(firstIssue?.changelog?.histories);
        console.log(
          '[JIRA][MTTR] Response page summary:',
          JSON.stringify({
            page: debugPageIndex,
            issues: pageIssues.length,
            hasNextPageToken: !!data.nextPageToken,
            firstIssueHasChangelog,
          }),
        );
      }

      allIssues.push(...pageIssues);
      nextPageToken = data.nextPageToken;
      debugPageIndex += 1;
    } while (nextPageToken);

    return allIssues
      .filter((issue: any) => issue?.fields?.issuetype?.name === '[SEND] Bug Prod')
      .map((issue: any) => ({
        key: issue.key,
        summary: issue?.fields?.summary || null,
        created: issue?.fields?.created || null,
        resolutionDate: issue?.fields?.resolutiondate || deriveResolutionDateFromChangelog(issue?.changelog),
        issueType: issue?.fields?.issuetype?.name || null,
        status: issue?.fields?.status?.name || null,
      }));
  } catch (error: any) {
    const status = error?.response?.status || error?.status;
    let structuredError;
    if (status === 401 || status === 403) {
      structuredError = {
        type: 'auth',
        message: 'Autenticazione JIRA fallita: token o credenziali non valide.',
        details: error?.response?.data || error?.message || error,
      };
    } else if (status === 404) {
      structuredError = {
        type: 'not_found',
        message: `ProjectKey o ID non valido: ${projectKey}`,
        details: error?.response?.data || error?.message || error,
      };
    } else {
      structuredError = {
        type: 'unknown',
        message: `Errore nella ricerca bug produzione JIRA per MTTR (status: ${status}): ${error?.message || 'Errore sconosciuto'}`,
        details: error?.response?.data || error?.message || error,
      };
    }
    console.error(`[JIRA] Errore nel recupero bug produzione per MTTR nel progetto ${projectKey}:`, structuredError);
    throw structuredError;
  }
}

import { storage } from './storage.ts';
import { decryptJiraToken } from './jira-crypto.ts';
// Recupera le credenziali JIRA per un dato userId dal database e le decifra
export async function getUserJiraCredentials(userId: string) {
  const settings = await storage.getUserSettings(userId);
  if (!settings || !settings.jiraEmail || !settings.jiraApiToken || !settings.jiraHost || !settings.jiraEncryptionKey) {
    throw new Error('JIRA credentials not configured for user');
  }
  return {
    email: settings.jiraEmail,
    apiToken: decryptJiraToken(settings.jiraApiToken, settings.jiraEncryptionKey),
    host: settings.jiraHost,
  };
}
import { Version3Client } from 'jira.js';

// JIRA Client using Personal Access Token (PAT) with Basic Authentication
// This is more reliable than OAuth2 for user-specific operations

interface JiraCredentials {
  email?: string | null;
  apiToken?: string | null;
  host?: string | null;
}

async function getJiraConfig(userCredentials?: JiraCredentials) {
  // Use user credentials if provided, otherwise fall back to environment variables
  const email = userCredentials?.email || process.env.JIRA_EMAIL;
  const apiToken = userCredentials?.apiToken || process.env.JIRA_API_TOKEN;
  const host = userCredentials?.host || process.env.JIRA_HOST || 'https://pagopa.atlassian.net';
  
  if (!email || !apiToken) {
    throw new Error('JIRA credentials not configured. Please configure your JIRA settings or set JIRA_EMAIL and JIRA_API_TOKEN environment variables.');
  }

  return { email, apiToken, host };
}

// WARNING: Never cache this client.
// Always call this function to get a fresh client.
// Crea un client JIRA usando le credenziali per-utente (recuperate dal DB)
export async function getUncachableJiraClientForUser(userId: string) {
  const { email, apiToken, host } = await getUserJiraCredentials(userId);
  console.log('Creating JIRA client with Basic auth for:', email);
  console.log('Using JIRA host:', host);
  return new Version3Client({
    host,
    authentication: {
      basic: {
        email,
        apiToken,
      },
    },
  });
}

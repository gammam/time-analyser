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

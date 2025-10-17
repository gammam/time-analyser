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
// Pass user credentials to use user-specific configuration instead of global env variables
export async function getUncachableJiraClient(userCredentials?: JiraCredentials) {
  const { email, apiToken, host } = await getJiraConfig(userCredentials);

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

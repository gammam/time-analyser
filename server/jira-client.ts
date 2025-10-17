import { Version3Client } from 'jira.js';

// JIRA Client using Personal Access Token (PAT) with Basic Authentication
// This is more reliable than OAuth2 for user-specific operations

async function getJiraConfig() {
  const email = process.env.JIRA_EMAIL;
  const apiToken = process.env.JIRA_API_TOKEN;
  const host = process.env.JIRA_HOST || 'https://pagopa.atlassian.net'; // Default host
  
  if (!email || !apiToken) {
    throw new Error('JIRA credentials not configured. Please set JIRA_EMAIL and JIRA_API_TOKEN environment variables.');
  }

  return { email, apiToken, host };
}

// WARNING: Never cache this client.
// Always call this function to get a fresh client.
export async function getUncachableJiraClient() {
  const { email, apiToken, host } = await getJiraConfig();

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

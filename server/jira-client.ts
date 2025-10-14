import { Version3Client } from 'jira.js';

let connectionSettings: any;

async function getAccessToken() {
  if (connectionSettings && connectionSettings.settings.expires_at && new Date(connectionSettings.settings.expires_at).getTime() > Date.now()) {
    return connectionSettings.settings.access_token;
  }
  
  const hostname = process.env.REPLIT_CONNECTORS_HOSTNAME
  const xReplitToken = process.env.REPL_IDENTITY 
    ? 'repl ' + process.env.REPL_IDENTITY 
    : process.env.WEB_REPL_RENEWAL 
    ? 'depl ' + process.env.WEB_REPL_RENEWAL 
    : null;

  if (!xReplitToken) {
    throw new Error('X_REPLIT_TOKEN not found for repl/depl');
  }

  const response = await fetch(
    'https://' + hostname + '/api/v2/connection?include_secrets=true&connector_names=jira',
    {
      headers: {
        'Accept': 'application/json',
        'X_REPLIT_TOKEN': xReplitToken
      }
    }
  );
  
  const data = await response.json();
  console.log('JIRA Connection Response:', JSON.stringify(data, null, 2));
  
  connectionSettings = data.items?.[0];
  console.log('Connection Settings:', JSON.stringify(connectionSettings, null, 2));

  const accessToken = connectionSettings?.settings?.access_token || connectionSettings?.settings?.oauth?.credentials?.access_token;
  
  // JIRA hostname needs to be obtained from accessible_resources API
  // For now, we need to ask the user for their JIRA site URL
  // The connection doesn't store it directly
  console.log('Access Token exists:', !!accessToken);
  console.log('Full connectionSettings:', JSON.stringify(connectionSettings, null, 2));

  if (!connectionSettings || !accessToken) {
    throw new Error('Jira not connected - missing access token');
  }

  // Try to get resources list from Atlassian API to find the JIRA site
  const resourcesResponse = await fetch('https://api.atlassian.com/oauth/token/accessible-resources', {
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Accept': 'application/json'
    }
  });

  const resources = await resourcesResponse.json();
  console.log('Accessible Resources:', JSON.stringify(resources, null, 2));
  
  if (!resources || resources.length === 0) {
    throw new Error('No accessible JIRA sites found');
  }
  
  // Use the first accessible resource (JIRA site)
  const hostName = resources[0].url;
  const cloudId = resources[0].id;
  
  console.log('Using JIRA site:', hostName, 'Cloud ID:', cloudId);

  return {accessToken, hostName};
}

// WARNING: Never cache this client.
// Access tokens expire, so a new client must be created each time.
// Always call this function again to get a fresh client.
export async function getUncachableJiraClient() {
  const { accessToken, hostName } = await getAccessToken();

  return new Version3Client({
    host: hostName,
    authentication: {
      oauth2: { accessToken },
    },
  });
}

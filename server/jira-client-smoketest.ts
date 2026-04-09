import 'dotenv/config';
import { getUncachableJiraClientForUser, getUserJiraCredentials } from './jira-client.ts';
import { storage } from './storage.ts';
import { decryptJiraToken } from './jira-crypto.ts';

const userId = process.env.LOCAL_USER_ID;
if (!userId) {
  throw new Error('Imposta la variabile d’ambiente LOCAL_USER_ID con l’ID utente da testare');
}

try {
  // Fetch user settings to get the encryption key
  const settings = await storage.getUserSettings(userId);
  if (!settings || !settings.jiraEncryptionKey) {
    throw new Error('Per-user JIRA encryption key not found in user settings.');
  }
  // Optionally, test decryption logic directly
  if (settings.jiraApiToken) {
    const decrypted = decryptJiraToken(settings.jiraApiToken, settings.jiraEncryptionKey);
    console.log('Decrypted JIRA API token:', decrypted);
  }
  // Use the standard client logic (which now uses per-user key)
  const client = await getUncachableJiraClientForUser(userId);
  let projects = null;
  try {
    if (client.projects && typeof client.projects.searchProjects === 'function') {
      projects = await client.projects.searchProjects();
      console.log('Progetti JIRA disponibili (projects.searchProjects):', projects);
    } else if (client.project && typeof client.project.getAllProjects === 'function') {
      projects = await client.project.getAllProjects();
      console.log('Progetti JIRA disponibili (project.getAllProjects):', projects);
    } else {
      throw new Error('Nessun metodo valido per elencare i progetti trovato su jira.js client.');
    }
  } catch (apiErr) {
    console.error('Errore chiamata API JIRA:', apiErr);
    process.exit(1);
  }
} catch (err) {
  console.error('Errore smoke test JIRA:', err);
  process.exit(1);
}

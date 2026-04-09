import 'dotenv/config';
import { storage } from '../server/storage.ts';
import { encryptJiraToken } from '../server/jira-crypto.ts';

async function main() {
    console.log("ENV:",process.env.LOCAL_USER_ID, process.env.LOCAL_JIRA_EMAIL, process.env.LOCAL_JIRA_HOST,process.env.LOCAL_JIRA_API_TOKEN, process.env.LOCAL_JIRA_ENCRYPTION_KEY);
  const userId = process.env.LOCAL_USER_ID;
  const jiraEmail = process.env.LOCAL_JIRA_EMAIL;
  const jiraApiToken = process.env.LOCAL_JIRA_API_TOKEN;
  const jiraHost = process.env.LOCAL_JIRA_HOST || 'https://pagopa.atlassian.net';
  const jiraEncryptionKey = String(process.env.LOCAL_JIRA_ENCRYPTION_KEY);

  if (!userId || !jiraEmail || !jiraApiToken || !jiraEncryptionKey) {
    throw new Error('Set LOCAL_USER_ID, LOCAL_JIRA_EMAIL, LOCAL_JIRA_API_TOKEN, LOCAL_JIRA_ENCRYPTION_KEY in your environment');
  }

  const encryptedToken = encryptJiraToken(jiraApiToken,jiraEncryptionKey);
  await storage.upsertUserSettings(userId, {
    jiraEmail,
    jiraApiToken: encryptedToken,
    jiraHost,
    jiraEncryptionKey,
  });
  console.log('✅ Credenziali JIRA salvate per utente locale:', userId);
}

main().catch((err) => {
  console.error('Errore:', err);
  process.exit(1);
});

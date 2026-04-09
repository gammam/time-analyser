// Script to create a local dev user with test JIRA credentials and encryption key
import 'dotenv/config';
import { storage } from '../server/storage.ts';
import crypto from 'crypto';

const LOCAL_DEV_USER_ID = 'local-dev-user';
const TEST_JIRA_EMAIL = 'test-jira@example.com';
const TEST_JIRA_API_TOKEN = 'test-jira-api-token';
const TEST_JIRA_HOST = 'https://test-jira.example.com';
const TEST_ENCRYPTION_KEY = crypto.randomBytes(32).toString('hex').slice(0, 32); // 32-char key

async function main() {
  // Upsert user
  await storage.upsertUser({
    id: LOCAL_DEV_USER_ID,
    email: 'local@example.com',
    firstName: 'Local',
    lastName: 'Developer',
    profileImageUrl: null,
    hasCompletedOnboarding: 1,
  });

  // Encrypt token with per-user key
  const { encryptJiraToken } = await import('../server/jira-crypto.ts');
  const encryptedToken = encryptJiraToken(TEST_JIRA_API_TOKEN, TEST_ENCRYPTION_KEY);

  // Upsert user settings
  await storage.upsertUserSettings(LOCAL_DEV_USER_ID, {
    jiraEmail: TEST_JIRA_EMAIL,
    jiraApiToken: encryptedToken,
    jiraHost: TEST_JIRA_HOST,
    jiraEncryptionKey: TEST_ENCRYPTION_KEY,
  });

  console.log('Local dev user and test JIRA credentials created.');
  console.log('LOCAL_USER_ID:', LOCAL_DEV_USER_ID);
  console.log('JIRA ENCRYPTION KEY:', TEST_ENCRYPTION_KEY);
}

main().catch(e => {
  console.error(e);
  process.exit(1);
});

import 'dotenv/config';
import { fetchProjectVersionsRaw } from '../server/jira-client.ts';

async function main() {
  // Sostituisci con un userId valido e un projectKey esistente nel tuo JIRA
  const userId = process.argv[2];
  const projectKey = process.argv[3];
  if (!userId || !projectKey) {
    console.error('Usage: ts-node scripts/test-fetchProjectVersionsRaw.ts <userId> <projectKey>');
    process.exit(1);
  }
  try {
    await fetchProjectVersionsRaw(userId, projectKey);
    console.log('✅ fetchProjectVersionsRaw eseguita con successo');
  } catch (err: any) {
    if (err && err.type && err.message) {
      console.error('❌ Errore strutturato:', JSON.stringify({
        type: err.type,
        message: err.message,
        details: err.details
      }, null, 2));
    } else {
      console.error('❌ Errore durante il test:', err);
    }
  }
}

main();

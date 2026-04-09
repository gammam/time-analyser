import 'dotenv/config';
import { fetchEpicsWithChangelog } from '../server/jira-client.ts';

async function main() {
  // Sostituisci con un userId valido e un projectKey esistente nel tuo JIRA
  const userId = process.argv[2] || 'local-dev-user';
  const projectKey = process.argv[3] || 'PN';
  const team = process.argv[4]; // opzionale
  const from = process.argv[5]; // opzionale, es. "2026-01-01"
  const to = process.argv[6]; // opzionale, es. "2026-12-31"

  console.log('🔍 Test fetchEpicsWithChangelog con parametri:');
  console.log(`  userId: ${userId}`);
  console.log(`  projectKey: ${projectKey}`);
  console.log(`  team: ${team || 'N/A'}`);
  console.log(`  from: ${from || 'N/A'}`);
  console.log(`  to: ${to || 'N/A'}`);
  console.log('');

  try {
    const epics = await fetchEpicsWithChangelog(userId, projectKey, team, from, to);
    
    console.log('✅ fetchEpicsWithChangelog eseguita con successo');
    console.log(`Total epics found: ${epics?.length || 0}`);
    
    if (epics && epics.length > 0) {
      console.log('\n📋 Prima epic:');
      const firstEpic = epics[0];
      console.log(`  Key: ${firstEpic.key}`);
      console.log(`  Summary: ${firstEpic.fields?.summary}`);
      console.log(`  Created: ${firstEpic.fields?.created}`);
      console.log(`  Status: ${firstEpic.fields?.status?.name}`);
      console.log(`  Release Date: ${firstEpic.fields?.releaseDate}`);
      console.log(`  Changelog entries: ${firstEpic.changelog?.histories?.length || 0}`);
      
      if (firstEpic.changelog?.histories && firstEpic.changelog.histories.length > 0) {
        console.log(`  Sample changelog entry:`);
        const firstHistory = firstEpic.changelog.histories[0];
        console.log(`    Date: ${firstHistory.created}`);
        console.log(`    Author: ${firstHistory.author?.displayName}`);
        console.log(`    Items: ${firstHistory.items?.map((i: any) => `${i.field}=${i.toString}`).join(', ')}`);
      }
    }
    
    console.log('\n✅ Test completato con successo');
  } catch (err: any) {
    if (err && err.type && err.message) {
      console.error('❌ Errore strutturato:', JSON.stringify({
        type: err.type,
        message: err.message,
        details: err.details
      }, null, 2));
    } else {
      console.error('❌ Errore durante il test:', err?.message || err);
    }
    process.exit(1);
  }
}

main();

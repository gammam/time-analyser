import 'dotenv/config';
import { fetchSendAnalysisWorklogs } from '../server/jira-client.ts';

async function main() {
  const userId = process.argv[2] || 'local-dev-user';
  const projectKey = process.argv[3] || 'PN';
  const from = process.argv[4] || '2026-04-01';
  const to = process.argv[5] || '2026-04-20';

  console.log('Test fetchSendAnalysisWorklogs with params:');
  console.log(`  userId:     ${userId}`);
  console.log(`  projectKey: ${projectKey}`);
  console.log(`  from:       ${from}`);
  console.log(`  to:         ${to}`);
  console.log('');

  try {
    const result = await fetchSendAnalysisWorklogs({ userId, projectKey, timeRange: { from, to } });
    console.log(`\nDone. Epics found: ${result.length}`);
    console.log(JSON.stringify(result, null, 2));
  } catch (err: any) {
    console.error('Error:', err?.message || err);
    process.exit(1);
  }
}

main();

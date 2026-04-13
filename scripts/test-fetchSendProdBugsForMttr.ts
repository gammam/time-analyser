import 'dotenv/config';
import { fetchSendProdBugsForMttr } from '../server/jira-client.ts';
import { parseMttrCliArgs } from './mttr-cli-args.ts';

async function main() {
  const parsed = parseMttrCliArgs(process.argv.slice(2));
  if (!parsed.valid) {
    console.error(parsed.message);
    process.exit(1);
  }

  const { userId, projectKey, team, from, to } = parsed;

  console.log('Test fetchSendProdBugsForMttr with params:');
  console.log(`  userId: ${userId}`);
  console.log(`  projectKey: ${projectKey}`);
  console.log(`  team: ${team || 'N/A'}`);
  console.log(`  from: ${from}`);
  console.log(`  to: ${to}`);

  try {
    const issues = await fetchSendProdBugsForMttr(userId, projectKey, team, from, to);

    console.log(`\nDone. SEND prod bugs found: ${issues.length}`);
    console.log(`\Issues: ${JSON.stringify(issues, null, 2)}`);

    const wrongType = issues.filter((issue: any) => issue.issueType !== '[SEND] Bug Prod');
    if (wrongType.length > 0) {
      console.warn(`Warning: found ${wrongType.length} non-[SEND] Bug Prod issues`);
    } else {
      console.log('All issues are [SEND] Bug Prod');
    }

    const resolved = issues.filter((issue: any) => !!issue.resolutionDate);
    const unresolved = issues.length - resolved.length;
    console.log(`Resolved issues: ${resolved.length}`);
    console.log(`Unresolved issues: ${unresolved}`);

    if (issues.length > 0) {
      console.log('\nFirst 5 issues:');
      for (const issue of issues.slice(0, 5)) {
        console.log(
          `- ${issue.key} | created: ${issue.created || 'N/A'} | resolutionDate: ${issue.resolutionDate || 'N/A'} | status: ${issue.status || 'N/A'}`,
        );
      }
    }

    console.log('\nfetchSendProdBugsForMttr test completed successfully');
  } catch (err: any) {
    if (err && err.type && err.message) {
      console.error(
        'Structured error:',
        JSON.stringify(
          {
            type: err.type,
            message: err.message,
            details: err.details,
          },
          null,
          2,
        ),
      );
    } else {
      console.error('Error during test:', err?.message || err);
    }
    process.exit(1);
  }
}

main();

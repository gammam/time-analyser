import 'dotenv/config';
import {
  fetchProjectVersionsRaw,
  fetchProductionBugsForReleases,
} from '../server/jira-client.ts';

function toDateSafe(value: string | undefined): Date | null {
  if (!value) return null;
  const d = new Date(value);
  return isNaN(d.getTime()) ? null : d;
}

async function main() {
  const userId = process.argv[2] || 'local-dev-user';
  const projectKey = process.argv[3] || 'PN';
  const team = process.argv[4];
  const from = process.argv[5] || '2026-03-01';
  const to = process.argv[6] || '2026-03-31';

  const fromDate = toDateSafe(from);
  const toDate = toDateSafe(to);
  if (!fromDate || !toDate) {
    console.error('Usage: tsx scripts/test-fetchProductionBugsForReleases.ts <userId> <projectKey> [team] [from] [to]');
    console.error('Example: tsx scripts/test-fetchProductionBugsForReleases.ts local-dev-user PN TeamA 2026-03-01 2026-03-31');
    process.exit(1);
  }

  console.log('🔍 Test fetchProductionBugsForReleases con parametri:');
  console.log(`  userId: ${userId}`);
  console.log(`  projectKey: ${projectKey}`);
  console.log(`  team: ${team || 'N/A'}`);
  console.log(`  from: ${from}`);
  console.log(`  to: ${to}`);

  try {
    const versions = await fetchProjectVersionsRaw(userId, projectKey);
    const versionList = Array.isArray(versions)
      ? versions
      : (Array.isArray((versions as any)?.values) ? (versions as any).values : []);

    const filteredReleases = versionList.filter((v: any) => {
      if (!v?.released || !v?.releaseDate) return false;
      const releaseDate = new Date(v.releaseDate);
      if (isNaN(releaseDate.getTime())) return false;
      if (releaseDate < fromDate || releaseDate > toDate) return false;
      return true;
    });

    const releaseNames = filteredReleases
      .map((v: any) => v?.name)
      .filter((name: any) => typeof name === 'string' && name.length > 0);

    console.log(`\n📦 Release nel periodo: ${releaseNames.length}`);
    if (releaseNames.length > 0) {
      console.log(`  Sample: ${releaseNames.slice(0, 10).join(', ')}`);
    }

    const bugs = await fetchProductionBugsForReleases(
      userId,
      projectKey,
      releaseNames,
      team,
      from,
      to,
    );

    console.log(`\n✅ Query completata. Bug produzione trovati: ${bugs.length}`);

    const wrongType = bugs.filter((b: any) => b.issueType !== '[SEND] Bug Prod');
    if (wrongType.length > 0) {
      console.warn(`⚠️ Trovati ${wrongType.length} issue con tipo diverso da [SEND] Bug Prod`);
    } else {
      console.log('✅ Tutte le issue sono di tipo [SEND] Bug Prod');
    }

    const withMapping = bugs.filter((b: any) => Array.isArray(b.releaseNames) && b.releaseNames.length > 0);
    const withoutMapping = bugs.length - withMapping.length;
    console.log(`🔗 Issue con mapping versione: ${withMapping.length}`);
    console.log(`❔ Issue senza mapping versione: ${withoutMapping}`);

    if (bugs.length > 0) {
      console.log('\n📋 Prime 5 issue:');
      for (const issue of bugs.slice(0, 5)) {
        console.log(`- ${issue.key} | ${issue.issueType} | releases: ${(issue.releaseNames || []).join(', ') || 'N/A'}`);
      }
    }

    console.log('\n✅ Test fetchProductionBugsForReleases completato con successo');
  } catch (err: any) {
    if (err && err.type && err.message) {
      console.error('❌ Errore strutturato:', JSON.stringify({
        type: err.type,
        message: err.message,
        details: err.details,
      }, null, 2));
    } else {
      console.error('❌ Errore durante il test:', err?.message || err);
    }
    process.exit(1);
  }
}

main();

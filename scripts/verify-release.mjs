import { readFile, appendFile, access } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';

// Stable provenance is this original-repository commit itself. Never read a
// beta distribution mapping, fetch a different source tree, or accept a tag/PR.
const sourceRepository = 'check5004/scrap-vector-lab';
const releaseVersion = '0.3.0';
const allowedRefs = new Set(['refs/heads/main', 'refs/heads/release/0.3.0']);
if (process.env.GITHUB_REPOSITORY !== sourceRepository || !allowedRefs.has(process.env.GITHUB_REF)) {
  throw Error('Stable verification requires the original repository main or release/0.3.0 branch.');
}
const commit = process.env.GITHUB_SHA;
if (!/^[a-f0-9]{40}$/.test(commit ?? '')) throw Error('Missing full stable source commit.');
const checkoutCommit = execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim();
if (checkoutCommit !== commit) throw Error('Stable source commit must match the checked-out commit.');
if (process.env.SCRAP_SOURCE_COMMIT !== undefined && process.env.SCRAP_SOURCE_COMMIT !== commit) {
  throw Error('Stable source override must match the checked-out commit.');
}
try {
  await access('release-source.json');
  throw Error('Stable releases must not contain a beta distribution source mapping.');
} catch (error) {
  if (error.code !== 'ENOENT') throw error;
}
const { version } = JSON.parse(await readFile('package.json', 'utf8'));
if (version !== releaseVersion) throw Error('Expected stable release version 0.3.0.');
const lock = JSON.parse(await readFile('package-lock.json', 'utf8'));
if (lock.version !== version || lock.packages?.['']?.version !== version) throw Error('Package lock release versions differ.');
const buildInfo = await readFile('src/build-info.ts', 'utf8');
if (!/^export const RELEASE_VERSION = '0\.3\.0';$/m.test(buildInfo)) throw Error('Package and application stable release versions differ.');
if (!/^  channel: 'stable',$/m.test(buildInfo)) throw Error('Expected stable build channel.');
if (!/^  source_repository: 'check5004\/scrap-vector-lab',$/m.test(buildInfo)) throw Error('Unexpected stable source repository.');
if (!/^  source_commit: SOURCE_COMMIT,$/m.test(buildInfo)) throw Error('Stable build must use the verified source commit.');

// Emit deploy authorization only after every check succeeds. Failed validation
// must never leave an environment override or a successful stable output.
if (process.env.GITHUB_ENV) await appendFile(process.env.GITHUB_ENV, `SCRAP_SOURCE_COMMIT=${commit}\n`);
if (process.env.GITHUB_OUTPUT) await appendFile(process.env.GITHUB_OUTPUT, `stable=true\nsource_commit=${commit}\n`);
console.log(`Stable source version: ${version}+${commit.slice(0, 7)}`);

import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, readFileSync, writeFileSync, existsSync, chmodSync, rmSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const script = fileURLToPath(new URL('../scripts/verify-release.mjs', import.meta.url));
const buildInfo = readFileSync(new URL('../src/build-info.ts', import.meta.url), 'utf8');
const repository = 'check5004/scrap-vector-lab';
type Fixture = {
  env?: Record<string, string | undefined>;
  packageVersion?: string;
  lockVersion?: string;
  lockRootVersion?: string;
  buildInfo?: string;
  mapping?: boolean;
  matchingSourceOverride?: boolean;
  checkoutSha?: string;
  gitFailure?: boolean;
};
function verify(fixture: Fixture = {}) {
  const cwd = mkdtempSync(join(tmpdir(), 'scrap-stable-verifier-'));
  try {
    mkdirSync(join(cwd, 'src'));
    writeFileSync(join(cwd, 'package.json'), JSON.stringify({ version: fixture.packageVersion ?? '0.3.0' }));
    writeFileSync(join(cwd, 'package-lock.json'), JSON.stringify({ version: fixture.lockVersion ?? '0.3.0', packages: { '': { version: fixture.lockRootVersion ?? '0.3.0' } } }));
    writeFileSync(join(cwd, 'src/build-info.ts'), fixture.buildInfo ?? buildInfo);
    if (fixture.mapping) writeFileSync(join(cwd, 'release-source.json'), JSON.stringify({ repository, commit: 'e'.repeat(40) }));
    // The Docker build image has no Git dependency. This controlled Git test
    // double checks the exact read-only command and returns a synthetic SHA;
    // the real CI verifier still resolves the actual checkout using Git.
    const sha = '0123456789abcdef0123456789abcdef01234567';
    const bin = join(cwd, 'bin'); mkdirSync(bin);
    const fakeGit = join(bin, 'git');
    writeFileSync(fakeGit, `#!/bin/sh\n[ "$#" = 2 ] && [ "$1" = rev-parse ] && [ "$2" = HEAD ] || exit 19\n${fixture.gitFailure ? 'exit 20' : `printf '%s\\n' '${fixture.checkoutSha ?? sha}'`}\n`);
    chmodSync(fakeGit, 0o755);
    // Only ordinary process runtime settings are needed; never forward real
    // credentials, a parent's CI outputs, or a pre-existing source override.
    const env: NodeJS.ProcessEnv = {
      PATH: `${bin}:${process.env.PATH ?? ''}`, SystemRoot: process.env.SystemRoot,
      GITHUB_REPOSITORY: repository, GITHUB_REF: 'refs/heads/main', GITHUB_SHA: sha,
      GITHUB_ENV: join(cwd, 'verified.env'), GITHUB_OUTPUT: join(cwd, 'verified.outputs'),
      ...(fixture.matchingSourceOverride ? { SCRAP_SOURCE_COMMIT: sha } : {}),
      ...fixture.env,
    };
    const result = spawnSync(process.execPath, [script], { cwd, env, encoding: 'utf8' });
    return {
      status: result.status, output: result.stdout + result.stderr, sha,
      env: existsSync(env.GITHUB_ENV!) ? readFileSync(env.GITHUB_ENV!, 'utf8') : '',
      outputs: existsSync(env.GITHUB_OUTPUT!) ? readFileSync(env.GITHUB_OUTPUT!, 'utf8') : '',
    };
  } finally { rmSync(cwd, { recursive: true, force: true }); }
}

for (const ref of ['refs/heads/main', 'refs/heads/release/0.3.0']) {
  test(`stable verifier accepts original-repository ${ref} and emits only its own full source SHA`, () => {
    const result = verify({ env: { GITHUB_REF: ref } });
    assert.equal(result.status, 0, result.output);
    assert.equal(result.env, `SCRAP_SOURCE_COMMIT=${result.sha}\n`);
    assert.equal(result.outputs, `stable=true\nsource_commit=${result.sha}\n`);
    assert.match(result.output, /^Stable source version: 0\.3\.0\+[a-f0-9]{7}\n$/);
  });
}
test('stable verifier accepts a pre-set source override only when it matches the verified checkout', () => {
  const result = verify({ matchingSourceOverride: true });
  assert.equal(result.status, 0, result.output);
  assert.equal(result.env, `SCRAP_SOURCE_COMMIT=${result.sha}\n`);
});
const rejected: [string, Fixture][] = [
  ['unreadable checkout identity', { gitFailure: true }],
  ['different checkout identity', { checkoutSha: 'f'.repeat(40) }],
  ['beta repository main', { env: { GITHUB_REPOSITORY: 'check5004/scrap-vector-lab-beta' } }],
  ['beta repository release branch', { env: { GITHUB_REPOSITORY: 'check5004/scrap-vector-lab-beta', GITHUB_REF: 'refs/heads/release/0.3.0' } }],
  ['fork main', { env: { GITHUB_REPOSITORY: 'someone/scrap-vector-lab' } }],
  ['missing repository', { env: { GITHUB_REPOSITORY: undefined } }],
  ...['refs/heads/beta/auto-threshold-20261019', 'refs/heads/release/0.3.1', 'refs/heads/release/0.3.0-extra', 'refs/heads/feature/test', 'refs/tags/v0.3.0', 'refs/pull/1/merge', 'main', ''].map(ref => [`unrelated ref ${ref || '(empty)'}`, { env: { GITHUB_REF: ref } }] as [string, Fixture]),
  ['missing source SHA', { env: { GITHUB_SHA: undefined } }],
  ['short source SHA', { env: { GITHUB_SHA: '1234567' } }],
  ['uppercase source SHA', { env: { GITHUB_SHA: 'A'.repeat(40) } }],
  ['different full source SHA', { env: { GITHUB_SHA: 'e'.repeat(40) } }],
  ['different source override', { env: { SCRAP_SOURCE_COMMIT: 'e'.repeat(40) } }],
  ['local source override', { env: { SCRAP_SOURCE_COMMIT: 'local' } }],
  ['beta release version', { packageVersion: '0.3.0-dev.3' }],
  ['unreviewed stable version', { packageVersion: '0.3.1' }],
  ['stale lock version', { lockVersion: '0.3.0-dev.3' }],
  ['stale root lock version', { lockRootVersion: '0.3.0-dev.3' }],
  ['mismatched app version', { buildInfo: buildInfo.replace("RELEASE_VERSION = '0.3.0'", "RELEASE_VERSION = '0.3.0-dev.3'") }],
  ['beta build channel', { buildInfo: buildInfo.replace("channel: 'stable'", "channel: 'beta'") }],
  ['wrong build repository', { buildInfo: buildInfo.replace("source_repository: 'check5004/scrap-vector-lab'", "source_repository: 'check5004/scrap-vector-lab-beta'") }],
  ['hard-coded source commit', { buildInfo: buildInfo.replace('source_commit: SOURCE_COMMIT', "source_commit: 'local'") }],
  ['distribution mapping', { mapping: true }],
];
for (const [name, fixture] of rejected) {
  test(`stable verifier rejects ${name} without emitting deployment authorization`, () => {
    const result = verify(fixture);
    assert.notEqual(result.status, 0);
    assert.equal(result.env, ''); assert.equal(result.outputs, '');
    assert.doesNotMatch(result.output, /Stable source version:/);
  });
}

test('production Pages workflow preserves full verification and requires stable guard plus exact repository/main', () => {
  const workflow = readFileSync(new URL('../.github/workflows/verify-and-pages.yml', import.meta.url), 'utf8');
  assert.match(workflow, /branches: \[main, "release\/0\.3\.0"\]/);
  assert.doesNotMatch(workflow, /pull_request:|scrap-vector-lab-beta/);
  for (const step of ['node scripts/verify-release.mjs', 'python scripts/generate_samples.py', 'npm run assets', 'npm test', 'npm run build', 'npm run test:browser', 'docker build', 'docker run', 'APP_URL=http://127.0.0.1:8080', 'sha256sum -c -']) assert.ok(workflow.includes(step), `Missing ${step}`);
  const gates = workflow.split('\n').filter(line => line.includes('if:') && line.includes('github.repository'));
  assert.equal(gates.length, 2);
  for (const gate of gates) {
    assert.ok(gate.includes("outputs.stable == 'true'"));
    assert.ok(gate.includes("github.repository == 'check5004/scrap-vector-lab'"));
    assert.ok(gate.includes("github.ref == 'refs/heads/main'"));
    assert.ok(gate.includes("github.event_name == 'push' || github.event_name == 'workflow_dispatch'"));
  }
  assert.match(workflow, /stable: \$\{\{ steps\.release\.outputs\.stable \}\}/);
});

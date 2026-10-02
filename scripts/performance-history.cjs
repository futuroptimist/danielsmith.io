#!/usr/bin/env node
/* Generate private, ignored evidence without modifying the caller's checkout. */
const { spawn, spawnSync } = require('node:child_process');
const { createHash, randomBytes } = require('node:crypto');
const fs = require('node:fs');
const http = require('node:http');
const os = require('node:os');
const path = require('node:path');

const HARNESS_FILES = [
  'playwright.config.ts',
  'playwright/immersive-performance.spec.ts',
  'playwright/helpers/performanceResult.ts',
  'src/app/performanceResult.ts',
  'src/scene/performance/performanceDiagnostics.ts',
];
const ownedWorktrees = new WeakSet();
const hash = (value) => createHash('sha256').update(value).digest('hex');
const RUNNER_SHA256 = hash(fs.readFileSync(__filename));
function git(repo, args) {
  const result = spawnSync('git', ['-C', repo, ...args], { encoding: 'utf8' });
  if (result.status !== 0)
    throw new Error(`git ${args[0]} failed: ${result.stderr.trim()}`);
  return result.stdout.trim();
}
function blob(repo, commit, file) {
  const result = spawnSync('git', ['-C', repo, 'show', `${commit}:${file}`]);
  if (result.status !== 0) throw new Error(`Missing historical file: ${file}`);
  return result.stdout;
}
function parseArgs(args) {
  const options = {
    refs: [],
    output: null,
    checkOnly: false,
    smoke: false,
    routeProfile: 'common',
  };
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === '--check-only') options.checkOnly = true;
    else if (arg === '--smoke') options.smoke = true;
    else if (arg === '--output' || arg === '--route-profile') {
      const value = args[++i];
      if (!value || value.startsWith('-'))
        throw new Error(`${arg} requires a value`);
      if (arg === '--output') {
        if (options.output !== null) throw new Error('Duplicate --output');
        options.output = value;
      } else {
        if (!['common', 'basement'].includes(value))
          throw new Error('Route profile must be common or basement');
        options.routeProfile = value;
      }
    } else if (/^[A-Za-z0-9_./@~^:-]+$/.test(arg) && !arg.startsWith('-'))
      options.refs.push(arg);
    else throw new Error(`Unsupported argument: ${arg}`);
  }
  if (!options.refs.length)
    throw new Error('Provide one or more Git commit refs');
  return options;
}
function resolveRefs(repo, refs) {
  const resolved = refs.map((ref) => ({
    ref,
    commit: git(repo, [
      'rev-parse',
      '--verify',
      '--end-of-options',
      `${ref}^{commit}`,
    ]),
  }));
  if (
    resolved.some(
      ({ commit }) => !/^(?:[a-f0-9]{40}|[a-f0-9]{64})$/.test(commit)
    )
  )
    throw new Error('Invalid resolved commit identity');
  if (new Set(resolved.map(({ commit }) => commit)).size !== resolved.length)
    throw new Error('Duplicate resolved commits');
  return resolved;
}
function inspectRef(repo, commit) {
  const reasons = [];
  let lockSha256 = null;
  try {
    lockSha256 = hash(blob(repo, commit, 'package-lock.json'));
    if (
      lockSha256 !== hash(fs.readFileSync(path.join(repo, 'package-lock.json')))
    )
      reasons.push('lockfile mismatch: dependencies are not comparable');
  } catch {
    reasons.push('lockfile unavailable');
  }
  for (const file of HARNESS_FILES) {
    try {
      if (
        hash(blob(repo, commit, file)) !==
        hash(fs.readFileSync(path.join(repo, file)))
      )
        reasons.push(`harness mismatch: ${file}`);
    } catch {
      reasons.push(`harness unavailable: ${file}`);
    }
  }
  let source = '';
  try {
    source = git(repo, ['show', `${commit}:src/immersiveScene.ts`]);
  } catch {
    reasons.push('immersive source unavailable');
  }
  for (const api of [
    'stepPlayerForTest',
    'getPlayerPosition',
    'getStairMetrics',
    'getFloorVisibilitySnapshot',
  ]) {
    if (!source.includes(api)) reasons.push(`debug API unavailable: ${api}`);
  }
  return { compatible: reasons.length === 0, reasons, lockSha256 };
}
function reserveOutput(repo, requested) {
  const output = path.resolve(
    repo,
    requested ??
      `.performance-history/${new Date().toISOString().replaceAll(':', '-')}-${randomBytes(4).toString('hex')}`
  );
  const relative = path.relative(repo, output);
  if (!relative || relative.startsWith('..') || path.isAbsolute(relative))
    throw new Error(
      'Output must be inside this repository under a gitignored directory'
    );
  let current = repo;
  for (const piece of relative.split(path.sep)) {
    current = path.join(current, piece);
    if (fs.existsSync(current) && fs.lstatSync(current).isSymbolicLink())
      throw new Error('Output path must not contain symlinks');
  }
  const ignored = spawnSync('git', [
    '-C',
    repo,
    'check-ignore',
    '--quiet',
    '--no-index',
    `${relative}/capture-sentinel.json`,
  ]);
  if (ignored.status !== 0)
    throw new Error('Output directory is not gitignored');
  fs.mkdirSync(path.dirname(output), { recursive: true });
  fs.mkdirSync(output); // exclusive: never replace even an empty prior attempt
  return output;
}
function createOwnedWorktree(repo, output, commit) {
  const worktree = path.join(output, 'worktree');
  if (fs.existsSync(worktree))
    throw new Error('Worktree destination already exists');
  git(repo, ['worktree', 'add', '--detach', worktree, commit]);
  const owned = Object.freeze({
    repo: fs.realpathSync(repo),
    worktree: fs.realpathSync(worktree),
    output: fs.realpathSync(output),
    commit,
  });
  ownedWorktrees.add(owned);
  return owned;
}
function cleanupOwnedWorktree(owned) {
  if (
    !ownedWorktrees.has(owned) ||
    owned.worktree === owned.repo ||
    path.dirname(owned.worktree) !== owned.output ||
    path.basename(owned.worktree) !== 'worktree'
  )
    throw new Error('Refusing cleanup of an unowned worktree');
  if (git(owned.worktree, ['rev-parse', 'HEAD']) !== owned.commit)
    return { state: 'preserved', reason: 'worktree HEAD changed' };
  if (git(owned.worktree, ['status', '--porcelain', '--untracked-files=all']))
    return {
      state: 'preserved',
      reason: 'worktree has tracked or untracked changes',
    };
  const ignored = git(owned.worktree, [
    'ls-files',
    '--others',
    '--ignored',
    '--exclude-standard',
  ])
    .split('\n')
    .filter(Boolean);
  if (
    ignored.some(
      (file) =>
        file !== 'node_modules' &&
        !file.startsWith('node_modules/') &&
        !file.startsWith('test-results/')
    )
  )
    return {
      state: 'preserved',
      reason: 'worktree has unexpected ignored files',
    };
  // No --force and no recursive rm: Git refuses dirty worktrees; caller checkout is never reset.
  git(owned.repo, ['worktree', 'remove', owned.worktree]);
  ownedWorktrees.delete(owned);
  return { state: 'removed' };
}
function writeJson(file, value) {
  fs.writeFileSync(file, `${JSON.stringify(value, null, 2)}\n`);
}
function start(command, args, cwd, logPath, signal) {
  const log = fs.createWriteStream(logPath, { flags: 'wx' });
  const child = spawn(command, args, {
    cwd,
    env: { ...process.env, CI: 'true' },
    detached: process.platform !== 'win32',
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  child.stdout.pipe(log, { end: false });
  child.stderr.pipe(log, { end: false });
  let killTimer;
  const stop = () => {
    try {
      process.kill(
        process.platform === 'win32' ? child.pid : -child.pid,
        'SIGTERM'
      );
      killTimer ??= setTimeout(() => {
        try {
          process.kill(
            process.platform === 'win32' ? child.pid : -child.pid,
            'SIGKILL'
          );
        } catch {
          /* Already exited. */
        }
      }, 10000);
      killTimer.unref();
    } catch {
      /* Already exited. */
    }
  };
  signal?.addEventListener('abort', stop, { once: true });
  const done = new Promise((resolve) => {
    child.once('error', (error) => {
      log.write(`${error.message}\n`);
    });
    child.once('close', (code, terminatingSignal) => {
      clearTimeout(killTimer);
      signal?.removeEventListener('abort', stop);
      log.end(() => resolve({ code, signal: terminatingSignal }));
    });
  });
  const running = { child, done, stop, ready: false };
  let banner = '';
  child.stdout.on('data', (chunk) => {
    banner = (banner + chunk.toString()).slice(-4096);
    if (banner.includes('http://127.0.0.1:5173/')) running.ready = true;
  });
  return running;
}
async function execute(command, args, cwd, logPath, signal) {
  if (signal?.aborted) throw new Error('Capture cancelled');
  const running = start(command, args, cwd, logPath, signal);
  const timeout = setTimeout(running.stop, 15 * 60 * 1000);
  try {
    return await running.done;
  } finally {
    clearTimeout(timeout);
  }
}
async function waitForServer(server, signal) {
  const deadline = Date.now() + 120000;
  while (Date.now() < deadline) {
    if (signal?.aborted) throw new Error('Capture cancelled');
    if (server.child.exitCode !== null || server.child.signalCode !== null)
      throw new Error(
        'Vite server exited; existing server is never reused or stopped'
      );
    if (!server.ready) {
      await new Promise((resolve) => setTimeout(resolve, 100));
      continue;
    }
    const ready = await new Promise((resolve) => {
      const request = http.get(
        'http://127.0.0.1:5173/runtime/build-info.json',
        (response) => {
          response.resume();
          resolve(response.statusCode === 200);
        }
      );
      request.on('error', () => resolve(false));
      request.setTimeout(1000, () => {
        request.destroy();
        resolve(false);
      });
    });
    if (ready && server.ready) return;
    await new Promise((resolve) => setTimeout(resolve, 200));
  }
  throw new Error('Vite readiness timed out');
}
function resultState(results, sourceClean, smoke) {
  if (
    !results.every(
      (result) => result.exitCode === 0 && result.result?.state === 'completed'
    )
  )
    return 'failed-or-unavailable';
  if (!sourceClean) return 'failed-source-drift';
  return smoke ? 'smoke-completed' : 'completed';
}
function artifactChecksums(root) {
  const artifacts = [];
  const visit = (directory) => {
    for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
      if (entry.name === 'worktree' || entry.isSymbolicLink()) continue;
      const file = path.join(directory, entry.name);
      if (entry.isDirectory()) visit(file);
      else if (entry.isFile() && file !== path.join(root, 'checksums.json'))
        artifacts.push({
          path: path.relative(root, file),
          sha256: hash(fs.readFileSync(file)),
          bytes: fs.statSync(file).size,
        });
    }
  };
  visit(root);
  return artifacts.sort((left, right) => left.path.localeCompare(right.path));
}
function summarize(entries) {
  return entries.map((entry) => ({
    commit: entry.commit,
    state: entry.state,
    compatibility: entry.compatibility,
    routeProfile: entry.routeProfile,
    routeHelperSha256: entry.routeHelperSha256,
    skippedRouteCapabilities: entry.skippedRouteCapabilities,
    controlled: (entry.controlled ?? []).map((run) => ({
      attempt: run.attempt,
      exitCode: run.exitCode,
      state: run.result?.state ?? 'missing',
      readyMs: run.result?.applicationReady?.medianMs ?? null,
      dispatchP95Ms: run.result?.interactionLatency?.p95Ms ?? null,
      frameTimeState: run.result?.frameTime?.state ?? 'missing',
    })),
    checkpoints: (entry.routes ?? []).map((run) => ({
      attempt: run.attempt,
      state: run.result?.state ?? 'missing',
      values: (run.result?.checkpoints ?? []).map((point) => ({
        name: point.name,
        ...point.snapshot.rendererCounters,
      })),
    })),
  }));
}
async function run(args, options = {}) {
  const parsed = parseArgs(args);
  const repo = fs.realpathSync(
    git(options.cwd ?? process.cwd(), ['rev-parse', '--show-toplevel'])
  );
  const refs = resolveRefs(repo, parsed.refs); // validate all refs before creating anything
  const output = reserveOutput(repo, parsed.output);
  const helper = path.join(__dirname, 'capture-performance-route.cjs');
  const manifest = {
    schemaVersion: 1,
    runnerSha256: RUNNER_SHA256,
    callerSourceCommit: git(repo, ['rev-parse', 'HEAD']),
    callerTreeDirty:
      git(repo, ['status', '--porcelain', '--untracked-files=all']) !== '',
    startedAt: new Date().toISOString(),
    node: process.version,
    npm:
      spawnSync('npm', ['--version'], { encoding: 'utf8' }).stdout?.trim() ??
      null,
    tools: Object.fromEntries(
      ['@playwright/test', 'vite'].map((name) => {
        try {
          return [
            name,
            JSON.parse(
              fs.readFileSync(
                path.join(repo, 'node_modules', name, 'package.json'),
                'utf8'
              )
            ).version,
          ];
        } catch {
          return [name, null];
        }
      })
    ),
    platform: `${os.platform()} ${os.release()} ${os.arch()}`,
    logicalCpus: os.cpus().length,
    ramBytes: os.totalmem(),
    renderer:
      'determined by each recorded result; software is not hardware timing',
    helperSha256: hash(fs.readFileSync(helper)),
    requestedRouteProfile: parsed.routeProfile,
    checkOnly: parsed.checkOnly,
    purpose: parsed.smoke
      ? 'non-authoritative command lifecycle smoke; concurrent workload may be active'
      : 'three-attempt measured history; operator must verify comparable conditions',
    attemptsPerCommit: parsed.smoke ? 1 : 3,
    entries: [],
  };
  for (const ref of refs) {
    if (options.signal?.aborted) break;
    const entry = {
      ...ref,
      compatibility: inspectRef(repo, ref.commit),
      state: 'pending',
      routeProfile: 'common',
      skippedRouteCapabilities: [],
    };
    let historicalRoute = null;
    if (parsed.routeProfile === 'basement') {
      try {
        const candidate = blob(
          repo,
          ref.commit,
          'scripts/capture-performance-route.cjs'
        );
        const basementDefinition = blob(
          repo,
          ref.commit,
          'src/scene/level/basementStair.ts'
        ).toString();
        if (
          !candidate.toString().includes('--basement') ||
          !basementDefinition.includes('basement-ground')
        )
          throw new Error('basement route capability unavailable');
        historicalRoute = candidate;
        entry.routeProfile = 'basement';
      } catch {
        entry.skippedRouteCapabilities.push({
          capability: 'basement',
          reason:
            'No versioned basement helper and connection in this commit; common route retained',
        });
      }
    }
    entry.routeHelperSha256 = hash(historicalRoute ?? fs.readFileSync(helper));
    manifest.entries.push(entry);
    if (!entry.compatibility.compatible) {
      entry.state = 'incompatible';
      continue;
    }
    if (parsed.checkOnly) {
      entry.state = 'compatible-not-measured';
      continue;
    }
    const target = path.join(output, ref.commit);
    fs.mkdirSync(target);
    const selectedHelper = historicalRoute
      ? path.join(target, 'capture-performance-route.cjs')
      : helper;
    if (historicalRoute) fs.writeFileSync(selectedHelper, historicalRoute);
    let owned;
    try {
      if (
        !fs.existsSync(
          path.join(repo, 'node_modules/@playwright/test/package.json')
        )
      )
        throw new Error(
          'Install current lockfile dependencies before capture; runner never installs or changes dependencies'
        );
      owned = createOwnedWorktree(repo, target, ref.commit);
      fs.symlinkSync(
        path.join(repo, 'node_modules'),
        path.join(owned.worktree, 'node_modules'),
        'dir'
      );
      entry.controlled = [];
      entry.routes = [];
      for (let attempt = 1; attempt <= manifest.attemptsPerCommit; attempt++) {
        const directory = path.join(target, `controlled-${attempt}`);
        fs.mkdirSync(directory);
        const priorResults = path.join(owned.worktree, 'test-results');
        if (fs.existsSync(priorResults))
          fs.renameSync(
            priorResults,
            path.join(directory, 'preserved-before-run')
          );
        const status = await execute(
          'npm',
          [
            'run',
            'perf:budget',
            '--',
            '--workers=1',
            '--retries=0',
            '--trace=retain-on-failure',
          ],
          owned.worktree,
          path.join(directory, 'output.txt'),
          options.signal
        );
        const results = path.join(owned.worktree, 'test-results');
        if (fs.existsSync(results))
          fs.cpSync(results, path.join(directory, 'test-results'), {
            recursive: true,
          });
        const resultFile = path.join(
          directory,
          'test-results/controlled-performance/controlled-performance-result-v1.json'
        );
        entry.controlled.push({
          attempt,
          exitCode: status.code,
          result: fs.existsSync(resultFile)
            ? JSON.parse(fs.readFileSync(resultFile, 'utf8'))
            : null,
        });
      }
      for (let attempt = 1; attempt <= manifest.attemptsPerCommit; attempt++) {
        // Restart Vite for each route: no silent mixing of cold/warm server conditions.
        const server = start(
          'npm',
          [
            'run',
            'dev',
            '--',
            '--host',
            '127.0.0.1',
            '--port',
            '5173',
            '--strictPort',
          ],
          owned.worktree,
          path.join(target, `route-${attempt}-server.txt`),
          options.signal
        );
        try {
          await waitForServer(server, options.signal);
          const directory = path.join(target, `route-${attempt}`);
          const routeArgs = [selectedHelper, directory];
          if (entry.routeProfile === 'basement') routeArgs.push('--basement');
          const status = await execute(
            process.execPath,
            routeArgs,
            owned.worktree,
            path.join(target, `route-${attempt}-output.txt`),
            options.signal
          );
          const resultFile = path.join(directory, 'route.json');
          entry.routes.push({
            attempt,
            exitCode: status.code,
            result: fs.existsSync(resultFile)
              ? JSON.parse(fs.readFileSync(resultFile, 'utf8'))
              : null,
          });
        } finally {
          server.stop();
          await server.done;
        }
      }
      entry.sourceTreeCleanAfter =
        git(owned.worktree, [
          'status',
          '--porcelain',
          '--untracked-files=all',
        ]) === '';
      entry.state = resultState(
        [...entry.controlled, ...entry.routes],
        entry.sourceTreeCleanAfter,
        parsed.smoke
      );
    } catch (error) {
      entry.state = 'failed';
      entry.reason = error.message;
    } finally {
      if (owned) {
        try {
          entry.cleanup = cleanupOwnedWorktree(owned);
        } catch (error) {
          entry.cleanup = { state: 'preserved', reason: error.message };
        }
      }
      writeJson(path.join(output, 'manifest.json'), manifest);
    }
  }
  manifest.finishedAt = new Date().toISOString();
  manifest.cancelled = options.signal?.aborted ?? false;
  writeJson(path.join(output, 'manifest.json'), manifest);
  writeJson(path.join(output, 'summary.json'), {
    schemaVersion: 1,
    entries: summarize(manifest.entries),
    limitations:
      'Compare only matching browser, renderer, viewport, quality, route, lockfile, and harness profiles. Frame values remain unavailable when unsupported. No budget changes or tracked history writes.',
  });
  writeJson(path.join(output, 'checksums.json'), {
    schemaVersion: 1,
    artifacts: artifactChecksums(output),
  });
  return {
    output,
    manifest,
    success:
      !options.signal?.aborted &&
      manifest.entries.every((entry) =>
        ['completed', 'smoke-completed', 'compatible-not-measured'].includes(
          entry.state
        )
      ),
  };
}
module.exports = {
  parseArgs,
  resolveRefs,
  inspectRef,
  reserveOutput,
  createOwnedWorktree,
  cleanupOwnedWorktree,
  resultState,
  artifactChecksums,
  run,
};
if (require.main === module) {
  const controller = new AbortController();
  process.once('SIGINT', () => controller.abort());
  process.once('SIGTERM', () => controller.abort());
  run(process.argv.slice(2), { signal: controller.signal })
    .then(({ output, manifest, success }) => {
      console.log(
        JSON.stringify(
          {
            output,
            entries: manifest.entries.map(
              ({ commit, state, compatibility }) => ({
                commit,
                state,
                compatibility,
              })
            ),
          },
          null,
          2
        )
      );
      process.exitCode = success ? 0 : 1;
    })
    .catch((error) => {
      console.error(error.message);
      process.exitCode = 1;
    });
}

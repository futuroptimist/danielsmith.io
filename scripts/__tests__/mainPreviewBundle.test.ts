/** @vitest-environment node */
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import {
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

const sha = 'a'.repeat(40);
const helper = path.resolve('.github/scripts/main-preview-bundle.cjs');
const avatar = 'assets/avatar/daniel-animated-avatar.glb';

describe('Main Preview bundle', () => {
  let temp: string;
  let dist: string;
  let bundle: string;

  beforeEach(() => {
    temp = mkdtempSync(path.join(tmpdir(), 'main-preview-test-'));
    dist = path.join(temp, 'dist');
    bundle = path.join(temp, 'output');
    mkdirSync(path.dirname(path.join(dist, avatar)), { recursive: true });
    writeFileSync(path.join(dist, avatar), 'glTF fixture');
    writeFileSync(path.join(dist, 'index.html'), '<title>fixture</title>');
    writeFileSync(
      path.join(dist, 'index.js.map'),
      '{"sourcesContent":["source"]}'
    );
  });

  afterEach(() => rmSync(temp, { force: true, recursive: true }));

  const run = (...args: string[]) =>
    spawnSync(process.execPath, [helper, ...args], { encoding: 'utf8' });

  it('stamps before hashing, strips maps, preserves asset bytes and verifies the stage', () => {
    expect(run('prepare', sha, dist, bundle)).toMatchObject({ status: 0 });
    const read = (name: string) =>
      readFileSync(path.join(bundle, 'site', name));
    const stamp = 'runtime/main-preview.json';
    const inventory = JSON.parse(
      readFileSync(path.join(bundle, 'SHA256SUMS.json'), 'utf8')
    );
    expect(read(avatar)).toEqual(readFileSync(path.join(dist, avatar)));
    expect(JSON.parse(read(stamp).toString())).toEqual({
      schemaVersion: 1,
      sourceSha: sha,
    });
    expect(inventory).toEqual(
      [avatar, 'index.html', stamp].map((name) => ({
        path: name,
        sha256: createHash('sha256').update(read(name)).digest('hex'),
      }))
    );
    expect(run('verify', sha, bundle)).toMatchObject({ status: 0 });
  });

  it('rejects a stale expectation, a tampered asset, and unlisted source maps', () => {
    expect(run('prepare', sha, dist, bundle)).toMatchObject({ status: 0 });
    expect(run('verify', 'b'.repeat(40), bundle)).toMatchObject({
      status: 1,
      stderr: expect.stringContaining('differs from the expected Git commit'),
    });
    const site = path.join(bundle, 'site');
    writeFileSync(path.join(site, 'index.js.map'), '{}');
    expect(run('verify', sha, bundle)).toMatchObject({
      status: 1,
      stderr: expect.stringContaining('Source maps are prohibited'),
    });
    rmSync(path.join(site, 'index.js.map'));
    writeFileSync(path.join(site, avatar), 'modified');
    expect(run('verify', sha, bundle)).toMatchObject({
      status: 1,
      stderr: expect.stringContaining('differ from the checksum inventory'),
    });
  });

  it('rejects links instead of copying assets outside the build', () => {
    writeFileSync(path.join(temp, 'outside.txt'), 'untracked file');
    symlinkSync(path.join(temp, 'outside.txt'), path.join(dist, 'outside.txt'));
    expect(run('prepare', sha, dist, bundle)).toMatchObject({
      status: 1,
      stderr: expect.stringContaining('only directories and regular files'),
    });
  });

  it('rejects incomplete inputs and refuses to write over an existing output', () => {
    expect(run('prepare', sha.slice(0, 7), dist, bundle).status).toBe(1);
    mkdirSync(bundle);
    expect(run('prepare', sha, dist, bundle).status).toBe(1);
    rmSync(path.join(dist, avatar));
    expect(run('prepare', sha, dist, path.join(temp, 'new')).stderr).toContain(
      'lacks required preview assets'
    );
  });
});

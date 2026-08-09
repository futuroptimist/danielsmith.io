import { execFile } from 'node:child_process';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { promisify } from 'node:util';

import { afterEach, describe, expect, it } from 'vitest';

const execFileAsync = promisify(execFile);
const temporaryDirectories: string[] = [];

afterEach(async () => {
  await Promise.all(
    temporaryDirectories
      .splice(0)
      .map((directory) => rm(directory, { recursive: true, force: true }))
  );
});

describe('resume ATS smoke policy', () => {
  it('accepts extracted text without a line-ending broken word', async () => {
    const result = await runSmoke('Summary\nReliable systems\n');

    expect(result.exitCode).toBe(0);
    expect(result.summary).toContain(
      '✅ No line-ending broken words in plain extraction'
    );
  }, 15_000);

  it('rejects a word split by a line-ending hyphen', async () => {
    const result = await runSmoke('Summary\nincident run-\nbooks\n');

    expect(result.exitCode).toBe(1);
    expect(result.output).toContain(
      'No line-ending broken words in plain extraction: n-\\nb'
    );
    expect(result.summary).toContain(
      '❌ No line-ending broken words in plain extraction'
    );
  }, 15_000);
});

async function runSmoke(plainText: string): Promise<{
  exitCode: number;
  output: string;
  summary: string;
}> {
  const directory = await mkdtemp(path.join(tmpdir(), 'resume-ats-smoke-'));
  temporaryDirectories.push(directory);
  const paths = {
    config: path.join(directory, 'config.json'),
    layout: path.join(directory, 'layout.txt'),
    pdfInfo: path.join(directory, 'pdfinfo.txt'),
    plain: path.join(directory, 'plain.txt'),
    summary: path.join(directory, 'summary.md'),
  };

  await Promise.all([
    writeFile(
      paths.config,
      JSON.stringify({
        minimumPlainCharacters: 1,
        requiredTerms: ['Summary'],
        sectionOrderPairs: [],
      })
    ),
    writeFile(paths.layout, plainText),
    writeFile(paths.pdfInfo, 'Pages: 1\n'),
    writeFile(paths.plain, plainText),
    writeFile(paths.summary, ''),
  ]);

  let exitCode = 0;
  let output = '';
  try {
    await execFileAsync('python3', [
      'scripts/resume-ats-smoke.py',
      '--pdf',
      'resume.pdf',
      '--tex-source',
      'resume.tex',
      '--version',
      '2026-08',
      '--pdf-pages',
      '1',
      '--plain-text',
      paths.plain,
      '--layout-text',
      paths.layout,
      '--pdf-info',
      paths.pdfInfo,
      '--summary',
      paths.summary,
      '--config',
      paths.config,
    ]);
  } catch (error) {
    const failure = error as { code?: number; stdout?: string };
    exitCode = failure.code ?? 1;
    output = failure.stdout ?? '';
  }

  return {
    exitCode,
    output,
    summary: await readFile(paths.summary, 'utf8'),
  };
}

import { execFile } from 'node:child_process';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { promisify } from 'node:util';

import { afterEach, describe, expect, it } from 'vitest';

const execFileAsync = promisify(execFile);
const script = path.resolve('scripts/resume-ats-smoke.py');
const temporaryDirectories: string[] = [];

afterEach(async () => {
  await Promise.all(
    temporaryDirectories
      .splice(0)
      .map((directory) => rm(directory, { recursive: true, force: true }))
  );
});

async function runAtsSmoke(plainText: string) {
  const directory = await mkdtemp(path.join(tmpdir(), 'resume-ats-smoke-'));
  temporaryDirectories.push(directory);
  const paths = {
    config: path.join(directory, 'config.json'),
    info: path.join(directory, 'pdfinfo.txt'),
    layout: path.join(directory, 'layout.txt'),
    plain: path.join(directory, 'plain.txt'),
    summary: path.join(directory, 'summary.md'),
  };
  await Promise.all([
    writeFile(
      paths.config,
      JSON.stringify({
        expectedPageSize: 'letter',
        minimumPlainCharacters: 1,
        requiredPdfMetadata: ['Title', 'Author', 'Subject', 'Keywords'],
      })
    ),
    writeFile(
      paths.info,
      'Title: Resume\nAuthor: Daniel\nSubject: Job search\nKeywords: AI\nPage size: letter\n'
    ),
    writeFile(paths.layout, plainText),
    writeFile(paths.plain, plainText),
  ]);

  try {
    const result = await execFileAsync('python3', [
      script,
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
      paths.info,
      '--summary',
      paths.summary,
      '--config',
      paths.config,
    ]);
    return { ...result, summary: await readFile(paths.summary, 'utf8') };
  } catch (error) {
    return {
      error: error as Error & { code?: number; stdout?: string },
      summary: await readFile(paths.summary, 'utf8'),
    };
  }
}

describe('resume ATS smoke policy', () => {
  it('accepts clean extracted text and populated PDF metadata', async () => {
    const result = await runAtsSmoke('reliable systems\n');

    expect(result).not.toHaveProperty('error');
    expect(result.summary).toContain('✅ PDF metadata is populated: `Title`');
    expect(result.summary).toContain(
      '✅ No words split by line-ending hyphens'
    );
  });

  it('fails when extraction splits a word at a line-ending hyphen', async () => {
    const result = await runAtsSmoke('reliable run-\nbooks\n');

    expect(result).toHaveProperty('error');
    if ('error' in result) {
      expect(result.error.code).toBe(1);
      expect(result.error.stdout).toContain(
        'No words split by line-ending hyphens'
      );
    }
    expect(result.summary).toContain(
      '❌ No words split by line-ending hyphens'
    );
  });
});

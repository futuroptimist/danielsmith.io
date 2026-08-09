import { execFile } from 'node:child_process';
import { chmod, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { promisify } from 'node:util';

import { PDFDocument, StandardFonts } from 'pdf-lib';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

const execFileAsync = promisify(execFile);
const PROJECT_ROOT = path.resolve(__dirname, '..', '..');
let fixtureDir: string;

beforeEach(async () => {
  fixtureDir = await mkdtemp(path.join(tmpdir(), 'resume-ats-smoke-'));
});

afterEach(async () => {
  await rm(fixtureDir, { recursive: true, force: true });
});

describe('resume ATS smoke', () => {
  it('isolates words split across extracted lines from within-line compounds', async () => {
    const pdfPath = await createPdfFixture();
    const validPlainPath = path.join(fixtureDir, 'valid-plain.txt');
    const validLayoutPath = path.join(fixtureDir, 'valid-layout.txt');
    const validSummaryPath = path.join(fixtureDir, 'valid-summary.md');
    const invalidPlainPath = path.join(fixtureDir, 'invalid-plain.txt');
    const invalidLayoutPath = path.join(fixtureDir, 'invalid-layout.txt');
    const invalidSummaryPath = path.join(fixtureDir, 'invalid-summary.md');
    const configPath = path.join(fixtureDir, 'config.json');
    await createPdfinfoFixture();
    const validText = [
      'Summary',
      'incident-response and OpenAI-compatible runbooks',
      'Experience',
      'Skills',
      'Education',
      '',
    ].join('\n');
    const invalidText = validText.replace('runbooks', 'run-\nbooks');
    await writeFile(validPlainPath, validText);
    await writeFile(validLayoutPath, validText);
    await writeFile(invalidPlainPath, invalidText);
    await writeFile(invalidLayoutPath, invalidText);
    await writeFile(
      configPath,
      JSON.stringify({
        minimumPlainCharacters: 0,
        sectionOrderPairs: [
          ['Summary', 'Experience'],
          ['Experience', 'Skills'],
          ['Skills', 'Education'],
        ],
      })
    );

    await expect(
      runAtsSmoke(
        pdfPath,
        validPlainPath,
        validLayoutPath,
        validSummaryPath,
        configPath
      )
    ).resolves.toBeUndefined();

    await expect(
      runAtsSmoke(
        pdfPath,
        invalidPlainPath,
        invalidLayoutPath,
        invalidSummaryPath,
        configPath
      )
    ).rejects.toMatchObject({
      stdout: expect.stringContaining(
        'No hyphenated line-break artifacts in plain extraction'
      ),
    });

    const validSummary = await readFile(validSummaryPath, 'utf8');
    expect(failedChecklistEntries(validSummary)).toEqual([]);
    expectMetadataAndPageSizeChecksToPass(validSummary);

    const summary = await readFile(invalidSummaryPath, 'utf8');
    expect(failedChecklistEntries(summary)).toEqual([
      '- ❌ No hyphenated line-break artifacts in plain extraction — n-\\nb',
    ]);
    expectMetadataAndPageSizeChecksToPass(summary);
  });
});

function failedChecklistEntries(summary: string): string[] {
  return summary.split('\n').filter((line) => line.startsWith('- ❌ '));
}

function expectMetadataAndPageSizeChecksToPass(summary: string): void {
  for (const field of ['Title', 'Author', 'Subject', 'Keywords']) {
    expect(summary).toContain(`- ✅ PDF metadata is populated: \`${field}\``);
  }
  expect(summary).toContain('- ✅ PDF page size is US Letter');
}

async function createPdfFixture(): Promise<string> {
  const pdf = await PDFDocument.create();
  pdf.setTitle('Résumé test');
  pdf.setAuthor('Daniel Smith');
  pdf.setSubject('ATS regression fixture');
  pdf.setKeywords(['resume', 'test']);
  const page = pdf.addPage([612, 792]);
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  page.drawText('Resume fixture', { x: 72, y: 720, font });
  const pdfPath = path.join(fixtureDir, 'resume.pdf');
  await writeFile(pdfPath, await pdf.save());
  return pdfPath;
}

async function createPdfinfoFixture(): Promise<void> {
  const pdfinfoPath = path.join(fixtureDir, 'pdfinfo');
  await writeFile(
    pdfinfoPath,
    `#!/bin/sh
cat <<'EOF'
Title: Résumé test
Author: Daniel Smith
Subject: ATS regression fixture
Keywords: resume, test
Page size: 612 x 792 pts (letter)
EOF
`
  );
  await chmod(pdfinfoPath, 0o755);
}

async function runAtsSmoke(
  pdfPath: string,
  plainPath: string,
  layoutPath: string,
  summaryPath: string,
  configPath: string
): Promise<void> {
  await execFileAsync(
    path.join(PROJECT_ROOT, 'scripts', 'resume-ats-smoke.py'),
    [
      '--pdf',
      pdfPath,
      '--tex-source',
      'fixture.tex',
      '--version',
      '2026-08',
      '--pdf-pages',
      '1',
      '--plain-text',
      plainPath,
      '--layout-text',
      layoutPath,
      '--summary',
      summaryPath,
      '--config',
      configPath,
    ],
    {
      cwd: PROJECT_ROOT,
      env: { ...process.env, PATH: `${fixtureDir}:${process.env.PATH}` },
    }
  );
}

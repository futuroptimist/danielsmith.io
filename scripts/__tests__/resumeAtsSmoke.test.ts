import { execFile } from 'node:child_process';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
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
  it('fails when PDF extraction splits a hyphenated word across lines', async () => {
    const pdfPath = await createPdfFixture();
    const plainPath = path.join(fixtureDir, 'plain.txt');
    const layoutPath = path.join(fixtureDir, 'layout.txt');
    const summaryPath = path.join(fixtureDir, 'summary.md');
    const configPath = path.join(fixtureDir, 'config.json');
    await writeFile(
      plainPath,
      'Summary\nExperience\nrun-\nbooks\nSkills\nEducation\n'
    );
    await writeFile(layoutPath, await readFile(plainPath));
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
      runAtsSmoke(pdfPath, plainPath, layoutPath, summaryPath, configPath)
    ).rejects.toMatchObject({
      stdout: expect.stringContaining(
        'No hyphenated line-break artifacts in plain extraction'
      ),
    });
  });
});

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
    { cwd: PROJECT_ROOT }
  );
}

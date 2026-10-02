import { execFile } from 'node:child_process';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { promisify } from 'node:util';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

const execFileAsync = promisify(execFile);
const PROJECT_ROOT = path.resolve(__dirname, '..', '..');
const SCRIPT = path.join(PROJECT_ROOT, 'scripts', 'resume-docx.py');
const PYTHON = process.env.CODEX_PRIMARY_RUNTIME_PYTHON ?? 'python3';
let fixtureDir: string;

beforeEach(async () => {
  fixtureDir = await mkdtemp(path.join(tmpdir(), 'resume-docx-'));
});

afterEach(async () => {
  await rm(fixtureDir, { recursive: true, force: true });
});

describe('resume DOCX policy', () => {
  it('copies public source metadata exactly without adding or changing timestamps', async () => {
    const source = path.join(
      PROJECT_ROOT,
      'docs',
      'resume',
      '2026-10',
      'resume.tex'
    );
    const { stdout } = await execFileAsync(PYTHON, [
      '-c',
      `
import json, runpy, sys, zipfile
from pathlib import Path
from xml.etree import ElementTree as ET
api = runpy.run_path(sys.argv[1])
docx = Path(sys.argv[2]) / "fixture.docx"
word = api["WORD_NS"]
core = api["CORE_NS"]
with zipfile.ZipFile(docx, "w") as archive:
    archive.writestr("word/styles.xml", (
        f'<w:styles xmlns:w="{word}">'
        '<w:style w:type="paragraph" w:styleId="Normal"/></w:styles>'
    ))
    archive.writestr("word/document.xml", (
        f'<w:document xmlns:w="{word}">'
        '<w:body><w:sectPr/></w:body></w:document>'
    ))
    archive.writestr("docProps/core.xml", (
        f'<cp:coreProperties xmlns:cp="{core}" '
        'xmlns:dcterms="http://purl.org/dc/terms/">'
        '<dcterms:created>2000-01-01T00:00:00Z</dcterms:created></cp:coreProperties>'
    ))
expected = api["source_metadata"](Path(sys.argv[3]))
api["apply_docx_layout"](docx, expected)
api["verify_metadata"](docx)
with zipfile.ZipFile(docx) as archive:
    properties = ET.fromstring(archive.read("docProps/core.xml"))
    actual = {element.tag: element.text for element in properties}
print(json.dumps({"expected": expected, "actual": actual}))
`,
      SCRIPT,
      fixtureDir,
      source,
    ]);
    const { expected, actual } = JSON.parse(stdout) as {
      expected: Record<string, string>;
      actual: Record<string, string>;
    };
    expect(Object.values(expected)).toEqual([
      'Daniel Smith - Software Engineer Resume',
      'Daniel Smith',
      'Software engineering resume for AI systems, platform, and reliability roles',
      'software engineering, AI systems, platform engineering, site reliability, Kubernetes',
    ]);
    expect(actual).toEqual({
      ...expected,
      '{http://purl.org/dc/terms/}created': '2000-01-01T00:00:00Z',
    });
  });

  it('rejects source metadata that cannot be copied as reviewed plain text', async () => {
    const source = path.join(fixtureDir, 'missing.tex');
    await writeFile(source, '\\hypersetup{pdfauthor={Daniel Smith}}');
    await expect(
      execFileAsync(PYTHON, [
        '-c',
        `
import runpy, sys
from pathlib import Path
runpy.run_path(sys.argv[1])["source_metadata"](Path(sys.argv[2]))
`,
        SCRIPT,
        source,
      ])
    ).rejects.toMatchObject({
      stderr: expect.stringContaining('missing plain-text metadata: pdftitle'),
    });
  });

  it('rejects DOCX metadata and role/date mismatches without requiring a renderer', async () => {
    await expect(
      execFileAsync(PYTHON, [
        '-c',
        `
import runpy, sys, zipfile
from pathlib import Path
api = runpy.run_path(sys.argv[1])
docx = Path(sys.argv[2]) / "empty.docx"
with zipfile.ZipFile(docx, "w") as archive:
    archive.writestr("docProps/core.xml", '<coreProperties/>')
api["verify_metadata"](docx)
`,
        SCRIPT,
        fixtureDir,
      ])
    ).rejects.toMatchObject({
      stderr: expect.stringContaining('DOCX is missing metadata: pdftitle'),
    });
    await expect(
      execFileAsync(PYTHON, [
        '-c',
        `
import runpy, sys
from pathlib import Path
text = "Experience\\nMuon Space\\nWrong role\\nSkills"
runpy.run_path(sys.argv[1])["verify_experience_pairing"](text, Path(sys.argv[2]))
`,
        SCRIPT,
        path.join(PROJECT_ROOT, 'docs', 'resume', 'ats-smoke.json'),
      ])
    ).rejects.toMatchObject({
      stderr: expect.stringContaining('DOCX career content mismatch:'),
    });
  });
});

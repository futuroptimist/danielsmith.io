import { execFile } from 'node:child_process';
import { constants as fsConstants } from 'node:fs';
import {
  access,
  chmod,
  mkdir,
  mkdtemp,
  readFile,
  readdir,
  rm,
  writeFile,
} from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';

import JSZip from 'jszip';
import { PDFDocument } from 'pdf-lib';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

const execFileAsync = promisify(execFile);

const currentDir = path.dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = path.resolve(currentDir, '..', '..');
const RESUME_ROOT = path.join(PROJECT_ROOT, 'docs', 'resume');
const CACHE_ROOT = path.join(PROJECT_ROOT, 'node_modules', '.cache', 'resume-tools');

const TECTONIC_VERSION = '0.15.0';
const PANDOC_VERSION = '3.8';

interface ResumeArtifacts {
  pdfPath: string;
  docxPath: string;
  cleanup: () => Promise<void>;
}

let artifacts: ResumeArtifacts | null = null;
let setupError: Error | null = null;

beforeAll(async () => {
  try {
    artifacts = await buildLatestResumeArtifacts();
  } catch (error) {
    const original = error instanceof Error ? error : new Error(String(error));
    setupError = new Error(
      `Unable to prepare resume artifacts: ${original.message}. Ensure Tectonic and Pandoc are available or that the test environment can download the pinned binaries.`,
      { cause: original }
    );
  }
}, 120_000);

afterAll(async () => {
  if (artifacts) {
    await artifacts.cleanup();
  }
});

describe('latest resume artifacts stay within a single page', () => {
  it('PDF build uses only one page', async function () {
    if (setupError) {
      throw setupError;
    }

    if (!artifacts) {
      throw new Error('Failed to prepare resume artifacts.');
    }

    const pageCount = await countPdfPages(artifacts.pdfPath);
    expect(pageCount).toBe(1);
  });

  it('DOCX conversion uses only one page', async function () {
    if (setupError) {
      throw setupError;
    }

    if (!artifacts) {
      throw new Error('Failed to prepare resume artifacts.');
    }

    const pageCount = await countDocxPages(artifacts.docxPath);
    expect(pageCount).toBe(1);
  });
});

async function buildLatestResumeArtifacts(): Promise<ResumeArtifacts> {
  const texPath = await getLatestResumeTexPath();
  const outputDir = await createTempDir('resume-artifacts-');

  const tectonic = await ensureTectonic();
  const pandoc = await ensurePandoc();

  await execFileAsync(tectonic, ['--outdir', outputDir, texPath], {
    cwd: PROJECT_ROOT,
  });

  const baseName = path.basename(texPath, '.tex');
  const pdfPath = path.join(outputDir, `${baseName}.pdf`);

  await execFileAsync(pandoc, [texPath, '-o', path.join(outputDir, `${baseName}.docx`)], {
    cwd: PROJECT_ROOT,
  });

  const docxPath = path.join(outputDir, `${baseName}.docx`);

  return {
    pdfPath,
    docxPath,
    cleanup: async () => {
      await rm(outputDir, { recursive: true, force: true });
    },
  };
}

async function getLatestResumeTexPath(): Promise<string> {
  const entries = await readdir(RESUME_ROOT, { withFileTypes: true });
  const datedDirs = entries
    .filter((entry) => entry.isDirectory() && /^\d{4}-\d{2}$/.test(entry.name))
    .map((entry) => entry.name)
    .sort();

  if (datedDirs.length === 0) {
    throw new Error('No dated resume directories found.');
  }

  const latestDir = datedDirs[datedDirs.length - 1];
  const latestPath = path.join(RESUME_ROOT, latestDir);
  const files = await readdir(latestPath);
  const texFile = files.find((file) => file.endsWith('.tex'));

  if (!texFile) {
    throw new Error(`No .tex file found in ${latestPath}.`);
  }

  return path.join(latestPath, texFile);
}

async function createTempDir(prefix: string): Promise<string> {
  const tempRoot = path.join(CACHE_ROOT, 'tmp');
  await mkdir(tempRoot, { recursive: true });
  return mkdtemp(path.join(tempRoot, prefix));
}

async function ensureTectonic(): Promise<string> {
  const existing = await findOnPath('tectonic');
  if (existing) {
    return existing;
  }

  if (process.platform !== 'linux' || process.arch !== 'x64') {
    throw new Error('tectonic not found on PATH and automatic download is only supported on Linux x64.');
  }

  const cacheDir = path.join(CACHE_ROOT, `tectonic-${TECTONIC_VERSION}`);
  const binaryPath = path.join(cacheDir, 'tectonic');

  try {
    await access(binaryPath, fsConstants.X_OK);
    return binaryPath;
  } catch {
    // continue to download
  }

  await mkdir(cacheDir, { recursive: true });
  const archivePath = path.join(cacheDir, `tectonic-${TECTONIC_VERSION}.tar.gz`);
  const downloadUrl = `https://github.com/tectonic-typesetting/tectonic/releases/download/tectonic%40${TECTONIC_VERSION}/tectonic-${TECTONIC_VERSION}-x86_64-unknown-linux-gnu.tar.gz`;

  await downloadFile(downloadUrl, archivePath);
  await execFileAsync('tar', ['-xzf', archivePath, '-C', cacheDir]);
  await chmod(binaryPath, 0o755);
  return binaryPath;
}

async function ensurePandoc(): Promise<string> {
  const existing = await findOnPath('pandoc');
  if (existing) {
    return existing;
  }

  if (process.platform !== 'linux' || process.arch !== 'x64') {
    throw new Error('pandoc not found on PATH and automatic download is only supported on Linux x64.');
  }

  const cacheDir = path.join(CACHE_ROOT, `pandoc-${PANDOC_VERSION}`);
  const binaryPath = path.join(cacheDir, `pandoc-${PANDOC_VERSION}`, 'bin', 'pandoc');

  try {
    await access(binaryPath, fsConstants.X_OK);
    return binaryPath;
  } catch {
    // continue to download
  }

  await mkdir(cacheDir, { recursive: true });
  const archivePath = path.join(cacheDir, `pandoc-${PANDOC_VERSION}.tar.gz`);
  const downloadUrl = `https://github.com/jgm/pandoc/releases/download/${PANDOC_VERSION}/pandoc-${PANDOC_VERSION}-linux-amd64.tar.gz`;

  await downloadFile(downloadUrl, archivePath);
  await execFileAsync('tar', ['-xzf', archivePath, '-C', cacheDir]);
  const pandocPath = path.join(cacheDir, `pandoc-${PANDOC_VERSION}`, 'bin', 'pandoc');
  await chmod(pandocPath, 0o755);
  return pandocPath;
}

async function findOnPath(binary: string): Promise<string | null> {
  const locator = process.platform === 'win32' ? 'where' : 'which';
  try {
    const { stdout } = await execFileAsync(locator, [binary]);
    const first = stdout.split(/\r?\n/).find((line) => line.trim().length > 0);
    return first ? first.trim() : null;
  } catch {
    return null;
  }
}

async function downloadFile(url: string, destination: string): Promise<void> {
  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`HTTP ${response.status} ${response.statusText}`);
    }

    const buffer = Buffer.from(await response.arrayBuffer());
    await writeFile(destination, buffer);
    return;
  } catch (error) {
    const originalMessage = error instanceof Error ? error.message : String(error);
    try {
      await execFileAsync('curl', ['-L', '-o', destination, url]);
      return;
    } catch (curlError) {
      const curlMessage =
        curlError instanceof Error ? curlError.message : String(curlError);
      throw new Error(
        `Failed to download ${url}: ${originalMessage}; curl fallback: ${curlMessage}`,
        { cause: curlError instanceof Error ? curlError : undefined }
      );
    }
  }
}

async function countPdfPages(pdfPath: string): Promise<number> {
  const data = await readFile(pdfPath);
  const bytes = data instanceof Uint8Array ? data : new Uint8Array(data);
  const pdf = await PDFDocument.load(bytes);
  return pdf.getPageCount();
}

async function countDocxPages(docxPath: string): Promise<number> {
  const data = await readFile(docxPath);
  const zip = await JSZip.loadAsync(data);
  const appXml = await zip.file('docProps/app.xml')?.async('string');
  if (!appXml) {
    throw new Error('docProps/app.xml missing from DOCX.');
  }

  const match = appXml.match(/<Pages>(\d+)<\/Pages>/);
  if (!match) {
    throw new Error('DOCX did not contain a <Pages> element.');
  }

  return Number.parseInt(match[1], 10);
}

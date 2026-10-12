#!/usr/bin/env node
// Local evidence processing only. No browser, server, network, or input mutations.
const fs = require('node:fs');
const path = require('node:path');
const { randomUUID } = require('node:crypto');
const {
  parseCapture,
  analyzeCapture,
  validateArtifact,
  sha256,
  MAX_BYTES,
} = require('./lib/performance-capture-analysis.cjs');
const NAMES = ['initial', 'running', 'terminal', 'raw', 'analysis'].map(
  (x) => `route-capture-${x}-v1.json`
);
const failure = (code) => Object.assign(new Error(code), { code });
function readBounded(file, maximum = MAX_BYTES) {
  const fd = fs.openSync(file, 'r');
  try {
    const stat = fs.fstatSync(fd);
    if (!stat.isFile() || stat.size > maximum) throw failure('input_limit');
    const buffer = Buffer.alloc(Math.min(stat.size + 1, maximum + 1));
    let used = 0;
    while (used < buffer.length) {
      const n = fs.readSync(fd, buffer, used, buffer.length - used, null);
      if (!n) break;
      used += n;
    }
    if (used !== stat.size) throw failure('input_limit');
    return buffer.subarray(0, used);
  } finally {
    fs.closeSync(fd);
  }
}
function toolchain() {
  return {
    helperSha256: sha256(
      readBounded(path.join(__dirname, 'capture-performance-route.cjs'))
    ),
    probeSha256: sha256(
      readBounded(path.join(__dirname, 'lib/performance-capture-probe.cjs'))
    ),
    analyzerSha256: sha256(
      Buffer.concat([
        readBounded(__filename),
        readBounded(
          path.join(__dirname, 'lib/performance-capture-analysis.cjs')
        ),
      ])
    ),
  };
}
function createOperation(directory, operation, options = {}) {
  fs.mkdirSync(path.dirname(path.resolve(directory)), { recursive: true });
  fs.mkdirSync(directory); // Exclusive directory; a failed earlier attempt is never overwritten.
  const hashes = toolchain(),
    operationId = randomUUID();
  const state = {
    attemptId: operation === 'capture' ? randomUUID() : null,
    toolchain:
      operation === 'capture'
        ? hashes
        : {
            helperSha256: null,
            probeSha256: null,
            analyzerSha256: hashes.analyzerSha256,
          },
    inputSha256: null,
    inputByteLength: null,
    captureStoppedAtMs: null,
    cleanupState: operation === 'capture' ? 'not_started' : 'not_applicable',
  };
  const files = [];
  let terminal = false;
  function write(name, value, maximum = MAX_BYTES, bytes) {
    if (terminal) throw failure('internal_error');
    if (!NAMES.includes(name)) throw failure('invalid_input');
    const checked = validateArtifact(value);
    const data = bytes ?? Buffer.from(JSON.stringify(checked) + '\n');
    if (data.length > maximum) throw failure('output_limit');
    fs.writeFileSync(path.join(directory, name), data, { flag: 'wx' });
    files.push({ name, byteLength: data.length, sha256: sha256(data) });
  }
  function receipt(phase, receiptState, reason = null) {
    write(`route-capture-${phase}-v1.json`, {
      kind: 'route_capture_receipt',
      captureSchemaVersion: 1,
      operationId,
      attemptId: state.attemptId,
      operation,
      phase,
      state: receiptState,
      reason,
      createdAt: new Date().toISOString(),
      toolchain: state.toolchain,
      inputSha256: state.inputSha256,
      inputByteLength: state.inputByteLength,
      captureStoppedAtMs: state.captureStoppedAtMs,
      cleanupState: state.cleanupState,
    });
  }
  receipt('initial', 'initialized');
  return {
    state,
    hashes,
    write,
    running: () => receipt('running', 'running'),
    finish(result, reason) {
      if (terminal) return;
      receipt('terminal', result, reason);
      const manifest = validateArtifact({
        kind: 'route_capture_manifest',
        captureSchemaVersion: 1,
        operationId,
        attemptId: state.attemptId,
        toolchain: state.toolchain,
        state: result,
        files,
        unavailableFiles: NAMES.filter((n) => !files.some((f) => f.name === n)),
      });
      fs.writeFileSync(
        path.join(directory, 'route-capture-manifest-v1.json'),
        JSON.stringify(manifest) + '\n',
        { flag: 'wx' }
      );
      terminal = true;
    },
    options,
  };
}
function analyzeDirectory(input, output) {
  const operation = createOperation(output, 'analysis');
  operation.running();
  try {
    const manifest = validateArtifact(
      JSON.parse(
        readBounded(path.join(input, 'route-capture-manifest-v1.json'))
      )
    );
    if (manifest.kind !== 'route_capture_manifest')
      throw failure('invalid_input');
    const entry = manifest.files.find(
      (f) => f.name === 'route-capture-raw-v1.json'
    );
    if (!entry) throw failure('invalid_input');
    const bytes = readBounded(path.join(input, entry.name));
    operation.state.inputByteLength = bytes.length;
    operation.state.inputSha256 = sha256(bytes);
    if (
      entry.byteLength !== bytes.length ||
      entry.sha256 !== operation.state.inputSha256
    )
      throw failure('identity_invalid');
    const raw = parseCapture(JSON.parse(bytes));
    if (bytes.length > raw.bounds.maxRawBytes) throw failure('input_limit');
    if (
      raw.attemptId !== manifest.attemptId ||
      JSON.stringify(raw.toolchain) !== JSON.stringify(manifest.toolchain)
    )
      throw failure('identity_invalid');
    operation.state.attemptId = raw.attemptId;
    operation.state.toolchain = {
      ...raw.toolchain,
      analyzerSha256: operation.hashes.analyzerSha256,
    };
    operation.state.captureStoppedAtMs = raw.coverage.captureStoppedAtMs;
    operation.write(entry.name, raw, raw.bounds.maxRawBytes, bytes);
    const analysis = analyzeCapture(raw);
    analysis.rawSha256 = sha256(bytes);
    analysis.toolchain = operation.state.toolchain;
    operation.write(
      'route-capture-analysis-v1.json',
      analysis,
      raw.bounds.maxAnalysisBytes
    );
    if (analysis.analysisState === 'rejected')
      operation.finish('partial', 'invalid_clock');
    else if (analysis.analysisState === 'incomplete')
      operation.finish(
        raw.stopReason === 'cancelled' ? 'cancelled' : 'partial',
        raw.stopReason === 'capacity'
          ? 'capacity'
          : raw.stopReason === 'deadline'
            ? 'deadline'
            : raw.stopReason === 'cancelled'
              ? 'cancelled'
              : 'invalid_input'
      );
    else operation.finish('complete', 'finished');
    return analysis;
  } catch (error) {
    const reason = [
      'input_limit',
      'output_limit',
      'identity_invalid',
      'invalid_input',
    ].includes(error.code)
      ? error.code
      : error instanceof SyntaxError || error.code === 'ENOENT'
        ? 'invalid_input'
        : 'io_error';
    operation.finish('failed', reason);
    throw failure(reason);
  }
}
module.exports = { analyzeDirectory, createOperation, readBounded, toolchain };
if (require.main === module) {
  try {
    if (process.argv.length !== 4) throw failure('invalid_input');
    analyzeDirectory(process.argv[2], process.argv[3]);
  } catch (error) {
    console.error(
      [
        'input_limit',
        'output_limit',
        'identity_invalid',
        'invalid_input',
        'io_error',
      ].includes(error.code)
        ? error.code
        : 'io_error'
    );
    process.exitCode = 1;
  }
}

const { createHash } = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');

const STAMP = 'runtime/main-preview.json';
const AVATAR = 'assets/avatar/daniel-animated-avatar.glb';
const INDEX = 'index.html';
const MANIFEST = 'SHA256SUMS.json';

function requireSha(sha) {
  if (typeof sha !== 'string' || !/^[a-f0-9]{40}$/.test(sha)) {
    throw new Error('Expected the full lowercase Git commit SHA.');
  }
}

function listFiles(root) {
  if (!fs.lstatSync(root).isDirectory())
    throw new Error('Expected an asset directory.');
  const files = [];
  function visit(dir, prefix) {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const relative = prefix + entry.name;
      const absolute = path.join(dir, entry.name);
      if (entry.isDirectory()) visit(absolute, relative + '/');
      else if (entry.isFile()) files.push(relative);
      else
        throw new Error(
          'Bundle inputs must contain only directories and regular files.'
        );
    }
  }
  visit(root, '');
  return files.sort();
}

function stampFor(sourceSha) {
  return `${JSON.stringify({ schemaVersion: 1, sourceSha }, null, 2)}\n`;
}

function checksumInventory(site, files) {
  return (
    JSON.stringify(
      files.map((name) => ({
        path: name,
        sha256: createHash('sha256')
          .update(fs.readFileSync(path.join(site, name)))
          .digest('hex'),
      })),
      null,
      2
    ) + '\n'
  );
}

function verifyBundle(sourceSha, output) {
  requireSha(sourceSha);
  if (!fs.lstatSync(output).isDirectory())
    throw new Error('Expected a bundle directory.');
  if (
    fs.readdirSync(output).sort().join('\n') !== [MANIFEST, 'site'].join('\n')
  ) {
    throw new Error('Unexpected bundle contents.');
  }
  const site = path.join(output, 'site');
  const files = listFiles(site);
  if (files.some((name) => /\.map$/i.test(name)))
    throw new Error('Source maps are prohibited.');
  for (const name of [INDEX, AVATAR, STAMP]) {
    if (
      !files.includes(name) ||
      fs.statSync(path.join(site, name)).size === 0
    ) {
      throw new Error(`Missing or empty required preview asset: ${name}`);
    }
  }
  if (fs.readFileSync(path.join(site, STAMP), 'utf8') !== stampFor(sourceSha)) {
    throw new Error(
      'Preview build stamp differs from the expected Git commit.'
    );
  }
  const manifest = path.join(output, MANIFEST);
  if (
    !fs.lstatSync(manifest).isFile() ||
    fs.readFileSync(manifest, 'utf8') !== checksumInventory(site, files)
  ) {
    throw new Error('Preview files differ from the checksum inventory.');
  }
  return files.length;
}

function prepareBundle(sourceSha, dist, output) {
  requireSha(sourceSha);
  const buildRoot = fs.realpathSync(dist);
  const destination = path.resolve(
    fs.realpathSync(path.dirname(output)),
    path.basename(output)
  );
  if (
    destination === buildRoot ||
    destination.startsWith(buildRoot + path.sep)
  ) {
    throw new Error(
      'The fresh bundle directory must be outside the build output.'
    );
  }
  const files = listFiles(dist).filter((name) => !/\.map$/i.test(name));
  if (files.includes(STAMP))
    throw new Error('Build output already contains a preview stamp.');
  if (!files.includes(INDEX) || !files.includes(AVATAR)) {
    throw new Error('Build output lacks required preview assets.');
  }
  fs.mkdirSync(destination); // Refuse to overwrite an existing artifact or follow a symlink.
  const site = path.join(destination, 'site');
  for (const name of files) {
    const target = path.join(site, name);
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.copyFileSync(path.join(dist, name), target);
  }
  fs.mkdirSync(path.dirname(path.join(site, STAMP)), { recursive: true });
  fs.writeFileSync(path.join(site, STAMP), stampFor(sourceSha), { flag: 'wx' });
  fs.writeFileSync(
    path.join(destination, MANIFEST),
    checksumInventory(site, listFiles(site)),
    {
      flag: 'wx',
    }
  );
  return verifyBundle(sourceSha, destination);
}

if (require.main === module) {
  const [mode, sha, first, second] = process.argv.slice(2);
  try {
    const count =
      mode === 'prepare' && process.argv.length === 6
        ? prepareBundle(sha, first, second)
        : mode === 'verify' && process.argv.length === 5
          ? verifyBundle(sha, first)
          : null;
    if (count === null)
      throw new Error('Usage: prepare SHA DIST BUNDLE | verify SHA BUNDLE');
    console.log(`Verified ${count} static files for ${sha}.`);
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}

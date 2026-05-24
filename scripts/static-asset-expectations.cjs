const manualBinaryExtensions = new Set([
  '.pdf',
  '.png',
  '.jpg',
  '.jpeg',
  '.ico',
  '.webp',
  '.avif',
  '.gif',
]);

const runtimeAssetExpectations = [
  {
    path: '/favicon.ico',
    reason: 'Tab/favicon metadata in index.html.',
  },
  {
    path: '/docs/resume/2025-09/resume.pdf',
    reason: 'No-script fallback resume link in index.html.',
  },
];

module.exports = {
  manualBinaryExtensions,
  runtimeAssetExpectations,
};

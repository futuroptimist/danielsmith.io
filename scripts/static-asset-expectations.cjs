const manualBinaryExtensions = new Set([
  '.pdf',
  '.docx',
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
    path: '/resume.pdf',
    reason: 'No-script fallback resume link in index.html.',
  },
];

module.exports = {
  manualBinaryExtensions,
  runtimeAssetExpectations,
};

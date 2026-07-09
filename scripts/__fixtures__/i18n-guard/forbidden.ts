export const broken = () => {
  const node = document.createElement('button');
  node.textContent = 'Hardcoded action';
  node.setAttribute('aria-label', 'Hardcoded aria');
  node.dataset.hudAnnounce = 'Hardcoded announcement';
  return { label: 'Hardcoded label', node };
};

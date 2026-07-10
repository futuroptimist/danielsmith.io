export const broken = () => {
  const node = document.createElement('button');
  const render = (title = 'Hardcoded title') => title;
  node.textContent = 'Hardcoded action';
  node.setAttribute('aria-label', 'Hardcoded aria');
  node.dataset.hudAnnounce = 'Hardcoded announcement';
  return { label: 'Hardcoded label', node, render };
};

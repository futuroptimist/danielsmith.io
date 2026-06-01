export interface HudMenuTitleItem {
  keyHint: string;
  title: string;
}

const PSEUDO_LOCALE_WRAPPER_PATTERN = /[⟦⟧]/g;

const escapeRegExp = (value: string): string =>
  value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const uniqueCandidates = (keyHint: string): ReadonlyArray<string> => {
  const candidates = [
    keyHint,
    keyHint.replace(PSEUDO_LOCALE_WRAPPER_PATTERN, ''),
  ]
    .map((candidate) => candidate.trim())
    .filter((candidate) => candidate.length > 0);
  return Array.from(new Set(candidates));
};

export const formatMenuButtonTitle = (
  item: HudMenuTitleItem,
  shortcutLabel: string
): string => {
  for (const candidate of uniqueCandidates(item.keyHint)) {
    const parenthesizedCandidate = new RegExp(
      `\\(${escapeRegExp(candidate)}\\)`,
      'g'
    );
    if (parenthesizedCandidate.test(item.title)) {
      return item.title.replace(
        parenthesizedCandidate,
        () => `(${shortcutLabel})`
      );
    }
  }

  for (const candidate of uniqueCandidates(item.keyHint)) {
    const candidatePattern = new RegExp(escapeRegExp(candidate), 'g');
    if (candidatePattern.test(item.title)) {
      return item.title.replace(candidatePattern, () => shortcutLabel);
    }
  }

  return item.title;
};

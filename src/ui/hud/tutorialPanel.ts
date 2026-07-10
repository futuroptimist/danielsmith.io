import type { TutorialPanelStrings } from '../../assets/i18n';

const PAGE_IDS = [
  'welcomeMovement',
  'zoom',
  'visitPois',
  'findGitshelves',
] as const;
type TutorialPageId = (typeof PAGE_IDS)[number];

export interface TutorialPanelHandle {
  readonly element: HTMLElement;
  open(): void;
  close(): void;
  toggle(force?: boolean): void;
  isOpen(): boolean;
  setStrings(strings: TutorialPanelStrings): void;
  dispose(): void;
}

export function createTutorialPanel({
  container,
  strings,
  onOpenChange,
}: {
  container: HTMLElement;
  strings: TutorialPanelStrings;
  onOpenChange?: (open: boolean) => void;
}): TutorialPanelHandle {
  let currentStrings = strings;
  let open = false;
  let collapsed = false;
  let currentPage: TutorialPageId = 'welcomeMovement';

  const element = document.createElement('aside');
  element.className = 'tutorial-panel';
  element.id = 'tutorial-panel';
  element.hidden = true;
  element.dataset.role = 'tutorial-panel';
  element.setAttribute('role', 'dialog');
  element.setAttribute('aria-modal', 'false');

  const render = () => {
    element.replaceChildren();
    element.classList.toggle('tutorial-panel--sidebar-collapsed', collapsed);
    const heading = document.createElement('h2');
    heading.className = 'tutorial-panel__heading';
    heading.id = 'tutorial-panel-heading';
    heading.textContent = currentStrings.heading;
    element.setAttribute('aria-labelledby', heading.id);

    const shell = document.createElement('div');
    shell.className = 'tutorial-panel__shell';

    const sidebar = document.createElement('nav');
    sidebar.className = 'tutorial-panel__sidebar';
    sidebar.dataset.testid = 'tutorial-sidebar';
    sidebar.setAttribute('aria-label', currentStrings.sidebarLabel);
    const collapse = document.createElement('button');
    collapse.type = 'button';
    collapse.className = 'tutorial-panel__collapse';
    collapse.dataset.testid = 'tutorial-sidebar-collapse';
    collapse.textContent = collapsed
      ? currentStrings.expandLabel
      : currentStrings.collapseLabel;
    collapse.title = collapse.textContent;
    collapse.setAttribute('aria-expanded', collapsed ? 'false' : 'true');
    collapse.addEventListener('click', () => {
      collapsed = !collapsed;
      render();
    });
    const list = document.createElement('ol');
    list.className = 'tutorial-panel__steps';
    PAGE_IDS.forEach((id, index) => {
      const li = document.createElement('li');
      const button = document.createElement('button');
      const isUnlocked = index === 0;
      const isActive = id === currentPage;
      button.type = 'button';
      button.className = 'tutorial-panel__step';
      button.dataset.testid = `tutorial-step-${id}`;
      button.textContent = currentStrings.pages[id].title;
      button.disabled = !isUnlocked;
      button.setAttribute('aria-disabled', isUnlocked ? 'false' : 'true');
      button.setAttribute(
        'aria-label',
        `${currentStrings.pages[id].title} — ${isActive ? currentStrings.activeStepLabel : isUnlocked ? currentStrings.unlockedStepLabel : currentStrings.lockedStepLabel}`
      );
      if (isActive) {
        button.classList.add('tutorial-panel__step--active');
        button.setAttribute('aria-current', 'step');
      }
      if (!isUnlocked) {
        button.classList.add('tutorial-panel__step--locked');
      }
      button.addEventListener('click', () => {
        if (!isUnlocked) return;
        currentPage = id;
        render();
      });
      li.append(button);
      list.append(li);
    });
    sidebar.append(collapse, list);

    const body = document.createElement('section');
    body.className = 'tutorial-panel__body';
    body.dataset.testid = 'tutorial-body';
    const pageHeading = document.createElement('h3');
    pageHeading.className = 'tutorial-panel__page-title';
    pageHeading.textContent = currentStrings.pages[currentPage].title;
    const pageBody = document.createElement('p');
    pageBody.className = 'tutorial-panel__copy';
    pageBody.id = 'tutorial-panel-description';
    pageBody.textContent = currentStrings.pages[currentPage].body;
    element.setAttribute('aria-describedby', pageBody.id);
    body.append(pageHeading, pageBody);

    const nav = document.createElement('div');
    nav.className = 'tutorial-panel__nav';
    nav.dataset.testid = 'tutorial-navigation';
    const previous = document.createElement('button');
    previous.type = 'button';
    previous.className = 'tutorial-panel__button';
    previous.textContent = currentStrings.previousLabel;
    previous.disabled = true;
    const next = document.createElement('button');
    next.type = 'button';
    next.className = 'tutorial-panel__button tutorial-panel__button--primary';
    next.textContent = currentStrings.nextLabel;
    next.disabled = true;
    nav.append(previous, next);

    const options = document.createElement('div');
    options.className = 'tutorial-panel__options';
    options.dataset.testid = 'tutorial-options';
    const label = document.createElement('label');
    label.className = 'tutorial-panel__checkbox-row';
    label.title = currentStrings.showOnStartupTitle;
    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.checked = true;
    checkbox.dataset.testid = 'tutorial-show-on-startup';
    const labelText = document.createElement('span');
    labelText.textContent = currentStrings.showOnStartupLabel;
    label.append(checkbox, labelText);
    const dismiss = document.createElement('button');
    dismiss.type = 'button';
    dismiss.className = 'tutorial-panel__button';
    dismiss.dataset.testid = 'tutorial-dismiss';
    dismiss.textContent = currentStrings.dismissLabel;
    dismiss.title = currentStrings.dismissTitle;
    dismiss.addEventListener('click', () => handle.close());
    options.append(label, dismiss);

    const content = document.createElement('div');
    content.className = 'tutorial-panel__content';
    content.append(body, nav, options);
    shell.append(sidebar, content);
    element.append(heading, shell);
  };

  const handle: TutorialPanelHandle = {
    element,
    open() {
      if (open) return;
      open = true;
      element.hidden = false;
      element.dataset.open = 'true';
      onOpenChange?.(true);
    },
    close() {
      if (!open) return;
      open = false;
      element.hidden = true;
      delete element.dataset.open;
      onOpenChange?.(false);
    },
    toggle(force?: boolean) {
      const shouldOpen = force ?? !open;
      if (shouldOpen) this.open();
      else this.close();
    },
    isOpen() {
      return open;
    },
    setStrings(next) {
      currentStrings = next;
      render();
    },
    dispose() {
      element.remove();
    },
  };

  render();
  container.appendChild(element);
  return handle;
}

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
  const activePage: TutorialPageId = 'welcomeMovement';

  const element = document.createElement('section');
  element.className = 'tutorial-panel';
  element.id = 'tutorial-panel';
  element.dataset.role = 'tutorial-panel';
  element.setAttribute('role', 'dialog');
  element.setAttribute('aria-modal', 'false');
  element.hidden = true;

  const render = () => {
    element.replaceChildren();
    element.classList.toggle('tutorial-panel--sidebar-collapsed', collapsed);
    const heading = document.createElement('h2');
    heading.className = 'tutorial-panel__heading';
    heading.id = 'tutorial-panel-heading';
    heading.textContent = currentStrings.heading;

    const layout = document.createElement('div');
    layout.className = 'tutorial-panel__layout';

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
    collapse.setAttribute('aria-expanded', collapsed ? 'false' : 'true');
    collapse.addEventListener('click', () => {
      collapsed = !collapsed;
      render();
    });
    sidebar.append(collapse);

    const steps = document.createElement('ol');
    steps.className = 'tutorial-panel__steps';
    for (const pageId of PAGE_IDS) {
      const unlocked = pageId === 'welcomeMovement';
      const item = document.createElement('li');
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'tutorial-panel__step';
      button.dataset.testid = `tutorial-step-${pageId}`;
      button.disabled = !unlocked;
      button.textContent = currentStrings.pages[pageId].title;
      button.setAttribute('aria-disabled', unlocked ? 'false' : 'true');
      button.setAttribute(
        'aria-label',
        `${currentStrings.pages[pageId].title} · ${
          pageId === activePage
            ? currentStrings.currentStepLabel
            : unlocked
              ? currentStrings.unlockedStepLabel
              : currentStrings.lockedStepLabel
        }`
      );
      if (pageId === activePage) {
        button.setAttribute('aria-current', 'step');
      }
      item.append(button);
      steps.append(item);
    }
    sidebar.append(steps);

    const body = document.createElement('div');
    body.className = 'tutorial-panel__body';
    body.dataset.testid = 'tutorial-body';
    const bodyTitle = document.createElement('h3');
    bodyTitle.id = 'tutorial-panel-body-title';
    bodyTitle.textContent = currentStrings.pages[activePage].title;
    const bodyCopy = document.createElement('p');
    bodyCopy.id = 'tutorial-panel-body-copy';
    bodyCopy.textContent = currentStrings.pages[activePage].body;
    body.append(bodyTitle, bodyCopy);

    const navigation = document.createElement('div');
    navigation.className = 'tutorial-panel__navigation';
    navigation.dataset.testid = 'tutorial-navigation';
    const previous = document.createElement('button');
    previous.type = 'button';
    previous.className = 'tutorial-panel__button';
    previous.disabled = true;
    previous.textContent = currentStrings.previousLabel;
    const next = document.createElement('button');
    next.type = 'button';
    next.className = 'tutorial-panel__button';
    next.disabled = true;
    next.textContent = currentStrings.nextLabel;
    navigation.append(previous, next);

    const options = document.createElement('div');
    options.className = 'tutorial-panel__options';
    options.dataset.testid = 'tutorial-options';
    const checkboxLabel = document.createElement('label');
    checkboxLabel.className = 'tutorial-panel__checkbox-row';
    checkboxLabel.title = currentStrings.showOnStartupTitle;
    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.checked = true;
    checkbox.dataset.testid = 'tutorial-show-on-startup';
    checkboxLabel.append(
      checkbox,
      document.createTextNode(currentStrings.showOnStartupLabel)
    );
    const dismiss = document.createElement('button');
    dismiss.type = 'button';
    dismiss.className =
      'tutorial-panel__button tutorial-panel__button--primary';
    dismiss.dataset.testid = 'tutorial-dismiss';
    dismiss.title = currentStrings.dismissTitle;
    dismiss.textContent = currentStrings.dismissLabel;
    dismiss.addEventListener('click', () => handle.close());
    options.append(checkboxLabel, dismiss);

    const main = document.createElement('div');
    main.className = 'tutorial-panel__main';
    main.append(body, navigation, options);
    layout.append(sidebar, main);
    element.append(heading, layout);
    element.setAttribute('aria-labelledby', heading.id);
    element.setAttribute('aria-describedby', bodyCopy.id);
  };

  const handle: TutorialPanelHandle = {
    element,
    open() {
      if (open) return;
      open = true;
      element.hidden = false;
      document.documentElement.dataset.tutorialOpen = 'true';
      onOpenChange?.(true);
    },
    close() {
      if (!open) return;
      open = false;
      element.hidden = true;
      delete document.documentElement.dataset.tutorialOpen;
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
      this.close();
      element.remove();
    },
  };

  render();
  container.append(element);
  return handle;
}

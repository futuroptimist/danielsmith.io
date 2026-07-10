import type { TutorialPanelStrings } from '../../assets/i18n';

export interface TutorialPanelHandle {
  readonly element: HTMLElement;
  open(): void;
  close(): void;
  toggle(force?: boolean): void;
  isOpen(): boolean;
  setStrings(strings: TutorialPanelStrings): void;
  dispose(): void;
}

const PAGE_IDS = [
  'welcomeMovement',
  'zoom',
  'visitPois',
  'findGitshelves',
] as const;
type PageId = (typeof PAGE_IDS)[number];

const setText = (element: HTMLElement, value: string) => {
  element.textContent = value;
};

export function createTutorialPanel({
  container,
  strings,
  button,
  onOpenChange,
}: {
  container: HTMLElement;
  strings: TutorialPanelStrings;
  button?: HTMLButtonElement | null;
  onOpenChange?: (open: boolean) => void;
}): TutorialPanelHandle {
  let currentStrings = strings;
  let open = false;
  let collapsed = false;
  let activePage: PageId = 'welcomeMovement';

  const panel = document.createElement('section');
  panel.className = 'tutorial-panel';
  panel.id = 'tutorial-panel';
  panel.hidden = true;
  panel.dataset.role = 'tutorial-panel';
  panel.setAttribute('role', 'dialog');
  panel.setAttribute('aria-modal', 'false');

  const header = document.createElement('div');
  header.className = 'tutorial-panel__header';
  const heading = document.createElement('h2');
  heading.className = 'tutorial-panel__heading';
  heading.id = 'tutorial-panel-heading';
  const collapse = document.createElement('button');
  collapse.type = 'button';
  collapse.className = 'tutorial-panel__collapse';
  collapse.dataset.role = 'tutorial-sidebar-toggle';
  header.append(heading, collapse);

  const layout = document.createElement('div');
  layout.className = 'tutorial-panel__layout';
  const sidebar = document.createElement('nav');
  sidebar.className = 'tutorial-panel__sidebar';
  sidebar.dataset.role = 'tutorial-sidebar';
  const steps = document.createElement('ol');
  steps.className = 'tutorial-panel__steps';
  sidebar.appendChild(steps);

  const main = document.createElement('div');
  main.className = 'tutorial-panel__main';
  const title = document.createElement('h3');
  title.className = 'tutorial-panel__title';
  title.id = 'tutorial-panel-title';
  const body = document.createElement('p');
  body.className = 'tutorial-panel__body';
  body.id = 'tutorial-panel-body';
  main.append(title, body);
  layout.append(sidebar, main);

  const nav = document.createElement('div');
  nav.className = 'tutorial-panel__nav';
  nav.dataset.role = 'tutorial-navigation';
  const previous = document.createElement('button');
  previous.type = 'button';
  previous.className = 'tutorial-panel__button';
  previous.dataset.role = 'tutorial-previous';
  const next = document.createElement('button');
  next.type = 'button';
  next.className = 'tutorial-panel__button';
  next.dataset.role = 'tutorial-next';
  nav.append(previous, next);

  const options = document.createElement('div');
  options.className = 'tutorial-panel__options';
  options.dataset.role = 'tutorial-options';
  const checkboxLabel = document.createElement('label');
  checkboxLabel.className = 'tutorial-panel__checkbox-row';
  const checkbox = document.createElement('input');
  checkbox.type = 'checkbox';
  checkbox.checked = true;
  checkbox.dataset.role = 'tutorial-show-on-startup';
  const checkboxText = document.createElement('span');
  checkboxLabel.append(checkbox, checkboxText);
  const dismiss = document.createElement('button');
  dismiss.type = 'button';
  dismiss.className = 'tutorial-panel__button tutorial-panel__button--primary';
  dismiss.dataset.role = 'tutorial-dismiss';
  options.append(checkboxLabel, dismiss);

  panel.append(header, layout, nav, options);
  panel.setAttribute('aria-labelledby', heading.id);
  panel.setAttribute('aria-describedby', body.id);
  container.appendChild(panel);

  const sync = () => {
    panel.hidden = !open;
    panel.dataset.tutorialOpen = open ? 'true' : 'false';
    panel.dataset.sidebarCollapsed = collapsed ? 'true' : 'false';
    setText(heading, currentStrings.heading);
    sidebar.setAttribute('aria-label', currentStrings.sidebarLabel);
    setText(
      collapse,
      collapsed ? currentStrings.expandLabel : currentStrings.collapseLabel
    );
    collapse.setAttribute('aria-expanded', collapsed ? 'false' : 'true');
    steps.replaceChildren();
    for (const id of PAGE_IDS) {
      const index = PAGE_IDS.indexOf(id);
      const li = document.createElement('li');
      const step = document.createElement('button');
      step.type = 'button';
      step.className = 'tutorial-panel__step';
      step.dataset.role = 'tutorial-step';
      step.dataset.stepId = id;
      step.disabled = index > 0;
      step.setAttribute('aria-disabled', index > 0 ? 'true' : 'false');
      step.setAttribute(
        'aria-label',
        `${currentStrings.pages[id].title} · ${index === 0 ? currentStrings.unlockedStepLabel : currentStrings.lockedStepLabel}${id === activePage ? ` · ${currentStrings.currentStepLabel}` : ''}`
      );
      if (id === activePage) step.setAttribute('aria-current', 'step');
      setText(step, currentStrings.pages[id].title);
      if (index === 0)
        step.addEventListener('click', () => {
          activePage = id;
          sync();
        });
      li.appendChild(step);
      steps.appendChild(li);
    }
    setText(title, currentStrings.pages[activePage].title);
    setText(body, currentStrings.pages[activePage].body);
    setText(previous, currentStrings.previousLabel);
    setText(next, currentStrings.nextLabel);
    previous.disabled = activePage === 'welcomeMovement';
    next.disabled = true;
    setText(checkboxText, currentStrings.showOnStartupLabel);
    checkbox.title = currentStrings.showOnStartupTitle;
    setText(dismiss, currentStrings.dismissLabel);
    dismiss.title = currentStrings.dismissLabel;
  };

  collapse.addEventListener('click', () => {
    collapsed = !collapsed;
    sync();
  });
  dismiss.addEventListener('click', () => handle.close());

  const handle: TutorialPanelHandle = {
    element: panel,
    open() {
      if (!open) {
        open = true;
        sync();
        onOpenChange?.(true);
      } else sync();
    },
    close() {
      if (open) {
        open = false;
        sync();
        onOpenChange?.(false);
      } else sync();
    },
    toggle(force?: boolean) {
      (force ?? !open) ? this.open() : this.close();
    },
    isOpen() {
      return open;
    },
    setStrings(next) {
      currentStrings = next;
      sync();
    },
    dispose() {
      panel.remove();
      button?.removeAttribute('aria-controls');
    },
  };
  button?.setAttribute('aria-controls', panel.id);
  button?.setAttribute('aria-haspopup', 'dialog');
  sync();
  return handle;
}

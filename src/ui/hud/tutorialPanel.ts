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

interface TutorialPanelOptions {
  container: HTMLElement;
  strings: TutorialPanelStrings;
  onOpenChange?: (open: boolean) => void;
}

const PANEL_ID = 'tutorial-panel';
const TITLE_ID = 'tutorial-panel-title';
const BODY_ID = 'tutorial-panel-body';

const setText = (element: HTMLElement, value: string): void => {
  element.textContent = value;
};

export function createTutorialPanel({
  container,
  strings,
  onOpenChange,
}: TutorialPanelOptions): TutorialPanelHandle {
  let currentStrings = strings;
  let open = false;
  let collapsed = false;
  let disposed = false;

  const element = document.createElement('aside');
  element.id = PANEL_ID;
  element.className = 'tutorial-panel';
  element.hidden = true;
  element.setAttribute('role', 'dialog');
  element.setAttribute('aria-modal', 'false');
  element.setAttribute('aria-labelledby', TITLE_ID);
  element.setAttribute('aria-describedby', BODY_ID);
  element.dataset.role = 'tutorial-panel';

  const header = document.createElement('div');
  header.className = 'tutorial-panel__header';
  const title = document.createElement('h2');
  title.id = TITLE_ID;
  title.className = 'tutorial-panel__title';
  const collapse = document.createElement('button');
  collapse.type = 'button';
  collapse.className = 'tutorial-panel__collapse';
  collapse.dataset.role = 'tutorial-sidebar-toggle';
  header.append(title, collapse);

  const layout = document.createElement('div');
  layout.className = 'tutorial-panel__layout';

  const sidebar = document.createElement('nav');
  sidebar.className = 'tutorial-panel__sidebar';
  sidebar.dataset.role = 'tutorial-sidebar';
  const stepList = document.createElement('ol');
  stepList.className = 'tutorial-panel__steps';
  sidebar.append(stepList);

  const main = document.createElement('div');
  main.className = 'tutorial-panel__main';
  const body = document.createElement('section');
  body.className = 'tutorial-panel__body';
  body.dataset.role = 'tutorial-body';
  const pageTitle = document.createElement('h3');
  pageTitle.className = 'tutorial-panel__page-title';
  const pageBody = document.createElement('p');
  pageBody.id = BODY_ID;
  pageBody.className = 'tutorial-panel__page-body';
  body.append(pageTitle, pageBody);

  const navigation = document.createElement('div');
  navigation.className = 'tutorial-panel__navigation';
  navigation.dataset.role = 'tutorial-navigation';
  const previous = document.createElement('button');
  previous.type = 'button';
  previous.className = 'hud-settings__button tutorial-panel__button';
  previous.dataset.role = 'tutorial-previous';
  previous.disabled = true;
  const next = document.createElement('button');
  next.type = 'button';
  next.className = 'hud-settings__button tutorial-panel__button';
  next.dataset.role = 'tutorial-next';
  next.disabled = true;
  navigation.append(previous, next);

  const options = document.createElement('div');
  options.className = 'tutorial-panel__options';
  options.dataset.role = 'tutorial-options';
  const checkboxLabel = document.createElement('label');
  checkboxLabel.className = 'tutorial-panel__checkbox-row';
  const checkbox = document.createElement('input');
  checkbox.type = 'checkbox';
  checkbox.dataset.role = 'tutorial-show-on-startup';
  const checkboxText = document.createElement('span');
  checkboxLabel.append(checkbox, checkboxText);
  const dismiss = document.createElement('button');
  dismiss.type = 'button';
  dismiss.className = 'hud-settings__button tutorial-panel__button';
  dismiss.dataset.role = 'tutorial-dismiss';
  options.append(checkboxLabel, dismiss);

  main.append(body, navigation, options);
  layout.append(sidebar, main);
  element.append(header, layout);
  container.appendChild(element);

  const render = () => {
    const firstPage = currentStrings.pages[0];
    setText(title, currentStrings.heading);
    sidebar.setAttribute('aria-label', currentStrings.sidebarLabel);
    collapse.setAttribute('aria-expanded', collapsed ? 'false' : 'true');
    collapse.setAttribute(
      'aria-label',
      collapsed ? currentStrings.expandLabel : currentStrings.collapseLabel
    );
    collapse.title = collapsed
      ? currentStrings.expandLabel
      : currentStrings.collapseLabel;
    setText(
      collapse,
      collapsed ? currentStrings.expandLabel : currentStrings.collapseLabel
    );
    element.dataset.sidebarCollapsed = collapsed ? 'true' : 'false';
    stepList.replaceChildren();
    currentStrings.pages.forEach((page, index) => {
      const item = document.createElement('li');
      const step = document.createElement('button');
      step.type = 'button';
      step.className = 'tutorial-panel__step';
      step.dataset.role = 'tutorial-step';
      step.dataset.stepId = page.id;
      step.disabled = index > 0;
      step.setAttribute('aria-disabled', index > 0 ? 'true' : 'false');
      step.setAttribute(
        'aria-label',
        `${page.title} · ${index === 0 ? currentStrings.stepStatus.current : currentStrings.stepStatus.locked}`
      );
      if (index === 0) {
        step.setAttribute('aria-current', 'step');
      }
      const stepTitle = document.createElement('span');
      stepTitle.textContent = page.title;
      const status = document.createElement('span');
      status.className = 'tutorial-panel__step-status';
      status.textContent =
        index === 0
          ? currentStrings.stepStatus.unlocked
          : currentStrings.stepStatus.locked;
      step.append(stepTitle, status);
      item.append(step);
      stepList.append(item);
    });
    setText(pageTitle, firstPage.title);
    setText(pageBody, firstPage.body);
    setText(previous, currentStrings.navigation.previous);
    previous.title = currentStrings.navigation.previous;
    setText(next, currentStrings.navigation.next);
    next.title = currentStrings.navigation.next;
    setText(checkboxText, currentStrings.options.showOnStartup);
    checkbox.title = currentStrings.options.showOnStartup;
    setText(dismiss, currentStrings.options.dismiss);
    dismiss.title = currentStrings.options.dismiss;
  };

  const setOpen = (nextOpen: boolean) => {
    if (open === nextOpen) return;
    open = nextOpen;
    element.hidden = !open;
    container.ownerDocument.documentElement.dataset.tutorialOpen = open
      ? 'true'
      : 'false';
    onOpenChange?.(open);
  };

  collapse.addEventListener('click', () => {
    collapsed = !collapsed;
    render();
  });
  dismiss.addEventListener('click', () => setOpen(false));
  render();

  return {
    element,
    open() {
      setOpen(true);
    },
    close() {
      setOpen(false);
    },
    toggle(force?: boolean) {
      setOpen(force ?? !open);
    },
    isOpen() {
      return open;
    },
    setStrings(nextStrings: TutorialPanelStrings) {
      currentStrings = nextStrings;
      render();
    },
    dispose() {
      if (disposed) return;
      disposed = true;
      delete container.ownerDocument.documentElement.dataset.tutorialOpen;
      element.remove();
    },
  };
}

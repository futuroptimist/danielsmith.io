import type { TutorialPanelStrings } from '../../assets/i18n';
import {
  getTutorialPageOrder,
  type TutorialPageId,
  type TutorialState,
} from '../../systems/tutorial/tutorialState';

export interface TutorialPanelHandle {
  readonly element: HTMLElement;
  open(): void;
  close(): void;
  toggle(force?: boolean): void;
  isOpen(): boolean;
  setStrings(strings: TutorialPanelStrings): void;
  setState(state: TutorialState): void;
  setShowOnStartup(value: boolean): void;
  dispose(): void;
}

export function createTutorialPanel({
  container,
  strings,
  onOpenChange,
  onRequestClose,
  state,
  showOnStartup = true,
  onSelectPage,
  onPrevious,
  onNext,
  onToggleShowOnStartup,
  onRequestTextMode,
}: {
  container: HTMLElement;
  strings: TutorialPanelStrings;
  onOpenChange?: (open: boolean) => void;
  onRequestClose?: () => void;
  state: TutorialState;
  showOnStartup?: boolean;
  onSelectPage?: (pageId: TutorialPageId) => void;
  onPrevious?: () => void;
  onNext?: () => void;
  onToggleShowOnStartup?: (value: boolean) => void;
  onRequestTextMode?: () => void;
}): TutorialPanelHandle {
  let currentStrings = strings;
  let open = false;
  let collapsed = false;
  let currentState = state;
  let currentShowOnStartup = showOnStartup;

  const createChip = (label: string, complete: boolean, ariaLabel: string) => {
    const chip = document.createElement('span');
    chip.className = `tutorial-panel__chip tutorial-panel__chip--${complete ? 'complete' : 'incomplete'}`;
    chip.dataset.complete = complete ? 'true' : 'false';
    chip.setAttribute('role', 'status');
    chip.setAttribute('aria-label', ariaLabel);
    chip.textContent = complete ? `${label} ✓` : label;
    return chip;
  };

  const createProgress = () => {
    const wrapper = document.createElement('div');
    wrapper.className = 'tutorial-panel__progress';
    const { progress, currentPageId } = currentState;
    if (currentPageId === 'welcomeMovement') {
      const items = [
        [
          'forward',
          currentStrings.movement.forward,
          progress.movement.forwardComplete,
        ],
        ['left', currentStrings.movement.left, progress.movement.leftComplete],
        [
          'backward',
          currentStrings.movement.backward,
          progress.movement.backwardComplete,
        ],
        [
          'right',
          currentStrings.movement.right,
          progress.movement.rightComplete,
        ],
      ] as const;
      items.forEach(([, strings, complete]) =>
        wrapper.append(
          createChip(
            strings.label,
            complete,
            complete ? strings.ariaComplete : strings.ariaIncomplete
          )
        )
      );
      const textMode = document.createElement('button');
      textMode.type = 'button';
      textMode.className =
        'tutorial-panel__button tutorial-panel__text-mode-button';
      textMode.dataset.testid = 'tutorial-text-mode';
      textMode.textContent = currentStrings.textMode.label;
      textMode.title = currentStrings.textMode.title;
      textMode.setAttribute('aria-label', currentStrings.textMode.ariaLabel);
      textMode.addEventListener('click', () => onRequestTextMode?.());
      wrapper.append(textMode);
    }
    if (currentPageId === 'zoom') {
      const zoomIn = currentStrings.zoomStatus.in;
      const zoomOut = currentStrings.zoomStatus.out;
      wrapper.append(
        createChip(
          zoomIn.label,
          progress.zoom.zoomInComplete,
          progress.zoom.zoomInComplete
            ? zoomIn.ariaComplete
            : zoomIn.ariaIncomplete
        ),
        createChip(
          zoomOut.label,
          progress.zoom.zoomOutComplete,
          progress.zoom.zoomOutComplete
            ? zoomOut.ariaComplete
            : zoomOut.ariaIncomplete
        )
      );
    }
    if (currentPageId === 'visitPois') {
      const count = Math.min(
        progress.pois.visitedPoiIds.length,
        progress.pois.visitedCountGoal
      );
      const complete = count >= progress.pois.visitedCountGoal;
      const label = currentStrings.poiCounter.labelTemplate
        .replace('{count}', String(count))
        .replace('{goal}', String(progress.pois.visitedCountGoal));
      const aria = currentStrings.poiCounter.ariaTemplate
        .replace('{count}', String(count))
        .replace('{goal}', String(progress.pois.visitedCountGoal));
      wrapper.append(createChip(label, complete, aria));
    }
    if (currentPageId === 'findGitshelves') {
      const strings = currentStrings.gitshelvesStatus;
      const complete = progress.gitshelves.completed;
      wrapper.append(
        createChip(
          strings.label,
          complete,
          complete ? strings.ariaComplete : strings.ariaIncomplete
        )
      );
    }
    return wrapper;
  };

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
    collapse.setAttribute('aria-controls', 'tutorial-panel-steps');
    collapse.addEventListener('click', () => {
      collapsed = !collapsed;
      render();
    });
    const list = document.createElement('ol');
    list.className = 'tutorial-panel__steps';
    list.id = 'tutorial-panel-steps';
    const unlocked = new Set(currentState.unlockedPageIds);
    const completed = new Set(currentState.completedPageIds);
    const pageOrder = getTutorialPageOrder();
    pageOrder.forEach((id) => {
      const li = document.createElement('li');
      const button = document.createElement('button');
      const isUnlocked = unlocked.has(id);
      const isActive = id === currentState.currentPageId;
      const isCompleted = completed.has(id);
      button.type = 'button';
      button.className = 'tutorial-panel__step';
      button.dataset.testid = `tutorial-step-${id}`;
      button.textContent = currentStrings.pages[id].title;
      button.disabled = !isUnlocked;
      button.setAttribute('aria-disabled', isUnlocked ? 'false' : 'true');
      const stepStateLabel = isActive
        ? currentStrings.activeStepLabel
        : isCompleted
          ? currentStrings.completedStepLabel
          : isUnlocked
            ? currentStrings.unlockedStepLabel
            : currentStrings.lockedStepLabel;
      button.setAttribute(
        'aria-label',
        `${currentStrings.pages[id].title} — ${stepStateLabel}`
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
        onSelectPage?.(id);
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
    pageHeading.textContent =
      currentStrings.pages[currentState.currentPageId].title;
    const pageBody = document.createElement('p');
    pageBody.className = 'tutorial-panel__copy';
    pageBody.id = 'tutorial-panel-description';
    pageBody.textContent =
      currentStrings.pages[currentState.currentPageId].body;
    element.setAttribute('aria-describedby', pageBody.id);
    body.append(pageHeading, pageBody, createProgress());

    const nav = document.createElement('div');
    nav.className = 'tutorial-panel__nav';
    nav.dataset.testid = 'tutorial-navigation';
    const previous = document.createElement('button');
    previous.type = 'button';
    previous.className = 'tutorial-panel__button';
    previous.textContent = currentStrings.previousLabel;
    const currentIndex = pageOrder.indexOf(currentState.currentPageId);
    const hasPreviousUnlockedPage = pageOrder
      .slice(0, currentIndex)
      .some((pageId) => unlocked.has(pageId));
    previous.disabled = !hasPreviousUnlockedPage;
    previous.addEventListener('click', () => onPrevious?.());
    const next = document.createElement('button');
    next.type = 'button';
    next.className = 'tutorial-panel__button tutorial-panel__button--primary';
    next.textContent = currentStrings.nextLabel;
    const nextPage = pageOrder[currentIndex + 1];
    next.disabled = !nextPage || !unlocked.has(nextPage);
    next.addEventListener('click', () => onNext?.());
    nav.append(previous, next);

    const options = document.createElement('div');
    options.className = 'tutorial-panel__options';
    options.dataset.testid = 'tutorial-options';
    const label = document.createElement('label');
    label.className = 'tutorial-panel__checkbox-row';
    label.title = currentStrings.showOnStartupTitle;
    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.checked = currentShowOnStartup;
    checkbox.addEventListener('change', () => {
      currentShowOnStartup = checkbox.checked;
      onToggleShowOnStartup?.(checkbox.checked);
    });
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
    dismiss.addEventListener('click', () => {
      if (onRequestClose) {
        onRequestClose();
        return;
      }
      handle.close();
    });
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
    setState(next) {
      currentState = next;
      render();
    },
    setShowOnStartup(next) {
      currentShowOnStartup = next;
      render();
    },
    dispose() {
      if (open) {
        open = false;
        element.hidden = true;
        delete element.dataset.open;
        onOpenChange?.(false);
      }
      element.remove();
    },
  };

  render();
  container.appendChild(element);
  return handle;
}

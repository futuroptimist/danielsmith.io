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
  onTextMode,
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
  onTextMode?: () => void;
}): TutorialPanelHandle {
  let currentStrings = strings;
  let open = false;
  let collapsed = false;
  let currentState = state;
  let currentShowOnStartup = showOnStartup;

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
    body.append(pageHeading, pageBody);

    const statusText = (complete: boolean) =>
      complete ? currentStrings.completeLabel : currentStrings.incompleteLabel;
    const createChip = (
      label: string,
      complete: boolean,
      ariaLabel: string
    ) => {
      const chip = document.createElement('span');
      chip.className = `tutorial-panel__chip tutorial-panel__chip--${
        complete ? 'complete' : 'incomplete'
      }`;
      chip.setAttribute('role', 'status');
      chip.setAttribute('aria-label', ariaLabel);
      chip.textContent = complete
        ? `${label} ✓ ${currentStrings.checkmarkLabel}`
        : `${label} · ${currentStrings.incompleteLabel}`;
      return chip;
    };
    const progress = document.createElement('div');
    progress.className = 'tutorial-panel__progress';
    progress.dataset.testid = `tutorial-progress-${currentState.currentPageId}`;
    if (currentState.currentPageId === 'welcomeMovement') {
      const movementEntries = [
        ['forward', currentState.progress.movement.forwardComplete],
        ['left', currentState.progress.movement.leftComplete],
        ['backward', currentState.progress.movement.backwardComplete],
        ['right', currentState.progress.movement.rightComplete],
      ] as const;
      movementEntries.forEach(([direction, complete]) => {
        const label = currentStrings.movement.labels[direction];
        progress.append(
          createChip(
            label,
            complete,
            currentStrings.movement.ariaLabelTemplate
              .replace('{label}', label)
              .replace('{status}', statusText(complete))
          )
        );
      });
      const textOnly = document.createElement('button');
      textOnly.type = 'button';
      textOnly.className = 'hud-menu__button tutorial-panel__text-mode-button';
      textOnly.textContent = currentStrings.textOnlyButtonLabel;
      textOnly.title = currentStrings.textOnlyButtonTitle;
      textOnly.setAttribute(
        'aria-label',
        currentStrings.textOnlyButtonAriaLabel
      );
      textOnly.dataset.testid = 'tutorial-text-mode';
      textOnly.addEventListener('click', () => onTextMode?.());
      progress.append(textOnly);
    }
    if (currentState.currentPageId === 'zoom') {
      const zoomEntries = [
        [
          currentStrings.zoomProgress.inLabel,
          currentState.progress.zoom.zoomInComplete,
        ],
        [
          currentStrings.zoomProgress.outLabel,
          currentState.progress.zoom.zoomOutComplete,
        ],
      ] as const;
      zoomEntries.forEach(([label, complete]) => {
        progress.append(
          createChip(
            label,
            complete,
            currentStrings.zoomProgress.ariaLabelTemplate
              .replace('{label}', label)
              .replace('{status}', statusText(complete))
          )
        );
      });
    }
    if (currentState.currentPageId === 'visitPois') {
      const count = Math.min(
        currentState.progress.pois.visitedPoiIds.length,
        currentState.progress.pois.visitedCountGoal
      );
      const complete = count >= currentState.progress.pois.visitedCountGoal;
      const label = currentStrings.poiProgress.counterTemplate.replace(
        '{count}',
        String(count)
      );
      progress.append(
        createChip(
          label,
          complete,
          currentStrings.poiProgress.ariaLabelTemplate
            .replace('{count}', String(count))
            .replace('{status}', statusText(complete))
        )
      );
    }
    if (currentState.currentPageId === 'findGitshelves') {
      const complete = currentState.progress.gitshelves.completed;
      progress.append(
        createChip(
          currentStrings.gitshelvesProgress.label,
          complete,
          currentStrings.gitshelvesProgress.ariaLabelTemplate.replace(
            '{status}',
            statusText(complete)
          )
        )
      );
    }
    body.append(progress);

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

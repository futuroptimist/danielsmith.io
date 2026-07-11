import { formatMessage, type TutorialPanelStrings } from '../../assets/i18n';
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
  element.tabIndex = -1;

  // Live region: mounted once on element and never removed by re-renders so
  // screen readers maintain a stable subscription to its aria-live region.
  const liveRegion = document.createElement('p');
  liveRegion.className = 'tutorial-panel__live-region';
  liveRegion.setAttribute('aria-live', 'polite');
  liveRegion.setAttribute('aria-atomic', 'true');
  liveRegion.dataset.testid = 'tutorial-status-live';
  element.appendChild(liveRegion);

  // Wrapper for the visual content that is rebuilt on each render.
  // Keeping it separate from liveRegion means replaceChildren only touches
  // visual nodes; liveRegion stays mounted on element throughout.
  const contentWrapper = document.createElement('div');
  element.appendChild(contentWrapper);

  // Seed with the initial completed IDs so the first render produces no
  // announcement for pages that were already complete on construction.
  let prevCompletedIds = new Set<TutorialPageId>(state.completedPageIds);

  const createStatusChip = ({
    label,
    complete,
    ariaLabel,
    testId,
  }: {
    label: string;
    complete: boolean;
    ariaLabel: string;
    testId: string;
  }) => {
    const chip = document.createElement('span');
    chip.className = `tutorial-panel__chip tutorial-panel__chip--${complete ? 'complete' : 'incomplete'}`;
    chip.dataset.testid = testId;
    chip.setAttribute('role', 'img');
    chip.setAttribute('aria-label', ariaLabel);
    chip.dataset.status = complete ? 'complete' : 'incomplete';
    chip.textContent = complete ? `${label} ✓` : label;
    return chip;
  };

  const appendPageProgress = (body: HTMLElement) => {
    const progressGroup = document.createElement('div');
    progressGroup.className = 'tutorial-panel__progress';
    progressGroup.dataset.testid = 'tutorial-progress';
    const actions = currentStrings.actions;
    const progress = currentState.progress;
    const pageId = currentState.currentPageId;
    if (pageId === 'welcomeMovement') {
      const prompt = document.createElement('p');
      prompt.className = 'tutorial-panel__progress-prompt';
      prompt.textContent = actions.movementPrompt;
      const chips = document.createElement('div');
      chips.className = 'tutorial-panel__chips';
      const directions = [
        ['forward', progress.movement.forwardComplete],
        ['left', progress.movement.leftComplete],
        ['backward', progress.movement.backwardComplete],
        ['right', progress.movement.rightComplete],
      ] as const;
      directions.forEach(([direction, complete]) => {
        const status = complete ? actions.complete : actions.incomplete;
        chips.append(
          createStatusChip({
            label: actions.movementDirections[direction],
            complete,
            ariaLabel: formatMessage(actions.movementChipAriaTemplate, {
              direction: actions.movementDirections[direction],
              status,
            }),
            testId: `tutorial-movement-${direction}`,
          })
        );
      });
      const textMode = document.createElement('button');
      textMode.type = 'button';
      textMode.className =
        'overlay__menu-button tutorial-panel__button--text-mode';
      textMode.dataset.testid = 'tutorial-text-mode';
      textMode.textContent = actions.textModeLabel;
      textMode.title = actions.textModeTitle;
      textMode.setAttribute('aria-label', actions.textModeAriaLabel);
      textMode.addEventListener('click', () => onTextMode?.());
      progressGroup.append(prompt, chips, textMode);
    } else if (pageId === 'zoom') {
      const prompt = document.createElement('p');
      prompt.className = 'tutorial-panel__progress-prompt';
      prompt.textContent = actions.zoomPrompt;
      const chips = document.createElement('div');
      chips.className = 'tutorial-panel__chips';
      [
        [actions.zoomInLabel, progress.zoom.zoomInComplete, 'in'],
        [actions.zoomOutLabel, progress.zoom.zoomOutComplete, 'out'],
      ].forEach(([label, complete, id]) => {
        const status = complete ? actions.complete : actions.incomplete;
        chips.append(
          createStatusChip({
            label: String(label),
            complete: Boolean(complete),
            ariaLabel: formatMessage(actions.zoomChipAriaTemplate, {
              direction: String(label),
              status,
            }),
            testId: `tutorial-zoom-${id}`,
          })
        );
      });
      progressGroup.append(prompt, chips);
    } else if (pageId === 'visitPois') {
      const completedPages = new Set(currentState.completedPageIds);
      const complete = completedPages.has('visitPois');
      const count = complete
        ? progress.pois.visitedCountGoal
        : Math.min(
            progress.pois.visitedPoiIds.length,
            progress.pois.visitedCountGoal
          );
      const status = complete ? actions.complete : actions.incomplete;
      progressGroup.append(
        createStatusChip({
          label: formatMessage(actions.poiCounterTemplate, {
            count,
            goal: progress.pois.visitedCountGoal,
          }),
          complete,
          ariaLabel: formatMessage(actions.poiCounterAriaTemplate, {
            count,
            goal: progress.pois.visitedCountGoal,
            status,
          }),
          testId: 'tutorial-poi-counter',
        })
      );
    } else if (pageId === 'findGitshelves') {
      const complete = progress.gitshelves.completed;
      const status = complete ? actions.complete : actions.incomplete;
      progressGroup.append(
        createStatusChip({
          label: actions.gitshelvesObjective,
          complete,
          ariaLabel: formatMessage(actions.gitshelvesAriaTemplate, { status }),
          testId: 'tutorial-gitshelves-status',
        })
      );
    }
    if (progressGroup.childElementCount > 0) {
      body.append(progressGroup);
    }
  };

  const render = () => {
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
    appendPageProgress(body);

    const nav = document.createElement('div');
    nav.className = 'tutorial-panel__nav';
    nav.dataset.testid = 'tutorial-navigation';
    const previous = document.createElement('button');
    previous.type = 'button';
    previous.className = 'tutorial-panel__button';
    previous.textContent = currentStrings.previousLabel;
    previous.setAttribute('aria-label', currentStrings.previousLabel);
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
    next.setAttribute('aria-label', currentStrings.nextLabel);
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
    dismiss.setAttribute('aria-label', currentStrings.dismissTitle);
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

    // Replace only the visual content; liveRegion stays mounted on element.
    contentWrapper.replaceChildren(heading, shell);

    // After the visual render, announce newly completed pages. Diff against the
    // IDs that were already complete before this render to avoid replaying stale
    // announcements on unrelated rerenders (collapse, setStrings, etc.).
    // Single-pass: build the next set and collect new IDs simultaneously.
    const newlyCompleted: TutorialPageId[] = [];
    const nextCompletedIds = new Set<TutorialPageId>();
    for (const id of currentState.completedPageIds) {
      nextCompletedIds.add(id);
      if (!prevCompletedIds.has(id)) newlyCompleted.push(id);
    }
    prevCompletedIds = nextCompletedIds;

    if (newlyCompleted.length > 0) {
      const titles = newlyCompleted.map((id) => currentStrings.pages[id].title);
      liveRegion.textContent = `${titles.join(', ')} — ${currentStrings.completedStepLabel}`;
    } else {
      liveRegion.textContent = '';
    }
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

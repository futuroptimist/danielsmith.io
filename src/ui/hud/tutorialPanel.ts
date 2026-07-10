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

    const chipRow = document.createElement('div');
    chipRow.className = 'tutorial-panel__chips';
    const addChip = (
      label: string,
      complete: boolean,
      ariaLabel: string,
      testId: string
    ) => {
      const chip = document.createElement('span');
      chip.className = 'tutorial-panel__chip';
      chip.classList.toggle('tutorial-panel__chip--complete', complete);
      chip.dataset.testid = testId;
      chip.setAttribute('role', 'status');
      chip.setAttribute('aria-label', ariaLabel);
      chip.textContent = complete
        ? `${label} ✓ ${currentStrings.status.complete}`
        : `${label} · ${currentStrings.status.incomplete}`;
      return chip;
    };
    const statusLabel = (complete: boolean) =>
      complete
        ? currentStrings.status.complete
        : currentStrings.status.incomplete;
    if (currentState.currentPageId === 'welcomeMovement') {
      const movement = currentState.progress.movement;
      const directionOrder = ['forward', 'left', 'backward', 'right'] as const;
      directionOrder.forEach((direction) => {
        const complete = movement[`${direction}Complete`];
        chipRow.append(
          addChip(
            currentStrings.movement.chips[direction],
            complete,
            currentStrings.movement.chipAriaLabelTemplate
              .replace('{direction}', currentStrings.movement.chips[direction])
              .replace('{status}', statusLabel(complete)),
            `tutorial-movement-${direction}`
          )
        );
      });
      const textButton = document.createElement('button');
      textButton.type = 'button';
      textButton.className =
        'control-overlay__menu-button tutorial-panel__text-mode-button';
      textButton.dataset.testid = 'tutorial-text-mode';
      textButton.textContent = currentStrings.textOnlyButton.label;
      textButton.title = currentStrings.textOnlyButton.title;
      textButton.setAttribute(
        'aria-label',
        currentStrings.textOnlyButton.ariaLabel
      );
      textButton.addEventListener('click', () => onTextMode?.());
      body.append(chipRow, textButton);
    } else if (currentState.currentPageId === 'zoom') {
      const zoom = currentState.progress.zoom;
      const chips = [
        [currentStrings.zoomProgress.inLabel, zoom.zoomInComplete, 'in'],
        [currentStrings.zoomProgress.outLabel, zoom.zoomOutComplete, 'out'],
      ] as const;
      chips.forEach(([label, complete, id]) => {
        chipRow.append(
          addChip(
            label,
            complete,
            currentStrings.zoomProgress.chipAriaLabelTemplate
              .replace('{direction}', label)
              .replace('{status}', statusLabel(complete)),
            `tutorial-zoom-${id}`
          )
        );
      });
      body.append(chipRow);
    } else if (currentState.currentPageId === 'visitPois') {
      const count = Math.min(
        currentState.progress.pois.visitedPoiIds.length,
        currentState.progress.pois.visitedCountGoal
      );
      const complete = count >= currentState.progress.pois.visitedCountGoal;
      chipRow.append(
        addChip(
          currentStrings.poiProgress.counterTemplate
            .replace('{count}', String(count))
            .replace(
              '{goal}',
              String(currentState.progress.pois.visitedCountGoal)
            ),
          complete,
          currentStrings.poiProgress.counterAriaLabelTemplate
            .replace('{count}', String(count))
            .replace(
              '{goal}',
              String(currentState.progress.pois.visitedCountGoal)
            )
            .replace('{status}', statusLabel(complete)),
          'tutorial-poi-counter'
        )
      );
      body.append(chipRow);
    } else if (currentState.currentPageId === 'findGitshelves') {
      const complete = currentState.progress.gitshelves.completed;
      chipRow.append(
        addChip(
          currentStrings.gitshelvesProgress.label,
          complete,
          currentStrings.gitshelvesProgress.ariaLabelTemplate.replace(
            '{status}',
            statusLabel(complete)
          ),
          'tutorial-gitshelves-status'
        )
      );
      body.append(chipRow);
    }

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

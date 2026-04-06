import { escapeHtml } from "../core/utils.js";

const FUNNEL_STEPS = [
  { id: "visit_town_door", label: "Check Town", summary: "Step onto one labeled town door before the first descent." },
  { id: "enter_keep", label: "Enter Keep", summary: "Walk north on the town road and descend." },
  { id: "find_objective", label: "Find Objective", summary: "Use the marked route and survey to reach the floor objective." },
  { id: "clear_objective", label: "Clear Objective", summary: "Resolve the marked room to unlock the next decision." },
  { id: "choose_extract_or_greed", label: "Choose Exit Or Greed", summary: "Leave clean or stay for one more prize." }
];

function getFlagKey(stepId) {
  return `onboarding_${stepId}`;
}

export function hasOnboardingFlag(game, stepId) {
  return Boolean(game.storyFlags?.[getFlagKey(stepId)]);
}

export function markOnboardingFlag(game, stepId) {
  if (!game?.storyFlags || !stepId) {
    return false;
  }
  const key = getFlagKey(stepId);
  if (game.storyFlags[key]) {
    return false;
  }
  game.storyFlags[key] = true;
  return true;
}

export function shouldShowOnboardingChecklist(game) {
  if (!game?.player || !game.storyFlags) {
    return false;
  }
  return !hasOnboardingFlag(game, "clear_objective");
}

export function getOnboardingSteps(game) {
  return FUNNEL_STEPS.map((step, index) => {
    const done = hasOnboardingFlag(game, step.id);
    const previousComplete = index === 0 || hasOnboardingFlag(game, FUNNEL_STEPS[index - 1].id);
    return {
      ...step,
      done,
      active: !done && previousComplete
    };
  });
}

export function renderOnboardingChecklist(game) {
  if (!shouldShowOnboardingChecklist(game)) {
    return "";
  }
  const steps = getOnboardingSteps(game);
  const directive = typeof game.getLoopDirective === "function" ? game.getLoopDirective() : null;
  const activeSummary = directive?.primaryText || directive?.supportText || "";
  return `
    <div class="onboarding-checklist">
      <div class="onboarding-checklist-label">First Run Loop</div>
      <div class="onboarding-step-row">
        ${steps.map((step) => `
          <span class="onboarding-step${step.done ? " done" : step.active ? " active" : ""}">${escapeHtml(step.label)}</span>
        `).join("")}
      </div>
      ${activeSummary ? `<div class="field-brief-support">${escapeHtml(activeSummary)}</div>` : ""}
    </div>
  `;
}

import type { MaterializationStep } from "./types";
import { MATERIALIZATION_COPY } from "./uiModel";

interface MaterializationOverlayProps {
  step: MaterializationStep;
}

const STEPS: readonly MaterializationStep[] = [
  "requesting",
  "validating",
  "compiling",
  "generating-spawn",
  "staging",
  "entering",
];

export function MaterializationOverlay({
  step,
}: MaterializationOverlayProps): React.JSX.Element {
  const copy = MATERIALIZATION_COPY[step];
  const activeIndex = STEPS.indexOf(step);

  return (
    <section
      className="dc-materialization"
      role="status"
      aria-live="polite"
      aria-atomic="true"
      aria-busy={step !== "entering"}
    >
      <div className="dc-materialization-orbit" aria-hidden="true">
        <i />
        <i />
        <i />
      </div>
      <p className="dc-kicker">Materializing</p>
      <h2>{copy.label}</h2>
      <p>{copy.detail}</p>
      <ol className="dc-phase-track" aria-label="Dream materialization progress">
        {STEPS.map((phase, index) => (
          <li
            key={phase}
            className={index <= activeIndex ? "is-reached" : undefined}
            aria-current={phase === step ? "step" : undefined}
          >
            <span className="dc-sr-only">{MATERIALIZATION_COPY[phase].label}</span>
          </li>
        ))}
      </ol>
    </section>
  );
}

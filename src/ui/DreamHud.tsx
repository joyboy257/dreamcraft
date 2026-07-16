import type { ObjectiveView } from "./types";

interface DreamHudProps {
  title: string;
  objective: ObjectiveView | null;
  interactionPrompt?: string | null;
  toast?: string | null;
  paused?: boolean;
  onOpenPause: () => void;
}

export function DreamHud({
  title,
  objective,
  interactionPrompt = null,
  toast = null,
  paused = false,
  onOpenPause,
}: DreamHudProps): React.JSX.Element {
  return (
    <div className="dc-hud" aria-hidden={paused || undefined}>
      <header className="dc-hud-header">
        <div>
          <p className="dc-kicker">Now dreaming</p>
          <p className="dc-dream-title">{title}</p>
        </div>
        <button
          type="button"
          className="dc-icon-button"
          tabIndex={paused ? -1 : undefined}
          onClick={onOpenPause}
        >
          <span aria-hidden="true">Ⅱ</span>
          <span className="dc-sr-only">Pause and open controls</span>
        </button>
      </header>

      {objective ? (
        <section
          className="dc-objective"
          aria-label="Current objective"
          aria-live="polite"
          role="status"
        >
          <p className="dc-kicker">Remember</p>
          <strong>{objective.title}</strong>
          {objective.detail ? <span>{objective.detail}</span> : null}
          {objective.progress ? <small>{objective.progress}</small> : null}
        </section>
      ) : null}

      <div className="dc-crosshair" aria-hidden="true"><i /></div>

      <div className="dc-hud-messages">
        {toast ? <p className="dc-toast" role="status">{toast}</p> : null}
        {interactionPrompt ? (
          <p className="dc-interaction-prompt" role="status">
            <kbd>E</kbd>
            <span>{interactionPrompt}</span>
          </p>
        ) : null}
      </div>
    </div>
  );
}

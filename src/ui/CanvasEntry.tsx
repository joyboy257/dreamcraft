import { useCallback, useEffect, useState } from "react";
import type { CanvasEntryProps } from "./types";

export function CanvasEntry({
  isReady,
  isEntered,
  onEnter,
  onInputReady,
  children,
}: CanvasEntryProps): React.JSX.Element {
  const [revealing, setRevealing] = useState(false);

  const finishReveal = useCallback((): void => {
    setRevealing(false);
  }, []);

  useEffect(() => {
    if (!isEntered || !revealing) return;
    // The transition event is the normal completion path. The bounded fallback
    // preserves a usable input surface in browsers that suppress transitions.
    const timer = window.setTimeout(finishReveal, 650);
    return () => window.clearTimeout(timer);
  }, [finishReveal, isEntered, revealing]);

  useEffect(() => {
    if (isEntered && !revealing) onInputReady?.();
  }, [isEntered, onInputReady, revealing]);

  const enter = (): void => {
    setRevealing(true);
    onEnter();
  };

  return (
    <div className="dc-canvas-entry">
      {children}
      {!isEntered || revealing ? (
        <div
          className={`dc-entry-scrim${revealing ? " is-revealing" : ""}`}
          data-testid="entry-scrim"
          aria-hidden={revealing || undefined}
          onTransitionEnd={(event) => {
            if (event.target === event.currentTarget && event.propertyName === "opacity") finishReveal();
          }}
        >
          <div>
            <p className="dc-kicker">{isReady ? "Dream stabilized" : "World forming"}</p>
            <h2>{isReady ? "Open your eyes." : "The path is still appearing…"}</h2>
            <p>
              {isReady
                ? "Enter to capture the mouse and begin audio. Escape pauses at any time."
                : "The central area must be safe before you can enter."}
            </p>
            <button
              className="dc-primary-action"
              type="button"
              disabled={!isReady}
              onClick={enter}
            >
              {isReady ? "Step into the dream" : "Preparing your arrival…"}
              <span aria-hidden="true">→</span>
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}

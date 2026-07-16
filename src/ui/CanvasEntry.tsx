import { useEffect, useState } from "react";
import type { CanvasEntryProps } from "./types";

export function CanvasEntry({
  isReady,
  isEntered,
  onEnter,
  children,
}: CanvasEntryProps): React.JSX.Element {
  const [revealing, setRevealing] = useState(false);

  useEffect(() => {
    if (!isEntered || !revealing) return;
    const timer = window.setTimeout(() => setRevealing(false), 520);
    return () => window.clearTimeout(timer);
  }, [isEntered, revealing]);

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
          aria-hidden={revealing || undefined}
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

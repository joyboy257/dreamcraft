import { useEffect, useRef, useState, type KeyboardEvent } from "react";
import type { DialogueView } from "./types";
import { clampDialogueChoiceIndex } from "./uiModel";

interface DialogueOverlayProps {
  dialogue: DialogueView;
  onChoose: (choiceId: string) => void;
  onClose?: () => void;
}

export function DialogueOverlay({
  dialogue,
  onChoose,
  onClose,
}: DialogueOverlayProps): React.JSX.Element {
  const panelRef = useRef<HTMLDivElement>(null);
  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    const previouslyFocused = document.activeElement;
    panelRef.current?.focus();
    return () => {
      if (previouslyFocused instanceof HTMLElement) previouslyFocused.focus();
    };
  }, [dialogue.id, dialogue.text]);

  const choose = (index: number): void => {
    const choice = dialogue.choices[index];
    if (choice) onChoose(choice.id);
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>): void => {
    if (event.key === "ArrowDown" || event.key === "ArrowRight") {
      event.preventDefault();
      setActiveIndex((current) =>
        clampDialogueChoiceIndex(current + 1, dialogue.choices.length),
      );
    } else if (event.key === "ArrowUp" || event.key === "ArrowLeft") {
      event.preventDefault();
      setActiveIndex((current) =>
        clampDialogueChoiceIndex(current - 1, dialogue.choices.length),
      );
    } else if (event.key === "Enter") {
      event.preventDefault();
      choose(activeIndex);
    } else if (/^[1-9]$/.test(event.key)) {
      const index = Number(event.key) - 1;
      if (index < dialogue.choices.length) {
        event.preventDefault();
        choose(index);
      }
    } else if (event.key === "Escape" && dialogue.canClose && onClose) {
      event.preventDefault();
      onClose();
    } else if (event.key === "Tab") {
      const buttons = panelRef.current?.querySelectorAll<HTMLButtonElement>("button");
      if (!buttons?.length) {
        event.preventDefault();
        return;
      }
      const first = buttons[0];
      const last = buttons[buttons.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last?.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first?.focus();
      }
    }
  };

  return (
    <div className="dc-modal-layer">
      <div
        ref={panelRef}
        className="dc-dialogue"
        role="dialog"
        aria-modal="true"
        aria-labelledby="dc-dialogue-speaker"
        aria-describedby="dc-dialogue-text"
        tabIndex={-1}
        onKeyDown={handleKeyDown}
      >
        <p className="dc-kicker">Someone speaks</p>
        <h2 id="dc-dialogue-speaker">{dialogue.speaker}</h2>
        <p id="dc-dialogue-text" className="dc-dialogue-text">{dialogue.text}</p>
        {dialogue.choices.length > 0 ? (
          <div className="dc-dialogue-choices" aria-label="Responses">
            {dialogue.choices.map((choice, index) => (
              <button
                key={choice.id}
                type="button"
                className={index === activeIndex ? "is-active" : undefined}
                onFocus={() => setActiveIndex(index)}
                onClick={() => onChoose(choice.id)}
              >
                <kbd>{index + 1}</kbd>
                <span>{choice.label}</span>
              </button>
            ))}
          </div>
        ) : null}
        {dialogue.canClose && onClose ? (
          <button type="button" className="dc-text-button" onClick={onClose}>
            Leave conversation <kbd>Esc</kbd>
          </button>
        ) : null}
      </div>
    </div>
  );
}

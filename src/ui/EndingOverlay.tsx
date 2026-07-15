import type { EndingView } from "./types";
import { useModalFocus } from "./useModalFocus";

interface EndingOverlayProps {
  ending: EndingView;
  onReplay: () => void;
  onRemix: () => void;
  onNewDream: () => void;
}

export function EndingOverlay({ ending, onReplay, onRemix, onNewDream }: EndingOverlayProps): React.JSX.Element {
  const { panelRef, onKeyDown } = useModalFocus<HTMLElement>();

  return (
    <div className="dc-modal-layer dc-ending-layer">
      <section
        ref={panelRef}
        className="dc-ending"
        role="dialog"
        aria-modal="true"
        aria-labelledby="dc-ending-title"
        tabIndex={-1}
        onKeyDown={onKeyDown}
      >
        <span className="dc-ending-mark" aria-hidden="true">✦</span>
        <p className="dc-kicker">Dream remembered</p>
        <h2 id="dc-ending-title">{ending.title}</h2>
        <p className="dc-ending-narration">{ending.narration}</p>
        {ending.detail ? <p className="dc-ending-detail">{ending.detail}</p> : null}
        <div className="dc-ending-actions">
          <button className="dc-primary-action" type="button" onClick={onReplay}>Replay</button>
          <button type="button" onClick={onRemix}>Remix this dream</button>
          <button type="button" onClick={onNewDream}>Remember another</button>
        </div>
      </section>
    </div>
  );
}

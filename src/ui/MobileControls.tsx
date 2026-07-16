import { useRef, type PointerEvent as ReactPointerEvent } from "react";

export type MobileControl = "forward" | "back" | "left" | "right" | "jump" | "interact";

interface MobileControlsProps {
  onControlChange: (control: MobileControl, pressed: boolean) => void;
  onLook: (deltaX: number, deltaY: number) => void;
}

export function MobileControls({ onControlChange, onLook }: MobileControlsProps): React.JSX.Element {
  const lastPointRef = useRef<{ x: number; y: number } | null>(null);
  const capturePointer = (element: Element, pointerId: number): void => {
    try {
      element.setPointerCapture(pointerId);
    } catch {
      // Browsers may cancel a touch before React receives the pointer event.
    }
  };
  const startControl = (control: MobileControl, event: ReactPointerEvent<HTMLButtonElement>): void => {
    event.preventDefault();
    capturePointer(event.currentTarget, event.pointerId);
    onControlChange(control, true);
  };
  const stopControl = (control: MobileControl): void => onControlChange(control, false);
  const moveLook = (event: ReactPointerEvent<HTMLDivElement>): void => {
    const lastPoint = lastPointRef.current;
    if (lastPoint) onLook(event.clientX - lastPoint.x, event.clientY - lastPoint.y);
    lastPointRef.current = { x: event.clientX, y: event.clientY };
  };

  return (
    <div className="dc-mobile-controls" role="group" aria-label="Touch game controls">
      <div className="dc-move-pad" role="group" aria-label="Movement controls">
        {(["forward", "left", "back", "right"] as const).map((control) => (
          <button
            key={control}
            type="button"
            aria-label={`Move ${control}`}
            onPointerDown={(event) => startControl(control, event)}
            onPointerUp={() => stopControl(control)}
            onPointerCancel={() => stopControl(control)}
            onLostPointerCapture={() => stopControl(control)}
          >
            <span aria-hidden="true">{control === "forward" ? "↑" : control === "back" ? "↓" : control === "left" ? "←" : "→"}</span>
          </button>
        ))}
      </div>
      <div
        className="dc-look-zone"
        aria-hidden="true"
        onPointerDown={(event) => {
          lastPointRef.current = { x: event.clientX, y: event.clientY };
          capturePointer(event.currentTarget, event.pointerId);
        }}
        onPointerMove={moveLook}
        onPointerUp={() => { lastPointRef.current = null; }}
        onPointerCancel={() => { lastPointRef.current = null; }}
      />
      <div className="dc-action-buttons">
        {(["jump", "interact"] as const).map((control) => (
          <button
            key={control}
            type="button"
            onPointerDown={(event) => startControl(control, event)}
            onPointerUp={() => stopControl(control)}
            onPointerCancel={() => stopControl(control)}
            onLostPointerCapture={() => stopControl(control)}
          >{control === "jump" ? "Jump" : "Interact"}</button>
        ))}
      </div>
    </div>
  );
}

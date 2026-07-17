import { useRef, type PointerEvent as ReactPointerEvent } from "react";
import { joystickVector, type MoveVector } from "./mobileInput";

export type MobileControl = "forward" | "back" | "left" | "right" | "jump" | "interact";

interface MobileControlsProps {
  onControlChange: (control: MobileControl, pressed: boolean) => void;
  onMoveVector: (x: number, y: number) => void;
  onLook: (deltaX: number, deltaY: number) => void;
}

export function MobileControls({ onControlChange, onMoveVector, onLook }: MobileControlsProps): React.JSX.Element {
  const lastPointRef = useRef<{ x: number; y: number } | null>(null);
  const joystickPointerId = useRef<number | null>(null);
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
  const updateJoystick = (event: ReactPointerEvent<HTMLDivElement>): void => {
    const bounds = event.currentTarget.getBoundingClientRect();
    const center: MoveVector = { x: bounds.left + bounds.width / 2, y: bounds.top + bounds.height / 2 };
    const vector = joystickVector({ x: event.clientX, y: event.clientY }, center, Math.min(bounds.width, bounds.height) / 2);
    onMoveVector(vector.x, vector.y);
    event.currentTarget.style.setProperty("--dc-stick-x", `${vector.x * 34}px`);
    event.currentTarget.style.setProperty("--dc-stick-y", `${vector.y * 34}px`);
  };
  const endJoystick = (element: HTMLDivElement): void => {
    joystickPointerId.current = null; onMoveVector(0, 0);
    element.style.setProperty("--dc-stick-x", "0px"); element.style.setProperty("--dc-stick-y", "0px");
  };
  const moveLook = (event: ReactPointerEvent<HTMLDivElement>): void => {
    const lastPoint = lastPointRef.current;
    if (lastPoint) onLook(event.clientX - lastPoint.x, event.clientY - lastPoint.y);
    lastPointRef.current = { x: event.clientX, y: event.clientY };
  };

  return (
    <div className="dc-mobile-controls" role="group" aria-label="Touch game controls">
      <div
        className="dc-analogue-joystick"
        role="slider"
        aria-label="Move joystick"
        aria-valuetext="Drag to move"
        tabIndex={0}
        onPointerDown={(event) => { event.preventDefault(); joystickPointerId.current = event.pointerId; capturePointer(event.currentTarget, event.pointerId); updateJoystick(event); }}
        onPointerMove={(event) => { if (event.pointerId === joystickPointerId.current) updateJoystick(event); }}
        onPointerUp={(event) => endJoystick(event.currentTarget)}
        onPointerCancel={(event) => endJoystick(event.currentTarget)}
        onLostPointerCapture={(event) => endJoystick(event.currentTarget)}
        onKeyDown={(event) => {
          const vector = event.key === "ArrowUp" ? { x: 0, y: -1 } : event.key === "ArrowDown" ? { x: 0, y: 1 } : event.key === "ArrowLeft" ? { x: -1, y: 0 } : event.key === "ArrowRight" ? { x: 1, y: 0 } : null;
          if (vector) { event.preventDefault(); onMoveVector(vector.x, vector.y); }
        }}
        onKeyUp={(event) => { if (event.key.startsWith("Arrow")) onMoveVector(0, 0); }}
      >
        <span className="dc-analogue-stick" aria-hidden="true" />
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

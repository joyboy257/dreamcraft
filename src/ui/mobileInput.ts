export interface MoveVector { readonly x: number; readonly y: number; }

export function joystickVector(
  point: MoveVector,
  center: MoveVector,
  radius: number,
  deadzone = 0.16,
): MoveVector {
  const safeRadius = Math.max(1, radius);
  const rawX = (point.x - center.x) / safeRadius;
  const rawY = (point.y - center.y) / safeRadius;
  const rawMagnitude = Math.hypot(rawX, rawY);
  const magnitude = Math.min(1, rawMagnitude);
  if (magnitude <= deadzone) return { x: 0, y: 0 };
  const normalized = (magnitude - deadzone) / (1 - deadzone);
  const curve = normalized * normalized;
  return { x: rawX / Math.max(rawMagnitude, 0.001) * curve, y: rawY / Math.max(rawMagnitude, 0.001) * curve };
}

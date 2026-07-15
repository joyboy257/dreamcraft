import { useEffect, useRef, useState } from "react";
import { createBootstrapScene } from "../engine/bootstrapScene";

export function CanvasShell(): React.JSX.Element {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [failure, setFailure] = useState<string | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const scene = createBootstrapScene(canvas, { onFailure: setFailure });
    return () => scene.dispose();
  }, []);

  return (
    <section className="canvas-shell" aria-label="Deterministic local 3D preview">
      <canvas ref={canvasRef} data-testid="dream-canvas" />
      <div className="canvas-vignette" aria-hidden="true" />
      <div className="canvas-status">
        <span className="status-dot" aria-hidden="true" />
        {failure ?? "Local voxel shell ready"}
      </div>
    </section>
  );
}

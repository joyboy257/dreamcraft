import type { ComfortSettings } from "./types";
import { useModalFocus } from "./useModalFocus";

interface ControlsOverlayProps {
  settings: ComfortSettings;
  onSettingsChange: (settings: ComfortSettings) => void;
  onResume: () => void;
  onExitDream: () => void;
}

const CONTROLS = [
  ["W A S D", "Move"],
  ["Mouse", "Look"],
  ["Space", "Jump or rise"],
  ["Shift", "Sprint"],
  ["E / Click", "Interact"],
  ["Esc", "Pause"],
] as const;

export function ControlsOverlay({
  settings,
  onSettingsChange,
  onResume,
  onExitDream,
}: ControlsOverlayProps): React.JSX.Element {
  const { panelRef, onKeyDown } = useModalFocus<HTMLDivElement>(onResume);

  const update = <Key extends keyof ComfortSettings>(
    key: Key,
    value: ComfortSettings[Key],
  ): void => onSettingsChange({ ...settings, [key]: value });

  return (
    <div className="dc-modal-layer">
      <div
        ref={panelRef}
        className="dc-pause-panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby="dc-pause-title"
        tabIndex={-1}
        onKeyDown={onKeyDown}
      >
        <header>
          <div>
            <p className="dc-kicker">Dream paused</p>
            <h2 id="dc-pause-title">Take a breath.</h2>
          </div>
          <button className="dc-primary-action" type="button" onClick={onResume}>
            Resume dream
          </button>
        </header>

        <div className="dc-pause-grid">
          <section aria-labelledby="dc-controls-title">
            <h3 id="dc-controls-title">Controls</h3>
            <dl className="dc-control-list">
              {CONTROLS.map(([key, action]) => (
                <div key={key}><dt><kbd>{key}</kbd></dt><dd>{action}</dd></div>
              ))}
            </dl>
          </section>
          <section aria-labelledby="dc-comfort-title">
            <h3 id="dc-comfort-title">Comfort</h3>
            <div className="dc-setting-list">
              <Toggle label="Mute all audio" checked={settings.muted} onChange={(value) => update("muted", value)} />
              <Toggle label="Reduce motion" checked={settings.reducedMotion} onChange={(value) => update("reducedMotion", value)} />
              <Toggle label="Camera shake" checked={settings.cameraShake} onChange={(value) => update("cameraShake", value)} />
              <Toggle label="Camera roll" checked={settings.cameraRoll} onChange={(value) => update("cameraRoll", value)} />
              <Toggle label="High-contrast HUD" checked={settings.highContrast} onChange={(value) => update("highContrast", value)} />
              <Range label="Field of view" value={settings.fov} min={60} max={95} unit="°" onChange={(value) => update("fov", value)} />
              <Range label="Mouse sensitivity" value={settings.mouseSensitivity} min={0.2} max={2} step={0.1} onChange={(value) => update("mouseSensitivity", value)} />
            </div>
          </section>
        </div>
        <button className="dc-text-button" type="button" onClick={onExitDream}>Return to dream input</button>
      </div>
    </div>
  );
}

function Toggle({ label, checked, onChange }: { label: string; checked: boolean; onChange: (value: boolean) => void }): React.JSX.Element {
  return <label className="dc-toggle"><span>{label}</span><input type="checkbox" checked={checked} onChange={(event) => onChange(event.target.checked)} /></label>;
}

function Range({ label, value, min, max, step = 1, unit = "", onChange }: { label: string; value: number; min: number; max: number; step?: number; unit?: string; onChange: (value: number) => void }): React.JSX.Element {
  return <label className="dc-range"><span>{label}<output>{value}{unit}</output></span><input type="range" value={value} min={min} max={max} step={step} onChange={(event) => onChange(event.target.valueAsNumber)} /></label>;
}

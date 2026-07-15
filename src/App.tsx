import { useMemo, useState, type FormEvent } from "react";
import { CanvasShell } from "./app/CanvasShell";
import {
  createLocalPreview,
  MAX_DREAM_LENGTH,
  SAMPLE_DREAMS,
  type LocalPreview,
} from "./app/localPreview";
import type { AppPhase } from "./contracts/runtime";
import { publicEnv } from "./config/publicEnv";

export default function App(): React.JSX.Element {
  const [dreamText, setDreamText] = useState<string>(SAMPLE_DREAMS[0]);
  const [phase, setPhase] = useState<AppPhase>("input");
  const [preview, setPreview] = useState<LocalPreview>(() =>
    createLocalPreview(SAMPLE_DREAMS[0]),
  );
  const [issue, setIssue] = useState<string | null>(null);

  const phaseLabel = useMemo(() => {
    if (phase === "playing") return "Deterministic fragment stabilized";
    if (phase === "fatal") return "The preview needs another detail";
    return "G0 local shell — no API key required";
  }, [phase]);

  const handleSubmit = (event: FormEvent<HTMLFormElement>): void => {
    event.preventDefault();
    try {
      const nextPreview = createLocalPreview(dreamText);
      setPreview(nextPreview);
      setIssue(null);
      setPhase("playing");
    } catch (error) {
      setIssue(error instanceof Error ? error.message : "The dream is empty.");
      setPhase("fatal");
    }
  };

  return (
    <main className="app-shell">
      <header className="site-header">
        <a className="brand" href="#top" aria-label="DreamCraft home">
          <span className="brand-mark" aria-hidden="true">✦</span>
          DreamCraft
        </a>
        <span className="build-chip">Local prototype</span>
      </header>

      <div className="hero-grid" id="top">
        <section className="dream-panel" aria-labelledby="hero-title">
          <p className="eyebrow">A safe compiler for impossible places</p>
          <h1 id="hero-title">
            Describe a dream.
            <span> Step inside it.</span>
          </h1>
          <p className="lede">
            DreamCraft will turn remembered details into a bounded, playable
            voxel world. This first scaffold runs a deterministic local preview
            while the trusted DreamSpec pipeline is built.
          </p>

          <form onSubmit={handleSubmit} className="dream-form">
            <label htmlFor="dream-text">What do you remember?</label>
            <textarea
              id="dream-text"
              name="dream"
              value={dreamText}
              maxLength={MAX_DREAM_LENGTH}
              onChange={(event) => setDreamText(event.target.value)}
              aria-describedby="dream-guidance dream-issue"
            />
            <div className="form-meta" id="dream-guidance">
              <span>Include a place, a strange rule, and someone you met.</span>
              <span>{dreamText.length}/{MAX_DREAM_LENGTH}</span>
            </div>
            {issue ? (
              <p className="form-issue" id="dream-issue" role="alert">
                {issue}
              </p>
            ) : null}
            <button className="primary-action" type="submit">
              Stabilize local preview
              <span aria-hidden="true">→</span>
            </button>
          </form>

          <div className="sample-list" aria-label="Sample dreams">
            {SAMPLE_DREAMS.map((sample, index) => (
              <button
                key={sample}
                type="button"
                onClick={() => {
                  setDreamText(sample);
                  setIssue(null);
                  setPhase("input");
                }}
              >
                <span>0{index + 1}</span>
                {sample}
              </button>
            ))}
          </div>
        </section>

        <aside className="world-panel" aria-label="World preview">
          <CanvasShell />
          <div className="world-caption">
            <div>
              <p>{phaseLabel}</p>
              <h2>{preview.title}</h2>
            </div>
            <dl>
              <div>
                <dt>Seed</dt>
                <dd>{preview.seed}</dd>
              </div>
              <div>
                <dt>Strategy</dt>
                <dd>{preview.strategy}</dd>
              </div>
              {publicEnv.debug ? (
                <div>
                  <dt>API</dt>
                  <dd>{publicEnv.apiBase}</dd>
                </div>
              ) : null}
            </dl>
          </div>
        </aside>
      </div>

      <footer>
        <span>Deterministic by seed</span>
        <span>Declarative data only</span>
        <span>No account required</span>
      </footer>
    </main>
  );
}

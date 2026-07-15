import { useState } from "react";
import {
  createLocalPreview,
  SAMPLE_DREAMS,
  type LocalPreview,
} from "./app/localPreview";
import { DreamExperience } from "./integration/DreamExperience";
import { DreamInputForm, type DreamIntensity } from "./ui";

export default function App(): React.JSX.Element {
  const [dreamText, setDreamText] = useState<string>(SAMPLE_DREAMS[0]);
  const [intensity, setIntensity] = useState<DreamIntensity>("vivid");
  const [preview, setPreview] = useState<LocalPreview | null>(null);
  const [issue, setIssue] = useState<string | null>(null);
  const [session, setSession] = useState(0);

  const enterDream = (): void => {
    try {
      setPreview(createLocalPreview(dreamText));
      setIssue(null);
      setSession((current) => current + 1);
    } catch (error) {
      setIssue(error instanceof Error ? error.message : "The dream is empty.");
    }
  };

  if (preview) {
    return (
      <DreamExperience
        key={`${preview.seed}-${session}`}
        preview={preview}
        onReplay={() => setSession((current) => current + 1)}
        onRemix={() => setPreview(null)}
        onNewDream={() => {
          setDreamText("");
          setPreview(null);
        }}
      />
    );
  }

  return (
    <main className="app-shell">
      <header className="site-header">
        <a className="brand" href="#top" aria-label="DreamCraft home">
          <span className="brand-mark" aria-hidden="true">✦</span>
          DreamCraft
        </a>
        <span className="build-chip">Playable local fragment</span>
      </header>

      <div className="hero-grid" id="top">
        <section className="dream-panel" aria-labelledby="hero-title">
          <p className="eyebrow">A safe compiler for impossible places</p>
          <h1 id="hero-title">
            Describe a dream.
            <span> Step inside it.</span>
          </h1>
          <p className="lede">
            DreamCraft turns remembered details into a bounded first-person voxel
            fragment with movement, block editing, a procedural guide, dialogue,
            an objective, and an ending—without an API key.
          </p>
          <DreamInputForm
            value={dreamText}
            intensity={intensity}
            issue={issue}
            onValueChange={setDreamText}
            onIntensityChange={setIntensity}
            onSubmit={enterDream}
          />
        </section>

        <aside className="world-panel world-promise" aria-label="Current playable promise">
          <div className="promise-orbit" aria-hidden="true"><i /><i /><i /></div>
          <p className="eyebrow">Deterministic vertical slice</p>
          <h2>Meet the Lantern Keeper. Wake the moonwell.</h2>
          <p>
            Every local seed builds the same bounded chunks. Walk, look, jump,
            collide, break and place blocks, speak with the guide, and complete
            the fragment.
          </p>
          <dl>
            <div><dt>World</dt><dd>16×16 chunks</dd></div>
            <div><dt>Renderer</dt><dd>Combined faces</dd></div>
            <div><dt>Runtime</dt><dd>Mock-local</dd></div>
          </dl>
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

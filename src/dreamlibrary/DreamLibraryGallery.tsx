import { DREAM_LIBRARY } from "./registry";

const references = [
  ["Moonlit kitchen", "Giant porcelain cup · sugar bowl · moth guide · moon window", "moonlit", "#a5d7ef"],
  ["Flooded school", "Waterline · lockers · desks · paper boats · childhood dog", "flooded", "#3b91ca"],
  ["Lottery finale", "Jackpot board · family · instruments · banners · golden rain", "lottery", "#f3ba57"],
] as const;

export function DreamLibraryGallery(): React.JSX.Element {
  const materials = DREAM_LIBRARY.filter(({ category }) => category === "material");
  return <main className="dreamlibrary-gallery" data-testid="dreamlibrary-gallery">
    <header>
      <a href="/" className="brand"><span className="brand-mark">✦</span>DreamCraft</a>
      <span className="build-chip">DreamLibrary v0.1</span>
    </header>
    <section className="dreamlibrary-intro">
      <p className="eyebrow">Runtime capability gallery</p>
      <h1>Recognisable dreams,<br /><span>grounded locally.</span></h1>
      <p>Every panel below is a reusable capability, not a one-off sample scene. The playable reference dreams select these same environment, material, prop, entity, and gameplay modules.</p>
    </section>
    <section aria-labelledby="atlas-heading" className="dreamlibrary-atlas-panel">
      <div><p className="eyebrow">Nearest-filter material atlas</p><h2 id="atlas-heading">22 deterministic tiles</h2><p>512×512 · 32px tiles · sRGB · transparent glass/water lane.</p></div>
      <img src="/dreamlibrary/textures/dreamlibrary-atlas.png" alt="DreamLibrary procedural material atlas" />
    </section>
    <section aria-labelledby="materials-heading"><h2 id="materials-heading">Materials and elements</h2><div className="dreamlibrary-material-grid">{materials.map((item, index) => <article key={item.id} className="dreamlibrary-material"><span aria-hidden="true" data-tile-index={index} /><strong>{item.label}</strong><small>{item.mobileSafe ? "mobile-safe" : "desktop"}</small></article>)}</div></section>
    <section aria-labelledby="references-heading"><h2 id="references-heading">Reference dream compositions</h2><div className="dreamlibrary-reference-grid">{references.map(([title, detail, dreamKey]) => <article key={title} className="dreamlibrary-reference" data-dream={dreamKey}><div className="dreamlibrary-scene-icon" aria-hidden="true"><span /><span /><span /></div><h3>{title}</h3><p>{detail}</p><small>Environment · entities · differentiated gameplay · ending</small></article>)}</div></section>
    <section aria-labelledby="capabilities-heading"><h2 id="capabilities-heading">Capability contract</h2><dl className="dreamlibrary-capabilities">{["environment", "structure", "prop", "entity", "gameplay", "dialogue", "atmosphere", "audio"].map((category) => <div key={category}><dt>{category}</dt><dd>{DREAM_LIBRARY.filter((item) => item.category === category).map(({ label }) => label).join(" · ")}</dd></div>)}</dl></section>
  </main>;
}

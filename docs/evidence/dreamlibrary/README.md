# DreamLibrary G7.2 visual evidence

All captures were taken locally with the deterministic generator; no OpenAI API request was made.

| Evidence | What it proves |
| --- | --- |
| `contact-atlas-materials-references.png` | The `/dreamlibrary` route: deterministic atlas, 22 material swatches, and reference composition catalogue. |
| `contact-mobile-portrait.png` | Gallery is readable at 390×844 portrait. |
| `contact-mobile-landscape.png` | Gallery remains usable at 844×390 landscape. |
| `reference-flooded-school-runtime.png` | The playable canvas shows the school waterline, submerged desks, lockers, and paper boats. |
| `contact-atlas-source.png` | Exact generated 512×512 atlas source used by the gallery. |

The atlas is reproduced by `pnpm dreamlibrary:atlas` and is intentionally committed so builds do not depend on a remote image generator.

# Product UI and Game Feel

## Design direction

DreamCraft should feel like entering a memory, not configuring a generator dashboard.

Use a dark, cinematic, slightly surreal visual language with strong typography, soft gradients, restrained glow, and minimal chrome. The world itself should carry most of the color.

## Input screen

Required:

- Product name and one-sentence promise
- Large dream text area
- Character guidance, not a rigid form
- One primary “Enter Dream” action
- Three varied sample prompts
- Optional intensity selector: Calm / Vivid / Fever
- Clear privacy note appropriate to actual handling
- Keyboard submit behavior that does not accidentally submit multiline text

Avoid:

- Model selector
- Technical schema controls
- Account wall
- Dense feature list
- Fake progress promises

## Materialization sequence

Messages should correspond to real state when possible:

```text
Remembering the important details…
Choosing the laws of this dream…
Teaching its inhabitants how to move…
Building the place where you wake up…
Stabilizing the dream…
```

Pipeline phases:

- Requesting
- Validating
- Compiling
- Generating spawn chunks
- Staging hero/objective
- Entering

Use subtle visual changes tied to progress. Do not show a misleading percentage unless real progress is measurable.

## First entry

- Camera transition descends or fades into spawn.
- Player sees at least one anchor immediately.
- Objective appears after a short readable delay.
- Pointer-lock call-to-action is obvious.
- Audio begins only after a user gesture.
- Controls help fades after use and remains available in pause.

## HUD

Keep it sparse:

- Dream title
- Current objective/journal
- Crosshair
- Interaction prompt
- Temporary toast
- Dialogue overlay
- Pause/mute/settings

Debug metrics must be hidden by default and feature-flagged.

## Dialogue

- Large readable speaker and text
- Keyboard number/arrow controls and mouse/touch support
- Focus remains inside the dialogue until closed
- Pointer lock pauses/releases safely
- Plain text only
- Response effects occur after selection, not before

## Ending

Ending flow:

1. World transformation
2. Brief generated narration
3. “Dream remembered” or equivalent state
4. Replay / Remix / New Dream
5. Optional save/share only if implemented reliably

Do not immediately dump the user back to the input screen.

## Desktop controls

- WASD move
- Mouse look
- Space jump/fly up
- Shift sprint
- E or primary click interact
- Left click break when no entity interaction
- Right click place
- Escape pause/release pointer lock

Resolve conflicts contextually and explain them in controls help.

## Mobile controls

Minimum:

- Left virtual stick: move
- Right half drag: look
- Jump/vertical button
- Interact button
- Optional break/place mode
- Landscape recommendation
- Reduced render radius, DPR, particles, and material complexity

Mobile is a secondary release surface. Do not compromise desktop demo stability for advanced touch features.

## Accessibility and comfort

Required settings:

- Master audio mute
- Reduced motion
- Camera shake toggle/reduction
- Camera roll toggle/reduction
- FOV adjustment within safe bounds
- Mouse sensitivity
- High-contrast dialogue/HUD
- Keyboard-accessible menus
- Text alternative for important audio cues
- Pause on focus loss where appropriate

Generated dream physics cannot override user comfort preferences.

## Game feel principles

Even surreal movement should be responsive:

- Coyote time
- Jump buffering
- Variable jump height
- Smooth acceleration/deceleration
- Landing compression used sparingly
- Interaction pulse and sound cue
- Clear entity state changes
- Strong climax effect

## Failure UX

Never surface raw stack traces or schema errors to the user.

Preferred copy:

```text
The dream would not hold its shape.
A stable fragment survived.
```

Developer diagnostics can include issue codes behind a details panel in development builds.

## Reduced-quality behavior

When performance degrades:

1. Reduce render radius
2. Reduce pixel ratio
3. Reduce particles
4. Disable dynamic shadows/post effects
5. Reduce geometry segments
6. Reduce entity update rates

Never silently remove the objective or hero entity.

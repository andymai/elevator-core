# Playground Polish Plan

Working document for the Rauno-craft polish pass. Lives during the polish
sequence (PR 1–5); deleted or folded into `playground/README.md` once PR 5
lands.

## Vision

The playground should look and feel like an engineer's tool — terse,
precise, opinionated. The signature moment is the metrics row: tabular
numerals on hairline-ruled columns, the kind of pane you'd screenshot to
explain why one strategy wins. Reference: rauno.me, Vercel craft pages.
Anti-reference: Linear marketing pages, SaaS hero gradients, friendly
illustrations.

Not "make it nicer." Specifically: tighten typography, kill bouncy motion,
rewrite copy to engineering shorthand, polish the four hero surfaces
(render canvas, metrics row, header + scenario picker, strategy popovers)
until each looks designed, not generated.

## Type system

- **Sans (UI):** Geist Sans, self-hosted under `public/fonts/`. Weights
  400 / 500 / 600. `-letter-spacing: -0.005em` at 13–14px.
- **Mono (numerals + metric labels):** Geist Mono, self-hosted. Weight
  400 / 500. `font-feature-settings: "tnum", "ss01"` for the slashed-zero.
- **No third font.** No serif, no display face.
- **Tabular nums everywhere a digit can change.** PR 1 audits and
  enforces this; rubric #1 is 100 % coverage.
- Tokens added: `--font-sans`, `--font-mono` in `:root`, aliased into
  `@theme` as `--font-sans` / `--font-mono` so Tailwind's `font-sans` /
  `font-mono` utilities resolve.

## Motion language

- Default ease: `cubic-bezier(0.2, 0.6, 0.2, 1)` (already a token —
  `--ease-normal`). Keep.
- **Drop `--ease-spring` from any hover or button interaction.** Spring
  reads "playful"; we want "tactile." Spring is reserved for one-time
  stage transitions only (e.g., pane mount), never on input feedback.
- Hover budget: 60–90 ms, opacity + 1 px translate. Never scale.
- Number changes: count-up over 240 ms, not snap. Reuse the trapezoidal
  velocity helper if it fits; otherwise a small linear-interp utility.
- Door open/close: tighten ease curve in `draw-cars.ts` and `tether.ts`
  so the door reads as a _mechanical_ settle (slight overshoot is OK
  here — this is in-canvas physics, not UI chrome).

## Iconography

- 1 px stroke, no fills, square caps, square joins. Single weight.
- Set covers: play / pause / config / shortcuts / mode toggle / scenario
  marker / phase tick. Maybe 6–8 glyphs total.
- Icons share corner radius and stroke vocabulary with the canvas-drawn
  car silhouette. The header icon and the rendered car should look like
  they came from the same hand.
- Authored as inline SVG strings in TS (no asset pipeline, no icon
  library). Stored in `playground/src/render/figures/` next to existing
  hand-drawn assets.

## Copy voice

Rule: a label states the metric; a description states the rule. No
adjectives. No "powerful," "smart," "efficient."

| Surface       | Before                                                                      | After                                      |
| ------------- | --------------------------------------------------------------------------- | ------------------------------------------ |
| Metric label  | `95th-percentile wait`                                                      | `wait p95`                                 |
| Metric label  | `Riders served per minute`                                                  | `throughput · /min`                        |
| Metric label  | `Total door operations`                                                     | `door cycles`                              |
| Strategy desc | `LOOK: a simple yet effective scan strategy that handles most traffic well` | `Sweep until last call, reverse.`          |
| Strategy desc | `ETD: assigns calls to the elevator with the lowest estimated arrival time` | `Assign by estimated time-to-destination.` |
| Tooltip       | `This is the speed slider`                                                  | _(removed)_                                |
| Tooltip       | `Reposition timer`                                                          | `Idle cars return after N s.`              |

Footer signature (one line, low-contrast, end of page):

```
engine: elevator-core (rust) · playground: vanilla ts · — a.m.
```

## Hero surfaces

### 1. Metrics row (signature moment)

Goal: the screenshot that goes in a tweet. Ref: Bloomberg terminal /
Vercel analytics row.

- Mono numerals, tabular, right-aligned within column.
- Hairline (1 px, `--border-subtle`) column rules — vertical, full-height.
- Per metric: small uppercase label (mono, 11 px, `--content-tertiary`)
  above the value.
- Delta: small mono triangle + signed value, color = `--success` or
  `--error`, _not_ the accent. Accent stays reserved.
- Sparkline: 1 px stroke, no fill, no axis. 24 × 8 px max. One per metric.
- No card chrome, no shadow on this row. It floats on the surface.

### 2. Render canvas

- Cars: re-tune proportions (cab aspect, door split, top/bottom margin).
  Riders inside drawn as small filled glyphs, not generic dots.
- Stop markers: hairline rule + right-aligned mono floor index. Hover
  reveals waiting/resident counts inline (not a tooltip floater).
- Door cycle: slight overshoot at full-open, soft close.
- Background: faint vertical hairline grid on shafts; lit shaft when a
  car is occupying that segment, dim otherwise. No glow.

### 3. Header + scenario picker

- Wordmark: lockup of the cab silhouette + `elevator-core` set in mono,
  tight tracking. Replaces current text-only header.
- Nav: kill icon-only buttons, replace with mono labels (`PAUSE`,
  `CONFIG`, `?`). Mobile keeps icons (density penalty otherwise — flagged
  in rubric #8).
- Scenario picker: tabular switcher, not card grid. Active scenario
  highlighted by a bottom 1 px accent rule, not a filled background.

### 4. Strategy popovers

- Vercel command-menu structure: each entry = strategy name (mono,
  bold) + one-line description (sans, secondary). Keyboard hint
  right-aligned (`↵` / `1` / `2` …).
- 1 px border, no shadow elevation beyond `--shadow-md`.
- Active row: 1 px left rule in accent, never a filled bg.

## Anti-patterns (do not cross)

- No emoji.
- No friendly illustrations or empty-state mascots.
- No new gradient surfaces. Existing layered gradient tokens stay only
  where they encode elevation depth.
- No marketing copy ("Introducing…", "Powered by…").
- No bounce / spring on hover or input feedback.
- No icon-and-label belt-and-suspenders unless mobile demands it.
- No third-party CDN font requests.

## PR sequence

1. **PR 1 — Foundation: type + tokens + tabular-nums.** Self-host Geist
   Sans + Geist Mono, register `--font-sans` / `--font-mono` tokens, set
   body stack, swap the existing `SFMono-Regular` to mono token, audit
   every numeric value for tabular-nums. _No copy or motion changes._
2. **PR 2 — Metrics row.** Bloomberg-terminal redesign of `#metrics-a` /
   `#metrics-b`. Copy rewrites for metric labels land here.
3. **PR 3 — Render canvas.** Car proportions, rider glyphs, stop
   markers, door cycle ease, shaft chrome.
4. **PR 4 — Header + scenario picker.** Wordmark, nav rewrite, scenario
   tabular switcher.
5. **PR 5 — Strategy popovers.** Command-menu redesign, copy rewrites
   for strategy descriptions.

Each PR: opened, greptile reviews, address findings, automerge after
greptile weighs in (per repo convention). Mobile portrait + landscape
verified before opening each PR.

## Rubric

Each PR in this series self-grades against these. PR description
includes the score per item. `pass` / `fail` / `n/a`.

1. **Tabular-nums coverage:** every digit that can change uses
   `font-variant-numeric: tabular-nums`. Static labels exempt.
2. **No spring on input feedback:** grep confirms `--ease-spring` is
   used only on stage-mount, never on `:hover`, `:active`, `:focus`,
   slider drag, popover open.
3. **Hover budget:** every interactive element transitions in 60–90 ms,
   uses opacity ± `translateY(1px)` only. No `scale`, no shadow grow.
4. **Copy voice:** every visible label fits the engineer-shorthand
   table. No "simple," "powerful," "smart," "efficient." No tooltip
   that restates a label.
5. **Iconography weight:** all icons in the changed surface share a
   single stroke weight (1 px), single corner style, no fills. Inline
   SVG, no library.
6. **Accent reserved:** the amber accent (`--accent`) appears only on
   the _current_ strategy / scenario / state — never on >1 element per
   pane simultaneously. Deltas use `--success` / `--error`, not accent.
7. **No new gradients, no new shadows.** Diff adds zero gradient
   declarations and zero `box-shadow` declarations not from the token
   set (`--shadow-sm/md/lg`).
8. **Mobile parity:** the changed surface works at 375 × 667 portrait
   and 667 × 375 landscape. Screenshots attached to PR description.
9. **No marketing copy:** zero instances of "Introducing", "Powered
   by", "Built with", "Make X" in any visible text.
10. **Footer signature unchanged or improved.** Once the footer line
    lands in PR 1.5, no PR removes it.

## Mobile checks

After each PR, capture screenshots at:

- 375 × 667 (iPhone SE portrait) — narrow stress test
- 390 × 844 (iPhone 14 portrait) — common case
- 667 × 375 (iPhone SE landscape) — compare-pane stress test

Attach to PR description. If a hero surface degrades on mobile, redesign
or hide; do not ship a desktop-only version.

## Done signal

- All five PRs merged.
- All rubric items pass on the final composite UI.
- One screenshot of the finished metrics row gets posted to the
  `elevator-core` README as the canonical "what does this look like"
  image.
- This file (`POLISH_PLAN.md`) is deleted in PR 5 or folded into
  `playground/README.md` as a "design notes" section.

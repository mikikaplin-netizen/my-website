# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

A single-page Hebrew (RTL) personal landing site for Michael Kaplin (מיכאל קאפלין), a freelance
web designer/developer. Plain HTML/CSS/JS — no build step, no framework, no package manager.
Content and portfolio items are based on his real business at mkaplin.com.

## Running locally

```bash
python3 serve.py
```

Starts a static file server on `http://localhost:8080` and opens it in the browser automatically
(`Ctrl+C` to stop). There is no build/lint/test tooling — this is served as-is. To verify changes
visually, prefer taking a Playwright screenshot of `index.html` over describing changes textually.

## File structure

- `index.html` — the entire page, all sections inline (no templating/includes)
- `style.css` — all styles, organized in clearly labeled `/* ==== SECTION ==== */` blocks that
  mirror the HTML sections 1:1 (FONTS, ROOT & RESET, UTILITIES, BUTTONS, NAVBAR, HERO, STATEMENT,
  ABOUT, PROCESS, PORTFOLIO, CONTACT, FOOTER, WHATSAPP FLOATING WIDGET, ANIMATIONS, RESPONSIVE)
- `script.js` — vanilla JS, organized in the same `// ==== SECTION ====` comment style, one IIFE
  or top-level block per feature (see below)
- `fonts/` — self-hosted Polin (Hebrew) `.ttf` files (Light/Regular/Bold, uploaded by Michael),
  `@font-face` with weight ranges in `style.css`
  (Google Sans was removed on purpose — don't reintroduce it)
- `images/` — logo SVGs (`logo-full.svg`, `logo-icon.svg`) and the hero photo (`miki-hero.png`)
- `serve.py` — the only "tooling" in the repo
- `index.html` links `style.css?v=N` / `script.js?v=N` — bump `N` whenever either file changes,
  otherwise browsers/GitHub Pages can pair a new `index.html` with a stale cached stylesheet

## Architecture / how the page is wired together

**Sections are independent and stack in document order** inside `index.html`: navbar → hero →
statement → portfolio → about → process → magnet → wave → contact → testimonials → footer, plus a WhatsApp widget appended at
the end of `<body>`. There's no JS component system — each section's behavior is a self-contained
block in `script.js` that queries its own DOM by id/class and no-ops if the element isn't present
(defensive `if (el) ...` guards throughout), so sections can be added/removed without touching
other blocks.

**Design tokens live in `:root` in `style.css`** (`--bg`, `--bg-2`, `--bg-3`, `--accent`,
`--accent-2`, `--text`, `--text-muted`, `--radius`, `--font`, `--shadow`, `--glow`, etc.). Brand
colors are `--accent: #64C1D2` (cyan) and `--accent-2: #1CD31C` (green) on a dark `#101024`
background — always reuse these variables rather than hardcoding new colors.

**RTL with intentional LTR exceptions.** The page is `dir="rtl"` at the `<html>` level. The
"process" section (4-step section) deliberately sets `dir="ltr"` on each `.process-row` with a
nested `dir="rtl"` on `.process-text`, to match an approved Figma design where the mockup visual
sits to the visual right and text to the visual left — don't "fix" this to plain RTL without
checking the Figma reference first.

**Global canvas background (`#dot-field-bg`).** `script.js` has a self-contained `initDotField()`
IIFE that renders an animated, mouse-reactive dot-grid on a `<canvas>` fixed behind the entire
page (`position: fixed`, `z-index: 0`). All real content sections are pinned to `z-index: 1` via
a blanket rule in `style.css` (`.navbar, main, section, .footer { position: relative; z-index: 1; }`)
so they render above it. Section backgrounds use semi-transparent colors
(e.g. `rgba(20,22,46,0.72)`) so the dot field shows through.

**Scroll-driven effects** (no scroll libraries — plain `scroll`/`resize` listeners with an
`IntersectionObserver`):
- Generic reveal-on-scroll: elements matching the selector list in the `revealEls` query in
  `script.js` get `.reveal` added, then `.visible` added (staggered by index) once they intersect
  the viewport. To make a new section animate in, add its selector to that query — no other wiring
  needed.
- The `.statement-text` paragraph does its own word-by-word scroll reveal: text nodes are split
  into `<span class="sw">` tokens at load time, then colored in progressively as the section
  scrolls through a fixed viewport-relative window (see the "STATEMENT — SCROLL WORD REVEAL" IIFE).
- Text entrance effects ("TEXT ENTRANCE EFFECTS" in `script.js`, GSAP-style but no library):
  `.hero-title`, `.section-title`, `.process-title` are split into `.tx-mask > .tx-word` spans
  that rise/blur in when `.tx-in` is added; `.section-label` gets a Hebrew-letter scramble.
  Everything is skipped under `prefers-reduced-motion`.
- Design rule: **no gradient text anywhere** — every text color is a single solid brand color.
- Wave marquee (`.wave`, "WAVE MARQUEE — SCROLL-DRIVEN" in `script.js`): the section is pinned
  (`position: sticky`) while one giant line travels across it, mirrored for Hebrew (sentence start
  enters first, moving left → right); each letter/tile rides a sine wave fixed in screen space.
  The section's height is set in JS from the track width. The white background is a
  `clip-path: circle()` on `.wave-sticky` that grows from the center to fill the screen at the
  start of the pin and shrinks away at the end (`--wave-r`). Without JS / under reduced motion it
  renders as static centered text on a plain white band.
- `.edge-blur` — fixed progressive backdrop blur along the bottom of the viewport (height via
  `--edge-blur-h`), stacked masked layers with doubling blur.
- Motion: magnetic `.btn`/`.nav-cta` (uses the standalone `translate` property so it doesn't
  clash with hover `transform`), hero photo parallax.
- Portfolio (`.work`, "PORTFOLIO — HOVER-REVEAL LIST"): full-bleed rows (name in --accent, white when active;
  field/year), no numbers or icons. Hovering a row activates it (accent underline + description); on desktop a
  `.work-preview` floats on the left, eased toward the cursor's height with a velocity tilt,
  wiping between projects. Touch screens activate the mid-viewport row and show each row's
  `.work-thumb` inline. Visuals are gradient placeholders until Michael's screen recordings
  arrive (`images/portfolio/`).

**Navbar items** all share the CTA's pill box (`border-radius: 999px`, same padding, 1px
transparent border) so the hover background matches "בואו נדבר" exactly.

**Buttons (`.btn`, `.nav-cta`) use an animated conic-gradient border**, implemented as a
`::before` pseudo-element masked to a ring (`mask-composite: exclude`) and driven by a
`@property --btn-angle` custom property animated via `@keyframes btnBorderSpin`; the ring is
`opacity: 0` at rest and fades/animates in only on `:hover`. Reuse this pattern (don't add a new
button style) for any new CTA.

**"Process" windows now follow the Figma file exactly** (Figma file `aixEV20iIr1EDKMMXtqgIb`,
section node `1305:3803`, one 1325×720 frame per step). The shared shell is `.pwin` — a
560×328.58 glass window authored in the design's own px (backdrop blur 33.648px, 10% white
side/main panels with a 0.343px inset highlight, `images/webp/waves.webp` behind at blur 13.719px)
and `zoom`ed to its column by the "PROCESS — GLASS WINDOWS" block in `script.js`, which also
replays the Figma motion (`.is-playing`) when a window scrolls into view. Step 02's interior
(`.fg-*`, the Figma editor + Michael's cursor dragging the brand green) is fully live HTML/CSS.
Steps 01/03/04 (`.pw-meet-*`, `.pw-build-*`, `.pw-site-*`) use the same live glass shell with
their app panels as Figma exports in `images/process/` (WebP crops of each node's own box, SVG for
the call bar / doc lines / AI icons), placed at design-px coordinates; radii and shadows are
re-applied in CSS. Step 01 replays its Figma 2s loop (the brief's three text blocks fading in). The wave source is
`images/רקע גלים ללא טישטוש.png` (uploaded by Michael, 10723×5259).

## Content notes

- Portfolio project links point to real pages under `https://mkaplin.com/project_review/...`.
- Contact info: `michael@mkaplin.com`, WhatsApp `wa.me/972542030381` (also hardcoded as the
  WhatsApp widget's CTA link in `index.html`).
- The contact form (`#contactForm`) has no backend — submit handler just fakes a success state
  client-side and resets the form.
- `images/miki-hero.png` is reused for the hero, About and Contact photos (cropped with
  `object-position`); no `placehold.co` images remain.
- Magnet section ("MAGNET FIELD"): the green "העסק שלך" bubble (z-index above the heading) follows
  the pointer within 16–84% / 20–85% of the field, returns to rest on mouseleave, and pushes the
  other-business bubbles (storefront icons — no "competitor" wording, keep it positive) away;
  pushed bubbles shrink/fade via `--push`.
- Testimonials (`.testimonials`, before the footer): 9 real client quotes from mkaplin.com in two
  glass-card marquee rows scrolling in opposite directions ("TESTIMONIALS — MARQUEE LOOP" clones
  each track for a seamless loop; hover pauses; reduced motion = swipeable rows).
- Contact form is deliberately minimal: no card/frame, underlined transparent fields in a
  2-column grid (`.form-group--wide` spans both).

## Git workflow used in this repo

Changes are pushed to both `main` and the feature branch `claude/create-landing-page-PfPuY`
(GitHub Pages serves off `main`). When committing, push to both:

```bash
git push origin HEAD:claude/create-landing-page-PfPuY
git push origin HEAD:main
```

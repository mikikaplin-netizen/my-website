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
- `fonts/` — self-hosted Google Sans `.ttf` files (`@font-face` declared in `style.css`)
- `images/` — logo SVGs (`logo-full.svg`, `logo-icon.svg`) and the hero photo (`miki-hero.png`)
- `serve.py` — the only "tooling" in the repo

## Architecture / how the page is wired together

**Sections are independent and stack in document order** inside `index.html`: navbar → hero →
statement → about → process → portfolio → contact → footer, plus a WhatsApp widget appended at
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

**Buttons (`.btn`, `.nav-cta`) use an animated conic-gradient border**, implemented as a
`::before` pseudo-element masked to a ring (`mask-composite: exclude`) and driven by a
`@property --btn-angle` custom property animated via `@keyframes btnBorderSpin`; the ring is
`opacity: 0` at rest and fades/animates in only on `:hover`. Reuse this pattern (don't add a new
button style) for any new CTA.

**"Process" mockups (`.process-mockup` + `mockup-*` classes)** are deliberately abstract,
brand-colored CSS/SVG recreations of app UI (video call, design tool, form builder, live-site
dashboard) rather than pixel-accurate clones of the real third-party UIs shown in the source
Figma file — that was an explicit scope decision, not a shortcut to "fix" later.

## Content notes

- Portfolio project links point to real pages under `https://mkaplin.com/project_review/...`.
- Contact info: `michael@mkaplin.com`, WhatsApp `wa.me/972542030381` (also hardcoded as the
  WhatsApp widget's CTA link in `index.html`).
- The contact form (`#contactForm`) has no backend — submit handler just fakes a success state
  client-side and resets the form.
- `images/miki-hero.png`, the About photo, and the Contact photo are the only "real" images;
  a couple of decorative images elsewhere still use `placehold.co` placeholder URLs.

## Git workflow used in this repo

Changes are pushed to both `main` and the feature branch `claude/create-landing-page-PfPuY`
(GitHub Pages serves off `main`). When committing, push to both:

```bash
git push origin HEAD:claude/create-landing-page-PfPuY
git push origin HEAD:main
```

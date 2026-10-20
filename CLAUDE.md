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
  CLIENTS, PORTFOLIO, ABOUT, PROCESS, TESTIMONIALS, FAQ, CONTACT, FOOTER, WHATSAPP FLOATING WIDGET, ANIMATIONS, RESPONSIVE)
- `script.js` — vanilla JS, organized in the same `// ==== SECTION ====` comment style, one IIFE
  or top-level block per feature (see below)
- `fonts/` — self-hosted Polin (Hebrew) `.ttf` files (Light/Regular/Bold, uploaded by Michael),
  `@font-face` with weight ranges in `style.css`
  (Google Sans was removed on purpose — don't reintroduce it); Anomalia (`fonts/anomalia-{light,regular,bold}-aaa.woff2`, uploaded by Michael,
  bold preloaded) for every title and subtitle via `--font-display`: hero, section titles, statement,
  wave line, project names, process step titles, about intro. Running text stays Polin (`--font`).
  Sizes are unified (Michael): every `.section-title` uses `--title-size`, every subtitle
  (`.work-name`, `.process-title`, `.about-intro`) uses `--subtitle-size`; the hero, statement and
  wave line keep their own display sizes
- `images/` — logo SVGs (`logo-full.svg`, `logo-icon.svg`) and the hero photo (`miki-hero.png`)
- Hero live portrait (`.hero-photo` wraps the `<img class="hero-photo-img">` + `<video class="hero-live">`,
  "HERO — LIVE PORTRAIT" in `script.js`): a 3s AI clip of the same photo blinking once
  (Seedance 2.5 on Magnific, start = end frame = the photo on flat grey; the take's 14px head lift and
  its second blink were cut out (Michael found two blinks too close), edges/bottom fade carry the
  photo's own pixels), `images/video/hero-live-2.{webm,mp4}` (rename on re-encode: browsers cache it), masked
  by the photo's alpha (`images/webp/hero-live-mask.webp`, same 3:4 frame, photo bottom-aligned).
  Plays once, holds its last frame (= first) for a random 1.5–4.5s, replays (a blink every ~4.5–7.5s, no rhythm);
  desktop only (photo hidden ≤900px), never under reduced motion, paused off screen, fades in over the img.
  The parallax/tilt transforms target the `.hero-photo` wrapper so both layers move together.
- `lab/projects-3d.html` — unlinked, noindex lab page with six live 3D/motion directions for
  showing projects (stacked deck, ring, coverflow, rises-with-scroll, depth layers + cursor tilt,
  isometric wall), built on the real posters/recordings, for Michael to pick from; `lab/hero-3d.html` — five
  ideas for projects moving around Michael's hero photo (orbit, floating depth + cursor parallax, halo fan,
  tilted flowing wall, cards dealt on scroll); `lab/buttons.html` — nine button directions (fill sweep,
  arrow chip, cursor glow, text roll, liquid glass, always-on brand ring, long-arrow link, tactile 3D,
  magnetic) plus three built on the green arrow from Michael's logo (`logo-icon.svg`): launches up
  and is replaced, turns from up to forward while the pill fills, flies across leaving a green trail;
  each primary + secondary on navy and on the grey page; `lab/hero-loop.html` — five always-on looping
  hero ideas with an intro burst (galaxy orbit, tunnel, gyroscope rings, big wheel, flip board),
  subtler 6px corners and depth blur on far screens (Michael: no scroll-driven motion, wow from the
  first second); `lab/hero-ar.html` — Michael's "AR/VR digital studio" concept: a holographic hand
  swipes every ~4s, the chosen site opens big as a semi-transparent scanlined hologram (playing its
  recording, HUD label 0X/05 + name), the rest recede blurred by distance; A = wheel behind him,
  B = deep-space row pushed aside one by one
- `serve.py` — the only "tooling" in the repo
- `index.html` links `style.css?v=N` / `script.js?v=N` — bump `N` whenever either file changes,
  otherwise browsers/GitHub Pages can pair a new `index.html` with a stale cached stylesheet

## Architecture / how the page is wired together

**Sections are independent and stack in document order** inside `index.html`: navbar → hero →
statement → clients → portfolio → about → process → craft → magnet → wave → testimonials → faq, all inside
`<main class="page">`, then `<footer class="site-end">` (contact form + footer bar), plus the tab bar,
edge blur and WhatsApp widget appended at the end of `<body>`. There's no JS component system — each section's behavior is a self-contained
block in `script.js` that queries its own DOM by id/class and no-ops if the element isn't present
(defensive `if (el) ...` guards throughout), so sections can be added/removed without touching
other blocks.

**Curtain footer** ("PAGE + SITE END" in `style.css`, "SITE END — CURTAIN FOOTER" in `script.js`):
`main.page` (z-index 1, opaque, `clip-path: inset(0)` so its fixed dot field / page tone are clipped to
it) scrolls over `footer.site-end`, which is `position: sticky; bottom: 0` behind it (`.is-curtain`,
only when the footer fits the screen; on phones the long form makes it taller, so it just flows).
The page's bottom corners are rounded (`clip-path: inset(0 round …)`) and `.page-lip` (a sibling,
since the clip would cut a box-shadow) casts a soft shadow on the footer. The footer: the wave as a
looping video (`images/video/footer-waves.webm|mp4`, ~40–50KB, a seamless 6s loop rendered from
Michael's wave PNG by sine-displacement warping, blur baked into the frames so there's no live CSS
blur; poster `images/webp/footer-waves-poster.webp`). It plays only while the page's bottom edge is
above the fold (the sticky footer is always geometrically "on screen", so IntersectionObserver
can't be used) and never under reduced motion. Michael's logo huge in one color (`.site-end-logo`:
accent fill masked by `logo-full.svg`, soft-light, opacity 0.4, no animation; Michael disliked the
light sweep) is the lowest layer, edge to edge along the bottom; above it the vertically centered
contact block (title at the big-title size, "בואו ניתן לעסק שלך את הרושם שמגיע לו." with the sub "השאירו פרטים ואחזור אליכם לשיחת היכרות קצרה. את כל השאר, מהאסטרטגיה ועד הפיקסל האחרון, אני לוקח על עצמי." Michael wants it to empower the visitor and never hand them homework: he does the work, not them; no photo) and the footer bar, whose "הצהרת נגישות" /
"הצהרת פרטיות" are `<button>`s styled as plain text (statements not written yet).
`#contact` is an empty `.page-end` marker at the end of `<main>`; scrolling to it slides the page
off the footer. JS that looks for page sections must query `main.page > section`.

**Page theme / color zones** ("COLOR ZONES — PAGE THEME" in `style.css` + `script.js`): the whole page
changes color. Sections marked `.tone-light` (statement, clients, about, testimonials, faq) switch
`html.theme-light` while they sit under the line 40% down the screen (also re-checked on body resize,
since the FAQ chat grows without scrolling). Then the fixed `.page-tone` layer fades the concrete
grey `--paper: #DCDEE2` over the dot field (0.6s) and page text flips to navy via `--fg` / `--text` /
`--text-muted` / `--border`, so the tail of the previous section stays readable mid-switch. Dark
surfaces (navbar, process windows, testimonial cards, work preview, buttons, WhatsApp) re-pin the
dark variables. **Brand colors only** (Michael rejected added teal/green): on grey, accents are brand
navy (no marker underline; Michael removed it); cyan/green are never text on grey (1.8:1). Any new section
text color must use `var(--fg)` / `var(--text)`, not `#fff`.

**Section openings**: no section numbering (Michael removed it). Projects, process and craft use
`.section-header--edit`: label, oversized title and sub stacked on the right; the label sits right on
the title (2px, title line-height 0.98 since Anomalia has tall built-in leading) and the sub follows
at about double that gap (26px) (Michael: not three separate blocks); testimonials/FAQ have side titles, magnet stays centered. Don't reintroduce one centered
label/title/sub template for every section.

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
- Design rule: **no gradient text anywhere**. Every text color is a single solid brand color.
- Copy rule: **no em/en dashes (— –) in visible text** (Michael's request); use a comma, period or
  colon instead. Line breaks: headings use `text-wrap: balance`, paragraphs `text-wrap: pretty`, so
  no single word is left alone on a line.
- Wave marquee (`.wave`, "WAVE MARQUEE — SCROLL-DRIVEN" in `script.js`): the section is pinned
  (`position: sticky`) while one giant line travels across it, mirrored for Hebrew (sentence start
  enters first, moving left → right); each letter/tile rides a sine wave fixed in screen space.
  Copy: "אין שני לרושם ראשוני"; between the words (no photo tile: Michael removed it) two `.wave-tile--shots` (Michael: two, not three)
  (rounded crops of beautiful areas from client sites, `images/wave/shot-1..9.webp` taken from the
  portfolio recordings) each switch through three shots with a quick rhythmic wipe every 1.2s
  (no zoom: Michael said it made the sites look cropped; radius 0.06em so nothing is cut).
  Faster (1.4px travel per px scrolled, 0.7 on phones) and the travel ends with 40% of the screen still
  covered by the line's tail (`TAIL`), so there is never an empty navy screen. The section's height is set in JS from the track width; travel
  starts the moment the section enters the screen with a quarter of the line already in view (no
  empty screen). The pinned screen is solid brand navy edge to edge (Michael rejected cyan and the
  opening white circle) with white text, cyan/green tiles; its bottom 28% is masked to transparent so
  leaving it never draws a straight edge across the grey testimonials. No JS / reduced motion = static text.
- `.edge-blur` — fixed progressive backdrop blur along the bottom of the viewport (height via
  `--edge-blur-h`, 8vh), stacked masked layers with doubling blur.
- Motion: magnetic `.btn`/`.nav-cta` (uses the standalone `translate` property so it doesn't
  clash with hover `transform`), hero photo parallax.
- Portfolio (`.work`, "PORTFOLIO — HOVER-REVEAL LIST + LAPTOP STAND"): 5 projects (שמעוני, תמר בניאל,
  ישראל זיסקינד, לשכת הטוענים הרבניים, סילימנט (renamed from אלימנט; files stay `element.*`); "מוסדות מקצועיים" is banned site-wide (לשכת הטוענים = "הכתובת למתדיינים ולמייצגים בבתי הדין"); Michael dropped אלתר ספרים and, for now, WST) in compact full-bleed rows split by a fixed
  hairline in brand blue at 50%, followed by a "לכל הפרויקטים" `.btn-ghost` (`.work-more`) linking to
  the future `projects.html`; name in brand blue at 50%; on hover/active a letter roll (Michael replaced the old white wipe):
  JS splits each name into `.wn-ch > .wn-in` letters, each rolls up 1.19em and its lit copy (a
  `text-shadow` one line below in `--fg`) rises into place, 16ms stagger in reading order; nothing in the row moves, description always shown, field/year; no numbers or
  icons. On desktop `.work-stand` holds a still laptop (`.laptop`) resting on a tall narrow podium in tones of
  brand cyan (Michael's idea), sticky in the left column; hovering a row cross-fades the laptop screen
  to that project. Projects with a screen recording have `<video data-src="images/portfolio/NAME">`
  (JS adds `NAME.mp4` then `NAME.webm` sources on first activation, plays only the active one while the section is
  on screen, never under reduced motion; `.has-video` fades it in over the gradient placeholder).
  Recordings (all 5 projects): `images/portfolio/{shimony,tamar-baniel,ziskind,lishkatoanim,element}.mp4` (1280×690 = the recordings' own
  ratio, which the laptop screen matches; 30fps, h264 crf 30, faststart, no audio, 1.3–2MB; a VP9 `.webm` fallback only
  loads where H.264 can't play, e.g. Playwright's Chromium) + `NAME-poster.webp` (`.work-poster`, shown in the laptop and the mobile thumb).
  Michael's raw .mov files (2878×1552, 60fps) live in his Google Drive folder; their openings are
  trimmed (he hit record before loading the site): shimony from 7s, ziskind from 4.8s (just before
  the reload's headline entrance). The laptop is a realistic silver render from Magnific stock
  ("3D Silver Laptop with Blank Screen", PSD subject layer → `images/webp/laptop.webp`, 1400×1031 alpha),
  turned toward the list (Michael's ask: it "looks at the list"). `.laptop-art` is laid out at the
  photo's px and scaled by JS (`--lap-s`); `.laptop-screen` (1280×800 `.laptop-view`, no browser bar: Michael removed it) is mapped onto the photo's screen corners with a fixed `matrix3d` (homography; redo
  it if the image changes). Recordings fill the view (`object-fit: fill`, a squeeze instead of
  cropping the sites' edge logos); the podium is centered under the laptop (Michael: it wasn't centered) and has no visible top face: it is pulled up 11.6% of the width so its top edge sits behind the laptop's lowest outline (measured from the photo's alpha), so the laptop rests on it, not floating. Depth comes from a darker left side face (`.podium-side`, skewY 28deg, matching the laptop's view from the left) and both faces fade into the floor (mask); without them it read as a flat strip; a soft diagonal glare sits on the glass.
  Phones/tablets (≤900px) keep the stand too (Michael): rows hold the right half (desc smaller, no
  meta), the sticky laptop + podium sit on the left bleeding 9vw off the edge (`.portfolio { overflow-x:
  clip }` so RTL can't scroll sideways); touch screens activate the mid-viewport row. `.work-thumb` is
  no longer shown anywhere.

**Mobile tab bar** (`#tabbar`, ≤768px only — replaces the hamburger, which is hidden there): a
fixed liquid-glass pill at the bottom (backdrop blur + saturate, specular sheen `::before`, fading
rim `::after`) with 5 icon+label links (פרויקטים / אודות / התהליך / שירותים / בואו נדבר in accent). Refined with
the apple-design skill: an accent-tinted `.tabbar-drop` (not light glass on light glass) rides an
Apple-style spring (damping ratio 1.0, response 0.35s, real frame time, interruptible from its live
position/velocity) and stretches with its speed ("MOBILE TAB BAR — LIQUID DROP"). Feedback starts on
pointerdown (item presses in, drop heads there; pointercancel sends it back), commits on click and
locks to the target during the smooth scroll; active = section in view, contact at page bottom.
Labels are vibrancy-tuned (brighter, weight 500, +0.02em). Hides as a material (translate + scale +
blur, same path back) while the WhatsApp sheet is open; reduced-transparency / more-contrast /
reduced-motion variants included. The WhatsApp launcher and `body` padding sit above it.

**Navbar condense** (`.navbar.scrolled`): the bar is always laid out as the floating island; the
wide resting state at the top of the page is drawn with transforms only (logo + links translated out
to the page edges/down, logo scaled), so the condense runs on the compositor with no layout work.
"NAVBAR SCROLL" measures the old wide layout via `.nav-measure` on load/resize/fonts-ready and sets
`--nav-logo-dx/dy/s` and `--nav-links-dx/dy` on `.nav-container`. Easing tokens: `--ease-out`
(cubic-bezier(0.23, 1, 0.32, 1)) for entrances/reveals, `--ease-fluid` for sheets/morphs.

**Navbar hover bubble** ("NAVBAR — HOVER BUBBLE", after Aceternity's navbar): one `.nav-pill` behind
the items springs (Apple spring, damping 1, response 0.3s) to the hovered item's box and fades in
place when the pointer leaves; it reappears on the item (no slide) after fading. Mouse only. Menu
order follows the page: פרויקטים, אודות, התהליך (#services, the process), שירותים (#craft), בואו נדבר
(Michael added התהליך for a richer menu); the mobile tab bar has the same 5 items (grid of 5).

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
re-applied in CSS. Step 01 replays its Figma 2s loop (the brief's three text blocks fading in).
**Process stacked steps** ("PROCESS — STACKED DECK" in `script.js`): the four `.process-row`s are
moved into a sticky `.process-stage` and overlapped (`.is-stacked`) — no extra card around them
(Michael didn't want one). Scrolling (0.55 viewport heights per step) raises each `.pwin-frame` from
below over the previous window (which sinks back and fades — the glass would show through), while
the `.process-text`s cross-fade in the same spot (equal heights via `--deck-text-h`). Four thin
lines sit under the text (in `.process-steps-holder`, a copy of the row grid), numbered right → left
(1 rightmost, 4 leftmost), fill with progress (accent = current step) and jump to a step on click.
When there is room (desktop) the section title moves into the stage, right above the steps; the
front window replays its motion. Only on when a row fits the stage (compact text on phones);
otherwise, and under reduced motion / no JS, the plain list remains. The wave source is
`images/רקע גלים ללא טישטוש.png` (uploaded by Michael, 10723×5259).

**Project case-study pages** (`projects/<slug>.html`: shimony, tamar-baniel, ziskind,
lishkatoanim, silyment) are GENERATED by `python3 tools/build_projects.py`: it copies the head,
navbar, footer/contact, tab bar, edge blur and WhatsApp widget from `index.html` (so rerun it after
changing those), adds `<base href="../">` (all relative URLs resolve from the root; homepage
anchors like `#portfolio` go back to the homepage; `#contact` is rewritten to the page itself),
and fills each page from the `PROJECTS` table in the script. Page flow (Michael wanted a browsing
experience, not a top-to-bottom list): hero (no label above the giant name: the client line already
says it; lead, "מה עשיתי" chips (אפיון/עיצוב/פיתוח; סילימנט = פיתוח only), "הלקוח" (e.g. "משרד רואי
חשבון"; no years anywhere), "לאתר החי ↗" unless `url` is None (סילימנט)) → `.case-showcase`: the
recording in a browser window that grows from 62% to full size as you scroll (`--grow`, sticky) →
האתגר → `.case-gallery`: a pinned strip of 5 desktop screens (`images/portfolio/screens/<video>-1..5.webp`,
frames from the recordings) that moves sideways with the scroll (`--gx`, section height set in JS;
phones show each screen's top at 4:3) → הפיצוח → results → optional `.case-phones` (rendered only once
`images/portfolio/mobile/<video>-*.webp` exist: real mobile captures still wanted from Michael) → the
client's quote (light zone) → `.case-pager`: previous / next project only (Michael: not a list), two
semi-transparent blue cards (no image backgrounds: he found them blurry), the hovered project's
screen floats beside the cursor (`.case-float`, desktop). Story blocks (texts from mkaplin.com, in
Michael's singular voice: he works alone, never "we") have a calm sticky side head (short brand rule,
the word at about subtitle size, the question under it), then a large Anomalia lead lighting up word
by word (`.cw`), then muted body text. Reduced motion → `html.case-static` (plain flow). Page-only styles
are in `case.css` (bump `CASE_V` in the script when it or `case.js` change). Homepage rows link to
these pages in the same tab. Edit content in the script, then rerun it; don't hand-edit the HTML.

## Content notes

- Portfolio rows link to the internal case studies (`projects/*.html`); משרד שמעוני is an
  accounting firm (רואי חשבון), not lawyers.
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
- Testimonials (`.testimonials`, right before the contact section — footer is always last): 9 real client
  quotes from mkaplin.com. Title sits on the right, cards on the left in vertical columns that loop
  upward at slightly different speeds (21st.dev style); "TESTIMONIALS — VERTICAL COLUMNS" deals the
  cards into 1–3 columns by width and repeats each column until it overfills the window (so the loop
  never shows empty space). Hover pauses a column; reduced motion / no JS = plain grid. Avatars are the
  clients' logos/photo from mkaplin.com (`images/testimonials/`); מיכאל זכאי has none and keeps initials.
- Clients (`.clients`, 3rd section, light zone, right before the portfolio, no heading on purpose): logo wall of the 15
  grey client logos from mkaplin.com (`images/clients/`, sized by area so wide/tall marks weigh the
  same) logo marquee.
  Now three full-bleed rows (each all 15 logos, different order, smaller marks so many show) that
  move only with the page scroll, sideways, alternating direction (`data-dir`) at slightly different
  speeds (`data-speed`), centered when the section is mid-screen; each row eases after the scroll
  (lerp 0.08/frame) for a calm, elegant feel ("CLIENTS — SCROLL-LINKED ROWS"). Michael wants "many
  logos, gentle elegant motion on scroll" and is still deciding on the style; tried and dropped: a
  cell-swap wall (swaps went unnoticed) and auto-running marquee rows ("not special").
- Pull quotes (PREVIEW ONLY, after Michael saw a TikTok on spreading testimonials through the page;
  he worried it may look scattered): `.pq` snippets (avatar, stars, one line, name) under the sub of
  portfolio / process / craft headers (footer one removed: too close to the testimonials), a hero
  `.pq-rotator` under the buttons cycling 4 short snippets (fade + rise every 4.5s, "HERO — QUOTE
  ROTATOR"), plus
  `.pq-feature` (headline takeaway + full מיכאל זכאי quote) between about and process. Hidden unless the
  URL has `?quotes` (inline script in <head> adds `html.show-quotes`). To ship: drop the gate; to
  drop: delete the `.pq`/`.pq-feature` markup + "PULL QUOTES" CSS. Last commit before this: 8851375.
- Hero showcase (PREVIEW ONLY, `?hero2`, gate in the same <head> script → `html.show-hero2`): a small
  floating screen (`.hero-showcase`) over Michael's lower shoulder cycling the 5 project posters every
  3.6s with story-style progress bars + project name ("HERO — SHOWCASE CAROUSEL"); on phones it also
  shows Michael's photo under the copy (otherwise hidden ≤900px) with the screen beside him.
- About stats: +6 שנות ניסיון / +35 פרויקטים שעלו לאוויר / +15 תחומי עיסוק (15 awaiting Michael's confirmation).
- Numbers (about stats, process step numbers) are in Anomalia; each `.stat` is space-between so the
  three numerals share one line even when a label wraps (phones).
- Testimonials: back to 3 columns (≥820px wide area; 2/1 below): 4 broke the title (Michael). Key
  phrases in each quote are `<strong>` (bold, `--fg`), wording untouched. Clicking a card (Enter too)
  opens a copy of it big in a `.tm-modal` (backdrop blur, × / backdrop / Esc closes, columns pause),
  "TESTIMONIALS — OPEN BIG"; click, not hover, because the columns move. A Google rating badge is
  wanted here once Michael gives the real rating, count and profile link (never invent it).
- Footer: no written email/site address and no "אחזור אליכם" note (Michael removed them); `.contact-social`
  is a row of round icons: email (mailto), Instagram (mikikaplin), LinkedIn
  (href still `#`, `data-todo="linkedin-url"`: waiting for Michael's URL), Facebook; outlined round icons.
- About (`.about`) is full screen (`min-height: 100svh`): photo + story, then `.about-stats`, a
  full-width band of oversized thin numerals (+6 years / +35 projects / 100%, third stat pending Michael's pick) split by hairlines; "ABOUT — COUNT-UP
  NUMBERS" counts them up once half in view (final values live in the markup).
- FAQ (`#faq`, between testimonials and contact): an "ask me" conversation right on the page (no
  window, Michael didn't want one) with the 6 real Q&As from mkaplin.com. Markup holds all Q/A
  bubbles (no-JS fallback); "FAQ — CHAT" turns questions into suggestion chips that play out visitor
  bubble (right, cyan) → typing dots → Michael's answer (left, in a `.faq-row` with his round avatar
  at the bubble's outer bottom corner); the first exchange auto-plays when first seen.
- Craft (`#craft`, "CRAFT — WHAT A SITE IS MADE OF", light zone, between process and magnet): "לכל פיקסל
  יש סיבה." (was "כל פיקסל, בכוונה.") Michael's message that a site is many layers he hand-crafts down to the pixel. A bento
  brand-board of 8 `.craft-card`s (4 cols → 2 at ≤1100px → 1 at ≤640px), each visual demonstrates
  its craft: בידול (one green dot among grey), שפה וקול (bubbles), טיפוגרפיה (Anomalia/Polin),
  צבע (brand swatches), כתיבה (generic line struck out → "אין שני לרושם ראשוני."), איקונים
  (hand-drawn SVG set), ליטוש תמונות ומוצרים (laptop before/after split), תנועה ופרטים קטנים (the
  site's spinning-ring button + cursor); the retouch card is titled "בימוי ויזואלי" (Michael found
  "ליטוש תמונות" unprofessional). Cards: navy in dark, white on grey, lift 4px on hover. Once revealed
  each card has a very gentle idle loop (ping on the green dot, floating bubbles, type guides drawing,
  swatches taking turns to widen, strike-through redrawn then the new line rising, icons lighting in
  turn, the before/after split sliding); all off under reduced motion.
- Hero copy is vertically centered in the screen (`.hero-inner` min-height = viewport minus the
  100px navbar padding, `.hero-text { align-self: center }`); the photo stays on the bottom edge.
- Hero copy (Michael wanted it business-minded, not "בלתי נשכח"): "האתר שלך הוא / הרושם הראשון. / בואו
  נהפוך אותו / ליתרון שלך." (Michael's pick) + "אני בונה לעסקים אתרים שמייצרים אמון, מבדלים אותם מהמתחרים והופכים גולשים
  לפניות של לקוחות." `.hero-highlight` never wraps ("הרושם הראשון." on one line) and "נהפוך&nbsp;אותו" is
  glued. On phones (≤768px) JS ("HERO — MOBILE TITLE FIT") searches the largest size that stays within
  half the screen height AND doesn't overflow the width (the no-wrap phrase usually sets the limit).
- About photo (`.about-photo`, the transparent `miki-hero.png` cut-out) has no panel, radius or shadow: Michael asked to remove its background; it stands straight on the page (hidden on phones).
- About opens with "קוראים לי מיכאל קאפלין, ואני מעצב ובונה אתרים עם אופי." (`.about-intro`); no badge
  on the photo (the +30 lives in the numbers band).
- Testimonial cards follow the page theme: solid navy layer in dark, white with navy text on the grey
  page (Michael disliked dark cards on grey). No per-card backdrop blur.
- The contact section now lives inside `footer.site-end` (see Curtain footer).
- FAQ is full screen (`min-height: 100svh`, content centered).
- WhatsApp badge: no dark ring (Michael: looked fake), a thin white rim + shadow. With JS it waits
  ("WHATSAPP — DELAYED NUDGE"): after 25s, or when testimonials/FAQ come into view, it pops in, the
  launcher shakes once and a white `.wa-peek` bubble ("היי, איך אני יכול לעזור?") opens the chat on tap
  (× dismisses, auto-hides after 12s). Once per visit (sessionStorage).
- WhatsApp sheet body uses WhatsApp's own light wallpaper: cream `#EFEAE2` + `images/wa-doodles.svg`
  (generated tile of 25 scattered line doodles).
- `.mcp.json` registers the shadcn MCP server (`npx shadcn@latest mcp`) for component inspiration;
  it is not a dependency of the site (no package.json on purpose).
- Contact form is deliberately minimal: no card/frame, underlined transparent fields in a
  2-column grid (`.form-group--wide` spans both). No visible labels: the placeholder carries the
  field name (labels stay for screen readers via `.sr-only`). In the footer the wave video is
  shifted down so its dark crease runs under the form, and a soft navy radial pad
  (`.site-end::before`) sits behind the form for legibility.

## Git workflow used in this repo

Changes are pushed to both `main` and the feature branch `claude/create-landing-page-PfPuY`
(GitHub Pages serves off `main`). When committing, push to both:

```bash
git push origin HEAD:claude/create-landing-page-PfPuY
git push origin HEAD:main
```

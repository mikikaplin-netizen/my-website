// ===========================
// DOT FIELD BACKGROUND
// ===========================
(function () {
  const TWO_PI = Math.PI * 2;

  function initDotField(container, opts) {
    const o = Object.assign({
      dotRadius: 1.4,
      dotSpacing: 22,
      cursorRadius: 480,
      bulgeOnly: true,
      bulgeStrength: 72,
      glowRadius: 200,
      waveAmplitude: 0,
      sparkle: false,
      gradientFrom: 'rgba(100, 193, 210, 0.5)',
      gradientTo:   'rgba(28, 211, 28, 0.24)',
      // brand cyan (--accent) at a moderate strength
      glowColor:    '#64C1D2',
      glowOpacity:  0.22,
    }, opts);

    // container's own position:fixed (global full-page background) comes
    // from CSS — don't override it with an inline position here, that
    // would make the canvas scroll away with the page instead of
    // staying pinned behind every section
    container.style.overflow = 'hidden';

    const canvas = document.createElement('canvas');
    canvas.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;';
    container.appendChild(canvas);

    const glowId = 'dfg-' + Math.random().toString(36).slice(2, 8);
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;pointer-events:none;';
    svg.innerHTML = `<defs><radialGradient id="${glowId}">
      <stop offset="0%" stop-color="${o.glowColor}" stop-opacity="${o.glowOpacity}"/>
      <stop offset="100%" stop-color="transparent"/>
    </radialGradient></defs>
    <circle id="${glowId}c" cx="-9999" cy="-9999" r="${o.glowRadius}"
      fill="url(#${glowId})" style="opacity:0;will-change:opacity"/>`;
    container.appendChild(svg);

    const glowCircle = svg.getElementById(glowId + 'c');
    const ctx = canvas.getContext('2d', { alpha: true });
    const dpr = Math.min(window.devicePixelRatio || 1, 2);

    let dots = [], raf, resizeTimer, frameCount = 0;
    const mouse = { x: -9999, y: -9999, prevX: -9999, prevY: -9999, speed: 0 };
    const size  = { w: 0, h: 0, offX: 0, offY: 0 };
    let glowOp = 0, eng = 0;

    function buildDots(w, h) {
      const step = o.dotRadius + o.dotSpacing;
      const cols = Math.floor(w / step), rows = Math.floor(h / step);
      const padX = (w % step) / 2, padY = (h % step) / 2;
      dots = [];
      for (let r = 0; r < rows; r++)
        for (let c = 0; c < cols; c++) {
          const ax = padX + c * step + step / 2;
          const ay = padY + r * step + step / 2;
          dots.push({ ax, ay, sx: ax, sy: ay, vx: 0, vy: 0, x: ax, y: ay });
        }
    }

    function doResize() {
      const rect = container.getBoundingClientRect();
      const w = rect.width, h = rect.height;
      canvas.width  = w * dpr; canvas.height = h * dpr;
      canvas.style.width = w + 'px'; canvas.style.height = h + 'px';
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      size.w = w; size.h = h;
      // fixed/viewport-relative container: use viewport coords, no scroll offset
      size.offX = rect.left;
      size.offY = rect.top;
      buildDots(w, h);
    }

    function onMove(e) {
      mouse.x = e.clientX - size.offX;
      mouse.y = e.clientY - size.offY;
    }

    const speedTick = setInterval(() => {
      const dx = mouse.prevX - mouse.x, dy = mouse.prevY - mouse.y;
      const d  = Math.sqrt(dx * dx + dy * dy);
      mouse.speed += (d - mouse.speed) * 0.5;
      if (mouse.speed < 0.001) mouse.speed = 0;
      mouse.prevX = mouse.x; mouse.prevY = mouse.y;
    }, 20);

    function tick() {
      frameCount++;
      const { w, h } = size;
      const t   = frameCount * 0.02;
      const len = dots.length;
      const cr  = o.cursorRadius, crSq = cr * cr;
      const rad = o.dotRadius / 2;

      const tgt = Math.min(mouse.speed / 5, 1);
      eng     += (tgt - eng) * 0.06;
      if (eng < 0.001) eng = 0;
      glowOp  += (eng - glowOp) * 0.08;

      glowCircle.setAttribute('cx', mouse.x);
      glowCircle.setAttribute('cy', mouse.y);
      glowCircle.style.opacity = glowOp;

      ctx.clearRect(0, 0, w, h);

      const grad = ctx.createLinearGradient(0, 0, w, h);
      grad.addColorStop(0, o.gradientFrom);
      grad.addColorStop(1, o.gradientTo);
      ctx.fillStyle = grad;
      ctx.beginPath();

      for (let i = 0; i < len; i++) {
        const d  = dots[i];
        const dx = mouse.x - d.ax, dy = mouse.y - d.ay;
        const dSq = dx * dx + dy * dy;

        if (dSq < crSq && eng > 0.01) {
          const dist  = Math.sqrt(dSq);
          if (o.bulgeOnly) {
            const tt   = 1 - dist / cr;
            const push = tt * tt * o.bulgeStrength * eng;
            const ang  = Math.atan2(dy, dx);
            d.sx += (d.ax - Math.cos(ang) * push - d.sx) * 0.15;
            d.sy += (d.ay - Math.sin(ang) * push - d.sy) * 0.15;
          } else {
            const ang  = Math.atan2(dy, dx);
            const move = (500 / dist) * (mouse.speed * 0.1);
            d.vx += Math.cos(ang) * -move;
            d.vy += Math.sin(ang) * -move;
          }
        } else if (o.bulgeOnly) {
          d.sx += (d.ax - d.sx) * 0.1;
          d.sy += (d.ay - d.sy) * 0.1;
        }

        if (!o.bulgeOnly) {
          d.vx *= 0.9; d.vy *= 0.9;
          d.x = d.ax + d.vx; d.y = d.ay + d.vy;
          d.sx += (d.x - d.sx) * 0.1;
          d.sy += (d.y - d.sy) * 0.1;
        }

        let drawX = d.sx, drawY = d.sy;
        if (o.waveAmplitude > 0) {
          drawY += Math.sin(d.ax * 0.03 + t) * o.waveAmplitude;
          drawX += Math.cos(d.ay * 0.03 + t * 0.7) * o.waveAmplitude * 0.5;
        }

        if (o.sparkle) {
          const hash = ((i * 2654435761) ^ (frameCount >> 3)) >>> 0;
          const r2   = (hash % 100) < 3 ? rad * 1.8 : rad;
          ctx.moveTo(drawX + r2, drawY);
          ctx.arc(drawX, drawY, r2, 0, TWO_PI);
        } else {
          ctx.moveTo(drawX + rad, drawY);
          ctx.arc(drawX, drawY, rad, 0, TWO_PI);
        }
      }

      ctx.fill();
      raf = requestAnimationFrame(tick);
    }

    doResize();
    window.addEventListener('resize',    () => { clearTimeout(resizeTimer); resizeTimer = setTimeout(doResize, 100); });
    window.addEventListener('mousemove', onMove, { passive: true });
    raf = requestAnimationFrame(tick);
  }

  const dfEl = document.getElementById('dot-field-bg');
  if (dfEl) initDotField(dfEl);
})();

// ===========================
// NAVBAR SCROLL
// ===========================
const navbar = document.getElementById('navbar');
window.addEventListener('scroll', () => {
  navbar.classList.toggle('scrolled', window.scrollY > 40);
});

// ===========================
// MOBILE NAV TOGGLE
// ===========================
const navToggle = document.getElementById('navToggle');
const navLinks = document.querySelector('.nav-links');

function setNavOpen(open) {
  navLinks.classList.toggle('open', open);
  navToggle.classList.toggle('active', open);
  navToggle.setAttribute('aria-expanded', String(open));
}

navToggle.setAttribute('aria-expanded', 'false');
navToggle.addEventListener('click', () => {
  setNavOpen(!navLinks.classList.contains('open'));
});

navLinks.querySelectorAll('a').forEach(link => {
  link.addEventListener('click', () => setNavOpen(false));
});

document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && navLinks.classList.contains('open')) setNavOpen(false);
});

// ===========================
// REVEAL ON SCROLL
// ===========================
const revealEls = document.querySelectorAll(
  '.process-row, .work-row, .about-grid, .contact-wrapper, .section-header'
);

revealEls.forEach(el => el.classList.add('reveal'));

const observer = new IntersectionObserver(
  entries => {
    entries.forEach((entry, i) => {
      if (entry.isIntersecting) {
        setTimeout(() => entry.target.classList.add('visible'), i * 80);
        observer.unobserve(entry.target);
      }
    });
  },
  { threshold: 0.1 }
);

revealEls.forEach(el => observer.observe(el));

// ===========================
// CONTACT FORM
// ===========================
const contactForm = document.getElementById('contactForm');
if (contactForm) {
  contactForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const btn = contactForm.querySelector('button[type="submit"]');
    const orig = btn.textContent;
    btn.textContent = 'ההודעה נשלחה ✓';
    btn.style.background = '#22c55e';
    btn.style.boxShadow = '0 0 24px rgba(34,197,94,0.35)';
    setTimeout(() => {
      btn.textContent = orig;
      btn.style.background = '';
      btn.style.boxShadow = '';
      contactForm.reset();
    }, 3000);
  });
}

// ===========================
// SMOOTH ACTIVE NAV
// ===========================
const sections = document.querySelectorAll('section[id]');
const navAnchors = document.querySelectorAll('.nav-links a[href^="#"]');

window.addEventListener('scroll', () => {
  let current = '';
  sections.forEach(section => {
    if (window.scrollY >= section.offsetTop - 120) current = section.getAttribute('id');
  });
  navAnchors.forEach(a => {
    a.classList.toggle('is-active', a.getAttribute('href') === `#${current}`);
  });
}, { passive: true });

// ===========================
// WHATSAPP FLOATING WIDGET
// ===========================
const waLauncher = document.getElementById('waLauncher');
const waPanel = document.getElementById('waPanel');
const waClose = document.getElementById('waClose');

if (waLauncher && waPanel) {
  const openPanel = () => {
    waPanel.hidden = false;
    waLauncher.classList.add('opened');
  };
  const closePanel = () => { waPanel.hidden = true; };

  waLauncher.addEventListener('click', () => {
    if (waPanel.hidden) openPanel();
    else closePanel();
  });

  if (waClose) {
    waClose.addEventListener('click', (e) => {
      e.stopPropagation();
      closePanel();
    });
  }
}

// ===========================
// MAGNET FIELD
// ===========================
// "העסק שלך" follows the pointer (kept away from the edges so it never
// parks in a corner) and gently pushes the competitor bubbles out of its
// space; pushed bubbles shrink and fade. When the pointer leaves the
// field it eases back to its resting spot under the heading.
(function () {
  const field = document.getElementById('magnetField');
  const dominant = document.getElementById('magnetDominant');
  if (!field || !dominant) return;

  const bubbles = Array.from(field.querySelectorAll('.magnet-bubble:not(.magnet-bubble--dominant)'));
  const bubbleState = bubbles.map(el => ({ el, homeX: 0, homeY: 0, dx: 0, dy: 0 }));

  const MIN_DIR_DIST = 10;
  const BUBBLE_EASE = 0.12;
  const DOM_EASE = 0.08;
  const EDGE_X = 0.16;     // dominant stays within 16%–84% of the width
  const EDGE_Y = 0.2;      // …and 20%–85% of the height
  const IDLE_Y_RATIO = 0.72;

  let rect = { w: 0, h: 0, left: 0, top: 0 };
  let repelRadius = 340, repelStrength = 260;
  const target = { x: 0, y: 0 };
  const domPos = { x: 0, y: 0 };
  const rawPointer = { x: 0, y: 0 };
  let pointerActive = false;
  let measured = false;
  let resizeTimer;

  function idle() { target.x = rect.w / 2; target.y = rect.h * IDLE_Y_RATIO; }

  function measure() {
    const r = field.getBoundingClientRect();
    rect = { w: r.width, h: r.height, left: r.left, top: r.top };
    // the dominant's "personal space" scales with the field
    repelRadius = Math.max(170, Math.min(360, Math.min(rect.w, rect.h) * 0.36));
    repelStrength = repelRadius * 0.85;
    bubbleState.forEach(b => {
      b.homeX = b.el.offsetLeft + b.el.offsetWidth / 2;
      b.homeY = b.el.offsetTop + b.el.offsetHeight / 2;
    });
    if (!measured) {
      idle();
      domPos.x = target.x; domPos.y = target.y;
      measured = true;
    }
  }

  field.addEventListener('mousemove', (e) => {
    rawPointer.x = e.clientX; rawPointer.y = e.clientY; pointerActive = true;
  }, { passive: true });
  field.addEventListener('mouseleave', () => { pointerActive = false; });
  field.addEventListener('touchmove', (e) => {
    const t = e.touches[0];
    if (t) { rawPointer.x = t.clientX; rawPointer.y = t.clientY; pointerActive = true; }
  }, { passive: true });
  field.addEventListener('touchend', () => { pointerActive = false; });

  function tick() {
    const r = field.getBoundingClientRect();
    rect.left = r.left; rect.top = r.top;

    if (pointerActive) {
      target.x = Math.max(rect.w * EDGE_X, Math.min(rect.w * (1 - EDGE_X), rawPointer.x - rect.left));
      target.y = Math.max(rect.h * EDGE_Y, Math.min(rect.h * 0.85, rawPointer.y - rect.top));
    } else {
      idle();
    }

    domPos.x += (target.x - domPos.x) * DOM_EASE;
    domPos.y += (target.y - domPos.y) * DOM_EASE;
    dominant.style.setProperty('--dx', (domPos.x - rect.w / 2).toFixed(2) + 'px');
    dominant.style.setProperty('--dy', (domPos.y - rect.h / 2).toFixed(2) + 'px');

    bubbleState.forEach(b => {
      let vx = b.homeX - domPos.x;
      let vy = b.homeY - domPos.y;
      let dist = Math.sqrt(vx * vx + vy * vy);
      if (dist < MIN_DIR_DIST) {
        vx = b.homeX - rect.w / 2 || 1;
        vy = b.homeY - rect.h / 2 || 1;
        dist = Math.sqrt(vx * vx + vy * vy) || 1;
      }
      let tx = 0, ty = 0, push = 0;
      if (dist < repelRadius) {
        const t = 1 - dist / repelRadius;
        push = t;
        tx = (vx / dist) * t * t * repelStrength;
        ty = (vy / dist) * t * t * repelStrength;
      }
      b.dx += (tx - b.dx) * BUBBLE_EASE;
      b.dy += (ty - b.dy) * BUBBLE_EASE;
      b.el.style.setProperty('--dx', b.dx.toFixed(2) + 'px');
      b.el.style.setProperty('--dy', b.dy.toFixed(2) + 'px');
      b.el.style.setProperty('--push', push.toFixed(3));
    });

    requestAnimationFrame(tick);
  }

  measure();
  window.addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(measure, 100);
  });
  requestAnimationFrame(tick);
})();

// ===========================
// STATEMENT — SCROLL WORD REVEAL
// ===========================
(function () {
  const textEl = document.querySelector('.statement-text');
  if (!textEl) return;

  // Wrap plain-text words in .sw spans; mark <strong> as a single token.
  const tokens = [];
  const nodes = Array.from(textEl.childNodes);
  nodes.forEach(node => {
    if (node.nodeType === Node.TEXT_NODE) {
      const parts = node.textContent.split(/(\s+)/);
      const frag = document.createDocumentFragment();
      parts.forEach(part => {
        if (part.trim() === '') {
          frag.appendChild(document.createTextNode(part));
        } else {
          const span = document.createElement('span');
          span.className = 'sw';
          span.textContent = part;
          frag.appendChild(span);
          tokens.push(span);
        }
      });
      textEl.replaceChild(frag, node);
    } else if (node.nodeType === Node.ELEMENT_NODE && node.tagName === 'STRONG') {
      tokens.push(node);
    }
  });

  let ticking = false;
  function update() {
    ticking = false;
    const r = textEl.getBoundingClientRect();
    const vh = window.innerHeight;
    const startY = vh * 0.9;
    const endY = vh * 0.35;
    let p = (startY - r.top) / (startY - endY);
    p = Math.max(0, Math.min(1, p));
    const activeCount = Math.round(p * tokens.length);
    tokens.forEach((t, i) => {
      t.classList.toggle('on', i < activeCount);
    });
  }

  function onScroll() {
    if (!ticking) {
      ticking = true;
      requestAnimationFrame(update);
    }
  }

  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', onScroll, { passive: true });
  update();
})();

// ===========================
// TEXT ENTRANCE EFFECTS
// ===========================
// Inspired by GSAP SplitText / ScrambleText demos, implemented in plain JS:
// - headings: words rise out of a mask with a blur-in, staggered
// - section labels: Hebrew "decode" scramble before settling on the real text
// Elements only get split when JS runs and motion is allowed, so the
// no-JS / reduced-motion page renders the plain text untouched.
(function () {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  function splitWords(el) {
    const words = [];
    (function walk(node) {
      Array.from(node.childNodes).forEach(child => {
        if (child.nodeType === Node.TEXT_NODE) {
          const frag = document.createDocumentFragment();
          child.textContent.split(/(\s+)/).forEach(part => {
            if (!part) return;
            if (/^\s+$/.test(part)) {
              frag.appendChild(document.createTextNode(' '));
              return;
            }
            const mask = document.createElement('span');
            mask.className = 'tx-mask';
            const word = document.createElement('span');
            word.className = 'tx-word';
            word.textContent = part;
            mask.appendChild(word);
            frag.appendChild(mask);
            words.push(word);
          });
          node.replaceChild(frag, child);
        } else if (child.nodeType === Node.ELEMENT_NODE && child.tagName !== 'BR') {
          walk(child);
        }
      });
    })(el);
    words.forEach((w, i) => w.style.setProperty('--i', i));
    el.classList.add('tx-split');
    return words;
  }

  const SCRAMBLE_CHARS = 'אבגדהוזחטיכלמנסעפצקרשת';
  function scramble(el, duration) {
    const finalText = el.textContent;
    const start = performance.now();
    el.setAttribute('aria-label', finalText);
    el.classList.add('tx-in');
    function frame(now) {
      const p = Math.min(1, (now - start) / duration);
      const settled = Math.floor(p * finalText.length);
      let out = '';
      for (let i = 0; i < finalText.length; i++) {
        const ch = finalText[i];
        out += (i < settled || /\s/.test(ch))
          ? ch
          : SCRAMBLE_CHARS[Math.floor(Math.random() * SCRAMBLE_CHARS.length)];
      }
      el.textContent = out;
      if (p < 1) requestAnimationFrame(frame);
      else el.textContent = finalText;
    }
    requestAnimationFrame(frame);
  }

  // Hero headline plays on load
  const heroTitle = document.querySelector('.hero-title');
  if (heroTitle) {
    splitWords(heroTitle);
    requestAnimationFrame(() => requestAnimationFrame(() => heroTitle.classList.add('tx-in')));
  }

  // Scroll-triggered headings + labels
  const splitTargets = document.querySelectorAll('.section-title, .process-title');
  splitTargets.forEach(splitWords);

  const labels = document.querySelectorAll('.section-label');
  labels.forEach(l => l.classList.add('tx-scramble'));

  const txObserver = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      const el = entry.target;
      if (el.classList.contains('tx-scramble')) scramble(el, 900);
      else el.classList.add('tx-in');
      txObserver.unobserve(el);
    });
  }, { threshold: 0.2, rootMargin: '0px 0px -8% 0px' });

  splitTargets.forEach(el => txObserver.observe(el));
  labels.forEach(el => txObserver.observe(el));
})();

// ===========================
// MOTION — PRESS FEEDBACK
// ===========================
// iOS Safari only applies :active (the instant press state on .btn, .nav-cta,
// .wa-launcher) once the page has a touchstart listener.
document.addEventListener('touchstart', () => {}, { passive: true });

// ===========================
// MOTION — MAGNETIC BUTTONS
// ===========================
// CTAs lean toward the cursor while hovered. Uses the standalone `translate`
// property so it never fights the existing :hover `transform` on .btn.
// Motion is a real spring per axis (Apple's damping/response model): it always
// continues from the live position and velocity, so it can be re-grabbed
// mid-flight. Critically damped while tracking the cursor; on leave the button
// is released with the momentum it has, so it springs home with a small bounce.
(function () {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  if (!window.matchMedia('(hover: hover) and (pointer: fine)').matches) return;

  const STRENGTH = 0.35;
  const RESPONSE = 0.35;        // seconds — how quickly it reaches the target
  const TRACK_DAMPING = 1.0;    // no overshoot while following the cursor
  const RELEASE_DAMPING = 0.6;  // springy return once let go
  const K = Math.pow(2 * Math.PI / RESPONSE, 2);

  const items = Array.from(document.querySelectorAll('.btn, .nav-cta')).map(el => ({
    el, x: 0, y: 0, vx: 0, vy: 0, tx: 0, ty: 0, damping: TRACK_DAMPING,
  }));
  if (!items.length) return;

  let running = false;
  let last = 0;

  items.forEach(item => {
    item.el.addEventListener('mousemove', (e) => {
      const r = item.el.getBoundingClientRect();
      // r includes the current translate; subtract it so the target is
      // measured from the button's resting centre
      item.tx = (e.clientX - (r.left - item.x + r.width / 2)) * STRENGTH;
      item.ty = (e.clientY - (r.top - item.y + r.height / 2)) * STRENGTH;
      item.damping = TRACK_DAMPING;
      wake();
    });
    item.el.addEventListener('mouseleave', () => {
      item.tx = 0; item.ty = 0;
      item.damping = RELEASE_DAMPING;
      wake();
    });
  });

  function wake() {
    if (running) return;
    running = true;
    last = performance.now();
    requestAnimationFrame(tick);
  }

  function tick(now) {
    const dt = Math.min((now - last) / 1000, 1 / 30);
    last = now;
    let active = false;
    items.forEach(item => {
      const c = 4 * Math.PI * item.damping / RESPONSE;
      item.vx += (K * (item.tx - item.x) - c * item.vx) * dt;
      item.vy += (K * (item.ty - item.y) - c * item.vy) * dt;
      item.x += item.vx * dt;
      item.y += item.vy * dt;
      const settled = Math.abs(item.tx - item.x) < 0.05 && Math.abs(item.ty - item.y) < 0.05 &&
        Math.abs(item.vx) < 1 && Math.abs(item.vy) < 1;
      if (settled) {
        item.x = item.tx; item.y = item.ty; item.vx = 0; item.vy = 0;
      } else {
        active = true;
      }
      item.el.style.translate = item.x || item.y ? `${item.x.toFixed(2)}px ${item.y.toFixed(2)}px` : '';
    });
    if (active) requestAnimationFrame(tick);
    else running = false;
  }
})();

// ===========================
// PORTFOLIO — HOVER-REVEAL LIST
// ===========================
// Hovering (or keyboard-focusing) a project row makes it active (accent
// underline + description). On desktop a preview floats on the left,
// eased toward the cursor's height and tilted slightly by its velocity.
(function () {
  const work = document.querySelector('.work');
  const rows = document.querySelectorAll('.work-row');
  const items = document.querySelectorAll('.work-preview-item');
  const preview = document.querySelector('.work-preview');
  if (!work || !rows.length) return;

  function activate(i) {
    rows.forEach(r => r.classList.toggle('is-active', r.dataset.work === i));
    items.forEach(it => it.classList.toggle('is-active', it.dataset.work === i));
  }

  rows.forEach(row => {
    row.addEventListener('mouseenter', () => activate(row.dataset.work));
    row.addEventListener('focusin', () => activate(row.dataset.work));
  });

  // touch screens have no hover: the row crossing the middle of the
  // viewport becomes active instead
  if (!window.matchMedia('(hover: hover)').matches) {
    const io = new IntersectionObserver(entries => {
      entries.forEach(e => { if (e.isIntersecting) activate(e.target.dataset.work); });
    }, { rootMargin: '-45% 0px -45% 0px' });
    rows.forEach(r => io.observe(r));
    return;
  }

  if (!preview) return;
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  let targetY = 0, y = 0, tilt = 0, running = false;

  function place(clientY) {
    const r = work.getBoundingClientRect();
    const h = preview.offsetHeight;
    targetY = Math.max(0, Math.min(r.height - h, clientY - r.top - h / 2));
  }

  function tick() {
    const dy = targetY - y;
    y += dy * (reduce ? 1 : 0.12);
    tilt += ((reduce ? 0 : Math.max(-8, Math.min(8, dy * 0.06))) - tilt) * 0.15;
    preview.style.setProperty('--y', y.toFixed(1) + 'px');
    preview.style.setProperty('--tilt', tilt.toFixed(2) + 'deg');
    if (Math.abs(dy) > 0.5 || Math.abs(tilt) > 0.05) requestAnimationFrame(tick);
    else running = false;
  }

  function kick() { if (!running) { running = true; requestAnimationFrame(tick); } }

  const list = work.querySelector('.work-list');
  list.addEventListener('mouseenter', (e) => {
    place(e.clientY);
    if (!work.classList.contains('is-hovering')) {
      y = targetY; // appear where the cursor is, then follow
      preview.style.setProperty('--y', y + 'px');
    }
    work.classList.add('is-hovering');
  });
  list.addEventListener('mousemove', (e) => { place(e.clientY); kick(); });
  list.addEventListener('mouseleave', () => work.classList.remove('is-hovering'));

  // keyboard: show the preview beside the focused row
  rows.forEach(row => row.addEventListener('focusin', () => {
    const rr = row.getBoundingClientRect();
    place(rr.top + rr.height / 2); kick();
    work.classList.add('is-hovering');
  }));
  list.addEventListener('focusout', (e) => {
    if (!list.contains(e.relatedTarget)) work.classList.remove('is-hovering');
  });
})();

// ===========================
// MOTION — HERO PARALLAX
// ===========================
(function () {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const photo = document.querySelector('.hero-photo');
  const heroText = document.querySelector('.hero-text');
  if (!photo) return;

  let ticking = false;
  function update() {
    ticking = false;
    const y = window.scrollY;
    if (y > window.innerHeight * 1.2) return;
    photo.style.translate = `0 ${(y * 0.18).toFixed(1)}px`;
    if (heroText) heroText.style.translate = `0 ${(y * -0.08).toFixed(1)}px`;
  }
  window.addEventListener('scroll', () => {
    if (!ticking) { ticking = true; requestAnimationFrame(update); }
  }, { passive: true });
})();

// ===========================
// WAVE MARQUEE — SCROLL-DRIVEN
// ===========================
// One giant line that travels across the screen while the section is
// pinned; every letter/tile rides a sine wave fixed in screen space, so
// the phrase looks like it's flowing over a curve. Mirrored for Hebrew:
// the start of the sentence (its right edge) enters first, moving
// left → right.
(function () {
  const section = document.querySelector('.wave');
  const track = section && section.querySelector('.wave-track');
  const sticky = section && section.querySelector('.wave-sticky');
  if (!track || !sticky) return;
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  track.querySelectorAll('.wave-word').forEach(word => {
    const chars = Array.from(word.textContent.trim());
    word.textContent = '';
    chars.forEach(ch => {
      const span = document.createElement('span');
      span.className = 'wave-char';
      span.textContent = ch;
      word.appendChild(span);
    });
  });

  section.classList.add('wave--on');

  const items = Array.from(track.querySelectorAll('.wave-char, .wave-tile')).map(el => ({ el, cx: 0 }));
  const WAVES_PER_SCREEN = 0.75;
  // px of travel per px scrolled — slower on phones, where the line is
  // short relative to scroll distance and would otherwise fly past
  const travelSpeed = () => (window.innerWidth < 768 ? 0.45 : 0.9);
  // Pinned-scroll timeline (q = 0 → 1 while the section is stuck):
  //   0    → 0.15  white circle grows from the center to fill the screen
  //   0.08 → 0.92  the line travels across
  //   0.85 → 1     circle shrinks away, back to the dark page
  const GROW_END = 0.15, TRAVEL_START = 0.08, TRAVEL_END = 0.92, SHRINK_START = 0.85;
  let vw = 0, vh = 0, trackW = 0, amp = 0, maxR = 0, ticking = false;

  const clamp01 = v => Math.max(0, Math.min(1, v));
  const easeInOut = t => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

  function measure() {
    vw = window.innerWidth;
    vh = window.innerHeight;
    trackW = track.scrollWidth;
    amp = parseFloat(getComputedStyle(track).fontSize) * 0.32;
    maxR = Math.hypot(vw, vh) / 2 + 4;
    items.forEach(it => { it.cx = it.el.offsetLeft + it.el.offsetWidth / 2; });
    // wave chars sit inside .wave-word, whose offsetParent is still the
    // (absolutely positioned) track, so offsetLeft is track-relative
    const travelScroll = (trackW + vw) / travelSpeed();
    const pinRange = travelScroll / (TRAVEL_END - TRAVEL_START);
    section.style.height = `${pinRange + vh}px`;
    update();
  }

  function update() {
    ticking = false;
    const r = section.getBoundingClientRect();
    const q = clamp01(-r.top / (r.height - vh));

    const grow = easeInOut(clamp01(q / GROW_END));
    const shrink = easeInOut(clamp01((q - SHRINK_START) / (1 - SHRINK_START)));
    sticky.style.setProperty('--wave-r', `${(maxR * grow * (1 - shrink)).toFixed(1)}px`);

    const p = clamp01((q - TRAVEL_START) / (TRAVEL_END - TRAVEL_START));
    const x = -trackW + p * (trackW + vw);
    track.style.transform = `translate3d(${x.toFixed(1)}px, 0, 0)`;

    const k = (Math.PI * 2 * WAVES_PER_SCREEN) / vw;
    items.forEach(it => {
      const sx = x + it.cx;
      if (sx < -200 || sx > vw + 200) return;
      const y = amp * Math.sin(sx * k);
      const rot = Math.atan(amp * k * Math.cos(sx * k)) * 180 / Math.PI;
      it.el.style.transform = `translateY(${y.toFixed(1)}px) rotate(${rot.toFixed(2)}deg)`;
    });
  }

  window.addEventListener('scroll', () => {
    if (!ticking) { ticking = true; requestAnimationFrame(update); }
  }, { passive: true });

  let resizeTimer;
  window.addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(measure, 120);
  });
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(measure);
  measure();
})();

// ===========================
// PROCESS — GLASS WINDOWS
// ===========================
// .pwin is authored at the Figma window's native 560px width; zoom it to
// fill its column, and replay its Figma motion each time it scrolls in.
(function () {
  const frames = document.querySelectorAll('.pwin-frame');
  if (!frames.length) return;

  const fit = () => frames.forEach(f => {
    const win = f.querySelector('.pwin');
    if (win) win.style.zoom = (f.clientWidth / 560).toFixed(4);
  });
  if ('ResizeObserver' in window) {
    const ro = new ResizeObserver(fit);
    frames.forEach(f => ro.observe(f));
  } else {
    window.addEventListener('resize', fit);
  }
  fit();

  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const io = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      const win = entry.target.querySelector('.pwin');
      if (!win) return;
      if (entry.isIntersecting) {
        win.classList.remove('is-playing');
        void win.offsetWidth; // restart the CSS animation
        win.classList.add('is-playing');
      }
    });
  }, { threshold: 0.6 });
  frames.forEach(f => io.observe(f));
})();

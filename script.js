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
      glowColor:    '#0d1020',
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
      <stop offset="0%" stop-color="${o.glowColor}"/>
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

navToggle.addEventListener('click', () => {
  navLinks.classList.toggle('open');
  navToggle.classList.toggle('active');
});

navLinks.querySelectorAll('a').forEach(link => {
  link.addEventListener('click', () => {
    navLinks.classList.remove('open');
    navToggle.classList.remove('active');
  });
});

// ===========================
// REVEAL ON SCROLL
// ===========================
const revealEls = document.querySelectorAll(
  '.process-row, .portfolio-card, .about-grid, .contact-wrapper, .section-header'
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
    a.style.color = a.getAttribute('href') === `#${current}` ? '#fff' : '';
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
(function () {
  const field = document.getElementById('magnetField');
  const dominant = document.getElementById('magnetDominant');
  if (!field || !dominant) return;

  const bubbles = Array.from(field.querySelectorAll('.magnet-bubble:not(.magnet-bubble--dominant)'));
  const bubbleState = bubbles.map(el => ({ el, homeX: 0, homeY: 0, dx: 0, dy: 0 }));

  const REPEL_RADIUS = 340;
  const REPEL_STRENGTH = 260;
  const MIN_DIR_DIST = 10;
  const BUBBLE_EASE = 0.15;
  const DOM_EASE = 0.08;
  // idle rest position (no pointer yet / pointer left): below the centered
  // heading rather than dead-center, so the dominant bubble doesn't sit on
  // top of the heading text at rest
  const IDLE_Y_RATIO = 0.70;

  let rect = { w: 0, h: 0, left: 0, top: 0 };
  let target = { x: 0, y: 0 };
  let domPos = { x: 0, y: 0 };
  let rawPointer = { x: 0, y: 0 };
  let pointerActive = false;
  let measured = false;
  let resizeTimer;

  function measure() {
    const r = field.getBoundingClientRect();
    rect = { w: r.width, h: r.height, left: r.left, top: r.top };
    bubbleState.forEach(b => {
      b.homeX = b.el.offsetLeft + b.el.offsetWidth / 2;
      b.homeY = b.el.offsetTop + b.el.offsetHeight / 2;
    });
    if (!measured) {
      domPos.x = target.x = rect.w / 2;
      domPos.y = target.y = rect.h * IDLE_Y_RATIO;
      measured = true;
    } else if (!pointerActive) {
      target.x = rect.w / 2;
      target.y = rect.h * IDLE_Y_RATIO;
    }
  }

  function updatePointer(clientX, clientY) {
    rawPointer.x = clientX;
    rawPointer.y = clientY;
    pointerActive = true;
  }

  window.addEventListener('mousemove', (e) => updatePointer(e.clientX, e.clientY), { passive: true });
  field.addEventListener('touchmove', (e) => {
    const t = e.touches[0];
    if (t) updatePointer(t.clientX, t.clientY);
  }, { passive: true });

  function tick() {
    const r = field.getBoundingClientRect();
    rect = { w: r.width, h: r.height, left: r.left, top: r.top };

    if (pointerActive) {
      let x = rawPointer.x - rect.left;
      let y = rawPointer.y - rect.top;
      x = Math.max(0, Math.min(rect.w, x));
      y = Math.max(0, Math.min(rect.h, y));
      target.x = x;
      target.y = y;
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
        // dominant sits ~on top of the bubble's home: fall back to a stable
        // direction (away from the field center) instead of a jittery one
        vx = b.homeX - rect.w / 2 || 1;
        vy = b.homeY - rect.h / 2 || 1;
        dist = Math.sqrt(vx * vx + vy * vy) || 1;
      }
      let tx = 0, ty = 0;
      if (dist < REPEL_RADIUS) {
        const t = 1 - dist / REPEL_RADIUS;
        const push = t * t * REPEL_STRENGTH;
        tx = (vx / dist) * push;
        ty = (vy / dist) * push;
      }
      b.dx += (tx - b.dx) * BUBBLE_EASE;
      b.dy += (ty - b.dy) * BUBBLE_EASE;
      b.el.style.setProperty('--dx', b.dx.toFixed(2) + 'px');
      b.el.style.setProperty('--dy', b.dy.toFixed(2) + 'px');
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
// MOTION — MAGNETIC BUTTONS
// ===========================
// CTAs lean toward the cursor while hovered. Uses the standalone `translate`
// property so it never fights the existing :hover `transform` on .btn.
(function () {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  if (!window.matchMedia('(hover: hover) and (pointer: fine)').matches) return;

  const STRENGTH = 0.3;
  const EASE = 0.18;
  const items = Array.from(document.querySelectorAll('.btn, .nav-cta')).map(el => ({
    el, x: 0, y: 0, tx: 0, ty: 0,
  }));
  if (!items.length) return;

  items.forEach(item => {
    item.el.addEventListener('mousemove', (e) => {
      const r = item.el.getBoundingClientRect();
      item.tx = (e.clientX - (r.left + r.width / 2)) * STRENGTH;
      item.ty = (e.clientY - (r.top + r.height / 2)) * STRENGTH;
    });
    item.el.addEventListener('mouseleave', () => { item.tx = 0; item.ty = 0; });
  });

  function tick() {
    items.forEach(item => {
      item.x += (item.tx - item.x) * EASE;
      item.y += (item.ty - item.y) * EASE;
      if (Math.abs(item.x) < 0.05 && Math.abs(item.y) < 0.05 && !item.tx && !item.ty) {
        if (item.el.style.translate) item.el.style.translate = '';
        return;
      }
      item.el.style.translate = `${item.x.toFixed(2)}px ${item.y.toFixed(2)}px`;
    });
    requestAnimationFrame(tick);
  }
  requestAnimationFrame(tick);
})();

// ===========================
// MOTION — PORTFOLIO SPOTLIGHT
// ===========================
(function () {
  const cards = document.querySelectorAll('.portfolio-card');
  cards.forEach(card => {
    card.addEventListener('mousemove', (e) => {
      const r = card.getBoundingClientRect();
      card.style.setProperty('--px', (e.clientX - r.left) + 'px');
      card.style.setProperty('--py', (e.clientY - r.top) + 'px');
    });
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

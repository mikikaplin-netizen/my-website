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
      gradientFrom: 'rgba(100, 193, 210, 0.28)',
      gradientTo:   'rgba(28, 211, 28, 0.12)',
      glowColor:    '#0d1020',
    }, opts);

    container.style.cssText = 'position:absolute;inset:0;overflow:hidden;';

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
  '.process-row, .portfolio-card, .about-grid, .contact-wrapper, .section-header, .magnet-field'
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

  const REPEL_RADIUS = 260;
  const REPEL_STRENGTH = 170;
  const MIN_DIR_DIST = 10;
  const BUBBLE_EASE = 0.15;
  const DOM_EASE = 0.08;

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
      domPos.y = target.y = rect.h / 2;
      measured = true;
    } else if (!pointerActive) {
      target.x = rect.w / 2;
      target.y = rect.h / 2;
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

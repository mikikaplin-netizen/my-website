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
}, { passive: true });

// The bar is always laid out as the condensed island; the wide state at the
// top is a transform. On load and resize only (never per scroll frame),
// briefly apply the old wide layout (.nav-measure), read where the logo and
// links sit there, then read them in the island and store the difference.
(function () {
  const box = navbar && navbar.querySelector('.nav-container');
  const logo = box && box.querySelector('.nav-logo');
  const links = box && box.querySelector('.nav-links');
  if (!logo || !links) return;
  const measure = () => {
    navbar.classList.add('nav-measure');
    const wl = logo.getBoundingClientRect(), wn = links.getBoundingClientRect();
    navbar.classList.remove('nav-measure');
    const il = logo.getBoundingClientRect(), inn = links.getBoundingClientRect();
    // getBoundingClientRect includes any current transform; undo it via offset math
    const st = (el, r) => {
      const m = new DOMMatrixReadOnly(getComputedStyle(el).transform);
      return { left: r.left - m.e, top: r.top - m.f, width: r.width / (m.a || 1) };
    };
    const l = st(logo, il), n = st(links, inn);
    const set = (k, v) => box.style.setProperty(k, v);
    set('--nav-logo-dx', (wl.left - l.left).toFixed(1) + 'px');
    set('--nav-logo-dy', (wl.top - l.top).toFixed(1) + 'px');
    set('--nav-logo-s', (wl.width / l.width).toFixed(4));
    set('--nav-links-dx', (wn.left - n.left).toFixed(1) + 'px');
    set('--nav-links-dy', (wn.top - n.top).toFixed(1) + 'px');
  };
  measure();
  window.addEventListener('resize', measure);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(measure);
})();

// ===========================
// NAVBAR — HOVER BUBBLE
// ===========================
// One pill behind the nav items. Entering an item springs it to that item's
// box (Apple spring: damping 1, response 0.3s, real frame time, re-targets
// from its live position); leaving the menu fades it out where it is.
// Coming back after it faded, it appears on the item instead of sliding in
// from the old one. Mouse/trackpad only.
(function () {
  const list = document.querySelector('.nav-links');
  if (!list || !window.matchMedia('(hover: hover) and (pointer: fine)').matches) return;
  const pill = document.createElement('span');
  pill.className = 'nav-pill';
  pill.setAttribute('aria-hidden', 'true');
  list.prepend(pill);
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const RESPONSE = 0.3, K = Math.pow(2 * Math.PI / RESPONSE, 2), C = 4 * Math.PI / RESPONSE;
  let x = 0, w = 0, vx = 0, vw = 0, tx = 0, tw = 0, raf = 0, last = 0, shown = false;

  const paint = () => {
    pill.style.transform = `translateX(${x.toFixed(2)}px)`;
    pill.style.width = `${w.toFixed(2)}px`;
  };
  const step = now => {
    const dt = Math.min((now - last) / 1000, 1 / 30); last = now;
    vx += (K * (tx - x) - C * vx) * dt; x += vx * dt;
    vw += (K * (tw - w) - C * vw) * dt; w += vw * dt;
    paint();
    if (Math.abs(tx - x) + Math.abs(tw - w) > 0.3 || Math.abs(vx) + Math.abs(vw) > 4) raf = requestAnimationFrame(step);
    else { x = tx; w = tw; vx = vw = 0; paint(); raf = 0; }
  };
  const goTo = a => {
    const lr = list.getBoundingClientRect(), r = a.getBoundingClientRect();
    tx = r.left - lr.left; tw = r.width;
    pill.style.top = `${r.top - lr.top}px`;
    pill.style.height = `${r.height}px`;
    if (!shown || reduce) { x = tx; w = tw; vx = vw = 0; paint(); }
    else if (!raf) { last = performance.now(); raf = requestAnimationFrame(step); }
    shown = true;
    pill.classList.add('is-on');
  };
  list.querySelectorAll('a').forEach(a => a.addEventListener('pointerenter', () => goTo(a)));
  list.addEventListener('pointerleave', () => { pill.classList.remove('is-on'); shown = false; });
})();

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
  '.process-row, .work-row, .about-grid, .contact-wrapper, .section-header, .clients-marquee, .faq-chat, .craft-card'
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
// Validates inline (Apple: feedback during the interaction, not only at the
// end): a field is judged once it has been left, then live while it's being
// corrected. Submit shows status (sending) and completion (sent).
const contactForm = document.getElementById('contactForm');
if (contactForm) {
  const RULES = {
    name:    v => v.trim().length >= 2 || 'איך לפנות אליך? (לפחות 2 תווים)',
    email:   v => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v.trim()) || 'נראה שחסר משהו בכתובת האימייל',
    phone:   v => !v.trim() || v.replace(/\D/g, '').length >= 9 || 'מספר הטלפון קצר מדי',
    message: v => v.trim().length >= 10 || 'עוד כמה מילים על הפרויקט (לפחות 10 תווים)',
  };
  const fields = Object.keys(RULES)
    .map(name => contactForm.elements[name])
    .filter(Boolean);

  fields.forEach(field => {
    const err = document.createElement('span');
    err.className = 'form-error';
    err.id = field.id + '-error';
    err.setAttribute('aria-live', 'polite');
    field.parentElement.appendChild(err);
    field.setAttribute('aria-describedby', err.id);
  });

  function check(field) {
    const group = field.parentElement;
    const res = RULES[field.name](field.value);
    const ok = res === true;
    const empty = !field.value.trim();
    group.classList.toggle('is-invalid', !ok);
    // optional + empty is fine but doesn't earn a checkmark
    group.classList.toggle('is-valid', ok && !empty);
    field.setAttribute('aria-invalid', String(!ok));
    group.querySelector('.form-error').textContent = ok ? '' : res;
    return ok;
  }

  fields.forEach(field => {
    field.addEventListener('blur', () => {
      if (field.value.trim() || field.dataset.touched) { field.dataset.touched = '1'; check(field); }
    });
    field.addEventListener('input', () => { if (field.dataset.touched) check(field); });
  });

  contactForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const btn = contactForm.querySelector('button[type="submit"]');
    let firstBad = null;
    fields.forEach(field => {
      field.dataset.touched = '1';
      if (!check(field) && !firstBad) firstBad = field;
    });
    if (firstBad) {
      const group = firstBad.parentElement;
      group.classList.remove('shake');
      void group.offsetWidth; // restart the animation
      group.classList.add('shake');
      firstBad.focus();
      return;
    }

    const orig = btn.textContent;
    btn.classList.add('is-sending');
    btn.textContent = 'שולח';
    setTimeout(() => {
      btn.classList.remove('is-sending');
      btn.classList.add('is-sent');
      btn.textContent = 'ההודעה נשלחה ✓';
      contactForm.classList.add('is-sent');
      setTimeout(() => {
        btn.classList.remove('is-sent');
        btn.textContent = orig;
        contactForm.classList.remove('is-sent');
        contactForm.reset();
        fields.forEach(field => {
          delete field.dataset.touched;
          field.removeAttribute('aria-invalid');
          field.parentElement.classList.remove('is-valid', 'is-invalid');
        });
      }, 3000);
    }, 700);
  });

  contactForm.addEventListener('animationend', (e) => {
    if (e.animationName === 'fieldShake') e.target.classList.remove('shake');
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
// MOBILE TAB BAR — LIQUID DROP
// ===========================
// Highlights the section in view (same rule as the top nav). The glass drop
// behind the active item rides an Apple-style spring (damping ratio 1.0,
// response 0.35s — no overshoot, a tap carries no momentum), stepped with
// the real frame time so 60/120Hz screens move alike. It is interruptible:
// a new target re-aims it from its live position and velocity. While it
// travels it stretches with its speed, like a liquid bead. Feedback starts
// on touch-down: the item presses in and the drop heads there at once; if
// the touch turns into a scroll it heads back. Hidden while the WhatsApp
// sheet is open.
(function () {
  const bar = document.getElementById('tabbar');
  if (!bar) return;
  const items = Array.from(bar.querySelectorAll('a[href^="#"]'));
  const targets = items.map(a => document.querySelector(a.getAttribute('href')));
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // Apple spring params → physics: k = (2π/response)², c = 4π·ζ/response
  const RESPONSE = 0.35, ZETA = 1;
  const K = Math.pow(2 * Math.PI / RESPONSE, 2), C = 4 * Math.PI * ZETA / RESPONSE;

  let x = 0, w = 0, vx = 0, tx = 0, tw = 0, raf = 0, last = 0, placed = false;
  let active = -1, shown = -1, lockUntil = 0;

  const measure = i => {
    const b = bar.getBoundingClientRect(), r = items[i].getBoundingClientRect();
    return { x: r.left - b.left, w: r.width };
  };
  // write straight to the drop (not CSS vars on the bar, which would
  // restyle every child of the bar each frame)
  const drop = bar.querySelector('.tabbar-drop');
  const paint = stretch => {
    if (!drop) return;
    drop.style.width = w.toFixed(2) + 'px';
    drop.style.transform = `translateX(${x.toFixed(2)}px) scaleX(${stretch.toFixed(3)})`;
  };
  const step = now => {
    const dt = Math.min((now - last) / 1000, 1 / 30);   // real frame time, capped after a stall
    last = now;
    vx += (K * (tx - x) - C * vx) * dt;
    x += vx * dt;
    w += (tw - w) * Math.min(1, dt * 14);
    paint(1 + Math.min(Math.abs(vx) / 2600, 0.3));
    if (Math.abs(tx - x) > 0.3 || Math.abs(vx) > 4 || Math.abs(tw - w) > 0.3) raf = requestAnimationFrame(step);
    else { x = tx; w = tw; vx = 0; paint(1); raf = 0; }
  };
  const aim = i => {
    if (i < 0 || !items[i].offsetParent) return;
    shown = i;
    const m = measure(i);
    tx = m.x; tw = m.w;
    if (!placed || reduce) { x = tx; w = tw; vx = 0; placed = true; paint(1); return; }
    if (!raf) { last = performance.now(); raf = requestAnimationFrame(step); }
  };
  const setActive = i => {
    if (i === active && i === shown) return;
    active = i;
    items.forEach((a, k) => a.classList.toggle('is-active', k === i));
    bar.classList.toggle('has-active', i >= 0);
    aim(i);
  };

  const sectionInView = () => {
    // the reached section that starts lowest on the page (tab order is not
    // page order: projects come before About)
    let cur = -1, best = -Infinity;
    targets.forEach((t, i) => {
      if (!t) return;
      const top = t.getBoundingClientRect().top + window.scrollY;
      if (window.scrollY >= top - window.innerHeight * 0.4 && top > best) { best = top; cur = i; }
    });
    // contact is short and last: count it once the page bottom is reached
    if (window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 4) cur = items.length - 1;
    return cur;
  };
  const onScroll = () => { if (performance.now() >= lockUntil) setActive(sectionInView()); };
  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', () => { placed = false; aim(active); });

  items.forEach((a, i) => {
    // touch-down: press in and send the drop there right away
    a.addEventListener('pointerdown', () => {
      a.classList.add('is-pressed');
      bar.classList.add('has-active');
      aim(i);
    });
    // the touch became a scroll / left the item: undo, drop returns
    const release = () => a.classList.remove('is-pressed');
    a.addEventListener('pointercancel', () => { release(); aim(active); if (active < 0) bar.classList.remove('has-active'); });
    a.addEventListener('pointerleave', release);
    a.addEventListener('pointerup', release);
    // commit on release (the link's own click scrolls there)
    a.addEventListener('click', () => {
      setActive(i);
      lockUntil = performance.now() + 1200;     // ignore the smooth scroll's in-between sections
      clearTimeout(a._t); a._t = setTimeout(onScroll, 1250);
    });
  });
  onScroll();

  // step aside for the WhatsApp sheet
  const waPanel = document.getElementById('waPanel');
  if (waPanel && 'MutationObserver' in window) {
    new MutationObserver(() => bar.classList.toggle('is-hidden', waPanel.classList.contains('is-open')))
      .observe(waPanel, { attributes: true, attributeFilter: ['class'] });
  }
})();

// ===========================
// WHATSAPP FLOATING WIDGET
// ===========================
const waLauncher = document.getElementById('waLauncher');
const waPanel = document.getElementById('waPanel');
const waClose = document.getElementById('waClose');

// The panel grows out of the launcher and closes back into it (CSS). It can
// also be swiped down like an iOS sheet: it tracks the finger 1:1, resists
// being pulled up (rubber-band), and on release either springs home or is
// thrown away — decided by where its momentum would carry it, and the
// finger's velocity is handed to the spring so there's no seam.
if (waLauncher && waPanel) {
  const isOpen = () => waPanel.classList.contains('is-open');
  const openPanel = () => {
    waPanel.classList.add('is-open');
    waLauncher.classList.add('opened');
    waLauncher.setAttribute('aria-expanded', 'true');
  };
  const closePanel = () => {
    waPanel.classList.remove('is-open');
    waLauncher.setAttribute('aria-expanded', 'false');
  };
  waLauncher.setAttribute('aria-expanded', 'false');

  waLauncher.addEventListener('click', () => {
    if (isOpen()) closePanel();
    else openPanel();
  });

  if (waClose) {
    waClose.addEventListener('click', (e) => {
      e.stopPropagation();
      closePanel();
    });
  }

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && isOpen()) closePanel();
  });

  // --- delayed nudge ("WHATSAPP — DELAYED NUDGE") ---
  // The red badge isn't there on arrival. After ~25s of browsing, or as soon
  // as the testimonials / FAQ come into view (the end of the page), it pops
  // in, the launcher gives a small shake and a peek bubble with Michael's
  // greeting appears beside it (tap = open the chat, × = dismiss). Once per
  // visit (sessionStorage); after that the badge just sits there.
  (function () {
    const KEY = 'wa-nudged';
    let seen = false;
    try { seen = sessionStorage.getItem(KEY) === '1'; } catch (_) { /* storage blocked */ }
    if (seen) return;
    waLauncher.classList.add('is-waiting');

    const peek = document.createElement('button');
    peek.type = 'button';
    peek.className = 'wa-peek';
    peek.innerHTML = '<span><b>מיכאל קאפלין</b>היי, איך אני יכול לעזור?</span><span class="wa-peek-x" aria-label="סגירה" role="button">×</span>';
    waLauncher.before(peek);

    const hidePeek = () => peek.classList.remove('is-on');
    let fired = false, timer = 0, io = null, hideT = 0;
    const fire = () => {
      if (fired) return;
      fired = true;
      clearTimeout(timer);
      if (io) io.disconnect();
      try { sessionStorage.setItem(KEY, '1'); } catch (_) { /* storage blocked */ }
      waLauncher.classList.remove('is-waiting');
      if (isOpen()) return; // already chatting: no nudge needed
      waLauncher.classList.add('is-nudged');
      setTimeout(() => peek.classList.add('is-on'), 450);
      hideT = setTimeout(hidePeek, 12000);
    };

    peek.addEventListener('click', (e) => {
      hidePeek();
      clearTimeout(hideT);
      if (e.target.closest('.wa-peek-x')) return;
      openPanel();
    });
    waLauncher.addEventListener('click', () => { hidePeek(); fire(); });

    timer = setTimeout(fire, 25000);
    const ends = ['#testimonials', '#faq'].map(sel => document.querySelector(sel)).filter(Boolean);
    if (ends.length && 'IntersectionObserver' in window) {
      io = new IntersectionObserver((entries) => {
        if (entries.some(en => en.isIntersecting)) setTimeout(fire, 1200);
      }, { threshold: 0.25 });
      ends.forEach(el => io.observe(el));
    }
  })();

  // --- swipe down to dismiss ---
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  let offset = 0, velocity = 0, raf = 0;
  let drag = null; // { id, startY, startOffset, moved, history: [{y, t}] }

  const setOffset = (v) => { offset = v; waPanel.style.translate = v ? `0 ${v.toFixed(1)}px` : ''; };
  const rubberband = (over, dim, c = 0.55) => (over * dim * c) / (dim + c * Math.abs(over));
  // Apple's projection: where momentum would carry the panel if left alone
  const project = (v, d = 0.998) => (v / 1000) * d / (1 - d);

  function springTo(target, { response = 0.4, damping = 1, onDone } = {}) {
    cancelAnimationFrame(raf);
    const k = Math.pow(2 * Math.PI / response, 2);
    const c = 4 * Math.PI * damping / response;
    let last = performance.now();
    (function step(now) {
      const dt = Math.min((now - last) / 1000, 1 / 30);
      last = now;
      velocity += (k * (target - offset) - c * velocity) * dt;
      setOffset(offset + velocity * dt);
      if (Math.abs(target - offset) < 0.5 && Math.abs(velocity) < 5) {
        velocity = 0;
        setOffset(target);
        if (onDone) onDone();
        return;
      }
      raf = requestAnimationFrame(step);
    })(last);
  }

  waPanel.addEventListener('pointerdown', (e) => {
    if (!isOpen() || e.pointerType === 'mouse' || e.target.closest('a, button')) return;
    cancelAnimationFrame(raf); // grab it mid-flight: continue from where it is
    drag = { id: e.pointerId, startY: e.clientY, startOffset: offset, moved: false,
             history: [{ y: e.clientY, t: e.timeStamp }] };
  });

  waPanel.addEventListener('pointermove', (e) => {
    if (!drag || e.pointerId !== drag.id) return;
    const dy = e.clientY - drag.startY;
    if (!drag.moved) {
      if (Math.abs(dy) < 8) return; // small hysteresis before committing
      drag.moved = true;
      try { waPanel.setPointerCapture(e.pointerId); } catch (_) { /* pointer already gone */ }
      waPanel.classList.add('is-dragging');
    }
    const raw = drag.startOffset + dy;
    setOffset(raw >= 0 ? raw : rubberband(raw, waPanel.offsetHeight));
    drag.history.push({ y: e.clientY, t: e.timeStamp });
    if (drag.history.length > 6) drag.history.shift();
  });

  function endDrag(e) {
    if (!drag || e.pointerId !== drag.id) return;
    const d = drag;
    drag = null;
    if (!d.moved) return;
    waPanel.classList.remove('is-dragging');
    const h = d.history;
    const a = h[0], b = h[h.length - 1];
    velocity = b.t > a.t ? ((b.y - a.y) / (b.t - a.t)) * 1000 : 0; // px/s
    const height = waPanel.offsetHeight;
    const dismiss = offset > 0 && (offset + project(velocity) > height * 0.5 || velocity > 800);
    if (reduce) {
      if (dismiss) closePanel();
      setOffset(0); velocity = 0;
      return;
    }
    if (dismiss) {
      springTo(height + 60, { response: 0.3, damping: 1, onDone: () => {
        // already off-screen: close without replaying the shrink, then reset
        waPanel.classList.add('is-dragging');
        closePanel();
        setOffset(0);
        void waPanel.offsetWidth;
        waPanel.classList.remove('is-dragging');
      } });
    } else {
      // released with momentum → a little bounce on the way home
      springTo(0, { response: 0.35, damping: 0.8 });
    }
  }
  waPanel.addEventListener('pointerup', endDrag);
  waPanel.addEventListener('pointercancel', endDrag);
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

  // scatter the other-business icons randomly around the edges (never
  // over the centered heading) with varied size and a float rhythm each
  (function scatter() {
    const placed = [];
    const inHeading = (x, y) => x > 14 && x < 86 && y > 18 && y < 62;
    bubbles.forEach(el => {
      let x, y, tries = 0;
      do {
        x = 6 + Math.random() * 88;
        y = 8 + Math.random() * 84;
        tries++;
      } while (tries < 200 && (inHeading(x, y) ||
        placed.some(p => Math.hypot((p.x - x) * 1.6, p.y - y) < 17)));
      placed.push({ x, y });
      el.style.setProperty('--hx', x.toFixed(1) + '%');
      el.style.setProperty('--hy', y.toFixed(1) + '%');
      el.style.setProperty('--size', (0.8 + Math.random() * 0.45).toFixed(2));
      el.style.setProperty('--float-dur', (4 + Math.random() * 3).toFixed(2) + 's');
      el.style.setProperty('--float-delay', (-Math.random() * 6).toFixed(2) + 's');
      el.style.setProperty('--float-y', (6 + Math.random() * 8).toFixed(1) + 'px');
    });
  })();
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
// PORTFOLIO — HOVER-REVEAL LIST + LAPTOP STAND
// ===========================
// Hovering (or keyboard-focusing) a project row makes it active. On desktop
// a laptop stands still on a podium on the left and its screen cross-fades
// to the active project; a project with a screen recording plays it there
// (lazy-loaded on first activation, only while the section is on screen,
// never under reduced motion). Touch screens activate the mid-viewport row.
(function () {
  const work = document.querySelector('.work');
  const rows = document.querySelectorAll('.work-row');
  const items = document.querySelectorAll('.work-preview-item');
  if (!work || !rows.length) return;
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const stand = document.querySelector('.work-stand');
  let current = '0', inView = false;

  // the laptop photo is laid out at its own 1400px; scale it to the column
  const laptop = document.querySelector('.laptop');
  if (laptop) {
    new ResizeObserver(() => {
      laptop.style.setProperty('--lap-s', (laptop.clientWidth / 1400).toFixed(5));
    }).observe(laptop);
  }

  function syncVideos() {
    items.forEach(it => {
      const v = it.querySelector('video[data-src]');
      if (!v) return;
      const on = it.dataset.work === current && inView && !reduce &&
        stand && getComputedStyle(stand).display !== 'none';
      if (on) {
        if (!v.dataset.loaded) {
          v.dataset.loaded = '1';
          v.addEventListener('playing', () => it.classList.add('has-video'));
          // MP4 first (smaller); WebM only where H.264 can't play
          ['mp4', 'webm'].forEach(ext => {
            const s = document.createElement('source');
            s.src = v.dataset.src + '.' + ext;
            s.type = 'video/' + ext;
            v.appendChild(s);
          });
          v.load();
        }
        const p = v.play();
        if (p && p.catch) p.catch(() => {});
      } else if (!v.paused) {
        v.pause();
      }
    });
  }

  // split each name into letters for the hover roll (CSS .wn-ch / .wn-in);
  // the accessible name stays the full text via aria-label
  document.querySelectorAll('.work-name').forEach(name => {
    const text = name.textContent.trim();
    name.setAttribute('aria-label', text);
    name.textContent = '';
    let i = 0;
    text.split(' ').forEach((word, w) => {
      if (w) name.appendChild(document.createTextNode(' '));
      const ws = document.createElement('span');
      ws.className = 'wn-word';
      ws.setAttribute('aria-hidden', 'true');
      for (const ch of word) {
        const c = document.createElement('span');
        c.className = 'wn-ch';
        const inner = document.createElement('span');
        inner.className = 'wn-in';
        inner.style.setProperty('--i', i++);
        inner.textContent = ch;
        c.appendChild(inner);
        ws.appendChild(c);
      }
      name.appendChild(ws);
    });
  });

  function activate(i) {
    current = i;
    rows.forEach(r => r.classList.toggle('is-active', r.dataset.work === i));
    items.forEach(it => it.classList.toggle('is-active', it.dataset.work === i));
    syncVideos();
  }

  rows.forEach(row => {
    row.addEventListener('mouseenter', () => activate(row.dataset.work));
    row.addEventListener('focusin', () => activate(row.dataset.work));
  });

  new IntersectionObserver(entries => {
    inView = entries[0].isIntersecting;
    syncVideos();
  }).observe(work);

  // touch screens have no hover: the row crossing the middle of the
  // viewport becomes active instead
  if (!window.matchMedia('(hover: hover)').matches) {
    const io = new IntersectionObserver(entries => {
      entries.forEach(e => { if (e.isIntersecting) activate(e.target.dataset.work); });
    }, { rootMargin: '-45% 0px -45% 0px' });
    rows.forEach(r => io.observe(r));
  }
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

  // Depth: the photo turns gently toward the cursor and shifts with it, on
  // critically damped springs (no wobble — it follows, it isn't thrown).
  // Uses `transform` so it composes with the scroll parallax on `translate`.
  if (!window.matchMedia('(hover: hover) and (pointer: fine)').matches) return;
  const hero = document.querySelector('.hero');
  if (!hero) return;

  const RESPONSE = 0.55;
  const K = Math.pow(2 * Math.PI / RESPONSE, 2);
  const C = 4 * Math.PI * 1.0 / RESPONSE;
  const axes = { x: { v: 0, p: 0, t: 0 }, y: { v: 0, p: 0, t: 0 } };
  let running = false, last = 0;

  hero.addEventListener('mousemove', (e) => {
    const r = hero.getBoundingClientRect();
    axes.x.t = ((e.clientX - r.left) / r.width) * 2 - 1;   // -1 … 1
    axes.y.t = ((e.clientY - r.top) / r.height) * 2 - 1;
    wake();
  });
  hero.addEventListener('mouseleave', () => { axes.x.t = 0; axes.y.t = 0; wake(); });

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
    Object.values(axes).forEach(a => {
      a.v += (K * (a.t - a.p) - C * a.v) * dt;
      a.p += a.v * dt;
      if (Math.abs(a.t - a.p) > 0.001 || Math.abs(a.v) > 0.01) active = true;
    });
    const { x, y } = axes;
    photo.style.transform =
      `translate3d(${(x.p * 14).toFixed(2)}px, ${(y.p * 8).toFixed(2)}px, 0) ` +
      `rotateY(${(x.p * 7).toFixed(2)}deg) rotateX(${(-y.p * 4).toFixed(2)}deg)`;
    if (active) requestAnimationFrame(tick);
    else running = false;
  }
})();

// ===========================
// HERO — MOBILE TITLE FIT
// ===========================
// On phones the hero title fills half the screen height (Michael). How the
// words wrap depends on the width, so the size is searched, not fixed:
// binary search for the font size whose wrapped height is closest to 50% of
// the viewport. Re-fits on width changes only (the URL bar changes height).
(function () {
  const title = document.querySelector('.hero-title');
  if (!title) return;
  const mq = window.matchMedia('(max-width: 768px)');
  let lastW = 0;

  function fit() {
    if (!mq.matches) { title.style.fontSize = ''; lastW = 0; return; }
    const w = window.innerWidth;
    if (w === lastW) return;
    lastW = w;
    const target = window.innerHeight * 0.5;
    let lo = 28, hi = 140;
    for (let k = 0; k < 14; k++) {
      const mid = (lo + hi) / 2;
      title.style.fontSize = mid + 'px';
      // too big if it passes half the screen, or a no-wrap phrase overflows the width
      if (title.getBoundingClientRect().height > target || title.scrollWidth > title.clientWidth + 1) hi = mid; else lo = mid;
    }
    title.style.fontSize = lo.toFixed(1) + 'px';
  }

  fit();
  window.addEventListener('resize', fit);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => { lastW = 0; fit(); });
})();

// ===========================
// HERO — LIVE PORTRAIT
// ===========================
// A short clip of the hero photo blinking once, laid over the photo. It
// plays once, holds its last frame (= its first) for a random pause, then
// plays again, so blinks come every ~4.5-7.5s with no visible rhythm.
// Loaded only when the photo is shown (desktop) and never under reduced
// motion; paused while the hero is off screen.
(function () {
  const v = document.querySelector('.hero-live');
  if (!v || typeof v.play !== 'function') return;
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const wide = window.matchMedia('(min-width: 901px)');
  const hero = document.querySelector('.hero');
  let loaded = false, onScreen = true, timer = 0;

  function load() {
    if (loaded || !wide.matches) return;
    loaded = true;
    const src = v.dataset.src;
    [['webm', 'video/webm'], ['mp4', 'video/mp4']].forEach(([ext, type]) => {
      const s = document.createElement('source');
      s.src = `${src}.${ext}`;
      s.type = type;
      v.appendChild(s);
    });
    v.preload = 'auto';
    v.load();
    v.addEventListener('playing', () => v.classList.add('is-live'), { once: true });
    v.addEventListener('ended', () => {
      timer = setTimeout(() => { timer = 0; v.currentTime = 0; if (onScreen) v.play().catch(() => {}); },
        1500 + Math.random() * 3000);
    });
    if (onScreen) v.play().catch(() => {});
  }

  if (hero && 'IntersectionObserver' in window) {
    new IntersectionObserver(([e]) => {
      onScreen = e.isIntersecting;
      if (!loaded) { if (onScreen) load(); return; }
      if (!onScreen) v.pause();
      else if (!timer && !v.ended) v.play().catch(() => {});
    }).observe(hero);
  } else load();
  wide.addEventListener('change', () => { if (onScreen) load(); });
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
  const travelSpeed = () => (window.innerWidth < 768 ? 0.7 : 1.4);   // faster (Michael)
  // Timeline u = 0 → 1 from the moment the section's top enters the screen
  // until it unpins; the line is already a quarter of the way in at u = 0,
  // so there is never an empty screen before the words arrive.
  const LEAD = 0.25;                       // share of the screen filled at u = 0
  // the line stops while its tail still covers part of the screen, so the
  // pinned band never ends on an empty navy screen
  const TAIL = 0.4;
  let vw = 0, vh = 0, trackW = 0, amp = 0, ticking = false;

  const clamp01 = v => Math.max(0, Math.min(1, v));

  function measure() {
    vw = window.innerWidth;
    vh = window.innerHeight;
    trackW = track.scrollWidth;
    amp = parseFloat(getComputedStyle(track).fontSize) * 0.32;
    items.forEach(it => { it.cx = it.el.offsetLeft + it.el.offsetWidth / 2; });
    // wave chars sit inside .wave-word, whose offsetParent is still the
    // (absolutely positioned) track, so offsetLeft is track-relative
    // u runs over exactly the section's height of scroll (entry + pin)
    const travelScroll = (trackW + vw * (1 - LEAD - TAIL)) / travelSpeed();
    section.style.height = `${Math.max(vh * 1.2, travelScroll)}px`;
    update();
  }

  function update() {
    ticking = false;
    const r = section.getBoundingClientRect();
    const u = clamp01((vh - r.top) / r.height);
    const x = -trackW + vw * LEAD + u * (trackW + vw * (1 - LEAD - TAIL));
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
// ABOUT — COUNT-UP NUMBERS
// ===========================
// Each .stat-val counts from 0 to its data-count once the band is half in
// view: 1.6s, strong ease-out (fast start, soft landing), staggered 120ms.
// The markup already holds the final values (no JS / reduced motion).
(function () {
  const band = document.querySelector('.about-stats');
  if (!band || !('IntersectionObserver' in window)) return;
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const vals = Array.from(band.querySelectorAll('.stat-val[data-count]'));
  const DUR = 1600;
  const easeOut = t => 1 - Math.pow(1 - t, 4);
  vals.forEach(v => { v.textContent = '0'; });

  const run = () => {
    const t0 = performance.now();
    const tick = now => {
      let done = true;
      vals.forEach((v, i) => {
        const t = Math.min(1, Math.max(0, (now - t0 - i * 120) / DUR));
        if (t < 1) done = false;
        v.textContent = String(Math.round(easeOut(t) * Number(v.dataset.count)));
      });
      if (!done) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  };

  const io = new IntersectionObserver(entries => {
    if (entries.some(e => e.isIntersecting)) { io.disconnect(); run(); }
  }, { threshold: 0.5 });
  io.observe(band);
})();

// ===========================
// SITE END — CURTAIN FOOTER
// ===========================
// The footer sits sticky behind the page and is revealed as the page
// scrolls off it, but only when it fits the screen (a taller footer could
// never be seen whole); otherwise it just follows in the flow.
(function () {
  const end = document.querySelector('.site-end');
  if (!end) return;
  const fit = () => end.classList.toggle('is-curtain', end.offsetHeight <= window.innerHeight + 1);
  fit();
  window.addEventListener('resize', fit);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(fit);
})();

// The footer's wave video plays only while the footer is showing (and
// never under reduced motion, where its poster frame stays).
(function () {
  const v = document.querySelector('.site-end-waves');
  if (!v || typeof v.play !== 'function') return;
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  // the curtain footer is always "on screen" behind the page, so watch the
  // page's bottom edge instead: the footer shows once it rises above the fold
  const page = document.querySelector('main.page');
  let playing = false, ticking = false;
  const check = () => {
    ticking = false;
    const shown = !page || page.getBoundingClientRect().bottom < window.innerHeight + 200;
    if (shown && !playing) { playing = true; v.preload = 'auto'; v.play().catch(() => { playing = false; }); }
    else if (!shown && playing) { playing = false; v.pause(); }
  };
  window.addEventListener('scroll', () => { if (!ticking) { ticking = true; requestAnimationFrame(check); } }, { passive: true });
  check();
})();

// ===========================
// COLOR ZONES — PAGE THEME
// ===========================
// The section under the line 40% down the screen decides the page color:
// .tone-light → html.theme-light (grey page, navy text), anything else →
// dark. CSS crossfades the page-tone layer and the text colors.
(function () {
  const sections = Array.from(document.querySelectorAll('main.page > section'));
  if (!sections.some(s => s.classList.contains('tone-light'))) return;
  const root = document.documentElement;
  let ticking = false;
  const check = () => {
    ticking = false;
    const mid = window.innerHeight * 0.4;   // a bit above center, so short sections still win
    const cur = sections.find(s => { const r = s.getBoundingClientRect(); return r.top <= mid && r.bottom > mid; });
    root.classList.toggle('theme-light', !!cur && cur.classList.contains('tone-light'));
  };
  window.addEventListener('scroll', () => { if (!ticking) { ticking = true; requestAnimationFrame(check); } }, { passive: true });
  window.addEventListener('resize', check);
  // content that grows without scrolling (the FAQ chat) can change which
  // section is under the line
  if ('ResizeObserver' in window) new ResizeObserver(() => { if (!ticking) { ticking = true; requestAnimationFrame(check); } }).observe(document.body);
  check();
})();

// ===========================
// FAQ — CHAT
// ===========================
// The markup holds every Q/A pair as bubbles (no-JS fallback). Here the
// thread is cleared to a greeting and each question becomes a suggestion
// chip: tapping it posts the visitor's bubble, shows typing dots, then
// Michael's answer. The first exchange plays by itself the first time the
// chat scrolls into view. Reduced motion: no typing delay or pop.
(function () {
  const chat = document.querySelector('.faq-chat');
  const thread = chat && chat.querySelector('.faq-thread');
  const chips = chat && chat.querySelector('.faq-chips');
  if (!thread || !chips) return;
  const qs = Array.from(thread.querySelectorAll('.faq-msg--q'));
  const pairs = qs.map(q => ({ q: q.textContent.trim(), a: q.nextElementSibling ? q.nextElementSibling.textContent.trim() : '' }));
  if (!pairs.length) return;
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  let busy = false;

  // Michael's messages sit in a row with his avatar at the outer corner
  const withAvatar = el => {
    const row = document.createElement('div');
    row.className = 'faq-row';
    const img = document.createElement('img');
    img.className = 'faq-avatar';
    img.src = 'images/miki-hero.png';
    img.alt = '';
    img.width = img.height = 34;
    row.append(el, img);
    return row;
  };
  const bubble = (cls, text) => {
    const p = document.createElement('p');
    p.className = 'faq-msg ' + cls + (reduce ? '' : ' is-new');
    p.textContent = text;
    thread.appendChild(cls === 'faq-msg--a' ? withAvatar(p) : p);
    return p;
  };

  thread.textContent = '';
  bubble('faq-msg--a', 'היי, אלה השאלות שהכי שואלים אותי. בחרו שאלה ואענה כאן.');

  const ask = (i, btn) => {
    if (busy || btn.disabled) return;
    busy = true;
    btn.disabled = true;
    bubble('faq-msg--q', pairs[i].q);
    if (reduce) { bubble('faq-msg--a', pairs[i].a); busy = false; return; }
    const typing = document.createElement('div');
    typing.className = 'faq-typing';
    typing.setAttribute('aria-label', 'מיכאל מקליד');
    typing.innerHTML = '<i></i><i></i><i></i>';
    const typingRow = withAvatar(typing);
    setTimeout(() => thread.appendChild(typingRow), 250);
    setTimeout(() => { typingRow.remove(); bubble('faq-msg--a', pairs[i].a); busy = false; }, 1100);
  };

  const buttons = pairs.map((pair, i) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'faq-chip';
    b.textContent = pair.q;
    b.addEventListener('click', () => ask(i, b));
    chips.appendChild(b);
    return b;
  });

  // play the first exchange once, when the chat is first seen
  if ('IntersectionObserver' in window) {
    const io = new IntersectionObserver(entries => {
      if (entries.some(e => e.isIntersecting)) { io.disconnect(); setTimeout(() => ask(0, buttons[0]), 400); }
    }, { threshold: 0.5 });
    io.observe(chat);
  }
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
      if (!win || entry.target.closest('.is-stacked')) return; // deck replays its own front card
      if (entry.isIntersecting) {
        win.classList.remove('is-playing');
        void win.offsetWidth; // restart the CSS animation
        win.classList.add('is-playing');
      }
    });
  }, { threshold: 0.6 });
  frames.forEach(f => io.observe(f));
})();

// ===========================
// PROCESS — STACKED DECK
// ===========================
// All step rows overlap in one sticky stage. Scroll progress p runs 0 → N-1
// over (N-1) × STEP viewport heights. Window i rises from below over window
// i-1 (which sinks back slightly); text i cross-fades in place. Four lines
// under the stage fill with p. Only on screens tall enough for a row;
// otherwise the plain list stays.
(function () {
  const deck = document.querySelector('.process-rows');
  if (!deck) return;
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const rows = Array.from(deck.querySelectorAll(':scope > .process-row'));
  const N = rows.length;
  if (N < 2) return;
  const texts = rows.map(r => r.querySelector('.process-text'));
  const wins = rows.map(r => r.querySelector('.pwin-frame'));

  const STEP = 0.55;                       // viewport heights of scroll per step
  const stage = document.createElement('div');
  stage.className = 'process-stage';
  const layers = document.createElement('div');
  layers.className = 'process-stage-layers';
  const nav = document.createElement('div');
  nav.className = 'process-steps';
  const lines = rows.map((_, i) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.setAttribute('aria-label', 'שלב ' + (i + 1));
    b.appendChild(document.createElement('i'));
    b.addEventListener('click', () => {
      const top = deck.getBoundingClientRect().top + window.scrollY;
      window.scrollTo({ top: top + i * STEP * window.innerHeight + 2, behavior: 'smooth' });
    });
    nav.appendChild(b);
    return b;
  });
  // the lines live in a copy of the row grid so they sit in the text column
  const holder = document.createElement('div');
  holder.className = 'process-steps-holder';
  const col = document.createElement('div');
  col.className = 'process-steps-col';
  col.appendChild(nav);
  holder.appendChild(col);
  stage.append(layers);

  // the section title can ride in the stage (when there's room for it)
  const header = deck.parentElement && deck.parentElement.querySelector(':scope > .section-header');
  const headerOut = () => { if (header && header.parentElement === stage) deck.before(header); };

  let on = false, front = -1, ticking = false;
  const ease = t => t * t * (3 - 2 * t);
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));

  const enable = () => {
    rows.forEach((r, i) => { r.style.zIndex = i + 1; layers.appendChild(r); });
    layers.appendChild(holder);
    deck.appendChild(stage);
    deck.classList.add('is-stacked');
    on = true;
  };
  const disable = () => {
    rows.forEach(r => { r.style.zIndex = ''; r.classList.remove('is-front'); deck.appendChild(r); });
    [...texts, ...wins].forEach(el => { if (el) el.style.cssText = ''; });
    headerOut();
    stage.remove();
    deck.classList.remove('is-stacked');
    deck.style.height = '';
    deck.style.removeProperty('--deck-text-h');
    on = false; front = -1;
  };

  const fits = () => {
    if (!on) enable();
    // equal text heights so every window sits in the same spot (matters
    // when text stacks above the window on phones)
    deck.style.removeProperty('--deck-text-h');
    const th = Math.max(...texts.map(t => t.offsetHeight));
    deck.style.setProperty('--deck-text-h', th + 'px');
    const cs = getComputedStyle(stage);
    const room = stage.clientHeight - parseFloat(cs.paddingTop) - parseFloat(cs.paddingBottom);
    const tallest = Math.max(...rows.map(r => r.offsetHeight));
    if (header) {
      // first try with the title inside the stage, right above the steps
      stage.prepend(header);
      const hh = header.offsetHeight + parseFloat(getComputedStyle(header).marginBottom);
      if (tallest + hh <= room) return true;
      headerOut();
    }
    return tallest <= room;
  };

  const update = () => {
    ticking = false;
    if (!on) return;
    const vh = window.innerHeight;
    const p = clamp(-deck.getBoundingClientRect().top / (STEP * vh), 0, N - 1);
    rows.forEach((r, i) => {
      const d = i - p;                     // >0 upcoming, <0 already covered
      const win = wins[i], txt = texts[i];
      // window: rises over the previous one, then sinks back under the next
      if (win) {
        if (d >= 1) {
          win.style.visibility = 'hidden';
        } else if (d > 0) {
          const t = ease(d);
          win.style.visibility = '';
          win.style.transform = `translateY(${t * vh * 0.75}px) rotate(${t * 3}deg)`;
          win.style.opacity = String(clamp(1.6 - t * 1.6, 0, 1));
        } else {
          // covered: sink back and fade fast (the glass would show through)
          const k = Math.min(-d, 1);
          win.style.visibility = -d >= 0.75 ? 'hidden' : '';
          win.style.transform = `translateY(${-k * 18}px) scale(${1 - k * 0.06})`;
          win.style.opacity = String(clamp(1 - k * 1.4, 0, 1));
        }
      }
      // text: cross-fade in place with a small drift
      if (txt) {
        const a = clamp(1 - Math.abs(d) * 2.2, 0, 1);
        txt.style.opacity = String(a);
        txt.style.transform = `translateY(${clamp(d, -1, 1) * 24}px)`;
        txt.style.visibility = a === 0 ? 'hidden' : '';
      }
      lines[i].style.setProperty('--fill', clamp(p - i + 1, 0, 1).toFixed(3));
    });
    const f = Math.min(N - 1, Math.round(p));
    if (f !== front) {
      front = f;
      rows.forEach((r, i) => r.classList.toggle('is-front', i === f));
      lines.forEach((b, i) => b.classList.toggle('is-active', i === f));
      const pw = rows[f].querySelector('.pwin');
      if (pw) { pw.classList.remove('is-playing'); void pw.offsetWidth; pw.classList.add('is-playing'); }
    }
  };

  const layout = () => {
    if (fits()) {
      deck.style.height = `calc(100vh + ${(N - 1) * STEP * 100}vh)`;
      update();
    } else if (on) {
      disable();
    }
  };

  layout();
  window.addEventListener('scroll', () => { if (!ticking) { ticking = true; requestAnimationFrame(update); } }, { passive: true });
  let t;
  window.addEventListener('resize', () => { clearTimeout(t); t = setTimeout(layout, 150); });
})();

// ===========================
// TESTIMONIALS — VERTICAL COLUMNS
// ===========================
// Deal the cards round-robin into 1–3 columns (by width), repeat each
// column's set until it is taller than the window, then duplicate it so the
// CSS translateY(-50%) loop is seamless. Speeds differ slightly per column.
// Rebuilt only when the column count changes. Reduced motion / no JS: the
// cards stay in the plain CSS grid.
(function () {
  const wrap = document.querySelector('.tm-columns');
  if (!wrap) return;
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  const cards = Array.from(wrap.querySelectorAll('.tm-card'));
  const PX_PER_SEC = 28;
  const SPEED = [1, 0.8, 1.15];
  let count = 0;

  const build = () => {
    const w = wrap.clientWidth;
    const n = w >= 820 ? 3 : w >= 540 ? 2 : 1;
    if (n === count) return;
    count = n;
    wrap.textContent = '';
    wrap.classList.add('is-looping');
    wrap.style.gridTemplateColumns = `repeat(${n}, 1fr)`;
    const viewH = wrap.clientHeight;

    for (let c = 0; c < n; c++) {
      const col = document.createElement('div');
      col.className = 'tm-col';
      const track = document.createElement('div');
      track.className = 'tm-col-track';
      col.appendChild(track);
      wrap.appendChild(col);

      const set = cards.filter((_, i) => i % n === c);
      set.forEach(card => track.appendChild(card));
      // repeat the set until one copy fills the column
      let guard = 0;
      while (track.scrollHeight < viewH + 20 && guard++ < 6) {
        set.forEach(card => {
          const clone = card.cloneNode(true);
          clone.setAttribute('aria-hidden', 'true');
          track.appendChild(clone);
        });
      }
      // second copy for the seamless -50% loop
      Array.from(track.children).forEach(card => {
        const clone = card.cloneNode(true);
        clone.setAttribute('aria-hidden', 'true');
        track.appendChild(clone);
      });
      const dur = track.scrollHeight / 2 / (PX_PER_SEC * SPEED[c % SPEED.length]);
      track.style.setProperty('--tm-dur', dur.toFixed(1) + 's');
      if (c % 2) track.style.animationDelay = `-${(dur * 0.35).toFixed(1)}s`;
    }
  };

  build();
  let t;
  window.addEventListener('resize', () => { clearTimeout(t); t = setTimeout(build, 150); });
})();

// ===========================
// TESTIMONIALS — OPEN BIG
// ===========================
// Clicking a card (or Enter on it) opens a copy of it big in a modal; the
// columns pause underneath. Delegated, so the cloned cards in the loop work
// too. Closes on the backdrop, the × button or Escape, and gives focus back.
(function () {
  const wrap = document.querySelector('.tm-columns');
  if (!wrap) return;
  wrap.querySelectorAll('.tm-card:not([aria-hidden])').forEach(card => {
    card.tabIndex = 0;
    card.setAttribute('role', 'button');
    card.setAttribute('aria-haspopup', 'dialog');
  });

  let modal = null, opener = null;
  const close = () => {
    if (!modal) return;
    const m = modal;
    modal = null;
    m.classList.remove('is-open');
    wrap.classList.remove('is-paused');
    document.removeEventListener('keydown', onKey);
    setTimeout(() => m.remove(), 320);
    if (opener && !opener.hasAttribute('aria-hidden')) opener.focus({ preventScroll: true });
  };
  const onKey = (e) => { if (e.key === 'Escape') close(); };

  const open = (card) => {
    if (modal) return;
    opener = card;
    modal = document.createElement('div');
    modal.className = 'tm-modal';
    modal.setAttribute('role', 'dialog');
    modal.setAttribute('aria-modal', 'true');
    modal.setAttribute('aria-label', 'המלצה');
    const big = card.cloneNode(true);
    ['aria-hidden', 'tabindex', 'role', 'aria-haspopup'].forEach(a => big.removeAttribute(a));
    const x = document.createElement('button');
    x.type = 'button';
    x.className = 'tm-modal-close';
    x.setAttribute('aria-label', 'סגירה');
    x.textContent = '×';
    big.appendChild(x);
    modal.appendChild(big);
    document.body.appendChild(modal);
    wrap.classList.add('is-paused');
    modal.addEventListener('click', (e) => { if (e.target === modal || e.target === x) close(); });
    document.addEventListener('keydown', onKey);
    requestAnimationFrame(() => requestAnimationFrame(() => modal && modal.classList.add('is-open')));
    x.focus({ preventScroll: true });
  };

  wrap.addEventListener('click', (e) => {
    const card = e.target.closest('.tm-card');
    if (card) open(card);
  });
  wrap.addEventListener('keydown', (e) => {
    const card = e.target.closest('.tm-card');
    if (card && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); open(card); }
  });
})();

// ===========================
// CLIENTS — SCROLL-LINKED ROWS
// ===========================
// Each row slides sideways only as the page scrolls (direction and speed
// from data-dir / data-speed), centered when the section is mid-screen.
// The row doesn't follow the scroll 1:1: it eases toward its target every
// frame (a soft lerp), which is what makes the motion feel calm. Each track
// is cloned once so there is always logo beyond both edges. Reduced
// motion: CSS shows one static, wrapped row.
(function () {
  const section = document.querySelector('.clients');
  const rows = section ? Array.from(section.querySelectorAll('.cl-row')) : [];
  if (!rows.length || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  const state = rows.map(row => {
    const track = row.querySelector('.cl-track');
    Array.from(track.children).forEach(li => {
      const c = li.cloneNode(true);
      c.setAttribute('aria-hidden', 'true');
      track.appendChild(c);
    });
    return { track, dir: Number(row.dataset.dir) || 1, speed: Number(row.dataset.speed) || 0.3, x: null, base: 0 };
  });

  let raf = 0;
  const measure = () => state.forEach(s => { s.base = -(s.track.scrollWidth - window.innerWidth) / 2; });
  const target = s => {
    const r = section.getBoundingClientRect();
    const fromCenter = (r.top + r.height / 2) - window.innerHeight / 2;   // 0 when mid-screen
    const limit = (s.track.scrollWidth - window.innerWidth) / 2 - 40;
    return s.base + Math.max(-limit, Math.min(limit, -fromCenter * s.speed * s.dir));
  };
  const frame = () => {
    raf = 0;
    let moving = false;
    state.forEach(s => {
      const t = target(s);
      if (s.x === null) s.x = t;
      s.x += (t - s.x) * 0.08;                                  // ease after the scroll
      if (Math.abs(t - s.x) > 0.2) moving = true; else s.x = t;
      s.track.style.transform = `translate3d(${s.x.toFixed(2)}px, 0, 0)`;
    });
    if (moving) raf = requestAnimationFrame(frame);
  };
  const kick = () => { if (!raf) raf = requestAnimationFrame(frame); };

  measure();
  frame();
  window.addEventListener('scroll', kick, { passive: true });
  window.addEventListener('resize', () => { measure(); kick(); });
})();

// ===========================
// HERO — QUOTE ROTATOR (preview: ?quotes)
// ===========================
(function () {
  const slides = document.querySelectorAll('.pq-rotator .pq-slide');
  if (slides.length < 2 || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  let i = 0;
  setInterval(() => {
    if (document.hidden) return;
    slides[i].classList.remove('is-on');
    i = (i + 1) % slides.length;
    slides[i].classList.add('is-on');
  }, 4500);
})();

// ===========================
// HERO — SHOWCASE CAROUSEL (preview: ?hero2)
// ===========================
(function () {
  const box = document.querySelector('.hero-showcase');
  if (!box || !document.documentElement.classList.contains('show-hero2')) return;
  const shots = box.querySelectorAll('.hs-shot');
  const bars = box.querySelectorAll('.hs-bars i');
  const name = box.querySelector('.hs-name');
  const MS = 3600;
  box.style.setProperty('--hs-ms', MS + 'ms');
  let i = 0;
  const show = k => {
    shots.forEach((s, n) => s.classList.toggle('is-on', n === k));
    bars.forEach((b, n) => { b.classList.toggle('done', n < k); b.classList.remove('on'); });
    void bars[k].offsetWidth; bars[k].classList.add('on');
    name.textContent = shots[k].dataset.name;
  };
  show(0);
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  setInterval(() => { if (document.hidden) return; i = (i + 1) % shots.length; show(i); }, MS);
})();

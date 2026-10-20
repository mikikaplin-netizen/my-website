// ===========================
// CASE STUDY — SITE VIDEO
// ===========================
// The project's screen recording plays only while it's on screen, and
// never under reduced motion (the poster stays).
(function () {
  const video = document.querySelector('.case-video[data-autoplay]');
  if (!video) return;
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const io = new IntersectionObserver(entries => {
    entries.forEach(e => {
      if (e.isIntersecting) video.play().catch(() => {});
      else video.pause();
    });
  }, { threshold: 0.25 });
  io.observe(video);
})();

// ===========================
// CASE STUDY — FLOATING PROJECT SCREEN
// ===========================
// Hovering the next-project / other-project links shows that project's
// screen floating beside the cursor, eased toward it with a slight tilt
// from its horizontal velocity. Mouse only; not under reduced motion.
(function () {
  const section = document.querySelector('.case-next');
  const float = section && section.querySelector('.case-float');
  if (!float) return;
  if (!window.matchMedia('(hover: hover) and (pointer: fine)').matches) return;
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  const img = float.querySelector('img');
  let tx = 0, ty = 0, x = 0, y = 0, tilt = 0, running = false, shown = false, leftAt = 0;

  function target(e) {
    const r = section.getBoundingClientRect();
    tx = e.clientX - r.left - float.offsetWidth * 0.5;
    ty = e.clientY - r.top - float.offsetHeight - 24;   // just above the cursor
  }

  function tick() {
    const dx = tx - x;
    x += dx * 0.14;
    y += (ty - y) * 0.14;
    tilt += (Math.max(-10, Math.min(10, dx * 0.05)) - tilt) * 0.15;
    float.style.setProperty('--fx', x.toFixed(1) + 'px');
    float.style.setProperty('--fy', y.toFixed(1) + 'px');
    float.style.setProperty('--ft', tilt.toFixed(2) + 'deg');
    if (shown || Math.abs(dx) > 0.5) requestAnimationFrame(tick);
    else running = false;
  }

  section.querySelectorAll('[data-poster]').forEach(link => {
    link.addEventListener('mouseenter', (e) => {
      img.src = link.dataset.poster;
      target(e);
      // fresh entry: appear at the cursor; moving between links: glide
      if (!shown && performance.now() - leftAt > 250) { x = tx; y = ty; }
      shown = true;
      float.classList.add('is-on');
      if (!running) { running = true; requestAnimationFrame(tick); }
    });
    link.addEventListener('mousemove', target);
    link.addEventListener('mouseleave', () => { shown = false; leftAt = performance.now(); float.classList.remove('is-on'); });
  });
})();

// ===========================
// CASE STUDY — STORY LEAD WORD REVEAL
// ===========================
// Each block's opening sentence lights up word by word as it scrolls
// through the middle of the screen (same feel as the homepage statement).
(function () {
  const leads = Array.from(document.querySelectorAll('.case-block-lead'));
  if (!leads.length) return;
  const sets = leads.map(el => ({ el, words: Array.from(el.querySelectorAll('.cw')) }));
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    sets.forEach(s => s.words.forEach(w => w.classList.add('on')));
    return;
  }
  let ticking = false;
  function update() {
    ticking = false;
    const vh = window.innerHeight;
    sets.forEach(({ el, words }) => {
      const r = el.getBoundingClientRect();
      const start = vh * 0.85, end = vh * 0.4;
      const p = Math.max(0, Math.min(1, (start - r.top) / (start - end)));
      const n = Math.round(p * words.length);
      words.forEach((w, i) => w.classList.toggle('on', i < n));
    });
  }
  const kick = () => { if (!ticking) { ticking = true; requestAnimationFrame(update); } };
  window.addEventListener('scroll', kick, { passive: true });
  window.addEventListener('resize', kick, { passive: true });
  update();
})();

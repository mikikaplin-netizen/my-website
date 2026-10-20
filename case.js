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

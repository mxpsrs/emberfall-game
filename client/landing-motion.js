(() => {
  'use strict';
  const hero = document.querySelector('.hero');
  if (!hero) return;
  const preference = matchMedia('(prefers-reduced-motion: reduce)');
  const pointer = matchMedia('(hover: hover) and (pointer: fine)');
  const toggle = document.querySelector('.motion-toggle');
  let paused = preference.matches, frame = 0;
  const apply = () => {
    document.body.classList.toggle('effects-paused', paused);
    toggle.setAttribute('aria-pressed', String(paused));
    toggle.textContent = paused ? 'Enable effects' : 'Pause effects';
    if (paused) reset();
  };
  function reset() {
    cancelAnimationFrame(frame); frame = 0;
    hero.style.setProperty('--drift-x', '0px');
    hero.style.setProperty('--drift-y', '0px');
  }
  const particles = document.querySelector('.embers');
  for (let i = 0; i < 22; i++) {
    const ember = document.createElement('span');
    ember.style.cssText = `--x:${(i * 47 + 11) % 100}%;--duration:${11 + i % 8}s;--delay:-${i * 1.7}s;--sway:${(i % 2 ? 1 : -1) * (30 + i * 3)}px;--size:${i % 3 + 2}px`;
    particles.append(ember);
  }
  toggle.hidden = false;
  toggle.addEventListener('click', () => { paused = !paused; apply(); });
  preference.addEventListener('change', event => { paused = event.matches; apply(); });
  hero.addEventListener('pointermove', event => {
    if (paused || !pointer.matches || preference.matches) return;
    const box = hero.getBoundingClientRect();
    const x = (event.clientX - box.left) / box.width - .5;
    const y = (event.clientY - box.top) / box.height - .5;
    cancelAnimationFrame(frame);
    frame = requestAnimationFrame(() => {
      hero.style.setProperty('--drift-x', `${x * 18}px`);
      hero.style.setProperty('--drift-y', `${y * 12}px`);
      frame = 0;
    });
  }, { passive: true });
  hero.addEventListener('pointerleave', reset);
  document.addEventListener('visibilitychange', () => {
    document.body.classList.toggle('page-hidden', document.hidden);
    if (document.hidden) reset();
  });
  if ('IntersectionObserver' in window) {
    const ambient = new IntersectionObserver(entries => {
      document.body.classList.toggle('hero-offscreen', !entries[0].isIntersecting);
    });
    ambient.observe(hero);
    const reveal = new IntersectionObserver(entries => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        if (!paused) entry.target.classList.add('revealing');
        reveal.unobserve(entry.target);
      }
    }, { threshold: .15 });
    document.querySelectorAll('.section-heading, .features article, .begin').forEach((el, index) => {
      el.style.setProperty('--reveal-delay', `${el.matches('article') ? (index - 1) * 110 : 0}ms`);
      reveal.observe(el);
    });
  }
  apply();
})();

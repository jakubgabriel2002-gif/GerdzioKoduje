/**
 * Animacje w demach:
 *  - [data-anim]            → element „wjeżdża” przy przewijaniu (wariant: data-anim="left|right|zoom"),
 *  - [data-count="120"]     → liczba odlicza od 0 do wartości, gdy pojawi się na ekranie.
 * Przy prefers-reduced-motion wszystko jest od razu widoczne.
 */
const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

function countUp(el: HTMLElement) {
  const target = Number(el.dataset.count ?? '0');
  const suffix = el.dataset.suffix ?? '';
  if (reduce) { el.textContent = target + suffix; return; }
  const start = performance.now();
  const dur = 1400;
  const tick = (now: number) => {
    const p = Math.min(1, (now - start) / dur);
    const eased = 1 - Math.pow(1 - p, 3);
    el.textContent = Math.round(target * eased) + suffix;
    if (p < 1) requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
}

const animated = document.querySelectorAll<HTMLElement>('[data-anim]');
const counters = document.querySelectorAll<HTMLElement>('[data-count]');

if (reduce || !('IntersectionObserver' in window)) {
  animated.forEach((el) => el.classList.add('is-in'));
  counters.forEach((el) => (el.textContent = (el.dataset.count ?? '') + (el.dataset.suffix ?? '')));
} else {
  document.documentElement.classList.add('anim-ready');
  const io = new IntersectionObserver(
    (entries) => {
      for (const e of entries) {
        if (!e.isIntersecting) continue;
        const el = e.target as HTMLElement;
        if (el.hasAttribute('data-anim')) el.classList.add('is-in');
        if (el.hasAttribute('data-count')) countUp(el);
        io.unobserve(el);
      }
    },
    { rootMargin: '0px 0px -6% 0px', threshold: 0.1 },
  );
  animated.forEach((el) => {
    const sibs = el.parentElement ? Array.from(el.parentElement.children).filter((c) => c.hasAttribute('data-anim')) : [];
    const i = sibs.indexOf(el);
    if (!el.style.getPropertyValue('--anim-delay')) el.style.setProperty('--anim-delay', `${Math.max(0, Math.min(i, 5)) * 0.09}s`);
    io.observe(el);
  });
  counters.forEach((el) => {
    el.textContent = '0' + (el.dataset.suffix ?? '');
    io.observe(el);
  });
}

export {};

/**
 * „Wjeżdżanie” treści przy przewijaniu.
 *
 * 1) Przeglądarki z animacjami sterowanymi przewijaniem (CSS animation-timeline: view() — Chrome/Android, nowe Safari):
 *    kafelki wjeżdżają RAZEM z przewijaniem (na zmianę z lewej i prawej, z lekkim obrotem), a przy przewijaniu
 *    w górę cofają się. Ustawiamy tylko atrybut data-scrub, resztę robi CSS (global.css).
 * 2) Pozostałe: jednorazowe pojawienie się (IntersectionObserver, data-reveal).
 * Przy prefers-reduced-motion nic się nie animuje.
 */
const SELECTOR = [
  'main .section-head',
  'main .packages > li',
  'main .demos > li',
  'main .steps > li',
  'main .process-note',
  'main .about > *',
  'main .faq-wrap > *',
  'main .contact > *',
  'main .plans > li',
  'main .install > *',
  'main [data-reveal-auto]',
].join(',');

const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const scrub = !reduce && CSS.supports?.('animation-timeline: view()');

/** Kafelki w listach wjeżdżają na zmianę z boków; nagłówki sekcji i pojedyncze bloki — od dołu. */
const TILES = 'main .packages > li, main .demos > li, main .steps > li, main .plans > li, main .faq-wrap > *, main .about > *';

if (scrub) {
  document.querySelectorAll<HTMLElement>(SELECTOR).forEach((el) => {
    if (el.closest('.contact')) return; // formularz: bez przesuwania (przewijanie do ankiety liczy jego pozycję)
    if (el.matches(TILES)) {
      const sibs = el.parentElement ? Array.from(el.parentElement.children) : [];
      el.setAttribute('data-scrub', sibs.indexOf(el) % 2 ? 'right' : 'left');
    } else el.setAttribute('data-scrub', 'up');
  });
} else if (!reduce && 'IntersectionObserver' in window) {
  const io = new IntersectionObserver(
    (entries) => {
      for (const e of entries) {
        if (e.isIntersecting) {
          e.target.classList.add('is-in');
          io.unobserve(e.target);
        }
      }
    },
    { rootMargin: '0px 0px -8% 0px', threshold: 0.08 },
  );
  const vh = window.innerHeight;
  document.querySelectorAll<HTMLElement>(SELECTOR).forEach((el) => {
    if (el.getBoundingClientRect().top < vh * 0.92) return; // już na ekranie — bez animacji
    const siblings = el.parentElement ? Array.from(el.parentElement.children) : [];
    const i = siblings.indexOf(el);
    el.style.setProperty('--reveal-delay', `${Math.min(i, 4) * 0.08}s`);
    el.setAttribute('data-reveal', '');
    io.observe(el);
  });
}

export {};

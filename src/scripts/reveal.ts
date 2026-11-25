/**
 * Delikatne „wjeżdżanie” treści przy przewijaniu.
 * Elementy widoczne od razu nie są animowane (brak mrugnięcia przy wejściu),
 * a przy prefers-reduced-motion lub braku IntersectionObserver nic się nie dzieje.
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
  'main .apps > li',
  'main [data-reveal-auto]',
].join(',');

const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

if (!reduce && 'IntersectionObserver' in window) {
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

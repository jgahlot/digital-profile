(() => {
  'use strict';

  /* ---------- Tabs ---------- */
  const tabs = Array.from(document.querySelectorAll('.tab'));
  const panels = Array.from(document.querySelectorAll('.panel'));

  function activate(tab, setFocus = false) {
    const targetId = tab.getAttribute('aria-controls');

    tabs.forEach((t) => {
      const isActive = t === tab;
      t.classList.toggle('is-active', isActive);
      t.setAttribute('aria-selected', String(isActive));
      t.setAttribute('tabindex', isActive ? '0' : '-1');
    });

    panels.forEach((p) => {
      const isTarget = p.id === targetId;
      p.classList.toggle('is-active', isTarget);
      if (isTarget) {
        p.removeAttribute('hidden');
      } else {
        p.setAttribute('hidden', '');
      }
    });

    if (setFocus) tab.focus();

    // Scroll active tab into view in the horizontal nav (mobile)
    tab.scrollIntoView({ block: 'nearest', inline: 'center', behavior: 'smooth' });
  }

  tabs.forEach((tab, idx) => {
    tab.addEventListener('click', () => activate(tab));

    tab.addEventListener('keydown', (e) => {
      let nextIdx = null;
      switch (e.key) {
        case 'ArrowRight': nextIdx = (idx + 1) % tabs.length; break;
        case 'ArrowLeft':  nextIdx = (idx - 1 + tabs.length) % tabs.length; break;
        case 'Home':       nextIdx = 0; break;
        case 'End':        nextIdx = tabs.length - 1; break;
        default: return;
      }
      e.preventDefault();
      activate(tabs[nextIdx], true);
    });
  });

  /* ---------- Year ---------- */
  const yr = document.getElementById('year');
  if (yr) yr.textContent = String(new Date().getFullYear());

  /* ---------- Reveal-on-scroll for cards inside the active panel ---------- */
  if ('IntersectionObserver' in window && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.style.opacity = '1';
            entry.target.style.transform = 'translateY(0)';
            io.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.08 }
    );

    const animate = (el, delay) => {
      el.style.opacity = '0';
      el.style.transform = 'translateY(14px)';
      el.style.transition = `opacity .55s ease ${delay}ms, transform .55s ease ${delay}ms`;
      io.observe(el);
    };

    document.querySelectorAll('.tl-card, .skill-group, .stat, .project, .achv, .edu-card, .cert, .extras li')
      .forEach((el, i) => animate(el, Math.min(i * 35, 350)));
  }
})();

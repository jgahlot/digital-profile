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
      if (isTarget) p.removeAttribute('hidden'); else p.setAttribute('hidden', '');
    });

    if (setFocus) tab.focus();
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

  /* ---------- Lightbox (feedback images) ---------- */
  const lightbox = document.getElementById('lightbox');
  const lightboxImg = document.getElementById('lightbox-img');
  if (lightbox && lightboxImg) {
    const closeBtn = lightbox.querySelector('.lightbox__close');
    let lastFocused = null;

    const openLightbox = (src, alt) => {
      lastFocused = document.activeElement;
      lightboxImg.src = src;
      lightboxImg.alt = alt || '';
      lightbox.removeAttribute('hidden');
      document.body.style.overflow = 'hidden';
      if (closeBtn) closeBtn.focus();
    };

    const closeLightbox = () => {
      lightbox.setAttribute('hidden', '');
      lightboxImg.removeAttribute('src');
      lightboxImg.alt = '';
      document.body.style.overflow = '';
      if (lastFocused && typeof lastFocused.focus === 'function') {
        lastFocused.focus();
      }
      lastFocused = null;
    };

    document.querySelectorAll('.feedback-img').forEach((img) => {
      img.addEventListener('click', () => openLightbox(img.src, img.alt));
      img.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          openLightbox(img.src, img.alt);
        }
      });
    });

    lightbox.addEventListener('click', (e) => {
      if (e.target !== lightboxImg) closeLightbox();
    });
    if (closeBtn) closeBtn.addEventListener('click', closeLightbox);
    document.addEventListener('keydown', (e) => {
      if (lightbox.hasAttribute('hidden')) return;
      if (e.key === 'Escape') {
        closeLightbox();
      } else if (e.key === 'Tab' && closeBtn) {
        // Only one focusable element in the dialog — trap focus on it.
        e.preventDefault();
        closeBtn.focus();
      }
    });
  }

  /* ---------- Year ---------- */
  const yr = document.getElementById('year');
  if (yr) yr.textContent = String(new Date().getFullYear());

  /* ---------- Reveal-on-scroll ---------- */
  if ('IntersectionObserver' in window && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    const io = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.style.opacity = '1';
          entry.target.style.transform = 'translateY(0)';
          io.unobserve(entry.target);
        }
      });
    }, { threshold: 0.08 });

    const animate = (el, delay) => {
      el.style.opacity = '0';
      el.style.transform = 'translateY(14px)';
      el.style.transition = `opacity .55s ease ${delay}ms, transform .55s ease ${delay}ms`;
      io.observe(el);
    };

    document.querySelectorAll('.tl-card, .skill-group, .stat, .project, .achv, .feedback-card, .edu-card, .cert, .extras li')
      .forEach((el, i) => animate(el, Math.min(i * 35, 350)));
  }
})();

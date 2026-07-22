(() => {
  'use strict';

  const REVEAL_SELECTOR = '.tl-card, .skill-group, .stat, .project, .achv, .feedback-card, .edu-card, .cert, .extras li, .proj-card';

  /* ---------- Tabs ---------- */
  const tabs = Array.from(document.querySelectorAll('.tab'));
  const panels = Array.from(document.querySelectorAll('.panel'));
  let observePanel = null;

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
        if (observePanel) requestAnimationFrame(() => observePanel(p));
      } else {
        p.setAttribute('hidden', '');
      }
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

  /* ---------- Lightbox (profile + feedback images) ---------- */
  const lightbox = document.getElementById('lightbox');
  const lightboxImg = document.getElementById('lightbox-img');
  if (lightbox && lightboxImg) {
    const closeBtn = lightbox.querySelector('.lightbox__close');
    const lightboxTriggers = Array.from(document.querySelectorAll('.feedback-img, .js-lightbox-trigger'));
    let lastFocused = null;
    const isClickOutsideVisibleCircle = (event) => {
      if (!lightboxImg.classList.contains('lightbox__img--circle')) return false;

      const rect = lightboxImg.getBoundingClientRect();
      const radius = rect.width / 2;
      const centerX = rect.left + radius;
      const centerY = rect.top + rect.height / 2;
      return Math.hypot(event.clientX - centerX, event.clientY - centerY) > radius;
    };

    const openLightbox = (trigger) => {
      const src = trigger.dataset.lightboxSrc || trigger.currentSrc || trigger.src;
      const alt = trigger.dataset.lightboxAlt || trigger.alt || '';
      const shape = trigger.dataset.lightboxShape || '';
      if (!src) return;

      lastFocused = document.activeElement;
      lightboxImg.src = src;
      lightboxImg.alt = alt;
      lightboxImg.classList.toggle('lightbox__img--circle', shape === 'circle');
      lightbox.removeAttribute('hidden');
      document.body.style.overflow = 'hidden';
      if (closeBtn) closeBtn.focus();
    };

    const closeLightbox = () => {
      lightbox.setAttribute('hidden', '');
      lightboxImg.removeAttribute('src');
      lightboxImg.alt = '';
      lightboxImg.classList.remove('lightbox__img--circle');
      document.body.style.overflow = '';
      if (lastFocused && typeof lastFocused.focus === 'function') {
        lastFocused.focus();
      }
      lastFocused = null;
    };

    lightboxTriggers.forEach((trigger) => {
      trigger.setAttribute('tabindex', '0');
      trigger.setAttribute('role', 'button');
      if (!trigger.getAttribute('aria-label')) {
        trigger.setAttribute('aria-label', trigger.dataset.lightboxLabel || `Zoom ${trigger.alt || 'image'}`);
      }

      trigger.addEventListener('click', () => openLightbox(trigger));
      trigger.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          openLightbox(trigger);
        }
      });
    });

    lightbox.addEventListener('click', (e) => {
      if (e.target !== lightboxImg || isClickOutsideVisibleCircle(e)) closeLightbox();
    });
    if (closeBtn) closeBtn.addEventListener('click', closeLightbox);
    document.addEventListener('keydown', (e) => {
      if (lightbox.hasAttribute('hidden')) return;
      if (e.key === 'Escape') {
        closeLightbox();
      } else if (e.key === 'Tab' && closeBtn) {
        e.preventDefault();
        closeBtn.focus();
      }
    });
  }

  /* ---------- Year ---------- */
  const yr = document.getElementById('year');
  if (yr) yr.textContent = String(new Date().getFullYear());

  /* ---------- Reveal-on-scroll (active panel only) ---------- */
  if ('IntersectionObserver' in window && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    const io = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.dataset.revealed = 'true';
          entry.target.style.opacity = '1';
          entry.target.style.transform = 'translateY(0)';
          io.unobserve(entry.target);
        }
      });
    }, { threshold: 0.08 });

    const prepareReveal = (el, delay) => {
      if (el.dataset.revealed === 'true') return;
      el.style.opacity = '0';
      el.style.transform = 'translateY(14px)';
      el.style.transition = `opacity .55s ease ${delay}ms, transform .55s ease ${delay}ms`;
      io.observe(el);
    };

    observePanel = (panel) => {
      panel.querySelectorAll(REVEAL_SELECTOR).forEach((el, i) => {
        prepareReveal(el, Math.min(i * 35, 350));
      });
    };

    const activePanel = document.querySelector('.panel.is-active');
    if (activePanel) observePanel(activePanel);
  }
})();

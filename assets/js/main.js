/* Sindhu Corporation — main.js */
(function () {
  'use strict';

  // ============================================================
  // ENQUIRY BACKEND — paste your Google Apps Script Web App URL
  // below once you've deployed it (see admin/setup-instructions.html).
  // Until then, enquiries are still captured locally and shown to the
  // user, but they won't be mailed / logged to the Excel sheet.
  // ============================================================
  const ENQUIRY_WEBHOOK_URL = ''; // e.g. 'https://script.google.com/macros/s/AKfycb.../exec'
  // ============================================================

  // Mobile nav toggle
  const toggle = document.querySelector('.menu-toggle');
  const navLinks = document.querySelector('.nav-links');
  if (toggle && navLinks) {
    toggle.addEventListener('click', () => {
      navLinks.classList.toggle('open');
      toggle.setAttribute('aria-expanded', navLinks.classList.contains('open'));
    });
  }

  // Highlight nav link matching current page
  const path = window.location.pathname.split('/').pop() || 'index.html';
  document.querySelectorAll('.nav-links a').forEach(a => {
    const href = a.getAttribute('href');
    if (href && (href === path || (path === '' && href === 'index.html'))) {
      a.classList.add('active');
    }
  });

  // Project filter (on projects.html)
  const chips = document.querySelectorAll('.filter-chip');
  const cards = document.querySelectorAll('.project-card[data-status]');
  if (chips.length) {
    chips.forEach(chip => {
      chip.addEventListener('click', () => {
        chips.forEach(c => c.classList.remove('active'));
        chip.classList.add('active');
        const filter = chip.dataset.filter;
        cards.forEach(card => {
          const show = filter === 'all' || card.dataset.status === filter;
          card.style.display = show ? '' : 'none';
        });
      });
    });
  }

  // Fade-up on scroll
  const observer = ('IntersectionObserver' in window) ? new IntersectionObserver((entries) => {
    entries.forEach(e => {
      if (e.isIntersecting) {
        e.target.classList.add('in');
        observer.unobserve(e.target);
      }
    });
  }, { threshold: 0.12 }) : null;
  if (observer) {
    document.querySelectorAll('.fade-up').forEach(el => observer.observe(el));
  } else {
    document.querySelectorAll('.fade-up').forEach(el => el.classList.add('in'));
  }

  // Animated number counters
  const animateCounter = (el) => {
    const target = parseFloat(el.dataset.count);
    const suffix = el.dataset.suffix || '';
    const duration = 1400;
    const start = performance.now();
    function tick(now) {
      const t = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - t, 3);
      const val = target * eased;
      el.textContent = (target % 1 === 0 ? Math.round(val) : val.toFixed(1)) + suffix;
      if (t < 1) requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);
  };
  const counters = document.querySelectorAll('[data-count]');
  if (counters.length && 'IntersectionObserver' in window) {
    const counterObs = new IntersectionObserver((entries) => {
      entries.forEach(e => {
        if (e.isIntersecting) {
          animateCounter(e.target);
          counterObs.unobserve(e.target);
        }
      });
    }, { threshold: 0.4 });
    counters.forEach(c => counterObs.observe(c));
  }

  // Enquiry form handler: validates, POSTs to webhook (→ email + Excel log),
  // shows success UI, falls back gracefully if webhook is not configured.
  document.querySelectorAll('form[data-enquiry]').forEach(form => {
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const required = form.querySelectorAll('[required]');
      let ok = true;
      required.forEach(f => {
        if (!f.value.trim()) {
          f.style.borderColor = '#D14343';
          ok = false;
        } else {
          f.style.borderColor = '';
        }
      });
      if (!ok) return;

      const submitBtn = form.querySelector('button[type="submit"]');
      const originalBtnText = submitBtn ? submitBtn.textContent : '';
      if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.textContent = 'Sending…';
      }

      // Build payload
      const data = Object.fromEntries(new FormData(form).entries());
      data.submittedAt = new Date().toISOString();
      data.sourcePage = window.location.pathname.split('/').pop() || 'index.html';

      // Also keep a local copy (useful for the upcoming Sindhu app)
      try {
        const existing = JSON.parse(sessionStorage.getItem('sindhu_enquiries') || '[]');
        existing.push(data);
        sessionStorage.setItem('sindhu_enquiries', JSON.stringify(existing));
      } catch (err) { /* ignore */ }

      // POST to Google Apps Script webhook (email + Excel sheet logging)
      if (ENQUIRY_WEBHOOK_URL) {
        try {
          // Use text/plain to avoid CORS preflight with Apps Script
          await fetch(ENQUIRY_WEBHOOK_URL, {
            method: 'POST',
            mode: 'no-cors',
            headers: { 'Content-Type': 'text/plain;charset=utf-8' },
            body: JSON.stringify(data)
          });
        } catch (err) {
          console.warn('Webhook submission failed (enquiry saved locally):', err);
        }
      } else {
        console.info('Enquiry captured locally — configure ENQUIRY_WEBHOOK_URL in main.js to enable email + Excel logging.', data);
      }

      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.textContent = originalBtnText;
      }

      const success = form.querySelector('.form-success') || form.parentElement.querySelector('.form-success');
      if (success) {
        success.classList.add('show');
        form.reset();
        success.scrollIntoView({ behavior: 'smooth', block: 'center' });
      } else {
        alert('Thank you! Our team will reach out to you shortly.');
        form.reset();
      }
    });
  });

  // Mobile: let the Projects dropdown item toggle on click
  document.querySelectorAll('.has-dropdown > a').forEach(a => {
    a.addEventListener('click', (e) => {
      if (window.innerWidth <= 860) {
        e.preventDefault();
        a.parentElement.classList.toggle('open');
      }
    });
  });

  // Construction progress fill animation
  document.querySelectorAll('.progress-bar .fill').forEach(fill => {
    const target = fill.dataset.pct || '0';
    fill.style.width = '0%';
    if ('IntersectionObserver' in window) {
      const obs = new IntersectionObserver((entries) => {
        entries.forEach(e => {
          if (e.isIntersecting) {
            requestAnimationFrame(() => { fill.style.width = target + '%'; });
            obs.unobserve(e.target);
          }
        });
      }, { threshold: 0.3 });
      obs.observe(fill);
    } else {
      fill.style.width = target + '%';
    }
  });

  // Image gallery lightbox
  const galleryItems = document.querySelectorAll('.gallery-item[data-img]');
  if (galleryItems.length) {
    // Build the lightbox
    const lb = document.createElement('div');
    lb.className = 'lightbox';
    lb.innerHTML = `
      <button class="lightbox-close" aria-label="Close">×</button>
      <button class="lightbox-nav prev" aria-label="Previous">‹</button>
      <button class="lightbox-nav next" aria-label="Next">›</button>
      <div class="lightbox-frame">
        <img alt="">
        <div class="lightbox-meta"><span class="counter"></span><span class="caption"></span></div>
      </div>`;
    document.body.appendChild(lb);

    const imgEl = lb.querySelector('img');
    const counter = lb.querySelector('.counter');
    const captionEl = lb.querySelector('.caption');
    const items = Array.from(galleryItems).map(el => ({
      src: el.dataset.img,
      caption: el.dataset.caption || ''
    }));
    let idx = 0;
    const show = (i) => {
      idx = (i + items.length) % items.length;
      imgEl.src = items[idx].src;
      captionEl.textContent = items[idx].caption;
      counter.textContent = `${idx + 1} / ${items.length}`;
    };
    const open = (i) => { show(i); lb.classList.add('open'); document.body.style.overflow = 'hidden'; };
    const close = () => { lb.classList.remove('open'); document.body.style.overflow = ''; };

    galleryItems.forEach((el, i) => el.addEventListener('click', () => open(i)));
    lb.querySelector('.lightbox-close').addEventListener('click', close);
    lb.querySelector('.prev').addEventListener('click', (e) => { e.stopPropagation(); show(idx - 1); });
    lb.querySelector('.next').addEventListener('click', (e) => { e.stopPropagation(); show(idx + 1); });
    lb.addEventListener('click', (e) => { if (e.target === lb) close(); });
    document.addEventListener('keydown', (e) => {
      if (!lb.classList.contains('open')) return;
      if (e.key === 'Escape') close();
      if (e.key === 'ArrowLeft') show(idx - 1);
      if (e.key === 'ArrowRight') show(idx + 1);
    });
  }

  // Year in footer
  const year = document.querySelector('[data-year]');
  if (year) year.textContent = new Date().getFullYear();
})();

// Lazy-load and auto-play the muted demo loops only while they are on screen.
document.addEventListener('DOMContentLoaded', () => {
  const loops = document.querySelectorAll('video.autoloop');

  const load = (v) => {
    if (v.dataset.loaded) return;
    v.querySelectorAll('source[data-src]').forEach((s) => { s.src = s.dataset.src; });
    if (v.dataset.src) v.src = v.dataset.src;
    v.load();
    v.dataset.loaded = '1';
  };

  if ('IntersectionObserver' in window) {
    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        const v = e.target;
        if (e.isIntersecting) {
          load(v);
          const p = v.play();
          if (p && p.catch) p.catch(() => {});
        } else if (!v.paused) {
          v.pause();
        }
      });
    }, { rootMargin: '200px 0px', threshold: 0.05 });
    loops.forEach((v) => io.observe(v));
  } else {
    loops.forEach((v) => { load(v); v.play(); });
  }

  // Posters below the fold load only when they come near the screen.
  const posters = document.querySelectorAll('video[data-poster]');
  if ('IntersectionObserver' in window) {
    const pio = new IntersectionObserver((es) => es.forEach((e) => {
      if (e.isIntersecting) { e.target.poster = e.target.dataset.poster; pio.unobserve(e.target); }
    }), { rootMargin: '800px 0px' });
    posters.forEach((v) => pio.observe(v));
  } else {
    posters.forEach((v) => { v.poster = v.dataset.poster; });
  }

  // Close the mobile menu after tapping an in-page link.
  document.querySelectorAll('#siteNav .nav-link').forEach((a) => a.addEventListener('click', () => {
    if (window.bootstrap) window.bootstrap.Collapse.getOrCreateInstance('#siteNav', { toggle: false }).hide();
  }));

  // BibTeX copy button
  const copyBtn = document.getElementById('copy-bibtex');
  if (copyBtn) {
    copyBtn.addEventListener('click', () => {
      const txt = document.getElementById('bibtex').innerText;
      navigator.clipboard.writeText(txt).then(() => {
        copyBtn.innerText = 'Copied!';
        setTimeout(() => { copyBtn.innerText = 'Copy'; }, 1500);
      });
    });
  }
});

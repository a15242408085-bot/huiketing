(function () {
  'use strict';
  const FX = window.HKVisualFX || {};
  const payload = document.getElementById('hk-visual-data');
  if (!payload) return;
  let data;
  try { data = JSON.parse(payload.textContent); } catch (_) { return; }
  // Public placeholders share the single embedded bamboo image.
  function restoreSharedImage(item) {
    if (item && item.src === '@bamboo') item.src = data.bamboo;
    return item;
  }
  data.photos = Array.isArray(data.photos) ? data.photos.map(restoreSharedImage) : [];
  data.coast = restoreSharedImage(data.coast);
  let backgroundURL = '';
  try {
    const encoded = data.bamboo.split(',')[1], bytes = atob(encoded), array = new Uint8Array(bytes.length);
    for (let i = 0; i < bytes.length; i++) array[i] = bytes.charCodeAt(i);
    backgroundURL = URL.createObjectURL(new Blob([array], {type:'image/png'}));
    document.documentElement.style.setProperty('--hk-bamboo-image', 'url("' + backgroundURL + '")');
  } catch (_) { /* The static bamboo-colored theme remains readable. */ }
  let home = null, intro = null, grid = null, homeCleanup = [], introCleanup = null, gridCleanup = null, pending = 0;
  function cleanHome() { homeCleanup.forEach(function (fn) { try { fn(); } catch (_) {} }); homeCleanup = []; home = null; }
  function reconcile() {
    pending = 0;
    const nextHome = document.querySelector('.cover-page');
    if (nextHome !== home) {
      cleanHome(); home = nextHome;
      if (home) {
        const title = home.querySelector('.cover-hero__brand h1'), shell = home.closest('.app-shell');
        if (title && FX.mountSilk) { try { homeCleanup.push(FX.mountSilk(title)); } catch (_) {} }
        if (shell && FX.mountLandscape) { try { homeCleanup.push(FX.mountLandscape(shell)); } catch (_) {} }
      }
    }
    const onRegionPage = /^#\/visit\/?$/.test(location.hash);
    const nextIntro = onRegionPage ? document.querySelector('.flow-intro') : null;
    if (intro !== nextIntro) {
      if (introCleanup) introCleanup(); introCleanup = null; intro = nextIntro;
      if (intro && FX.mountContactSheet) { try { introCleanup = FX.mountContactSheet(intro, data.photos); } catch (_) {} }
    }
    const nextGrid = onRegionPage ? document.querySelector('.region-card-grid') : null;
    if (grid !== nextGrid) {
      if (gridCleanup) gridCleanup(); gridCleanup = null; grid = nextGrid;
      if (grid && FX.mountDepthCards) { try { gridCleanup = FX.mountDepthCards(grid, data.photos.concat(data.coast)); } catch (_) {} }
    }
  }
  function schedule() { if (!pending) pending = requestAnimationFrame(reconcile); }
  const root = document.getElementById('root') || document.body;
  const observer = new MutationObserver(schedule); observer.observe(root, {childList:true,subtree:true});
  window.addEventListener('hashchange', schedule);
  window.addEventListener('pagehide', function (event) {
    if (event.persisted) return;
    observer.disconnect(); cancelAnimationFrame(pending); cleanHome();
    if (introCleanup) introCleanup(); if (gridCleanup) gridCleanup();
    if (backgroundURL) URL.revokeObjectURL(backgroundURL);
  });
  schedule();
}());

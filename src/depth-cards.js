/* Photo-only parallax. Original region-card content and click targets are untouched. */
(function () {
  'use strict';

  const namespace = window.HKVisualFX = window.HKVisualFX || {};
  const mounts = new WeakMap();
  const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

  namespace.mountDepthCards = function mountDepthCards(container, items) {
    if (!container || typeof container.querySelectorAll !== 'function') return function () {};
    const photos = Array.isArray(items) ? items.filter(item => item && typeof item.src === 'string' && item.src) : [];
    const cards = Array.from(container.querySelectorAll('.region-card'));
    const previous = mounts.get(container);
    if (previous) {
      const sameCards = cards.length === previous.cards.length && cards.every((card, index) => card === previous.cards[index]);
      const samePhotos = photos.length === previous.sources.length && photos.every((item, index) => {
        const old = previous.sources[index];
        return item.src === old.src && item.theme === old.theme && item.role === old.role;
      });
      // A controller may reconcile in response to our own decorative DOM insertions.
      if (sameCards && samePhotos) return previous.cleanup;
      previous.cleanup();
    }
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
    const states = [];
    let disposed = false;
    let frame = 0;

    function render() {
      frame = 0;
      if (disposed) return;
      states.forEach(state => {
        if (!state.dirty) return;
        state.dirty = false;
        state.layer.style.setProperty('--hk-depth-x', state.x.toFixed(2) + 'px');
        state.layer.style.setProperty('--hk-depth-y', state.y.toFixed(2) + 'px');
        state.layer.style.setProperty('--hk-depth-light-x', state.lightX.toFixed(2) + '%');
        state.layer.style.setProperty('--hk-depth-light-y', state.lightY.toFixed(2) + '%');
        state.layer.style.setProperty('--hk-depth-light', String(state.light));
      });
    }

    function schedule() {
      if (!disposed && !frame) frame = window.requestAnimationFrame(render);
    }

    function reset(state) {
      state.x = 0;
      state.y = 0;
      state.lightX = 50;
      state.lightY = 50;
      state.light = 0;
      state.dirty = true;
      schedule();
    }

    function photoFor(card) {
      if (card.classList.contains('region-card--coast')) {
        return photos.find(item => item.role === 'coast_reference') ||
          photos.find(item => /海风|coast/i.test(String(item.theme || '')));
      }
      if (card.classList.contains('region-card--mountain')) {
        return photos.find(item => /山野|mountain/i.test(String(item.theme || '')));
      }
      return photos.find(item => /江南|jiangnan/i.test(String(item.theme || '')));
    }

    cards.forEach(card => {
      const item = photoFor(card);
      if (!item) return;

      const isStatic = card.classList.contains('region-card--coast') ||
        card.classList.contains('region-card--disabled') ||
        card.getAttribute('aria-disabled') === 'true' ||
        Boolean(card.querySelector('button:disabled, [disabled]'));
      const hadClass = card.classList.contains('hk-depth-card');
      const layer = document.createElement('div');
      layer.className = 'hk-depth-layer' + (isStatic ? ' hk-depth-layer--static' : '');
      layer.setAttribute('aria-hidden', 'true');
      // Hidden by default if this enhancement's CSS is unavailable or printing.
      layer.hidden = true;

      const image = document.createElement('img');
      image.className = 'hk-depth-image';
      image.alt = '';
      image.decoding = 'async';
      image.loading = 'lazy';
      image.draggable = false;
      image.setAttribute('aria-hidden', 'true');

      const shade = document.createElement('div');
      shade.className = 'hk-depth-shade';
      layer.append(image, shade);

      const state = {
        card, layer, image, hadClass,
        x: 0, y: 0, lightX: 50, lightY: 50, light: 0, dirty: false,
        onMove: null, onLeave: null, onError: null
      };

      state.onError = function () {
        layer.remove();
        if (!hadClass) card.classList.remove('hk-depth-card');
      };
      image.addEventListener('error', state.onError);
      card.classList.add('hk-depth-card');
      // All original children stay in their original order and retain their styles.
      card.insertBefore(layer, card.firstChild);
      image.src = item.src;

      if (!isStatic) {
        state.onMove = function (event) {
          if (disposed || reduced.matches || document.hidden || event.pointerType === 'touch') return;
          const rect = card.getBoundingClientRect();
          if (!rect.width || !rect.height) return;
          const x = clamp((event.clientX - rect.left) / rect.width, 0, 1);
          const y = clamp((event.clientY - rect.top) / rect.height, 0, 1);
          // Translate only the background image, never the article or its controls.
          state.x = (x - 0.5) * 12;
          state.y = (y - 0.5) * 12;
          state.lightX = x * 100;
          state.lightY = y * 100;
          state.light = 0.16;
          state.dirty = true;
          schedule();
        };
        state.onLeave = function () { reset(state); };
        card.addEventListener('pointermove', state.onMove, { passive: true });
        card.addEventListener('pointerleave', state.onLeave, { passive: true });
        card.addEventListener('pointercancel', state.onLeave, { passive: true });
      }
      states.push(state);
    });

    function onReducedChange() {
      states.forEach(reset);
    }

    function onVisibilityChange() {
      if (document.hidden) states.forEach(reset);
    }

    if (reduced.addEventListener) reduced.addEventListener('change', onReducedChange);
    else if (reduced.addListener) reduced.addListener(onReducedChange);
    document.addEventListener('visibilitychange', onVisibilityChange);

    function cleanup() {
      if (disposed) return;
      disposed = true;
      if (frame) window.cancelAnimationFrame(frame);
      frame = 0;
      if (reduced.removeEventListener) reduced.removeEventListener('change', onReducedChange);
      else if (reduced.removeListener) reduced.removeListener(onReducedChange);
      document.removeEventListener('visibilitychange', onVisibilityChange);
      states.forEach(state => {
        if (state.onMove) state.card.removeEventListener('pointermove', state.onMove);
        if (state.onLeave) {
          state.card.removeEventListener('pointerleave', state.onLeave);
          state.card.removeEventListener('pointercancel', state.onLeave);
        }
        state.image.removeEventListener('error', state.onError);
        state.layer.remove();
        if (!state.hadClass) state.card.classList.remove('hk-depth-card');
      });
      if (mounts.get(container)?.cleanup === cleanup) mounts.delete(container);
    }

    mounts.set(container, {
      cleanup,
      cards,
      sources: photos.map(item => ({ src: item.src, theme: item.theme, role: item.role }))
    });
    return cleanup;
  };
})();

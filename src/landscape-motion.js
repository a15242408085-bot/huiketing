/* Independent photographic depth motion. No React Bits source is included. */
(function registerLandscapeMotion() {
  'use strict';

  var modules = window.HKVisualFX = window.HKVisualFX || {};
  var mounted = new WeakMap();
  var clamp = function (value, min, max) { return Math.max(min, Math.min(max, value)); };

  modules.mountLandscape = function mountLandscape(shell) {
    if (!shell || !shell.isConnected || !shell.querySelector('.cover-page')) return function () {};
    if (mounted.has(shell)) mounted.get(shell)();

    var disposed = false;
    var ready = false;
    var raf = 0;
    var resizeRaf = 0;
    var lastPaint = -Infinity;
    var motionTime = 0;
    var lastTime = 0;
    var pointer = { x: 0, y: 0 };
    var camera = { x: 0, y: 0 };
    var priorMarker = shell.getAttribute('data-hk-landscape');
    var media = window.matchMedia('(prefers-reduced-motion: reduce)');
    var layer = document.createElement('div');
    var plane = document.createElement('div');
    var image = new Image();

    layer.className = 'hk-landscape-layer';
    layer.setAttribute('aria-hidden', 'true');
    plane.className = 'hk-landscape-plane';
    layer.appendChild(plane);

    function currentHome() {
      return !disposed && shell.isConnected && !!shell.querySelector('.cover-page');
    }

    function readBackground() {
      if (!currentHome()) return '';
      var style = window.getComputedStyle(shell);
      var background = style.backgroundImage;
      var match = /url\((?:"([^"]*)"|'([^']*)'|([^)]*))\)/.exec(background);
      if (!match || background === 'none') return '';
      plane.style.backgroundImage = background;
      plane.style.backgroundColor = style.backgroundColor;
      plane.style.backgroundSize = style.backgroundSize;
      plane.style.backgroundPosition = style.backgroundPosition;
      plane.style.backgroundRepeat = style.backgroundRepeat;
      return (match[1] || match[2] || match[3] || '').trim();
    }

    function cancelFrame() {
      if (raf) window.cancelAnimationFrame(raf);
      raf = 0;
      lastTime = 0;
      lastPaint = -Infinity;
    }

    function paintStill() {
      plane.style.transform = 'none';
    }

    function frame(now) {
      raf = 0;
      if (!currentHome()) {
        cleanup();
        return;
      }
      if (document.hidden || media.matches || !ready) {
        lastTime = 0;
        return;
      }
      if (!lastTime) lastTime = now;
      motionTime += Math.min(0.1, Math.max(0, now - lastTime) / 1000);
      lastTime = now;

      /* Keep paint updates at 30 fps or below; all movement stays on the background plane. */
      if (now - lastPaint >= 1000 / 30) {
        lastPaint = now;
        camera.x += (pointer.x - camera.x) * 0.055;
        camera.y += (pointer.y - camera.y) * 0.055;
        var compact = window.innerWidth <= 860;
        var reach = compact ? 2.2 : 6.5;
        var cycle = motionTime * Math.PI * 2 / 24;
        var scale = 1.065 + Math.sin(cycle) * 0.012;
        var x = camera.x * reach + Math.sin(cycle * 0.7) * (compact ? 0.6 : 1.5);
        var y = camera.y * reach * 0.55 + Math.cos(cycle * 0.8) * (compact ? 0.45 : 1.1);
        var rx = -camera.y * 0.16;
        var ry = camera.x * 0.24;
        plane.style.transform = 'perspective(1800px) translate3d(' + x.toFixed(3) + 'px,' +
          y.toFixed(3) + 'px,0) rotateX(' + rx.toFixed(4) + 'deg) rotateY(' +
          ry.toFixed(4) + 'deg) scale(' + scale.toFixed(5) + ')';
      }
      raf = window.requestAnimationFrame(frame);
    }

    function resume() {
      cancelFrame();
      if (!currentHome()) {
        cleanup();
        return;
      }
      if (media.matches) {
        paintStill();
        return;
      }
      if (!document.hidden && ready) raf = window.requestAnimationFrame(frame);
    }

    function onPointerMove(event) {
      if (media.matches || event.pointerType === 'touch') return;
      pointer.x = clamp(event.clientX / Math.max(1, window.innerWidth) * 2 - 1, -1, 1);
      pointer.y = clamp(event.clientY / Math.max(1, window.innerHeight) * 2 - 1, -1, 1);
    }

    function onPointerLeave() {
      pointer.x = 0;
      pointer.y = 0;
    }

    function onResize() {
      if (resizeRaf || disposed) return;
      resizeRaf = window.requestAnimationFrame(function () {
        resizeRaf = 0;
        if (!currentHome()) {
          cleanup();
          return;
        }
        readBackground();
        if (media.matches) paintStill();
      });
    }

    function activate() {
      if (!currentHome() || ready || !image.naturalWidth) return;
      ready = true;
      /* The original shell background is never removed: it is the loading/error fallback. */
      shell.setAttribute('data-hk-landscape', 'ready');
      shell.appendChild(layer);
      if (media.matches) paintStill();
      else plane.style.transform = 'scale(1.065)';
      shell.addEventListener('pointermove', onPointerMove, { passive: true });
      shell.addEventListener('pointerleave', onPointerLeave, { passive: true });
      document.addEventListener('visibilitychange', resume);
      window.addEventListener('resize', onResize, { passive: true });
      if (media.addEventListener) media.addEventListener('change', resume);
      else if (media.addListener) media.addListener(resume);
      resume();
    }

    function cleanup() {
      if (disposed) return;
      disposed = true;
      cancelFrame();
      if (resizeRaf) window.cancelAnimationFrame(resizeRaf);
      resizeRaf = 0;
      shell.removeEventListener('pointermove', onPointerMove);
      shell.removeEventListener('pointerleave', onPointerLeave);
      document.removeEventListener('visibilitychange', resume);
      window.removeEventListener('resize', onResize);
      if (media.removeEventListener) media.removeEventListener('change', resume);
      else if (media.removeListener) media.removeListener(resume);
      image.onload = null;
      image.onerror = null;
      layer.remove();
      if (priorMarker === null) shell.removeAttribute('data-hk-landscape');
      else shell.setAttribute('data-hk-landscape', priorMarker);
      if (mounted.get(shell) === cleanup) mounted.delete(shell);
    }

    var source = readBackground();
    if (!source) return function () {};
    mounted.set(shell, cleanup);
    image.onload = activate;
    image.onerror = cleanup;
    image.src = source;
    if (image.complete && image.naturalWidth) activate();
    else if (image.decode) image.decode().then(activate, function () {
      if (image.complete && !image.naturalWidth) cleanup();
    });

    return cleanup;
  };
}());

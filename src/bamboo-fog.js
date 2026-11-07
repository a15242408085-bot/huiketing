/* User-supplied transparent bamboo and independently authored CSS mist. */
(function registerBambooFog() {
  'use strict';

  var FX = window.HKVisualFX = window.HKVisualFX || {};
  var mounted = new WeakMap();

  FX.mountBambooFog = function mountBambooFog(home, foregroundBamboo) {
    if (!home || !home.isConnected) return function () {};
    if (mounted.has(home)) mounted.get(home)();

    var background = home.querySelector('.hk-home-stage-background');
    if (!background) return function () {};

    var disposed = false;
    var inView = true;
    var observer = null;
    var media = window.matchMedia('(prefers-reduced-motion: reduce)');
    var source = typeof foregroundBamboo === 'string' ? foregroundBamboo :
      (foregroundBamboo && typeof foregroundBamboo.src === 'string' ? foregroundBamboo.src : '');
    var layer = document.createElement('div');
    var farMist = document.createElement('div');
    var nearMist = document.createElement('div');
    var bamboo = null;

    layer.className = 'hk-bamboo-fog';
    layer.setAttribute('aria-hidden', 'true');
    farMist.className = 'hk-bamboo-fog__mist hk-bamboo-fog__mist--far';
    nearMist.className = 'hk-bamboo-fog__mist hk-bamboo-fog__mist--near';
    layer.appendChild(farMist);
    layer.appendChild(nearMist);

    if (source) {
      bamboo = document.createElement('img');
      bamboo.className = 'hk-bamboo-fog__bamboo';
      bamboo.alt = '';
      bamboo.draggable = false;
      bamboo.decoding = 'async';
      bamboo.width = 1672;
      bamboo.height = 941;
      bamboo.onerror = function () {
        if (!disposed) bamboo.hidden = true;
      };
      bamboo.src = source;
      layer.appendChild(bamboo);
    }

    background.appendChild(layer);
    mounted.set(home, cleanup);

    function syncMotion() {
      if (disposed) return;
      layer.setAttribute('data-hk-motion',
        document.hidden || media.matches || !inView ? 'paused' : 'running');
    }

    function cleanup() {
      if (disposed) return;
      disposed = true;
      document.removeEventListener('visibilitychange', syncMotion);
      if (media.removeEventListener) media.removeEventListener('change', syncMotion);
      else if (media.removeListener) media.removeListener(syncMotion);
      if (observer) observer.disconnect();
      if (bamboo) bamboo.onerror = null;
      layer.remove();
      if (mounted.get(home) === cleanup) mounted.delete(home);
    }

    document.addEventListener('visibilitychange', syncMotion);
    if (media.addEventListener) media.addEventListener('change', syncMotion);
    else if (media.addListener) media.addListener(syncMotion);
    if (window.IntersectionObserver) {
      observer = new IntersectionObserver(function (entries) {
        if (disposed) return;
        entries.forEach(function (entry) {
          if (entry.target === background) inView = entry.isIntersecting;
        });
        syncMotion();
      }, { threshold: 0 });
      observer.observe(background);
    }
    syncMotion();
    return cleanup;
  };
}());

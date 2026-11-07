/* Homepage-only typography polish; original React text nodes remain in place. */
(function registerHomePolish(window) {
  'use strict';

  var FX = window.HKVisualFX = window.HKVisualFX || {};
  var VERSION = 'landing-v1';
  var MARKER = 'data-hk-home-polish';
  var mounted = new WeakMap();
  if (FX.mountHomePolish && FX.mountHomePolish.hkVersion === VERSION) return;

  function mountHomePolish(home) {
    if (!home || !home.isConnected || typeof home.querySelector !== 'function') return function () {};
    if (mounted.has(home)) return mounted.get(home);
    var title = home.querySelector('.cover-hero__brand h1');
    if (!title) return function () {};
    var previousMarker = home.getAttribute(MARKER);
    var patches = [];
    var disposed = false;

    function cleanup() {
      if (disposed) return;
      disposed = true;
      patches.forEach(function (patch) {
        // Avoid overwriting a later, deliberate React text update.
        if (patch.node.nodeValue === patch.applied) patch.node.nodeValue = patch.original;
      });
      if (home.getAttribute(MARKER) === VERSION) {
        if (previousMarker === null) home.removeAttribute(MARKER);
        else home.setAttribute(MARKER, previousMarker);
      }
      if (mounted.get(home) === cleanup) mounted.delete(home);
    }

    function visit(node) {
      if (node.nodeType === 3) {
        var original = node.nodeValue;
        if (typeof original !== 'string') return;
        var applied = original.replace(/[。．.]+(?=\s*$)/, '');
        if (applied !== original) {
          patches.push({ node: node, original: original, applied: applied });
          node.nodeValue = applied;
        }
        return;
      }
      Array.prototype.slice.call(node.childNodes || []).forEach(visit);
    }

    try {
      visit(title);
      home.setAttribute(MARKER, VERSION);
      mounted.set(home, cleanup);
      return cleanup;
    } catch (_) {
      cleanup();
      return function () {};
    }
  }

  mountHomePolish.hkVersion = VERSION;
  FX.mountHomePolish = mountHomePolish;
})(window);

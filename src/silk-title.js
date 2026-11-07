/* Independent SVG/CSS silk lettering enhancement. No external dependencies. */
(function registerSilkTitle(window, document) {
  "use strict";

  var api = window.HKVisualFX = window.HKVisualFX || {};
  var VERSION = "silk-svg-v1";
  if (api.mountSilk && api.mountSilk.hkVersion === VERSION) return;

  var SVG_NS = "http://www.w3.org/2000/svg";
  var FILTER_ID = "hk-visualfx-silk-title-filter-v1";
  var MARKER = "data-hk-silk";
  var FRAME_INTERVAL = 100; // Update the SVG at most ten times per second.
  var mounts = new WeakMap();
  var shared = null;

  function noop() {}

  function svgNode(name, attributes) {
    var node = document.createElementNS(SVG_NS, name);
    Object.keys(attributes || {}).forEach(function setAttribute(name) {
      node.setAttribute(name, String(attributes[name]));
    });
    return node;
  }

  function paint(state, seconds) {
    // The source glyph moves by at most 0.35px per axis (scale / 2).
    // Moving the noise and light changes the sheen without moving the layout.
    state.flow.setAttribute("dx", (Math.sin(seconds * 0.37) * 2.4).toFixed(2));
    state.flow.setAttribute("dy", (Math.cos(seconds * 0.29) * 0.8).toFixed(2));
    state.light.setAttribute("azimuth", (222 + Math.sin(seconds * 0.31) * 12).toFixed(2));
    state.light.setAttribute("elevation", (61 + Math.sin(seconds * 0.23) * 3).toFixed(2));
  }

  function prefersReducedMotion(state) {
    return Boolean(state.motionQuery && state.motionQuery.matches);
  }

  function pause(state) {
    if (state.frame) window.cancelAnimationFrame(state.frame);
    state.frame = 0;
    state.previousTime = 0;
    state.previousPaint = -Infinity;
  }

  function tick(state, timestamp) {
    state.frame = 0;
    if (shared !== state || !state.targets.size) return;
    if (document.hidden || prefersReducedMotion(state)) {
      state.previousTime = 0;
      return;
    }

    // The page coordinator normally cleans up on SPA navigation. This also
    // stops animation if its title is detached before that cleanup runs.
    state.targets.forEach(function cleanDetachedTitle(title) {
      if (!title.isConnected) {
        var record = mounts.get(title);
        if (record) record.cleanup();
      }
    });
    if (shared !== state || !state.targets.size) return;

    if (state.previousTime) {
      state.elapsed += Math.min(timestamp - state.previousTime, 200);
    }
    state.previousTime = timestamp;
    if (timestamp - state.previousPaint >= FRAME_INTERVAL) {
      paint(state, state.elapsed / 1000);
      state.previousPaint = timestamp;
    }
    state.frame = window.requestAnimationFrame(function nextFrame(now) {
      tick(state, now);
    });
  }

  function syncMotion(state) {
    if (shared !== state) return;
    pause(state);
    if (prefersReducedMotion(state)) paint(state, 0);
    if (!document.hidden && !prefersReducedMotion(state) && state.targets.size) {
      state.frame = window.requestAnimationFrame(function nextFrame(now) {
        tick(state, now);
      });
    }
  }

  function createSharedFilter() {
    if (document.getElementById(FILTER_ID)) {
      throw new Error("The silk filter identifier is already in use.");
    }

    var svg = svgNode("svg", {
      width: 0,
      height: 0,
      "aria-hidden": "true",
      focusable: "false",
      "data-hk-silk-defs": VERSION
    });
    // Do not use display:none: some browsers then stop resolving SVG filters.
    svg.style.cssText = "position:absolute;width:0;height:0;overflow:hidden;pointer-events:none;";
    var defs = svgNode("defs");
    var filter = svgNode("filter", {
      id: FILTER_ID,
      x: "-3%",
      y: "-3%",
      width: "106%",
      height: "106%",
      "color-interpolation-filters": "sRGB"
    });
    var noise = svgNode("feTurbulence", {
      type: "fractalNoise",
      baseFrequency: "0.011 0.064",
      numOctaves: 2,
      seed: 17,
      stitchTiles: "stitch",
      result: "silkNoise"
    });
    var flow = svgNode("feOffset", {
      in: "silkNoise", dx: 0, dy: 0, result: "silkFlow"
    });
    var displacement = svgNode("feDisplacementMap", {
      in: "SourceGraphic",
      in2: "silkFlow",
      scale: 0.7,
      xChannelSelector: "R",
      yChannelSelector: "G",
      result: "silkText"
    });
    var lighting = svgNode("feSpecularLighting", {
      in: "silkFlow",
      surfaceScale: 2.4,
      specularConstant: 0.22,
      specularExponent: 24,
      "lighting-color": "#d3e3b3",
      result: "silkLight"
    });
    var light = svgNode("feDistantLight", { azimuth: 222, elevation: 61 });
    lighting.appendChild(light);
    var clippedLight = svgNode("feComposite", {
      in: "silkLight", in2: "SourceAlpha", operator: "in", result: "silkClippedLight"
    });
    var softLight = svgNode("feComponentTransfer", {
      in: "silkClippedLight", result: "silkSoftLight"
    });
    softLight.appendChild(svgNode("feFuncA", { type: "linear", slope: 0.17 }));
    var blend = svgNode("feBlend", {
      in: "silkText", in2: "silkSoftLight", mode: "screen"
    });
    [noise, flow, displacement, lighting, clippedLight, softLight, blend].forEach(function append(node) {
      filter.appendChild(node);
    });
    defs.appendChild(filter);
    svg.appendChild(defs);

    var state = {
      svg: svg,
      flow: flow,
      light: light,
      targets: new Set(),
      motionQuery: window.matchMedia ? window.matchMedia("(prefers-reduced-motion: reduce)") : null,
      frame: 0,
      elapsed: 0,
      previousTime: 0,
      previousPaint: -Infinity,
      onMotionChange: null
    };
    state.onMotionChange = function onMotionChange() { syncMotion(state); };

    try {
      document.body.appendChild(svg); // Outside React's #root.
      document.addEventListener("visibilitychange", state.onMotionChange);
      if (state.motionQuery) {
        if (state.motionQuery.addEventListener) {
          state.motionQuery.addEventListener("change", state.onMotionChange);
        } else if (state.motionQuery.addListener) {
          state.motionQuery.addListener(state.onMotionChange);
        }
      }
      paint(state, 0);
      return state;
    } catch (error) {
      destroySharedFilter(state);
      throw error;
    }
  }

  function destroySharedFilter(state) {
    pause(state);
    document.removeEventListener("visibilitychange", state.onMotionChange);
    if (state.motionQuery) {
      if (state.motionQuery.removeEventListener) {
        state.motionQuery.removeEventListener("change", state.onMotionChange);
      } else if (state.motionQuery.removeListener) {
        state.motionQuery.removeListener(state.onMotionChange);
      }
    }
    if (state.svg.parentNode) state.svg.parentNode.removeChild(state.svg);
    if (shared === state) shared = null;
  }

  function mountSilk(titleElement) {
    if (!titleElement || titleElement.nodeType !== 1 || titleElement.localName !== "h1" ||
        titleElement.ownerDocument !== document || !titleElement.isConnected || !document.body) {
      return noop;
    }
    var existing = mounts.get(titleElement);
    if (existing) return existing.cleanup;
    if (!window.requestAnimationFrame || !window.cancelAnimationFrame ||
        !window.CSS || !window.CSS.supports("filter", 'url("#' + FILTER_ID + '")')) {
      return noop;
    }

    var state;
    var previousMarker = titleElement.getAttribute(MARKER);
    try {
      state = shared || createSharedFilter();
      shared = state;
      var cleaned = false;
      var cleanup = function cleanupSilk() {
        if (cleaned) return;
        cleaned = true;
        if (titleElement.getAttribute(MARKER) === VERSION) {
          if (previousMarker === null) titleElement.removeAttribute(MARKER);
          else titleElement.setAttribute(MARKER, previousMarker);
        }
        mounts.delete(titleElement);
        state.targets.delete(titleElement);
        if (!state.targets.size) destroySharedFilter(state);
      };
      mounts.set(titleElement, { cleanup: cleanup });
      state.targets.add(titleElement);
      // The glyphs remain normal text throughout: no replacement, clone or
      // temporary hiding. The stylesheet has a solid-colour fallback.
      titleElement.setAttribute(MARKER, VERSION);
      syncMotion(state);
      return cleanup;
    } catch (error) {
      if (titleElement.getAttribute(MARKER) === VERSION) {
        if (previousMarker === null) titleElement.removeAttribute(MARKER);
        else titleElement.setAttribute(MARKER, previousMarker);
      }
      mounts.delete(titleElement);
      if (state) {
        state.targets.delete(titleElement);
        if (!state.targets.size) destroySharedFilter(state);
      }
      return noop;
    }
  }

  mountSilk.hkVersion = VERSION;
  api.mountSilk = mountSilk;
})(window, document);

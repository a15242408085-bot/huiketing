/* Original line-art entry icons. Existing SVG nodes and card behaviour stay intact. */
(function registerEntryIcons(window, document) {
  'use strict';

  var FX = window.HKVisualFX = window.HKVisualFX || {};
  var mounted = new WeakMap();
  var NS = 'http://www.w3.org/2000/svg';
  var MARKER = 'data-hk-entry-icon';

  function shape(name, attributes) {
    var node = document.createElementNS(NS, name);
    Object.keys(attributes).forEach(function (key) {
      node.setAttribute(key, String(attributes[key]));
    });
    return node;
  }

  function artwork(kind) {
    var group = shape('g', {
      'aria-hidden': 'true',
      'pointer-events': 'none',
      fill: 'none',
      stroke: 'currentColor',
      'stroke-width': 1.65,
      'stroke-linecap': 'round',
      'stroke-linejoin': 'round'
    });
    var parts = kind === 'traveler' ? [
      ['circle', { cx: 23, cy: 6.5, r: 3.3 }],
      // Backpack, its carrying loop and outside pocket.
      ['path', { d: 'M17.5 13H12a2.5 2.5 0 0 0-2.5 2.5v7A2.5 2.5 0 0 0 12 25h4' }],
      ['path', { d: 'M12.5 13v-1a2 2 0 0 1 4 0v1M10 20h5' }],
      // Forward lean, swinging arms and two separate walking legs.
      ['path', { d: 'M21.5 12.5 18.5 22l5.5 5 5 9M20.5 14l6 4 4-1M18.5 15l-3 6-3 2' }],
      ['path', { d: 'M18.5 22 13 31l-5 3M28 36h4M6.5 34H10' }]
    ] : [
      // Four striped awning panels with a scalloped lower edge.
      ['path', { d: 'M7 7h26l3 9H4l3-9ZM13 7l-1 9M20 7v9M27 7l1 9' }],
      ['path', { d: 'M4 16v2a4 4 0 0 0 8 0v-2M12 16v2a4 4 0 0 0 8 0v-2M20 16v2a4 4 0 0 0 8 0v-2M28 16v2a4 4 0 0 0 8 0v-2' }],
      // Shop walls, display window and entrance.
      ['path', { d: 'M7 22v14h26V22M4 36h32' }],
      ['rect', { x: 11, y: 25, width: 7, height: 7, rx: 0.5 }],
      ['path', { d: 'M11 28.5h7' }],
      ['path', { d: 'M22 36V25h7v11' }],
      ['circle', { cx: 24, cy: 30.5, r: 0.6, fill: 'currentColor', stroke: 'none' }]
    ];
    parts.forEach(function (part) { group.appendChild(shape(part[0], part[1])); });
    return group;
  }

  function restoreAttribute(node, name, value) {
    if (value === null) node.removeAttribute(name);
    else node.setAttribute(name, value);
  }

  function restore(record) {
    if (record.group.parentNode === record.svg) record.group.remove();
    record.children.forEach(function (item) {
      if (item.node.getAttribute('visibility') === 'hidden') {
        restoreAttribute(item.node, 'visibility', item.visibility);
      }
    });
    if (record.svg.getAttribute('viewBox') === '0 0 40 40') {
      restoreAttribute(record.svg, 'viewBox', record.viewBox);
    }
    if (record.svg.getAttribute(MARKER) === record.kind) {
      restoreAttribute(record.svg, MARKER, record.marker);
    }
  }

  FX.mountEntryIcons = function mountEntryIcons(home) {
    if (!home || !home.isConnected || !document.createElementNS) return function () {};
    if (mounted.has(home)) return mounted.get(home);
    var records = [];
    var disposed = false;
    function cleanup() {
      if (disposed) return;
      disposed = true;
      records.forEach(restore);
      if (mounted.get(home) === cleanup) mounted.delete(home);
    }
    try {
      [
        ['.entry-card--visitor .entry-card__body > svg', 'traveler'],
        ['.entry-card--merchant .entry-card__body > svg', 'storefront']
      ].forEach(function (entry) {
        var svg = home.querySelector(entry[0]);
        if (!svg) return;
        var record = {
          svg: svg,
          kind: entry[1],
          group: artwork(entry[1]),
          viewBox: svg.getAttribute('viewBox'),
          marker: svg.getAttribute(MARKER),
          children: Array.prototype.slice.call(svg.children).map(function (node) {
            return { node: node, visibility: node.getAttribute('visibility') };
          })
        };
        records.push(record);
        // Keep every original React-owned path in its original parent. Only
        // hide its paint, so React retains valid node references during updates.
        record.children.forEach(function (item) { item.node.setAttribute('visibility', 'hidden'); });
        svg.setAttribute('viewBox', '0 0 40 40');
        svg.setAttribute(MARKER, entry[1]);
        svg.appendChild(record.group);
      });
      mounted.set(home, cleanup);
      return cleanup;
    } catch (_) {
      cleanup();
      return function () {};
    }
  };
})(window, document);

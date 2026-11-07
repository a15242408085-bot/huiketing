/* Decorative cutout artwork; original entry links, text and React SVGs are retained. */
(function registerEntryArt(window, document) {
  'use strict';

  var FX = window.HKVisualFX = window.HKVisualFX || {};
  var mounted = new WeakMap();
  var HOME_CLASS = 'hk-has-entry-art';
  var CARD_CLASS = 'hk-entry-art-ready';
  var MARKER = 'data-hk-entry-art';

  FX.mountEntryArt = function mountEntryArt(home, entryArt) {
    if (!home || !home.isConnected || !entryArt || typeof entryArt !== 'object') {
      return function () {};
    }
    if (mounted.has(home)) return mounted.get(home);

    var disposed = false;
    var records = [];
    var hadHomeClass = home.classList.contains(HOME_CLASS);

    function updateHome() {
      if (records.some(function (record) { return record.ready; })) home.classList.add(HOME_CLASS);
      else if (!hadHomeClass) home.classList.remove(HOME_CLASS);
    }

    function polishLabel(record) {
      var label = record.card.querySelector('.entry-card__top > span:first-child');
      if (!label) return;
      var nodes = [];
      function visit(node) {
        if (node.nodeType === 3) nodes.push(node);
        else Array.prototype.slice.call(node.childNodes || []).forEach(visit);
      }
      visit(label);
      var value = nodes.map(function (node) { return node.nodeValue || ''; }).join('');
      var prefix = /^\s*\d{1,3}\s*[·•.．、:：\-]\s*/.exec(value);
      var remaining = prefix ? prefix[0].length : 0;
      nodes.forEach(function (node) {
        if (!remaining) return;
        var original = node.nodeValue || '';
        var count = Math.min(remaining, original.length);
        var applied = original.slice(count);
        record.textPatches.push({ node:node, original:original, applied:applied });
        node.nodeValue = applied;
        remaining -= count;
      });
    }

    function restoreCard(record) {
      record.ready = false;
      record.textPatches.forEach(function (patch) {
        if (patch.node.nodeValue === patch.applied) patch.node.nodeValue = patch.original;
      });
      if (!record.hadClass) record.card.classList.remove(CARD_CLASS);
      if (record.card.getAttribute(MARKER) === record.kind) {
        if (record.marker === null) record.card.removeAttribute(MARKER);
        else record.card.setAttribute(MARKER, record.marker);
      }
      record.image.removeEventListener('load', record.onLoad);
      record.image.removeEventListener('error', record.onError);
      record.image.remove();
      record.image.removeAttribute('src');
    }

    function cleanup() {
      if (disposed) return;
      disposed = true;
      records.forEach(restoreCard);
      if (hadHomeClass) home.classList.add(HOME_CLASS);
      else home.classList.remove(HOME_CLASS);
      if (mounted.get(home) === cleanup) mounted.delete(home);
    }

    try {
      [
        ['.entry-card--visitor', 'traveler'],
        ['.entry-card--merchant', 'storefront']
      ].forEach(function (entry) {
        var card = home.querySelector(entry[0]);
        var source = entryArt[entry[1]];
        if (!card || typeof source !== 'string' || !source) return;

        var image = document.createElement('img');
        image.className = 'hk-entry-art__image';
        image.alt = '';
        image.hidden = true;
        image.decoding = 'async';
        image.draggable = false;
        image.setAttribute('aria-hidden', 'true');
        var record = {
          card: card,
          image: image,
          kind: entry[1],
          hadClass: card.classList.contains(CARD_CLASS),
          marker: card.getAttribute(MARKER),
          textPatches: [],
          ready: false,
          onLoad: null,
          onError: null
        };
        record.onError = function () {
          if (disposed) return;
          restoreCard(record);
          updateHome();
        };
        record.onLoad = function () {
          if (disposed || record.ready) return;
          if (!home.isConnected || !card.isConnected || !image.naturalWidth || !image.naturalHeight) {
            record.onError();
            return;
          }
          // If the enhancement stylesheet is unavailable, keep the normal
          // compact SVG and do not reveal an unstyled, full-resolution image.
          var styled = window.getComputedStyle(image).getPropertyValue('--hk-entry-art-style-ready').trim() === '1';
          if (!styled) { record.onError(); return; }
          polishLabel(record);
          record.ready = true;
          card.setAttribute(MARKER, record.kind);
          card.classList.add(CARD_CLASS);
          image.hidden = false;
          updateHome();
        };
        records.push(record);
        image.addEventListener('load', record.onLoad);
        image.addEventListener('error', record.onError);
        card.appendChild(image);
        image.src = source;
        if (image.complete && image.naturalWidth) record.onLoad();
      });
      mounted.set(home, cleanup);
      return cleanup;
    } catch (_) {
      cleanup();
      return function () {};
    }
  };
})(window, document);

/* Native scrolling: the existing region directory covers the pinned homepage. */
(function registerHomeScroll() {
  'use strict';

  var modules = window.HKVisualFX = window.HKVisualFX || {};
  var mounted = new WeakMap();
  var smooth = function (lo, hi, value) {
    var n = Math.max(0, Math.min(1, (value - lo) / (hi - lo)));
    return n * n * (3 - 2 * n);
  };

  modules.mountHomeScroll = function mountHomeScroll(home) {
    if (!home || !home.isConnected) return function () {};
    if (mounted.has(home)) mounted.get(home)();
    var hero = home.querySelector('.cover-hero');
    var directory = home.querySelector('.region-preview');
    var shell = home.closest('.app-shell');
    if (!hero || !directory || !shell || hero.parentNode !== home || directory.parentNode !== home) return function () {};

    var disposed = false, printing = false, raf = 0, measureRaf = 0;
    var media = window.matchMedia('(prefers-reduced-motion: reduce)');
    var header = shell.querySelector(':scope > .site-header');
    var headerProperties = ['opacity', 'pointer-events'];
    var priorHeaderStyles = header ? headerProperties.map(function (name) {
      return { name:name, value:header.style.getPropertyValue(name), priority:header.style.getPropertyPriority(name) };
    }) : [];
    var priorHeaderAria = header && header.getAttribute('aria-hidden');
    var priorHeaderInert = header && header.getAttribute('inert');
    var baseHeaderOpacity = header ? parseFloat(window.getComputedStyle(header).opacity) : 1;
    if (!Number.isFinite(baseHeaderOpacity)) baseHeaderOpacity = 1;
    var lastHeaderOpacity = null, lastHeaderHidden = null;
    var priorMarker = home.getAttribute('data-hk-home-scroll');
    var variableNames = ['--hk-home-gutter', '--hk-home-pin-top', '--hk-home-stage-bg-h', '--hk-home-panel-gap'];
    var priorVariables = variableNames.map(function (name) {
      return { name: name, value: home.style.getPropertyValue(name), priority: home.style.getPropertyPriority(name) };
    });
    var directoryNext = directory.nextSibling;
    var sourceStyle = window.getComputedStyle(shell);
    var sourceBackground = sourceStyle.backgroundImage;

    var sequence = document.createElement('div');
    var stage = document.createElement('div');
    var stageBackground = document.createElement('div');
    var panel = document.createElement('div');
    var layerPlacements = [];
    var resizeObserver = null;
    var shellObserver = null;

    sequence.className = 'hk-home-sequence';
    stage.className = 'hk-home-stage';
    stageBackground.className = 'hk-home-stage-background';
    stageBackground.setAttribute('aria-hidden', 'true');
    stageBackground.style.backgroundImage = sourceBackground;
    stageBackground.style.backgroundColor = sourceStyle.backgroundColor;
    stageBackground.style.backgroundSize = sourceStyle.backgroundSize;
    stageBackground.style.backgroundPosition = sourceStyle.backgroundPosition;
    stageBackground.style.backgroundRepeat = sourceStyle.backgroundRepeat;
    panel.className = 'hk-home-directory-panel';
    stage.appendChild(stageBackground);
    home.insertBefore(sequence, hero);
    sequence.appendChild(stage);
    stage.appendChild(hero);
    sequence.appendChild(panel);
    panel.appendChild(directory);
    home.setAttribute('data-hk-home-scroll', 'natural');
    mounted.set(home, cleanup);

    function currentHome() {
      return !disposed && home.isConnected && hero.isConnected && directory.isConnected && shell.contains(home);
    }

    function restoreHeaderAttribute(name, value) {
      if (value === null) header.removeAttribute(name);
      else header.setAttribute(name, value);
    }

    function restoreHeader() {
      if (!header) return;
      priorHeaderStyles.forEach(function (item) {
        if (item.value) header.style.setProperty(item.name, item.value, item.priority);
        else header.style.removeProperty(item.name);
      });
      restoreHeaderAttribute('inert', priorHeaderInert);
      restoreHeaderAttribute('aria-hidden', priorHeaderAria);
      lastHeaderOpacity = null; lastHeaderHidden = null;
    }

    function fadeHeader() {
      if (!header || !header.isConnected) return;
      // Sticky positioning keeps its original flow height; only paint fades.
      var fade = smooth(0, 360, Math.max(0, window.scrollY));
      var opacity = (baseHeaderOpacity * (1 - fade)).toFixed(3);
      var hidden = opacity === '0.000';
      if (opacity !== lastHeaderOpacity) {
        header.style.setProperty('opacity', opacity, priorHeaderStyles[0].priority);
        lastHeaderOpacity = opacity;
      }
      if (hidden !== lastHeaderHidden) {
        if (hidden) {
          header.style.setProperty('pointer-events', 'none', priorHeaderStyles[1].priority);
          header.setAttribute('inert', '');
          header.setAttribute('aria-hidden', 'true');
        } else {
          var pointer = priorHeaderStyles[1];
          if (pointer.value) header.style.setProperty(pointer.name, pointer.value, pointer.priority);
          else header.style.removeProperty(pointer.name);
          restoreHeaderAttribute('inert', priorHeaderInert);
          restoreHeaderAttribute('aria-hidden', priorHeaderAria);
        }
        lastHeaderHidden = hidden;
      }
    }

    function moveLandscapeLayers() {
      if (!currentHome() || printing) return;
      Array.prototype.slice.call(shell.children).forEach(function (node) {
        if (!node.classList || !node.classList.contains('hk-landscape-layer')) return;
        if (!layerPlacements.some(function (item) { return item.node === node; })) {
          layerPlacements.push({ node: node, parent: shell, next: node.nextSibling });
        }
        stageBackground.appendChild(node);
      });
    }

    function restoreLandscapeLayers() {
      layerPlacements.forEach(function (item) {
        if (item.node.parentNode !== stageBackground) return;
        if (item.parent && item.parent.isConnected) {
          item.parent.insertBefore(item.node, item.next && item.next.parentNode === item.parent ? item.next : null);
        } else item.node.remove();
      });
    }

    function measure() {
      measureRaf = 0;
      if (!currentHome() || printing) return;
      var viewport = Math.max(1, window.innerHeight);
      var documentWidth = document.documentElement.clientWidth;
      var homeWidth = home.getBoundingClientRect().width;
      var sequenceTop = sequence.getBoundingClientRect().top + window.scrollY;
      var heroHeight = hero.getBoundingClientRect().height;
      var pinTop = Math.max(0, sequenceTop);
      var canPin = !media.matches && documentWidth > 860 && heroHeight + pinTop <= viewport + 8;
      home.style.setProperty('--hk-home-gutter', Math.max(0, (documentWidth - homeWidth) / 2).toFixed(3) + 'px');
      home.style.setProperty('--hk-home-pin-top', pinTop.toFixed(3) + 'px');
      home.style.setProperty('--hk-home-stage-bg-h', Math.max(viewport, heroHeight + pinTop).toFixed(3) + 'px');
      home.style.setProperty('--hk-home-panel-gap', Math.max(0, viewport - sequenceTop - heroHeight).toFixed(3) + 'px');
      home.setAttribute('data-hk-home-scroll', canPin ? 'pin' : 'natural');
      var background = window.getComputedStyle(shell);
      stageBackground.style.backgroundImage = background.backgroundImage;
      stageBackground.style.backgroundPosition = background.backgroundPosition;
      stageBackground.style.backgroundSize = background.backgroundSize;
      stageBackground.style.backgroundColor = background.backgroundColor;
      moveLandscapeLayers();
      fadeHeader();
      schedule();
    }

    function queueMeasure() {
      if (!measureRaf && !disposed) measureRaf = window.requestAnimationFrame(measure);
    }

    function stopFrame() {
      if (raf) window.cancelAnimationFrame(raf);
      raf = 0;
    }

    function schedule() {
      if (!disposed && !printing && !raf) raf = window.requestAnimationFrame(frame);
    }

    function frame() {
      raf = 0;
      if (!currentHome()) { cleanup(); return; }
      if (printing || document.hidden) return;
      fadeHeader();
      var rect = panel.getBoundingClientRect();
      var covered = home.getAttribute('data-hk-home-scroll') === 'pin' && rect.top <= parseFloat(home.style.getPropertyValue('--hk-home-pin-top'));
      if ('inert' in stage) stage.inert = covered;
      if (covered) stage.setAttribute('aria-hidden', 'true');
      else stage.removeAttribute('aria-hidden');
    }

    function onVisibility() {
      stopFrame();
      if (!document.hidden) schedule();
    }

    function beforePrint() {
      if (disposed || printing) return;
      printing = true;
      stopFrame();
      restoreHeader();
      restoreLandscapeLayers();
      if (hero.parentNode === stage) home.insertBefore(hero, sequence);
      if (directory.parentNode === panel) home.insertBefore(directory, directoryNext && directoryNext.parentNode === home ? directoryNext : sequence.nextSibling);
      sequence.style.display = 'none';
    }

    function afterPrint() {
      if (disposed || !printing) return;
      printing = false;
      sequence.style.display = '';
      if (hero.parentNode === home) stage.appendChild(hero);
      if (directory.parentNode === home) panel.appendChild(directory);
      moveLandscapeLayers();
      queueMeasure();
    }

    function cleanup() {
      if (disposed) return;
      disposed = true;
      stopFrame();
      if (measureRaf) window.cancelAnimationFrame(measureRaf);
      measureRaf = 0;
      window.removeEventListener('scroll', schedule);
      window.removeEventListener('resize', queueMeasure);
      window.removeEventListener('beforeprint', beforePrint);
      window.removeEventListener('afterprint', afterPrint);
      document.removeEventListener('visibilitychange', onVisibility);
      if (media.removeEventListener) media.removeEventListener('change', queueMeasure);
      else if (media.removeListener) media.removeListener(queueMeasure);
      if (resizeObserver) resizeObserver.disconnect();
      if (shellObserver) shellObserver.disconnect();
      if (document.fonts && document.fonts.removeEventListener) document.fonts.removeEventListener('loadingdone', queueMeasure);
      restoreHeader();
      restoreLandscapeLayers();
      if (hero.parentNode === stage) {
        home.insertBefore(hero, sequence);
      }
      if (directory.parentNode === panel) home.insertBefore(directory, directoryNext && directoryNext.parentNode === home ? directoryNext : sequence.nextSibling);
      sequence.remove();
      if (priorMarker === null) home.removeAttribute('data-hk-home-scroll');
      else home.setAttribute('data-hk-home-scroll', priorMarker);
      priorVariables.forEach(function (item) {
        if (item.value) home.style.setProperty(item.name, item.value, item.priority);
        else home.style.removeProperty(item.name);
      });
      if (mounted.get(home) === cleanup) mounted.delete(home);
    }

    window.addEventListener('scroll', schedule, { passive: true });
    window.addEventListener('resize', queueMeasure, { passive: true });
    window.addEventListener('beforeprint', beforePrint);
    window.addEventListener('afterprint', afterPrint);
    document.addEventListener('visibilitychange', onVisibility);
    if (media.addEventListener) media.addEventListener('change', queueMeasure);
    else if (media.addListener) media.addListener(queueMeasure);
    if (window.ResizeObserver) {
      resizeObserver = new ResizeObserver(queueMeasure);
      resizeObserver.observe(hero);
      resizeObserver.observe(directory);
    }
    if (window.MutationObserver) {
      shellObserver = new MutationObserver(moveLandscapeLayers);
      shellObserver.observe(shell, { childList: true });
    }
    if (document.fonts && document.fonts.addEventListener) document.fonts.addEventListener('loadingdone', queueMeasure);
    measure();
    return cleanup;
  };
}());

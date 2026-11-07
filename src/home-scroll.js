/* Independent native-scroll photographic story. No source from the reference site is used. */
(function registerHomeScroll() {
  'use strict';

  var modules = window.HKVisualFX = window.HKVisualFX || {};
  var mounted = new WeakMap();
  var clamp = function (value, lo, hi) { return Math.max(lo, Math.min(hi, value)); };
  var smooth = function (lo, hi, value) {
    var n = clamp((value - lo) / (hi - lo), 0, 1);
    return n * n * (3 - 2 * n);
  };

  modules.mountHomeScroll = function mountHomeScroll(home, homeScenes) {
    if (!home || !home.isConnected) return function () {};
    if (mounted.has(home)) mounted.get(home)();
    var hero = home.querySelector('.cover-hero');
    var shell = home.closest('.app-shell');
    if (!hero || !shell || hero.parentNode !== home) return function () {};

    var disposed = false, printing = false, raf = 0, measureRaf = 0;
    var lastPaint = -Infinity, lastTime = 0, elapsed = 0;
    var paused = false, currentCaption = -1;
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
    var variableNames = ['--hk-home-gutter', '--hk-home-pin-top', '--hk-home-stage-bg-h', '--hk-home-story-gap'];
    var priorVariables = variableNames.map(function (name) {
      return { name: name, value: home.style.getPropertyValue(name), priority: home.style.getPropertyPriority(name) };
    });
    var originalNext = hero.nextSibling;
    var sourceStyle = window.getComputedStyle(shell);
    var sourceBackground = sourceStyle.backgroundImage;
    var fallbackMatch = /url\((?:"([^"]*)"|'([^']*)'|([^)]*))\)/.exec(sourceBackground);
    var fallbackSource = fallbackMatch ? (fallbackMatch[1] || fallbackMatch[2] || fallbackMatch[3] || '').trim() : '';
    var scenes = (Array.isArray(homeScenes) ? homeScenes : []).filter(function (item) {
      return item && typeof item.src === 'string' && item.src.length > 0;
    }).slice(0, 2);
    if (!scenes.length) scenes = [{ src: fallbackSource, alt: '竹林与水乡氛围影像', title: '竹影与水岸', source_label: '氛围影像' }];

    var sequence = document.createElement('div');
    var stage = document.createElement('div');
    var stageBackground = document.createElement('div');
    var story = document.createElement('section');
    var figure = document.createElement('figure');
    var veil = document.createElement('div');
    var copy = document.createElement('div');
    var heading = document.createElement('h2');
    var firstLine = document.createElement('span');
    var secondLine = document.createElement('span');
    var credit = document.createElement('figcaption');
    var creditTitle = document.createElement('span');
    var creditSource = document.createElement('a');
    var pauseButton = document.createElement('button');
    var imageNodes = [];
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
    story.className = 'hk-home-story';
    story.setAttribute('aria-label', '小镇空间影像');
    figure.className = 'hk-home-story__figure';
    veil.className = 'hk-home-story__veil';
    veil.setAttribute('aria-hidden', 'true');
    copy.className = 'hk-home-story__copy';
    heading.className = 'hk-home-story__heading';
    firstLine.textContent = '竹影之间';
    secondLine.textContent = '慢慢走进小镇';
    heading.appendChild(firstLine);
    heading.appendChild(secondLine);
    copy.appendChild(heading);
    credit.className = 'hk-home-story__credit';
    creditSource.target = '_blank';
    creditSource.rel = 'noopener noreferrer';
    credit.appendChild(creditTitle);
    credit.appendChild(creditSource);
    pauseButton.className = 'hk-home-story__pause';
    pauseButton.type = 'button';
    pauseButton.textContent = '暂停画面';
    pauseButton.setAttribute('aria-pressed', 'false');

    scenes.forEach(function (scene, index) {
      var img = document.createElement('img');
      img.className = 'hk-home-story__image';
      img.alt = '';
      img.setAttribute('aria-hidden', 'true');
      img.decoding = 'async';
      img.draggable = false;
      img.style.opacity = index === 0 ? '1' : '0';
      img.onerror = function () {
        if (disposed) return;
        if (fallbackSource && img.getAttribute('src') !== fallbackSource) {
          scenes[index] = {
            src: fallbackSource,
            alt: 'AI 生成的竹林与水乡氛围示意图',
            title: '竹林水乡',
            source_label: '会客厅 · AI 生成备用示意图'
          };
          if (currentCaption === index) {
            currentCaption = -1;
            setCaption(index);
          }
          img.src = fallbackSource;
        }
        else img.style.visibility = 'hidden';
      };
      img.src = scene.src === '@bamboo' ? fallbackSource : (scene.src || fallbackSource);
      figure.appendChild(img);
      imageNodes.push(img);
    });
    figure.appendChild(veil);
    figure.appendChild(credit);
    story.appendChild(figure);
    story.appendChild(copy);
    story.appendChild(pauseButton);
    stage.appendChild(stageBackground);
    home.insertBefore(sequence, hero);
    sequence.appendChild(stage);
    stage.appendChild(hero);
    sequence.appendChild(story);
    home.setAttribute('data-hk-home-scroll', 'natural');
    mounted.set(home, cleanup);

    function currentHome() {
      return !disposed && home.isConnected && hero.isConnected && shell.contains(home);
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

    function setCaption(index) {
      if (currentCaption === index) return;
      currentCaption = index;
      var scene = scenes[index] || scenes[0];
      figure.setAttribute('aria-label', scene.alt || scene.title || '小镇空间影像参考');
      creditTitle.textContent = '空间影像参考' + (scene.title ? ' · ' + scene.title : '');
      creditSource.textContent = scene.source_label || '图像来源';
      var valid = false;
      if (scene.source_page) {
        try {
          var url = new URL(scene.source_page, document.baseURI);
          if (url.protocol === 'https:' || url.protocol === 'http:') {
            creditSource.href = url.href;
            valid = true;
          }
        } catch (_) {}
      }
      if (!valid) creditSource.removeAttribute('href');
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
      home.style.setProperty('--hk-home-story-gap', Math.max(0, viewport - sequenceTop - heroHeight).toFixed(3) + 'px');
      home.setAttribute('data-hk-home-scroll', canPin ? 'pin' : 'natural');
      story.setAttribute('data-hk-motion', media.matches ? 'reduced' : 'enabled');
      pauseButton.hidden = media.matches || scenes.length < 2;
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
      lastTime = 0;
      lastPaint = -Infinity;
    }

    function schedule() {
      if (!disposed && !printing && !raf) raf = window.requestAnimationFrame(frame);
    }

    function frame(now) {
      raf = 0;
      if (!currentHome()) { cleanup(); return; }
      if (printing || document.hidden) { lastTime = 0; return; }
      if (now - lastPaint < 1000 / 30) { raf = window.requestAnimationFrame(frame); return; }
      lastPaint = now;
      fadeHeader();
      var rect = story.getBoundingClientRect();
      var viewport = Math.max(1, window.innerHeight);
      var visible = rect.bottom > 0 && rect.top < viewport;
      var canAnimate = visible && !media.matches && !paused;
      if (canAnimate) {
        if (lastTime) elapsed += Math.min(0.15, Math.max(0, now - lastTime) / 1000);
        lastTime = now;
      } else lastTime = 0;
      var progress = clamp((viewport - rect.top) / Math.max(1, viewport + rect.height), 0, 1);
      var drift = media.matches ? 0 : (progress - 0.5) * 22;
      imageNodes.forEach(function (img) {
        img.style.transform = media.matches ? 'none' : 'translate3d(0,' + drift.toFixed(2) + 'px,0) scale(1.04)';
      });
      var mix = 0;
      if (imageNodes.length > 1 && !media.matches) {
        var phase = (elapsed / 18) % 2;
        mix = phase < 1 ? smooth(0.82, 1, phase) : 1 - smooth(0.82, 1, phase - 1);
        imageNodes[0].style.opacity = (1 - mix).toFixed(4);
        imageNodes[1].style.opacity = mix.toFixed(4);
      } else {
        imageNodes[0].style.opacity = '1';
        if (imageNodes[1]) imageNodes[1].style.opacity = '0';
      }
      setCaption(mix > 0.5 ? 1 : 0);
      var covered = home.getAttribute('data-hk-home-scroll') === 'pin' && rect.top <= parseFloat(home.style.getPropertyValue('--hk-home-pin-top'));
      if ('inert' in stage) stage.inert = covered;
      if (covered) stage.setAttribute('aria-hidden', 'true');
      else stage.removeAttribute('aria-hidden');
      if (canAnimate && imageNodes.length > 1) raf = window.requestAnimationFrame(frame);
    }

    function onPause() {
      paused = !paused;
      pauseButton.textContent = paused ? '继续画面' : '暂停画面';
      pauseButton.setAttribute('aria-pressed', paused ? 'true' : 'false');
      stopFrame();
      schedule();
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
      sequence.style.display = 'none';
    }

    function afterPrint() {
      if (disposed || !printing) return;
      printing = false;
      sequence.style.display = '';
      if (hero.parentNode === home) stage.appendChild(hero);
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
      pauseButton.removeEventListener('click', onPause);
      if (media.removeEventListener) media.removeEventListener('change', queueMeasure);
      else if (media.removeListener) media.removeListener(queueMeasure);
      if (resizeObserver) resizeObserver.disconnect();
      if (shellObserver) shellObserver.disconnect();
      if (document.fonts && document.fonts.removeEventListener) document.fonts.removeEventListener('loadingdone', queueMeasure);
      imageNodes.forEach(function (img) { img.onerror = null; img.onload = null; });
      restoreHeader();
      restoreLandscapeLayers();
      if (hero.parentNode === stage) {
        home.insertBefore(hero, originalNext && originalNext.parentNode === home ? originalNext : sequence);
      }
      sequence.remove();
      if (priorMarker === null) home.removeAttribute('data-hk-home-scroll');
      else home.setAttribute('data-hk-home-scroll', priorMarker);
      priorVariables.forEach(function (item) {
        if (item.value) home.style.setProperty(item.name, item.value, item.priority);
        else home.style.removeProperty(item.name);
      });
      if (mounted.get(home) === cleanup) mounted.delete(home);
    }

    pauseButton.addEventListener('click', onPause);
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
    }
    if (window.MutationObserver) {
      shellObserver = new MutationObserver(moveLandscapeLayers);
      shellObserver.observe(shell, { childList: true });
    }
    if (document.fonts && document.fonts.addEventListener) document.fonts.addEventListener('loadingdone', queueMeasure);
    setCaption(0);
    measure();
    return cleanup;
  };
}());

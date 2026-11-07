/* Independent editorial room view; the original chat and arrival handlers stay untouched. */
(function registerRoomEditorial() {
  'use strict';
  var FX = window.HKVisualFX = window.HKVisualFX || {};
  var mounted = new WeakMap();
  var SVG_NS = 'http://www.w3.org/2000/svg';

  function text(value, fallback) {
    if (typeof value === 'string' || typeof value === 'number') return String(value);
    return fallback || '';
  }
  function element(tag, className, content) {
    var node = document.createElement(tag);
    if (className) node.className = className;
    if (content !== undefined) node.textContent = text(content);
    return node;
  }
  function icon(name) {
    var key = text(name, 'info').toLowerCase().replace(/[\s_-]/g, '');
    var shapes;
    if (/cup|tea|coffee/.test(key)) shapes = [
      ['path', { d:'M7 11h16v8a8 8 0 0 1-16 0z' }], ['path', { d:'M23 12h2a4 4 0 0 1 0 8h-2' }],
      ['path', { d:'M5 27h23M12 3v4M17 2v5M22 4v3' }]
    ];
    else if (/chair|seat/.test(key)) shapes = [
      ['path', { d:'M8 18V7a3 3 0 0 1 3-3h10a3 3 0 0 1 3 3v11M6 18h20v5H6zM8 23l-2 6M24 23l2 6M8 14h16' }]
    ];
    else if (/book|story|history/.test(key)) shapes = [
      ['path', { d:'M16 7c-4-3-8-3-12-2v22c4-1 8-1 12 2 4-3 8-3 12-2V5c-4-1-8-1-12 2zM16 7v22' }]
    ];
    else if (/leaf|bamboo|nature/.test(key)) shapes = [
      ['path', { d:'M27 4C13 2 4 9 7 20c3 9 18 7 20-16zM5 29 23 10M13 21v-8M18 16h7' }]
    ];
    else if (/clock|time/.test(key)) shapes = [
      ['circle', { cx:16, cy:16, r:12 }], ['path', { d:'M16 8v9h7' }]
    ];
    else if (/pin|location|map/.test(key)) shapes = [
      ['path', { d:'M26 13c0 8-10 16-10 16S6 21 6 13a10 10 0 1 1 20 0z' }], ['circle', { cx:16, cy:13, r:3.5 }]
    ];
    else if (/user|people|crowd|person/.test(key)) shapes = [
      ['circle', { cx:12, cy:10, r:5 }], ['path', { d:'M3 28v-5a9 9 0 0 1 18 0v5M22 5a5 5 0 0 1 0 10M25 19a8 8 0 0 1 4 7v2' }]
    ];
    else if (/mountain|hill/.test(key)) shapes = [
      ['path', { d:'m2 27 10-19 7 14 4-9 7 14zM9 14l3 3 3-3' }]
    ];
    else if (/shop|store|market/.test(key)) shapes = [
      ['path', { d:'M5 14v14h22V14M3 13l3-9h20l3 9M3 13c0 5 6 5 6 0 0 5 7 5 7 0 0 5 7 5 7 0 0 5 6 5 6 0M13 28V18h8v10' }]
    ];
    else if (/basket|bag|box|sold|luggage/.test(key)) shapes = [
      ['path', { d:'M5 12h22l-2 17H7zM10 12l6-9 6 9M10 17v7M16 17v7M22 17v7' }]
    ];
    else if (/food|noodle|steam|tofu|bowl/.test(key)) shapes = [
      ['path', { d:'M4 15h24a12 12 0 0 1-24 0zM9 29h14M11 3c-4 4 4 4 0 8M18 2c-4 4 4 4 0 8M25 4c-4 3 3 3 0 6' }]
    ];
    else shapes = [ ['circle', { cx:16, cy:16, r:12 }], ['path', { d:'M16 14v9M16 9v.1' }] ];
    var svg = document.createElementNS(SVG_NS, 'svg');
    svg.setAttribute('viewBox', '0 0 32 32');
    svg.setAttribute('width', '28'); svg.setAttribute('height', '28');
    svg.setAttribute('fill', 'none'); svg.setAttribute('stroke', 'currentColor');
    svg.setAttribute('stroke-width', '1.6'); svg.setAttribute('stroke-linecap', 'round');
    svg.setAttribute('stroke-linejoin', 'round'); svg.setAttribute('aria-hidden', 'true');
    shapes.forEach(function (shape) {
      var child = document.createElementNS(SVG_NS, shape[0]);
      Object.keys(shape[1]).forEach(function (key) { child.setAttribute(key, String(shape[1][key])); });
      svg.appendChild(child);
    });
    return svg;
  }
  function currentShop() {
    var id = '';
    try { id = decodeURIComponent(location.hash.split('/')[3] || '').split('?')[0]; } catch (_) {}
    var world = window.__STANDALONE_WORLD__;
    var shops = world && world.data && world.data.shops;
    if (Array.isArray(shops)) return shops.find(function (shop) { return shop && shop.id === id; }) || {};
    if (shops && typeof shops === 'object') return shops[id] || {};
    return {};
  }

  FX.mountRoomEditorial = function mountRoomEditorial(roomPage, config) {
    if (!roomPage || !roomPage.isConnected || !config || typeof config !== 'object') return function () {};
    if (mounted.has(roomPage)) mounted.get(roomPage)();
    var shell = roomPage.closest('.app-shell');
    var grid = roomPage.querySelector('.room-grid');
    var context = grid && grid.querySelector('.room-context');
    var chat = grid && grid.querySelector('.chat-panel');
    var cover = context && context.querySelector('.room-context__cover');
    if (!shell || !grid || !context || !chat || !cover) return function () {};

    var disposed = false;
    var added = [];
    var textPatches = [];
    var images = [];
    var shop = currentShop();
    var priorMarker = shell.getAttribute('data-hk-room-editorial');
    var id = text(config.id || config.shopId || shop.id || location.hash.split('/')[3], 'room');
    var actualButton = context.querySelector('.card-callout');
    var buttonParent = actualButton && actualButton.parentNode;
    var buttonNext = actualButton && actualButton.nextSibling;
    var buttonMarker = null, buttonObserver = null, arrivalSlot = null;
    var priorButtonAria = actualButton && actualButton.getAttribute('aria-label');
    var priorButtonTitle = actualButton && actualButton.getAttribute('title');
    var priorButtonBusy = actualButton && actualButton.getAttribute('aria-busy');
    var priorArrivalState = actualButton && actualButton.getAttribute('data-hk-arrival-state');
    var alreadyArrivalClass = actualButton && actualButton.classList.contains('hk-room-arrival-button');

    function patchText(node, value) {
      if (!node || typeof value !== 'string' || !value) return;
      textPatches.push({ node:node, value:node.textContent });
      node.textContent = value;
    }
    function append(node, parent, before) {
      parent.insertBefore(node, before || null);
      added.push(node);
      return node;
    }
    function crop(className, shape, label, caption) {
      var frame = element('figure', className);
      var img = element('img', '');
      img.alt = text(label);
      img.decoding = 'async';
      img.draggable = false;
      var values = shape || {};
      var valid = ['x','y','w','h'].every(function (key) {
        return Number.isFinite(Number(values[key])) && (key === 'x' || key === 'y' || Number(values[key]) > 0);
      });
      if (valid) {
        frame.setAttribute('data-hk-crop', '');
        frame.style.setProperty('--hk-source-w', String(Number(values.sourceW) || 2560));
        frame.style.setProperty('--hk-source-h', String(Number(values.sourceH) || 1440));
        ['x','y','w','h'].forEach(function (key) { frame.style.setProperty('--hk-crop-' + key, String(Number(values[key]))); });
        img.className = 'hk-room-crop-image';
      }
      img.onerror = function () {
        if (disposed) return;
        img.hidden = true;
        if (!frame.querySelector('.hk-room-image-fallback')) frame.appendChild(element('span', 'hk-room-image-fallback', '影像暂未加载'));
      };
      if (typeof config.src === 'string' && config.src) img.src = config.src;
      else {
        img.hidden = true;
        frame.appendChild(element('span', 'hk-room-image-fallback', '影像暂未加载'));
      }
      images.push(img);
      frame.appendChild(img);
      if (caption) frame.appendChild(element('figcaption', 'hk-room-banner__caption', caption));
      return frame;
    }

    shell.setAttribute('data-hk-room-editorial', id);
    mounted.set(roomPage, cleanup);
    var brandText = shell.querySelector('.site-header .brand-lockup__text');
    if (brandText && !brandText.querySelector('.hk-room-brand-note')) append(element('span', 'hk-room-brand-note', '地方影像档案'), brandText);
    patchText(cover.querySelector('.room-context__cover-top > span:not(.seal)'), config.number ? '店铺 ' + text(config.number) : '');
    patchText(cover.querySelector(':scope > .small-caps'), text(config.englishName));
    patchText(cover.querySelector(':scope > p'), text(config.tagline));

    /* Shop status is independent content; the existing factual hours/address box stays in place. */
    var status = element('section', 'hk-room-status');
    status.setAttribute('aria-label', '今日状态');
    var statusHeader = element('header', '');
    statusHeader.appendChild(element('h3', '', '今日状态'));
    var updated = text(config.statusUpdatedAt || config.statusTime || config.updatedAt);
    if (updated) statusHeader.appendChild(element('small', '', updated));
    status.appendChild(statusHeader);
    var statuses = Array.isArray(config.status) ? config.status : [];
    statuses.forEach(function (item) {
      if (!item || typeof item !== 'object') return;
      var row = element('article', 'hk-room-status__item');
      if (item.alert) row.setAttribute('data-hk-status-alert', 'true');
      row.appendChild(icon(item.icon));
      var body = element('div', '');
      body.appendChild(element('h4', '', text(item.title)));
      if (item.text) body.appendChild(element('p', '', text(item.text)));
      row.appendChild(body);
      status.appendChild(row);
    });
    if (config.status_note || config.statusNote) status.appendChild(element('p', 'hk-room-status__note', text(config.statusNote || config.status_note)));
    if (statuses.length) append(status, context, cover.nextSibling);

    var story = element('article', 'hk-room-story');
    story.setAttribute('aria-label', '店铺介绍与空间示意');
    story.appendChild(element('p', 'hk-room-story__kicker', text(config.kicker, '店主写给第一次来的人')));
    story.appendChild(element('h1', '', text(config.headline, text(shop.name, '这家店') + ' · 第一次来')));
    story.appendChild(element('p', 'hk-room-story__subtitle', text(config.subtitle, '店主介绍 · 根据店主资料整理')));
    story.appendChild(crop('hk-room-banner', config.bannerCrop, text(config.bannerAlt, text(shop.name, '店铺') + '氛围示意影像'), text(config.bannerCaption || config.banner_caption, 'AI 示意影像 · 非实地采集')));
    var featureGrid = element('section', 'hk-room-features');
    featureGrid.setAttribute('aria-label', '第一次来可以先知道的事');
    (Array.isArray(config.features) ? config.features : []).slice(0, 3).forEach(function (item) {
      if (!item || typeof item !== 'object') return;
      var card = element('article', '');
      var title = element('h3', '');
      title.appendChild(icon(item.icon));
      title.appendChild(element('span', '', text(item.title)));
      card.appendChild(title);
      if (item.text) card.appendChild(element('p', '', text(item.text)));
      var note = Array.isArray(item.note) ? item.note.map(function (part) { return text(part); }).filter(Boolean).join(' ') : text(item.note);
      if (note) card.appendChild(element('div', 'hk-room-feature-note', note));
      featureGrid.appendChild(card);
    });
    story.appendChild(featureGrid);
    story.appendChild(element('h2', 'hk-room-plan-heading', text(config.planTitle, '进门之后，坐在哪里？')));
    story.appendChild(element('p', 'hk-room-plan-disclaimer', text(config.planNote, '空间布局示意 · 非实际测绘')));
    var planRow = element('div', 'hk-room-plan-row');
    planRow.appendChild(crop('hk-room-plan', config.planCrop, text(config.planAlt, '店铺空间布局示意图，非实际测绘')));
    var legend = element('aside', 'hk-room-legend');
    legend.appendChild(element('h3', '', text(config.legendTitle, '图例与说明')));
    var list = element('ul', '');
    (Array.isArray(config.legend) ? config.legend : []).forEach(function (item) {
      var value = text(item, item && text(item.text || item.title));
      if (value) list.appendChild(element('li', '', value));
    });
    if (list.children.length) legend.appendChild(list);
    legend.appendChild(element('hr', ''));
    legend.appendChild(element('p', '', text(config.legendFooter, '具体位置以现场为准。')));
    planRow.appendChild(legend);
    story.appendChild(planRow);
    append(story, grid, chat);

    /* Move the real button, never clone it or replace its React click handler. */
    function syncArrivalName() {
      if (!actualButton || disposed) return;
      var label = (actualButton.innerText || actualButton.textContent || '').replace(/\s+/g, ' ').trim();
      var spinner = actualButton.querySelector('.spin,[role="status"],[aria-busy="true"]');
      var busy = !!spinner || /正在|生成中|整理中|处理中|稍候|稍等/.test(label);
      var failed = !busy && /生成失败|整理失败|未能生成|请重试|出错/.test(label);
      var needsQuestion = actualButton.disabled && !busy && /先问|至少问|问一件|问一个/.test(label);
      var state = busy ? 'loading' : (failed ? 'error' : (needsQuestion ? 'needs-question' : (actualButton.disabled ? 'disabled' : 'ready')));
      if (busy && !/正在|生成中|整理中|处理中/.test(label)) label = '正在整理第一次到店卡。' + label;
      if (!label) label = busy ? '正在整理第一次到店卡' : (needsQuestion ? '请先问一个问题，再生成第一次到店卡' : '生成第一次到店卡');
      actualButton.setAttribute('aria-label', label);
      actualButton.setAttribute('aria-busy', busy ? 'true' : 'false');
      actualButton.setAttribute('data-hk-arrival-state', state);
      actualButton.setAttribute('title', busy ? '正在整理到店卡，请稍候' : (needsQuestion ? '请先向 AI 接待员问一个问题' : (failed ? label : '根据这次对话整理第一次到店卡')));
    }
    if (actualButton && buttonParent) {
      buttonMarker = element('span', 'hk-room-arrival-origin');
      buttonMarker.hidden = true;
      buttonMarker.setAttribute('aria-hidden', 'true');
      buttonParent.insertBefore(buttonMarker, actualButton);
      arrivalSlot = element('div', 'hk-room-arrival-slot');
      chat.appendChild(arrivalSlot);
      actualButton.classList.add('hk-room-arrival-button');
      arrivalSlot.appendChild(actualButton);
      syncArrivalName();
      if (window.MutationObserver) {
        buttonObserver = new MutationObserver(syncArrivalName);
        buttonObserver.observe(actualButton, { attributes:true, attributeFilter:['disabled','class'], childList:true, characterData:true, subtree:true });
      }
    }

    function cleanup() {
      if (disposed) return;
      disposed = true;
      if (buttonObserver) buttonObserver.disconnect();
      images.forEach(function (img) { img.onerror = null; });
      if (actualButton) {
        if (!alreadyArrivalClass) actualButton.classList.remove('hk-room-arrival-button');
        if (priorButtonAria === null) actualButton.removeAttribute('aria-label');
        else actualButton.setAttribute('aria-label', priorButtonAria);
        if (priorButtonTitle === null) actualButton.removeAttribute('title');
        else actualButton.setAttribute('title', priorButtonTitle);
        if (priorButtonBusy === null) actualButton.removeAttribute('aria-busy');
        else actualButton.setAttribute('aria-busy', priorButtonBusy);
        if (priorArrivalState === null) actualButton.removeAttribute('data-hk-arrival-state');
        else actualButton.setAttribute('data-hk-arrival-state', priorArrivalState);
        if (arrivalSlot && actualButton.parentNode === arrivalSlot) {
          var replacement = buttonParent && buttonParent.querySelector('.card-callout');
          if (replacement && replacement !== actualButton) actualButton.remove();
          else if (buttonMarker && buttonMarker.parentNode === buttonParent) buttonParent.insertBefore(actualButton, buttonMarker);
          else if (buttonParent) buttonParent.insertBefore(actualButton, buttonNext && buttonNext.parentNode === buttonParent ? buttonNext : null);
        }
      }
      if (buttonMarker) buttonMarker.remove();
      if (arrivalSlot) arrivalSlot.remove();
      added.forEach(function (node) { node.remove(); });
      textPatches.forEach(function (patch) { patch.node.textContent = patch.value; });
      if (priorMarker === null) shell.removeAttribute('data-hk-room-editorial');
      else shell.setAttribute('data-hk-room-editorial', priorMarker);
      if (mounted.get(roomPage) === cleanup) mounted.delete(roomPage);
    }
    return cleanup;
  };
}());

/* Owner overview over the existing Demo data and existing React controls.
 * Does not submit forms, generate content, write storage, or request network data.
 */
(function registerOwnerDashboard() {
  'use strict';
  var FX = window.HKVisualFX = window.HKVisualFX || {};
  var mounted = new WeakMap();
  var storagePrefix = 'hometown-room:demo:1:';
  var cleanText = function (value, max) { return String(value == null ? '' : value).slice(0, max || 600); };
  var number = function (value) { return value !== null && value !== undefined && value !== '' && Number.isFinite(Number(value)) && Number(value) >= 0 ? Number(value) : null; };
  function el(tag, className, text) {
    var node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = cleanText(text, 2000);
    return node;
  }
  function add(parent, tag, className, text) { var node = el(tag, className, text); parent.appendChild(node); return node; }
  function button(parent, label, action, extra) {
    var node = add(parent, 'button', 'hk-owner-button' + (extra ? ' ' + extra : ''), label);
    node.type = 'button'; node.setAttribute('data-hk-owner-action', action); return node;
  }
  function readArray(key) {
    try { var value = JSON.parse(window.localStorage.getItem(key) || '[]'); return Array.isArray(value) ? value.slice(0, 40) : []; }
    catch (_) { return []; }
  }
  function routeShopId() {
    var route = (window.location.hash || window.location.pathname || '').replace(/^#/, '').split('?')[0].split('/').filter(Boolean);
    if (route[0] !== 'merchant' || route.length < 2) return '';
    try { return decodeURIComponent(route[route.length - 1]); } catch (_) { return ''; }
  }
  function dateLabel(value) {
    if (!value) return '';
    var date = new Date(value);
    if (!Number.isFinite(date.getTime())) return '';
    return date.toLocaleString('zh-CN', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false });
  }
  function context(root) {
    var id = routeShopId();
    var world = window.__STANDALONE_WORLD__;
    var baseline = world && world.dashboards && world.dashboards[id];
    var shop = world && world.data && Array.isArray(world.data.shops) && world.data.shops.find(function (item) { return item.id === id; });
    if (!baseline || !shop || !baseline.shop || baseline.shop.id !== id) return null;
    var output = root.querySelector('.merchant-output-view');
    var metrics = output ? Array.prototype.slice.call(output.querySelectorAll('.merchant-summary .metric-card')).map(function (node) {
      var strong = node.querySelector('strong');
      if (!strong) return null;
      return number((strong.childNodes[0] && strong.childNodes[0].textContent || '').trim());
    }) : [];
    var facts = readArray(storagePrefix + 'facts:' + id).filter(function (item) {
      return item && (!item.shopId || item.shopId === id);
    }).map(function (item) {
      return { question: cleanText(item.question, 180), category: cleanText(item.category, 60), source: cleanText(item.source || '店主补充', 60), addedAt: cleanText(item.addedAt || item.createdAt, 60) };
    });
    // Read only the current shop's recorded question metadata; no private text is shown.
    var questions = readArray(storagePrefix + 'questions:' + id).filter(function (item) {
      return item && (!item.shopId || item.shopId === id);
    }).map(function (item) { return { coverage: cleanText(item.coverage, 20), createdAt: cleanText(item.createdAt, 60) }; });
    var sourceGaps = Array.isArray(baseline.gaps) ? baseline.gaps : [];
    var gapNodes = output ? Array.prototype.slice.call(output.querySelectorAll('.gap-output-list > article')) : [];
    var gaps = gapNodes.map(function (node) {
      var heading = node.querySelector('strong');
      var question = cleanText(heading && heading.textContent, 200).replace(/^[“”"\s]+|[“”"\s]+$/g, '');
      var item = sourceGaps.find(function (gap) { return String(gap.question || '').trim() === question.trim(); }) || {};
      var count = node.querySelector('.gap-output-count');
      var countMatch = count && count.textContent.match(/\d+/);
      return { id: cleanText(item.id, 100), question: question, category: cleanText(item.category || (node.querySelector('div > span') || {}).textContent, 60), occurrences: countMatch ? Number(countMatch[0]) : number(item.occurrences), firstSeen: cleanText(item.firstSeen, 40), context: cleanText(item.exampleContext, 300) };
    });
    var summary = baseline.summary || {};
    var periodNode = output && output.querySelector('.merchant-summary__identity > span');
    return {
      id: id, shop: { name: cleanText(shop.name, 80), stamp: cleanText(shop.stamp || baseline.shop.stamp, 4) },
      period: cleanText(periodNode && periodNode.textContent || baseline.period || '周期未记录', 60),
      version: cleanText(baseline.shop.lastUpdated, 60), output: output,
      conversations: metrics[0] == null ? number(summary.conversations) : metrics[0],
      cards: metrics[1] == null ? number(summary.arrivalCards) : metrics[1],
      unresolved: metrics[3] == null ? number(summary.unresolved) : metrics[3],
      helpfulRate: metrics[2] == null ? number(summary.helpfulRate) : metrics[2],
      topics: (Array.isArray(baseline.questionClusters) ? baseline.questionClusters : []).map(function (item) { return { label: cleanText(item.label, 100), count: number(item.count), example: cleanText(item.example, 180) }; }).filter(function (item) { return item.label && item.count !== null; }),
      gaps: gaps, facts: facts, questions: questions,
      feedback: (Array.isArray(baseline.feedback) ? baseline.feedback : []).filter(function (item) { return item && item.quote; }).slice(0, 2).map(function (item) { return { quote: cleanText(item.quote, 300), tag: cleanText(item.tag, 60) }; }),
      seeds: (Array.isArray(baseline.contentSeeds) ? baseline.contentSeeds : []).map(function (item) { return { title: cleanText(item.title, 160), type: cleanText(item.type, 80), sources: (Array.isArray(item.sourceQuestions) ? item.sourceQuestions : []).map(function (text) { return cleanText(text, 100); }) }; })
    };
  }

  FX.mountOwnerDashboard = function mountOwnerDashboard(rootElement) {
    var root = rootElement && (rootElement.matches && rootElement.matches('.merchant-workbench') ? rootElement : (rootElement.closest && rootElement.closest('.merchant-workbench')) || rootElement.querySelector('.merchant-workbench'));
    if (!root || !root.isConnected) return function () {};
    if (mounted.has(root)) mounted.get(root)();
    var disposed = false, frame = 0, board = null, lastOutput = null, signature = '', current = null, pending = null, detailsOpen = false;
    var navButton = null, navParent = null, observer = null, focusRecords = [];
    var attrs = ['data-hk-owner-module', 'data-hk-owner-mode', 'data-hk-owner-details'];
    var previous = attrs.map(function (name) { return { name: name, value: root.getAttribute(name) }; });

    function queue() { if (!disposed && !frame) frame = window.requestAnimationFrame(refresh); }
    function focusTarget(target) {
      if (!target) return;
      target.scrollIntoView({ behavior: 'auto', block: 'start' });
      var focus = target.matches('button,input,textarea,select,a[href]') ? target : target.querySelector('h2,h3,button,textarea') || target;
      if (!focus.hasAttribute('tabindex') && !focus.matches('button,input,textarea,select,a[href]')) { focus.setAttribute('tabindex', '-1'); focusRecords.push(focus); }
      try { focus.focus({ preventScroll: true }); } catch (_) { focus.focus(); }
    }
    function legacy(target) {
      detailsOpen = true; root.setAttribute('data-hk-owner-details', 'open');
      var toggle = board && board.querySelector('[data-hk-owner-action="details"]');
      if (toggle) { toggle.setAttribute('aria-expanded', 'true'); toggle.textContent = '收起原有问题与统计'; }
      if (target) focusTarget(target);
    }
    function originalTab(label) {
      return Array.prototype.slice.call(root.querySelectorAll('.workbench-switch > button:not(.hk-owner-nav-tab)')).find(function (node) { var strong = node.querySelector('strong'); return strong && strong.textContent.trim() === label; });
    }
    function navigate(type, question, title) {
      pending = { type: type, question: question || '', title: title || '', shopId: current && current.id, clicked: false, selected: false, attempts: 0 };
      processPending();
    }
    function processPending() {
      if (!pending || disposed) return;
      if (routeShopId() !== pending.shopId || ++pending.attempts > 30) { pending = null; return; }
      var target;
      if (pending.type === 'input') {
        var input = root.querySelector('.owner-input-view');
        if (input) {
          if (pending.question && !pending.selected) {
            var option = Array.prototype.slice.call(input.querySelectorAll('.owner-gap-suggestions button')).find(function (node) { var p = node.querySelector('p'); return p && p.textContent.trim() === pending.question.trim(); });
            pending.selected = true;
            if (option) { option.click(); queue(); return; }
          }
          target = input.querySelector('.owner-fact-form textarea') || input.querySelector('.owner-fact-editor');
        } else if (!pending.clicked) { var inputTab = originalTab('店主资料'); pending.clicked = true; if (inputTab) inputTab.click(); }
      } else {
        var output = root.querySelector('.merchant-output-view');
        if (output) {
          target = output.querySelector('.content-studio');
          if (pending.title) target = Array.prototype.slice.call(output.querySelectorAll('.content-seed')).find(function (node) { var h3 = node.querySelector('h3'); return h3 && h3.textContent.trim() === pending.title.trim(); }) || target;
        } else if (!pending.clicked) { var outputTab = originalTab('游客回声'); pending.clicked = true; if (outputTab) outputTab.click(); }
      }
      if (target) { pending = null; focusTarget(target); }
      else queue();
    }
    function ensureNav() {
      var nav = root.querySelector('.workbench-switch');
      if (!nav || nav === navParent && navButton && navButton.isConnected) return;
      if (navButton) navButton.remove();
      navParent = nav;
      navButton = el('button', 'hk-owner-nav-tab'); navButton.type = 'button';
      navButton.setAttribute('data-hk-owner-action', 'content');
      navButton.title = '跳转到当前店铺原有的内容工坊';
      add(navButton, 'span', '', '内容工坊'); add(navButton, 'small', '', '从问题生成内容 ↓');
      nav.appendChild(navButton);
    }
    function panel(parent, className, title, note) {
      var section = add(parent, 'section', 'hk-owner-panel ' + className);
      var header = add(section, 'header', 'hk-owner-panel__header'); add(header, 'h2', '', title);
      if (note) add(header, 'p', '', note);
      return section;
    }
    function build(data) {
      var section = el('section', 'hk-owner-dashboard'); section.setAttribute('aria-label', '经营行动台');
      var header = add(section, 'header', 'hk-owner-dashboard__header');
      var identity = add(header, 'div', 'hk-owner-dashboard__identity'); add(identity, 'span', 'hk-owner-stamp', data.shop.stamp || '店');
      var heading = add(identity, 'div'); add(heading, 'p', 'hk-owner-kicker', data.shop.name + ' · 店主工作台'); add(heading, 'h1', '', '听见游客的问题'); add(heading, 'p', 'hk-owner-lede', '看懂犹豫，补上下一次接待需要的资料。');
      var period = add(header, 'p', 'hk-owner-period'); add(period, 'span', '', data.period); add(period, 'strong', '', 'Demo 统计示例');
      var summary = add(section, 'section', 'hk-owner-summary'); summary.setAttribute('aria-label', '本期接待摘要'); add(summary, 'h2', '', '本期接待摘要');
      [[data.conversations, '对话次数'], [data.cards, '到店卡生成'], [data.unresolved, '未解决资料缺口']].forEach(function (item) { var metric = add(summary, 'div', 'hk-owner-summary__metric'); add(metric, 'strong', '', item[0] == null ? '—' : item[0]); add(metric, 'span', '', item[1]); });
      add(summary, 'p', 'hk-owner-stat-note', '到店卡生成不等于实际到店。待补列表与本机保存状态独立核对。');
      var grid = add(section, 'div', 'hk-owner-grid');

      var themes = panel(grid, 'hk-owner-topics', '游客反复关心什么', '主题出现次数，同一问题可涉及多个主题。以下沿用当前店铺的 Demo 主题。');
      if (data.topics.length) {
        var max = Math.max.apply(Math, data.topics.map(function (item) { return item.count; }).concat([1]));
        var step = max <= 5 ? 1 : max <= 20 ? 5 : 10; var scale = Math.ceil(max / step) * step;
        var axis = add(themes, 'div', 'hk-owner-axis'); axis.setAttribute('aria-hidden', 'true');
        for (var tick = 0; tick <= scale; tick += step) add(axis, 'span', '', tick);
        var list = add(themes, 'ol', 'hk-owner-topic-list');
        data.topics.forEach(function (item) {
          var row = add(list, 'li', 'hk-owner-topic-row'); var top = add(row, 'div', 'hk-owner-topic-row__heading'); add(top, 'h3', '', item.label); add(top, 'span', 'hk-owner-count', item.count + ' 次');
          var track = add(row, 'div', 'hk-owner-topic-track'); track.setAttribute('aria-hidden', 'true'); add(track, 'i', '').style.width = Math.max(0, Math.min(100, item.count / scale * 100)).toFixed(3) + '%';
          if (item.example) add(row, 'p', '', '“' + item.example + '”');
        });
      } else add(themes, 'p', 'hk-owner-empty', '还没有收到可展示的问题主题。');
      button(themes, '查看原有问题 →', 'questions', 'hk-owner-button--text');

      var priorities = panel(grid, 'hk-owner-priorities', '优先补充', '先补这一条，下一次更好回答。沿用现有待补列表顺序。');
      if (data.gaps.length) data.gaps.forEach(function (gap, index) {
        var item = add(priorities, 'article', 'hk-owner-gap' + (index === 0 ? ' hk-owner-gap--first' : ''));
        var meta = add(item, 'div', 'hk-owner-gap__meta'); add(meta, 'span', '', gap.category || '待补资料'); add(meta, 'span', 'hk-owner-gap__state', '资料未覆盖');
        add(item, 'h3', '', gap.question); add(item, 'p', 'hk-owner-gap__count', (gap.occurrences == null ? '次数未记录' : 'Demo 中出现 ' + gap.occurrences + ' 次') + (gap.firstSeen ? ' · 首次记录 ' + gap.firstSeen : ''));
        if (gap.context) add(item, 'p', '', gap.context);
        var actions = add(item, 'div', 'hk-owner-gap__actions'); var edit = button(actions, '去补充资料 →', 'input'); edit.setAttribute('data-hk-gap-index', String(index)); var view = button(actions, '查看问题', 'gap', 'hk-owner-button--text'); view.setAttribute('data-hk-gap-index', String(index));
      });
      else { add(priorities, 'p', 'hk-owner-empty', '当前未解决列表为空。'); add(priorities, 'p', 'hk-owner-caption', '这不代表所有未来问题都已覆盖。'); button(priorities, '查看店主资料 →', 'input'); }

      var coverage = panel(grid, 'hk-owner-coverage', '哪些问题还没回答好', '仅汇总本机当前店铺留存的提问覆盖元数据，不计作对话人数。');
      var counts = { full: 0, partial: 0, missing: 0 }; var unknown = 0;
      data.questions.forEach(function (item) { if (Object.prototype.hasOwnProperty.call(counts, item.coverage)) counts[item.coverage]++; else unknown++; });
      var total = counts.full + counts.partial + counts.missing;
      if (total) {
        var bar = add(coverage, 'div', 'hk-owner-coverage-bar'); bar.setAttribute('aria-hidden', 'true');
        ['full', 'partial', 'missing'].forEach(function (key) { var part = add(bar, 'span', 'hk-owner-coverage-' + key); part.style.width = (counts[key] / total * 100).toFixed(3) + '%'; });
      } else add(coverage, 'p', 'hk-owner-empty', '当前暂无可核对覆盖统计');
      var legend = add(coverage, 'ul', 'hk-owner-coverage-legend');
      [['full', '完整回答'], ['partial', '需确认'], ['missing', '资料缺失']].forEach(function (entry) { var li = add(legend, 'li', 'hk-owner-coverage-legend--' + entry[0]); add(li, 'span', '', entry[1]); add(li, 'strong', '', total ? counts[entry[0]] + ' 条' : '—'); });
      add(coverage, 'p', 'hk-owner-caption', total ? '本机留存 ' + data.questions.length + ' 条提问，覆盖状态可核对 ' + total + ' 条' + (unknown ? '，另有 ' + unknown + ' 条口径待核对' : '') + '。仅代表记录的意图覆盖，不代表事实永久准确或游客满意。' : (unknown ? '本机有 ' + unknown + ' 条提问，但覆盖状态尚不可核对。' : '') + '没有覆盖分母，不展示猜测比例。本机最多保留 40 条提问，不能据此推算经营趋势。');
      button(coverage, '查看已有问题 →', 'questions', 'hk-owner-button--text');

      var feedback = panel(grid, 'hk-owner-feedback', '游客带走了什么', '以下为原有 Demo 体验回声；主观体验不作为营业事实。');
      if (data.feedback.length) data.feedback.forEach(function (item) { var quote = add(feedback, 'figure', 'hk-owner-quote'); add(quote, 'blockquote', '', '“' + item.quote + '”'); add(quote, 'figcaption', '', '匿名体验摘录 · ' + (item.tag || 'Demo 回声')); });
      else add(feedback, 'p', 'hk-owner-empty', '暂无可展示的体验回声。');
      button(feedback, '查看原有体验回声 →', 'feedback', 'hk-owner-button--text');

      var updates = panel(grid, 'hk-owner-updates', '最近资料更新', '保存记录、后续回答引用和游客反馈是不同的证据。');
      var datedFacts = data.facts.filter(function (item) { return item.question && dateLabel(item.addedAt); }).slice(0, 3);
      if (datedFacts.length) { var updatesList = add(updates, 'ul', 'hk-owner-update-list'); datedFacts.forEach(function (item) { var li = add(updatesList, 'li'); add(li, 'strong', '', item.question); var time = add(li, 'time', '', dateLabel(item.addedAt)); time.dateTime = item.addedAt; add(li, 'span', '', item.source + (item.category ? ' · ' + item.category : '')); }); }
      else add(updates, 'p', 'hk-owner-empty', '暂无可核对的更新记录。');
      if (data.version) add(updates, 'p', 'hk-owner-caption', '源资料版本 ' + data.version + '，该静态日期不是操作时间线；暂无回答引用次数记录。');
      button(updates, '查看店主资料 →', 'input', 'hk-owner-button--text');

      var content = panel(grid, 'hk-owner-content', '从问题主题生成内容', '复用原有内容素材与生成入口，不搬用游客个人原话作营销。');
      if (data.seeds.length) data.seeds.slice(0, 2).forEach(function (seed, index) { var item = add(content, 'article', 'hk-owner-seed'); add(item, 'span', 'hk-owner-caption', seed.type); add(item, 'h3', '', seed.title); add(item, 'p', '', '来源主题 · ' + (seed.sources.join('、') || '原内容素材')); var open = button(item, '查看这条素材 →', 'seed', 'hk-owner-button--text'); open.setAttribute('data-hk-seed-index', String(index)); });
      else add(content, 'p', 'hk-owner-empty', '当前店铺暂无内容素材。');
      button(content, '进入原有内容工坊 →', 'content');

      // Two reading columns share the same live data and original action delegates.
      var mainColumn = add(grid, 'div', 'hk-owner-main-column');
      var sideColumn = add(grid, 'div', 'hk-owner-side-column');
      mainColumn.append(summary, themes, coverage, feedback);
      sideColumn.append(priorities, updates, content);

      var foot = add(section, 'footer', 'hk-owner-dashboard__footer');
      add(foot, 'p', '', '统计说明：对话次数不等于消息数或独立游客数；未解决项为资料问题项数。' + (data.helpfulRate == null ? '' : '原有帮助率 ' + data.helpfulRate + '% 保留在原统计详情，样本量与分母口径待核对。'));
      var details = button(foot, detailsOpen ? '收起原有问题与统计' : '查看原有问题与统计', 'details', 'hk-owner-button--text'); details.setAttribute('aria-expanded', String(detailsOpen));
      var status = add(section, 'p', 'hk-owner-dashboard__status'); status.setAttribute('role', 'status'); status.setAttribute('aria-live', 'polite');
      return section;
    }
    function onClick(event) {
      var trigger = event.target.closest('[data-hk-owner-action]');
      if (!trigger || !root.contains(trigger) || !current) return;
      var action = trigger.getAttribute('data-hk-owner-action');
      if (action === 'input') { var gap = current.gaps[Number(trigger.getAttribute('data-hk-gap-index'))]; navigate('input', trigger.hasAttribute('data-hk-gap-index') && gap ? gap.question : ''); }
      else if (action === 'content') navigate('content');
      else if (action === 'seed') { var seed = current.seeds[Number(trigger.getAttribute('data-hk-seed-index'))]; navigate('content', '', seed && seed.title); }
      else if (action === 'questions') legacy(root.querySelector('.question-panel'));
      else if (action === 'feedback') legacy(root.querySelector('.feedback-board'));
      else if (action === 'gap') { var rows = root.querySelectorAll('.gap-output-list > article'); legacy(rows[Number(trigger.getAttribute('data-hk-gap-index'))] || root.querySelector('.gap-output-panel')); }
      else if (action === 'details') { if (detailsOpen) { detailsOpen = false; root.setAttribute('data-hk-owner-details', 'closed'); trigger.setAttribute('aria-expanded', 'false'); trigger.textContent = '查看原有问题与统计'; } else legacy(root.querySelector('.merchant-summary')); }
    }
    function refresh() {
      frame = 0;
      if (disposed || !root.isConnected) return;
      current = context(root);
      if (!current) { if (board) board.remove(); board = null; root.removeAttribute('data-hk-owner-mode'); return; }
      root.setAttribute('data-hk-owner-module', 'ready'); ensureNav();
      if (!current.output) { board = null; lastOutput = null; signature = ''; root.setAttribute('data-hk-owner-mode', 'input'); processPending(); return; }
      var nextSignature = JSON.stringify([current.id, current.period, current.conversations, current.cards, current.unresolved, current.helpfulRate, current.topics, current.gaps, current.questions, current.facts, current.feedback, current.seeds]);
      if (lastOutput !== current.output || signature !== nextSignature || !board || !board.isConnected) {
        if (board) board.remove();
        board = build(current); current.output.insertBefore(board, current.output.firstChild);
        signature = nextSignature; lastOutput = current.output;
      }
      root.setAttribute('data-hk-owner-mode', 'output'); root.setAttribute('data-hk-owner-details', detailsOpen ? 'open' : 'closed');
      processPending();
    }
    function onStorage(event) { var id = routeShopId(); if (event.key === storagePrefix + 'facts:' + id || event.key === storagePrefix + 'questions:' + id) queue(); }
    function cleanup() {
      if (disposed) return;
      disposed = true; pending = null;
      if (frame) window.cancelAnimationFrame(frame);
      if (observer) observer.disconnect();
      root.removeEventListener('click', onClick); window.removeEventListener('hashchange', queue); window.removeEventListener('storage', onStorage);
      if (board) board.remove(); if (navButton) navButton.remove();
      focusRecords.forEach(function (node) { if (node.getAttribute('tabindex') === '-1') node.removeAttribute('tabindex'); });
      previous.forEach(function (item) { if (item.value === null) root.removeAttribute(item.name); else root.setAttribute(item.name, item.value); });
      if (mounted.get(root) === cleanup) mounted.delete(root);
    }
    mounted.set(root, cleanup); root.addEventListener('click', onClick); window.addEventListener('hashchange', queue); window.addEventListener('storage', onStorage);
    observer = new MutationObserver(function (records) {
      if (records.some(function (record) { return !record.target.closest || !record.target.closest('.hk-owner-dashboard,.hk-owner-nav-tab'); })) queue();
    });
    observer.observe(root, { childList: true, subtree: true, characterData: true });
    refresh();
    return cleanup;
  };
}());

/* Merchant entry card: 3D tilt following pointer, Material-style elevation. */
(function mountMerchantEntryTilt() {
  'use strict';
  var mounted = new WeakSet();
  function attach(card) {
    if (mounted.has(card)) return;
    mounted.add(card);
    card.style.transformStyle = 'preserve-3d';
    card.style.willChange = 'transform';
    card.style.transition = 'box-shadow .4s ease';
    var target = { x: 0, y: 0 };
    var current = { x: 0, y: 0 };
    var raf = 0;
    function frame() {
      raf = 0;
      current.x += (target.x - current.x) * 0.12;
      current.y += (target.y - current.y) * 0.12;
      var rx = (-current.y * 6).toFixed(2);
      var ry = (current.x * 8).toFixed(2);
      card.style.transform = 'perspective(1000px) rotateX(' + rx + 'deg) rotateY(' + ry + 'deg) translateZ(0)';
      var energy = Math.min(1, Math.hypot(current.x, current.y));
      card.style.boxShadow = '0 8px 24px rgba(30,40,35,0.08), 0 ' + (12 + energy * 20) + 'px ' + (32 + energy * 40) + 'px rgba(30,40,35,' + (0.10 + energy * 0.10).toFixed(3) + ')';
      if (Math.abs(target.x - current.x) > 0.01 || Math.abs(target.y - current.y) > 0.01) raf = requestAnimationFrame(frame);
    }
    function wake() { if (!raf) raf = requestAnimationFrame(frame); }
    card.addEventListener('pointermove', function (e) {
      var r = card.getBoundingClientRect();
      target.x = ((e.clientX - r.left) / r.width - 0.5) * 2;
      target.y = ((e.clientY - r.top) / r.height - 0.5) * 2;
      wake();
    });
    card.addEventListener('pointerleave', function () {
      target.x = 0; target.y = 0; wake();
    });
  }
  function scan() {
    document.querySelectorAll('.merchant-entry-card').forEach(attach);
  }
  new MutationObserver(scan).observe(document.body, { childList: true, subtree: true });
  scan();
}());

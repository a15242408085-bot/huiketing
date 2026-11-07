/* Local, opt-in question planning. This module never submits a chat message. */
(function registerTodayPlanner() {
  'use strict';
  var FX = window.HKVisualFX = window.HKVisualFX || {};
  var mounted = new WeakMap();
  var serial = 0;
  var pendingDraft = null;
  var PENDING_LIFETIME = 60000;
  var NEEDS = [
    { value: 'hot', label: '吃口热的' },
    { value: 'quiet', label: '安静坐会儿' },
    { value: 'craft', label: '看看手艺' }
  ];
  var TIMES = [
    { value: 'short', label: '半小时' },
    { value: 'medium', label: '一两个小时' },
    { value: 'halfday', label: '半天' }
  ];
  var CARDS = [
    { id: 'quiet', label: '安静片刻', title: '找个能安静坐一会儿的地方',
      question: '我想读会儿书，怎么选座、点什么合适？', match: /安静/, empty: '本镇暂无独立的安静处境资料，座位与停留时间需向店主确认。' },
    { id: 'rain', label: '先问怎么到', title: '下雨了，先确认怎么进门',
      question: '下雨时，石阶、台阶和门槛需要注意什么？', match: /下雨|路滑/, empty: '本镇暂无对应的雨天处境资料，通行情况需向店主确认。' },
    { id: 'hot', label: '一口热的', title: '先吃热的，再慢慢走',
      question: '我想吃份量刚好的热食，今天还供应吗？', match: /热的|热食/, empty: '本镇暂无对应的热食处境资料，供应与份量需向店主确认。' },
    { id: 'short', label: '不急着赶路', title: '只有一点时间，也不想赶路',
      question: '时间有限，哪家店更适合先停一下？', match: /只有半天|赶时间/, empty: '本镇暂无独立的短暂停留处境资料，可以直接询问你想去的店。' },
    { id: 'diet', label: '先说清忌口', title: '点单前，先把忌口说清楚',
      question: '哪些配料需要避开，哪些还要向店主确认？', match: /忌口/, empty: '本镇暂无独立的忌口处境资料，配料与能否调整需逐项向店主确认。' },
    { id: 'story', label: '听一件小事', title: '等雨时，了解一件小事',
      question: '食物、旧物或手艺，有什么自己的故事？', match: /故事|手艺|小东西/, empty: '本镇暂无对应的故事处境资料，可以直接问店主愿意讲哪件小事。' }
  ];

  function list(value) {
    if (Array.isArray(value)) return value;
    return value && typeof value === 'object' ? Object.keys(value).map(function (key) { return value[key]; }) : [];
  }
  function string(value) { return typeof value === 'string' ? value : ''; }
  function node(tag, className, content) {
    var el = document.createElement(tag);
    if (className) el.className = className;
    if (content !== undefined) el.textContent = String(content);
    return el;
  }
  function button(className, content, action) {
    var el = node('button', className, content);
    el.type = 'button';
    if (action) el.dataset.action = action;
    return el;
  }
  function routeParts() {
    try { return location.hash.replace(/^#\/?/, '').split('?')[0].split('/').map(decodeURIComponent); }
    catch (_) { return []; }
  }
  function findTown(page, towns) {
    var parts = routeParts();
    var id = parts[0] === 'visit' ? parts[2] : '';
    var match = towns.find(function (town) { return town && town.id === id; });
    if (match) return match;
    var heading = page.querySelector('.town-hero h1');
    var title = heading ? heading.textContent.trim() : '';
    return towns.find(function (town) { return town && town.name === title; }) || null;
  }
  function labelFor(items, value) {
    var item = items.find(function (entry) { return entry.value === value; });
    return item ? item.label : '';
  }
  function scrollTo(el) {
    if (!el) return;
    var reduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    el.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth', block: 'start' });
  }
  function icon(kind) {
    var ns = 'http://www.w3.org/2000/svg';
    var svg = document.createElementNS(ns, 'svg');
    svg.setAttribute('viewBox', '0 0 32 32');
    svg.setAttribute('width', '30'); svg.setAttribute('height', '30');
    svg.setAttribute('fill', 'none'); svg.setAttribute('stroke', 'currentColor');
    svg.setAttribute('stroke-width', '1.35'); svg.setAttribute('stroke-linecap', 'round');
    svg.setAttribute('stroke-linejoin', 'round'); svg.setAttribute('aria-hidden', 'true');
    var paths = {
      quiet: ['M5 6h10v20H5zM17 9h10v17H17zM4 28h25M9 10h2M21 13h2'],
      rain: ['M3 15a13 13 0 0 1 26 0H3zM16 3v23c0 5-6 5-6 0M7 21l-1 3M24 21l-1 3'],
      hot: ['M4 17h24a12 11 0 0 1-24 0zM10 29h12M10 4c-4 4 4 5 0 9M17 2c-4 4 4 5 0 10M24 4c-4 4 4 5 0 9'],
      short: ['M16 4a12 12 0 1 0 12 12A12 12 0 0 0 16 4zM16 9v8h6'],
      diet: ['M9 3v10M5 3v6a4 4 0 0 0 8 0V3M9 13v16M24 3c-7 6-7 14 0 14V3zM24 17v12'],
      story: ['M16 7C12 4 7 4 3 6v21c4-2 9-2 13 1 4-3 9-3 13-1V6c-4-2-9-2-13 1zM16 7v21']
    };
    (paths[kind] || paths.story).forEach(function (d) {
      var path = document.createElementNS(ns, 'path'); path.setAttribute('d', d); svg.appendChild(path);
    });
    return svg;
  }

  /* Called after the original room mounts; deliberately fills only an empty composer. */
  FX.applyTodayPlannerDraft = function applyTodayPlannerDraft(roomPage) {
    if (!pendingDraft) return false;
    if (Date.now() - pendingDraft.created > PENDING_LIFETIME) { pendingDraft = null; return false; }
    var parts = routeParts();
    if (parts[0] !== 'room' || parts[1] !== pendingDraft.townId || parts[2] !== pendingDraft.shopId) return false;
    var composer = roomPage && roomPage.querySelector('.composer textarea, .chat-panel textarea');
    if (!composer || composer.disabled || composer.readOnly) return false;
    if (composer.value.trim() && composer.value.trim() !== pendingDraft.text.trim()) {
      /* Existing unsent text wins. The user can return to their planner instead of losing it. */
      pendingDraft = null;
      return false;
    }
    var setter = Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, 'value').set;
    setter.call(composer, pendingDraft.text);
    composer.dispatchEvent(new Event('input', { bubbles: true }));
    composer.dispatchEvent(new Event('change', { bubbles: true }));
    pendingDraft = null;
    try { composer.focus({ preventScroll: true }); composer.setSelectionRange(composer.value.length, composer.value.length); } catch (_) {}
    return true;
  };

  FX.mountTodayPlanner = function mountTodayPlanner(townPage) {
    if (!townPage || !townPage.isConnected) return function () {};
    if (mounted.has(townPage)) mounted.get(townPage)();
    var world = window.__STANDALONE_WORLD__;
    var data = world && world.data || {};
    var towns = list(data.towns);
    var town = findTown(townPage, towns);
    if (!town) return function () {};
    var shops = list(data.shops).filter(function (shop) { return shop && shop.townId === town.id; });
    var scenarios = list(data.scenarios).filter(function (scenario) { return scenario && scenario.townId === town.id; });
    var originalScenarios = townPage.querySelector('.town-scenarios, .scenarios-section');
    var originalShops = townPage.querySelector('.town-shop-grid, .shop-grid');
    var uid = 'hk-today-' + (++serial);
    var disposed = false;
    var state = { need: '', time: '', company: '', budget: '', diet: '', luggage: '', rain: false, selected: '', dirty: false, shopId: '' };
    var oldMarker = townPage.getAttribute('data-hk-today-planner');
    var root = node('section', 'hk-today-planner');
    root.id = uid; root.setAttribute('aria-labelledby', uid + '-title');
    var left = node('div', 'hk-today-planner__conditions');
    var right = node('div', 'hk-today-planner__choices');
    var eyebrow = node('p', 'hk-today-planner__eyebrow', '从你的今天开始');
    var title = node('h2', 'hk-today-planner__title'); title.id = uid + '-title';
    title.append(node('span', 'hk-today-planner__title-line', '今天，'), node('span', 'hk-today-planner__title-line', '想怎么过？'));
    left.append(eyebrow, title, node('p', 'hk-today-planner__intro', '看看天，也照顾一下你现在的需要。'));

    var weather = node('div', 'hk-today-planner__weather');
    var weatherSymbol = node('div', 'hk-today-planner__weather-symbol'); weatherSymbol.append(icon('rain'));
    var weatherCopy = node('div', 'hk-today-planner__weather-copy');
    var weatherHead = node('div', 'hk-today-planner__weather-head');
    weatherHead.append(node('span', '', town.name), node('span', 'hk-today-planner__demo', '天气示例，非实时'));
    var weatherMain = node('div', 'hk-today-planner__weather-main');
    weatherMain.append(node('strong', '', '12℃'), node('span', '', '小雨'));
    weatherCopy.append(weatherMain, weatherHead, node('p', 'hk-today-planner__weather-note', '天气仅为示例，不代表当地当前天气。'));
    var weatherLabel = node('label', 'hk-today-planner__weather-switch');
    var weatherInput = node('input'); weatherInput.type = 'checkbox'; weatherInput.dataset.field = 'rain';
    weatherLabel.append(weatherInput, node('span', '', '用小雨示例试排')); weatherCopy.append(weatherLabel);
    weather.append(weatherSymbol, weatherCopy); left.append(weather);

    function fieldset(legendText, key, choices) {
      var field = node('fieldset', 'hk-today-planner__field');
      field.append(node('legend', '', legendText));
      var options = node('div', 'hk-today-planner__options');
      choices.forEach(function (choice) {
        var option = button('hk-today-planner__option', choice.label, 'condition');
        option.dataset.key = key; option.dataset.value = choice.value; option.setAttribute('aria-pressed', 'false'); options.append(option);
      });
      field.append(options); return field;
    }
    left.append(fieldset('你现在更想？', 'need', NEEDS), fieldset('有多久？', 'time', TIMES));
    var extras = node('details', 'hk-today-planner__extras');
    var summary = node('summary', '', '再补充一点：同行 / 预算 / 忌口 / 行李'); extras.append(summary);
    var extraFields = node('div', 'hk-today-planner__extra-fields');
    function extraField(labelText, key, options, placeholder) {
      var label = node('label', 'hk-today-planner__extra-field');
      label.append(node('span', '', labelText));
      var input;
      if (options) {
        input = node('select');
        options.forEach(function (option) {
          var item = node('option', '', option[1]); item.value = option[0]; input.append(item);
        });
      } else {
        input = node('input'); input.type = 'text'; input.maxLength = key === 'diet' ? 80 : 40;
        input.placeholder = placeholder; input.autocomplete = 'off';
      }
      input.dataset.field = key; label.append(input); extraFields.append(label);
    }
    extraField('同行', 'company', [['', '暂不填写'], ['一个人', '一个人'], ['和朋友同行', '和朋友同行'], ['带孩子同行', '带孩子同行'], ['带长辈同行', '带长辈同行']]);
    extraField('预算', 'budget', null, '如：每人 30 元以内');
    extraField('忌口', 'diet', null, '如：不吃葱；按实际情况填写');
    extraField('行李', 'luggage', [['', '暂不填写'], ['没带行李', '没带行李'], ['带着行李箱', '带着行李箱'], ['带着大件行李', '带着大件行李']]);
    extras.append(extraFields, node('p', 'hk-today-planner__privacy', '仅用于这次整理问题，不保存个人偏好。')); left.append(extras);
    var leftActions = node('div', 'hk-today-planner__left-actions');
    leftActions.append(button('hk-today-planner__text-button', '清除条件', 'clear'), button('hk-today-planner__text-button', '不设置，直接看店铺 →', 'skip'));
    left.append(leftActions);

    var choicesHead = node('div', 'hk-today-planner__choices-head');
    var choicesTitles = node('div');
    var choicesTitle = node('h3', '', '先看看这六种处境');
    var choicesIntro = node('p', '', '选一个问题，再选一家你想问的店。');
    choicesTitles.append(choicesTitle, choicesIntro);
    choicesHead.append(choicesTitles);
    right.append(choicesHead);
    var listStatus = node('p', 'hk-today-planner__list-status'); listStatus.setAttribute('role', 'status'); listStatus.setAttribute('aria-live', 'polite');
    right.append(listStatus);
    var grid = node('div', 'hk-today-planner__grid'); grid.setAttribute('aria-label', '选择要问的处境');
    var cardNodes = {};
    CARDS.forEach(function (card, index) {
      var cardEl = button('hk-today-card', undefined, 'scenario'); cardEl.dataset.id = card.id; cardEl.setAttribute('aria-pressed', 'false');
      var cardTop = node('span', 'hk-today-card__top');
      var cardBadge = node('span', 'hk-today-card__badge', '与你的选择相关'); cardBadge.hidden = true;
      cardTop.append(node('span', 'hk-today-card__index', '0' + (index + 1) + ' / ' + card.label), cardBadge);
      var cardBody = node('span', 'hk-today-card__body');
      var cardCopy = node('span', 'hk-today-card__copy');
      cardCopy.append(node('strong', 'hk-today-card__title', card.title), node('span', 'hk-today-card__question', '“' + card.question + '”'));
      cardBody.append(icon(card.id), cardCopy);
      var reason = node('span', 'hk-today-card__reason');
      var arrow = node('span', 'hk-today-card__arrow', '→'); arrow.setAttribute('aria-hidden', 'true');
      cardEl.append(cardTop, cardBody, reason, arrow);
      var local = scenarios.filter(function (scenario) { return card.match.test(string(scenario.label) + ' ' + string(scenario.description)); });
      cardNodes[card.id] = { card: card, el: cardEl, badge: cardBadge, reason: reason, scenarios: local, order: index };
      grid.append(cardEl);
    });
    var browseRow = node('div', 'hk-today-planner__browse-row');
    if (originalScenarios) browseRow.append(button('hk-today-planner__text-button', '查看全部处境 →', 'all'));
    browseRow.append(node('p', 'hk-today-planner__under-grid', '条件随时可改，不影响直接提问。'));
    right.append(grid, browseRow);

    var draftBox = node('div', 'hk-today-planner__draft');
    var draftHead = node('div', 'hk-today-planner__draft-head');
    var draftTitle = node('label', '', '替你把问题说清楚'); draftTitle.htmlFor = uid + '-draft';
    var rewrite = button('hk-today-planner__text-button', '按当前条件重写', 'rewrite'); rewrite.disabled = true;
    draftHead.append(draftTitle, rewrite);
    var textarea = node('textarea', 'hk-today-planner__draft-input'); textarea.id = uid + '-draft'; textarea.rows = 3; textarea.maxLength = 600;
    textarea.placeholder = '选一个处境生成草稿，也可以直接写下你的问题。'; textarea.dataset.field = 'draft';
    var draftNote = node('p', 'hk-today-planner__draft-note', '草稿可编辑。只有你确认后才会带入店铺问答，不会自动发送。'); draftNote.id = uid + '-draft-note';
    textarea.setAttribute('aria-describedby', draftNote.id);
    var draftActions = node('div', 'hk-today-planner__draft-actions');
    var shopLabel = node('label', 'hk-today-planner__shop'); shopLabel.append(node('span', '', '你想问哪家店？'));
    var shopSelect = node('select'); shopSelect.dataset.field = 'shopId';
    var blankShop = node('option', '', '请先选一家店'); blankShop.value = ''; shopSelect.append(blankShop);
    shops.forEach(function (shop) { var option = node('option', '', shop.name); option.value = shop.id; shopSelect.append(option); });
    shopLabel.append(shopSelect);
    var ask = button('hk-today-planner__ask', '编辑后提问 →', 'ask'); ask.disabled = true;
    draftActions.append(shopLabel, ask);
    var draftStatus = node('p', 'hk-today-planner__draft-status', '先选店，再将问题带入原来的聊天输入框。'); draftStatus.setAttribute('role', 'status'); draftStatus.setAttribute('aria-live', 'polite');
    var draftLayout = node('div', 'hk-today-planner__draft-layout'); draftLayout.append(textarea, draftActions);
    draftBox.append(draftHead, draftLayout, draftNote, draftStatus); right.append(draftBox);
    root.append(left, right);
    var foot = node('p', 'hk-today-planner__foot', '天气只提供环境参考；营业、座位与供应仍以店主资料和当天说明为准。'); root.append(foot);
    if (originalScenarios) originalScenarios.before(root); else townPage.append(root);
    townPage.setAttribute('data-hk-today-planner', town.id);

    function cardRanking(entry) {
      var id = entry.card.id;
      var score = 0; var reasons = [];
      if (state.need === id || (state.need === 'craft' && id === 'story')) { score += 6; reasons.push('你选了“' + labelFor(NEEDS, state.need) + '”'); }
      if (state.time === 'short' && (id === 'short' || id === 'hot')) { score += id === 'short' ? 5 : 2; reasons.push('你有“半小时”'); }
      if (state.time === 'medium' && id === 'quiet') { score += 3; reasons.push('你有“一两个小时”'); }
      if (state.time === 'halfday' && (id === 'story' || id === 'short')) { score += 2; reasons.push('你有“半天”'); }
      if (state.rain && id === 'rain') { score += 5; reasons.push('你启用了小雨示例，并非实时天气'); }
      if (state.diet.trim() && id === 'diet') { score += 7; reasons.push('你填写了忌口'); }
      if (/行李箱|大件/.test(state.luggage) && id === 'rain') { score += 4; reasons.push('你填写了行李'); }
      if (state.company === '一个人' && id === 'quiet') { score += 1; reasons.push('你选择了一个人'); }
      return { entry: entry, score: score, reason: reasons.join('；') };
    }
    function buildDraft() {
      var card = CARDS.find(function (entry) { return entry.id === state.selected; });
      if (!card) return '';
      var facts = [];
      if (state.need) facts.push('我想' + labelFor(NEEDS, state.need));
      if (state.time) facts.push('大概有' + labelFor(TIMES, state.time));
      if (state.company) facts.push(state.company === '一个人' ? '我一个人来' : '我' + state.company);
      if (state.budget.trim()) facts.push('预算是' + state.budget.trim());
      if (state.diet.trim()) facts.push('需要注意的忌口是' + state.diet.trim());
      if (state.luggage) facts.push('我' + state.luggage);
      if (state.rain && card.id !== 'rain') facts.push('也想了解下小雨时是否需要调整安排');
      return (facts.length ? facts.join('，') + '。' : '') + card.question;
    }
    function updateActions() {
      var validShop = shops.some(function (shop) { return shop.id === state.shopId; });
      ask.disabled = !validShop || !textarea.value.trim();
      rewrite.disabled = !state.selected;
      if (!shops.length) { shopSelect.disabled = true; draftStatus.textContent = '这个小镇尚无可进入的店铺；你仍可编辑问题并查看全部处境。'; return; }
      if (state.dirty) draftStatus.textContent = '你的编辑已保留。改变条件不会覆盖草稿，可点击“按当前条件重写”。';
      else if (!state.shopId) draftStatus.textContent = '请亲自选一家店；这里不会替你选店或发送问题。';
      else {
        var selectedEntry = cardNodes[state.selected];
        var localIds = selectedEntry ? selectedEntry.scenarios.reduce(function (ids, scenario) { return ids.concat(list(scenario.shopIds)); }, []) : [];
        draftStatus.textContent = localIds.length && localIds.indexOf(state.shopId) === -1
          ? '这家店未关联此处境资料，仍可直接提问；带入后请你确认并发送。'
          : '将带入所选店铺的输入框；你可继续修改，再点击原来的发送按钮。';
      }
    }
    function render() {
      if (disposed) return;
      root.querySelectorAll('[data-action="condition"]').forEach(function (option) {
        option.setAttribute('aria-pressed', String(state[option.dataset.key] === option.dataset.value));
      });
      var ranking = Object.keys(cardNodes).map(function (id) { return cardRanking(cardNodes[id]); });
      ranking.sort(function (a, b) { return b.score - a.score || a.entry.order - b.entry.order; });
      var related = ranking.filter(function (item) { return item.score > 0; }).slice(0, 2);
      ranking.forEach(function (item, rankIndex) {
        var entry = item.entry; var highlighted = related.indexOf(item) !== -1;
        entry.el.dataset.featured = String(rankIndex < 2);
        entry.el.dataset.related = String(highlighted);
        entry.el.dataset.coverage = entry.scenarios.length ? 'known' : 'missing';
        entry.badge.hidden = !highlighted;
        entry.el.setAttribute('aria-pressed', String(state.selected === entry.card.id));
        var coverage = entry.scenarios.length ? '可从本镇已有处境继续向店主确认。' : entry.card.empty;
        entry.reason.textContent = item.reason
          ? '排序依据：' + item.reason + '。' + (entry.scenarios.length ? '' : entry.card.empty)
          : coverage;
        grid.append(entry.el);
      });
      choicesTitle.textContent = related.length === 2 ? '先看看这两种安排' : related.length === 1 ? '先看看这一种安排' : '先看看这六种处境';
      choicesIntro.textContent = related.length ? '按你的选择调整顺序，仍可查看全部处境。' : '选一个问题，再选一家你想问的店。';
      listStatus.textContent = related.length ? '仅调整展示顺序，全部六种处境都保留；标记与店铺营业情况无关。' : '暂未设置条件，先保留原顺序。选哪一家、问哪一句，都由你决定。';
      if (state.selected && !state.dirty) textarea.value = buildDraft();
      updateActions();
    }
    function input(event) {
      var target = event.target;
      if (!target || !target.dataset) return;
      var field = target.dataset.field;
      if (field === 'draft') { state.dirty = true; updateActions(); return; }
      if (field === 'budget' || field === 'diet') { state[field] = target.value; render(); }
    }
    function change(event) {
      var target = event.target;
      if (!target || !target.dataset) return;
      var field = target.dataset.field;
      if (field === 'rain') state.rain = target.checked;
      else if (['company', 'luggage', 'shopId', 'budget', 'diet'].indexOf(field) !== -1) state[field] = target.value;
      else return;
      render();
    }
    function click(event) {
      var target = event.target.closest('button[data-action]');
      if (!target || !root.contains(target)) return;
      var action = target.dataset.action;
      if (action === 'condition') {
        var key = target.dataset.key; var value = target.dataset.value;
        state[key] = state[key] === value ? '' : value; render();
      } else if (action === 'scenario') {
        state.selected = target.dataset.id;
        if (!state.dirty) textarea.value = buildDraft();
        render();
      } else if (action === 'clear') {
        ['need', 'time', 'company', 'budget', 'diet', 'luggage'].forEach(function (key) { state[key] = ''; }); state.rain = false;
        root.querySelectorAll('[data-field]').forEach(function (field) {
          if (field.dataset.field === 'rain') field.checked = false;
          else if (['company', 'budget', 'diet', 'luggage'].indexOf(field.dataset.field) !== -1) field.value = '';
        });
        render();
      } else if (action === 'skip') { scrollTo(originalShops || originalScenarios); }
      else if (action === 'all') { scrollTo(originalScenarios); }
      else if (action === 'rewrite') { state.dirty = false; textarea.value = buildDraft(); updateActions(); }
      else if (action === 'ask') {
        var shop = shops.find(function (entry) { return entry.id === state.shopId; });
        var text = textarea.value.trim();
        if (!shop || !text) return;
        pendingDraft = { townId: town.id, shopId: shop.id, text: text, created: Date.now() };
        var anchor = Array.prototype.find.call(townPage.querySelectorAll('a[href]'), function (link) {
          try { return new URL(link.href, location.href).hash.split('?')[0] === '#/room/' + town.id + '/' + shop.id; } catch (_) { return false; }
        });
        /* Native shop link navigation preserves the original router; no scenario auto-send handler is called. */
        if (anchor) anchor.click();
        else location.hash = '/room/' + encodeURIComponent(town.id) + '/' + encodeURIComponent(shop.id);
      }
    }
    root.addEventListener('click', click); root.addEventListener('input', input); root.addEventListener('change', change);
    render();
    function cleanup() {
      if (disposed) return; disposed = true;
      root.removeEventListener('click', click); root.removeEventListener('input', input); root.removeEventListener('change', change);
      root.remove();
      if (oldMarker === null) townPage.removeAttribute('data-hk-today-planner'); else townPage.setAttribute('data-hk-today-planner', oldMarker);
      if (mounted.get(townPage) === cleanup) mounted.delete(townPage);
      /* A confirmed draft stays in module memory briefly until applyTodayPlannerDraft consumes it. */
    }
    mounted.set(townPage, cleanup);
    return cleanup;
  };
}());

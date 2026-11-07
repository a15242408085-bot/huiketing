(function () {
  'use strict';
  const FX = window.HKVisualFX = window.HKVisualFX || {};
  FX.mountContactSheet = function (intro, items) {
    if (!intro || !items || !items.length) return function () {};
    const media = matchMedia('(prefers-reduced-motion: reduce)');
    const panel = document.createElement('section');
    panel.className = 'hk-contact-sheet';
    panel.setAttribute('aria-label', '空间生成示意图展示');
    const toolbar = document.createElement('div');
    toolbar.className = 'hk-contact-sheet__toolbar';
    const label = document.createElement('span'); label.textContent = '空间示意 · 08';
    const pause = document.createElement('button');
    pause.type = 'button'; pause.className = 'hk-contact-sheet__pause';
    const field = document.createElement('div'); field.className = 'hk-contact-sheet__field';
    const note = document.createElement('p'); note.className = 'hk-contact-sheet__note';
    note.textContent = '生成图示意 · 点击查看';
    toolbar.append(label, pause); panel.append(toolbar, field, note);
    const steps = intro.querySelector('.journey-steps');
    intro.insertBefore(panel, steps); intro.classList.add('hk-with-contact-sheet');
    let paused = false, hovered = -1, opened = false, disposed = false, inView = true, frame = 0, last = 0, clock = 0;
    let returnFocus = null;
    const dialog = document.createElement('dialog'); dialog.className = 'hk-photo-dialog';
    dialog.setAttribute('aria-label', '空间示意图预览');
    const close = document.createElement('button'); close.type = 'button';
    close.className = 'hk-photo-dialog__close'; close.textContent = '关闭照片';
    const figure = document.createElement('figure'), large = document.createElement('img');
    const caption = document.createElement('figcaption'), credit = document.createElement('small');
    figure.append(large, caption, credit); dialog.append(close, figure); document.body.append(dialog);
    const directions = [[-.78,-.54],[.30,-.70],[.83,-.04],[-.72,.29],[.27,.73],[-.25,-.80],[.83,.65],[-.70,.76]];
    const cards = items.map(function (item, i) {
      const button = document.createElement('button'); button.type = 'button'; button.className = 'hk-contact-photo';
      button.setAttribute('aria-label', '查看' + item.title);
      const image = document.createElement('img'); image.src = item.src; image.alt = item.alt || item.title; image.decoding = 'async';
      button.append(image); field.append(button);
      const card = {button:button, item:item, progress:(i + .8) / items.length, direction:directions[i % directions.length]};
      button.addEventListener('pointerenter', function () { hovered = i; });
      button.addEventListener('pointerleave', function () { if (hovered === i) hovered = -1; });
      button.addEventListener('focus', function () { hovered = i; render(); });
      button.addEventListener('blur', function () { if (hovered === i) hovered = -1; });
      button.addEventListener('click', function () {
        returnFocus = button; opened = true; large.src = item.src; large.alt = item.alt || item.title;
        caption.textContent = item.title;
        credit.textContent = 'AI 生成示意图，不代表真实店铺或海岸实景。' + (item.photographer ? '摄影 / 来源：' + item.photographer : '');
        if (dialog.showModal) dialog.showModal(); else dialog.setAttribute('open', '');
        close.focus(); syncAnimation();
      });
      return card;
    });
    function updatePause() {
      pause.textContent = paused ? '播放影像' : '暂停影像'; pause.setAttribute('aria-pressed', String(paused));
      panel.dataset.paused = String(paused || media.matches);
    }
    function render() {
      const width = field.clientWidth, height = field.clientHeight;
      cards.forEach(function (card, i) {
        const p = card.progress, focus = hovered === i;
        const travel = .18 + 1.10 * Math.pow(p, 1.18);
        const cardWidth = Math.min(156, width * .27) * (.54 + p * .92);
        const cardHeight = cardWidth / 1.28;
        const x = card.direction[0] * width * .49 * travel;
        const y = card.direction[1] * height * .50 * travel;
        const opacity = focus ? 1 : Math.min(1, p / .14, (1.05 - p) / .15);
        card.button.style.width = cardWidth.toFixed(1) + 'px'; card.button.style.height = cardHeight.toFixed(1) + 'px';
        card.button.style.opacity = Math.max(.08, opacity).toFixed(3);
        card.button.style.zIndex = String(Math.round(p * 20));
        card.button.style.transform = 'translate(-50%,-50%) translate(' + x.toFixed(1) + 'px,' + y.toFixed(1) + 'px) rotate(' + ((i % 3 - 1) * 4).toFixed(1) + 'deg) scale(' + (focus ? 1.08 : 1) + ')';
        card.button.style.filter = p < .25 ? 'saturate(' + (.25 + p * 3).toFixed(2) + ')' : '';
      });
    }
    function tick(now) {
      frame = 0;
      if (!shouldAnimate()) return;
      if (!last) last = now;
      const delta = Math.min(60, now - last); last = now;
      if (!paused && !media.matches && !document.hidden && !opened && inView) {
        clock += delta;
        if (clock > 40) {
          const amount = clock * .000020 * (hovered >= 0 ? .40 : 1); clock = 0;
          cards.forEach(function (card, i) { if (hovered !== i) card.progress = (card.progress + amount) % 1; });
          render();
        }
      }
      frame = requestAnimationFrame(tick);
    }
    function shouldAnimate() { return !disposed && !paused && !media.matches && !document.hidden && !opened && inView; }
    function syncAnimation() { cancelAnimationFrame(frame); frame = 0; last = 0; if (shouldAnimate()) frame = requestAnimationFrame(tick); }
    function closeDialog() { if (dialog.open && dialog.close) dialog.close(); else { dialog.removeAttribute('open'); afterClose(); } }
    function afterClose() { opened = false; large.removeAttribute('src'); if (returnFocus && returnFocus.isConnected) returnFocus.focus(); syncAnimation(); }
    close.addEventListener('click', closeDialog); dialog.addEventListener('close', afterClose);
    dialog.addEventListener('click', function (event) { if (event.target === dialog) closeDialog(); });
    pause.addEventListener('click', function () { paused = !paused; updatePause(); syncAnimation(); });
    const resized = new ResizeObserver(render); resized.observe(field);
    const visible = new IntersectionObserver(function (entries) { inView = entries[0].isIntersecting; syncAnimation(); }); visible.observe(panel);
    function mediaChanged() { updatePause(); render(); syncAnimation(); }
    media.addEventListener('change', mediaChanged);
    document.addEventListener('visibilitychange', syncAnimation);
    updatePause(); render(); syncAnimation();
    return function () {
      disposed = true; cancelAnimationFrame(frame); resized.disconnect(); visible.disconnect(); media.removeEventListener('change', mediaChanged);
      document.removeEventListener('visibilitychange', syncAnimation);
      if (dialog.open && dialog.close) dialog.close(); dialog.remove(); panel.remove(); intro.classList.remove('hk-with-contact-sheet');
    };
  };
}());

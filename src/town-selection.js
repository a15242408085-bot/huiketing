(function () {
  'use strict';
  var FX = window.HKVisualFX = window.HKVisualFX || {};

  // 各地区 hero 渐变颜色（保证文字可读）
  var HERO_GRADIENTS = {
    jiangnan: 'linear-gradient(100deg, rgba(23,63,68,0.92) 0%, rgba(23,63,68,0.78) 38%, rgba(23,63,68,0.45) 70%, rgba(23,63,68,0.25) 100%)',
    mountain: 'linear-gradient(100deg, rgba(45,58,38,0.92) 0%, rgba(45,58,38,0.78) 38%, rgba(45,58,38,0.45) 70%, rgba(45,58,38,0.25) 100%)'
  };

  FX.mountRegionHeading = function (intro, photo, regionKey) {
    if (!intro || !photo || !photo.src) return function () {};
    var background = document.createElement('div');
    background.className = 'hk-region-heading-photo';
    background.setAttribute('aria-hidden', 'true');
    var image = document.createElement('img');
    image.src = photo.src;
    image.alt = '';
    image.decoding = 'async';
    background.appendChild(image);
    intro.prepend(background);
    intro.setAttribute('data-hk-region-heading', regionKey || 'jiangnan');
    function measureBackground() {
      if (!intro.isConnected) return;
      background.style.left = (-intro.getBoundingClientRect().left).toFixed(3) + 'px';
      background.style.width = document.documentElement.clientWidth + 'px';
    }
    measureBackground();
    window.addEventListener('resize', measureBackground, {passive: true});
    return function () {
      window.removeEventListener('resize', measureBackground);
      background.remove();
      intro.removeAttribute('data-hk-region-heading');
    };
  };

  // 选小镇页：给当前地区的小镇卡片挂照片
  FX.mountTownSelection = function (list, photoMap, regionKey) {
    if (!list || !photoMap) return function () {};
    var cleaned = [];
    // 每个地区对应的小镇标题
    var townTitles = {
      jiangnan: {'云溪镇': photoMap.yunxi},
      mountain: {'石岙镇': photoMap.shiao}
    };
    var titles = townTitles[regionKey] || {};
    Object.keys(titles).forEach(function (title) {
      var photo = titles[title];
      if (!photo || !photo.src) return;
      var card = Array.from(list.querySelectorAll('.town-card')).find(function (item) {
        var h2 = item.querySelector('h2');
        return h2 && h2.textContent.trim() === title;
      });
      if (!card) return;
      var figure = document.createElement('figure');
      figure.className = 'hk-town-photo';
      var image = document.createElement('img');
      image.src = photo.src;
      image.alt = '';
      image.decoding = 'async';
      var caption = document.createElement('figcaption');
      caption.textContent = photo.source || '地方视觉参考';
      figure.append(image, caption);
      card.prepend(figure);
      card.setAttribute('data-hk-town-photo', '');
      cleaned.push(function () { figure.remove(); card.removeAttribute('data-hk-town-photo'); });
    });
    return function () { cleaned.forEach(function (fn) { try { fn(); } catch (_) {} }); };
  };

  // 小镇详情页：hero 背景照片 + 店卡顶部参考图（按店铺 ID 匹配）
  FX.mountTownPageVisual = function (townPage, townPhoto, shopPhotos, regionKey) {
    if (!townPage || !townPage.isConnected) return function () {};
    var cleaned = [];
    // 1) hero 背景照片
    var hero = townPage.querySelector('.town-hero');
    if (hero && townPhoto && townPhoto.src) {
      var gradient = HERO_GRADIENTS[regionKey] || HERO_GRADIENTS.jiangnan;
      hero.setAttribute('data-hk-hero-photo', '');
      hero.style.backgroundImage = gradient + ', url("' + townPhoto.src + '")';
      hero.style.backgroundSize = 'cover';
      hero.style.backgroundPosition = 'center right';
      cleaned.push(function () {
        hero.removeAttribute('data-hk-hero-photo');
        hero.style.backgroundImage = '';
        hero.style.backgroundSize = '';
        hero.style.backgroundPosition = '';
      });
    }
    // 2) 店卡顶部参考图（按店铺 ID 匹配，不再硬编码顺序）
    var shops = Array.prototype.slice.call(townPage.querySelectorAll('.town-shop-grid .town-shop'));
    shops.forEach(function (shop) {
      // 从卡片里找店铺链接，href 里包含店铺 ID
      var link = shop.querySelector('a[href*="#/room/"]');
      if (!link) return;
      var href = link.getAttribute('href') || '';
      var m = /#\/room\/[^/]+\/([a-z0-9-]+)/.exec(href);
      if (!m) return;
      var shopKey = m[1];
      var photoSrc = shopPhotos && shopPhotos[shopKey];
      if (!photoSrc) return;
      var figure = document.createElement('figure');
      figure.className = 'hk-shop-photo';
      var image = document.createElement('img');
      image.src = photoSrc;
      image.alt = '';
      image.decoding = 'async';
      figure.appendChild(image);
      shop.insertBefore(figure, shop.firstChild);
      cleaned.push(function () { figure.remove(); });
    });
    return function () { cleaned.forEach(function (fn) { try { fn(); } catch (_) {} }); };
  };
}());

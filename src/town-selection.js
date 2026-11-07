(function () {
  'use strict';
  var FX = window.HKVisualFX = window.HKVisualFX || {};
  FX.mountRegionHeading = function (intro, photo) {
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
    intro.setAttribute('data-hk-region-heading', 'jiangnan');
    // Bleed only the photograph to the viewport; leave the content grid in place.
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
  FX.mountTownSelection = function (list, photo) {
    if (!list || !photo || !photo.src) return function () {};
    var card = Array.from(list.querySelectorAll('.town-card')).find(function (item) {
      var title = item.querySelector('h2');
      return title && title.textContent.trim() === '云溪镇';
    });
    if (!card) return function () {};
    var figure = document.createElement('figure');
    figure.className = 'hk-town-photo';
    var image = document.createElement('img');
    image.src = photo.src;
    image.alt = '用户提供的河畔落日照片，岸边建筑与夕阳倒映在河面上';
    image.decoding = 'async';
    var caption = document.createElement('figcaption');
    caption.textContent = '河畔日落 · 用户提供摄影';
    figure.append(image, caption);
    card.prepend(figure);
    card.setAttribute('data-hk-town-photo', '');
    return function () { figure.remove(); card.removeAttribute('data-hk-town-photo'); };
  };

  // 云溪镇详情页：hero 深绿块换照片 + 三店卡顶部补参考图
  FX.mountTownPageVisual = function (townPage, townPhoto, shopPhotos) {
    if (!townPage || !townPage.isConnected) return function () {};
    var cleaned = [];
    // 1) hero 背景照片
    var hero = townPage.querySelector('.town-hero');
    if (hero && townPhoto && townPhoto.src) {
      hero.setAttribute('data-hk-hero-photo', '');
      hero.style.backgroundImage = 'linear-gradient(100deg, rgba(23,63,68,0.92) 0%, rgba(23,63,68,0.78) 38%, rgba(23,63,68,0.45) 70%, rgba(23,63,68,0.25) 100%), url("' + townPhoto.src + '")';
      hero.style.backgroundSize = 'cover';
      hero.style.backgroundPosition = 'center right';
      cleaned.push(function () {
        hero.removeAttribute('data-hk-hero-photo');
        hero.style.backgroundImage = '';
        hero.style.backgroundSize = '';
        hero.style.backgroundPosition = '';
      });
    }
    // 2) 三店卡顶部参考图（按店匹配）
    var shops = Array.prototype.slice.call(townPage.querySelectorAll('.town-shop-grid .town-shop'));
    var shopKeys = ['qiaoxi-tea', 'ayuan-noodles', 'nanzha-bamboo'];
    shops.forEach(function (shop, idx) {
      var key = shopKeys[idx];
      var photoSrc = shopPhotos && shopPhotos[key];
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

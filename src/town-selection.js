(function () {
  'use strict';
  var FX = window.HKVisualFX = window.HKVisualFX || {};
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
}());

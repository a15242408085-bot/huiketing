(function () {
  'use strict';
  const FX = window.HKVisualFX || {};
  const payload = document.getElementById('hk-visual-data');
  if (!payload) return;
  let data;
  try { data = JSON.parse(payload.textContent); } catch (_) { return; }
  // Public placeholders share the single embedded bamboo image.
  function restoreSharedImage(item) {
    if (item && item.src === '@bamboo') item.src = data.bamboo;
    return item;
  }
  data.photos = Array.isArray(data.photos) ? data.photos.map(restoreSharedImage) : [];
  data.coast = restoreSharedImage(data.coast);
  let backgroundURL = '';
  try {
    const encoded = data.bamboo.split(',')[1], bytes = atob(encoded), array = new Uint8Array(bytes.length);
    for (let i = 0; i < bytes.length; i++) array[i] = bytes.charCodeAt(i);
    backgroundURL = URL.createObjectURL(new Blob([array], {type:'image/png'}));
    document.documentElement.style.setProperty('--hk-bamboo-image', 'url("' + backgroundURL + '")');
  } catch (_) { /* The static bamboo-colored theme remains readable. */ }
  let home = null, intro = null, grid = null, room = null, roomKey = "", homeCleanup = [], introCleanup = null, gridCleanup = null, roomCleanup = null, town = null, townKey = "", townCleanup = null, merchant = null, merchantCleanup = null, pending = 0;
  let townList = null, townListKey = '', townListCleanup = null;
  let regionHeading = null, regionHeadingKey = '', regionHeadingCleanup = null;
  function cleanHome() { homeCleanup.slice().reverse().forEach(function (fn) { try { fn(); } catch (_) {} }); homeCleanup = []; home = null; }
  function reconcile() {
    pending = 0;
    const nextHome = document.querySelector('.cover-page');
    if (nextHome !== home) {
      cleanHome(); home = nextHome;
      if (home) {
        const title = home.querySelector('.cover-hero__brand h1'), shell = home.closest('.app-shell');
        if (FX.mountHomePolish) { try { homeCleanup.push(FX.mountHomePolish(home)); } catch (_) {} }
        if (title && FX.mountSilk) { try { homeCleanup.push(FX.mountSilk(title)); } catch (_) {} }
        if (shell && FX.mountLandscape) { try { homeCleanup.push(FX.mountLandscape(shell)); } catch (_) {} }
        if (FX.mountHomeScroll) { try { homeCleanup.push(FX.mountHomeScroll(home)); } catch (_) {} }
        if (FX.mountBambooFog) { try { homeCleanup.push(FX.mountBambooFog(home, data.foregroundBamboo)); } catch (_) {} }
        if (FX.mountEntryIcons) { try { homeCleanup.push(FX.mountEntryIcons(home)); } catch (_) {} }
        if (FX.mountEntryArt) { try { homeCleanup.push(FX.mountEntryArt(home, data.entryArt)); } catch (_) {} }
      }
    }
    const nextRoom = document.querySelector('.room-page');
    const nextRoomKey = nextRoom ? location.hash.split('?')[0].split('/').slice(0, 4).join('/') : '';
    if (nextRoom !== room || nextRoomKey !== roomKey) {
      if (roomCleanup) roomCleanup();
      roomCleanup = null; room = nextRoom; roomKey = nextRoomKey;
      const shopId = roomKey.split('/')[3];
      if (room && FX.mountRoomEditorial && data.roomEditorial && data.roomEditorial[shopId]) {
        try { roomCleanup = FX.mountRoomEditorial(room, data.roomEditorial[shopId]); } catch (_) {}
      }
    }
    if (room && FX.applyTodayPlannerDraft) FX.applyTodayPlannerDraft(room);
    const nextTown = document.querySelector('.town-page');
    const nextTownList = document.querySelector('.town-list');
    const nextRegionHeadingKey = location.hash.split('?')[0];
    const nextRegionHeading = /^#\/visit\/jiangnan\/?$/.test(nextRegionHeadingKey) && nextTownList
      ? nextTownList.parentElement.querySelector(':scope > .flow-intro') : null;
    if (regionHeading !== nextRegionHeading || regionHeadingKey !== nextRegionHeadingKey) {
      if (regionHeadingCleanup) regionHeadingCleanup();
      regionHeading = nextRegionHeading; regionHeadingKey = nextRegionHeadingKey; regionHeadingCleanup = null;
      if (regionHeading && FX.mountRegionHeading) {
        regionHeadingCleanup = FX.mountRegionHeading(regionHeading, data.regionHeadingPhotography && data.regionHeadingPhotography.jiangnan);
      }
    }
    const nextTownListKey = nextTownList ? nextRegionHeadingKey : '';
    if (nextTownList !== townList || townListKey !== nextTownListKey) {
      if (townListCleanup) townListCleanup();
      townList = nextTownList; townListKey = nextTownListKey; townListCleanup = null;
      if (townList && FX.mountTownSelection) townListCleanup = FX.mountTownSelection(townList, data.townPhotography);
    }
    const nextTownKey = nextTown ? location.hash : '';
    if (nextTown !== town || nextTownKey !== townKey) {
      if (townCleanup) townCleanup();
      townCleanup = null; town = nextTown; townKey = nextTownKey;
      var townCleanups = [];
      if (town && FX.mountTodayPlanner) { try { townCleanups.push(FX.mountTodayPlanner(town)); } catch (_) {} }
      if (town && FX.mountTownPageVisual) { try { townCleanups.push(FX.mountTownPageVisual(town, data.townPhotography, data.shopPhotos)); } catch (_) {} }
      townCleanup = function () { townCleanups.forEach(function (fn) { try { fn(); } catch (_) {} }); };
    }
    const nextMerchant = document.querySelector('.merchant-workbench');
    if (nextMerchant !== merchant) {
      if (merchantCleanup) merchantCleanup();
      merchantCleanup = null; merchant = nextMerchant;
      if (merchant && FX.mountOwnerDashboard) { try { merchantCleanup = FX.mountOwnerDashboard(merchant); } catch (_) {} }
    }
    const onRegionPage = /^#\/visit\/?$/.test(location.hash);
    const nextIntro = onRegionPage ? document.querySelector('.flow-intro') : null;
    if (intro !== nextIntro) {
      if (introCleanup) introCleanup(); introCleanup = null; intro = nextIntro;
      if (intro && FX.mountContactSheet) { try { introCleanup = FX.mountContactSheet(intro, data.scenicPhotos || data.photos); } catch (_) {} }
    }
    const nextGrid = onRegionPage ? document.querySelector('.region-card-grid') : null;
    if (grid !== nextGrid) {
      if (gridCleanup) gridCleanup(); gridCleanup = null; grid = nextGrid;
      if (grid && FX.mountDepthCards) { try { gridCleanup = FX.mountDepthCards(grid, (data.scenicPhotos || data.photos).concat(data.coast)); } catch (_) {} }
    }
  }
  function schedule() { if (!pending) pending = requestAnimationFrame(reconcile); }
  const root = document.getElementById('root') || document.body;
  const observer = new MutationObserver(schedule); observer.observe(root, {childList:true,subtree:true});
  window.addEventListener('hashchange', schedule);
  window.addEventListener('pagehide', function (event) {
    if (event.persisted) return;
    observer.disconnect(); cancelAnimationFrame(pending); cleanHome();
    if (townListCleanup) townListCleanup();
    if (regionHeadingCleanup) regionHeadingCleanup();
    if (introCleanup) introCleanup(); if (gridCleanup) gridCleanup(); if (roomCleanup) roomCleanup(); if (townCleanup) townCleanup(); if (merchantCleanup) merchantCleanup();
    if (backgroundURL) URL.revokeObjectURL(backgroundURL);
  });
  schedule();
}());

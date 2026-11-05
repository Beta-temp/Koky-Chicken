/* ===== menu.js — страница меню: вкладки категорий + рендер карточек (логика корзины/модификаторов — в koky.js) ===== */
(() => {
  const $ = s => document.querySelector(s);
  let MENU = null, activeCat = 'all';

  function render() {
    const tabs = [{ id: 'all', name: { ar: Koky.DICT.ar.all, en: Koky.DICT.en.all } }, ...MENU.categories];
    $('#catTabs').innerHTML = tabs.map(c =>
      `<button class="cat-tab" data-cat="${c.id}" aria-pressed="${c.id === activeCat}">${c.icon ? c.icon + ' ' : ''}${Koky.esc(Koky.tr(c.name))}</button>`).join('');
    const html = MENU.categories.filter(c => activeCat === 'all' || c.id === activeCat).map(c => {
      const items = MENU.items.filter(i => i.cat === c.id && !i.hidden);
      return items.length ? `<section class="menu-cat" id="cat-${c.id}"><h2 class="display">${Koky.esc(Koky.tr(c.name))}</h2><div class="cards">${items.map(Koky.cardHTML).join('')}</div></section>` : '';
    }).join('');
    $('#menuRoot').innerHTML = html || `<p class="menu-msg">${Koky.t('empty')}</p>`;
  }

  function lang(l) { Koky.setLang(l); document.title = Koky.t('menu_page_title'); }

  $('#langBtn').addEventListener('click', () => lang(Koky.lang() === 'ar' ? 'en' : 'ar'));
  document.addEventListener('langchange', () => { if (MENU) render(); });

  $('#catTabs').addEventListener('click', e => {
    const b = e.target.closest('.cat-tab'); if (!b) return;
    activeCat = b.dataset.cat;
    history.replaceState(null, '', activeCat === 'all' ? 'menu.html' : '#' + activeCat);
    render();
    window.scrollTo({ top: $('.cat-bar').offsetTop - 64, behavior: 'smooth' });
  });
  $('#menuRoot').addEventListener('click', e => {
    const b = e.target.closest('.add-btn'); if (b) Koky.addItem(b.dataset.id);   // на странице меню — тост, без открытия панели
  });

  lang(Koky.lang());
  Koky.loadMenu().then(m => {
    MENU = m;
    const h = location.hash.slice(1);
    if (m.categories.some(c => c.id === h)) activeCat = h;
    render();
  }).catch(() => { $('#menuRoot').innerHTML = `<p class="menu-msg">${Koky.t('err')}</p>`; });
})();

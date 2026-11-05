/* ===== home.js — «Хиты продаж» на главной из data/menu.json (позиции с "hit": true) ===== */
(() => {
  const root = document.getElementById('hitsRoot');
  if (!root) return;
  let menu = null;
  const render = () => {
    if (!menu) return;
    root.innerHTML = menu.items.filter(i => i.hit && !i.hidden).slice(0, 4).map(Koky.cardHTML).join('');
  };
  Koky.loadMenu().then(m => { menu = m; render(); }).catch(() => { root.innerHTML = `<p class="menu-msg">${Koky.t('err')}</p>`; });
  document.addEventListener('langchange', render);
  root.addEventListener('click', e => {
    const b = e.target.closest('.add-btn');
    if (b) Koky.addItem(b.dataset.id, { openCart: true });   // добавили → открылась панель корзины
  });
})();

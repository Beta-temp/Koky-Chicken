/* ===== koky.js — общее ядро сайта: язык, корзина (localStorage), боковая панель корзины,
   окно модификаторов, карточки товаров. Подключается на index / menu / checkout. ===== */
const Koky = (() => {
  /* ---------- тексты интерфейса ---------- */
  const DICT = {
    ar: { nav_menu:'القائمة', nav_about:'من نحن', nav_contact:'تواصل معنا', menu_title:'القائمة', menu_sub:'اختار وجبتك وأضفها للسلة.',
          all:'الكل', add:'أضف', choose:'اختر', required:'مطلوب', optional:'اختياري', add_cart:'أضف للسلة', added:'تمت الإضافة',
          egp:'ج.م', hit:'الأكثر طلباً', empty:'لا توجد أصناف.', err:'تعذر تحميل القائمة. افتح الموقع عبر سيرفر (مش ملف مباشر) وحاول تاني.',
          cart_title:'سلتك', cart_empty:'السلة فاضية', cart_empty_btn:'تصفح القائمة', cart_total:'الإجمالي', cart_checkout:'إتمام الطلب',
          cart_clear:'تفريغ السلة', cart_clear_q:'تفريغ السلة بالكامل؟', remove:'حذف', menu_page_title:'القائمة | Koky Chicken' },
    en: { nav_menu:'Menu', nav_about:'About', nav_contact:'Contact', menu_title:'Menu', menu_sub:'Pick your meal and add it to the cart.',
          all:'All', add:'Add', choose:'Choose', required:'Required', optional:'Optional', add_cart:'Add to cart', added:'Added',
          egp:'EGP', hit:'Best seller', empty:'No items.', err:'Could not load the menu. Open the site through a server (not a local file) and retry.',
          cart_title:'Your cart', cart_empty:'Your cart is empty', cart_empty_btn:'Browse menu', cart_total:'Total', cart_checkout:'Checkout',
          cart_clear:'Clear cart', cart_clear_q:'Clear the whole cart?', remove:'Remove', menu_page_title:'Menu | Koky Chicken' }
  };
  const $ = (s, r = document) => r.querySelector(s);
  const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[c]));
  const lang = () => { try { return localStorage.getItem('koky_lang') || 'ar'; } catch (e) { return 'ar'; } };
  const t = k => (DICT[lang()] || DICT.ar)[k] || DICT.ar[k] || k;
  const tr = o => (o && (o[lang()] || o.ar || o.en)) || '';
  const money = n => `${n} ${t('egp')}`;

  /* Смена языка для страниц, у которых тексты берутся из DICT (menu.html) */
  function setLang(l) {
    try { localStorage.setItem('koky_lang', l); } catch (e) {}
    document.documentElement.lang = l;
    document.documentElement.dir = l === 'ar' ? 'rtl' : 'ltr';
    document.querySelectorAll('[data-i18n]').forEach(el => { const v = DICT[l][el.dataset.i18n]; if (v) el.textContent = v; });
    const b = $('#langBtn'); if (b) b.textContent = l === 'ar' ? 'EN' : 'عربي';
    document.dispatchEvent(new Event('langchange'));
  }

  /* ---------- корзина ----------
     Строка: {key, id, name:{ar,en}, unit, qty, options:[{g:{ar,en}, v:{ar,en}}]}; unit = цена за 1 шт. с модификаторами */
  const Cart = {
    KEY: 'koky_cart',
    get() { try { return JSON.parse(localStorage.getItem(this.KEY)) || []; } catch (e) { return []; } },
    save(lines, bump) {
      try { localStorage.setItem(this.KEY, JSON.stringify(lines)); } catch (e) {}
      this.updateBadge(bump);
      document.dispatchEvent(new Event('cart:change'));
    },
    add(line) {
      const lines = this.get(), same = lines.find(l => l.key === line.key);
      if (same) same.qty += line.qty; else lines.push(line);
      this.save(lines, true);
    },
    setQty(key, qty) {
      const lines = this.get(), l = lines.find(x => x.key === key); if (!l) return;
      if (qty < 1) return this.remove(key);
      l.qty = Math.min(qty, 99); this.save(lines);
    },
    remove(key) { this.save(this.get().filter(l => l.key !== key)); },
    clear() { this.save([]); },
    count() { return this.get().reduce((n, l) => n + l.qty, 0); },
    total() { return this.get().reduce((s, l) => s + l.unit * l.qty, 0); },
    updateBadge(bump) {
      const el = $('#cartCount'); if (!el) return;
      el.textContent = this.count();
      if (bump) { el.classList.remove('bump'); void el.offsetWidth; el.classList.add('bump'); }
    }
  };

  /* ---------- меню (menu.json) ---------- */
  let MENU = null, menuPromise = null;
  function loadMenu() {
    if (!menuPromise) menuPromise = fetch('data/menu.json', { cache: 'no-cache' })
      .then(r => { if (!r.ok) throw new Error(r.status); return r.json(); })
      .then(m => (MENU = m))
      .catch(e => { menuPromise = null; throw e; });
    return menuPromise;
  }

  function cardHTML(it) {
    const hasMods = it.mods && it.mods.length;
    const img = it.img ? `<img src="${esc(it.img)}" alt="${esc(tr(it.name))}" loading="lazy">` : `<svg class="fallback-food-icon" aria-hidden="true" focusable="false"><use href="img/icons.svg#chicken"></use></svg>`;
    return `<article class="card">
      ${it.hit ? `<span class="badge-hit">${t('hit')}</span>` : ''}
      <div class="card-img">${img}</div><!-- ФОТО: поле "img" в menu.json, например "img/dishes/${esc(it.id)}.jpg" -->
      <div class="card-body"><h3>${esc(tr(it.name))}</h3><p>${esc(tr(it.desc))}</p>
        <div class="card-foot"><span class="price">${money(it.price)}</span>
          <button class="add-btn" data-id="${esc(it.id)}">${hasMods ? t('choose') : t('add')}</button></div></div>
    </article>`;
  }

  /* ---------- тост ---------- */
  let toastTimer;
  function toast(msg) {
    let el = $('#toast');
    if (!el) { el = document.createElement('div'); el.id = 'toast'; el.className = 'toast'; el.setAttribute('role', 'status'); document.body.appendChild(el); }
    el.textContent = msg; el.classList.add('show');
    clearTimeout(toastTimer); toastTimer = setTimeout(() => el.classList.remove('show'), 1600);
  }

  /* ---------- боковая панель корзины ---------- */
  function buildDrawer() {
    if ($('#cartDrawer')) return;
    document.body.insertAdjacentHTML('beforeend', `
      <div class="drawer-overlay" id="cartOverlay"></div>
      <aside class="drawer" id="cartDrawer" role="dialog" aria-modal="true" aria-labelledby="drawerTitle" aria-hidden="true">
        <div class="drawer-head"><h3 class="display" id="drawerTitle"></h3><button class="x-btn" id="drawerClose" type="button" aria-label="Close">&times;</button></div>
        <div class="drawer-body" id="drawerBody"></div>
        <div class="drawer-foot" id="drawerFoot">
          <div class="drawer-total"><span id="drawerTotalLabel"></span><strong id="drawerTotal"></strong></div>
          <a class="btn btn-gold" id="drawerCheckout" href="checkout.html"></a>
          <button class="link-btn" id="drawerClear" type="button"></button>
        </div>
      </aside>`);
    $('#cartOverlay').addEventListener('click', closeCart);
    $('#drawerClose').addEventListener('click', closeCart);
    $('#drawerClear').addEventListener('click', () => { if (confirm(t('cart_clear_q'))) Cart.clear(); });
    $('#drawerBody').addEventListener('click', e => {
      const b = e.target.closest('[data-act]'); if (!b) return;
      const key = b.closest('.line').dataset.key, line = Cart.get().find(l => l.key === key); if (!line) return;
      if (b.dataset.act === 'inc') Cart.setQty(key, line.qty + 1);
      else if (b.dataset.act === 'dec') Cart.setQty(key, line.qty - 1);   // при qty=1 — удаляет строку
      else Cart.remove(key);
    });
  }

  function renderDrawer() {
    if (!$('#cartDrawer')) return;
    const lines = Cart.get();
    $('#drawerTitle').textContent = t('cart_title');
    $('#drawerTotalLabel').textContent = t('cart_total');
    $('#drawerCheckout').textContent = t('cart_checkout');
    $('#drawerClear').textContent = t('cart_clear');
    $('#drawerFoot').hidden = !lines.length;
    if (!lines.length) {
      $('#drawerBody').innerHTML = `<div class="drawer-empty"><div class="big"><svg class="empty-cart-icon" aria-hidden="true" focusable="false"><use href="img/icons.svg#cart"></use></svg></div><p>${t('cart_empty')}</p><a class="btn btn-gold" href="menu.html">${t('cart_empty_btn')}</a></div>`;
      return;
    }
    $('#drawerBody').innerHTML = lines.map(l => `
      <div class="line" data-key="${esc(l.key)}">
        <div class="line-info"><strong>${esc(tr(l.name))}</strong>
          ${l.options.length ? `<small>${esc(l.options.map(o => tr(o.v)).join(' · '))}</small>` : ''}
          <span class="line-unit">${money(l.unit)}</span></div>
        <div class="line-side">
          <div class="stepper sm"><button type="button" data-act="dec" aria-label="−">−</button><output>${l.qty}</output><button type="button" data-act="inc" aria-label="+">+</button></div>
          <b>${money(l.unit * l.qty)}</b>
          <button class="rm-btn" type="button" data-act="rm" aria-label="${t('remove')}"><svg class="trash-icon" aria-hidden="true" focusable="false"><use href="img/icons.svg#trash"></use></svg></button>
        </div>
      </div>`).join('');
    $('#drawerTotal').textContent = money(Cart.total());
  }

  function openCart() {
    buildDrawer(); renderDrawer();
    $('#cartDrawer').classList.add('open'); $('#cartOverlay').classList.add('open');
    $('#cartDrawer').setAttribute('aria-hidden', 'false');
    document.body.classList.add('modal-open');
    $('#drawerClose').focus();
  }
  function closeCart() {
    const d = $('#cartDrawer'); if (!d) return;
    d.classList.remove('open'); $('#cartOverlay').classList.remove('open');
    d.setAttribute('aria-hidden', 'true');
    document.body.classList.remove('modal-open');
  }

  /* ---------- окно модификаторов ---------- */
  let pm = null;   // {item, qty, sel, opts}
  const modOf = k => MENU.modifiers[k];
  const optPrice = (k, id) => (modOf(k).options.find(o => o.id === id) || {}).price || 0;
  const unitPrice = (item, sel) => item.price + Object.keys(sel).reduce((s, k) => s + sel[k].reduce((a, id) => a + optPrice(k, id), 0), 0);

  function buildModal() {
    if ($('#pmModal')) return;
    document.body.insertAdjacentHTML('beforeend', `
      <div class="modal" id="pmModal" role="dialog" aria-modal="true" aria-labelledby="pmTitle"><div class="sheet">
        <div class="sheet-head"><div><h3 id="pmTitle"></h3><p id="pmDesc"></p></div><button class="x-btn" id="pmClose" type="button" aria-label="Close">&times;</button></div>
        <div class="sheet-body" id="pmBody"></div>
        <div class="sheet-foot">
          <div class="stepper"><button type="button" id="pmMinus" aria-label="−">−</button><output id="pmQty">1</output><button type="button" id="pmPlus" aria-label="+">+</button></div>
          <button class="btn btn-gold" id="pmAdd" type="button"><span id="pmAddLabel"></span><span id="pmTotal"></span></button>
        </div></div></div>`);
    $('#pmClose').addEventListener('click', closePM);
    $('#pmModal').addEventListener('click', e => { if (e.target.id === 'pmModal') closePM(); });
    $('#pmBody').addEventListener('change', syncPM);
    $('#pmMinus').addEventListener('click', () => { if (pm && pm.qty > 1) { pm.qty--; syncPM(); } });
    $('#pmPlus').addEventListener('click', () => { if (pm && pm.qty < 20) { pm.qty++; syncPM(); } });
    $('#pmAdd').addEventListener('click', () => { const { item, sel, qty, opts } = pm; closePM(); commit(buildLine(item, sel, qty), opts); });
  }

  function openPM(item, opts) {
    buildModal();
    pm = { item, qty: 1, opts, sel: {} };
    item.mods.forEach(k => { const m = modOf(k); pm.sel[k] = m.type === 'single' ? [(m.options.find(o => o.default) || m.options[0]).id] : []; });
    $('#pmTitle').textContent = tr(item.name);
    $('#pmDesc').textContent = tr(item.desc);
    $('#pmBody').innerHTML = item.mods.map(k => {
      const m = modOf(k), multi = m.type === 'multi';
      const o = m.options.map(x => `<label class="opt-wrap"><input type="${multi ? 'checkbox' : 'radio'}" name="${k}" value="${x.id}" ${pm.sel[k].includes(x.id) ? 'checked' : ''}>
        <span class="opt">${esc(tr(x.name))}${x.price ? `<em>+${x.price}</em>` : ''}</span></label>`).join('');
      return `<fieldset class="mod-group" data-mod="${k}"><legend>${esc(tr(m.name))}<small>${multi ? t('optional') : t('required')}</small></legend><div class="mod-opts">${o}</div></fieldset>`;
    }).join('');
    syncPM();
    $('#pmModal').classList.add('open'); document.body.classList.add('modal-open');
    $('#pmClose').focus();
  }
  function closePM() { const m = $('#pmModal'); if (m) m.classList.remove('open'); if (!$('#cartDrawer.open')) document.body.classList.remove('modal-open'); pm = null; }

  function syncPM() {
    if (!pm) return;
    document.querySelectorAll('#pmBody .mod-group').forEach(g => {
      const k = g.dataset.mod, m = modOf(k);
      pm.sel[k] = [...g.querySelectorAll('input:checked')].map(i => i.value);
      if (m.type === 'multi' && m.max) { const full = pm.sel[k].length >= m.max; g.querySelectorAll('input:not(:checked)').forEach(i => i.disabled = full); }
    });
    $('#pmQty').textContent = pm.qty;
    $('#pmAddLabel').textContent = t('add_cart');
    $('#pmTotal').textContent = money(unitPrice(pm.item, pm.sel) * pm.qty);
  }

  /* Строка корзины. Одинаковый товар + одинаковый выбор → одинаковый key → количество суммируется */
  function buildLine(item, sel, qty) {
    const options = [];
    (item.mods || []).forEach(k => sel[k].forEach(id => options.push({ g: modOf(k).name, v: modOf(k).options.find(o => o.id === id).name })));
    const key = item.id + '|' + Object.keys(sel).sort().map(k => k + ':' + [...sel[k]].sort().join('+')).join(',');
    return { key, id: item.id, name: item.name, unit: unitPrice(item, sel), qty, options };
  }

  function commit(line, opts) { Cart.add(line); if (opts && opts.openCart) openCart(); else toast(t('added')); }

  /* Публичный метод: клик «Добавить» по карточке. opts.openCart=true → после добавления открыть панель */
  function addItem(id, opts) {
    const item = MENU.items.find(i => i.id === id); if (!item) return;
    if (item.mods && item.mods.length) openPM(item, opts);
    else commit(buildLine(item, {}, 1), opts);
  }

  /* ---------- глобальные обработчики ---------- */
  document.addEventListener('click', e => {
    if (e.target.closest('#cartBtn, [data-cart-open]')) { e.preventDefault(); openCart(); }
  });
  document.addEventListener('keydown', e => { if (e.key === 'Escape') { if (pm) closePM(); else closeCart(); } });
  document.addEventListener('cart:change', renderDrawer);
  document.addEventListener('langchange', () => { closePM(); renderDrawer(); });
  document.addEventListener('DOMContentLoaded', () => { Cart.updateBadge(false); });
  if (document.readyState !== 'loading') Cart.updateBadge(false);

  return { DICT, t, tr, esc, money, lang, setLang, Cart, loadMenu, cardHTML, addItem, toast, openCart, closeCart };
})();

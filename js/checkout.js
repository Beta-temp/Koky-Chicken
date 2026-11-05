/* ===== checkout.js — оформление заказа: валидация → WhatsApp + Google Sheets + GA4 → очистка корзины → редирект ===== */

/* ---------- НАСТРОЙКИ (меняйте здесь) ---------- */
const WHATSAPP_NUMBER = '201207801998';        // международный формат без + и пробелов (+20 120 780 1998)
const GOOGLE_SHEET_WEBHOOK_URL = '';           // URL веб-приложения Apps Script (…/exec). Пусто = в таблицу не отправляем
const ORDER_LANG = 'en';                       // язык текста заказа для кухни: 'en' или 'ar'
const CURRENCY = 'EGP';
const REDIRECT_DELAY_MS = 6000;                // через сколько вернуть на главную после заказа

(() => {
  const { Cart, esc, tr } = Koky;
  const $ = s => document.querySelector(s);

  /* ---------- тексты страницы ---------- */
  const TXT = {
    ar: { nav_menu:'القائمة', nav_about:'من نحن', nav_contact:'تواصل معنا', co_title:'إتمام الطلب', co_empty:'السلة فاضية', co_browse:'تصفح القائمة',
          co_thanks:'شكراً لطلبك!', co_thanks_sub:'تم إرسال طلبك. هنتواصل معاك على واتساب لتأكيده.', co_open_wa:'افتح واتساب', co_home:'الرئيسية',
          f_type:'نوع الطلب', f_pickup:'🏃 استلام من المطعم', f_delivery:'🛵 توصيل', f_name:'الاسم', f_phone:'رقم الموبايل', f_addr:'عنوان التوصيل',
          f_note:'ملاحظات على الطلب', f_opt:'(اختياري)', f_pay:'الدفع: كاش عند الاستلام', f_submit:'تأكيد الطلب',
          s_title:'طلبك', s_total:'الإجمالي', s_edit:'تعديل السلة',
          e_name:'اكتب اسمك', e_phone:'اكتب رقم موبايل صحيح', e_addr:'اكتب عنوان التوصيل', e_empty:'السلة فاضية. أضف وجبة الأول.',
          redirect:'هنرجعك للرئيسية خلال لحظات…', order:'رقم الطلب', page_title:'إتمام الطلب | Koky Chicken' },
    en: { nav_menu:'Menu', nav_about:'About', nav_contact:'Contact', co_title:'Checkout', co_empty:'Your cart is empty', co_browse:'Browse menu',
          co_thanks:'Thank you for your order!', co_thanks_sub:'Your order was sent. We will contact you on WhatsApp to confirm.', co_open_wa:'Open WhatsApp', co_home:'Home',
          f_type:'Order type', f_pickup:'🏃 Pickup', f_delivery:'🛵 Delivery', f_name:'Name', f_phone:'Phone', f_addr:'Delivery address',
          f_note:'Order notes', f_opt:'(optional)', f_pay:'Payment: Cash on delivery', f_submit:'Confirm order',
          s_title:'Your order', s_total:'Total', s_edit:'Edit cart',
          e_name:'Please enter your name', e_phone:'Please enter a valid phone number', e_addr:'Please enter the delivery address', e_empty:'Your cart is empty. Add a meal first.',
          redirect:'Taking you back to the homepage…', order:'Order', page_title:'Checkout | Koky Chicken' }
  };
  const L = () => TXT[Koky.lang()] || TXT.ar;

  function applyLang(l) {
    try { localStorage.setItem('koky_lang', l); } catch (e) {}
    document.documentElement.lang = l;
    document.documentElement.dir = l === 'ar' ? 'rtl' : 'ltr';
    document.querySelectorAll('[data-i18n]').forEach(el => { const v = TXT[l][el.dataset.i18n]; if (v) el.textContent = v; });
    document.title = TXT[l].page_title;
    $('#langBtn').textContent = l === 'ar' ? 'EN' : 'عربي';
    renderSummary();
    document.dispatchEvent(new Event('langchange'));   // koky.js перерисует панель корзины
  }

  /* ---------- сводка заказа ---------- */
  let done = false;   // после успешной отправки больше не реагируем на изменения корзины
  function renderSummary() {
    if (done) return;
    const lines = Cart.get();
    $('#emptyBox').hidden = lines.length > 0;
    $('#coGrid').hidden = lines.length === 0;
    $('#sumList').innerHTML = lines.map(l => `<li><div>${l.qty}× ${esc(tr(l.name))}${l.options.length ? `<small>${esc(l.options.map(o => tr(o.v)).join(' · '))}</small>` : ''}</div><b>${Koky.money(l.unit * l.qty)}</b></li>`).join('');
    const total = Koky.money(Cart.total());
    $('#sumTotal').textContent = total;
    $('#submitTotal').textContent = total;
  }
  document.addEventListener('cart:change', renderSummary);

  /* ---------- форма ---------- */
  const form = $('#orderForm');
  const typeVal = () => form.elements.type.value;
  function toggleAddr() { $('#addrField').hidden = typeVal() !== 'delivery'; }
  form.addEventListener('change', e => { if (e.target.name === 'type') { toggleAddr(); clearErr('addr'); } });

  const FIELD = { name: ['#fName', '#eName'], phone: ['#fPhone', '#ePhone'], addr: ['#fAddr', '#eAddr'] };
  function setErr(k, msg) { const [i, e] = FIELD[k]; $(e).textContent = msg; $(i).closest('.co-field').classList.add('invalid'); }
  function clearErr(k) { const [i, e] = FIELD[k]; $(e).textContent = ''; $(i).closest('.co-field').classList.remove('invalid'); }
  Object.keys(FIELD).forEach(k => $(FIELD[k][0]).addEventListener('input', () => clearErr(k)));

  /* Запоминаем данные клиента для следующего заказа */
  const CUST_KEY = 'koky_customer';
  try { const c = JSON.parse(localStorage.getItem(CUST_KEY) || 'null');
    if (c) { $('#fName').value = c.name || ''; $('#fPhone').value = c.phone || ''; $('#fAddr').value = c.address || '';
      if (c.type === 'delivery') form.elements.type.value = 'delivery'; } } catch (e) {}
  toggleAddr();

  function validate() {
    let ok = true;
    Object.keys(FIELD).forEach(clearErr);
    $('#eForm').textContent = '';
    if (!Cart.get().length) { $('#eForm').textContent = L().e_empty; return false; }
    if ($('#fName').value.trim().length < 2) { setErr('name', L().e_name); ok = false; }
    const digits = $('#fPhone').value.replace(/\D/g, '');
    if (!/^[+\d][\d\s()-]*$/.test($('#fPhone').value.trim()) || digits.length < 8 || digits.length > 15) { setErr('phone', L().e_phone); ok = false; }
    if (typeVal() === 'delivery' && $('#fAddr').value.trim().length < 5) { setErr('addr', L().e_addr); ok = false; }
    if (!ok) { const bad = form.querySelector('.invalid input, .invalid textarea'); if (bad) bad.focus(); }
    return ok;
  }

  /* ---------- заказ ---------- */
  function buildOrder() {
    const pick = o => (o && (o[ORDER_LANG] || o.en || o.ar)) || '';
    const items = Cart.get().map(l => ({
      id: l.id, name: pick(l.name), qty: l.qty, price: l.unit, lineTotal: l.unit * l.qty, options: l.options.map(o => pick(o.v))
    }));
    return {
      orderId: 'KC-' + Date.now().toString(36).toUpperCase().slice(-6),
      date: new Date().toISOString(),
      name: $('#fName').value.trim(),
      phone: $('#fPhone').value.trim(),
      type: typeVal() === 'delivery' ? 'Delivery' : 'Pickup',
      address: typeVal() === 'delivery' ? $('#fAddr').value.trim() : '',
      comment: $('#fNote').value.trim(),
      items,
      total: items.reduce((s, i) => s + i.lineTotal, 0),
      currency: CURRENCY
    };
  }

  /* Красивый текст для WhatsApp (звёздочки = жирный в WhatsApp) */
  function waText(o) {
    const lines = [
      '🍗 *New Order - Koky Chicken*',
      `🧾 Order: ${o.orderId}`,
      `👤 Name: ${o.name}`,
      `📞 Phone: ${o.phone}`,
      `🚚 Type: ${o.type}`
    ];
    if (o.address) lines.push(`📍 Address: ${o.address}`);
    if (o.comment) lines.push(`📝 Note: ${o.comment}`);
    lines.push('---');
    o.items.forEach(i => lines.push(`${i.qty}x ${i.name}${i.options.length ? ` (${i.options.join(', ')})` : ''} - ${i.lineTotal} ${o.currency}`));
    lines.push('---', `💰 *Total: ${o.total} ${o.currency}*`, '💵 Payment: Cash on delivery');
    return lines.join('\n');
  }

  function sendToSheet(o) {
    if (!GOOGLE_SHEET_WEBHOOK_URL) return;
    // text/plain + no-cors: «простой» запрос без preflight (Apps Script не отвечает на OPTIONS). Ответ прочитать нельзя — это нормально.
    fetch(GOOGLE_SHEET_WEBHOOK_URL, { method: 'POST', mode: 'no-cors', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify(o), keepalive: true })
      .catch(err => console.warn('Sheet webhook failed', err));
  }

  function trackPurchase(o) {
    if (typeof gtag !== 'function') return;
    gtag('event', 'purchase', {
      transaction_id: o.orderId, value: o.total, currency: o.currency,
      items: o.items.map(i => ({ item_id: i.id, item_name: i.name, price: i.price, quantity: i.qty }))
    });
  }

  form.addEventListener('submit', e => {
    e.preventDefault();
    if (!validate()) return;
    const btn = $('#submitBtn'); btn.disabled = true;

    const o = buildOrder();
    const waUrl = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(waText(o))}`;

    // 1) WhatsApp — открываем СРАЗУ внутри клика, иначе браузер заблокирует всплывающее окно
    const w = window.open(waUrl, '_blank');
    // 2) Google Sheets и GA4 — параллельно
    sendToSheet(o);
    trackPurchase(o);
    try { localStorage.setItem(CUST_KEY, JSON.stringify({ name: o.name, phone: o.phone, address: o.address, type: typeVal() })); } catch (e) {}

    // 3) Очистка корзины и экран «Спасибо»
    done = true;
    Cart.clear();
    $('#coGrid').hidden = true; $('#emptyBox').hidden = true;
    $('#thanksBox').hidden = false;
    $('#thanksId').textContent = `${L().order}: ${o.orderId}`;
    window.scrollTo({ top: 0, behavior: 'smooth' });

    if (w) {
      $('#redirectNote').textContent = L().redirect;
      setTimeout(() => { location.href = 'index.html'; }, REDIRECT_DELAY_MS);
    } else {
      // всплывающее окно заблокировано — даём кнопку и не уводим клиента со страницы автоматически
      const a = $('#waManual'); a.href = waUrl; a.hidden = false;
    }
  });

  $('#langBtn').addEventListener('click', () => applyLang(Koky.lang() === 'ar' ? 'en' : 'ar'));
  applyLang(Koky.lang());
})();

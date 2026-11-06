/* ===== admin.js — редактор data/menu.json (без пароля, страница скрыта от поисковиков) ===== */
(() => {
  const DRAFT = 'koky_admin_draft';
  const $ = s => document.querySelector(s);
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[c]));
  let M = null, tab = 'items', q = '', dirty = false;
  const openIds = new Set();

  /* ---------- данные ---------- */
  function normalize(m) {
    m = m && typeof m === 'object' ? m : {};
    m.currency = m.currency || 'EGP';
    m.categories = Array.isArray(m.categories) ? m.categories : [];
    m.modifiers = m.modifiers || {};
    m.items = Array.isArray(m.items) ? m.items : [];
    m.items.forEach(i => { i.name = i.name || { ar: '', en: '' }; i.desc = i.desc || { ar: '', en: '' }; });
    return m;
  }
  function setDirty(v) {
    dirty = v;
    const s = $('#status'); s.textContent = v ? '● unsaved changes (download to keep)' : '✓ loaded'; s.classList.toggle('dirty', v);
    if (v) try { localStorage.setItem(DRAFT, JSON.stringify(M)); } catch (e) {}
  }
  const slug = s => String(s).toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  const setPath = (o, path, v) => { const p = path.split('.'); const last = p.pop(); p.forEach(k => o = o[k]); o[last] = v; };

  /* ---------- рендер ---------- */
  function itemHTML(it, idx) {
    const img = it.img ? `<img src="${esc(it.img)}" alt="">` : `<span class="ph"><svg viewBox="0 0 64 64" aria-hidden="true"><use href="img/icons.svg#chicken"></use></svg></span>`;
    const catOpts = M.categories.map(c => `<option value="${esc(c.id)}" ${c.id === it.cat ? 'selected' : ''}>${esc(c.name.en || c.id)}</option>`).join('');
    const mods = Object.keys(M.modifiers).map(k => `<label><input type="checkbox" data-i="${idx}" data-mod="${esc(k)}" ${(it.mods || []).includes(k) ? 'checked' : ''}> ${esc(M.modifiers[k].name.en || k)}</label>`).join('') || '<small>no modifier groups defined</small>';
    return `<details class="it ${it.hidden ? 'hid' : ''}" data-id="${esc(it.id)}" ${openIds.has(it.id) ? 'open' : ''}>
      <summary>${img}<span class="nm">${esc(it.name.en || it.name.ar || '(no name)')}</span>${it.hit ? '<span class="tag">HIT</span>' : ''}${it.hidden ? '<span class="tag">HIDDEN</span>' : ''}<span class="pr">${esc(it.price)} ${esc(M.currency)}</span></summary>
      <div class="grid">
        <label class="f">Name (English)<input type="text" data-i="${idx}" data-f="name.en" value="${esc(it.name.en)}"></label>
        <label class="f">الاسم (عربي)<input type="text" class="ar" data-i="${idx}" data-f="name.ar" value="${esc(it.name.ar)}"></label>
        <label class="f">Price (${esc(M.currency)})<input type="number" min="0" step="1" data-i="${idx}" data-f="price" value="${esc(it.price)}"></label>
        <label class="f">Category<select data-i="${idx}" data-f="cat">${catOpts}</select></label>
        <label class="f wide">Description (English)<textarea rows="2" data-i="${idx}" data-f="desc.en">${esc(it.desc.en)}</textarea></label>
        <label class="f wide">الوصف (عربي)<textarea rows="2" class="ar" data-i="${idx}" data-f="desc.ar">${esc(it.desc.ar)}</textarea></label>
        <label class="f">Photo path<input type="text" data-i="${idx}" data-f="img" value="${esc(it.img || '')}" placeholder="img/dishes/name.jpg"></label>
        <label class="f">ID (unique, latin)<input type="text" data-i="${idx}" data-f="id" value="${esc(it.id)}"></label>
        <div class="f wide chk"><label><input type="checkbox" data-i="${idx}" data-f="hit" ${it.hit ? 'checked' : ''}> ⭐ Best seller (shown on homepage, max 4)</label>
          <label><input type="checkbox" data-i="${idx}" data-f="hidden" ${it.hidden ? 'checked' : ''}> Hidden (sold out)</label></div>
        <div class="f wide"><span>Options shown when ordering</span><div class="chk">${mods}</div></div>
        <div class="row-act"><button class="btn btn-ghost sm" type="button" data-dup="${idx}">Duplicate</button><button class="btn btn-red sm" type="button" data-del="${idx}">Delete</button></div>
      </div></details>`;
  }

  function renderItems() {
    const f = q.trim().toLowerCase();
    const match = it => !f || (it.name.en + ' ' + it.name.ar + ' ' + it.id).toLowerCase().includes(f);
    const known = new Set(M.categories.map(c => c.id));
    const groups = [...M.categories, { id: '__none', name: { en: 'Uncategorized' } }];
    let html = `<div style="display:flex;gap:.6rem;flex-wrap:wrap;align-items:center;margin-bottom:.5rem">
      <input class="search" id="search" type="search" placeholder="Search…" value="${esc(q)}">
      <button class="btn btn-gold sm" id="addItem" type="button">＋ Add item</button></div>`;
    groups.forEach(c => {
      const list = M.items.map((it, i) => [it, i]).filter(([it]) => (c.id === '__none' ? !known.has(it.cat) : it.cat === c.id) && match(it));
      if (!list.length) return;
      html += `<h2 class="cat-h display">${esc(c.icon || '')} ${esc(c.name.en || c.id)} <small style="font-size:.9rem;opacity:.6">(${list.length})</small></h2>` + list.map(([it, i]) => itemHTML(it, i)).join('');
    });
    $('#pane').innerHTML = html;
  }

  function renderCats() {
    $('#pane').innerHTML = `<button class="btn btn-gold sm" id="addCat" type="button" style="margin-bottom:1rem">＋ Add category</button>` +
      M.categories.map((c, i) => `<div class="cat-row">
        <label class="f">ID<input type="text" data-c="${i}" data-f="id" value="${esc(c.id)}"></label>
        <label class="f">Icon<input type="text" data-c="${i}" data-f="icon" value="${esc(c.icon || '')}"></label>
        <label class="f">Name (EN)<input type="text" data-c="${i}" data-f="name.en" value="${esc(c.name.en)}"></label>
        <label class="f">الاسم (AR)<input type="text" class="ar" data-c="${i}" data-f="name.ar" value="${esc(c.name.ar)}"></label>
        <div class="chk"><button class="btn btn-ghost sm" data-up="${i}" type="button">↑</button><button class="btn btn-ghost sm" data-dn="${i}" type="button">↓</button><button class="btn btn-red sm" data-delcat="${i}" type="button">✕</button></div>
      </div>`).join('') + `<p class="note">Order here = order of tabs on the menu page. A category can be deleted only when it has no items.</p>`;
  }
  const render = () => { if (!M) return; tab === 'items' ? renderItems() : renderCats(); };

  /* ---------- события ---------- */
  const pane = $('#pane');
  pane.addEventListener('toggle', e => { const d = e.target.closest('details'); if (d) d.open ? openIds.add(d.dataset.id) : openIds.delete(d.dataset.id); }, true);

  pane.addEventListener('input', e => {
    const t = e.target;
    if (t.id === 'search') { q = t.value; const pos = t.selectionStart; renderItems(); const s = $('#search'); s.focus(); s.setSelectionRange(pos, pos); return; }
    if (t.dataset.i !== undefined && t.dataset.f) {
      const it = M.items[+t.dataset.i]; let v = t.type === 'checkbox' ? t.checked : t.value;
      if (t.dataset.f === 'price') v = Math.max(0, Number(v) || 0);
      if (t.dataset.f === 'id') { openIds.delete(it.id); openIds.add(v); it.id = v.trim(); setDirty(true); return; }
      setPath(it, t.dataset.f, v); setDirty(true);
      const sm = t.closest('details').querySelector('summary .nm'); if (sm && t.dataset.f.startsWith('name')) sm.textContent = it.name.en || it.name.ar || '(no name)';
    } else if (t.dataset.c !== undefined) {
      setPath(M.categories[+t.dataset.c], t.dataset.f, t.value); setDirty(true);
    }
  });

  pane.addEventListener('change', e => {
    const t = e.target;
    if (t.dataset.mod) {                       // чекбокс группы модификаторов
      const it = M.items[+t.dataset.i]; it.mods = it.mods || [];
      it.mods = t.checked ? [...new Set([...it.mods, t.dataset.mod])] : it.mods.filter(k => k !== t.dataset.mod);
      setDirty(true);
    } else if (t.dataset.i !== undefined && ['cat', 'hit', 'hidden', 'img'].includes(t.dataset.f)) {
      renderItems();                           // перегруппировать / обновить значки
    }
  });

  pane.addEventListener('click', e => {
    const b = e.target.closest('button'); if (!b) return;
    if (b.id === 'addItem') {
      const n = M.items.filter(i => i.id.startsWith('new-item')).length + 1, id = 'new-item-' + n;
      M.items.unshift({ id, cat: (M.categories[0] || {}).id || '', price: 0, img: null, name: { ar: '', en: 'New item' }, desc: { ar: '', en: '' } });
      openIds.add(id); setDirty(true); q = ''; renderItems(); document.querySelector(`details[data-id="${id}"]`).scrollIntoView({ block: 'center' });
    } else if (b.dataset.del !== undefined) {
      const it = M.items[+b.dataset.del]; if (confirm(`Delete “${it.name.en || it.id}”?`)) { M.items.splice(+b.dataset.del, 1); setDirty(true); renderItems(); }
    } else if (b.dataset.dup !== undefined) {
      const c = JSON.parse(JSON.stringify(M.items[+b.dataset.dup])); c.id += '-copy'; c.hit = false; openIds.add(c.id);
      M.items.splice(+b.dataset.dup + 1, 0, c); setDirty(true); renderItems();
    } else if (b.id === 'addCat') {
      M.categories.push({ id: 'new-category-' + (M.categories.length + 1), icon: 'img/category-icons/broasted-chicken-meals.svg', name: { ar: '', en: 'New category' } }); setDirty(true); renderCats();
    } else if (b.dataset.up !== undefined || b.dataset.dn !== undefined) {
      const i = +(b.dataset.up ?? b.dataset.dn), j = b.dataset.up !== undefined ? i - 1 : i + 1;
      if (j >= 0 && j < M.categories.length) { [M.categories[i], M.categories[j]] = [M.categories[j], M.categories[i]]; setDirty(true); renderCats(); }
    } else if (b.dataset.delcat !== undefined) {
      const c = M.categories[+b.dataset.delcat];
      if (M.items.some(it => it.cat === c.id)) return alert('This category still has items. Move or delete them first.');
      if (confirm(`Delete category “${c.name.en || c.id}”?`)) { M.categories.splice(+b.dataset.delcat, 1); setDirty(true); renderCats(); }
    }
  });

  document.querySelectorAll('.tab').forEach(b => b.addEventListener('click', () => {
    tab = b.dataset.tab; document.querySelectorAll('.tab').forEach(x => x.setAttribute('aria-pressed', x === b)); render();
  }));

  /* ---------- загрузка / скачивание ---------- */
  function load(m, markDirty) { M = normalize(m); q = ''; setDirty(!!markDirty); if (!markDirty) $('#status').textContent = '✓ loaded'; render(); }

  $('#fileIn').addEventListener('change', e => {
    const f = e.target.files[0]; if (!f) return;
    const r = new FileReader();
    r.onload = () => { try { const j = JSON.parse(r.result);
        if (!j.items || !j.categories) throw new Error('This file is not in the site format (needs "categories" and "items").');
        load(j, false); } catch (err) { alert('Could not read file: ' + err.message); } };
    r.readAsText(f); e.target.value = '';
  });
  $('#newBtn').addEventListener('click', () => {
    if (dirty && !confirm('Discard current changes and start empty?')) return;
    load({ currency: 'EGP', categories: [{ id: 'main', icon: 'img/category-icons/broasted-chicken-meals.svg', name: { ar: 'الرئيسية', en: 'Main' } }], modifiers: {}, items: [] }, false);
  });

  function validate() {
    const errs = [], ids = new Set(), cats = new Set(M.categories.map(c => c.id));
    if (new Set(M.categories.map(c => c.id)).size !== M.categories.length || M.categories.some(c => !/^[a-z0-9-]+$/.test(c.id))) errs.push('Category IDs must be unique and use only a–z, 0–9 and “-”.');
    M.items.forEach(it => {
      const n = it.name.en || it.name.ar || it.id || '(no name)';
      if (!/^[a-z0-9-]+$/.test(it.id)) errs.push(`“${n}”: ID must use only latin letters a–z, digits and “-”.`);
      if (ids.has(it.id)) errs.push(`Duplicate ID: ${it.id}`); ids.add(it.id);
      if (!it.name.en.trim() || !it.name.ar.trim()) errs.push(`“${n}”: fill in both English and Arabic names.`);
      if (!(it.price >= 0)) errs.push(`“${n}”: invalid price.`);
      if (!cats.has(it.cat)) errs.push(`“${n}”: choose a category.`);
    });
    if (M.items.filter(i => i.hit && !i.hidden).length > 4) errs.push('More than 4 best sellers are marked — the homepage shows only the first 4.');
    return errs;
  }

  $('#dlBtn').addEventListener('click', () => {
    const errs = validate(), box = $('#errs');
    box.hidden = !errs.length; box.innerHTML = errs.map(e => '⚠ ' + esc(e)).join('<br>');
    if (errs.some(e => !e.startsWith('More than 4'))) { window.scrollTo({ top: 0, behavior: 'smooth' }); return; }   // «hit > 4» — только предупреждение
    const clean = JSON.parse(JSON.stringify(M));
    clean.items.forEach(it => {
      it.price = Number(it.price) || 0; it.img = (it.img || '').trim() || null;
      if (!it.hit) delete it.hit; if (!it.hidden) delete it.hidden; if (!it.mods || !it.mods.length) delete it.mods;
    });
    const url = URL.createObjectURL(new Blob([JSON.stringify(clean, null, 1)], { type: 'application/json' }));
    const a = Object.assign(document.createElement('a'), { href: url, download: 'menu.json' }); document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 2000);
    $('#status').textContent = '✓ downloaded — now upload it to GitHub'; $('#status').classList.remove('dirty'); dirty = false;
  });

  window.addEventListener('beforeunload', e => { if (dirty) { e.preventDefault(); e.returnValue = ''; } });

  /* ---------- старт: черновик → иначе data/menu.json с сервера ---------- */
  (async () => {
    let draft = null; try { draft = JSON.parse(localStorage.getItem(DRAFT) || 'null'); } catch (e) {}
    if (draft && draft.items && confirm('Restore your unsaved draft from this browser?\n(Cancel = load the published menu.json)')) { load(draft, true); return; }
    try { const r = await fetch('data/menu.json', { cache: 'no-cache' }); if (!r.ok) throw 0; load(await r.json(), false); }
    catch (e) { $('#status').textContent = 'Could not load data/menu.json — use “Load menu.json” or “Start empty”'; M = normalize(null); render(); }
  })();
})();

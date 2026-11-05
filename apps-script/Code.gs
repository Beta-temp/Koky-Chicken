/**
 * Koky Chicken — приём заказов с сайта в Google Таблицу.
 * Вставить в: Таблица → Расширения → Apps Script. Деплой: Deploy → New deployment → Web app
 * (Execute as: Me, Who has access: Anyone) → скопировать URL «…/exec» в GOOGLE_SHEET_WEBHOOK_URL (js/checkout.js).
 */
const SHEET_NAME = 'Orders';
const HEADERS = ['Date', 'Order ID', 'Name', 'Phone', 'Type', 'Address', 'Order', 'Total (EGP)', 'Comment'];
const TIMEZONE = 'Africa/Cairo';

function doPost(e) {
  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(15000);                              // два заказа одновременно не перезапишут друг друга
    const d = JSON.parse(e.postData.contents);
    const sh = getSheet_();

    const order = (d.items || []).map(i =>
      i.qty + 'x ' + i.name + (i.options && i.options.length ? ' (' + i.options.join(', ') + ')' : '') + ' - ' + i.lineTotal + ' EGP'
    ).join('\n');

    const row = sh.getLastRow() + 1;
    const range = sh.getRange(row, 1, 1, HEADERS.length);
    // Текстовый формат до записи: текст клиента не станет формулой (=, +, - в начале), телефон сохранит «+»
    range.setNumberFormats([['yyyy-mm-dd hh:mm', '@', '@', '@', '@', '@', '@', '0', '@']]);
    range.setValues([[
      d.date ? new Date(d.date) : new Date(),
      String(d.orderId || ''), String(d.name || ''), String(d.phone || ''), String(d.type || ''),
      String(d.address || ''), order, Number(d.total) || 0, String(d.comment || '')
    ]]);
    sh.getRange(row, 7).setWrap(true);
    return json_({ ok: true, orderId: d.orderId });
  } catch (err) {
    return json_({ ok: false, error: String(err) });
  } finally {
    lock.releaseLock();
  }
}

// Проверка в браузере: открыть URL «…/exec» — должно вернуть {"ok":true,...}
function doGet() { return json_({ ok: true, service: 'Koky Chicken orders' }); }

function getSheet_() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sh = ss.getSheetByName(SHEET_NAME);
  if (!sh) sh = ss.insertSheet(SHEET_NAME);
  if (sh.getLastRow() === 0) {
    sh.appendRow(HEADERS);
    sh.getRange(1, 1, 1, HEADERS.length).setFontWeight('bold').setBackground('#FFC107');
    sh.setFrozenRows(1);
    sh.setColumnWidth(7, 380);
  }
  return sh;
}

function json_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}

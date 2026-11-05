# Koky Chicken — сайт

## Куда что кладётся (GitHub Pages)
Всё содержимое этой папки — в КОРЕНЬ репозитория (index.html должен лежать в корне, не во вложенной папке).

index.html, menu.html, checkout.html, admin.html — страницы
css/ — стили | js/ — скрипты | data/menu.json — меню (его меняет админка)
img/ — логотип, favicon, og-image, фото блюд (img/dishes/)
apps-script/Code.gs — НЕ для сайта: вставляется в Google Таблицу (Apps Script)

## Что подставить
1. js/checkout.js → GOOGLE_SHEET_WEBHOOK_URL (WhatsApp-номер уже стоит)
2. G-XXXXXXXXXX → ваш GA4 ID (index.html, menu.html, checkout.html)
3. YOUR-USER.github.io/koky-chicken → реальный адрес сайта (og:image в index.html и menu.html)
4. Часы работы и адрес — блок контактов в index.html и словарь I18N (ключ hours, addr)

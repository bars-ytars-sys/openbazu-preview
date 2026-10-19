/* Локальная демонстрация. Не является пакетом внедрения в Тильду. */
(() => {
  'use strict';
  const base = new URL('.', document.currentScript.src);
  const sharedDemo = location.hostname === 'bars-ytars-sys.github.io' && location.pathname.startsWith('/openbazu-preview/prices-19-10/');
  if (!['localhost','127.0.0.1'].includes(location.hostname) && !sharedDemo) return;
  const routes = new Set((document.body.dataset.demoRoutes || '').split(','));
  const dialog = document.getElementById('ob-price-demo-dialog');
  const form = document.getElementById('ob-price-demo-form');
  const content = document.getElementById('ob-price-form-content');
  const success = document.getElementById('ob-price-success');
  let trigger;
  let service = '';
  function open(button) {
    trigger = button;
    const card = button.closest('.t-store__card,.t-store__prod-popup__container,li,tr,article,.ob-пвт,.ob-тар');
    const product = button.closest('.t-store__card,.t-store__prod-popup__container');
    const productName = product?.querySelector('.js-store-prod-name,.t-store__card__title,.t-store__prod-popup__name')?.textContent;
    service = productName || button.dataset.obService || button.getAttribute('data-ob-услуга') ||
      card?.querySelector('h3,h4,.t-store__card__title,.t-store__prod-popup__name')?.textContent ||
      document.querySelector('h1')?.textContent || document.title;
    document.getElementById('ob-price-service').textContent = service.trim();
    content.hidden = false;
    success.hidden = true;
    dialog.showModal();
    form.elements.name.focus();
  }
  function close() {
    dialog.close();
    trigger?.focus();
  }
  document.addEventListener('click', event => {
    const a = event.target.closest('a,button');
    if (!a) return;
    const href = a.getAttribute('href') || '';
    if (href && !href.startsWith('#')) {
      const destination = new URL(href,location.href);
      const originalSite = ['xn--80abtjtnmcm9em.xn--p1ai','открытьбазу.рф'].includes(destination.hostname);
      if (originalSite || (destination.origin === location.origin && !destination.pathname.startsWith(base.pathname))) {
        const route = decodeURIComponent(destination.pathname).replace(/^\/+|\/+$/g,'').replace(/\.html$/,'') || 'index';
        if (routes.has(route)) {
          event.preventDefault();
          event.stopImmediatePropagation();
          location.assign(new URL(route+'.html'+destination.hash,base).href);
          return;
        }
      }
    }
    if (/^#(?:popup:|order)/.test(href) || a.matches('.js-store-prod-btn2,.js-store-prod-popup-buy-btn,.ob-price-request')) {
      event.preventDefault();
      event.stopImmediatePropagation();
      open(a);
    }
  }, true);
  dialog.querySelector('.ob-price-close').addEventListener('click', close);
  dialog.querySelector('.ob-price-done').addEventListener('click', close);
  dialog.addEventListener('click', event => {
    if (event.target === dialog) {
      const r = dialog.getBoundingClientRect();
      if (event.clientX < r.left || event.clientX > r.right || event.clientY < r.top || event.clientY > r.bottom) close();
    }
  });
  document.addEventListener('ob-demo-submit', () => {
    if (!form.reportValidity()) return;
    const fields = Object.fromEntries(new FormData(form));
    const key = 'openbazu-price-demo-1910';
    try {
      const requests = JSON.parse(localStorage.getItem(key) || '[]');
      requests.push({id:crypto.randomUUID(),createdAt:new Date().toISOString(),service,...fields});
      localStorage.setItem(key,JSON.stringify(requests));
    } catch (e) {
      let note = form.querySelector('[role="alert"]');
      if (!note) { note = document.createElement('p'); note.setAttribute('role','alert'); form.append(note); }
      note.textContent = 'Не удалось сохранить заявку. Проверьте доступность хранилища браузера.';
      return;
    }
    content.hidden = true;
    success.hidden = false;
    form.reset();
    success.focus();
  });
  // Каталог Тильды загружает карточки после готовности страницы.
  function cleanCatalog() {
    if (document.body.dataset.priceEnabled !== 'true') return;
    for (const button of document.querySelectorAll('.t-store__card a[href^="#order"],.t-store__prod-popup a[href^="#order"],.js-store-prod-btn2,.js-store-prod-popup-buy-btn')) {
      if (button.dataset.obPriceReady) continue;
      button.dataset.obPriceReady = 'true';
      button.textContent = 'Узнать цену';
      button.setAttribute('href','#popup:zayavka');
    }
    // Лента новостей создаёт собственный CTA уже после загрузки HTML.
    for (const node of document.querySelectorAll('p,span,div')) {
      if (node.children.length || node.closest('script,style,#ob-price-demo-dialog,[data-ob-keep-price],.ob-price-from')) continue;
      const text=node.textContent;
      if (/консультац/i.test(text) && /(?:от\s*)?\d[\d\s\u00a0\u202f]*₽/.test(text)) {
        node.textContent=text.replace(/(?:от\s*)?\d[\d\s\u00a0\u202f]*₽/g,'по запросу');
      }
    }
  }
  cleanCatalog();
  let pending = false;
  new MutationObserver(() => {
    if (pending) return;
    pending = true;
    requestAnimationFrame(() => { pending = false; cleanCatalog(); });
  }).observe(document.body,{childList:true,subtree:true});
})();

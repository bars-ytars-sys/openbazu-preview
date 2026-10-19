/* Только согласованные демо: исключаем отправку данных в рабочие сервисы. */
(() => {
  'use strict';
  const base = new URL('.', document.currentScript.src);
  const sharedDemo = location.hostname === 'bars-ytars-sys.github.io' && location.pathname.startsWith('/openbazu-preview/prices-19-10/');
  if (!['localhost', '127.0.0.1'].includes(location.hostname) && !sharedDemo) return;
  document.addEventListener('submit', event => {
    event.preventDefault();
    event.stopImmediatePropagation();
    if (event.target.id === 'ob-price-demo-form') {
      document.dispatchEvent(new CustomEvent('ob-demo-submit', { detail: event.target }));
    }
  }, true);
  HTMLFormElement.prototype.submit = function () {};
  const originalFetch = window.fetch;
  window.fetch = function (input, init = {}) {
    const method = String(init.method || (input && input.method) || 'GET').toUpperCase();
    if (!['GET', 'HEAD'].includes(method)) return Promise.reject(new Error('Демо: отправка в сервисы отключена'));
    return originalFetch.call(this, input, init);
  };
  const originalOpen = XMLHttpRequest.prototype.open;
  const originalSend = XMLHttpRequest.prototype.send;
  const responseTextGetter = Object.getOwnPropertyDescriptor(XMLHttpRequest.prototype,'responseText').get;
  XMLHttpRequest.prototype.open = function (method, ...args) {
    this.obDemoBlocked = !['GET', 'HEAD'].includes(String(method).toUpperCase());
    const requested = new URL(String(args[0]), location.href);
    if (/^store\.tildaapi\./.test(requested.hostname) && /\/api\/get(?:productslist|product|relevantproducts)\//.test(requested.pathname)) {
      // Публичный снимок 37 проектов: локальная загрузка сохраняет родные
      // карточки, галереи и описания, не обращаясь к кабинету Тильды.
      args[0] = new URL('catalog-products.json', base).href;
      this.addEventListener('readystatechange', () => {
        if (this.readyState !== 4 || this.status !== 200) return;
        try {
          const data=JSON.parse(responseTextGetter.call(this));
          const params=requested.searchParams;
          let products=data.products;
          if (/\/getproduct\//.test(requested.pathname)) {
            const uid=params.get('productuid');
            Object.defineProperty(this,'responseText',{configurable:true,value:JSON.stringify({partuid:data.partuid,product:products.find(p=>String(p.uid)===uid)})});
            return;
          }
          const query=[...params].find(([key])=>/search|query|\[q\]/i.test(key));
          if (query?.[1]) products=products.filter(p=>(p.title+' '+p.descr).toLocaleLowerCase('ru').includes(query[1].toLocaleLowerCase('ru')));
          const sort=(params.get('sort')||'').split(':');
          if (sort[0]) {
            const dir=sort[1]==='desc'?-1:1;
            products=[...products].sort((a,b)=>dir*(sort[0]==='title'?String(a.title).localeCompare(String(b.title),'ru'):Number(a[sort[0]]||0)-Number(b[sort[0]]||0)));
          }
          data.products=products;
          data.total=products.length;
          Object.defineProperty(this,'responseText',{configurable:true,value:JSON.stringify(data)});
        } catch (e) { console.error('Не удалось прочитать локальный каталог',e); }
      });
    }
    return originalOpen.call(this, method, ...args);
  };
  XMLHttpRequest.prototype.send = function (...args) {
    if (!this.obDemoBlocked) return originalSend.apply(this, args);
    this.abort();
  };
  navigator.sendBeacon = () => false;
})();

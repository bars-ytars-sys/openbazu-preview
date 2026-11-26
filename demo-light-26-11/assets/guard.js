(function () {
  'use strict';
  const base = new URL('../', document.currentScript.src);
  window.LD_BASE = base.href;
  window.__obSite = 1;
  window.__obArticle = 1;
  const map = {
    '/': 'index.html', '/cases': 'cases.html', '/engineering': 'engineering.html',
    '/building': 'building.html', '/consultations': 'consultations.html',
    '/materials': 'materials.html', '/websites': 'websites.html',
    '/promotion': 'websites.html', '/services': 'services.html',
    '/shop-projects': 'shop-projects.html',
    '/privacy':'privacy.html'
  };
  window.LD_URL = function (path) {
    const u = new URL(path, 'https://xn--80abtjtnmcm9em.xn--p1ai/');
    const key = u.pathname.replace(/\/+$/, '') || '/';
    if (map[key]) return new URL(map[key] + u.search + u.hash, base).href;
    if (key.includes('/shop-projects/tproduct/')) {
      const uid = key.match(/1888966131-(\d+)/)?.[1];
      return new URL('shop-projects.html?house=' + encodeURIComponent(uid || ''), base).href;
    }
    return null;
  };
  const incoming = new URL(location.href);
  window.LD_INCOMING = {
    article: incoming.searchParams.get('ob_article'),
    request: incoming.searchParams.get('ob_request')
  };
  incoming.searchParams.delete('ob_article'); incoming.searchParams.delete('ob_request');
  if (incoming.href !== location.href) history.replaceState(null, '', incoming.href);

  const originalFetch = window.fetch.bind(window);
  function storeURL(input) {
    let u; try { u = new URL(typeof input === 'string' ? input : input.url, location.href); } catch (_) { return null; }
    if (u.hostname !== 'store.tildaapi.com') return null;
    const part = u.searchParams.get('storepartuid');
    const rec = u.searchParams.get('recid');
    if (rec && rec !== '1888966131') return null;
    if (part && !['583737525251','428536079822','649004208912','569073953982'].includes(part)) return null;
    const endpoint = u.pathname.match(/\/api\/(\w+)\//)?.[1];
    let file;
    if (endpoint === 'getproductslist') {
      const n = +u.searchParams.get('size') || 6, slice = +u.searchParams.get('slice') || 1;
      file = n >= 50 ? 'list-all.json' : 'list-' + n + '-' + slice + '.json';
    } else if (endpoint === 'getfilters') file = 'filters.json';
    else if (endpoint === 'getrelevantproducts') file = 'relevant.json';
    return file ? new URL('store/' + file, base).href : null;
  }
  function analytics(u) { return /mc\.yandex|metrika\.yandex|google-analytics|googletagmanager|gso\.amocrm|tilda-stat/.test(String(u)); }
  window.fetch = function (input, options) {
    const method = String(options?.method || input?.method || 'GET').toUpperCase();
    if (!['GET', 'HEAD'].includes(method) || analytics(input?.url || input)) return Promise.reject(new Error('Demo: outgoing write disabled'));
    return originalFetch(storeURL(input) || input, options);
  };
  const open = XMLHttpRequest.prototype.open, send = XMLHttpRequest.prototype.send;
  XMLHttpRequest.prototype.open = function (method, url) {
    this.__ldBlocked = !['GET', 'HEAD'].includes(String(method).toUpperCase()) || analytics(url);
    const args = [...arguments]; args[1] = storeURL(String(url)) || url;
    return open.apply(this, args);
  };
  XMLHttpRequest.prototype.send = function () { if (!this.__ldBlocked) return send.apply(this, arguments); };
  navigator.sendBeacon = function () { return false; };
  HTMLFormElement.prototype.submit = function () {};
  window.addEventListener('submit', function (event) {
    if (!event.target.matches('.ld-form')) { event.preventDefault(); event.stopImmediatePropagation(); }
  }, true);
  window.addEventListener('click', function (event) {
    const trigger = event.target.closest?.('a,button');
    if (!trigger) return;
    if (window.LD_HANDLE?.(event, trigger)) { event.preventDefault(); event.stopImmediatePropagation(); return; }
    if (trigger.tagName !== 'A') return;
    const href = trigger.getAttribute('href');
    if (!href || href.startsWith('#') || /^(tel:|mailto:|javascript:)/i.test(href)) return;
    let u; try { u = new URL(href, location.href); } catch (_) { return; }
    // This verified public service has no copied demo page; allow its explicit link only.
    if (trigger.matches('#obc26-services a[data-obc-public-link="interior"]') && u.protocol === 'https:' && u.hostname === 'xn--80abtjtnmcm9em.xn--p1ai' && u.pathname === '/interiordesign') return;
    if (u.hostname === 'xn--80abtjtnmcm9em.xn--p1ai' || (u.origin === location.origin && !u.pathname.startsWith(base.pathname))) {
      const target = window.LD_URL(u.pathname + u.search + u.hash);
      if (target) trigger.href = target;
      else { event.preventDefault(); event.stopImmediatePropagation(); window.LD_TOAST?.('Этот раздел не входит в демонстрацию.'); }
    }
  }, true);
})();

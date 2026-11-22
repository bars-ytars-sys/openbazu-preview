(function () {
  'use strict';
  const data = window.LD_DATA;
  if (!data) return;
  const $ = (s, root = document) => root.querySelector(s);
  const $$ = (s, root = document) => [...root.querySelectorAll(s)];
  const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const asset = p => new URL(p, window.LD_BASE).href;
  const money = n => Number(n).toLocaleString('ru-RU') + ' ₽';
  const page = document.body.dataset.ldPage || 'main';
  const findCase = id => data.cases.find(c => c.id === id);
  const findHouse = uid => data.products.find(p => p.uid === uid);
  const events = [];
  window.LD_EVENTS = events;
  function track(name, context = {}) {
    events.push({name, page, ...context, time: Date.now()});
  }
  let toastTimer;
  window.LD_TOAST = text => {
    $('.ld-toast')?.remove();
    const n = document.createElement('div'); n.className = 'ld-toast'; n.setAttribute('role', 'status'); n.textContent = text;
    document.body.append(n); clearTimeout(toastTimer); toastTimer = setTimeout(() => n.remove(), 2600);
  };

  let overlay, lastFocus, scrollStyle, currentContext, selectedChannel = 'phone';
  function closeModal() {
    if (!overlay) return;
    overlay.remove(); overlay = null;
    document.documentElement.style.overflow = scrollStyle || '';
    if (lastFocus?.isConnected) lastFocus.focus({preventScroll:true});
  }
  function modal(content, wide = false, focusSelector) {
    $('.ld-toast')?.remove();
    if (!overlay) { lastFocus = document.activeElement; scrollStyle = document.documentElement.style.overflow; }
    else overlay.remove();
    overlay = document.createElement('div'); overlay.className = 'ld-overlay';
    overlay.innerHTML = '<section class="ld-dialog' + (wide ? ' ld-dialog--wide' : '') + '" role="dialog" aria-modal="true" aria-labelledby="ld-modal-title"><button type="button" class="ld-iconbutton ld-close" data-ld-close aria-label="Закрыть">×</button>' + content + '</section>';
    overlay.addEventListener('click', e => { if (e.target === overlay) closeModal(); });
    overlay.addEventListener('keydown', e => {
      if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); closeModal(); }
      if (e.key === 'Tab') {
        const focusable = $$('button:not([disabled]),a[href],input,textarea,select,[tabindex="0"]', overlay).filter(n => n.getClientRects().length);
        const first = focusable[0], last = focusable.at(-1);
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last?.focus(); }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first?.focus(); }
      }
    });
    document.body.append(overlay); document.documentElement.style.overflow = 'hidden';
    (focusSelector ? $(focusSelector, overlay) : $('.ld-close', overlay))?.focus({preventScroll:true});
    return overlay;
  }
  const defaultTitles = {
    main:'Обсудить мой проект', engineering:'Обсудить проектирование моего участка',
    consultations:'Подобрать формат консультации', building:'Обсудить строительство базы отдыха',
    websites:'Обсудить продвижение моей базы', cases:'Обсудить похожий проект',
    materials:'Подобрать материалы для моей задачи', services:'Подобрать услугу под мою задачу',
    catalog:'Запросить смету строительства'
  };
  function contextFrom(trigger) {
    const card = trigger?.closest('article,.ob-пвт__c,.t-store__card,.ob-cn__c,.ob-cnn');
    let topic = trigger?.dataset.ldRequest || trigger?.dataset.obService || trigger?.getAttribute('data-ob-услуга') || '';
    if (!topic && card) topic = card.querySelector('h3,h4,.ob-cn__t,.js-store-prod-name')?.textContent.trim() || '';
    const gift = page === 'main' && (trigger?.id === 'ob-bzw' || /подар/i.test(trigger?.textContent || ''));
    return {title: gift ? 'Обсудить проект и получить материалы' : topic || defaultTitles[page] || 'Обсудить мой проект', topic: topic || defaultTitles[page] || 'Обсудить мой проект', gift};
  }
  function request(context) {
    currentContext = context; selectedChannel = 'phone';
    clearTimeout(articleTimer);
    $('.ld-article-invite')?.setAttribute('hidden', '');
    const description = context.description || 'Команда уточнит исходные данные, подберёт формат работы и расскажет об условиях.';
    const summary = context.summary ? '<div class="ld-summary"><strong>Ваш запрос</strong>' + context.summary + '</div>' : '';
    modal('<p class="ld-eyebrow">Ваш проект</p><h2 id="ld-modal-title">' + esc(context.title) + '</h2><p>' + esc(description) + '</p>' + summary +
      '<form class="ld-form" id="ld-request-form"><label for="ld-name">Как к вам обращаться</label><input id="ld-name" name="name" autocomplete="given-name" placeholder="Ваше имя" maxlength="80" required>' +
      '<label>Как удобнее связаться</label><div class="ld-channels" role="group" aria-label="Способ связи"><button type="button" data-ld-channel="phone" aria-pressed="true">Телефон</button><button type="button" data-ld-channel="telegram" aria-pressed="false">Telegram</button><button type="button" data-ld-channel="max" aria-pressed="false">MAX</button></div>' +
      '<label for="ld-contact" id="ld-contact-label">Номер телефона</label><input id="ld-contact" name="contact" type="tel" autocomplete="tel" placeholder="+7 (___) ___-__-__" maxlength="100" required>' +
      '<label for="ld-comment">Что важно учесть <span class="ld-muted">— по желанию</span></label><textarea id="ld-comment" name="comment" rows="2" maxlength="1000" placeholder="Например: участок есть, хотим начать с четырёх домов"></textarea>' +
      '<label class="ld-consent"><input type="checkbox" name="consent" required><span>Я даю согласие на обработку персональных данных в соответствии с <a href="' + asset('privacy.html') + '" target="_blank" rel="noopener">политикой конфиденциальности</a>.</span></label>' +
      '<button class="ld-button" type="submit">Обсудить задачу <span aria-hidden="true">→</span></button><p class="ld-demohint">Демо: контакты не отправляются и не сохраняются.</p></form>');
    $('#ld-request-form').addEventListener('submit', e => {
      e.preventDefault();
      const contact = $('#ld-contact'); contact.setCustomValidity('');
      if (selectedChannel === 'phone' && !/^[+\d\s()-]{7,25}$/.test(contact.value.trim())) contact.setCustomValidity('Укажите номер телефона.');
      if (selectedChannel !== 'phone' && contact.value.trim().length < 3) contact.setCustomValidity('Укажите имя пользователя, ссылку или номер.');
      if (!e.target.reportValidity()) return;
      window.LD_LAST_REQUEST = {topic:context.topic, stage:context.stage || '', items:context.items || [], article:context.article || ''};
      track('request_completed_demo', window.LD_LAST_REQUEST);
      success(context);
    });
    track('request_opened', {topic:context.topic, stage:context.stage || ''});
  }
  function channel(value) {
    selectedChannel = value;
    $$('.ld-channels button').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.ldChannel === value)));
    const input = $('#ld-contact'); input.value = ''; input.setCustomValidity('');
    input.type = value === 'phone' ? 'tel' : 'text'; input.autocomplete = value === 'phone' ? 'tel' : 'off';
    input.placeholder = value === 'phone' ? '+7 (___) ___-__-__' : value === 'telegram' ? '@username или номер телефона' : 'Ссылка на профиль или номер телефона';
    $('#ld-contact-label').textContent = value === 'phone' ? 'Номер телефона' : value === 'telegram' ? 'Ваш Telegram' : 'Ваш MAX';
  }
  function success(context) {
    modal('<p class="ld-eyebrow">Следующий шаг</p><h2 id="ld-modal-title">Заявка подготовлена</h2><p>Это демонстрация: данные не отправлены. В рабочей версии команда получит вашу задачу и выбранные параметры.</p>' +
      '<div class="ld-summary"><strong>' + esc(context.title) + '</strong>' + (context.summary || 'Команда уточнит детали и расскажет о подходящем формате работы.') + '</div>' +
      (context.gift ? '<div class="ld-gift-links"><a class="ld-link" target="_blank" rel="noopener" href="https://cdn.jsdelivr.net/gh/bars-ytars-sys/openbazu-preview@1b55f652b125e9ef09e73ff1d31b72400655be7e/assets/guide-land-2026-10-11.pdf">Скачать гайд ↗</a><a class="ld-link" target="_blank" rel="noopener" href="https://bars-ytars-sys.github.io/openbazu-preview/assets/price-services-2026-11-01.pdf">Скачать полный прайс ↗</a><a class="ld-link" target="_blank" rel="noopener" href="https://t.me/openbaza">Открыть наш ТГ канал ↗</a></div>' : '') +
      '<h3>Когда вам удобнее связаться?</h3><div class="ld-nextchoices"><button data-ld-time="В первой половине дня" aria-pressed="false">В первой половине дня</button><button data-ld-time="Во второй половине дня" aria-pressed="false">Во второй половине дня</button><button data-ld-time="Сначала написать в мессенджере" aria-pressed="false">Сначала написать в мессенджере</button></div>' +
      '<label class="ld-file">Исходные материалы — по желанию<span class="ld-muted">План участка, проект или фотографии помогут подготовиться к разговору.</span><input type="file" id="ld-files" multiple accept=".pdf,.jpg,.jpeg,.webp,.webp,.xlsx,.dwg"><span id="ld-file-status" class="ld-muted">В демо файлы остаются на вашем устройстве.</span></label><button class="ld-button ld-button--line" data-ld-close>Вернуться на сайт</button>');
    $('#ld-files').addEventListener('change', e => {
      $('#ld-file-status').textContent = e.target.files.length ? 'Выбрано файлов: ' + e.target.files.length + '. Никуда не загружаются.' : 'В демо файлы остаются на вашем устройстве.';
      track('source_files_selected_demo', {count:e.target.files.length});
    });
  }

  const routes = {
    nozem:{case:'case4',title:'Обсудить выбор участка',description:'Расскажите, где планируете открыть базу. Команда уточнит задачу и подберёт формат консультации.',intro:'Прежде чем покупать землю, важно понять, какой формат базы на ней можно реализовать.',facts:['Выбор из трёх участков','Бюджет 10 млн ₽','Эльбрус'],result:'Выбрали участок, разработали концепцию и финансовую модель. Подготовили пошаговый план развития базы.'},
    zem:{case:'case2',title:'Обсудить проектирование моего участка',description:'Уточним расположение и параметры участка, вашу задачу и исходные материалы. Расскажем, как проходит проектирование.',intro:'Участок уже есть. Теперь нужно связать размещение домов, инфраструктуру и экономику проекта.',facts:['34 сотки','5 домов','Краснодарский край'],result:'Разработали план размещения строений, финансовую модель и план действий. Пересмотрели первоначальный бюджет проекта.'},
    work:{case:'case6',title:'Обсудить развитие моей базы отдыха',description:'Расскажите, что хотите улучшить: загрузку, работу команды, расходы или расширение базы. Подберём формат работы под вашу задачу.',intro:'Для действующей базы важно понять, что мешает развитию и с какого изменения начать.',facts:['14 домов','1,4 га','Собственная база'],result:'«Берёзовая роща»: от первых домов до работающей базы отдыха. Проектирование, строительство, управление и продвижение на одном объекте.'}
  };
  function route(key) {
    const config = routes[key]; if (!config || !$('#ld-proof')) return;
    const c = findCase(config.case);
    $$('[data-ld-route]').forEach(b => b.setAttribute('aria-selected', String(b.dataset.ldRoute === key)));
    $('#ld-proof').innerHTML = '<img class="ld-proof__photo" src="' + asset(c.cover) + '" alt="' + esc(c.title) + '"><div class="ld-proof__body"><p class="ld-eyebrow">Пример нашей работы</p><h3>' + esc(c.title) + '</h3><p>' + esc(config.result) + '</p><div class="ld-facts">' + config.facts.map(f => '<span>' + esc(f) + '</span>').join('') + '</div><div class="ld-actions"><button class="ld-button" data-ld-route-request="' + key + '">' + esc(config.title) + ' <span aria-hidden="true">→</span></button><button class="ld-link" data-ld-case="' + c.id + '">Посмотреть кейс <span aria-hidden="true">↗</span></button></div><div class="ld-proof__hint">' + esc(config.intro) + '</div></div>';
    track('stage_selected', {stage:key});
  }
  const filterLabels = {all:'Все проекты',compact:'Небольшой участок',launch:'Запуск с нуля',reconstruction:'Реконструкция',working:'Работающая база'};
  function caseGrid(filter = 'all') {
    const grid = $('#ld-casegrid'); if (!grid) return;
    const cases = data.cases.filter(c => filter === 'all' || c.tags.includes(filter));
    grid.innerHTML = cases.map(c => '<article class="ld-case"><img src="' + asset(c.cover) + '" alt="' + esc(c.title) + '" loading="lazy"><div class="ld-case__body"><h3>' + esc(c.title) + '</h3><p>' + esc(c.tags.includes('reconstruction') ? 'Работа с существующим объектом и новым планом развития.' : c.tags.includes('working') ? 'Создание, запуск и развитие действующей базы отдыха.' : 'От исходных условий участка до решений по проекту.') + '</p><div class="ld-actions"><button class="ld-button" data-ld-case="' + c.id + '">Посмотреть проект <span aria-hidden="true">↗</span></button><button class="ld-link" data-ld-case-request="' + c.id + '">Обсудить похожий</button></div></div></article>').join('');
    $$('[data-ld-filter]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.ldFilter === filter)));
    $('#ld-case-count').textContent = 'Найдено проектов: ' + cases.length;
    track('case_filter', {filter});
  }
  function openCase(id) {
    const c = findCase(id); if (!c) return;
    const body = c.body.split('\n').map(line => line.trim()).filter(Boolean).map(line => /:$/.test(line) ? '<h3>' + esc(line.replace(/:$/, '')) + '</h3>' : '<p>' + esc(line) + '</p>').join('');
    modal('<p class="ld-eyebrow">Опубликованный кейс</p><h2 id="ld-modal-title">' + esc(c.title) + '</h2><a href="' + asset(c.cover) + '" target="_blank" rel="noopener"><img class="ld-dialog__photo ld-dialog__photo--full" src="' + asset(c.cover) + '" alt="' + esc(c.title) + '"></a><a class="ld-link" href="' + asset(c.cover) + '" target="_blank" rel="noopener">Открыть изображение полностью ↗</a><div class="ld-casecopy">' + body + '</div><button class="ld-button" data-ld-case-request="' + id + '">Обсудить похожий проект <span aria-hidden="true">→</span></button>', true);
    track('case_opened', {case:id});
  }
  function sample(id) {
    let title, body;
    if (id === 'territory') {
      title = 'От участка к решениям по проекту';
      body = '<div class="ld-doc-layout"><div><a href="' + asset('assets/case-2-detail.webp') + '" target="_blank" rel="noopener"><img src="' + asset('assets/case-2-detail.webp') + '" alt="Опубликованные материалы проекта на 34 сотках"></a><a class="ld-link" href="' + asset('assets/case-2-detail.webp') + '" target="_blank" rel="noopener">Открыть план полностью ↗</a></div><div><p>На примере проекта пяти домов на 34 сотках в Краснодарском крае.</p><ol class="ld-preview-list"><li>Размещение строений на участке</li><li>Финансовая модель с расчётом затрат</li><li>Ценообразование на проживание и SPA</li><li>План действий по реализации</li></ol><p class="ld-muted">Иллюстрация и состав работ из опубликованного кейса.</p><button class="ld-link" data-ld-case="case2">Подробнее о проекте ↗</button></div></div>';
    } else if (id === 'finance') {
      title = 'Что учитывает финансовая модель';
      body = '<p>Чтобы связать проект с экономикой, модель учитывает вложения, доходы, расходы и загрузку базы.</p><table class="ld-doc-table"><thead><tr><th>Раздел</th><th>Какие данные нужны</th></tr></thead><tbody><tr><td>Стартовые вложения</td><td>Дома, инженерные сети, инфраструктура</td></tr><tr><td>Выручка</td><td>Загрузка, средний чек, сезонность</td></tr><tr><td>Расходы</td><td>Персонал, закупки, обслуживание, продвижение</td></tr><tr><td>Результат</td><td>Прибыль, точка безубыточности, срок окупаемости</td></tr></tbody></table><div class="ld-summary">Это пример структуры расчёта, без выдуманных финансовых показателей. Показатели вашего проекта рассчитываются по исходным данным.</div>';
    } else {
      title = 'Как книга проекта помогает реализации';
      body = '<p>Она объединяет решения и рекомендации по проекту в одном документе.</p><ol class="ld-preview-list"><li>Обоснование решений по концепции</li><li>Размещение строений и инфраструктуры</li><li>Рекомендации по реализации</li><li>План дальнейших действий</li></ol><div class="ld-summary"><strong>Из опубликованного кейса</strong>Для проекта на 34 сотках подготовили книгу на 30 листах с планом действий на 5 месяцев.</div><p class="ld-muted">Здесь показано назначение документа. Это не фрагмент закрытой клиентской книги.</p>';
    }
    modal('<p class="ld-eyebrow">Результат проектирования</p><h2 id="ld-modal-title">' + title + '</h2>' + body + '<button class="ld-button" data-ld-request="Обсудить проектирование моего участка">Обсудить мой участок <span aria-hidden="true">→</span></button>', true);
    track('project_result_preview', {sample:id});
  }

  let selection = {};
  try { selection = JSON.parse(sessionStorage.getItem('ld-house-selection') || '{}'); } catch (_) {}
  Object.keys(selection).forEach(uid => { if (!findHouse(uid)) delete selection[uid]; else selection[uid] = Math.min(99, Math.max(1, Number(selection[uid]) || 1)); });
  let region = '', completion = 'Под ключ', houseFilter = 'all', shownHouses = 6, galleryIndex = 0, openedHouse = null;
  function saveSelection() {
    try { sessionStorage.setItem('ld-house-selection', JSON.stringify(selection)); } catch (_) {}
    bundleBar();
    $$('[data-ld-add]').forEach(b => { const picked = !!selection[b.dataset.ldAdd]; b.setAttribute('aria-pressed', String(picked)); b.textContent = picked ? 'В подборке для стройки ✓' : 'В подборку для стройки +'; });
  }
  function bundleBar() {
    let bar = $('.ld-bundlebar');
    if (!bar) { bar = document.createElement('div'); bar.className = 'ld-bundlebar'; document.body.append(bar); }
    const types = Object.keys(selection).length, count = Object.values(selection).reduce((a,b) => a+b,0);
    bar.hidden = !types;
    bar.innerHTML = '<div><b>Подборка для строительства</b><span>' + types + ' мод. · домов: ' + count + '</span></div><button class="ld-button" data-ld-bundle>Посмотреть <span aria-hidden="true">→</span></button>';
  }
  function addHouse(uid) {
    if (!findHouse(uid)) return;
    if (selection[uid]) { bundle(); return; }
    selection[uid] = 1; saveSelection(); track('house_added_to_build', {uid});
    window.LD_TOAST('Дом добавлен в подборку для строительства.');
  }
  function catalog(filter = houseFilter, append = false) {
    if (!$('#ld-housegrid')) return;
    if (!append) shownHouses = 6;
    houseFilter = filter;
    const list = data.products.filter(p => filter === 'all' || (p.categories || [p.category]).includes(filter));
    $('#ld-housegrid').innerHTML = list.slice(0, shownHouses).map(p => '<article class="ld-house"><button class="ld-house__photo" data-ld-house="' + p.uid + '" aria-label="Посмотреть ' + esc(p.title) + '"><img src="' + esc(p.images[0] || '') + '" alt="' + esc(p.title) + '" loading="lazy"></button><div class="ld-house__body"><h3>' + esc(p.title) + '</h3><p class="ld-house__meta">' + esc(p.area ? p.area + ' м²' : p.description.replace(/[📏]/g,'')) + (p.kind ? ' · ' + esc(p.kind) : '') + '</p><p class="ld-house__price">' + money(p.price) + '<small>Комплект чертежей</small></p><button class="ld-link" data-ld-house="' + p.uid + '">Посмотреть проект ↗</button><button class="ld-button" data-ld-buy="' + p.uid + '">Купить проект</button><button class="ld-bundle-add" data-ld-add="' + p.uid + '" aria-pressed="' + !!selection[p.uid] + '">' + (selection[p.uid] ? 'В подборке для стройки ✓' : 'В подборку для стройки +') + '</button></div></article>').join('');
    $('#ld-house-count').textContent = 'Проектов: ' + list.length + ' · выберите модель и добавьте нужное количество в подборку';
    $('#ld-load-houses').hidden = shownHouses >= list.length;
    $$('[data-ld-house-filter]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.ldHouseFilter === filter)));
    track('house_filter', {filter});
  }
  function openHouse(uid) {
    const p = findHouse(uid); if (!p) return;
    openedHouse = p; galleryIndex = 0;
    modal('<p class="ld-eyebrow">Готовый проект дома</p><h2 id="ld-modal-title">' + esc(p.title) + '</h2><img class="ld-dialog__photo" id="ld-house-image" src="' + esc(p.images[0] || '') + '" alt="' + esc(p.title) + '"><div class="ld-house__gallery"><button class="ld-iconbutton" data-ld-house-prev aria-label="Предыдущее фото">←</button><span id="ld-house-image-count">1 из ' + p.images.length + '</span><button class="ld-iconbutton" data-ld-house-next aria-label="Следующее фото">→</button></div><div class="ld-summary"><strong>Комплект чертежей — ' + money(p.price) + '</strong>Стоимость проекта не включает строительство дома.</div><div class="ld-house-description">' + esc(p.body).replace(/\n/g,'<br>') + '</div><div class="ld-actions"><button class="ld-button" data-ld-buy="' + uid + '">Купить проект</button><button class="ld-button ld-button--line" data-ld-house-request="' + uid + '">Запросить смету строительства</button><button class="ld-link" data-ld-add="' + uid + '">Добавить в подборку для стройки +</button></div>', true);
    track('house_opened', {uid});
  }
  function buy(uid) {
    const p = findHouse(uid); if (!p) return;
    modal('<p class="ld-eyebrow">Покупка проекта</p><h2 id="ld-modal-title">' + esc(p.title) + '</h2><div class="ld-summary"><strong>' + money(p.price) + '</strong>Комплект чертежей. Строительство оплачивается отдельно.</div><p>Это демонстрация карточки покупки. Оплата и оформление настоящего заказа отключены.</p><div class="ld-actions"><button class="ld-button ld-button--line" data-ld-house="' + uid + '">Вернуться к проекту</button><button class="ld-link" data-ld-house-request="' + uid + '">Нужна смета строительства →</button></div>');
    track('project_purchase_opened_demo', {uid});
  }
  function bundle() {
    const items = Object.keys(selection).map(findHouse).filter(Boolean);
    const rows = items.map(p => '<div class="ld-bundlerow"><img src="' + esc(p.images[0] || '') + '" alt="' + esc(p.title) + '"><div><b>' + esc(p.title) + '</b><small>' + esc(p.area ? p.area + ' м²' : p.description.replace(/[📏]/g,'')) + '</small></div><div><div class="ld-qty"><button data-ld-minus="' + p.uid + '" aria-label="Уменьшить количество: ' + esc(p.title) + '">−</button><output aria-label="Количество: ' + esc(p.title) + '">' + selection[p.uid] + '</output><button data-ld-plus="' + p.uid + '" aria-label="Увеличить количество: ' + esc(p.title) + '">+</button></div><button class="ld-remove" data-ld-remove="' + p.uid + '">Убрать</button></div></div>').join('');
    modal('<p class="ld-eyebrow">Для будущей базы отдыха</p><h2 id="ld-modal-title">Ваша подборка домов</h2><p>Укажите количество домов, регион строительства и комплектацию.</p>' + (rows || '<div class="ld-summary">Подборка пока пуста. Добавьте подходящие модели из каталога.</div>') +
      (rows ? '<form class="ld-form" id="ld-bundle-form"><div class="ld-twocol"><div><label for="ld-region">Регион строительства</label><input id="ld-region" value="' + esc(region) + '" placeholder="Например: Тульская область" maxlength="100"></div><div><label for="ld-completion">Комплектация</label><select id="ld-completion">' + ['Тёплый контур','Под ключ','Под заезд','Нужна помощь с выбором'].map(t=>'<option' + (t===completion ? ' selected' : '') + '>' + t + '</option>').join('') + '</select></div></div><div class="ld-summary">Стоимость строительства рассчитаем по участку и комплектации.</div><button class="ld-button" type="submit">Обсудить строительство <span aria-hidden="true">→</span></button></form>' : '<button class="ld-button" data-ld-close>Выбрать дома</button>'), true);
    $('#ld-region')?.addEventListener('input', e => { region = e.target.value; });
    $('#ld-completion')?.addEventListener('change', e => { completion = e.target.value; });
    $('#ld-bundle-form')?.addEventListener('submit', e => {
      e.preventDefault();
      const picked = items.map(p => ({uid:p.uid,title:p.title,quantity:selection[p.uid]}));
      const summary = '<ul>' + picked.map(p => '<li>' + esc(p.title) + ' — ' + p.quantity + ' шт.</li>').join('') + '</ul><p>' + (region ? 'Регион: ' + esc(region) + '<br>' : '') + 'Комплектация: ' + esc(completion) + '</p>';
      request({title:'Обсудить строительство по подборке',topic:'Строительство: подборка домов',items:picked,summary,description:'Команда уточнит участок, сроки и состав работ. Подготовит предложение по выбранным моделям.'});
    });
    track('construction_bundle_opened', {models:items.length});
  }

  let articleTimer;
  function article() {
    const body = $('.t-cms__page [data-fe-post-control="blocktxt"] .t-redactor__tte-view') || $('.js-feed-post-text');
    if (!body) return;
    const title = ($('.t-cms__page .t-heading .js-cms-text-container') || $('.js-feed-post-title'))?.textContent.trim() || document.title;
    const context = {title:'Обсудить концепцию моей базы отдыха',topic:'Концепция базы отдыха · статья: ' + title,article:title,description:'Расскажите, что уже есть: участок, идея или проект. Команда подберёт формат консультации и расскажет об условиях.'};
    const end = document.createElement('section'); end.className = 'ld-article-end'; end.id = 'ld-article-end';
    end.innerHTML = '<p class="ld-eyebrow">От идеи к вашему проекту</p><h2>Есть участок, но пока не ясно, какой должна быть база?</h2><p>Обсудим вашу задачу и подберём формат консультации по концепции проекта.</p><button class="ld-button" data-ld-article-request>Обсудить концепцию моей базы →</button>';
    body.after(end);
    const invite = document.createElement('aside'); invite.className = 'ld-article-invite'; invite.hidden = true; invite.setAttribute('aria-label','Помощь с концепцией базы отдыха');
    invite.innerHTML = '<button class="ld-iconbutton" data-ld-article-close aria-label="Закрыть">×</button><p class="ld-eyebrow">Ваша база отдыха</p><h2>Хотите обсудить свою концепцию?</h2><p>Расскажите, на каком вы этапе. Подберём формат консультации под вашу задачу.</p><button class="ld-button" data-ld-article-request>Обсудить мой проект →</button>';
    document.body.append(invite);
    window.LD_ARTICLE_CONTEXT = context;
    track('article_context_ready');
    articleTimer = setTimeout(() => {
      if (overlay || document.hidden) return;
      try { if (sessionStorage.getItem('ld-article-invite-seen')) return; sessionStorage.setItem('ld-article-invite-seen','1'); } catch (_) {}
      invite.hidden = false; track('article_invite_shown');
    }, 8000);
  }
  window.LD_HANDLE = (event, el) => {
    const d = el.dataset;
    if ('ldClose' in d) { closeModal(); return true; }
    if (d.ldChannel) { channel(d.ldChannel); return true; }
    if (d.ldTime) { $$('.ld-nextchoices button').forEach(b=>b.setAttribute('aria-pressed',String(b===el)));track('contact_time_selected',{time:d.ldTime});return true; }
    if (d.ldRoute) { route(d.ldRoute); return true; }
    if (d.ldRouteRequest) { const c=routes[d.ldRouteRequest];request({title:c.title,topic:c.title,description:c.description,stage:d.ldRouteRequest});return true; }
    if (d.ldCase) { openCase(d.ldCase); return true; }
    if (d.ldCaseRequest) { const c=findCase(d.ldCaseRequest);if(c)request({title:'Обсудить похожий проект',topic:'Похожий проект: '+c.title,summary:esc(c.title)});return true; }
    if (d.ldFilter) { caseGrid(d.ldFilter); return true; }
    if (d.ldSample) { sample(d.ldSample); return true; }
    if (d.ldRequest) { request(contextFrom(el)); return true; }
    if (d.ldHouse) { openHouse(d.ldHouse); return true; }
    if (d.ldBuy) { buy(d.ldBuy); return true; }
    if (d.ldAdd) { addHouse(d.ldAdd); return true; }
    if (d.ldHouseRequest) {const p=findHouse(d.ldHouseRequest);if(p)request({title:'Смета строительства: '+p.title,topic:'Смета строительства: '+p.title,items:[{uid:p.uid,title:p.title,quantity:1}],description:'Уточним регион, участок и комплектацию, чтобы подготовить предложение по выбранному дому.'});return true;}
    if (d.ldHouseFilter) { catalog(d.ldHouseFilter);$('#ld-catalog')?.scrollIntoView({behavior:'smooth'});return true; }
    if ('ldMoreHouses' in d) { shownHouses+=6;catalog(houseFilter,true);return true; }
    if ('ldBundle' in d) { bundle(); return true; }
    if (d.ldPlus || d.ldMinus || d.ldRemove) {
      const uid=d.ldPlus||d.ldMinus||d.ldRemove;
      if (d.ldRemove) delete selection[uid];
      else selection[uid]=Math.min(99,Math.max(1,(selection[uid]||1)+(d.ldPlus?1:-1)));
      saveSelection(); bundle(); return true;
    }
    if ('ldHouseNext' in d || 'ldHousePrev' in d) {
      const images=openedHouse?.images||[];if(images.length){galleryIndex=(galleryIndex+images.length+('ldHouseNext'in d?1:-1))%images.length;$('#ld-house-image').src=images[galleryIndex];$('#ld-house-image-count').textContent=(galleryIndex+1)+' из '+images.length;}return true;
    }
    if ('ldArticleClose' in d) { $('.ld-article-invite').hidden=true;clearTimeout(articleTimer);return true; }
    if ('ldArticleRequest' in d) { request(window.LD_ARTICLE_CONTEXT);return true; }
    const href=el.getAttribute('href')||'';
    if (/^#case\d+$/.test(href)) {openCase(href.slice(1));return true;}
    if (href.startsWith('#popup:')) {request(contextFrom(el));return true;}
    if (page==='catalog' && ['A-Frame','Barn-House','Каркасные'].includes(el.textContent.trim())) {
      catalog({'A-Frame':'aframe','Barn-House':'barn','Каркасные':'frame'}[el.textContent.trim()]);$('#ld-catalog').scrollIntoView({behavior:'smooth'});return true;
    }
    return false;
  };
  if ($('#ld-proof')) route('zem');
  if ($('#ld-casegrid')) caseGrid();
  if ($('#ld-housegrid')) catalog();
  bundleBar();
  if (page==='article') article();
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && !overlay && $('.ld-article-invite')) $('.ld-article-invite').hidden = true;
    if (e.target.matches?.('[data-ld-route]') && ['ArrowLeft','ArrowRight','Home','End'].includes(e.key)) {
      const tabs = $$('[data-ld-route]'); let index = tabs.indexOf(e.target);
      index = e.key === 'Home' ? 0 : e.key === 'End' ? tabs.length-1 : (index + tabs.length + (e.key === 'ArrowRight' ? 1 : -1)) % tabs.length;
      e.preventDefault(); route(tabs[index].dataset.ldRoute); tabs[index].focus();
    }
  });
  const search=new URL(location.href).searchParams;
  if (search.get('house')) openHouse(search.get('house'));
  if (search.get('case')) openCase(search.get('case'));
  if (search.get('sample')) sample(search.get('sample'));
  if (window.LD_INCOMING?.article) request({title:defaultTitles[page]||'Обсудить мой проект',topic:'Статья: '+window.LD_INCOMING.article,article:window.LD_INCOMING.article});
  else if (window.LD_INCOMING?.request) request({title:window.LD_INCOMING.request,topic:window.LD_INCOMING.request});
})();

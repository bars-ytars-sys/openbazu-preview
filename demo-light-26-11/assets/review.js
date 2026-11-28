(function () {
 'use strict';
 const $=(s,r=document)=>r.querySelector(s), $$=(s,r=document)=>[...r.querySelectorAll(s)];
 const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const page=document.body.dataset.rvPage||'index', projects=window.RV_PROJECTS||[];
 const base=new URL('../',document.currentScript.src),asset=p=>new URL(p,base).href;
 let overlay,focusBefore,overflowBefore,current,channel='phone';
 const defs={
  index:{title:'Обсудить мой проект',description:'Расскажите, на каком этапе вы сейчас. Команда подберёт формат работы под вашу задачу.',extra:'stage',comment:'Что планируете сделать'},
  engineering:{title:'Обсудить проектирование',description:'Уточним исходные данные участка и задачу проекта. Расскажем о составе работы и условиях.',extra:'project',comment:'Что хотите разместить на участке'},
  websites:{title:'Обсудить продвижение',description:'Посмотрим вашу задачу: новый сайт, реклама или увеличение бронирований.',extra:'promotion',comment:'Что хотите улучшить'},
  building:{title:'Запросить смету',description:'Уточним, что планируете построить и какие исходные данные уже есть.',extra:'building',comment:'Какие дома и сколько планируете построить'},
  consultations:{title:'Подобрать консультацию',description:'Расскажите, какой вопрос нужно разобрать. Подберём формат консультации.',extra:'',comment:'Какой вопрос хотите разобрать'},
  cases:{title:'Заказать подобный проект',description:'Расскажите о своём участке и планах. Обсудим, какие решения подходят вашей задаче.',extra:'project',comment:'Что важно учесть в вашем проекте'},
  'shop-projects':{title:'Запросить смету строительства',description:'Уточним выбранную модель, количество домов и регион строительства.',extra:'building',comment:'Что важно учесть'},
  materials:{title:'Подобрать обучающие материалы',description:'Расскажите о своей задаче в управлении базой отдыха.',extra:'',comment:'Какую задачу хотите решить'},
  services:{title:'Подобрать услугу',description:'Уточним вашу ситуацию и подберём формат работы.',extra:'stage',comment:'Какая помощь нужна'}
 };
 function close(){if(!overlay)return;overlay.remove();overlay=null;document.documentElement.style.overflow=overflowBefore||'';if(focusBefore?.isConnected)focusBefore.focus({preventScroll:true})}
 function modal(body,wide=false){
  if(!overlay){focusBefore=document.activeElement;overflowBefore=document.documentElement.style.overflow}else overlay.remove();
  overlay=document.createElement('div');overlay.className='rv-overlay ld-overlay';overlay.innerHTML='<section class="rv-dialog'+(wide?' rv-dialog--gallery':'')+'" role="dialog" aria-modal="true" aria-labelledby="rv-title"><button type="button" class="rv-close" data-rv-close aria-label="Закрыть">×</button>'+body+'</section>';
  document.body.appendChild(overlay);document.documentElement.style.overflow='hidden';
  overlay.addEventListener('click',e=>{if(e.target===overlay)close()});
  overlay.addEventListener('keydown',e=>{if(e.key==='Escape'){e.preventDefault();e.stopPropagation();close()}if(e.key==='Tab'){const f=$$('a[href],button:not([disabled]),input,textarea,select',overlay).filter(n=>n.getClientRects().length),a=f[0],b=f.at(-1);if(e.shiftKey&&document.activeElement===a){e.preventDefault();b?.focus()}else if(!e.shiftKey&&document.activeElement===b){e.preventDefault();a?.focus()}}});
  $('.rv-close',overlay).focus({preventScroll:true});return overlay;
 }
 function field(name,label,placeholder='',type='text'){return '<div class="rv-field"><label for="rv-'+name+'">'+label+' <span class="rv-optional">— по желанию</span></label><input id="rv-'+name+'" name="'+name+'" type="'+type+'" maxlength="180" placeholder="'+esc(placeholder)+'"></div>'}
 const stage='<div class="rv-field"><label for="rv-stage">На каком вы этапе <span class="rv-optional">— по желанию</span></label><select id="rv-stage" name="stage"><option value="">Выберите этап</option><option>Только изучаю тему</option><option>Подбираю участок</option><option>Участок уже есть</option><option>База уже работает</option></select></div>';
 function extras(kind){
  if(kind==='promotion')return field('site','Ваш сайт','example.ru')+'<div class="rv-field"><label for="rv-goal">Что нужно <span class="rv-optional">— по желанию</span></label><select id="rv-goal" name="goal"><option value="">Выберите задачу</option><option>Новый сайт</option><option>Больше бронирований с сайта</option><option>Реклама и SEO</option><option>Нужна консультация</option></select></div>';
  if(kind==='project')return '<div class="rv-fields-row">'+field('region','Где находится участок','Город или область')+field('area','Площадь участка','Например, 60 соток')+'</div>';
  if(kind==='building')return '<div class="rv-fields-row">'+field('region','Регион строительства','Город или область')+field('quantity','Количество домов','Например, 4')+'</div>';
  return kind==='stage'?stage:'';
 }
 function context(trigger){
  const d=defs[page]||defs.index;let topic=trigger?.dataset.obService||trigger?.getAttribute('data-ob-услуга')||'';
  const card=trigger?.closest('article,.ob-фор__c,.ob-пвт__c,.t-store__prod-popup__container,.t-store__card');
  if(!topic&&card)topic=$('h3,h4,.js-store-prod-name',card)?.textContent.trim()||'';
  if(trigger?.dataset.title)topic='Смета строительства: '+trigger.dataset.title;
  if(trigger?.matches('.ob-кат-смета')){const title=$('.t-popup_show .js-store-prod-name')?.textContent.trim();if(title)topic='Смета строительства: '+title;}
  return {...d,topic:topic||d.title,source:location.pathname};
 }
 function form(ctx){
  current=ctx;channel='phone';
  modal('<p class="rv-eyebrow">'+esc(ctx.project?'Концепция базы отдыха':page==='websites'?'Продвижение базы отдыха':'Ваш проект')+'</p><h2 id="rv-title">'+esc(ctx.title)+'</h2><p>'+esc(ctx.description)+'</p>'+
   (ctx.topic!==ctx.title?'<div class="rv-context">'+esc(ctx.topic)+'</div>':'')+
   '<form class="rv-form ld-form" id="rv-form"><div class="rv-field"><label for="rv-name">Как к вам обращаться</label><input id="rv-name" name="name" autocomplete="given-name" placeholder="Ваше имя" maxlength="80" required></div>'+
   '<fieldset class="rv-channels"><legend>Как удобнее связаться</legend><div class="rv-channels__row"><button type="button" data-rv-channel="phone" aria-pressed="true">Телефон</button><button type="button" data-rv-channel="telegram" aria-pressed="false">Telegram</button><button type="button" data-rv-channel="max" aria-pressed="false">MAX</button></div></fieldset>'+
   '<div class="rv-field"><label for="rv-contact" id="rv-contact-label">Номер телефона</label><input id="rv-contact" name="contact" type="tel" autocomplete="tel" placeholder="+7 (___) ___-__-__" maxlength="100" required></div>'+
   '<details class="rv-details"><summary>'+esc(ctx.extra==='promotion'?'Добавить сайт и задачу':ctx.extra==='project'?'Добавить сведения об участке':ctx.extra==='building'?'Добавить данные для сметы':'Добавить подробности')+' <span class="rv-optional">— по желанию</span></summary><div class="rv-details__fields">'+extras(ctx.extra)+'<div class="rv-field"><label for="rv-comment">'+esc(ctx.comment)+'</label><textarea id="rv-comment" name="comment" rows="2" maxlength="1000"></textarea></div></div></details>'+
   '<label class="rv-consent"><input type="checkbox" name="consent" required><span>Я даю согласие на обработку персональных данных в соответствии с <a href="'+asset('privacy.html')+'" target="_blank" rel="noopener">политикой конфиденциальности</a>.</span></label><button class="rv-button" type="submit">Оставить заявку</button><p class="rv-demo-note">Демо: данные не отправляются.</p></form>');
  $('#rv-form').addEventListener('submit',e=>{e.preventDefault();const f=e.currentTarget,c=$('#rv-contact');c.setCustomValidity('');if(channel==='phone'&&(c.value.replace(/\D/g,'').length<7||c.value.replace(/\D/g,'').length>15))c.setCustomValidity('Укажите номер телефона.');if(channel!=='phone'&&c.value.trim().length<3)c.setCustomValidity('Укажите имя пользователя, ссылку или номер.');if(!f.reportValidity())return;window.RV_LAST_REQUEST={...current,channel,fields:Object.fromEntries(new FormData(f))};modal('<p class="rv-eyebrow">Демонстрация</p><h2 id="rv-title">Заявка подготовлена</h2><p>Контакты не отправлены. В рабочей версии команда получит обращение с этой темой:</p><div class="rv-context">'+esc(current.topic)+'</div><p style="margin-top:20px">Источник: '+esc((defs[page]||defs.index).title)+'</p><button type="button" class="rv-button" data-rv-close>Вернуться на страницу</button>')});
 }
 function request(ctx){
  const exit=$('.ob-уход:not([hidden])');if(exit)exit.dispatchEvent(new KeyboardEvent('keydown',{key:'Escape',bubbles:true}));
  const native=$('.ob-лайт:not([hidden])');if(native){document.dispatchEvent(new KeyboardEvent('keydown',{key:'Escape',bubbles:true}));setTimeout(()=>form(ctx),260)}else form(ctx);
 }
 function gallery(id,index=0){
  const p=projects.find(x=>x.id===id);if(!p)return;const i=(index+p.images.length)%p.images.length;
  modal('<p class="rv-eyebrow">'+esc(['Концепция',p.place,p.area].filter(Boolean).join(' · '))+'</p><h2 id="rv-title">'+esc(p.title)+'</h2><div class="rv-gallery__stage"><img src="'+asset(p.images[i])+'" alt="'+esc(p.title)+' — рендер '+(i+1)+'"></div><div class="rv-gallery__nav"><button type="button" data-rv-photo="'+id+':'+(i-1)+'">Предыдущий</button><span>'+ (i+1)+' из '+p.images.length+'</span><button type="button" data-rv-photo="'+id+':'+(i+1)+'">Следующий</button></div><div class="rv-gallery__thumbs">'+p.images.map((s,j)=>'<button type="button" data-rv-photo="'+id+':'+j+'" aria-label="Рендер '+(j+1)+'" aria-current="'+(i===j)+'"><img src="'+asset(p.thumbs[j])+'" alt="" loading="lazy"></button>').join('')+'</div>'+p.description.split('\n').filter(Boolean).map(t=>'<p>'+esc(t)+'</p>').join('')+'<button class="rv-button" data-rv-request="'+id+'">Заказать подобный проект</button>',true);
 }
 window.LD_TOAST=text=>{modal('<h2 id="rv-title">Демонстрация</h2><p>'+esc(text)+'</p><button class="rv-button" data-rv-close>Понятно</button>')};
 window.LD_HANDLE=(e,el)=>{
  if(el.hasAttribute('data-rv-close')){close();return true}
  if(el.dataset.rvGallery){gallery(el.dataset.rvGallery);return true}
  if(el.dataset.rvPhoto){const [id,n]=el.dataset.rvPhoto.split(':');gallery(id,+n);return true}
  if(el.dataset.rvChannel){channel=el.dataset.rvChannel;$$('[data-rv-channel]',overlay).forEach(b=>b.setAttribute('aria-pressed',String(b===el)));const n=$('#rv-contact');n.value='';n.setCustomValidity('');n.type=channel==='phone'?'tel':'text';n.autocomplete=channel==='phone'?'tel':'off';n.placeholder=channel==='phone'?'+7 (___) ___-__-__':channel==='telegram'?'@username или номер':'Ссылка или номер';$('#rv-contact-label').textContent=channel==='phone'?'Номер телефона':channel==='telegram'?'Ваш Telegram':'Ваш MAX';return true}
  if(el.dataset.rvRequest){const p=projects.find(p=>p.id===el.dataset.rvRequest);request(p?{...defs.cases,title:'Заказать подобный проект',topic:p.title,project:p.id,source:location.pathname}:context(el));return true}
  if(el.matches('.ob-кат-купить,.js-store-prod-btn2,.ob-срв__откр')){window.LD_TOAST('Покупки и оформление заказов в демо отключены.');return true}
  const href=el.getAttribute('href')||'';
  const nativeForm=href.startsWith('#popup:')&&$('.t-popup[data-tooltip-hook="'+CSS.escape(href)+'"] form');
  if(nativeForm||['#popup:zayavka','#popup:building','#popup:site','#popup:direct','#popup:direct-site'].includes(href)||el.matches('.ob-уход__b,.ob-кат-смета,.ob-срв__смета,.ob-price-request')){request(context(el));return true}
  return false;
 };
 const incoming=window.LD_INCOMING;
 if(incoming?.request||incoming?.article)request({...context(),topic:incoming.request||incoming.article});
 const selected=new URL(location.href).searchParams.get('project');if(selected)gallery(selected);
})();

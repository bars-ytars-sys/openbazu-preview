/* Demo enhancement: keep native case windows, forms and original heading text. */
(function(){
 function ready(){
  var root=document.getElementById('obc26-portfolio');
  var title=document.querySelector('#rec665336252 h1');
  var intro=document.querySelector('#rec665336252 h2');
  if(!root||!title||!intro||document.body.classList.contains('obc26-ready'))return;
  title.classList.add('obc26-title');intro.classList.add('obc26-intro');
  root.querySelector('[data-obc-title]').appendChild(title);
  root.querySelector('[data-obc-intro]').appendChild(intro);
  root.hidden=false;document.body.classList.add('obc26-ready');
  var services=document.getElementById('obc26-services');
  if(services&&services.querySelectorAll('.obc26-service').length===4){services.hidden=false;document.body.classList.add('obc26-services-ready');}
  if(services&&location.hash==='#obc26-services'){
   var interrupted=false;var cancel=function(){interrupted=true};
   ['wheel','touchstart','keydown'].forEach(function(type){window.addEventListener(type,cancel,{once:true,passive:true})});
   var place=function(){if(!interrupted&&location.hash==='#obc26-services')services.scrollIntoView({block:'start',behavior:'instant'})};
   requestAnimationFrame(function(){requestAnimationFrame(place)});
   if(document.fonts&&document.fonts.ready)document.fonts.ready.then(place);
  }
  var videos=document.querySelector('#ob-case-library .ob-case-library__videos');if(videos)videos.id='obc26-videos';
  var concepts=document.querySelector('#rec3872937101 .ob-h2');if(concepts)concepts.id='obc26-concepts';
  root.querySelectorAll('[data-obc-hook]').forEach(function(card){
   var popup=document.querySelector('.t-popup[data-tooltip-hook="'+card.getAttribute('data-obc-hook')+'"]');
   if(!popup)return;
   popup.querySelectorAll('a[href="#popup:zayavka"]').forEach(function(a){if(!a.hasAttribute('data-ob-service'))a.setAttribute('data-ob-service','Кейс: '+card.querySelector('h3').textContent.trim())});
  });
 }
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',ready);else ready();
})();

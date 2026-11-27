/* Demo only: show the real team without placing text over faces. */
(function(){
 function ensure(){
  if(!matchMedia('(max-width:639px)').matches)return;
  var art=document.querySelector('#rec3452320701 .t396__artboard');
  if(!art||art.querySelector('.obv-mobile-team'))return;
  var figure=document.createElement('figure');figure.className='obv-mobile-team';
  var image=document.createElement('img');image.src='assets/team-original-27-960.webp';image.srcset='assets/team-original-27-960.webp 960w, assets/team-original-27-1920.webp 1920w, assets/team-original-27-4318.webp 4318w';image.sizes='(max-width: 639px) calc(100vw - 56px), calc(100vw - 20px)';image.alt='Команда ОТКРЫТЬБАЗУ.РФ';image.width=4318;image.height=3692;image.decoding="async";image.setAttribute('fetchpriority','high');
  figure.appendChild(image);art.appendChild(figure);
 }
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',ensure);else ensure();
 window.addEventListener('resize',ensure);
})();

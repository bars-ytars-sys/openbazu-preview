/* Demo only: show the real team without placing text over faces. */
(function(){
 function ensure(){
  if(!matchMedia('(max-width:639px)').matches)return;
  var art=document.querySelector('#rec3452320701 .t396__artboard');
  if(!art||art.querySelector('.obv-mobile-team'))return;
  var figure=document.createElement('figure');figure.className='obv-mobile-team';
  var image=document.createElement('img');image.src='assets/team-photo.webp';image.alt='Команда ОТКРЫТЬБАЗУ.РФ';image.width=1680;image.height=1436;image.setAttribute('fetchpriority','high');
  figure.appendChild(image);art.appendChild(figure);
 }
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',ensure);else ensure();
 window.addEventListener('resize',ensure);
})();

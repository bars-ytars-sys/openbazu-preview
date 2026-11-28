/* Two project types in one grid; own bases remain separate examples below it. */
(function(){
 function ready(){
  const root=document.getElementById('obc26-portfolio'),grid=root&&root.querySelector('#obp-project-grid');if(!grid)return;
  const cards=Array.from(grid.querySelectorAll('[data-project-kind]')),buttons=Array.from(root.querySelectorAll('[data-project-filter]')),count=root.querySelector('.obp-count');
  function select(type,update){
   type=type==='working'?'working':'concepts';let n=0;cards.forEach(c=>{c.hidden=c.dataset.projectKind!==type;if(!c.hidden)n++});buttons.forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.projectFilter===type)));count.textContent='Показано проектов: '+n;
   if(update){const u=new URL(location.href);u.searchParams.set('case_filter',type);history.replaceState(history.state,'',u)}
  }
  function incoming(){const u=new URL(location.href);return u.searchParams.get('case_filter')==='working'?'working':'concepts'}
  root.querySelector('.obp-filters').addEventListener('click',e=>{const b=e.target.closest('[data-project-filter]');if(b)select(b.dataset.projectFilter,true)});select(incoming(),false);window.addEventListener('popstate',()=>select(incoming(),false));
 }
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',ready);else ready();
})();

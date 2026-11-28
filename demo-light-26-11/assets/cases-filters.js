/* Demo: filter the existing 12 cases; retain native galleries and request contexts. */
(function () {
 'use strict';
 // Compact plots are supported by explicit published areas: 34, 8, 36, 15 and 20 sotkas.
 // The 3-hectare project is intentionally excluded from the compact filter.
 const tags={
  '#case1':['launch','reconstruction'], '#case2':['compact','launch'],
  '#case3':['reconstruction'], '#case4':['compact','launch'], '#case5':[],
  '#case6':['working'], '#case7':['compact','launch'], '#case8':['launch'],
  '#case9':['launch'], '#case10':['compact','launch'], '#case11':['compact','launch'], '#case12':['working']
 };
 const options=[['all','Все проекты'],['compact','Небольшой участок'],['launch','Запуск с нуля'],['reconstruction','Реконструкция'],['working','Работающая база']];
 function ready(){
  const section=document.getElementById('obc26-cases');
  const grid=section&&section.querySelector('.obc26-grid');
  if(!grid||section.querySelector('.obc28-filters'))return;
  const cards=Array.from(grid.querySelectorAll('.obc26-card'));
  if(cards.length!==12||cards.some(c=>!Object.hasOwn(tags,c.dataset.obcHook)))return;
  const controls=document.createElement('div');controls.className='obc28-filters';
  controls.setAttribute('role','group');controls.setAttribute('aria-label','Подобрать кейсы по ситуации');
  options.forEach(([value,label])=>{const b=document.createElement('button');b.type='button';b.className='obc28-filter';b.dataset.caseFilter=value;b.textContent=label;b.setAttribute('aria-pressed','false');b.setAttribute('aria-controls','obc28-case-grid');controls.appendChild(b)});
  grid.id='obc28-case-grid';
  const count=document.createElement('p');count.className='obc28-count';count.setAttribute('role','status');count.setAttribute('aria-live','polite');count.setAttribute('aria-atomic','true');
  grid.before(controls,count);
  function select(value,updateURL){
   if(!options.some(x=>x[0]===value))value='all';
   grid.dataset.caseFilter=value;
   let visible=0;
   cards.forEach(c=>{c.hidden=value!=='all'&&!tags[c.dataset.obcHook].includes(value);if(!c.hidden)visible++});
   controls.querySelectorAll('button').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.caseFilter===value)));
   count.textContent='Найдено проектов: '+visible;
   if(updateURL){const u=new URL(location.href);if(value==='all')u.searchParams.delete('case_filter');else u.searchParams.set('case_filter',value);history.replaceState(history.state,'',u)}
  }
  controls.addEventListener('click',e=>{const b=e.target.closest('button[data-case-filter]');if(b&&controls.contains(b))select(b.dataset.caseFilter,true)});
  select(new URL(location.href).searchParams.get('case_filter')||'all',false);
  window.addEventListener('popstate',()=>select(new URL(location.href).searchParams.get('case_filter')||'all',false));
 }
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',ready);else ready();
})();

(() => {
 'use strict';
 const $=id=>document.getElementById(id),form=$('checklist-form'),auto=window.AutoChefAutoPreview;
 let last=auto.signature();
 function evaluate(){
  try{
   const p=auto.build(false),g=p.groups[0];
   const r=window.AutoChefCurrentCoverageEngine.assess({start:p.start,end:p.end,cohortEnd:p.cohortEnd,confirmed:true,types:g.types,batches:g.batches});
   const details=[r.title,...p.messages,...r.messages];
   return {...r,details,preview:p};
  }catch(e){return {state:'incomplete',scripts:null,gaps:[],details:['Current setup — assessment incomplete',e.message]};}
 }
 function render(){const r=evaluate();$('current-coverage-result').replaceChildren(...r.details.map(s=>{const p=document.createElement('p');p.textContent=s;return p;}));$('current-generated-preview').replaceChildren();if(r.preview)auto.show(r.preview,'current-generated-preview');return r;}
 function changed(){const s=auto.signature();if(s!==last){last=s;$('current-coverage-result').textContent='Inputs changed. Check current setup again.';$('current-generated-preview').replaceChildren();}}
 form.addEventListener('input',changed);form.addEventListener('change',changed);
 $('current-coverage-check').addEventListener('click',render);
 window.AutoChefCurrentCoverage={evaluate,render,sync:auto.sync};
})();

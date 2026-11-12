(() => {
 'use strict';
 const $=id=>document.getElementById(id),form=$('checklist-form'),auto=window.AutoChefAutoPreview,engine=window.AutoChefCoverageEngine;
 let approved=null,last=auto.signature();
 function evaluate(){
  let result,p;
  try{
   p=auto.build(true);
   const old=p.groups[0],fresh=p.groups[1];
   const types=old.types.map((t,i)=>{
    const rows=old.batches.filter(b=>b.type===i&&b.run.slice(0,10)<=p.cohortEnd);
    return {name:t.name,from:rows.map(b=>b.from).sort()[0],to:rows.map(b=>b.to).sort().at(-1)};
   });
   result=engine.assess({start:p.start,end:p.end,confirmed:$('coverage-confirm').checked,requestedCount:fresh.types.length,types,batches:[...old.batches.map(b=>({...b,side:'old'})),...fresh.batches.map(b=>({...b,side:'new'}))]});
  }catch(e){result={state:'incomplete',title:'Assessment incomplete',messages:[e.message],gaps:[]};}
  const gap=result.gaps.length>0,notes=$('coverage-evidence').value.trim(),choice=$('coverage-decision').value;
  let scripts=gap?true:null;
  if(!gap&&approved===auto.signature()&&notes){if(choice==='manual')scripts=true;if(choice==='clear'&&result.state==='clear')scripts=false;}
  const details=[result.title,...(p?.messages||[]),...result.messages];
  result.gaps.forEach(g=>details.push(`Starting on ${$(`recall-${g.initial}-name`).value}: recall dates ${engine.date(g.from)} to ${engine.date(g.to)} may miss or receive fewer reminders; new progression stops at ${$(`requested-${g.stalled}-name`)?.value||`type ${g.stalled+1}`}.`));
  details.push('Compared starting dates are derived from the first year of old-schedule coverage, not from patient records. Existing stranded dates outside that scope are not established. The proposed setup is assumed effective before all entered next batches; already-created batches must not be entered.');
  details.push(gap?'Scripts required automatically: a potential coverage gap was detected. Run corrective scripts regardless of patient counts.':scripts===true?'Reviewer decision: scripts required.':scripts===false?'Reviewer decision: no scripts required within the checked scope.':'Script decision pending — do not treat this as approval to change the schedule.');
  if(notes)details.push(`Review evidence: ${notes}`);
  return {...result,scripts,includeRanges:scripts===true,details,preview:p};
 }
 function render(){const r=evaluate();$('coverage-result').replaceChildren(...r.details.map(s=>{const p=document.createElement('p');p.textContent=s;return p;}));$('modify-generated-preview').replaceChildren();if(r.preview)auto.show(r.preview,'modify-generated-preview');return r;}
 function changed(e){
  if(e.target.id==='coverage-decision'){approved=auto.signature();render();return;}
  if(e.target.id==='coverage-evidence')return;
  const s=auto.signature();if(s!==last||e.target.id==='coverage-confirm'){last=s;approved=null;$('coverage-decision').value='pending';$('coverage-result').textContent='Inputs changed. Check coverage again; the review decision is pending.';$('modify-generated-preview').replaceChildren();}
 }
 form.addEventListener('input',changed);form.addEventListener('change',changed);
 $('coverage-check').addEventListener('click',render);
 window.AutoChefCoverage={evaluate,render,sync:auto.sync};
})();

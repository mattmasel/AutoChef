(() => {
  'use strict';
  const $=id=>document.getElementById(id), form=$('checklist-form');
  const engine=window.AutoChefCoverageEngine, scopes=[], batches=[];
  let approvedSignature=null;
  function element(tag,cls,text) {const e=document.createElement(tag);e.className=cls||'';if(text)e.textContent=text;return e;}
  function control(parent,label,type,id) {
    const wrap=element('div','col-md');const lab=element('label','form-label',label);lab.htmlFor=id;
    const input=document.createElement(type==='select'?'select':'input');input.id=id;input.className=type==='select'?'form-select':'form-control';if(type!=='select')input.type=type;
    wrap.append(lab,input);parent.append(wrap);return input;
  }
  function options(select,items) {const value=select.value;select.replaceChildren();items.forEach(([v,t])=>{const o=element('option','',t);o.value=v;select.append(o);});if(items.some(x=>String(x[0])===value))select.value=value;}
  function sync() {
    const modify=$('job-type').value==='modify';$('coverage-section').hidden=!modify;$('coverage-fields').disabled=!modify;
    const count=Number($('recall-count').value);
    if(!Number.isSafeInteger(count)||count<0||count>50)return;
    while(scopes.length<count) {
      const i=scopes.length,box=element('fieldset','border rounded-3 p-3'),legend=element('legend','float-none w-auto px-2 fs-6');
      const row=element('div','row g-3');box.append(legend,row);
      const from=control(row,'Recall Date From','date',`coverage-scope-${i}-from`),to=control(row,'Recall Date To','date',`coverage-scope-${i}-to`);
      scopes.push({box,legend,from,to});$('coverage-scopes').append(box);
    }
    scopes.forEach((s,i)=>{s.box.hidden=s.box.disabled=i>=count;s.legend.textContent=`${i+1}. ${$(`recall-${i}-name`)?.value||'Current recall type'}`;});
    batches.forEach(b=>{
      const prefix=b.side.value==='old'?'recall':'requested',total=Number($(prefix==='recall'?'recall-count':'requested-count').value);
      const items=Array.from({length:Math.min(Math.max(total,0),50)},(_,i)=>[String(i),`${i+1}. ${$(`${prefix}-${i}-name`)?.value||'Recall type'}`]);
      // Keep removed-type references invalid rather than silently reassigning.
      const previous=b.type.value;
      options(b.type,[['','Select type'],...items]);
      if(previous && !items.some(x=>x[0]===previous))b.type.value='';
    });
  }
  function invalidate() {
    approvedSignature=null;$('coverage-decision').value='pending';
    $('coverage-result').textContent='Inputs changed. Check coverage again; the script decision has been reset to Pending.';
  }
  function addBatch() {
    const id=batches.length,box=element('fieldset','border rounded-3 p-3'),row=element('div','row g-3');box.append(row);
    const side=control(row,'Preview','select',`coverage-batch-${id}-side`);options(side,[['old','Old setup (unchanged baseline)'],['new','New setup']]);
    const type=control(row,'Recall type','select',`coverage-batch-${id}-type`);
    const run=control(row,'Send / creation time','datetime-local',`coverage-batch-${id}-run`);
    const dates=element('div','row g-3 mt-1');box.append(dates);
    const from=control(dates,'Recall Date From','date',`coverage-batch-${id}-from`),to=control(dates,'Recall Date To','date',`coverage-batch-${id}-to`);
    const remove=element('button','btn btn-outline-danger btn-sm mt-3','Remove batch');remove.type='button';box.append(remove);
    const b={box,side,type,run,from,to,removed:false};batches.push(b);$('coverage-batches').append(box);
    remove.addEventListener('click',()=>{b.removed=true;box.hidden=box.disabled=true;invalidate();form.dispatchEvent(new Event('change',{bubbles:true}));});
    sync();invalidate();form.dispatchEvent(new Event('change',{bubbles:true}));
  }
  function input() {
    const count=Number($('recall-count').value);
    return {start:$('coverage-start').value,end:$('coverage-end').value,confirmed:$('coverage-confirm').checked,
      requestedCount:Number($('requested-count').value),
      types:scopes.slice(0,count).map((s,i)=>({name:$(`recall-${i}-name`)?.value||'',from:s.from.value,to:s.to.value})),
      batches:batches.filter(b=>!b.removed).map(b=>({side:b.side.value,type:b.type.value===''?-1:Number(b.type.value),run:b.run.value,from:b.from.value,to:b.to.value}))};
  }
  function signature() {
    return JSON.stringify([input(),[...new FormData(form)].filter(([k])=>/^(recalls|requested_recalls|existing_ranges|requested_ranges|batches)\[/.test(k))]);
  }
  function evaluate() {
    sync();const result=engine.assess(input()),decision=$('coverage-decision').value,evidence=$('coverage-evidence').value.trim();
    const fresh=approvedSignature===signature();
    const hasGap=result.gaps.length>0;
    let scripts=hasGap?true:null;
    if(!hasGap && fresh && evidence) {
      if(decision==='manual')scripts=true;
      if(decision==='clear'&&result.state==='clear')scripts=false;
    }
    const details=[result.title,...result.messages];
    result.gaps.forEach(g=>details.push(`Starting on ${$(`recall-${g.initial}-name`).value}: recall dates ${engine.date(g.from)} to ${engine.date(g.to)} may miss or receive fewer reminders by the assessment end; new progression stops at ${$(`requested-${g.stalled}-name`).value || `type ${g.stalled+1}`}.`));
    details.push(hasGap?'Scripts required automatically: a potential coverage gap was detected. Run the corrective scripts regardless of whether any patients occupy the flagged ranges.':scripts===true?'Reviewer decision: scripts required.':scripts===false?'Reviewer decision: no scripts required within the reviewed scope.':'Script decision pending — do not treat this as approval to change the schedule.');
    if(scripts!==null && evidence)details.push(`Review evidence: ${evidence}`);
    return {...result,scripts,includeRanges:scripts===true||(result.state==='gap'&&scripts===null),details};
  }
  function render() {const r=evaluate();$('coverage-result').replaceChildren(...r.details.map(t=>element('p','mb-2',t)));return r;}
  form.addEventListener('input',event=>{
    if(['coverage-evidence','coverage-decision'].includes(event.target.id))return;
    if(event.target.closest('#coverage-fields') || /^(recalls|requested_recalls|existing_ranges|requested_ranges|batches)\[/.test(event.target.name||'') || ['recall-count','requested-count','job-type'].includes(event.target.id)) {sync();if(approvedSignature===null || approvedSignature!==signature())invalidate();}
  });
  form.addEventListener('change',event=>{
    if(event.target.id==='coverage-decision'){approvedSignature=signature();render();return;}
    if(event.target.id==='coverage-evidence'){render();return;}
    if(event.target.closest?.('#coverage-fields') || /^(recalls|requested_recalls|existing_ranges|requested_ranges|batches)\[/.test(event.target.name||'') || ['recall-count','requested-count','job-type'].includes(event.target.id)) {
      sync();if(approvedSignature!==null && approvedSignature!==signature())invalidate();
    }
  });
  $('coverage-check').addEventListener('click',render);$('coverage-add').addEventListener('click',addBatch);
  window.AutoChefCoverage={evaluate,render,sync};sync();
})();

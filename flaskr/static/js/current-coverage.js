(() => {
  'use strict';
  const $=id=>document.getElementById(id),form=$('checklist-form'),batches=[];
  let lastSignature=null;
  function signature() {
    return JSON.stringify([$('job-type').value,$('recall-count').value,
      $('current-coverage-start').value,$('current-coverage-end').value,
      batches.filter(b=>!b.removed).map(b=>[b.type.value,b.run.value,b.from.value,b.to.value]),
      [...new FormData(form)].filter(([key])=>/^recalls\[/.test(key))]);
  }
  function element(tag,cls,text) {const e=document.createElement(tag);e.className=cls||'';if(text)e.textContent=text;return e;}
  function control(parent,label,type,id) {
    const wrap=element('div','col-md'),lab=element('label','form-label',label);lab.htmlFor=id;
    const field=document.createElement(type==='select'?'select':'input');field.id=id;
    field.className=type==='select'?'form-select':'form-control';if(type!=='select')field.type=type;
    wrap.append(lab,field);parent.append(wrap);return field;
  }
  function sync() {
    const basic=$('job-type').value==='basic';
    $('current-coverage-section').hidden=!basic;$('current-coverage-fields').disabled=!basic;
    const count=Number($('recall-count').value);
    if(!Number.isSafeInteger(count)||count<0||count>50)return;
    for(const b of batches) {
      const previous=b.type.value;b.type.replaceChildren();
      for(let i=-1;i<count;i++) {
        const o=element('option','',i<0?'Select type':`${i+1}. ${$(`recall-${i}-name`)?.value||'Recall type'}`);
        o.value=i<0?'':String(i);b.type.append(o);
      }
      b.type.value=previous!==''&&Number(previous)<count?previous:'';
    }
  }
  function changed() {
    lastSignature=signature();
    $('current-coverage-confirm').checked=false;
    $('current-coverage-result').textContent='Inputs changed. Confirm the preview and check again; previous results are no longer current.';
  }
  function addBatch() {
    if(batches.filter(b=>!b.removed).length>=300){$('current-coverage-result').textContent='Use at most 300 preview rows.';return;}
    const id=batches.length,box=element('fieldset','border rounded-3 p-3'),row=element('div','row g-3');box.append(row);
    const type=control(row,'Recall type','select',`current-batch-${id}-type`);
    const run=control(row,'Send / creation time','datetime-local',`current-batch-${id}-run`);
    const dates=element('div','row g-3 mt-1');box.append(dates);
    const from=control(dates,'Recall Date From','date',`current-batch-${id}-from`),to=control(dates,'Recall Date To','date',`current-batch-${id}-to`);
    const remove=element('button','btn btn-outline-danger btn-sm mt-3','Remove batch');remove.type='button';box.append(remove);
    const b={box,type,run,from,to,removed:false};batches.push(b);$('current-coverage-batches').append(box);
    remove.addEventListener('click',()=>{b.removed=true;box.hidden=box.disabled=true;changed();form.dispatchEvent(new Event('change',{bubbles:true}));});
    sync();changed();form.dispatchEvent(new Event('change',{bubbles:true}));
  }
  function evaluate() {
    sync();
    const count=Number($('recall-count').value);
    const input={start:$('current-coverage-start').value,end:$('current-coverage-end').value,
      confirmed:$('current-coverage-confirm').checked,
      types:Number.isSafeInteger(count)&&count>=0&&count<=50?Array.from({length:count},(_,i)=>({name:$(`recall-${i}-name`)?.value||''})):[],
      batches:batches.filter(b=>!b.removed).map(b=>({type:b.type.value===''?-1:Number(b.type.value),run:b.run.value,from:b.from.value,to:b.to.value}))};
    const r=!input.start&&!input.end&&!input.batches.length
      ?{state:'unassessed',title:'Current setup — not assessed',scripts:null,gaps:[],messages:['Add the current upcoming preview in section 4a to check for coverage gaps. No coverage conclusion has been made.']}
      :window.AutoChefCurrentCoverageEngine.assess(input);
    return {...r,details:[r.title,...r.messages]};
  }
  function render() {const r=evaluate();$('current-coverage-result').replaceChildren(...r.details.map(t=>element('p','mb-2',t)));return r;}
  function onChange(event) {
    if(event.target.id==='current-coverage-confirm')return;
    if(event.target.closest?.('#current-coverage-fields')||/^recalls\[/.test(event.target.name||'')||['recall-count','job-type'].includes(event.target.id)) {sync();if(signature()!==lastSignature)changed();}
  }
  form.addEventListener('input',onChange);form.addEventListener('change',onChange);
  $('current-coverage-add').addEventListener('click',addBatch);$('current-coverage-check').addEventListener('click',render);
  window.AutoChefCurrentCoverage={evaluate,render,sync};sync();lastSignature=signature();
})();

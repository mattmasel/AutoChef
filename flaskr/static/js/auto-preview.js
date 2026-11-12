(() => {
 'use strict';
 const $=id=>document.getElementById(id),form=$('checklist-form'),requested=[];
 const el=(tag,text)=>{const e=document.createElement(tag);if(text)e.textContent=text;return e;};
 function sync(){
  const modify=$('job-type').value==='modify';
  $('coverage-section').hidden=!modify;$('coverage-fields').disabled=!modify;
  $('current-coverage-section').hidden=modify;$('current-coverage-fields').disabled=modify;
  const n=Number($('requested-count').value);
  if(!Number.isSafeInteger(n)||n<0||n>50)return;
  while(requested.length<n){
   const i=requested.length,box=el('fieldset');box.className='border rounded-3 p-3';
   const legend=el('legend');legend.className='float-none w-auto px-2 fs-6';box.append(legend);
   const row=el('div');row.className='row g-3';box.append(row);
   const fields={};
   for(const [key,label,type] of [['next','Next batch date','date'],['time','Batch time','time'],['from','Recall Date From','date'],['to','Recall Date To','date']]){
    const wrap=el('div');wrap.className='col-md';const lab=el('label',label);lab.className='form-label';const input=el('input');input.type=type;input.className='form-control';input.id=`auto-requested-${i}-${key}`;input.name=`preview_requested[${i}][${key}]`;lab.htmlFor=input.id;if(key==='time')input.value='09:00';fields[key]=input;wrap.append(lab,input);row.append(wrap);
   }
   requested.push({box,legend,...fields});$('auto-requested-batches').append(box);
  }
  requested.forEach((r,i)=>{r.box.hidden=r.box.disabled=i>=n;r.legend.textContent=`${i+1}. ${$(`requested-${i}-name`)?.value||'Requested type'}`;});
 }
 function signature(){return JSON.stringify([...new FormData(form)].filter(([k])=>!['coverage_evidence','coverage_decision'].includes(k)));}
 function currentSeeds(count){
  return Array.from({length:count},(_,i)=>{
   const parts=($(`batch-${i}-date`)?.value||'').split('/');
   return {next:parts.length===3?`${parts[2]}-${parts[1]}-${parts[0]}`:'',time:$(`batch-${i}-time`)?.value||'09:00',from:$(`batch-${i}-from`)?.value||'',to:$(`batch-${i}-to`)?.value||''};
  });
 }
 function build(modify){
  sync();const data=new FormData(form),count=Number($('recall-count').value),target=Number($('requested-count').value);
  if(!Number.isSafeInteger(count)||count<1||count>50||modify&&(!Number.isSafeInteger(target)||target<1||target>50))throw new Error('Use 1–50 recall types per setup.');
  const groups=[window.AutoChefPreviewEngine.read(data,'recalls',count,currentSeeds(count))];
  if(modify)groups.push(window.AutoChefPreviewEngine.read(data,'requested_recalls',target,requested.slice(0,target).map(r=>Object.fromEntries(['next','time','from','to'].map(k=>[k,r[k].value])))));
  return window.AutoChefPreviewEngine.build(groups);
 }
 function show(preview,container){
  const host=$(container);host.replaceChildren();
  preview.groups.forEach((g,side)=>g.types.forEach((t,i)=>{
   host.append(el('h4',`${side===0?'Current':'Proposed'} — ${t.name}`));
   const table=el('table');table.className='table table-sm';const head=el('thead'),tr=el('tr');
   ['Send / creation','Recall From','Recall To'].forEach(s=>tr.append(el('th',s)));head.append(tr);table.append(head);const body=el('tbody');
   g.batches.filter(b=>b.type===i).slice(0,6).forEach(b=>{const row=el('tr');[b.run.replace('T',' '),b.from,b.to].forEach(s=>row.append(el('td',s)));body.append(row);});table.append(body);host.append(table);
  }));
 }
 window.AutoChefAutoPreview={build,sync,signature,show};sync();
 form.addEventListener('change',sync);form.addEventListener('input',sync);
})();

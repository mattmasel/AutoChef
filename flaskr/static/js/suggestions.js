(() => {
 'use strict';
 const $=id=>document.getElementById(id),auto=window.AutoChefAutoPreview;
 const form=$('checklist-form');
 const el=(tag,text)=>{const node=document.createElement(tag);node.textContent=text;return node;};
 let generation=0;
 function applyOption(option,modify,expectedSignature){
  const status=$('suggestion-apply-status');
  if(auto.signature()!==expectedSignature){status.textContent='The setup changed. Generate fresh suggestions before choosing one.';return false;}
  const snapshot=new FormData(form),types=option.preview.groups[0].types;
  if(!modify){
   $('job-type').value='modify';$('job-type').dispatchEvent(new Event('change',{bubbles:true}));
   $('requested-count').value=String(types.length);$('requested-count').dispatchEvent(new Event('change',{bubbles:true}));
   // Copy the current setup into a proposed draft; never edit current inputs.
   for(const field of form.querySelectorAll('input, select')){
    const match=/^requested_recalls\[(\d+)\](.*)$/.exec(field.name||'');
    if(!match||Number(match[1])>=types.length)continue;
    const source=`recalls[${match[1]}]${match[2]}`;
    if(match[2]==='[and]'){field.checked=snapshot.has(source);continue;}
    if(!snapshot.has(source))continue; // Leave inactive defaults (e.g. monthly radio) valid.
    if(field.type==='checkbox'||field.type==='radio')field.checked=snapshot.getAll(source).includes(field.value);
    else field.value=snapshot.get(source);
   }
   auto.sync();
   types.forEach((t,i)=>{
    for(const key of ['next','time','from','to'])$(`auto-requested-${i}-${key}`).value=t[key];
   });
  }
  for(const {index,after} of option.changes){
   $(`requested-${index}-mode`).value='Advanced';
   $(`requested-${index}-and`).checked=true;
   after.rule.conditions.forEach((condition,j)=>{
    const row=j===0?'first':'second';
    for(const key of ['comparison','amount','unit','direction'])$(`requested-${index}-${row}-${key}`).value=String(condition[key]);
   });
   // These ranges were calculated by us, not read from D4W. Require real seeds.
   $(`auto-requested-${index}-from`).value='';$(`auto-requested-${index}-to`).value='';
  }
  types.forEach((_,i)=>$(`requested-${i}-mode`).dispatchEvent(new Event('change',{bubbles:true})));
  $('coverage-confirm').checked=false;$('coverage-decision').value='pending';$('coverage-evidence').value='';
  form.dispatchEvent(new Event('change',{bubbles:true}));
  status.textContent='Suggested conditions copied to Modify Recall Setup. Sending schedules are unchanged. Enter the actual D4W From/To for each changed type, confirm the type order, and check coverage again. Catch-up scripts for previously missed patients still need separate review.';
  return true;
 }
 window.AutoChefSuggestionUI={applyOption};
 for(const [prefix,modify] of [['current',false],['modify',true]]){
  const button=$(`${prefix}-suggest`),host=$(`${prefix}-suggestions`);
  button.addEventListener('click',()=>{
   const token=++generation;button.disabled=true;host.replaceChildren(el('p','Checking alternatives with the sending schedules unchanged…'));
   setTimeout(()=>{
    try{
     if(token!==generation)return;
     const p=auto.build(modify),types=p.groups[modify?1:0].types;
     const result=window.AutoChefSuggestions.suggest(types),signature=auto.signature();
     host.replaceChildren(el('p',result.message));
     result.options.forEach((option,i)=>{
      const card=el('section','');card.className='border rounded-3 p-3 mb-3';
      card.append(el('h4',`Option ${i+1} — ${option.changes.length} type(s) changed`));
      for(const change of option.changes){
       const t=change.after;
       card.append(el('h5',t.name),el('p','Use Advanced: '+t.rule.conditions.map(c=>`${c.comparison} ${c.amount} ${c.unit} in the ${c.direction}`).join(' AND ')));
       card.append(el('p',`Next batch ${t.next} at ${t.time}: original range ${change.before.from} to ${change.before.to}; suggested range ${t.from} to ${t.to}.`));
       const table=el('table','');table.className='table table-sm';const head=el('thead',''),heading=el('tr','');
       ['Calculated send date/time','Recall From','Recall To'].forEach(label=>heading.append(el('th',label)));head.append(heading);table.append(head);
       const body=el('tbody','');option.preview.groups[0].batches.filter(b=>b.type===change.index).slice(0,3).forEach(b=>{const row=el('tr','');[b.run.replace('T',' '),b.from,b.to].forEach(v=>row.append(el('td',v)));body.append(row);});table.append(body);card.append(table);
      }
      card.append(el('p',`All types checked for coverage and progression from ${option.preview.start.replace('T',' ')} to ${option.preview.end.replace('T',' ')}. No unresolved progression segments or repeated-final-reminder warnings in this preview.`));
      card.append(el('p','Suggested ranges are calculated, not confirmed by D4W. Review reminder timing with the practice, use the button to copy the chosen conditions into the proposed setup, and enter its actual D4W next-batch range before checking the change. Suggestions do not approve the transition or remove catch-up script requirements.'));
      const use=el('button',modify?'Use these conditions in proposed setup':'Create proposed setup from this option');use.type='button';use.className='btn btn-outline-success';
      use.addEventListener('click',()=>applyOption(option,modify,signature));
      if(!modify)card.append(el('p','Creates a proposed setup from the current setup and replaces any existing proposed draft. Current settings are left intact.'));
      card.append(use);host.append(card);
     });
    }catch(e){host.replaceChildren(el('p',`Suggestions unavailable: ${e.message}`));}
    finally{button.disabled=false;}
   },0);
  });
 }
 function invalidate(){generation++;for(const prefix of ['current','modify']){$(`${prefix}-suggestions`).replaceChildren();$(`${prefix}-suggest`).disabled=false;}}
 form.addEventListener('input',invalidate);form.addEventListener('change',invalidate);
})();

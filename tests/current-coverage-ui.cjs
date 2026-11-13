// Browser-independent integration harness for current coverage and both outputs.
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const nodes=new Map();
class Element {
 constructor(tag='div'){this.tagName=tag.toUpperCase();this.children=[];this.listeners={};this.value='';this.name='';this.checked=false;this.style={};this.hidden=false;this.disabled=false;this.text='';}
 set id(value){this._id=value;nodes.set(value,this);}get id(){return this._id||'';}
 set textContent(value){this.text=value;this.children=[];}get textContent(){return this.text+this.children.map(x=>x.textContent).join('\n');}
 append(...children){children.forEach(c=>{c.parentElement=this;this.children.push(c);});}
 replaceChildren(...children){this.text='';this.children=[];this.append(...children);}
 addEventListener(type,fn){(this.listeners[type]||=[]).push(fn);}
 dispatchEvent(event){if(!event.target)event.target=this;for(const fn of this.listeners[event.type]||[])fn(event);if(event.bubbles&&this.parentElement)this.parentElement.dispatchEvent(event);}
 closest(selector){if(selector.startsWith('#')){let n=this;while(n){if(n.id===selector.slice(1))return n;n=n.parentElement;}}return null;}
 querySelectorAll(selector){return [];}
 matches(){return false;}checkValidity(){return true;}focus(){}reportValidity(){}
}
const get=id=>{if(!nodes.has(id)){const n=new Element();n.id=id;}return nodes.get(id);};
const form=get('checklist-form');
function field(id,value='',name=''){const n=get(id);n.value=value;n.name=name;form.append(n);return n;}
field('job-type','basic','job_type');field('recall-count','1','recall_count');field('requested-count','1','requested_recall_count');field('period-count','0','period_count');
for(const [prefix,collection] of [['recall','recalls'],['requested','requested_recalls']]){
 field(prefix+'-0-name','Reminder',collection+'[0][name]');
 for(const [key,value] of [['schedule','Weekly'],['weekly_interval','1'],['weekdays','Monday'],['mode','Simple'],['period','Next Week']])field(prefix+'-'+key,value,collection+'[0]['+key+']');
}
field('batch-0-date','16/11/2026','batches[0][date]');field('batch-0-time','09:00','batches[0][time]');field('batch-0-from','2026-11-23','batches[0][from]');field('batch-0-to','2026-11-29','batches[0][to]');
field('range-0-name','Reminder','requested_ranges[0][name]');field('range-0-from','01-01-1900','requested_ranges[0][from]');field('range-0-to','01-01-3000','requested_ranges[0][to]');
field('coverage-evidence','','coverage_evidence');field('coverage-decision','pending','coverage_decision');
form.append(get('auto-requested-batches'));
const FormData=class {constructor(){this.entries=[...nodes.values()].filter(n=>n.name).map(n=>[n.name,n.value]);}*[Symbol.iterator](){yield* this.entries;}get(key){return this.entries.find(e=>e[0]===key)?.[1]??null;}getAll(key){return this.entries.filter(e=>e[0]===key).map(e=>e[1]);}has(key){return this.entries.some(e=>e[0]===key);}};
class Event{constructor(type,options={}){this.type=type;Object.assign(this,options);}}
const context=vm.createContext({window:{AutoChefSchedule:{update(){},format(){return 'Fortnightly';}},AutoChefCoverage:{evaluate:()=>({scripts:null,includeRanges:false,details:['Modify assessment']})}},document:{getElementById:get,createElement:tag=>new Element(tag),createDocumentFragment:()=>new Element()},FormData,Event,Intl,setTimeout:fn=>fn()});
for(const file of ['coverage-engine.js','current-coverage-engine.js','preview-engine.js','auto-preview.js','coverage.js','current-coverage.js','suggestion-engine.js','suggestions.js','output.js','agent-output.js'])vm.runInContext(fs.readFileSync(path.join(__dirname,'../flaskr/static/js',file),'utf8'),context);
const click=id=>get(id).dispatchEvent(new Event('click'));
const edit=(id,value)=>{get(id).value=value;get(id).dispatchEvent(new Event('input',{bubbles:true}));};
const current=context.window.AutoChefCurrentCoverage;
assert.equal(current.evaluate().state,'clear');
edit('recall-weekly_interval','2');assert.equal(current.evaluate().scripts,true);
click('current-coverage-check');assert.match(get('current-coverage-result').textContent,/30\/11\/2026 to 06\/12\/2026/);
click('generate-notes');assert.match(get('notes-preview').textContent,/Scripts required: a potential current-setup gap/);
edit('recall-weekly_interval','1');assert.equal(get('copy-notes').disabled,true);click('generate-notes');assert.match(get('notes-preview').textContent,/no gaps detected within the checked preview/);
edit('batch-0-to','2026-11-30');assert.equal(current.evaluate().state,'incomplete');edit('batch-0-to','2026-11-29');
edit('job-type','modify');assert.equal(get('current-coverage-section').hidden,true);assert.equal(get('coverage-section').hidden,false);
for(const [key,value] of [['next','2026-11-16'],['time','09:00'],['from','2026-11-23'],['to','2026-11-29']])edit('auto-requested-0-'+key,value);
get('coverage-confirm').checked=true;
const comparison=context.window.AutoChefCoverage;
assert.equal(comparison.evaluate().state,'clear');assert.equal(comparison.evaluate().scripts,null);
edit('coverage-evidence','Reviewed calculated preview');edit('coverage-decision','clear');assert.equal(comparison.evaluate().scripts,false);
// Synthetic count changes during output must not discard a valid approval.
click('generate-notes');assert.equal(comparison.evaluate().scripts,false);
edit('requested-weekly_interval','2');assert.equal(get('coverage-decision').value,'pending');assert.equal(comparison.evaluate().scripts,true);assert.equal(comparison.evaluate().includeRanges,true);
// A manual no-script choice and absent notes can never override a detected gap.
edit('coverage-evidence','');edit('coverage-decision','clear');assert.equal(comparison.evaluate().scripts,true);
click('generate-notes');assert.match(get('notes-preview').textContent,/Scripts required automatically/);
edit('auto-requested-0-to','2026-11-30');assert.equal(comparison.evaluate().state,'incomplete');assert.equal(comparison.evaluate().scripts,null);
edit('coverage-evidence','Manual handling needed');edit('coverage-decision','manual');assert.equal(comparison.evaluate().scripts,true);
edit('job-type','basic');assert.equal(get('auto-requested-0-to').value,'2026-11-30');assert.equal(current.evaluate().state,'clear');
console.log('UI integration passed: automatic inputs, Basic and Modify results, output integration, mandatory gap policy, invalidation and job switching.');

// Suggestion UI works on current in Basic and proposed in Modify; never grants approval.
for(const [prefix,collection] of [['recall','recalls'],['requested','requested_recalls']]){
 edit(prefix+'-mode','Advanced');
 for(const [key,value] of [['amount','5'],['unit','week(s)'],['comparison','is'],['direction','future']])field(prefix+'-first-'+key,value,collection+'[0][first]['+key+']');
 edit(prefix+'-weekly_interval','2');
}
edit('batch-0-from','2026-12-21');edit('batch-0-to','2026-12-27');
click('current-suggest');
assert.match(get('current-suggestions').textContent,/Option 1/);
assert.match(get('current-suggestions').textContent,/more than 4 week/);
assert.match(get('current-suggestions').textContent,/not confirmed by D4W/);
edit('recall-weekly_interval','1');assert.equal(get('current-suggestions').textContent,'');
click('current-suggest');assert.match(get('current-suggestions').textContent,/No ongoing gaps/);
edit('job-type','modify');edit('auto-requested-0-from','2026-12-21');edit('auto-requested-0-to','2026-12-27');
const decision=get('coverage-decision').value;
click('modify-suggest');assert.match(get('modify-suggestions').textContent,/Option 1/);
assert.equal(get('coverage-decision').value,decision);assert.equal(get('requested-weekly_interval').value,'2');
edit('requested-weekly_interval','1');assert.equal(get('modify-suggestions').textContent,'');
click('modify-suggest');assert.match(get('modify-suggestions').textContent,/No ongoing gaps/);
edit('auto-requested-0-to','2026-12-28');click('modify-suggest');assert.match(get('modify-suggestions').textContent,/Suggestions unavailable/);
console.log('Suggestion UI passed: both checklists, target selection, invalidation, mismatch handling and script-decision preservation.');

// Handoff uses actual proposed controls, keeps current data, and clears calculated seeds.
function rename(oldId,newId){const n=get(oldId);nodes.delete(oldId);n.id=newId;}
rename('requested-mode','requested-0-mode');
for(const key of ['amount','unit','comparison','direction'])rename('requested-first-'+key,'requested-0-first-'+key);
for(const [key,value] of [['amount','1'],['unit','week(s)'],['comparison','is'],['direction','future']])field('requested-0-second-'+key,value,'requested_recalls[0][second]['+key+']');
field('requested-0-and','on','requested_recalls[0][and]').type='checkbox';
form.querySelectorAll=selector=>selector==='input, select'?[...nodes.values()].filter(n=>n.name):[];
edit('job-type','basic');edit('recall-weekly_interval','2');
let seed=context.window.AutoChefAutoPreview.build(false).groups[0].types;
let candidate=context.window.AutoChefSuggestions.suggest(seed).options[0];
let signature=context.window.AutoChefAutoPreview.signature();
const sourceBefore=JSON.stringify([...new FormData(form)].filter(([name])=>name.startsWith('recalls[')||name.startsWith('batches[')));
assert.equal(context.window.AutoChefSuggestionUI.applyOption(candidate,false,signature),true);
assert.equal(get('job-type').value,'modify');
assert.equal(get('requested-weekly_interval').value,'2');
assert.equal(get('requested-0-mode').value,'Advanced');assert.equal(get('requested-0-and').checked,true);
assert.equal(get('requested-0-first-amount').value,'4');assert.equal(get('requested-0-second-amount').value,'6');
assert.equal(get('auto-requested-0-next').value,'2026-11-16');
assert.equal(get('auto-requested-0-from').value,'');assert.equal(get('auto-requested-0-to').value,'');
assert.equal(get('coverage-confirm').checked,false);assert.equal(get('coverage-decision').value,'pending');assert.equal(get('coverage-evidence').value,'');
assert.equal(comparison.evaluate().state,'incomplete');assert.equal(comparison.evaluate().scripts,null);
assert.equal(JSON.stringify([...new FormData(form)].filter(([name])=>name.startsWith('recalls[')||name.startsWith('batches['))),sourceBefore);
assert.match(get('suggestion-apply-status').textContent,/actual D4W/);
// An old button cannot apply an option after any input change.
assert.equal(context.window.AutoChefSuggestionUI.applyOption(candidate,true,signature),false);
// Applying from Modify also keeps schedules and requires fresh D4W ranges.
signature=context.window.AutoChefAutoPreview.signature();
assert.equal(context.window.AutoChefSuggestionUI.applyOption(candidate,true,signature),true);
assert.equal(get('requested-weekly_interval').value,'2');assert.equal(get('auto-requested-0-from').value,'');
console.log('Suggestion handoff passed: proposed conditions, unchanged source/schedules, required D4W seeds, reset decisions and stale-option rejection.');

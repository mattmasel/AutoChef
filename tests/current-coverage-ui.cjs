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
field('job-type','basic','job_type');field('recall-count','1','recall_count');field('requested-count','0','requested_recall_count');field('period-count','0','period_count');
field('recall-0-name','Fourth reminder','recalls[0][name]');field('batch-0-date','31/12/2999','batches[0][date]');
field('range-0-name','Fourth reminder','requested_ranges[0][name]');field('range-0-from','01-01-1900','requested_ranges[0][from]');field('range-0-to','01-01-3000','requested_ranges[0][to]');
for(const id of ['current-coverage-start','current-coverage-end','current-coverage-confirm','current-coverage-batches'])get('current-coverage-fields').append(get(id));
form.append(get('current-coverage-fields'));
const FormData=class {constructor(){this.entries=[...nodes.values()].filter(n=>n.name).map(n=>[n.name,n.value]);}*[Symbol.iterator](){yield* this.entries;}get(key){return this.entries.find(e=>e[0]===key)?.[1]??null;}has(key){return this.entries.some(e=>e[0]===key);}};
class Event{constructor(type,options={}){this.type=type;Object.assign(this,options);}}
const context=vm.createContext({window:{AutoChefSchedule:{update(){},format(){return 'Fortnightly';}},AutoChefCoverage:{evaluate:()=>({scripts:null,includeRanges:false,details:['Modify assessment']})}},document:{getElementById:get,createElement:tag=>new Element(tag),createDocumentFragment:()=>new Element()},FormData,Event,Intl});
for(const file of ['coverage-engine.js','current-coverage-engine.js','current-coverage.js','output.js','agent-output.js'])vm.runInContext(fs.readFileSync(path.join(__dirname,'../flaskr/static/js',file),'utf8'),context);
const click=id=>get(id).dispatchEvent(new Event('click'));
const edit=(id,value)=>{get(id).value=value;get(id).dispatchEvent(new Event('input',{bubbles:true}));};
const current=context.window.AutoChefCurrentCoverage;
assert.equal(current.evaluate().state,'unassessed');
edit('current-coverage-start','2026-11-01T00:00');edit('current-coverage-end','2026-12-31T23:59');
for(const [i,run,from,to] of [[0,'2026-11-05T09:00','2026-10-01','2026-10-07'],[1,'2026-11-19T09:00','2026-10-15','2026-10-21']]){
 click('current-coverage-add');for(const [suffix,value] of [['type','0'],['run',run],['from',from],['to',to]])edit(`current-batch-${i}-${suffix}`,value);
}
get('current-coverage-confirm').checked=true;click('current-coverage-check');
assert.equal(current.evaluate().scripts,true);assert.match(get('current-coverage-result').textContent,/08\/10\/2026 to 14\/10\/2026/);
click('generate-notes');assert.equal(get('current-coverage-confirm').checked,true);assert.match(get('notes-preview').textContent,/Scripts required: a potential current-setup gap/);
click('generate-agent');assert.match(get('agent-preview').textContent,/Current setup coverage assessment/);assert.match(get('agent-preview').textContent,/08\/10\/2026 to 14\/10\/2026/);
edit('current-batch-0-to','2026-10-14');assert.equal(get('current-coverage-confirm').checked,false);assert.equal(get('copy-notes').disabled,true);assert.equal(get('copy-agent').disabled,true);
get('current-coverage-confirm').checked=true;assert.equal(current.evaluate().state,'clear');click('generate-notes');assert.match(get('notes-preview').textContent,/no gaps detected within the checked preview/);
edit('job-type','modify');assert.equal(get('current-coverage-section').hidden,true);assert.equal(get('current-coverage-fields').disabled,true);click('generate-notes');assert.doesNotMatch(get('notes-preview').textContent,/Current setup coverage assessment/);
edit('job-type','basic');assert.equal(get('current-batch-0-to').value,'2026-10-14');assert.equal(get('current-coverage-section').hidden,false);
const box=get('current-batch-1-type').parentElement.parentElement.parentElement;box.children.at(-1).dispatchEvent(new Event('click'));get('current-coverage-confirm').checked=true;assert.equal(current.evaluate().state,'incomplete');
console.log('UI integration passed: gap/clear outputs, mandatory scripts, confirmation, invalidation, mode isolation, and row removal.');

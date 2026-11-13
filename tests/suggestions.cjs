const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const context=vm.createContext({window:{}});
for(const f of ['coverage-engine','current-coverage-engine','preview-engine','suggestion-engine'])vm.runInContext(fs.readFileSync(path.join(__dirname,`../flaskr/static/js/${f}.js`),'utf8'),context);
const {suggest,check}=context.window.AutoChefSuggestions;
const first={name:'First',next:'2026-11-16',time:'09:00',from:'2026-12-21',to:'2026-12-27',schedule:{kind:'Weekly',interval:2,weekdays:['Monday']},rule:{mode:'Advanced',conditions:[{comparison:'is',amount:5,unit:'week(s)',direction:'future'}]}};
const before=JSON.stringify(first),r=suggest([first]);
assert.equal(r.state,'suggested');assert(r.options.length>=2);assert.equal(JSON.stringify(first),before);
const centered=r.options.find(o=>o.changes[0].after.from==='2026-12-14');assert(centered);assert.equal(centered.changes[0].after.to,'2026-12-27');
const runs=centered.preview.groups[0].batches;assert.equal(runs[1].from,'2026-12-28');assert.equal(runs[1].to,'2027-01-10');
for(const option of r.options){assert.equal(option.result.state,'clear');assert.equal(option.result.pending.length,0);assert.equal(JSON.stringify(option.changes[0].after.schedule),JSON.stringify(first.schedule));}
assert.equal(suggest([{...first,schedule:{...first.schedule,interval:1}}]).state,'clear');
assert.throws(()=>suggest([{...first,to:'2026-12-28'}]),/does not match/);
const final={...first,name:'Final',next:'2026-11-17',schedule:{...first.schedule,weekdays:['Tuesday']},from:'2026-12-21',to:'2026-12-27'};
const multi=suggest([first,final]);assert.equal(multi.state,'suggested');assert(multi.options.some(o=>o.changes.length===2));
// A downstream stage far in the future misses patients who enter it later.
const impossible={...final,rule:{mode:'Advanced',conditions:[{comparison:'is',amount:20,unit:'week(s)',direction:'future'}]},from:'2027-04-05',to:'2027-04-11'};
assert.equal(suggest([first,impossible]).options.length,0);
// Past-week comparisons can overlap at the final stage; do not offer duplicate reminders.
const past={...first,from:'2026-10-12',to:'2026-10-18',rule:{mode:'Advanced',conditions:[{comparison:'is',amount:5,unit:'week(s)',direction:'past'}]}};
assert.equal(suggest([past]).options.length,0);
console.log('Suggestions passed: two-week alternatives, unchanged schedules/inputs, multiple types, invalid seeds, progression rejection, duplicate-final rejection and clear setup.');

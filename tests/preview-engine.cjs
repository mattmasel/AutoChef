const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const context=vm.createContext({window:{}});
for(const f of ['coverage-engine.js','current-coverage-engine.js','preview-engine.js'])vm.runInContext(fs.readFileSync(path.join(__dirname,'../flaskr/static/js',f),'utf8'),context);
const {build,range,read,iso,matches}=context.window.AutoChefPreviewEngine;
const {day}=context.window.AutoChefCoverageEngine;
const months=['January','February','March','April','May','June','July','August','September','October','November','December'];
const first={name:'First',next:'2026-11-16',time:'09:00',from:'2026-11-23',to:'2026-11-29',schedule:{kind:'Weekly',interval:1,weekdays:['Monday']},rule:{mode:'Simple',period:'Next Week'}};
const final={name:'Final',next:'2026-12-01',time:'09:00',from:'2026-09-01',to:'2026-09-30',schedule:{kind:'Monthly',months,monthlyMode:'numbers',monthdays:['1']},rule:{mode:'Simple',period:'The Month 3 Months ago'}};
let p=build([[first,final]]),g=p.groups[0];
assert.equal(g.batches.filter(b=>b.type===0)[1].from,'2026-11-30');
assert.equal(g.batches.filter(b=>b.type===0)[1].to,'2026-12-06');
assert.equal(g.batches.filter(b=>b.type===1)[1].from,'2026-10-01');
assert.equal(g.batches.filter(b=>b.type===1)[1].to,'2026-10-31');
let r=context.window.AutoChefCurrentCoverageEngine.assess({...p,confirmed:true,types:g.types,batches:g.batches});
assert.equal(r.state,'clear');assert.equal(r.pending.length,0);
const fortnightly=structuredClone(first);fortnightly.schedule.interval=2;
p=build([[fortnightly,final]]);g=p.groups[0];r=context.window.AutoChefCurrentCoverageEngine.assess({...p,confirmed:true,types:g.types,batches:g.batches});assert.equal(r.scripts,true);assert(r.gaps.some(x=>iso(x.from)==='2026-11-30'&&iso(x.to)==='2026-12-06'));
// Whole calendar periods: year rollover, leap year, and advanced IS equivalence.
for(const [unit,direction,amount,from,to] of [['week(s)','past',1,'2026-11-09','2026-11-15'],['week(s)','future',1,'2026-11-23','2026-11-29'],['month(s)','past',1,'2026-10-01','2026-10-31']]){
 const result=range({mode:'Advanced',conditions:[{comparison:'is',unit,direction,amount}]},day('2026-11-16'));assert.equal(iso(result[0]),from);assert.equal(iso(result[1]),to);
}
assert.equal(iso(range({mode:'Simple',period:'Last Month'},day('2028-03-31'))[1]),'2028-02-29');
assert.equal(iso(range({mode:'Simple',period:'Next Week'},day('2026-12-31'))[0]),'2027-01-04');
assert.equal(iso(range({mode:'Simple',period:'Next Quarter'},day('2026-11-16'))[1]),'2027-03-31');
// First-range mismatch, bad date, schedule mismatch and open-ended rules fail closed.
assert.throws(()=>build([[{...first,to:'2026-11-30'}]]),/does not match/);
assert.throws(()=>build([[{...first,next:'2026-11-17'}]]),/does not match its schedule/);
assert.throws(()=>build([[{...final,to:'2026-09-31'}]]),/valid Recall/);
assert.throws(()=>range({mode:'Advanced',conditions:[{comparison:'more than',amount:3,unit:'day(s)',direction:'past'}]},day(first.next)),/open-ended/);
const last={kind:'Monthly',months,monthlyMode:'numbers',monthdays:['Last']};assert(matches(last,day('2028-02-29'),day('2028-01-31')));
const ordinal={kind:'Monthly',months,monthlyMode:'on',ordinals:['Last'],weekdays:['Monday']};assert(matches(ordinal,day('2026-11-30'),day(first.next)));assert(!matches(ordinal,day('2026-11-23'),day(first.next)));
const days31={...last,monthdays:['31']};assert(!matches(days31,day('2028-02-29'),day('2028-01-31')));
// FormData extraction of nested conditions preserves names and amounts.
const data=new Map([['recalls[0][name]','A'],['recalls[0][mode]','Advanced'],['recalls[0][first][amount]','45'],['recalls[0][first][unit]','day(s)'],['recalls[0][first][comparison]','is'],['recalls[0][first][direction]','past']]);data.getAll=k=>data.has(k)?[data.get(k)]:[];
assert.equal(read(data,'recalls',1,[{}])[0].rule.conditions[0].amount,'45');
// Compare generated old/new in one shared period with automatic initial scopes.
p=build([[first,final],[fortnightly,final]]);const old=p.groups[0],fresh=p.groups[1];
const types=old.types.map((t,i)=>{const rows=old.batches.filter(b=>b.type===i&&b.run.slice(0,10)<=p.cohortEnd);return {name:t.name,from:rows.map(b=>b.from).sort()[0],to:rows.map(b=>b.to).sort().at(-1)};});
r=context.window.AutoChefCoverageEngine.assess({start:p.start,end:p.end,confirmed:true,requestedCount:2,types,batches:[...old.batches.map(b=>({...b,side:'old'})),...fresh.batches.map(b=>({...b,side:'new'}))]});assert.equal(r.state,'gap');
r=context.window.AutoChefCoverageEngine.assess({start:p.start,end:p.end,confirmed:true,requestedCount:2,types,batches:[...old.batches.map(b=>({...b,side:'old'})),...old.batches.map(b=>({...b,side:'new'}))]});assert.equal(r.state,'clear');
console.log('Generated preview checks passed: supplied two-type example, fortnightly gaps, old/new comparison, calendar boundaries, recurrence and fail-closed validation.');

assert.throws(()=>range({mode:'Advanced',conditions:[{comparison:'more than',amount:3,unit:'month(s)',direction:'past'}]},day(first.next)),/open-ended/);

// Exact D4W observations supplied by Matt: both directions and month-end clamp.
const observed=[
 ['2026-11-16','week(s)','past','2026-10-25','2026-11-08'],
 ['2026-11-16','week(s)','future','2026-11-23','2026-12-06'],
 ['2026-11-16','month(s)','past','2026-08-15','2026-10-15'],
 ['2026-11-16','month(s)','future','2026-12-16','2027-02-15'],
 ['2026-11-19','week(s)','past','2026-10-28','2026-11-11'],
 ['2026-11-19','week(s)','future','2026-11-26','2026-12-09'],
 ['2027-01-31','month(s)','past','2026-10-30','2026-12-30'],
 ['2027-01-31','month(s)','future','2027-02-28','2027-04-29']
];
const bounded=(unit,direction)=>({mode:'Advanced',conditions:[{comparison:'more than',amount:1,unit,direction},{comparison:'less than',amount:3,unit,direction}]});
for(const [next,unit,direction,from,to] of observed){
 const rule=bounded(unit,direction),result=range(rule,day(next));
 assert.equal(iso(result[0]),from);assert.equal(iso(result[1]),to);
 // Exercise seed validation and later-batch generation, not only the range helper.
 const preview=build([[{name:'Reminder',next,time:'09:00',from,to,rule,schedule:{kind:'Weekly',interval:1,weekdays:[['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'][new Date(next+'T00:00:00Z').getUTCDay()]]}}]]);
 assert.equal(preview.groups[0].batches[0].from,from);
 assert.equal(preview.groups[0].batches[0].to,to);
 assert(preview.groups[0].batches.length>1);
}
// Derived edge cases, distinct from the observed D4W fixtures above.
let leap=range(bounded('month(s)','future'),day('2028-01-31'));
assert.equal(iso(leap[0]),'2028-02-29');assert.equal(iso(leap[1]),'2028-04-29');
let past=range(bounded('month(s)','past'),day('2027-05-31'));
assert.equal(iso(past[0]),'2027-02-27');assert.equal(iso(past[1]),'2027-04-29');
// Each monthly offset is calculated directly, not by chaining clamped months.
let april=range(bounded('month(s)','future'),day('2027-02-28'));
assert.equal(iso(april[1]),'2027-05-27');
console.log('All eight observed D4W comparison ranges and derived leap/month-end cases passed.');

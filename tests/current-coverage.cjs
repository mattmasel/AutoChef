const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const context=vm.createContext({window:{}});
for(const file of ['coverage-engine.js','current-coverage-engine.js'])
  vm.runInContext(fs.readFileSync(path.join(__dirname,'../flaskr/static/js',file),'utf8'),context);
const assess=context.window.AutoChefCurrentCoverageEngine.assess;
const {date}=context.window.AutoChefCoverageEngine;
const batch=(type,run,from,to)=>({type,run,from,to});
const make=(types,batches)=>({start:'2026-11-01T00:00',end:'2026-12-31T23:59',confirmed:true,types:types.map(name=>({name})),batches});
const fortnightly=make(['Final'],[
  batch(0,'2026-11-05T09:00','2026-10-01','2026-10-07'),
  batch(0,'2026-11-19T09:00','2026-10-15','2026-10-21'),
  batch(0,'2026-12-03T09:00','2026-10-29','2026-11-04')]);
let r=assess(fortnightly);
assert.equal(r.scripts,true);
assert.equal(r.gaps.length,2);
assert.equal(date(r.gaps[0].from),'08/10/2026');
assert.equal(date(r.gaps[0].to),'14/10/2026');
assert.equal(date(r.gaps[1].from),'22/10/2026');
assert.equal(date(r.gaps[1].to),'28/10/2026');
// Reversing input order does not change the result.
assert.equal(JSON.stringify(assess({...fortnightly,batches:[...fortnightly.batches].reverse()}).gaps),JSON.stringify(r.gaps));
// A subsequent catch-up may close the hole, including both endpoints.
const filled=structuredClone(fortnightly);
filled.batches.push(batch(0,'2026-12-10T09:00','2026-10-08','2026-10-14'),batch(0,'2026-12-17T09:00','2026-10-22','2026-10-28'));
r=assess(filled);assert.equal(r.state,'clear');assert.equal(r.scripts,false);
// Adjacent inclusive ranges leave no gap. No flag before first final range.
r=assess(make(['Final'],[batch(0,'2026-11-05T09:00','2026-10-01','2026-10-14'),batch(0,'2026-11-19T09:00','2026-10-15','2026-10-28')]));
assert.equal(r.state,'clear');assert.equal(r.gaps.length,0);
// Leap day is a real one-day gap.
r=assess({...make(['Final'],[batch(0,'2028-03-01T09:00','2028-02-01','2028-02-28'),batch(0,'2028-03-15T09:00','2028-03-01','2028-03-14')]),start:'2028-03-01T00:00',end:'2028-03-31T23:59'});
assert.equal(date(r.gaps[0].from),'29/02/2028');assert.equal(r.gaps[0].from,r.gaps[0].to);
// Continuous per-type coverage can still lose a cohort at hand-off: final ran too early.
const progression=make(['First','Final'],[
 batch(0,'2026-11-10T09:00','2026-10-01','2026-10-07'),
 batch(0,'2026-11-24T09:00','2026-10-08','2026-10-14'),
 batch(1,'2026-11-05T09:00','2026-10-01','2026-10-07'),
 batch(1,'2026-11-19T09:00','2026-10-08','2026-10-14')]);
r=assess(progression);assert(r.gaps.some(g=>g.kind==='progression'));assert.equal(r.scripts,true);
// A valid later final completes the sequence; retained final type is not stranded.
progression.batches[2].run='2026-11-15T09:00';progression.batches[3].run='2026-11-29T09:00';
r=assess(progression);assert.equal(r.state,'clear');assert.equal(r.pending.length,0);
// Preview ends before final is due: report boundary, never invent a gap.
progression.batches=progression.batches.slice(0,2);
r=assess(progression);assert.equal(r.gaps.length,0);assert(r.pending.length>0);assert.equal(r.state,'incomplete');assert.equal(r.scripts,null);
// A gap is still actionable even if another type has insufficient preview.
r=assess({...fortnightly,types:[{name:'First'},{name:'Final'}]});assert.equal(r.scripts,true);
// Invalid, incomplete, or ambiguous input cannot produce an all-clear.
assert.equal(assess({...fortnightly,confirmed:false}).scripts,null);
const invalid=structuredClone(fortnightly);invalid.batches[0].from='2026-02-30';assert.equal(assess(invalid).state,'incomplete');
const same=make(['First','Final'],[batch(0,'2026-11-05T09:00','2026-10-01','2026-10-07'),batch(1,'2026-11-05T09:00','2026-10-01','2026-10-07')]);assert.equal(assess(same).state,'incomplete');
console.log('Current coverage tests passed: fortnightly holes, catch-up, boundaries, final completion, progression, horizon, and validation.');

// Run with: node tests/coverage-policy.cjs (no additional dependencies).
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const root = path.join(__dirname, '../flaskr/static/js');
const nodes = new Map();
function node(id) {
  if (!nodes.has(id)) nodes.set(id, {value:'', checked:false, listeners:{},
    addEventListener(type, fn) {(this.listeners[type] ||= []).push(fn);},
    replaceChildren() {}, append() {}});
  return nodes.get(id);
}
node('job-type').value = 'modify';
node('recall-count').value = '0';
node('requested-count').value = '0';
const context = vm.createContext({window:{}, document:{getElementById:node,
  createElement:() => ({append(){}})}, FormData:class { *[Symbol.iterator]() {} }});
for (const file of ['coverage-engine.js','coverage.js'])
  vm.runInContext(fs.readFileSync(path.join(root,file),'utf8'), context);
const engine = context.window.AutoChefCoverageEngine;
const input = {start:'2026-11-01T00:00',end:'2026-11-30T23:59',confirmed:true,
  requestedCount:1,types:[{name:'Final reminder',from:'2026-10-01',to:'2026-10-31'}],
  batches:[{side:'old',type:0,run:'2026-11-02T09:00',from:'2026-10-01',to:'2026-10-31'},
    {side:'new',type:0,run:'2026-11-02T09:00',from:'2026-10-20',to:'2026-10-31'}]};
const gap = engine.assess(input);
assert.equal(gap.state,'gap');
assert.equal(engine.date(gap.gaps[0].from),'01/10/2026');
assert.equal(engine.date(gap.gaps[0].to),'19/10/2026');
input.batches.push({side:'new',type:0,run:'2026-11-20T09:00',from:'2026-10-01',to:'2026-10-19'});
const clear = engine.assess(input);
assert.equal(clear.state,'clear');
// Exercise the actual UI decision function, including attempted manual overrides.
let result = gap;
engine.assess = () => result;
function choose(value, evidence='') {
  node('coverage-decision').value=value;
  node('coverage-evidence').value=evidence;
  for (const fn of node('checklist-form').listeners.change)
    fn({target:{id:'coverage-decision'}});
  return context.window.AutoChefCoverage.evaluate();
}
for (const state of ['gap','incomplete']) {
  result = {...gap,state};
  for (const decision of ['pending','clear','manual']) {
    for (const evidence of ['', 'No patients found']) {
      const assessment = choose(decision,evidence);
      assert.equal(assessment.scripts,true);
      assert.equal(assessment.includeRanges,true);
      assert(assessment.details.some(text => text.includes('Scripts required automatically')));
    }
  }
}
result=clear;
assert.equal(choose('pending').scripts,null);
assert.equal(choose('clear').scripts,null);
assert.equal(choose('clear','Complete preview reviewed').scripts,false);
assert.equal(choose('manual','Manual correction needed').scripts,true);
result={state:'incomplete',title:'Incomplete',messages:[],gaps:[]};
assert.equal(choose('clear','Reviewed').scripts,null);
console.log('Coverage policy passed: gap boundaries, later pickup, mandatory scripts, overrides, and clear/incomplete decisions.');

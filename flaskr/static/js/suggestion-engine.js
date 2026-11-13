/* Suggestions are hypothetical setups, never D4W-verified seeds or script approvals. */
(() => {
 'use strict';
 const preview=window.AutoChefPreviewEngine,health=window.AutoChefCurrentCoverageEngine;
 const {day}=window.AutoChefCoverageEngine;
 function check(types){
  const p=preview.build([types]),g=p.groups[0];
  return {preview:p,result:health.assess({...p,confirmed:true,types:g.types,batches:g.batches})};
 }
 function candidates(type,batches){
  if(type.schedule.kind==='One time')return [];
  const runs=batches.map(b=>day(b.run.slice(0,10))).sort((a,b)=>a-b);
  if(runs.length<2)return [];
  const spacing=Math.max(...runs.slice(1).map((n,i)=>n-runs[i]));
  const anchor=day(type.next),[a,b]=preview.range(type.rule,anchor);
  // Stay on the same side of the recall date. Only confirmed week-offset rules
  // are proposed; unsupported or crossing-zero alternatives are left to review.
  const direction=a>anchor?'future':b<anchor?'past':null;
  if(!direction)return [];
  const low=direction==='future'?(a-anchor)/7:(anchor-b)/7;
  const high=direction==='future'?(b+1-anchor)/7:(anchor-a)/7;
  const width=Math.max(1,Math.ceil(spacing/7));
  const starts=[Math.floor((low+high-width)/2),Math.floor(low),Math.ceil(high-width)];
  const seen=new Set(),out=[];
  for(const start of starts){
   if(start<1||start+width>12000||seen.has(start))continue;
   seen.add(start);
   const rule={mode:'Advanced',conditions:[{comparison:'more than',amount:start,unit:'week(s)',direction},{comparison:'less than',amount:start+width,unit:'week(s)',direction}]};
   const [from,to]=preview.range(rule,anchor);
   if(from===a&&to===b)continue;
   out.push({...type,rule,from:preview.iso(from),to:preview.iso(to)});
  }
  return out;
 }
 function suggest(types){
  const baseline=check(types);
  if(baseline.result.state==='clear'&&!baseline.result.pending.length)return {state:'clear',options:[],message:'No ongoing gaps detected in this setup. No condition changes suggested. Historical catch-up and transition scripts still need separate review.'};
  if(baseline.result.state!=='gap')return {state:'review',options:[],message:'Complete the setup review before requesting suggestions. Unresolved timing, repeated final reminders or an incomplete preview cannot be treated as a verified gap.'};
  const affected=[...new Set(baseline.result.gaps.map(g=>g.type))];
  const choices=types.map((t,i)=>affected.includes(i)?candidates(t,baseline.preview.groups[0].batches.filter(b=>b.type===i)):[]);
  const trials=[];
  // First try changing one type; then coordinated alternatives for several types.
  for(const i of affected)for(const t of choices[i])trials.push(types.map((old,j)=>i===j?t:old));
  for(let variant=0;variant<3;variant++)trials.push(types.map((t,i)=>choices[i][variant%Math.max(1,choices[i].length)]||t));
  const options=[],seen=new Set();let attempted=0;
  for(const trial of trials.slice(0,40)){
   const key=JSON.stringify(trial.map(t=>t.rule));if(seen.has(key))continue;seen.add(key);attempted++;
   try{
    const tested=check(trial);
    if(tested.result.state!=='clear'||tested.result.pending.length)continue;
    const changes=trial.flatMap((t,i)=>JSON.stringify(t.rule)!==JSON.stringify(types[i].rule)?[{index:i,before:types[i],after:t}]:[]);
    if(!changes.length)continue;
    options.push({changes,...tested});if(options.length===3)break;
   }catch(e){/* A candidate outside calculation limits is never offered. */}
  }
  return {state:options.length?'suggested':'review',options,attempted,message:options.length?'These alternatives pass the generated coverage and progression checks with the sending schedules unchanged.':'No verified alternative found in the limited search. Review conditions and reminder order manually; this does not mean no solution exists.'};
 }
 window.AutoChefSuggestions={suggest,check};
})();

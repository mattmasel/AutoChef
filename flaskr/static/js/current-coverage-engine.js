/* Current setup: union of future coverage plus chronological stage hand-offs.
   No patient records; dates outside the bounded preview are never called gaps. */
(() => {
  'use strict';
  const {day,time,date}=window.AutoChefCoverageEngine;
  function assess(input) {
    const incomplete=message=>({state:'incomplete',title:'Current setup — assessment incomplete',scripts:null,gaps:[],pending:[],messages:[message]});
    const start=time(input.start),end=time(input.end),count=input.types.length;
    if(!Number.isFinite(start)||!Number.isFinite(end)||end<=start)return incomplete('Enter an assessment start and a later end time.');
    if(!input.confirmed)return incomplete('Confirm all current-setup runs in this window and the reminder order.');
    if(!count||count>50||input.batches.length>300)return incomplete('Use 1–50 current types and at most 300 preview rows.');
    if(input.types.some(t=>!t.name.trim()))return incomplete('Name every current recall type.');
    const rows=[];
    for(const b of input.batches) {
      const run=time(b.run),from=day(b.from),to=day(b.to);
      if(!Number.isInteger(b.type)||b.type<0||b.type>=count||!Number.isFinite(run)||!Number.isFinite(from)||!Number.isFinite(to)||from>to||run<start||run>end)
        return incomplete('Complete every preview row with a valid type, time within the window and inclusive From/To dates, or remove unused rows.');
      rows.push({...b,run,from,to});
    }
    if(!rows.length)return incomplete('Add upcoming batches from the current setup.');
    rows.sort((a,b)=>a.run-b.run);
    for(let i=0;i<rows.length;i++)for(let j=i+1;j<rows.length&&rows[j].run===rows[i].run;j++) {
      if(Math.abs(rows[j].type-rows[i].type)<=1&&rows[j].from<=rows[i].to&&rows[i].from<=rows[j].to)
        return incomplete('Same-time overlapping runs have an unknown processing order. Supply verified distinct creation times or review manually.');
    }
    const gaps=[],pending=[],repeated=[],insufficient=[];
    const byType=Array.from({length:count},(_,type)=>rows.filter(b=>b.type===type));
    // Merge ALL supplied ranges: a later catch-up batch may fill an apparent hole.
    for(let type=0;type<count;type++) {
      const ranges=[...byType[type]].sort((a,b)=>a.from-b.from||a.to-b.to);
      if(ranges.length<2)insufficient.push(type);
      if(!ranges.length)continue;
      let coveredTo=ranges[0].to;
      for(const b of ranges.slice(1)) {
        if(b.from>coveredTo+1)gaps.push({kind:'coverage',type,from:coveredTo+1,to:b.from-1});
        coveredTo=Math.max(coveredTo,b.to);
      }
    }
    // Every non-final batch supplies a hypothetical cohort to the next stage.
    // Trace from that batch's creation time, so a downstream run that happened
    // earlier cannot count as a pickup. Input records/counts are not required.
    for(const seed of rows.filter(b=>b.type<count-1)) {
      const later=rows.filter(b=>b.run>seed.run);
      const points=new Set([seed.from,seed.to+1]);
      for(const b of later) {
        if(b.from>seed.from&&b.from<=seed.to)points.add(b.from);
        if(b.to+1>seed.from&&b.to+1<=seed.to)points.add(b.to+1);
      }
      const sorted=[...points].sort((a,b)=>a-b);
      for(let i=0;i<sorted.length-1;i++) {
        const from=sorted[i],to=sorted[i+1]-1;
        let stage=seed.type+1,entered=seed.run,finished=false,duplicate=false;
        for(const b of later) {
          if(b.type!==stage||from<b.from||from>b.to)continue;
          if(finished){duplicate=true;continue;}
          if(stage===count-1)finished=true;
          else {stage++;entered=b.run;}
        }
        const entry={kind:'progression',initial:seed.type,run:seed.run,type:stage,from,to};
        if(duplicate)repeated.push(entry);
        if(finished)continue; // Normal: final type is retained, no next reminder.
        // If no remaining run has moved past these dates, the preview may merely
        // end before the reminder is due. Do not call the horizon boundary a gap.
        const passed=later.some(b=>b.type===stage&&b.run>entered&&b.from>to);
        (passed?gaps:pending).push(entry);
      }
    }
    const messages=[`Window: ${input.start.replace('T',' ')} to ${input.end.replace('T',' ')} (practice local time).`,
      'Checked inclusive recall-date coverage between the earliest and latest supplied ranges for each type, and progression after each non-final batch. No patient search or count is required.'];
    for(let type=0;type<count;type++) {
      const ranges=byType[type];
      if(ranges.length)messages.push(`Preview scope — ${input.types[type].name}: ${date(Math.min(...ranges.map(b=>b.from)))} to ${date(Math.max(...ranges.map(b=>b.to)))}; ${ranges.length} runs.`);
    }
    for(const g of gaps)messages.push(g.kind==='coverage'
      ?`Potential coverage gap — ${input.types[g.type].name}: recall dates ${date(g.from)} to ${date(g.to)} are not included in any supplied run between that type's preview ranges.`
      :`Potential progression gap — after ${input.types[g.initial].name} at ${new Date(g.run*60000).toISOString().slice(0,16).replace('T',' ')}, recall dates ${date(g.from)} to ${date(g.to)} stop at ${input.types[g.type].name}; later runs move past these dates without picking them up.`);
    if(insufficient.length)messages.push(`Add at least two runs for each type to check between-run coverage. Insufficient preview: ${insufficient.map(i=>input.types[i].name).join(', ')}.`);
    if(pending.length)messages.push(`${pending.length} hypothetical progression segments extend beyond what this preview can establish. They are not classified as gaps; extend the preview to check their later reminders.`);
    if(repeated.length)messages.push('Review required: some hypothetical patients can receive the final reminder more than once within this preview.');
    messages.push('Final-reminder rule: receiving the final reminder completes the simulated sequence even though the type stays unchanged. Dates before the first supplied final-type range are not flagged as gaps. A hole inside the final-type preview applies only to hypothetical patients still awaiting that reminder, not patients who already received it.');
    messages.push('This is a bounded preview check, not proof of historical or perpetual coverage. Dates outside the supplied ranges, existing stranded patients outside those ranges, eligibility, treatment resets and actual patient counts are not established. A later catch-up run outside the preview may resolve a flagged gap.');
    const state=gaps.length?'gap':insufficient.length||repeated.length?'incomplete':'clear';
    const scripts=gaps.length?true:state==='clear'?false:null;
    messages.push(scripts===true?'Scripts required: a potential current-setup gap was detected, regardless of patient counts. Review corrective ranges and the schedule before running scripts; an ongoing schedule gap also needs correction. Do not re-enrol completed final reminders.':scripts===false?'No gap-driven scripts identified within the checked preview. This does not cancel scripts needed for other work.':'Script requirement unresolved — complete the preview or review the outstanding cases.');
    return {state,scripts,gaps,pending,messages,title:state==='gap'?'Current setup — potential gap: scripts required':state==='clear'?'Current setup — no gaps detected within the checked preview':'Current setup — further review needed'};
  }
  window.AutoChefCurrentCoverageEngine={assess};
})();

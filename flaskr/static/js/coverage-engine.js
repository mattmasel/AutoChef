/* Pure finite-window comparison. Dates are calendar days; times are local wall
   times from the same practice. No patient records or SQL are accessed. */
(() => {
  'use strict';
  const DAY = 86400000;
  function day(value) {
    const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value || '');
    if (!m) return NaN;
    const n = Date.UTC(+m[1], +m[2]-1, +m[3]);
    return new Date(n).toISOString().slice(0,10) === value && +m[1] >= 1900 && +m[1] <= 3000 ? n / DAY : NaN;
  }
  function time(value) {
    const m = /^(\d{4}-\d{2}-\d{2})T(\d{2}):(\d{2})$/.exec(value || '');
    return m && +m[2] < 24 && +m[3] < 60 ? day(m[1])*1440 + +m[2]*60 + +m[3] : NaN;
  }
  const date = n => new Date(n*DAY).toISOString().slice(0,10).split('-').reverse().join('/');
  function assess(input) {
    const incomplete = message => ({state:'incomplete', title:'Assessment incomplete', messages:[message], gaps:[]});
    const start = time(input.start), end = time(input.end);
    if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) return incomplete('Enter a changeover time and a later assessment end time.');
    if (!input.confirmed) return incomplete('Confirm that all batches within the assessment window are supplied, and the current and requested types correspond in the same order.');
    const count = input.types.length;
    if (!count || count !== input.requestedCount) return incomplete('Automatic comparison requires the same number and order of reminder stages. Added, removed or reordered stages require manual review and a documented script decision.');
    if (count > 50 || input.batches.length > 1000) return incomplete('This assessment is too large. Use at most 50 types and 1,000 batch rows.');
    const scopes = input.types.map(t => ({...t, from:day(t.from), to:day(t.to)}));
    if (scopes.some(t => !t.name.trim() || !Number.isFinite(t.from) || !Number.isFinite(t.to) || t.from > t.to)) return incomplete('Enter a type name and valid inclusive recall-date scope for every current type. These scopes describe patients remaining on each type at changeover.');
    const batches = [];
    for (const b of input.batches) {
      const run = time(b.run), from = day(b.from), to = day(b.to);
      if (!['old','new'].includes(b.side) || !Number.isInteger(b.type) || b.type < 0 || b.type >= count || !Number.isFinite(run) || !Number.isFinite(from) || !Number.isFinite(to) || from > to) return incomplete('Complete every batch row with a valid type, run time and inclusive From/To dates, or remove unused rows.');
      if (run < start || run > end) return incomplete('Every comparison batch must fall between changeover and assessment end (inclusive). Use the old upcoming preview as the unchanged baseline, not batches already sent.');
      batches.push({...b,run,from,to});
    }
    if (!batches.some(b=>b.side==='old') || !batches.some(b=>b.side==='new')) return incomplete('Supply the old and new upcoming batch coverage.');
    const old = batches.filter(b=>b.side==='old').sort((a,b)=>a.run-b.run);
    const fresh = batches.filter(b=>b.side==='new').sort((a,b)=>a.run-b.run);
    // Same-time progression depends on database job order, which is not supplied.
    for (const rows of [old,fresh]) {
      for (let i=0;i<rows.length;i++) for (let j=i+1;j<rows.length && rows[j].run===rows[i].run;j++) {
        if (Math.abs(rows[j].type-rows[i].type)<=1 && rows[j].from<=rows[i].to && rows[i].from<=rows[j].to) return incomplete('Overlapping batches on the same or adjacent stages run at the same time. Their processing order is unknown; review this case manually or supply verified distinct creation times.');
      }
    }
    function trace(rows, initial, recall) {
      let stage=initial, finalSent=false, duplicate=false;
      for (const b of rows) {
        if (b.type!==stage || recall<b.from || recall>b.to) continue;
        if (stage===count-1) { if(finalSent) duplicate=true; finalSent=true; }
        else stage++;
      }
      return {progress:stage+(finalSent ? 1 : 0), duplicate};
    }
    const gaps=[]; let due=0, duplicates=0;
    scopes.forEach((scope,initial) => {
      // Behaviour changes only at coverage boundaries: no day-by-day expansion.
      const points=new Set([scope.from,scope.to+1]);
      batches.forEach(b=>{if(b.from>scope.from && b.from<=scope.to) points.add(b.from); if(b.to+1>scope.from && b.to+1<=scope.to) points.add(b.to+1);});
      const sorted=[...points].sort((a,b)=>a-b);
      for(let i=0;i<sorted.length-1;i++) {
        const from=sorted[i],to=sorted[i+1]-1;
        const was=trace(old,initial,from), now=trace(fresh,initial,from);
        if(was.progress>initial) due++;
        if(now.duplicate) duplicates++;
        if(now.progress<was.progress) {
          const stalled=Math.min(now.progress,count-1), previous=gaps.at(-1);
          if(previous && previous.initial===initial && previous.stalled===stalled && previous.to+1===from) previous.to=to;
          else gaps.push({initial,stalled,from,to});
        }
      }
    });
    const messages=[`Window: ${input.start.replace('T',' ')} to ${input.end.replace('T',' ')} (practice local time).`,
      'Patients are modelled on their current type at changeover, with an unchanged recall date and no intervening treatment. Batches advance them immediately. Final-type patients are not advanced further.',
      'Comparison is against the old upcoming schedule within this window, not a guarantee of future coverage. Later pickup may resolve a flagged delay. Existing gaps shared by both schedules, dates outside the supplied scopes, patient eligibility and actual patient counts are not established.'];
    scopes.forEach(t=>messages.push(`Assessed scope — ${t.name}: ${date(t.from)} to ${date(t.to)} (inclusive).`));
    if(!due) return incomplete('No old-schedule reminders fall within the supplied patient scopes and window. Extend or correct the assessment; there is no meaningful baseline to compare.');
    if(duplicates) messages.push('Warning: the new preview can capture a final-type patient more than once. Review overlapping final-stage coverage before approving the change.');
    return {state:duplicates?'incomplete':gaps.length?'gap':'clear', title:duplicates?'Assessment incomplete — repeated final reminder possible':gaps.length?'Potential missed or delayed reminders':'No additional coverage gaps found within the assessed scope', messages,gaps};
  }
  window.AutoChefCoverageEngine={assess,day,time,date};
})();

/* Calendar-only calculations: UTC is used as a date container, never a timezone conversion. */
(() => {
  'use strict';
  const D=86400000,{day,date}=window.AutoChefCoverageEngine;
  const iso=n=>new Date(n*D).toISOString().slice(0,10);
  const month=(n,offset=0)=>{const d=new Date(n*D);return Date.UTC(d.getUTCFullYear(),d.getUTCMonth()+offset,1)/D;};
  const monday=n=>n-(new Date(n*D).getUTCDay()+6)%7;
  const weekdays=['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
  const months=['January','February','March','April','May','June','July','August','September','October','November','December'];
  const fail=message=>{throw new Error(message);};
  function integer(v){const n=Number(v);if(!/^\d+$/.test(String(v))||!Number.isSafeInteger(n)||n<1)fail('Enter positive whole numbers for intervals and conditions.');return n;}
  function period(run,unit,offset){
    if(unit==='day(s)')return [run+offset,run+offset];
    if(unit==='week(s)')return [monday(run)+offset*7,monday(run)+offset*7+6];
    if(unit==='month(s)')return [month(run,offset),month(run,offset+1)-1];
    fail('Unknown recall unit.');
  }
  // Shift from the ORIGINAL run date, clamping a missing day to month-end.
  // Apply D4W's inclusive endpoint adjustment only after the calendar shift.
  function offset(run,unit,amount){
    if(unit==='week(s)')return run+amount*7;
    if(unit==='month(s)')return Math.min(month(run,amount)+new Date(run*D).getUTCDate()-1,month(run,amount+1)-1);
    fail('Unknown offset unit.');
  }
  function range(rule,run){
    if(rule.mode==='Simple') {
      const simple={Today:['day(s)',0],Tomorrow:['day(s)',1],'Next Week':['week(s)',1],'Next Month':['month(s)',1],'This Month':['month(s)',0],'Last Month':['month(s)',-1],'The Month 3 Months ago':['month(s)',-3],'The Month 6 Months ago':['month(s)',-6],'The Month 12 Months ago':['month(s)',-12]};
      if(rule.period==='Next Quarter') {const d=new Date(run*D),q=Math.floor(d.getUTCMonth()/3)*3+3;return [Date.UTC(d.getUTCFullYear(),q,1)/D,Date.UTC(d.getUTCFullYear(),q+3,1)/D-1];}
      const p=simple[rule.period];if(!p)fail('Unknown Simple recall period.');return period(run,...p);
    }
    if(rule.mode!=='Advanced')fail('Select Simple or Advanced recall selection.');
    let from=-Infinity,to=Infinity;
    for(const c of rule.conditions) {
      const amount=integer(c.amount);if(amount>12000)fail('This condition is beyond the automatic calculation limit; review it manually.');
      if(!['past','future'].includes(c.direction))fail('Select past or future.');
      const sign=c.direction==='past'?-1:1,[a,b]=period(run,c.unit,sign*amount);
      let lo=-Infinity,hi=Infinity;
      if(c.comparison==='is'){lo=a;hi=b;}
      else if(['more than','less than'].includes(c.comparison)&&c.unit!=='day(s)') {
        const cutoff=offset(run,c.unit,sign*amount);
        // D4W examples: past >1 AND <3 spans offset(-3)-1 .. offset(-1)-1;
        // future >1 AND <3 spans offset(+1) .. offset(+3)-1, inclusive.
        if(c.comparison==='more than'){if(sign<0)hi=cutoff-1;else lo=cutoff;}
        else if(sign<0){lo=cutoff-1;hi=run-1;}else{lo=run+1;hi=cutoff-1;}
      }
      else if(c.comparison==='more than') {if(sign<0)hi=a-1;else lo=b+1;}
      else if(c.comparison==='less than') {if(sign<0){lo=b+1;hi=run-1;}else{lo=run+1;hi=a-1;}}
      else fail('Unknown Advanced comparison.');
      from=Math.max(from,lo);to=Math.min(to,hi);
    }
    if(!Number.isFinite(from)||!Number.isFinite(to))fail('An open-ended Advanced range needs manual review; add a bounded AND condition if it matches D4W.');
    if(from>to)fail('These Advanced conditions have no overlapping dates.');
    return [from,to];
  }
  function matches(schedule,n,anchor){
    const d=new Date(n*D),kind=schedule.kind;
    if(kind==='One time')return n===anchor;
    if(kind==='Daily')return (n-anchor)%integer(schedule.interval)===0;
    if(kind==='Weekly') {
      const interval=integer(schedule.interval);
      if(!schedule.weekdays.length)fail('Select at least one weekday.');
      return ((monday(n)-monday(anchor))/7)%interval===0&&schedule.weekdays.includes(weekdays[d.getUTCDay()]);
    }
    if(kind==='Monthly') {
      if(!schedule.months.length)fail('Select at least one month.');
      if(!schedule.months.includes(months[d.getUTCMonth()]))return false;
      if(schedule.monthlyMode==='numbers') {
        if(!schedule.monthdays.length)fail('Select at least one monthly day.');
        return schedule.monthdays.includes(String(d.getUTCDate()))||(schedule.monthdays.includes('Last')&&n===month(n,1)-1);
      }
      if(schedule.monthlyMode!=='on'||!schedule.ordinals.length||!schedule.weekdays.length)fail('Complete the monthly weekday pattern.');
      const ordinal=['First','Second','Third','Fourth','Fifth'][Math.floor((d.getUTCDate()-1)/7)];
      return schedule.weekdays.includes(weekdays[d.getUTCDay()])&&(schedule.ordinals.includes(ordinal)||(schedule.ordinals.includes('Last')&&n+7>=month(n,1)));
    }
    fail('Unknown schedule.');
  }
  function prepare(type){
    if(!type.name.trim())fail('Name each recall type.');
    const anchor=day(type.next),from=day(type.from),to=day(type.to);
    if(!Number.isFinite(anchor)||!Number.isFinite(from)||!Number.isFinite(to)||from>to)fail(`${type.name}: enter the next batch date and valid Recall From/To dates.`);
    if(!/^([01]\d|2[0-3]):[0-5]\d$/.test(type.time||''))fail(`${type.name}: enter a valid batch time.`);
    if(!matches(type.schedule,anchor,anchor))fail(`${type.name}: the next batch date does not match its schedule.`);
    const expected=range(type.rule,anchor);
    if(expected[0]!==from||expected[1]!==to)fail(`${type.name}: calculated next range ${date(expected[0])}–${date(expected[1])} does not match the D4W range entered. Check the condition or use manual review; later ranges have not been guessed.`);
    return {...type,anchor};
  }
  function build(groups){
    const prepared=groups.map(g=>{if(!g.length||g.length>50)fail('Use 1–50 types per setup.');return g.map(prepare);});
    const all=prepared.flat(),first=Math.min(...all.map(t=>t.anchor)),latest=Math.max(...all.map(t=>t.anchor));
    // One calendar year of starting cohorts, plus time for long recall offsets
    // and sparse schedules to play out. Every result remains explicitly bounded.
    let tail=0;
    for(const t of all){const [a,b]=range(t.rule,t.anchor);const cycle=t.schedule.kind==='Monthly'?366:t.schedule.kind==='Weekly'?integer(t.schedule.interval)*7:t.schedule.kind==='Daily'?integer(t.schedule.interval):0;tail=Math.max(tail,Math.abs(a-t.anchor)+Math.abs(b-t.anchor)+cycle*2);}
    const cohortEnd=latest+366,end=cohortEnd+tail;
    if(end-first>366*6||end>day('2998-12-31'))fail('This setup needs a longer preview than the automatic limit. Manual review is required.');
    const generated=prepared.map(types=>{
      const batches=[];
      types.forEach((t,type)=>{
        for(let n=t.anchor;n<=end;n++)if(matches(t.schedule,n,t.anchor)){
          const [from,to]=range(t.rule,n);
          if(from<day('1900-01-01')||to>day('3000-12-31'))fail('Generated recall dates are outside the supported date range.');
          batches.push({type,run:`${iso(n)}T${t.time}`,from:iso(from),to:iso(to)});
          if(batches.length>2000)fail('This setup exceeds 2,000 generated batches. Manual review is required.');
        }
      });
      return {types,batches};
    });
    return {start:`${iso(first)}T00:00`,end:`${iso(end)}T23:59`,cohortEnd:iso(cohortEnd),groups:generated,
      messages:[`Automatically checked ${date(first)} to ${date(end)}. Starting cohorts are drawn from the first year; later runs allow reminders to progress.`,
        'Generated ranges match the entered next D4W batch for each type. Calendar weeks run Monday–Sunday and months use their actual calendar boundaries. This check is bounded, not proof of perpetual or historical coverage.',
        'Advanced IS uses whole calendar weeks/months. More/less-than weeks use seven-day offsets; months shift from the send date and clamp to month-end, with D4W endpoint adjustments. Open-ended ranges still require manual review. Verify the calculated preview before relying on a clear result.']};
  }
  function read(data,collection,count,seeds){
    return Array.from({length:count},(_,i)=>{
      const prefix=`${collection}[${i}]`,v=k=>String(data.get(`${prefix}[${k}]`)||''),list=k=>data.getAll(`${prefix}[${k}]`);
      const kind=v('schedule'),mode=v('mode');
      return {...seeds[i],name:v('name'),schedule:{kind,interval:v(kind==='Weekly'?'weekly_interval':'daily_interval'),months:list('months'),monthlyMode:v('monthly_mode'),monthdays:list('monthdays'),ordinals:list('ordinals'),weekdays:list(kind==='Monthly'?'monthly_weekdays':'weekdays')},
        rule:{mode,period:v('period'),conditions:(data.has(`${prefix}[and]`)?['first','second']:['first']).map(row=>({amount:v(`${row}][amount`),unit:v(`${row}][unit`),comparison:v(`${row}][comparison`),direction:v(`${row}][direction`)}))}};
    });
  }
  window.AutoChefPreviewEngine={build,read,range,matches,iso};
})();

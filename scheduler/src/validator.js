const HARD = Object.freeze({
  EMPLOYEE_INACTIVE: 'EMPLOYEE_INACTIVE', STORE_NOT_ALLOWED: 'STORE_NOT_ALLOWED', NOT_AVAILABLE: 'NOT_AVAILABLE',
  UNAVAILABLE_OVERLAP: 'UNAVAILABLE_OVERLAP', EMPLOYEE_ASSIGNMENT_OVERLAP: 'EMPLOYEE_ASSIGNMENT_OVERLAP',
  DAILY_HOURS_LIMIT: 'DAILY_HOURS_LIMIT', WEEKLY_HOURS_LIMIT: 'WEEKLY_HOURS_LIMIT', MIN_REST_NOT_MET: 'MIN_REST_NOT_MET',
  SKILL_NOT_QUALIFIED: 'SKILL_NOT_QUALIFIED', MENTOR_REQUIRED: 'MENTOR_REQUIRED',
  MINIMUM_COVERAGE_SHORTAGE: 'MINIMUM_COVERAGE_SHORTAGE', MAXIMUM_COVERAGE_EXCEEDED: 'MAXIMUM_COVERAGE_EXCEEDED',
});
const SOFT = Object.freeze({ TARGET_NOT_MET: 'TARGET_NOT_MET', PREFERRED_STORE_NOT_USED: 'PREFERRED_STORE_NOT_USED', PREFERRED_WINDOW_NOT_USED: 'PREFERRED_WINDOW_NOT_USED' });
const arr = v => Array.isArray(v) ? v : [];
const str = v => String(v ?? '').trim();
const date = v => { const s = str(v).slice(0, 10); if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) throw new Error(`INVALID_DATE:${v}`); return s; };
const min = v => { if (typeof v === 'number') return v; const m = /^(\d{1,2}):(\d{2})$/.exec(str(v)); if (!m) throw new Error(`INVALID_TIME:${v}`); return Number(m[1]) * 60 + Number(m[2]); };
const overlap = (a,b,c,d) => a < d && c < b;
const contain = (a,b,c,d) => a <= c && d <= b;
const hrs = (a,b) => (b-a)/60;
function ctx(input){ return {
  profiles:new Map(arr(input.profiles).map(p=>[str(p.id),p])), stores:new Map(arr(input.stores).map(s=>[str(s.id),s])),
  grades:new Map(arr(input.employee_grades).map(g=>[str(g.user_id),g])), constraints:new Map(arr(input.employee_constraints).map(c=>[str(c.user_id),c])),
  availability:arr(input.employee_availability).map(a=>({...a,user_id:str(a.user_id),work_date:date(a.work_date),start:min(a.start_time),end:min(a.end_time),type:str(a.availability_type||'AVAILABLE').toUpperCase()})),
  skills:arr(input.employee_skills).map(s=>({...s,user_id:str(s.user_id),skill_code:str(s.skill_code),level:Number(s.level??0),status:str(s.status||'ACTIVE').toUpperCase(),can_mentor:Boolean(s.can_mentor)})),
  requirements:arr(input.staffing_requirements).map(r=>({...r,id:str(r.id),store_id:str(r.store_id),work_date:date(r.work_date),start:min(r.start_time),end:min(r.end_time),skill_code:r.skill_code?str(r.skill_code):null,min_skill_level:Number(r.min_skill_level??0),minimum_headcount:Number(r.minimum_headcount??0),target_headcount:Number(r.target_headcount??0),maximum_headcount:Number(r.maximum_headcount??0)})),
  official:arr(input.work_schedules).map(s=>({...s,user_id:str(s.user_id),work_date:date(s.work_date),start:min(s.start_time),end:min(s.end_time),status:str(s.status||'APPROVED').toUpperCase()}))
}; }
function emp(c,id){ const p=c.profiles.get(id), x=c.constraints.get(id); return p&&x?{...x,profile:p,user_id:id,allowed_store_ids:arr(x.allowed_store_ids).map(str)}:null; }
function allowed(e,s){ if(!s||str(s.status).toUpperCase()!=='ACTIVE')return false; if(e.allowed_store_ids.length)return e.allowed_store_ids.includes(str(s.id)); const t=str(e.profile.access_scope).toUpperCase().split(/[;,\s]+/).filter(Boolean); return t.includes('ALL')||t.includes(str(s.code).toUpperCase()); }
function skill(c,id,code){ return c.skills.find(s=>s.user_id===id&&s.skill_code===code&&s.status==='ACTIVE')||null; }
function availabilityOk(c,e,a){ const rows=c.availability.filter(x=>x.user_id===e.user_id&&x.work_date===a.work_date); if(rows.some(x=>x.type==='UNAVAILABLE'&&overlap(a.start,a.end,x.start,x.end)))return HARD.UNAVAILABLE_OVERLAP; if(!rows.some(x=>(x.type==='AVAILABLE'||x.type==='PREFERRED')&&contain(x.start,x.end,a.start,a.end)))return HARD.NOT_AVAILABLE; return null; }
function coverage(c,r,as){ const p=new Set([r.start,r.end]); as.filter(a=>a.work_date===r.work_date&&a.store_id===r.store_id&&overlap(a.start,a.end,r.start,r.end)).forEach(a=>{p.add(Math.max(a.start,r.start));p.add(Math.min(a.end,r.end));}); const q=[...p].sort((a,b)=>a-b), out=[]; for(let i=0;i<q.length-1;i++){const s=q[i],e=q[i+1], active=as.filter(a=>a.work_date===r.work_date&&a.store_id===r.store_id&&overlap(a.start,a.end,s,e)), ids=[...new Set(active.map(a=>a.user_id))]; const n=r.skill_code?ids.filter(id=>{const x=skill(c,id,r.skill_code);return x&&x.level>=r.min_skill_level}).length:ids.length; out.push({start:s,end:e,count:n});} return out; }
function validate(input,draft){ const c=ctx(input), as=arr(draft?.assignments), violations=[], warnings=[], seen=new Set();
  const norm=as.map(a=>({...a,user_id:str(a.user_id),store_id:str(a.store_id),work_date:date(a.work_date),start:min(a.start_time??a.start),end:min(a.end_time??a.end)}));
  norm.forEach(a=>{
    if(a.end<=a.start){violations.push({code:'INVALID_INTERVAL',assignment_key:a.assignment_key});return;}
    if(seen.has(a.assignment_key))violations.push({code:'DUPLICATE_ASSIGNMENT',assignment_key:a.assignment_key}); seen.add(a.assignment_key);
    const e=emp(c,a.user_id); if(!e||str(e.profile.status).toUpperCase()!=='ACTIVE'){violations.push({code:HARD.EMPLOYEE_INACTIVE,assignment_key:a.assignment_key});return;}
    if(!allowed(e,c.stores.get(a.store_id)))violations.push({code:HARD.STORE_NOT_ALLOWED,assignment_key:a.assignment_key});
    const av=availabilityOk(c,e,a); if(av)violations.push({code:av,assignment_key:a.assignment_key});
    if(c.official.some(s=>s.user_id===a.user_id&&['APPROVED','PENDING'].includes(s.status)&&s.work_date===a.work_date&&overlap(s.start,s.end,a.start,a.end)))violations.push({code:HARD.EMPLOYEE_ASSIGNMENT_OVERLAP,assignment_key:a.assignment_key,source:'OFFICIAL'});
  });
  for(const a of norm){ const e=emp(c,a.user_id); if(!e)continue; const others=norm.filter(x=>x!==a&&x.user_id===a.user_id&&x.work_date===a.work_date); if(others.some(x=>overlap(x.start,x.end,a.start,a.end)))violations.push({code:HARD.EMPLOYEE_ASSIGNMENT_OVERLAP,assignment_key:a.assignment_key,source:'DRAFT'}); const daily=others.reduce((s,x)=>s+hrs(x.start,x.end),0)+hrs(a.start,a.end); if(e.max_daily_hours>0&&daily>Number(e.max_daily_hours)+1e-9)violations.push({code:HARD.DAILY_HOURS_LIMIT,assignment_key:a.assignment_key}); const weekly=norm.filter(x=>x.user_id===a.user_id).reduce((s,x)=>s+hrs(x.start,x.end),0); if(e.max_weekly_hours>0&&weekly>Number(e.max_weekly_hours)+1e-9)violations.push({code:HARD.WEEKLY_HOURS_LIMIT,assignment_key:a.assignment_key}); if(Number(e.min_rest_hours)>0&&others.some(x=>{const gap=x.end<=a.start?a.start-x.end:x.start-a.end;return !overlap(x.start,x.end,a.start,a.end)&&gap<Number(e.min_rest_hours)*60;}))violations.push({code:HARD.MIN_REST_NOT_MET,assignment_key:a.assignment_key}); if(a.skill_code){const s=skill(c,a.user_id,a.skill_code); if(!s||s.level<Number(a.skill_level??0))violations.push({code:HARD.SKILL_NOT_QUALIFIED,assignment_key:a.assignment_key});} }
  for(const r of c.requirements){const slices=coverage(c,r,norm);if(!slices.length||slices.some(x=>x.count<r.minimum_headcount))violations.push({code:HARD.MINIMUM_COVERAGE_SHORTAGE,requirement_id:r.id});if(slices.some(x=>x.count>r.maximum_headcount))violations.push({code:HARD.MAXIMUM_COVERAGE_EXCEEDED,requirement_id:r.id});if(slices.length&&slices.some(x=>x.count<r.target_headcount))warnings.push({code:SOFT.TARGET_NOT_MET,requirement_id:r.id});}
  for(const a of norm){const e=emp(c,a.user_id);if(!e?.mentor_required)continue; if(!a.skill_code){violations.push({code:HARD.MENTOR_REQUIRED,assignment_key:a.assignment_key});continue;} const mentor=norm.some(m=>m!==a&&m.store_id===a.store_id&&m.work_date===a.work_date&&overlap(m.start,m.end,a.start,a.end)&&(()=>{const s=skill(c,m.user_id,a.skill_code);return s&&s.level>=Number(a.skill_level??0)&&s.can_mentor;})()); if(!mentor)violations.push({code:HARD.MENTOR_REQUIRED,assignment_key:a.assignment_key});}
  return {valid:violations.length===0,rule_version:draft?.rule_version||'RULE_V1',timezone:draft?.timezone||'Asia/Ho_Chi_Minh',violations,warnings,counts:{assignments:norm.length,violations:violations.length,warnings:warnings.length}};
}
module.exports={HARD,SOFT,validate};

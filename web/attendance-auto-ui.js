/* MAGASIN — Employee V40 attendance helper.
 * Keeps the current V40 UI and connects both manual and automatic attendance.
 * Automatic attendance: current + previous salary period, capped at real time in Asia/Ho_Chi_Minh.
 */
(function(window, document){
  'use strict';

  const SUPABASE_URL='https://menvbzlsncmpuvnaifxa.supabase.co';
  const SUPABASE_KEY='sb_publishable_HsvCS6HDZnCDInd9PUoh0g_V34wJVqx';
  const TZ='Asia/Ho_Chi_Minh';
  let client=null;
  let installed=false;
  let manualBound=false;

  function getClient(){
    if(client)return client;
    if(!window.supabase?.createClient)return null;
    client=window.supabase.createClient(SUPABASE_URL,SUPABASE_KEY,{auth:{autoRefreshToken:true,persistSession:true,detectSessionInUrl:true}});
    return client;
  }
  function pad(n){return String(n).padStart(2,'0');}
  function todayParts(){
    const parts=new Intl.DateTimeFormat('en-CA',{timeZone:TZ,year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(new Date());
    const out={}; parts.forEach(p=>out[p.type]=p.value);
    return {year:Number(out.year),month:Number(out.month),day:Number(out.day)};
  }
  function dateKey(y,m,d){return `${y}-${pad(m)}-${pad(d)}`;}
  function lastDay(y,m){return new Date(Date.UTC(y,m,0)).getUTCDate();}
  function formatDate(v){if(!v)return '';const p=String(v).split('-');return p.length===3?`${p[2]}/${p[1]}/${p[0]}`:String(v);}

  function salaryPeriods(){
    const t=todayParts();
    const monthStart=dateKey(t.year,t.month,1);
    if(t.day<=15){
      const d=new Date(Date.UTC(t.year,t.month-2,1));
      const py=d.getUTCFullYear(),pm=d.getUTCMonth()+1;
      return {currentStart:monthStart,currentEnd:dateKey(t.year,t.month,15),previousStart:dateKey(py,pm,16),previousEnd:dateKey(t.year,t.month,0),effectiveTo:dateKey(t.year,t.month,t.day)};
    }
    return {currentStart:dateKey(t.year,t.month,16),currentEnd:dateKey(t.year,t.month,lastDay(t.year,t.month)),previousStart:monthStart,previousEnd:dateKey(t.year,t.month,15),effectiveTo:dateKey(t.year,t.month,t.day)};
  }

  function findPanel(){return document.querySelector('#view-attendance .attendance-entry-grid .panel:first-child');}
  function statusBox(panel){
    let el=document.getElementById('attendanceAutoStatus');
    if(!el){el=document.createElement('div');el.id='attendanceAutoStatus';el.style.cssText='margin-top:10px;padding:10px 12px;border-radius:10px;background:#eef7ff;color:#235dba;border:1px solid #d9e8f7;font-size:12px;line-height:1.45;';panel.appendChild(el);}
    return el;
  }
  function fieldSet(panel){
    const dateInput=panel.querySelector('input[type="date"]');
    const selects=[...panel.querySelectorAll('select')];
    const store=selects.find(s=>[...s.options].some(o=>/^CN\d+/i.test(String(o.value||o.textContent||'').trim())))||selects[0]||null;
    const times=selects.filter(s=>s!==store);
    return {dateInput,store,start:times[0]||null,end:times[1]||null};
  }

  async function manualSubmit(){
    const panel=findPanel(); if(!panel)return;
    const fields=fieldSet(panel);
    const date=fields.dateInput?.value||'';
    const storeCode=fields.store?.value||fields.store?.selectedOptions?.[0]?.textContent?.trim()||'';
    const start=fields.start?.value||'';
    const end=fields.end?.value||'';
    const status=statusBox(panel);

    if(!date||!storeCode||!start||!end){status.textContent='Vui lòng nhập đủ ngày, cửa hàng, giờ vào và giờ ra.';status.style.color='#9d3f30';return;}
    if(end<=start){status.textContent='Giờ ra phải sau giờ vào.';status.style.color='#9d3f30';return;}

    const confirmed=window.confirm(`Hoàn thành chấm công?\n\nNgày: ${formatDate(date)}\nCửa hàng: ${storeCode}\nGiờ: ${start}–${end}\n\nHệ thống chỉ chấm theo ca APPROVED tương ứng và không cho chấm ca chưa kết thúc.`);
    if(!confirmed)return;

    const sb=getClient(); if(!sb){status.textContent='Không thể kết nối Supabase.';status.style.color='#9d3f30';return;}
    const btn=[...panel.querySelectorAll('button')].find(b=>b.textContent.trim()==='Hoàn thành chấm công');
    if(btn)btn.disabled=true;
    status.style.color='#235dba';status.textContent='Đang đối chiếu lịch chính thức…';
    try{
      const {data,error}=await sb.rpc('manual_attendance_from_schedule',{p_work_date:date,p_store_code:storeCode,p_check_in:start,p_check_out:end});
      if(error)throw error;
      status.textContent='Đã hoàn thành chấm công thành công.';
      await refreshHistory();
    }catch(err){
      const msg=String(err?.message||err);
      const friendly={
        APPROVED_SCHEDULE_NOT_FOUND:'Không tìm thấy ca APPROVED trùng với ngày, cửa hàng và giờ bạn nhập.',
        SCHEDULE_ALREADY_ATTENDED:'Ca này đã được chấm công trước đó, hệ thống không tạo trùng.',
        SHIFT_NOT_FINISHED:'Ca hôm nay chưa kết thúc nên chưa thể hoàn thành chấm công.',
        SCHEDULE_IN_FUTURE:'Không thể chấm công cho ngày tương lai.'
      };
      status.textContent=friendly[msg]||`Chấm công thất bại: ${msg}`;
      status.style.color='#9d3f30';
    }finally{if(btn)btn.disabled=false;}
  }

  function bindManual(){
    if(manualBound)return true;
    const panel=findPanel(); if(!panel)return false;
    const btn=[...panel.querySelectorAll('button')].find(b=>b.textContent.trim()==='Hoàn thành chấm công');
    if(!btn)return false;
    btn.onclick=manualSubmit;
    manualBound=true;
    return true;
  }

  async function runAuto(){
    const panel=findPanel(); if(!panel)return;
    const button=document.getElementById('attendanceAutoButton'); if(!button)return;
    const status=statusBox(panel); const p=salaryPeriods();
    const confirmed=window.confirm(
      `Tự động chấm công theo kỳ lương:\n`+
      `• Kỳ hiện tại: ${formatDate(p.currentStart)} – ${formatDate(p.currentEnd)}\n`+
      `• Kỳ trước: ${formatDate(p.previousStart)} – ${formatDate(p.previousEnd)}\n`+
      `• Dừng theo thời điểm thực tế tại Việt Nam: ${formatDate(p.effectiveTo)}\n\n`+
      `Chỉ chấm ca APPROVED đã kết thúc. Ca đã chấm sẽ bỏ qua. Không chấm ca tương lai.\n\nTiếp tục?`
    );
    if(!confirmed)return;
    const sb=getClient();if(!sb){status.textContent='Không thể kết nối Supabase.';status.style.color='#9d3f30';return;}
    button.disabled=true;status.textContent='Đang đối chiếu lịch chính thức…';status.style.color='#235dba';
    try{
      const {data,error}=await sb.rpc('auto_attendance_from_approved_schedules',{p_from_date:null,p_to_date:null});
      if(error)throw error;
      const rows=Array.isArray(data)?data:[];
      const added=rows.filter(r=>r.action==='AUTO_COMPLETED').length;
      const skipped=rows.filter(r=>r.action==='SKIPPED_ALREADY_ATTENDED').length;
      status.textContent=rows.length?`Đã tự động chấm ${added} ca; bỏ qua ${skipped} ca đã có chấm công.`:'Không có ca APPROVED đã kết thúc cần tự động chấm.';
      await refreshHistory();
    }catch(err){status.textContent=`Tự động chấm công thất bại: ${err?.message||err}`;status.style.color='#9d3f30';}
    finally{button.disabled=false;}
  }

  async function refreshHistory(){
    const t=document.getElementById('attendanceHistoryTable'); if(!t)return;
    const sb=getClient(); if(!sb)return;
    const from=document.getElementById('attendanceFrom')?.value||null;
    const to=document.getElementById('attendanceTo')?.value||null;
    const {data,error}=await sb.rpc('get_my_attendance_v2',{p_from_date:from,p_to_date:to});
    if(error)return;
    const rows=Array.isArray(data)?data:[];
    const body=t.querySelector('tbody'); if(!body)return;
    body.innerHTML=rows.map(r=>`<tr><td>${formatDate(r.work_date)}</td><td>${r.store_code||r.store_name||''}</td><td>${String(r.check_in_time||r.check_in||'').slice(0,5)}</td><td>${String(r.check_out_time||r.check_out||'').slice(0,5)}</td><td>${Number(r.hours_worked||0).toFixed(1)}</td><td>${Number(r.amount||0).toLocaleString('vi-VN')}đ</td></tr>`).join('');
  }

  function install(){
    const panel=findPanel();if(!panel)return false;
    const done=[...panel.querySelectorAll('button')].find(b=>b.textContent.trim()==='Hoàn thành chấm công');
    if(!done)return false;
    bindManual();
    if(!document.getElementById('attendanceAutoButton')){
      const auto=document.createElement('button');
      auto.type='button';auto.id='attendanceAutoButton';auto.className='btn secondary';auto.textContent='Tự động chấm công';auto.style.marginLeft='8px';
      auto.title='Tự động chấm kỳ lương hiện tại và kỳ trước; ca đã chấm được bỏ qua.';
      done.insertAdjacentElement('afterend',auto);
      auto.addEventListener('click',runAuto);
    }
    return true;
  }

  function boot(){
    install();
    new MutationObserver(()=>{install();}).observe(document.documentElement,{childList:true,subtree:true});
    [300,1000,2000].forEach(ms=>setTimeout(install,ms));
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})(window,document);

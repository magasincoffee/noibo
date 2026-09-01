/* MAGASIN — Employee V40 automatic attendance helper.
 * Salary periods: 1-15 and 16-end-of-month.
 * Auto attendance evaluates current + previous salary period,
 * capped by the real current time in Asia/Ho_Chi_Minh.
 */
(function(window, document){
  'use strict';

  const SUPABASE_URL='https://menvbzlsncmpuvnaifxa.supabase.co';
  const SUPABASE_KEY='sb_publishable_HsvCS6HDZnCDInd9PUoh0g_V34wJVqx';
  const TZ='Asia/Ho_Chi_Minh';
  let client=null;
  let installed=false;

  function getClient(){
    if(client)return client;
    if(!window.supabase?.createClient)return null;
    client=window.supabase.createClient(SUPABASE_URL,SUPABASE_KEY,{auth:{autoRefreshToken:true,persistSession:true,detectSessionInUrl:true}});
    return client;
  }

  function pad(n){return String(n).padStart(2,'0');}

  function todayParts(){
    const parts=new Intl.DateTimeFormat('en-CA',{timeZone:TZ,year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(new Date());
    const out={};
    parts.forEach(p=>out[p.type]=p.value);
    return {year:Number(out.year),month:Number(out.month),day:Number(out.day)};
  }

  function dateKey(year,month,day){return `${year}-${pad(month)}-${pad(day)}`;}

  function lastDayOfMonth(year,month){return new Date(Date.UTC(year,month,0)).getUTCDate();}

  function formatDate(v){
    if(!v)return '';
    const p=String(v).split('-');
    return p.length===3?`${p[2]}/${p[1]}/${p[0]}`:String(v);
  }

  function salaryPeriods(){
    const t=todayParts();
    const monthStart=dateKey(t.year,t.month,1);
    if(t.day<=15){
      const previousMonth=new Date(Date.UTC(t.year,t.month-2,1));
      const py=previousMonth.getUTCFullYear();
      const pm=previousMonth.getUTCMonth()+1;
      return {
        currentStart:monthStart,
        currentEnd:dateKey(t.year,t.month,15),
        previousStart:dateKey(py,pm,16),
        previousEnd:dateKey(t.year,t.month,0),
        effectiveTo:dateKey(t.year,t.month,t.day)
      };
    }
    return {
      currentStart:dateKey(t.year,t.month,16),
      currentEnd:dateKey(t.year,t.month,lastDayOfMonth(t.year,t.month)),
      previousStart:monthStart,
      previousEnd:dateKey(t.year,t.month,15),
      effectiveTo:dateKey(t.year,t.month,t.day)
    };
  }

  function ensureStatus(button){
    let el=document.getElementById('attendanceAutoStatus');
    if(!el){
      el=document.createElement('div');
      el.id='attendanceAutoStatus';
      el.style.cssText='margin-top:10px;padding:10px 12px;border-radius:10px;background:#eef7ff;color:#235dba;border:1px solid #d9e8f7;font-size:12px;line-height:1.45;';
      button.parentElement?.appendChild(el);
    }
    return el;
  }

  function install(){
    if(installed)return true;
    const panel=document.querySelector('#view-attendance .attendance-entry-grid .panel:first-child');
    if(!panel)return false;
    const doneButton=[...panel.querySelectorAll('button')].find(b=>b.textContent.trim()==='Hoàn thành chấm công');
    if(!doneButton)return false;
    if(document.getElementById('attendanceAutoButton')){installed=true;return true;}

    const autoButton=document.createElement('button');
    autoButton.type='button';
    autoButton.id='attendanceAutoButton';
    autoButton.className='btn secondary';
    autoButton.textContent='Tự động chấm công';
    autoButton.style.marginLeft='8px';
    autoButton.title='Tự động chấm kỳ lương hiện tại và kỳ trước; ca đã chấm được bỏ qua.';
    doneButton.insertAdjacentElement('afterend',autoButton);

    const note=document.createElement('div');
    note.className='muted';
    note.id='attendanceAutoHint';
    note.style.cssText='margin-top:9px;font-size:11px;line-height:1.45;';
    note.textContent='Tự động theo kỳ lương 1–15 hoặc 16–cuối tháng và kỳ trước; chỉ chấm ca đã kết thúc, ca đã chấm sẽ bỏ qua.';
    autoButton.insertAdjacentElement('afterend',note);

    autoButton.addEventListener('click',run);
    installed=true;
    return true;
  }

  async function run(){
    const button=document.getElementById('attendanceAutoButton');
    if(!button)return;

    const status=ensureStatus(button);
    const p=salaryPeriods();

    const confirmed=window.confirm(
      `Tự động chấm công theo kỳ lương:\n`+
      `• Kỳ hiện tại: ${formatDate(p.currentStart)} – ${formatDate(p.currentEnd)}\n`+
      `• Kỳ trước: ${formatDate(p.previousStart)} – ${formatDate(p.previousEnd)}\n`+
      `• Dừng ở thời điểm hiện tại: ${formatDate(p.effectiveTo)}\n\n`+
      `Hệ thống chỉ chấm các ca APPROVED đã kết thúc tại thời điểm bấm nút.\n`+
      `Ca đã có chấm công sẽ được bỏ qua và không tạo trùng.\n`+
      `Không thể chấm trước ca, kể cả ca cùng ngày chưa kết thúc.\n\n`+
      `Tiếp tục?`
    );
    if(!confirmed)return;

    const sb=getClient();
    if(!sb){
      status.textContent='Không thể khởi tạo kết nối Supabase.';
      status.style.color='#9d3f30';
      return;
    }

    button.disabled=true;
    status.style.color='#235dba';
    status.textContent='Đang đối chiếu kỳ hiện tại + kỳ trước và thời điểm thực tế…';

    try{
      const {data,error}=await sb.rpc('auto_attendance_from_approved_schedules',{
        p_from_date:null,
        p_to_date:null
      });
      if(error)throw error;

      const rows=Array.isArray(data)?data:[];
      const inserted=rows.filter(r=>r.action==='AUTO_COMPLETED').length;
      const skipped=rows.filter(r=>r.action==='SKIPPED_ALREADY_ATTENDED').length;

      if(!rows.length){
        status.textContent='Không có ca APPROVED đã kết thúc trong 2 kỳ lương để tự động chấm công.';
      }else{
        status.textContent=`Đã tự động chấm ${inserted} ca; bỏ qua ${skipped} ca đã có chấm công. Không chấm ca chưa kết thúc.`;
      }

      const reportButton=document.querySelector('#view-attendance .attendance-filter .btn.primary');
      if(reportButton)reportButton.click();
      else window.dispatchEvent(new CustomEvent('attendance:auto-completed',{detail:{rows,periods:p}}));
    }catch(err){
      status.textContent=`Tự động chấm công thất bại: ${err?.message||err}`;
      status.style.color='#9d3f30';
    }finally{
      button.disabled=false;
    }
  }

  function boot(){
    install();
    const observer=new MutationObserver(()=>install());
    observer.observe(document.documentElement,{childList:true,subtree:true});
    setTimeout(install,300);
    setTimeout(install,1000);
    setTimeout(install,2000);
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});
  else boot();
})(window,document);

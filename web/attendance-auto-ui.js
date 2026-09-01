/* MAGASIN — Employee V40 automatic attendance helper.
 * Uses only the authenticated employee's APPROVED schedules.
 * Does not alter the existing attendance form layout.
 */
(function(window, document){
  'use strict';

  const SUPABASE_URL='https://menvbzlsncmpuvnaifxa.supabase.co';
  const SUPABASE_KEY='sb_publishable_HsvCS6HDZnCDInd9PUoh0g_V34wJVqx';
  let client=null;
  let installed=false;

  function getClient(){
    if(client)return client;
    if(!window.supabase?.createClient)return null;
    client=window.supabase.createClient(SUPABASE_URL,SUPABASE_KEY,{auth:{autoRefreshToken:true,persistSession:true,detectSessionInUrl:true}});
    return client;
  }

  function reportRange(){
    return {
      from:document.getElementById('attendanceFrom')?.value||null,
      to:document.getElementById('attendanceTo')?.value||null
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

  function formatDate(v){
    if(!v)return '';
    const p=String(v).split('-');
    return p.length===3?`${p[2]}/${p[1]}/${p[0]}`:String(v);
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
    autoButton.title='Chấm các ca APPROVED đã kết thúc trong khoảng đang xem; ca đã chấm sẽ bỏ qua.';
    doneButton.insertAdjacentElement('afterend',autoButton);

    const note=document.createElement('div');
    note.className='muted';
    note.id='attendanceAutoHint';
    note.style.cssText='margin-top:9px;font-size:11px;line-height:1.45;';
    note.textContent='Tự động chấm theo lịch chính thức: chỉ chấm các ca đã kết thúc, ca đã chấm sẽ bỏ qua, không chấm ca tương lai.';
    autoButton.insertAdjacentElement('afterend',note);

    autoButton.addEventListener('click',run);
    installed=true;
    return true;
  }

  async function run(){
    const button=document.getElementById('attendanceAutoButton');
    const status=ensureStatus(button);
    const range=reportRange();
    const fromText=formatDate(range.from)||'đầu kỳ mặc định';
    const toText=formatDate(range.to)||'hôm nay';

    const confirmed=window.confirm(
      `Tự động chấm công theo lịch chính thức từ ${fromText} đến ${toText}.\n\n`+
      '• Chỉ chấm các ca APPROVED đã kết thúc.\n'+
      '• Ca đã có attendance sẽ được bỏ qua.\n'+
      '• Giờ vào/ra được lấy theo giờ ca chính thức.\n\nTiếp tục?'
    );
    if(!confirmed)return;

    const sb=getClient();
    if(!sb){status.textContent='Không thể khởi tạo kết nối Supabase.';status.style.color='#9d3f30';return;}

    button.disabled=true;
    status.style.color='#235dba';
    status.textContent='Đang đối chiếu lịch chính thức và tự động chấm công…';

    try{
      const {data,error}=await sb.rpc('auto_attendance_from_approved_schedules',{
        p_from_date:range.from,
        p_to_date:range.to
      });
      if(error)throw error;

      const rows=Array.isArray(data)?data:[];
      const inserted=rows.filter(r=>r.action==='AUTO_COMPLETED').length;
      const skipped=rows.filter(r=>r.action==='SKIPPED_ALREADY_ATTENDED').length;
      if(!rows.length){
        status.textContent='Không có ca APPROVED đã kết thúc trong khoảng thời gian này để tự động chấm công.';
      }else{
        status.textContent=`Đã tự động chấm ${inserted} ca; bỏ qua ${skipped} ca đã có chấm công.`;
      }

      const reportButton=document.querySelector('#view-attendance .attendance-filter .btn.primary');
      if(reportButton)reportButton.click();
      else window.dispatchEvent(new CustomEvent('attendance:auto-completed',{detail:{rows}}));
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

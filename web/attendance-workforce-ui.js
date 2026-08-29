/* MAGASIN — Employee Attendance V2 UI */
(function(window, document){
  'use strict';
  const sb=window.MAGASIN_SUPABASE;
  if(!sb)return;
  const $=id=>document.getElementById(id);
  const esc=v=>String(v??'').replace(/[&<>\"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;',"'":'&#39;'}[m]));
  let enabled=false;

  function styles(){
    if($('att-v2-styles'))return;
    const s=document.createElement('style');s.id='att-v2-styles';
    s.textContent=`.att-shell{display:grid;gap:16px}.att-toolbar{display:flex;justify-content:space-between;align-items:center;gap:12px;flex-wrap:wrap}.att-title{font-weight:800;font-size:18px}.att-muted{font-size:12px;color:#74839a}.att-list{display:grid;gap:10px;margin-top:14px}.att-card{padding:16px;border:1px solid #e0e7ef;border-radius:14px;background:#fff}.att-card-head{display:flex;justify-content:space-between;align-items:flex-start;gap:12px}.att-time{font-size:17px;font-weight:800}.att-store{font-size:12px;color:#63738b;margin-top:4px}.att-status{font-size:11px;font-weight:800;padding:5px 8px;border-radius:999px;background:#eef2f7;color:#607087;white-space:nowrap}.att-status.open{background:#fff3d6;color:#8a6500}.att-status.done{background:#e6f6ef;color:#287053}.att-actions{display:flex;gap:8px;flex-wrap:wrap;margin-top:14px}.att-btn{height:40px;padding:0 14px;border:1px solid #d7e0ea;border-radius:10px;background:#fff;color:#17243a;font-weight:800;cursor:pointer}.att-btn.primary{border:0;background:linear-gradient(90deg,#16c3c5,#10b7d5);color:#fff}.att-btn[disabled]{opacity:.55;cursor:not-allowed}.att-meta{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:8px;margin-top:12px}.att-meta>div{padding:10px;border:1px solid #edf1f5;border-radius:10px}.att-meta span{display:block;font-size:10px;color:#74839a}.att-meta strong{display:block;margin-top:3px;font-size:12px}.att-history{overflow:auto;margin-top:12px}.att-history table{width:100%;border-collapse:collapse;min-width:760px}.att-history th,.att-history td{padding:10px;border-bottom:1px solid #edf1f5;text-align:left;font-size:11px}.att-history th{background:#f8fafc}.att-error{padding:12px;border-radius:12px;background:#fff4f1;color:#9d3f30;border:1px solid #f2c8c0;font-size:12px}.att-empty{padding:20px;text-align:center;color:#95a3b7;border:1px dashed #d8e0ea;border-radius:12px}@media(max-width:760px){.att-meta{grid-template-columns:1fr 1fr}.att-card-head{flex-direction:column}.att-toolbar{align-items:flex-start}}`;document.head.appendChild(s);
  }

  function fmtTs(v){return v?new Intl.DateTimeFormat('vi-VN',{dateStyle:'short',timeStyle:'short',hour12:false}).format(new Date(v)):'';}
  function fmtTime(v){return v?String(v).slice(0,5):'—';}
  function statusLabel(a){
    if(a.attendance_status==='OPEN')return 'Đang làm';
    if(a.attendance_status==='COMPLETED')return 'Đã hoàn tất';
    return a.attendance_id?'Đã ghi nhận':'Chưa chấm';
  }
  function actionHtml(a){
    if(a.attendance_status==='OPEN')return `<button class="att-btn primary" data-clockout="${esc(a.attendance_id)}">Check-out</button>`;
    if(a.attendance_id)return '<button class="att-btn" disabled>Đã chấm công</button>';
    return `<button class="att-btn primary" data-clockin="${esc(a.schedule_id)}">Check-in</button>`;
  }
  function todayHtml(rows){
    if(!rows.length)return '<div class="att-empty">Hôm nay chưa có ca APPROVED.</div>';
    return rows.map(a=>`<article class="att-card"><div class="att-card-head"><div><div class="att-time">${fmtTime(a.start_time)} – ${fmtTime(a.end_time)}</div><div class="att-store">${esc(a.store_name||a.store_code||'Cửa hàng')}</div></div><span class="att-status ${a.attendance_status==='OPEN'?'open':a.attendance_status==='COMPLETED'?'done':''}">${statusLabel(a)}</span></div><div class="att-meta"><div><span>Check-in</span><strong>${fmtTs(a.check_in)||'—'}</strong></div><div><span>Check-out</span><strong>${fmtTs(a.check_out)||'—'}</strong></div><div><span>Trễ</span><strong>${a.late_minutes||0} phút</strong></div><div><span>Giờ công</span><strong>${a.hours_worked||0}</strong></div></div><div class="att-actions">${actionHtml(a)}</div></article>`).join('');
  }
  function historyHtml(rows){
    if(!rows.length)return '<div class="att-empty">Chưa có lịch sử chấm công.</div>';
    return `<div class="att-history"><table><thead><tr><th>Ngày</th><th>Cửa hàng</th><th>Lịch</th><th>Check-in</th><th>Check-out</th><th>Trễ</th><th>Sớm</th><th>Giờ công</th><th>Tiền</th></tr></thead><tbody>${rows.slice(0,31).map(a=>`<tr><td>${esc(a.work_date)}</td><td>${esc(a.store_name||a.store_code||'')}</td><td>${fmtTime(a.planned_start)}–${fmtTime(a.planned_end)}</td><td>${fmtTs(a.check_in)||'—'}</td><td>${fmtTs(a.check_out)||'—'}</td><td>${a.late_minutes||0}</td><td>${a.early_minutes||0}</td><td>${a.hours_worked||0}</td><td>${a.amount||0}</td></tr>`).join('')}</tbody></table></div>`;
  }
  function render(today,history){
    const box=$('content');if(!box)return;
    if($('pageTitle'))$('pageTitle').textContent='Chấm công';
    if($('pageDescription'))$('pageDescription').textContent='Chấm công theo lịch làm việc chính thức';
    document.querySelectorAll('[data-page]').forEach(b=>b.classList.toggle('active',b.dataset.page==='attendance'));
    box.innerHTML=`<div class="att-shell"><section class="card panel"><div class="att-toolbar"><div><div class="att-title">Ca hôm nay</div><div class="att-muted">Check-in/out chỉ áp dụng cho ca APPROVED của tài khoản đang đăng nhập.</div></div><button class="att-btn" id="att-refresh">Làm mới</button></div><div id="att-status" class="att-muted"></div><div class="att-list">${todayHtml(today)}</div></section><section class="card panel"><div class="att-title">Lịch sử chấm công</div><div class="att-muted">Dữ liệu gắn trực tiếp với schedule_id và snapshot planned time/rate.</div>${historyHtml(history)}</section></div>`;
    $('att-refresh').onclick=refresh;
    document.querySelectorAll('[data-clockin]').forEach(b=>b.onclick=()=>clockIn(b.dataset.clockin,b));
    document.querySelectorAll('[data-clockout]').forEach(b=>b.onclick=()=>clockOut(b.dataset.clockout,b));
  }
  function message(text,error=false){const x=$('att-status');if(x){x.textContent=text||'';x.style.color=error?'#9d3f30':'#2d6b55';}}
  async function load(){
    const [{data:t,error:te},{data:h,error:he}]=await Promise.all([
      sb.rpc('get_my_today_schedules'),
      sb.rpc('get_my_attendance_v2',{p_from_date:null,p_to_date:null})
    ]);
    if(te)throw te;if(he)throw he;
    return {today:Array.isArray(t)?t:[],history:Array.isArray(h)?h:[]};
  }
  async function refresh(){
    try{const d=await load();render(d.today,d.history);}catch(err){const box=$('content');if(box)box.innerHTML=`<section class="card panel"><h2>Chấm công</h2><div class="att-error">${esc(err.message||'Không thể tải dữ liệu chấm công.')}</div></section>`;}
  }
  async function clockIn(id,b){
    b.disabled=true;message('Đang ghi nhận check-in…');
    try{const {error}=await sb.rpc('clock_in_for_schedule',{p_schedule_id:id});if(error)throw error;await refresh();}
    catch(err){message(err.message||'Check-in thất bại.',true);b.disabled=false;}
  }
  async function clockOut(id,b){
    b.disabled=true;message('Đang ghi nhận check-out…');
    try{const {error}=await sb.rpc('clock_out_attendance',{p_attendance_id:id});if(error)throw error;await refresh();}
    catch(err){message(err.message||'Check-out thất bại.',true);b.disabled=false;}
  }
  function capture(e){
    if(!enabled)return;
    const b=e.target.closest('[data-page="attendance"]');
    if(!b)return;
    e.preventDefault();e.stopImmediatePropagation();refresh();
  }
  function init(){styles();enabled=true;document.addEventListener('click',capture,true);}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})(window,document);

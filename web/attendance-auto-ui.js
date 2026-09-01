/* MAGASIN Employee V40 — attendance bridge. */
(function(window,document){'use strict';
const U='https://menvbzlsncmpuvnaifxa.supabase.co';
const K='sb_publishable_HsvCS6HDZnCDInd9PUoh0g_V34wJVqx';
const TZ='Asia/Ho_Chi_Minh';
let client=null;
const sb=()=>client||(client=window.supabase?.createClient(U,K,{auth:{autoRefreshToken:true,persistSession:true,detectSessionInUrl:true}}));
const pad=n=>String(n).padStart(2,'0');
const fmt=v=>{const m=/^(\d{4})-(\d{2})-(\d{2})$/.exec(String(v||''));return m?`${m[3]}/${m[2]}/${m[1]}`:String(v||'')};
function vn(){const a=new Intl.DateTimeFormat('en-US',{timeZone:TZ,year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(new Date()),o={};a.forEach(x=>o[x.type]=x.value);return{y:+o.year,m:+o.month,d:+o.day}}
function periods(){const t=vn(),monthStart=`${t.y}-${pad(t.m)}-01`;if(t.d<=15){const pm=new Date(Date.UTC(t.y,t.m-2,1)),prevEnd=new Date(Date.UTC(t.y,t.m-1,0));return{currentFrom:monthStart,currentTo:`${t.y}-${pad(t.m)}-15`,previousFrom:`${pm.getUTCFullYear()}-${pad(pm.getUTCMonth()+1)}-16`,previousTo:prevEnd.toISOString().slice(0,10)}}const end=new Date(Date.UTC(t.y,t.m,0)).getUTCDate();return{currentFrom:`${t.y}-${pad(t.m)}-16`,currentTo:`${t.y}-${pad(t.m)}-${pad(end)}`,previousFrom:monthStart,previousTo:`${t.y}-${pad(t.m)}-15`}}
const panel=()=>document.querySelector('#view-attendance .attendance-entry-grid .panel:first-child');
function status(p,msg,ok=false){let e=p.querySelector('#attendanceStatusMessage');if(!e){e=document.createElement('div');e.id='attendanceStatusMessage';e.style.cssText='margin-top:10px;padding:10px 12px;border-radius:10px;border:1px solid #dbe4ef;font-size:12px;line-height:1.45';p.appendChild(e)}e.textContent=msg;e.style.background=ok?'#e3f3ea':'#eef7ff';e.style.color=ok?'#176d49':'#235dba'}
function timeOptions(selected){let s='';for(let h=0;h<24;h++)for(let m=0;m<60;m+=30){const v=`${pad(h)}:${pad(m)}`;s+=`<option value="${v}"${v===selected?' selected':''}>${v}</option>`}return s}
function ensureForm(){
  const p=panel();if(!p)return false;
  let form=p.querySelector('#attendanceManualForm');
  if(!form){
    const now=vn();const today=`${now.y}-${pad(now.m)}-${pad(now.d)}`;
    p.innerHTML=`<div class="section-title" style="display:flex;align-items:center;justify-content:space-between;gap:10px;width:100%;margin-bottom:14px"><span>Chấm công</span><button type="button" id="attendanceAutoButton" class="btn secondary" title="Tự động chấm kỳ hiện tại và kỳ trước; bỏ qua ca đã chấm.">Tự động chấm công</button></div><div id="attendanceManualForm" style="display:grid;grid-template-columns:1fr 1fr;gap:12px"><div class="field"><label>Ngày</label><input id="attendanceManualDate" type="date" value="${today}"></div><div class="field"><label>Cửa hàng</label><select id="attendanceManualStore"><option value="CN1">CN1</option><option value="CN2" selected>CN2</option><option value="CN3">CN3</option><option value="CN4">CN4</option></select></div><div class="field"><label>Giờ vào · 24 giờ</label><select id="attendanceManualStart">${timeOptions('06:00')}</select></div><div class="field"><label>Giờ ra · 24 giờ</label><select id="attendanceManualEnd">${timeOptions('12:00')}</select></div><div style="grid-column:1/-1"><button type="button" class="btn primary" data-attendance-manual="1">Chấm công</button></div></div>`;
  }else{
    const m=p.querySelector('[data-attendance-manual]');if(m){m.textContent='Chấm công';m.type='button';}
  }
  const m=p.querySelector('[data-attendance-manual]');
  if(m&&!m.dataset.attendanceWired){m.dataset.attendanceWired='1';m.addEventListener('click',manual)}
  const a=p.querySelector('#attendanceAutoButton');
  if(a&&!a.dataset.attendanceWired){a.dataset.attendanceWired='1';a.addEventListener('click',auto)}
  history();
  return true;
}
function fields(p){return{date:p.querySelector('#attendanceManualDate')||p.querySelector('input[type="date"]'),store:p.querySelector('#attendanceManualStore'),start:p.querySelector('#attendanceManualStart'),end:p.querySelector('#attendanceManualEnd')}}
async function history(){const table=document.getElementById('attendanceHistoryTable'),x=sb();if(!table||!x)return;const r=await x.rpc('get_my_attendance_v2',{p_from_date:document.getElementById('attendanceFrom')?.value||null,p_to_date:document.getElementById('attendanceTo')?.value||null});if(r.error){const p=panel();if(p)status(p,`Không tải được lịch sử chấm công: ${r.error.message||r.error}`);return}const body=table.querySelector('tbody');if(!body)return;body.innerHTML=(Array.isArray(r.data)?r.data:[]).map(v=>`<tr><td>${fmt(v.work_date)}</td><td>${v.store_code||v.store_name||''}</td><td>${String(v.check_in_time||v.check_in||'').slice(0,5)}</td><td>${String(v.check_out_time||v.check_out||'').slice(0,5)}</td><td>${Number(v.hours_worked||0).toFixed(1)}</td><td>${Number(v.amount||0).toLocaleString('vi-VN')}đ</td></tr>`).join('')}
async function manual(){const p=panel();if(!p||!ensureForm())return;const f=fields(p),d=f.date?.value||'',s=f.store?.value||'',i=f.start?.value||'',o=f.end?.value||'';if(!d||!s||!i||!o)return status(p,'Vui lòng nhập đủ Ngày, Cửa hàng, Giờ vào và Giờ ra.');if(o<=i)return status(p,'Giờ ra phải sau giờ vào.');if(!confirm(`Chấm công?\n\nNgày: ${fmt(d)}\nCửa hàng: ${s}\nGiờ: ${i}–${o}`))return;const x=sb();if(!x)return status(p,'Không thể kết nối Supabase.');const b=p.querySelector('[data-attendance-manual]');if(b)b.disabled=true;status(p,'Đang đối chiếu lịch chính thức…');try{const r=await x.rpc('manual_attendance_from_schedule',{p_work_date:d,p_store_code:s,p_check_in:i,p_check_out:o});if(r.error)throw r.error;status(p,'Đã chấm công thành công.',true);await history()}catch(e){status(p,`Chấm công thất bại: ${e?.message||e}`)}finally{if(b)b.disabled=false}}
async function auto(){const p=panel(),b=p?.querySelector('#attendanceAutoButton');if(!p||!b)return;const q=periods();if(!confirm(`Tự động chấm công theo kỳ lương?\n\nKỳ hiện tại: ${fmt(q.currentFrom)} – ${fmt(q.currentTo)}\nKỳ trước: ${fmt(q.previousFrom)} – ${fmt(q.previousTo)}\n\nChỉ chấm ca APPROVED đã kết thúc. Ca đã chấm bỏ qua. Không chấm ca tương lai.`))return;const x=sb();if(!x)return status(p,'Không thể kết nối Supabase.');b.disabled=true;status(p,'Đang đối chiếu lịch chính thức…');try{const r=await x.rpc('auto_attendance_from_approved_schedules',{p_from_date:q.previousFrom,p_to_date:q.currentTo});if(r.error)throw r.error;const rows=Array.isArray(r.data)?r.data:[],done=rows.filter(v=>v.action==='AUTO_COMPLETED').length,skip=rows.filter(v=>v.action==='SKIPPED_ALREADY_ATTENDED').length;status(p,`Đã tự động chấm ${done} ca; bỏ qua ${skip} ca đã chấm.`,true);await history()}catch(e){status(p,`Tự động chấm công thất bại: ${e?.message||e}`)}finally{b.disabled=false}}
function wireNavigation(){const base=window.showView;if(typeof base!=='function'||base.__attendanceBridgeWrapped)return;const wrapped=function(view,link){const r=base.call(this,view,link);if(view==='attendance'){setTimeout(ensureForm,400);setTimeout(ensureForm,1200)}return r};wrapped.__attendanceBridgeWrapped=true;window.showView=wrapped}
function install(){ensureForm();wireNavigation()}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install,{once:true});else install();
})(window,document);
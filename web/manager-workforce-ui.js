/* MAGASIN — Manager / OWNER Workforce V2 UI */
(function(window, document){
'use strict';
const sb=window.MAGASIN_SUPABASE;
if(!sb)return;
const $=id=>document.getElementById(id);
const esc=v=>String(v??'').replace(/[&<>\"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;',"'":'&#39;'}[m]));
const DAY_NAMES=['Thứ Hai','Thứ Ba','Thứ Tư','Thứ Năm','Thứ Sáu','Thứ Bảy','Chủ Nhật'];
const STATUS_LABEL={DRAFT:'Bản nháp',REVIEWED:'Đã review',PUBLISHED:'Đã publish',CANCELLED:'Đã hủy'};
let profile=null,week=monday(new Date()),storeId='',requirements=[],generations=[],selectedGeneration=null,assignments=[];
function monday(d){const x=new Date(d);x.setHours(12,0,0,0);const n=x.getDay();x.setDate(x.getDate()-(n===0?6:n-1));return x;}
function add(d,n){const x=new Date(d);x.setDate(x.getDate()+n);return x;}
function key(d){return xDate(d);}
function xDate(d){return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');}
function fmt(d){return new Intl.DateTimeFormat('vi-VN',{day:'2-digit',month:'2-digit'}).format(d);}
function mins(v){const [h,m]=String(v).slice(0,5).split(':').map(Number);return h*60+m;}
function style(){if($('wf-admin-style'))return;const s=document.createElement('style');s.id='wf-admin-style';s.textContent=`.ma-shell{display:grid;gap:16px}.ma-card{background:#fff;border:1px solid #e4eaf1;border-radius:18px;box-shadow:0 8px 24px #0f172a08;padding:18px}.ma-head{display:flex;justify-content:space-between;gap:12px;align-items:center;flex-wrap:wrap}.ma-title{font-size:19px;font-weight:800}.ma-muted{font-size:12px;color:#74839a}.ma-actions{display:flex;gap:7px;flex-wrap:wrap}.ma-btn{height:38px;padding:0 12px;border:1px solid #d9e2ec;border-radius:9px;background:#fff;font-weight:700;cursor:pointer}.ma-btn.primary{border:0;background:linear-gradient(90deg,#16c3c5,#10b7d5);color:#fff}.ma-btn.danger{border-color:#edc7c0;color:#a44739}.ma-tabs{display:flex;gap:6px;border-bottom:1px solid #edf1f5}.ma-tab{border:0;background:transparent;padding:10px 12px;font-weight:800;color:#74839a;cursor:pointer;border-bottom:2px solid transparent}.ma-tab.active{color:#087e80;border-bottom-color:#16c3c5}.ma-grid{display:grid;grid-template-columns:repeat(7,minmax(220px,1fr));gap:10px;overflow:auto}.ma-day{border:1px solid #dfe6ee;border-radius:14px;min-height:260px;overflow:hidden}.ma-day-head{padding:11px;background:#fbfcfe;border-bottom:1px solid #edf1f5}.ma-day-head strong,.ma-day-head span{display:block}.ma-day-head span{font-size:11px;color:#74839a;margin-top:2px}.ma-block{padding:10px;border-bottom:1px solid #edf1f5}.ma-req,.ma-draft-row{padding:9px;border:1px solid #d8e1ea;border-radius:10px;margin-top:7px;background:#f9fbfd;font-size:11px}.ma-req b{display:block}.ma-req small{display:block;margin-top:4px;color:#63738b}.ma-form{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:8px}.ma-form label{font-size:11px;font-weight:800;color:#63738b}.ma-form input,.ma-form select{width:100%;height:38px;margin-top:4px;border:1px solid #d7e0ea;border-radius:9px;padding:0 9px;box-sizing:border-box;background:#fff}.ma-span2{grid-column:span 2}.ma-table{width:100%;border-collapse:collapse;min-width:900px}.ma-table th,.ma-table td{padding:9px;border-bottom:1px solid #edf1f5;text-align:left;font-size:11px}.ma-table th{background:#f8fafc}.ma-wrap{overflow:auto}.ma-status{min-height:19px;font-size:12px}.ma-error{padding:12px;border-radius:11px;background:#fff4f1;color:#9d3f30}.ma-ok{color:#2d6b55}.ma-kpis{display:grid;grid-template-columns:repeat(4,1fr);gap:10px}.ma-kpi{padding:12px;border:1px solid #e4eaf1;border-radius:11px}.ma-kpi span{display:block;color:#74839a;font-size:10px}.ma-kpi strong{display:block;margin-top:4px;font-size:16px}.ma-empty{padding:22px;text-align:center;color:#95a3b7;border:1px dashed #d8e0ea;border-radius:11px}@media(max-width:760px){.ma-form{grid-template-columns:1fr 1fr}.ma-span2{grid-column:span 2}.ma-kpis{grid-template-columns:1fr 1fr}.ma-grid{grid-template-columns:repeat(7,minmax(245px,1fr))}}`;document.head.appendChild(s);}
async function loadProfile(){const {data:u,error:ue}=await sb.auth.getUser();if(ue)throw ue;if(!u.user)throw new Error('Chưa đăng nhập.');const {data:p,error:pe}=await sb.from('profiles').select('id,full_name,role,status,access_scope').eq('id',u.user.id).single();if(pe)throw pe;if(!['OWNER','STORE_MANAGER'].includes(String(p.role).toUpperCase()))throw new Error('Bạn không có quyền Workforce quản trị.');if(String(p.status).toUpperCase()!=='ACTIVE')throw new Error('Tài khoản chưa ACTIVE.');profile=p;}
async function loadData(){await loadProfile();const weekKey=key(week);const {data:req,error:re}=await sb.rpc('get_workforce_staffing_requirements',{p_store_id:storeId||null,p_week_start:weekKey});if(re)throw re;requirements=Array.isArray(req)?req:[];const {data:gens,error:ge}=await sb.rpc('list_schedule_generations',{p_store_id:storeId||null,p_week_start:weekKey});if(ge)throw ge;generations=Array.isArray(gens)?gens:[];}
function storesFromRequirements(){const m=new Map();for(const r of requirements){if(r.store_id&&!m.has(r.store_id))m.set(r.store_id,{id:r.store_id,name:r.store_name,code:r.store_code});}return Array.from(m.values());}
function storeSelect(){const ss=storesFromRequirements();let h='<option value="">Tất cả cửa hàng</option>';for(const s of ss)h+=`<option value="${esc(s.id)}" ${String(storeId)===String(s.id)?'selected':''}>${esc(s.name||s.code)}</option>`;return h;}
function tabs(active){return `<div class="ma-tabs"><button class="ma-tab ${active==='demand'?'active':''}" data-ma-tab="demand">Nhu cầu nhân sự</button><button class="ma-tab ${active==='drafts'?'active':''}" data-ma-tab="drafts">Lịch nháp & review</button></div>`;}
function frame(body,active){const end=add(week,6);const box=$('content');box.innerHTML=`<div class="ma-shell"><section class="ma-card"><div class="ma-head"><div><div class="ma-title">Điều phối Workforce</div><div class="ma-muted">Tuần ${fmt(week)} – ${fmt(end)} · ${esc(profile?.role||'')}</div></div><div class="ma-actions"><button class="ma-btn" id="ma-prev">← Tuần trước</button><button class="ma-btn" id="ma-now">Tuần này</button><button class="ma-btn" id="ma-next">Tuần sau →</button></div></div><div class="ma-form" style="margin-top:12px"><label>Cửa hàng<select id="ma-store">${storeSelect()}</select></label></div><div id="ma-status" class="ma-status" style="margin-top:8px"></div></section>${tabs(active)}${body}</div>`;bindCommon();}
function demandBody(){const stores=storesFromRequirements();const group=new Map();for(const r of requirements){const d=String(r.work_date).slice(0,10);if(!group.has(d))group.set(d,[]);group.get(d).push(r);}const days=Array.from({length:7},(_,i)=>{const d=add(week,i),k=key(d);const rs=group.get(k)||[];return `<article class="ma-day"><div class="ma-day-head"><strong>${DAY_NAMES[i]}</strong><span>${fmt(d)}</span></div><div class="ma-block">${rs.length?rs.sort((a,b)=>String(a.start_time).localeCompare(String(b.start_time))).map(r=>`<div class="ma-req"><b>${esc(String(r.start_time).slice(0,5))}–${esc(String(r.end_time).slice(0,5))} · ${esc(r.skill_code||'Tổng hợp')}</b><small>${esc(r.store_name||r.store_code||'')} · ${r.minimum_headcount}/${r.target_headcount}/${r.maximum_headcount} · ${r.status}</small></div>`).join(''):'<div class="ma-empty">Chưa có nhu cầu</div>'}</div></article>`;}).join('');const form=`<section class="ma-card"><div class="ma-head"><div><div class="ma-title" style="font-size:16px">Thêm / cập nhật nhu cầu</div><div class="ma-muted">Minimum ≤ Target ≤ Maximum</div></div><button class="ma-btn primary" id="ma-save-req">Lưu nhu cầu</button></div><div class="ma-form" style="margin-top:12px"><label>Cửa hàng<select id="ma-req-store">${storeSelect()}</select></label><label>Ngày<input id="ma-req-date" type="date" value="${key(week)}"></label><label>Bắt đầu<input id="ma-req-start" type="time" value="09:00"></label><label>Kết thúc<input id="ma-req-end" type="time" value="17:00"></label><label>Skill<span style="display:block;margin-top:4px"><input id="ma-req-skill" type="text" placeholder="BARISTA"></span></label><label>Min skill<input id="ma-req-level" type="number" min="0" max="4" value="0"></label><label>Minimum<input id="ma-req-min" type="number" min="0" value="0"></label><label>Target<input id="ma-req-target" type="number" min="0" value="0"></label><label>Maximum<input id="ma-req-max" type="number" min="0" value="0"></label><label>Trạng thái<select id="ma-req-status"><option>ACTIVE</option><option>INACTIVE</option></select></label><label class="ma-span2">Ghi chú<input id="ma-req-note" type="text" placeholder="Ghi chú vận hành"></label></div></section>`;return `${form}<section class="ma-grid">${days}</section>`;}
function draftBody(){const rows=generations;const selected=selectedGeneration?generations.find(x=>String(x.id)===String(selectedGeneration)):rows[0];if(selectedGeneration===null&&selected)selectedGeneration=selected.id;const meta=selected?`<div class="ma-kpis" style="margin-top:12px"><div class="ma-kpi"><span>Trạng thái</span><strong>${esc(STATUS_LABEL[selected.status]||selected.status)}</strong></div><div class="ma-kpi"><span>Tổng giờ</span><strong>${Number(selected.total_hours||0).toFixed(2)}</strong></div><div class="ma-kpi"><span>Coverage</span><strong>${Number(selected.coverage_score||0).toFixed(2)}</strong></div><div class="ma-kpi"><span>Skill coverage</span><strong>${Number(selected.skill_coverage_score||0).toFixed(2)}</strong></div></div>`:'';const list=rows.length?rows.map(g=>`<button class="ma-draft-row" data-gen="${esc(g.id)}" style="width:100%;text-align:left;border:${String(g.id)===String(selectedGeneration)?'2px solid #16c3c5':'1px solid #d8e1ea'}"><b>${esc(g.store_name||g.store_code||'Tất cả')} · ${fmt(new Date(g.week_start))}–${fmt(new Date(g.week_end))}</b><span>${esc(STATUS_LABEL[g.status]||g.status)} · ${esc(g.algorithm_version)} · ${Number(g.total_hours||0).toFixed(2)} giờ</span></button>`).join(''):'<div class="ma-empty">Chưa có generation trong tuần này.</div>';const review=selected?`<section class="ma-card"><div class="ma-head"><div><div class="ma-title" style="font-size:16px">Review & phát hành lịch</div><div class="ma-muted">${esc(selected.store_name||selected.store_code||'')} · ${fmt(new Date(selected.week_start))} – ${fmt(new Date(selected.week_end))}</div></div><div class="ma-actions"><button class="ma-btn" id="ma-load-assign">Tải assignment</button><button class="ma-btn" id="ma-validate-gen">Kiểm tra</button><button class="ma-btn primary" id="ma-review-gen">Duyệt lịch</button><button class="ma-btn primary" id="ma-publish-gen">Phát hành</button></div></div>${meta}<div id="ma-validation" class="ma-status ma-muted" style="margin-top:12px">Chưa kiểm tra validation.</div><div id="ma-review" style="margin-top:12px"><div class="ma-empty">Bấm “Tải assignment” để xem lịch nháp.</div></div><div class="ma-status ma-muted" style="margin-top:10px">Quy trình thật: DRAFT → kiểm tra server-side → REVIEWED → kiểm tra lại → PUBLISHED.</div></section>`:'';return `<section class="ma-card"><div class="ma-head"><div><div class="ma-title" style="font-size:16px">Generation</div><div class="ma-muted">Tạo draft mới từ tuần/cửa hàng hiện tại.</div></div><button class="ma-btn primary" id="ma-create-gen">+ Tạo lịch nháp</button></div><div class="ma-wrap" style="margin-top:12px">${list}</div></section>${review}`;}
async function refresh(active){try{await loadData();if(active==='demand')frame(demandBody(),'demand');else frame(draftBody(),'drafts');}catch(err){const box=$('content');if(box)box.innerHTML=`<section class="ma-card"><div class="ma-error">${esc(err.message||'Không thể tải Workforce.')}</div></section>`;}}
function status(t,e=false){const x=$('ma-status');if(x){x.textContent=t||'';x.className='ma-status '+(e?'ma-error':'ma-ok');}}
function bindCommon(){$('ma-prev')?.addEventListener('click',()=>{week=add(week,-7);selectedGeneration=null;refresh(document.querySelector('[data-ma-tab].active')?.dataset.maTab||'demand');});$('ma-now')?.addEventListener('click',()=>{week=monday(new Date());selectedGeneration=null;refresh(document.querySelector('[data-ma-tab].active')?.dataset.maTab||'demand');});$('ma-next')?.addEventListener('click',()=>{week=add(week,7);selectedGeneration=null;refresh(document.querySelector('[data-ma-tab].active')?.dataset.maTab||'demand');});$('ma-store')?.addEventListener('change',e=>{storeId=e.target.value;selectedGeneration=null;refresh(document.querySelector('[data-ma-tab].active')?.dataset.maTab||'demand');});document.querySelectorAll('[data-ma-tab]').forEach(b=>b.addEventListener('click',()=>refresh(b.dataset.maTab)));}
async function saveReq(){const b=$('ma-save-req');const store=$('ma-req-store').value;if(!store){status('Chưa chọn cửa hàng.',true);return;}const payload={p_store_id:store,p_work_date:$('ma-req-date').value,p_start_time:$('ma-req-start').value,p_end_time:$('ma-req-end').value,p_skill_code:$('ma-req-skill').value.trim()||null,p_min_skill_level:Number($('ma-req-level').value||0),p_minimum_headcount:Number($('ma-req-min').value||0),p_target_headcount:Number($('ma-req-target').value||0),p_maximum_headcount:Number($('ma-req-max').value||0),p_status:$('ma-req-status').value,p_note:$('ma-req-note').value.trim()||null};b.disabled=true;try{const {error}=await sb.rpc('upsert_workforce_staffing_requirement',{p_requirement_id:null,...payload});if(error)throw error;status('Đã lưu nhu cầu nhân sự.');await refresh('demand');}catch(err){status(err.message||'Không thể lưu nhu cầu.',true);}finally{b.disabled=false;}}
async function createGen(){const store=$('ma-store').value||null;if(!store&&String(profile.role).toUpperCase()!=='OWNER'){status('STORE_MANAGER phải chọn cửa hàng.',true);return;}const b=$('ma-create-gen');b.disabled=true;try{const {data,error}=await sb.rpc('create_schedule_generation',{p_store_id:store,p_week_start:key(week),p_algorithm_version:'RULE_V1'});if(error)throw error;status('Đã tạo lịch nháp: '+data);selectedGeneration=data;await refresh('drafts');}catch(err){status(err.message||'Không thể tạo generation.',true);}finally{b.disabled=false;}}
async function loadAssignments(){if(!selectedGeneration)return;const {data,error}=await sb.rpc('get_schedule_generation_assignments',{p_generation_id:selectedGeneration});if(error)throw error;assignments=Array.isArray(data)?data:[];const box=$('ma-review');if(!box)return;box.innerHTML=assignments.length?`<div class="ma-wrap"><table class="ma-table"><thead><tr><th>Ngày</th><th>Nhân viên</th><th>Giờ</th><th>Cửa hàng</th><th>Skill</th><th>Score</th><th>Warning</th></tr></thead><tbody>${assignments.map(a=>`<tr><td>${esc(a.work_date)}</td><td>${esc(a.full_name||a.username||a.user_id)}</td><td>${esc(String(a.start_time).slice(0,5))}–${esc(String(a.end_time).slice(0,5))}</td><td>${esc(a.store_name||a.store_code||'')}</td><td>${esc(a.skill_code||'—')} / ${esc(a.skill_level)}</td><td>${Number(a.score||0).toFixed(2)}</td><td>${esc(a.warning||'')}</td></tr>`).join('')}</tbody></table></div>`:'<div class="ma-empty">Generation chưa có assignment.</div>'
}
function validationBox(result){
  const box=$('ma-validation');if(!box)return;
  const violations=Array.isArray(result?.violations)?result.violations:[];
  const warnings=Array.isArray(result?.warnings)?result.warnings:[];
  const valid=!!result?.valid;
  box.className='ma-status '+(valid?'ma-ok':'ma-error');
  box.innerHTML=(valid?'✓ Validation hợp lệ':'✗ Validation bị chặn')+
    ' · '+(result?.assignment_count??0)+' assignment · '+violations.length+' lỗi · '+warnings.length+' cảnh báo'+
    (violations.length?'<div style="margin-top:7px">'+violations.slice(0,5).map(x=>'• '+esc(x.code||JSON.stringify(x))).join('<br>')+'</div>':'')+
    (warnings.length?'<div style="margin-top:7px;color:#8a6412">'+warnings.slice(0,5).map(x=>'• '+esc(x.code||JSON.stringify(x))).join('<br>')+'</div>':'');
}
async function validateGeneration(){
  if(!selectedGeneration)return;
  try{
    const {data,error}=await sb.rpc('validate_schedule_generation_v1',{p_generation_id:selectedGeneration});
    if(error)throw error;
    validationBox(data||{});
    status(data?.valid?'Validation hợp lệ. Có thể duyệt lịch.':'Validation chưa đạt. Xử lý lỗi trước khi duyệt.',!data?.valid);
  }catch(err){status(err.message||'Không thể kiểm tra lịch.',true);}
}
async function reviewGeneration(){
  if(!selectedGeneration)return;
  const b=$('ma-review-gen');if(b)b.disabled=true;
  try{
    const {data,error}=await sb.rpc('review_schedule_generation',{p_generation_id:selectedGeneration,p_decision:'APPROVED'});
    if(error)throw error;
    validationBox(data?.validation||{valid:true});
    status('Đã duyệt lịch. Generation chuyển sang REVIEWED.');
    await refresh('drafts');
  }catch(err){status(err.message||'Không thể duyệt lịch.',true);}
  finally{if(b)b.disabled=false;}
}
async function publishGeneration(){
  if(!selectedGeneration)return;
  if(!confirm('Phát hành lịch này thành lịch chính thức? Thao tác sẽ tạo ca APPROVED cho nhân viên.'))return;
  const b=$('ma-publish-gen');if(b)b.disabled=true;
  try{
    const {data,error}=await sb.rpc('publish_schedule_generation',{p_generation_id:selectedGeneration});
    if(error)throw error;
    validationBox(data?.validation||{valid:!!data?.published});
    if(data?.published){
      status('Đã phát hành '+Number(data.inserted_schedule_count||0)+' ca chính thức.');
    }else{
      status('Không phát hành được. Generation đã quay về DRAFT để xử lý xung đột/validation.',true);
    }
    await refresh('drafts');
  }catch(err){status(err.message||'Không thể phát hành lịch.',true);}
  finally{if(b)b.disabled=false;}
}
function injectMenu(){const menu=$('drawerMenu');if(!menu)return;const role=String(profile?.role||'').toUpperCase();if(!['OWNER','STORE_MANAGER'].includes(role))return;if(menu.querySelector('[data-page="workforce-admin"]'))return;const b=document.createElement('button');b.className='drawer-btn';b.dataset.page='workforce-admin';b.innerHTML='<span>📐</span><span>Điều phối lịch</span>';menu.appendChild(b);}
function renderPage(active='demand'){style();injectMenu();if(active==='demand')return refresh('demand');return refresh('drafts');}
function capture(e){const p=e.target.closest('[data-page="workforce-admin"]');if(p){e.preventDefault();e.stopImmediatePropagation();renderPage('demand');return;}const tab=e.target.closest('[data-ma-tab]');if(tab){e.preventDefault();e.stopImmediatePropagation();refresh(tab.dataset.maTab);return;}const gen=e.target.closest('[data-gen]');if(gen){selectedGeneration=gen.dataset.gen;refresh('drafts');}}
document.addEventListener('click',capture,true);
document.addEventListener('click',e=>{if(e.target.closest('#ma-save-req'))saveReq();if(e.target.closest('#ma-create-gen'))createGen();if(e.target.closest('#ma-load-assign'))loadAssignments();if(e.target.closest('#ma-validate-gen'))validateGeneration();if(e.target.closest('#ma-review-gen'))reviewGeneration();if(e.target.closest('#ma-publish-gen'))publishGeneration();},false);
window.MAGASIN_WORKFORCE_MANAGER_UI={render:renderPage};
})(window,document);

/* MAGASIN — Manager generation UX guard v1 */
(function(){
  'use strict';
  const sb=window.MAGASIN_SUPABASE;
  if(!sb)return;
  let storeLoadInFlight=null;
  async function loadActiveStores(){
    if(storeLoadInFlight)return storeLoadInFlight;
    storeLoadInFlight=(async()=>{
      const {data,error}=await sb.from('stores').select('id,code,name,status').eq('status','ACTIVE').order('code');
      if(error)throw error;
      const stores=Array.isArray(data)?data:[];
      const ids=new Set(stores.map(x=>String(x.id)));
      ['ma-store','ma-req-store'].forEach(id=>{
        const el=document.getElementById(id);
        if(!el)return;
        const current=el.value;
        const head='<option value="">Tất cả cửa hàng</option>';
        el.innerHTML=head+stores.map(x=>`<option value="${String(x.id).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/\"/g,'&quot;')}">${String(x.name||x.code||x.id).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')}</option>`).join('');
        if(ids.has(String(current)))el.value=current;
      });
      return stores;
    })().finally(()=>{storeLoadInFlight=null;});
    return storeLoadInFlight;
  }
  function status(text,error){
    const x=document.getElementById('ma-status');
    if(!x)return;
    x.textContent=text||'';
    x.className='ma-status '+(error?'ma-error':'ma-ok');
  }
  async function ensureStoreOptions(){
    try{return await loadActiveStores();}
    catch(err){status('Không tải được danh sách cửa hàng: '+(err?.message||err),true);return []}
  }
  document.addEventListener('click',async function(ev){
    const btn=ev.target.closest?.('#ma-create-gen');
    if(!btn)return;
    const sel=document.getElementById('ma-store');
    if(!sel)return;
    if(!sel.value){
      ev.preventDefault();
      ev.stopImmediatePropagation();
      await ensureStoreOptions();
      status('Vui lòng chọn một cửa hàng cụ thể trước khi tạo lịch nháp.',true);
    }
  },true);
  const observer=new MutationObserver(()=>{
    const sel=document.getElementById('ma-store');
    if(sel && !sel.dataset.storeUxReady){
      sel.dataset.storeUxReady='1';
      ensureStoreOptions();
    }
    const req=document.getElementById('ma-req-store');
    if(req && !req.dataset.storeUxReady){
      req.dataset.storeUxReady='1';
      ensureStoreOptions();
    }
  });
  observer.observe(document.documentElement,{childList:true,subtree:true});
  ensureStoreOptions();
})();


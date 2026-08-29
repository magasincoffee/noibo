/* MAGASIN Workforce V2 Phase 10 — Shift Swap UI */
(function(window, document){
  'use strict';
  const authErrorTranslations={
    'New password should be different from the old password.':'Mật khẩu mới phải khác mật khẩu cũ.',
    'New password should be different from the old password':'Mật khẩu mới phải khác mật khẩu cũ.',
    'Password should be at least 8 characters.':'Mật khẩu phải có ít nhất 8 ký tự.',
    'Password should be at least 8 characters':'Mật khẩu phải có ít nhất 8 ký tự.',
    'Invalid or expired password recovery link':'Liên kết đặt lại mật khẩu không hợp lệ hoặc đã hết hạn.',
    'Auth session missing!':'Phiên đặt lại mật khẩu không còn hợp lệ. Vui lòng yêu cầu liên kết mới.',
    'Auth session expired!':'Phiên đặt lại mật khẩu đã hết hạn. Vui lòng yêu cầu liên kết mới.'
  };
  function translateAuthMessage(){
    const el=document.getElementById('authMessage');
    if(!el)return;
    const raw=String(el.textContent||'').trim();
    if(!raw)return;
    const translated=authErrorTranslations[raw];
    if(translated){
      el.textContent=translated;
      return;
    }
    for(const [source,target] of Object.entries(authErrorTranslations)){
      if(raw.includes(source)){el.textContent=raw.replace(source,target);return;}
    }
  }
  new MutationObserver(translateAuthMessage).observe(document.documentElement,{subtree:true,childList:true,characterData:true});
  window.addEventListener('load',translateAuthMessage);
  const sb=window.MAGASIN_SUPABASE;
  const rootId='workforceShiftSwapUi';
  const esc=v=>String(v??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
  const role=()=>String(window.MAGASIN_PROFILE?.role||window.MAGASIN_APP_PROFILE?.role||'').toUpperCase();
  const manager=()=>['OWNER','STORE_MANAGER'].includes(role());
  function box(title,body){return '<section class="card panel" id="'+rootId+'"><div class="section-head"><div><h2>'+title+'</h2><p>Đổi ca trên lịch chính thức · Phase 10</p></div></div>'+body+'</section>';}
  function err(msg){return '<div class="error-box">'+esc(msg)+'</div>';}
  function ok(msg){return '<div class="message success">'+esc(msg)+'</div>';}
  function fmt(row){return `${row.start_time}–${row.end_time}`;}
  function scheduleLabel(x){return `${esc(x.date||x.work_date||'')} · ${esc(x.start||x.start_time||'')}–${esc(x.end||x.end_time||'')} · ${esc(x.store_name||x.store_code||'')}`;}
  async function mySchedules(){
    const {data,error}=await sb.rpc('list_my_approved_schedules_v1');
    if(error)throw error;
    return Array.isArray(data)?data:[];
  }
  async function candidates(scheduleId){
    const {data,error}=await sb.rpc('list_shift_swap_candidates_v1',{p_requester_schedule_id:scheduleId});
    if(error)throw error;
    return Array.isArray(data)?data:[];
  }
  async function mine(){
    const {data,error}=await sb.rpc('list_my_shift_swaps_v2');
    if(error)throw error;
    return Array.isArray(data)?data:[];
  }
  function statusBadge(s){return '<span class="status-pill status-'+esc(String(s||'').toLowerCase())+'">'+esc(s||'')+'</span>';}
  async function renderEmployee(){
    const box=document.getElementById('content');
    box.innerHTML=boxEl('Đổi ca','Đang tải…');
    try{
      const schedules=await mySchedules();
      const rows=await mine();
      const opts=schedules.length?schedules.map((x,i)=>'<option value="'+esc(x.schedule_id||'')+'" data-idx="'+i+'">'+scheduleLabel(x)+'</option>').join(''):'<option value="">Chưa có ca APPROVED</option>';
      box.innerHTML=boxEl('Đổi ca',`
        <div id="swapEmployeeMessage"></div>
        <div class="form-grid">
          <label class="auth-label">Ca của bạn<select id="swapRequesterSchedule">${opts}</select></label>
          <label class="auth-label">Ca muốn đổi<select id="swapTargetSchedule"><option value="">Chọn ca…</option></select></label>
        </div>
        <label class="auth-label">Lý do<textarea id="swapReason" rows="3" required style="width:100%;box-sizing:border-box;border:1px solid #d7e0ea;border-radius:12px;padding:12px;background:#f7f9ff"></textarea></label>
        <button id="swapSubmit" class="primary-action">Gửi yêu cầu đổi ca</button>
        <div style="margin-top:22px"><h3>Yêu cầu của tôi</h3><div class="table-wrap"><table class="table"><thead><tr><th>Trạng thái</th><th>Ca của bạn</th><th>Ca đổi</th><th>Nhân viên</th><th>Lý do</th><th></th></tr></thead><tbody id="swapMineRows"></tbody></table></div></div>
        ${manager()?'<div id="swapManagerArea" style="margin-top:24px"></div>':''}`);
      const req=document.getElementById('swapRequesterSchedule');
      const target=document.getElementById('swapTargetSchedule');
      const submit=document.getElementById('swapSubmit');
      function syncSubmitState(){submit.disabled=!req.value||!target.value;}
      async function loadTargets(){
        if(!req.value){target.innerHTML='<option value="">Chưa chọn ca</option>';syncSubmitState();return;}
        target.disabled=true;
        target.innerHTML='<option value="">Đang tải ca phù hợp…</option>';
        try{
          const cs=await candidates(req.value);
          target.innerHTML=cs.length?'<option value="">Chọn ca…</option>'+cs.map(x=>'<option value="'+esc(x.schedule_id)+'">'+esc(x.work_date)+' · '+esc(fmt(x))+' · '+esc(x.store_code||'')+' · '+esc(x.user_name||'')+'</option>').join(''):'<option value="">Không có ca phù hợp</option>';
        }catch(e){
          target.innerHTML='<option value="">Không tải được</option>';
          document.getElementById('swapEmployeeMessage').innerHTML=err(e.message);
        }finally{
          target.disabled=false;
          syncSubmitState();
        }
      }
      req.onchange=loadTargets;
      target.onchange=syncSubmitState;
      await loadTargets();
      submit.onclick=async()=>{
        const b=submit;
        const m=document.getElementById('swapEmployeeMessage');
        const reason=document.getElementById('swapReason').value.trim();
        if(!req.value){m.innerHTML=err('Vui lòng chọn ca của bạn.');return;}
        if(!target.value){m.innerHTML=err('Vui lòng chọn ca muốn đổi.');syncSubmitState();return;}
        if(!reason){m.innerHTML=err('Vui lòng nhập lý do đổi ca.');document.getElementById('swapReason').focus();return;}
        b.disabled=true;
        b.textContent='Đang gửi…';
        m.innerHTML='';
        try{
          const {data,error}=await sb.rpc('submit_shift_swap_request',{p_requester_schedule_id:req.value,p_target_schedule_id:target.value,p_reason:reason});
          if(error)throw error;
          m.innerHTML=ok('Đã gửi yêu cầu đổi ca.');
          document.getElementById('swapReason').value='';
          await renderEmployee();
        }catch(e){
          m.innerHTML=err(e.message);
        }finally{
          b.disabled=false;
          b.textContent='Gửi yêu cầu đổi ca';
        }
      };
      document.getElementById('swapMineRows').innerHTML=rows.length?rows.map(x=>`<tr><td>${statusBadge(x.status)}</td><td>${esc((x.requester_schedule_date||'')+' '+(x.requester_start||'')+'–'+(x.requester_end||''))}</td><td>${esc((x.target_schedule_date||'')+' '+(x.target_start||'')+'–'+(x.target_end||''))}</td><td>${esc(x.target_user_name||'')}</td><td>${esc(x.reason||'')}</td><td>${x.status==='PENDING'?'<button class="secondary-action js-cancel-swap" data-id="'+esc(x.id)+'">Hủy</button>':''}</td></tr>`).join(''):'<tr><td colspan="6">Chưa có yêu cầu.</td></tr>';
      document.querySelectorAll('.js-cancel-swap').forEach(b=>b.onclick=async()=>{try{const {error}=await sb.rpc('cancel_shift_swap',{p_swap_id:b.dataset.id});if(error)throw error;await renderEmployee();}catch(e){document.getElementById('swapEmployeeMessage').innerHTML=err(e.message);}});
      if(manager())await renderManager();
    }catch(e){box.innerHTML=boxEl('Đổi ca',err(e.message||'Không thể tải đổi ca.'));}
  }
  function boxEl(title,body){return box(title,body).replace('<section class="card panel" id="'+rootId+'">','<section class="card panel">');}
  async function renderManager(){
    const area=document.getElementById('swapManagerArea');if(!area)return;
    try{
      const {data,error}=await sb.rpc('list_shift_swap_requests_v1',{p_store_id:null,p_status:'PENDING'});if(error)throw error;
      const rows=Array.isArray(data)?data:[];
      area.innerHTML='<h3>Phê duyệt đổi ca</h3><div class="approval-list">'+(rows.length?rows.map(x=>`<div class="approval-item"><div><strong>${esc(x.requester_name||'')}</strong><span>${esc(x.store_code||'')} · ${esc(x.requester_date||'')} · ${esc(fmt({start_time:x.requester_start,end_time:x.requester_end}))} ↔ ${esc(fmt({start_time:x.target_start,end_time:x.target_end}))} · ${esc(x.target_user_name||'')}</span><span>${esc(x.reason||'')}</span></div><div style="display:flex;gap:8px"><button class="primary-action js-approve-swap" data-id="${esc(x.id)}">Duyệt</button><button class="secondary-action js-reject-swap" data-id="${esc(x.id)}">Từ chối</button></div></div>`).join(''):'<div class="empty">Không có yêu cầu chờ duyệt.</div>')+'</div><div id="swapManagerMessage" style="margin-top:12px"></div>';
      document.querySelectorAll('.js-approve-swap').forEach(b=>b.onclick=async()=>{await managerAction('approve_shift_swap',b.dataset.id);});
      document.querySelectorAll('.js-reject-swap').forEach(b=>b.onclick=async()=>{await managerAction('reject_shift_swap',b.dataset.id);});
    }catch(e){area.innerHTML=err(e.message);}
  }
  async function managerAction(fn,id){
    const m=document.getElementById('swapManagerMessage');if(m)m.innerHTML='';
    try{const args={p_swap_id:id};if(fn==='reject_shift_swap')args.p_note=window.prompt('Ghi chú từ chối:')||null;const {data,error}=await sb.rpc(fn,args);if(error)throw error;if(m)m.innerHTML=ok(fn==='approve_shift_swap'?'Đã duyệt và đổi ca atomic.':'Đã từ chối yêu cầu.');await renderEmployee();}catch(e){if(m)m.innerHTML=err(e.message);}
  }
  async function render(mode){
    if(!sb)return;
    return renderEmployee();
  }
  window.MAGASIN_SHIFT_SWAP_UI={render};
})(window,document);

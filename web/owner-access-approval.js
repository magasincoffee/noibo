/* MAGASIN — OWNER Access Approval UI V1 */
(function(window, document){
  'use strict';
  const sb = window.MAGASIN_SUPABASE;
  if(!sb) return;
  const $ = id => document.getElementById(id);
  const esc = v => String(v ?? '').replace(/[&<>\"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;',"'":'&#39;'}[m]));
  const fmt = v => v ? new Intl.DateTimeFormat('vi-VN',{dateStyle:'short',timeStyle:'short'}).format(new Date(v)) : '—';
  let profile = null;
  let requests = [];
  let menuButton = null;
  let active = false;

  function isOwner(){ return String(profile?.role||'').toUpperCase()==='OWNER' && String(profile?.status||'').toUpperCase()==='ACTIVE'; }
  function setHeader(){
    const title=$('pageTitle'), desc=$('pageDescription');
    if(title){ title.textContent='Phê duyệt tài khoản'; }
    if(desc){ desc.textContent='Xác thực quyền truy cập nhân viên MAGASIN'; }
  }
  function injectStyle(){
    if($('owner-approval-style')) return;
    const s=document.createElement('style'); s.id='owner-approval-style';
    s.textContent=`
      .oa-shell{display:grid;gap:18px}
      .oa-card{background:#fff;border:1px solid #DCE5F0;border-radius:16px;box-shadow:0 2px 8px rgba(16,42,67,.06);padding:20px}
      .oa-head{display:flex;justify-content:space-between;align-items:flex-start;gap:14px;flex-wrap:wrap}
      .oa-title{font-size:21px;font-weight:800;color:#102A43}.oa-muted{font-size:12px;color:#617793;margin-top:4px}
      .oa-kpis{display:grid;grid-template-columns:repeat(3,1fr);gap:12px;margin-top:16px}
      .oa-kpi{padding:14px;border:1px solid #DCE5F0;border-radius:12px;background:#FBFCFE}.oa-kpi span{display:block;color:#617793;font-size:11px}.oa-kpi strong{display:block;margin-top:5px;font-size:20px;color:#102A43}
      .oa-toolbar{display:flex;gap:8px;align-items:center;flex-wrap:wrap}.oa-btn{height:38px;border:1px solid #DCE5F0;border-radius:10px;padding:0 13px;background:#fff;color:#536983;font-weight:700;cursor:pointer}.oa-btn.primary{border:0;background:#16B7C5;color:#fff}.oa-btn.danger{border-color:#efc9c3;color:#A44739;background:#fff8f6}.oa-btn:disabled{opacity:.55;cursor:not-allowed}
      .oa-list{display:grid;gap:12px;margin-top:16px}.oa-item{border:1px solid #DCE5F0;border-radius:14px;overflow:hidden;background:#fff}.oa-item-head{display:flex;justify-content:space-between;gap:12px;padding:16px;background:#FBFCFE;border-bottom:1px solid #EDF1F5;align-items:flex-start}.oa-person{display:flex;gap:12px;min-width:0}.oa-avatar{width:44px;height:44px;border-radius:50%;display:grid;place-items:center;background:#E8F8FA;color:#08777A;font-weight:800;flex:0 0 44px}.oa-person strong{display:block;font-size:15px;color:#102A43}.oa-person span{display:block;font-size:12px;color:#617793;margin-top:3px;word-break:break-word}.oa-badge{white-space:nowrap;padding:6px 9px;border-radius:999px;background:#FFF4D6;color:#8A6400;font-size:11px;font-weight:800}
      .oa-meta{display:grid;grid-template-columns:repeat(4,1fr);gap:10px;padding:14px 16px}.oa-meta>div{padding:10px 11px;border:1px solid #EDF1F5;border-radius:10px}.oa-meta span{display:block;color:#74839A;font-size:10px}.oa-meta strong{display:block;margin-top:4px;font-size:12px;color:#102A43;word-break:break-word}.oa-actions{display:grid;grid-template-columns:1fr auto auto;gap:9px;padding:0 16px 16px;align-items:center}.oa-note{height:40px;border:1px solid #DCE5F0;border-radius:10px;padding:0 11px;outline:none;font:500 12px Inter,'Be Vietnam Pro',sans-serif}.oa-note:focus{border-color:#7BD4DC;box-shadow:0 0 0 4px rgba(22,183,197,.1)}
      .oa-alert{margin-top:12px;padding:12px 13px;border-radius:10px;font-size:12px}.oa-alert.success{background:#EEF9F6;color:#166E5A;border:1px solid #D8EFE8}.oa-alert.error{background:#FFF4F2;color:#A44739;border:1px solid #F0D6D1}
      .oa-empty{padding:34px 20px;text-align:center;color:#74839A;border:1px dashed #DCE5F0;border-radius:12px;background:#FBFCFE}.oa-empty strong{display:block;color:#102A43;font-size:15px;margin-bottom:5px}
      @media(max-width:800px){.oa-kpis{grid-template-columns:1fr}.oa-meta{grid-template-columns:1fr 1fr}.oa-actions{grid-template-columns:1fr 1fr}.oa-note{grid-column:span 2}}
      @media(max-width:520px){.oa-meta{grid-template-columns:1fr}.oa-item-head{padding:13px}.oa-person strong{font-size:14px}}
    `; document.head.appendChild(s);
  }
  async function loadProfile(){
    const {data,error}=await sb.auth.getUser(); if(error) throw error; if(!data.user) return null;
    const {data:p,error:pe}=await sb.from('profiles').select('id,full_name,username,email,role,status').eq('id',data.user.id).single();
    if(pe) throw pe; profile=p; return p;
  }
  async function loadRequests(){
    const {data,error}=await sb.rpc('list_pending_approval_requests');
    if(error) throw error; requests=Array.isArray(data)?data:[];
  }
  function countBadge(){
    if(!menuButton) return;
    menuButton.innerHTML='<span>🛡️</span><span>Phê duyệt tài khoản</span>'+(requests.length?`<span class="oa-nav-badge">${requests.length}</span>`:'');
    menuButton.setAttribute('aria-label',requests.length?`Có ${requests.length} yêu cầu chờ duyệt`:'Phê duyệt tài khoản');
  }
  function installNavBadgeStyle(){
    if($('oa-nav-style')) return; const s=document.createElement('style');s.id='oa-nav-style';s.textContent='.oa-nav-badge{margin-left:auto;min-width:20px;height:20px;padding:0 6px;border-radius:999px;background:#EAF4FF;color:#2F6FDE;display:inline-grid;place-items:center;font-size:10px;font-weight:800}';document.head.appendChild(s);
  }
  function injectMenu(){
    const menu=$('drawerMenu'); if(!menu || !isOwner()) return;
    if(menuButton && document.body.contains(menuButton)) return;
    menuButton=document.createElement('button'); menuButton.className='drawer-btn'; menuButton.dataset.page='owner-access-approval'; menu.appendChild(menuButton); installNavBadgeStyle(); countBadge();
  }
  function initials(name){ const s=String(name||'U').trim().split(/\s+/); return (s.length>1?s[0][0]+s[s.length-1][0]:s[0].slice(0,2)).toUpperCase(); }
  function render(){
    injectStyle(); setHeader(); countBadge();
    const box=$('content'); if(!box) return;
    const pending=requests.length;
    box.innerHTML=`<div class="oa-shell">
      <section class="oa-card">
        <div class="oa-head"><div><div class="oa-title">Yêu cầu cấp quyền</div><div class="oa-muted">Chỉ OWNER mới có thể phê duyệt hoặc từ chối tài khoản.</div></div><div class="oa-toolbar"><button id="oa-refresh" class="oa-btn">↻ Làm mới</button></div></div>
        <div class="oa-kpis"><div class="oa-kpi"><span>Đang chờ xử lý</span><strong>${pending}</strong></div><div class="oa-kpi"><span>Quy trình</span><strong>Đăng ký → Xác minh → Duyệt</strong></div><div class="oa-kpi"><span>Quyền sau khi duyệt</span><strong>ACTIVE</strong></div></div>
        <div id="oa-alert"></div>
      </section>
      <section class="oa-card"><div class="oa-head"><div><div class="oa-title" style="font-size:17px">Danh sách nhân viên chờ duyệt</div><div class="oa-muted">Kiểm tra thông tin trước khi cấp quyền truy cập hệ thống.</div></div></div>
        <div class="oa-list">${pending?requests.map(r=>`<article class="oa-item" data-request="${esc(r.id)}">
          <div class="oa-item-head"><div class="oa-person"><div class="oa-avatar">${esc(initials(r.full_name||r.username))}</div><div><strong>${esc(r.full_name||'Chưa cập nhật họ tên')}</strong><span>@${esc(r.username||'—')} · ${esc(r.email||'—')}</span></div></div><div class="oa-badge">CHỜ DUYỆT</div></div>
          <div class="oa-meta"><div><span>Số điện thoại</span><strong>${esc(r.phone||'—')}</strong></div><div><span>Vai trò đăng ký</span><strong>${esc(r.role||'—')}</strong></div><div><span>Trạng thái hồ sơ</span><strong>${esc(r.profile_status||'—')}</strong></div><div><span>Gửi yêu cầu</span><strong>${esc(fmt(r.requested_at))}</strong></div></div>
          <div class="oa-actions"><input class="oa-note" data-note placeholder="Ghi chú (không bắt buộc)"><button class="oa-btn danger" data-reject>✕ Từ chối</button><button class="oa-btn primary" data-approve>✓ Duyệt & kích hoạt</button></div>
        </article>`).join(''):`<div class="oa-empty"><strong>Không có yêu cầu chờ duyệt</strong>Mọi tài khoản đang chờ cấp quyền đều sẽ xuất hiện tại đây.</div>`}</div>
      </section>
    </div>`;
    $('oa-refresh')?.addEventListener('click',()=>open(true));
  }
  function alertMsg(text,error=false){const a=$('oa-alert');if(!a)return;a.className='oa-alert '+(error?'error':'success');a.textContent=text||'';}
  async function review(id,decision){
    const item=document.querySelector(`[data-request="${CSS.escape(String(id))}"]`); if(!item)return;
    const note=item.querySelector('[data-note]')?.value.trim()||null;
    const btn=item.querySelector(decision==='APPROVED'?'[data-approve]':'[data-reject]'); if(btn)btn.disabled=true;
    try{
      const {data,error}=await sb.rpc('review_approval_request',{p_request_id:id,p_decision:decision,p_note:note});
      if(error) throw error;
      alertMsg(data?.message|| (decision==='APPROVED'?'Đã duyệt tài khoản.':'Đã từ chối yêu cầu.'));
      await loadRequests(); render();
    }catch(e){alertMsg(String(e.message||e||'Không thể xử lý yêu cầu.'),true);if(btn)btn.disabled=false;}
  }
  async function open(force=false){
    if(!profile) await loadProfile();
    if(!isOwner()) return;
    injectMenu();
    if(force || !active){try{await loadRequests();}catch(e){const box=$('content');if(box)box.innerHTML=`<section class="oa-card"><div class="oa-alert error">${esc(e.message||'Không thể tải yêu cầu cấp quyền.')}</div></section>`;return;}}
    active=true; render();
  }
  document.addEventListener('click',e=>{
    const nav=e.target.closest('[data-page="owner-access-approval"]');
    if(nav){e.preventDefault();e.stopImmediatePropagation();open(true);return;}
    const card=e.target.closest('[data-request]'); if(!card)return;
    if(e.target.closest('[data-approve]')){review(card.dataset.request,'APPROVED');return;}
    if(e.target.closest('[data-reject]')){review(card.dataset.request,'REJECTED');return;}
  },true);
  async function boot(){
    try{ await loadProfile(); if(!isOwner()) return; injectMenu(); await loadRequests(); countBadge(); }
    catch(e){ console.warn('[OWNER APPROVAL]',e); }
  }
  boot();
  setInterval(()=>{ if(isOwner()){ loadRequests().then(countBadge).catch(()=>{}); } },30000);
  window.MAGASIN_OWNER_APPROVAL={open,refresh:()=>open(true)};
})(window,document);
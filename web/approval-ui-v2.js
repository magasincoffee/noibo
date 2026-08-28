/* MAGASIN NOIBO — account approval workflow V2 */
(function(window, document){
  'use strict';
  let ready = false;

  const esc = function(v){
    return String(v == null ? '' : v).replace(/[&<>\"']/g, function(m){
      return {'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;',"'":'&#39;'}[m];
    });
  };

  const supa = function(){ return window.MAGASIN_SUPABASE || null; };

  function profileFromRow(row, authUser){
    row = row || {}; authUser = authUser || {};
    const meta = authUser.user_metadata || {};
    return {
      id: row.id || authUser.id || '',
      username: row.username || meta.username || '',
      name: row.full_name || meta.full_name || row.username || meta.username || '',
      fullName: row.full_name || meta.full_name || '',
      email: row.email || authUser.email || '',
      phone: row.phone || meta.phone || '',
      role: String(row.role || 'STAFF').toUpperCase(),
      status: String(row.status || 'PENDING').toUpperCase(),
      accessScope: row.access_scope || ''
    };
  }

  async function getProfile(session){
    const c = supa();
    if(!c || !session || !session.user) return null;
    const r = await c.from('profiles').select('id,username,full_name,email,phone,role,status,access_scope').eq('id', session.user.id).single();
    if(r.error) throw r.error;
    return profileFromRow(r.data, session.user);
  }

  function showAuth(){
    const a=document.getElementById('authShell'), b=document.getElementById('appShell');
    if(a)a.classList.remove('hidden'); if(b)b.classList.add('hidden');
  }

  function showPending(profile){
    profile=profileFromRow(profile);
    showAuth();
    document.querySelectorAll('.auth-view').forEach(function(v){v.classList.remove('active');});
    let view=document.getElementById('auth-pending');
    if(!view){
      view=document.createElement('section');
      view.id='auth-pending'; view.className='auth-view';
      view.innerHTML='<div class="approval-hero"><div class="approval-icon">⏳</div><div class="approval-kicker">MAGASIN NOIBO</div><h2 class="approval-title">Tài khoản đang chờ duyệt</h2><p class="approval-text">Email của bạn đã được xác thực. Quản lý cần phê duyệt tài khoản trước khi bạn có thể sử dụng hệ thống.</p></div><div class="approval-user-card"><div><span>Họ và tên</span><strong id="pendingUserName"></strong></div><div><span>Tên đăng nhập</span><strong id="pendingUsername"></strong></div><div><span>Email</span><strong id="pendingEmail"></strong></div></div><div id="approvalState" class="approval-state"></div><button id="requestApprovalBtn" class="primary" type="button">Gửi yêu cầu duyệt</button><button id="pendingLogoutBtn" class="approval-secondary" type="button">Đăng xuất</button><p class="approval-help">Bạn chỉ cần gửi yêu cầu một lần. Sau khi được duyệt, hãy đăng nhập lại để vào trang chính.</p>';
      const card=document.querySelector('#authShell .auth-card');
      if(card)card.insertBefore(view,card.querySelector('.auth-footer')||null);
    }
    view.classList.add('active');
    const n=document.getElementById('pendingUserName'), u=document.getElementById('pendingUsername'), e=document.getElementById('pendingEmail');
    if(n)n.textContent=profile.name||'—'; if(u)u.textContent=profile.username||'—'; if(e)e.textContent=profile.email||'—';
    window.MAGASIN_PENDING_PROFILE=profile;
    bindPending(); refreshMyApproval();
  }

  function bindPending(){
    const req=document.getElementById('requestApprovalBtn');
    const out=document.getElementById('pendingLogoutBtn');
    if(req && req.dataset.bound!=='1'){ req.dataset.bound='1'; req.addEventListener('click',submitRequest); }
    if(out && out.dataset.bound!=='1'){ out.dataset.bound='1'; out.addEventListener('click',async function(){try{await supa().auth.signOut();}catch(e){} try{sessionStorage.clear();}catch(e){} location.href=location.origin+location.pathname;}); }
  }

  function showState(status,text){
    const box=document.getElementById('approvalState'); if(!box)return;
    const s=String(status||'INFO').toUpperCase();
    box.className='approval-state '+(s==='ERROR'?'error':'success');
    box.innerHTML='<strong>'+esc(s==='PENDING'?'ĐANG CHỜ DUYỆT':s==='APPROVED'?'ĐÃ ĐƯỢC DUYỆT':s==='REJECTED'?'YÊU CẦU BỊ TỪ CHỐI':'THÔNG TIN')+'</strong><span>'+esc(text||'')+'</span>';
  }

  async function refreshMyApproval(){
    try{
      const r=await supa().rpc('get_my_approval_status');
      if(r.error)throw r.error;
      const q=r.data&&r.data.request; const b=document.getElementById('requestApprovalBtn');
      if(q){
        const st=String(q.status||'').toUpperCase();
        showState(st,st==='PENDING'?'Yêu cầu của bạn đã được gửi và đang chờ quản lý xử lý.':(q.note||'Trạng thái: '+st));
        if(b && st==='PENDING'){b.disabled=true;b.textContent='✓ Đã gửi yêu cầu';}
      }else showState('INFO','Bạn chưa gửi yêu cầu duyệt.');
    }catch(e){showState('ERROR',friendly(e));}
  }

  async function submitRequest(){
    const b=document.getElementById('requestApprovalBtn');
    if(b){b.disabled=true;b.textContent='Đang gửi yêu cầu…';}
    try{
      const r=await supa().rpc('submit_approval_request');
      if(r.error)throw r.error;
      const d=r.data||{}; showState(d.status||'PENDING',d.message||'Đã gửi yêu cầu duyệt.');
      if(b){b.disabled=true;b.textContent='✓ Đã gửi yêu cầu';}
    }catch(e){
      showState('ERROR',friendly(e));
      if(b){b.disabled=false;b.textContent='Gửi yêu cầu duyệt';}
    }
  }

  function friendly(e){
    const m=String((e&&e.message)||e||'');
    if(m.includes('EMAIL_NOT_CONFIRMED'))return 'Email chưa được xác thực. Hãy mở thư xác nhận rồi thử lại.';
    if(m.includes('NOT_AUTHENTICATED'))return 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.';
    if(m.includes('FORBIDDEN'))return 'Bạn không có quyền thực hiện thao tác này.';
    if(m.includes('REQUEST_ALREADY_REVIEWED'))return 'Yêu cầu này đã được xử lý.';
    return m||'Không thể thực hiện thao tác.';
  }

  function styles(){
    if(document.getElementById('magasinApprovalV2Styles'))return;
    const s=document.createElement('style'); s.id='magasinApprovalV2Styles';
    s.textContent='.approval-hero{text-align:center;margin:4px 0 20px}.approval-icon{width:62px;height:62px;margin:0 auto 12px;border-radius:18px;display:grid;place-items:center;background:#fff7ed;color:#d97706;font-size:28px}.approval-kicker{font-size:11px;letter-spacing:.12em;color:#72e1df;font-weight:700}.approval-title{margin:8px 0;font-size:24px;color:#fff}.approval-text{margin:0;color:#c4d0df;font-size:13px;line-height:1.7}.approval-user-card{display:grid;gap:10px;margin:18px 0;padding:14px;border-radius:14px;background:#ffffff09;border:1px solid #ffffff16}.approval-user-card span{display:block;color:#91a3ba;font-size:11px;margin-bottom:3px}.approval-user-card strong{display:block;color:#fff;font-size:13px;word-break:break-word}.approval-state{display:grid;gap:4px;margin:14px 0;padding:13px 14px;border-radius:12px;background:#ffffff09;border:1px solid #ffffff14;text-align:left}.approval-state strong{font-size:11px;letter-spacing:.06em;color:#8ff0cb}.approval-state span{font-size:12px;color:#d3dce8;line-height:1.55}.approval-state.error{background:#7f1d1d22;border-color:#f59e0b55}.approval-state.error strong{color:#ffd49b}.approval-secondary{width:100%;height:46px;margin-top:10px;border:1px solid #ffffff20;border-radius:11px;background:#ffffff08;color:#dce5f0;font-weight:700;cursor:pointer}.approval-help{margin:14px 0 0;text-align:center;color:#91a3ba;font-size:11px;line-height:1.6}.approval-admin-head{display:flex;justify-content:space-between;gap:16px;align-items:flex-start;margin-bottom:20px}.approval-admin-head h2{margin:4px 0 5px}.approval-admin-head p{margin:0}.approval-refresh{border:1px solid #dbe3eb;background:#fff;border-radius:10px;padding:9px 13px;color:#1f3a56;font-weight:700;cursor:pointer}.approval-admin-list{display:grid;gap:12px}.approval-admin-card{border:1px solid #e3e9ef;border-radius:15px;padding:17px;background:#fff}.approval-admin-main{display:flex;align-items:center;gap:12px}.approval-admin-avatar{width:42px;height:42px;border-radius:50%;display:grid;place-items:center;background:#16c3c5;color:#fff;font-weight:800}.approval-admin-main h3{margin:0;font-size:15px;color:#16324f}.approval-admin-main p{margin:3px 0 0;color:#76869a;font-size:12px}.approval-badge{margin-left:auto;border-radius:999px;padding:5px 9px;background:#fff7ed;color:#b45309;font-size:10px;font-weight:800}.approval-admin-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:10px;margin:14px 0}.approval-admin-grid>div{padding:11px;border-radius:11px;background:#f8fafc}.approval-admin-grid span{display:block;color:#8190a3;font-size:10px;margin-bottom:4px}.approval-admin-grid strong{display:block;color:#27445f;font-size:12px;word-break:break-word}.approval-admin-actions{display:flex;gap:9px}.approval-admin-actions button{height:42px;border-radius:10px;padding:0 14px;font-weight:700;cursor:pointer}.approve-btn{border:0;background:#16c3c5;color:#fff}.reject-btn{border:1px solid #f1c7c7;background:#fff;color:#b42318}.approval-empty{padding:34px;text-align:center;border:1px dashed #d7e0e8;border-radius:14px;display:grid;gap:7px}.approval-empty-icon{margin:auto;width:42px;height:42px;border-radius:50%;display:grid;place-items:center;background:#ecfdf5;color:#059669;font-weight:800}.approval-empty strong{color:#1f3a56}.approval-empty span{font-size:12px;color:#7b8b9f}@media(max-width:700px){.approval-admin-grid{grid-template-columns:1fr}.approval-admin-head{display:block}.approval-refresh{margin-top:12px}.approval-admin-actions{display:grid;grid-template-columns:1fr 1fr}.approval-badge{display:none}}';
    document.head.appendChild(s);
  }

  async function installApiGuard(){
    const api=window.MAGASIN_API, c=supa();
    if(!api||!c||api.__approvalV2)return;
    const base=api.call.bind(api);
    api.__approvalV2=true;
    api.call=async function(action,payload){
      const name=String(action||'');
      if(name==='login'){
        const p=payload||{}; const username=String(p.username||'').trim(); const password=String(p.password||'');
        if(!username||!password)throw new Error('Vui lòng nhập tên đăng nhập và mật khẩu.');
        const er=username.includes('@')?{data:username,error:null}:await c.rpc('resolve_login_email',{p_username:username});
        if(er.error)throw new Error('Không thể tra cứu tên đăng nhập. '+er.error.message);
        if(!er.data)throw new Error('Tên đăng nhập không tồn tại.');
        const s=await c.auth.signInWithPassword({email:String(er.data),password});
        if(s.error)throw new Error('Tên đăng nhập hoặc mật khẩu không đúng.');
        const profile=await getProfile(s.data&&s.data.session);
        const token=s.data&&s.data.session&&s.data.session.access_token||'';
        if(api.setSessionToken)api.setSessionToken(token);
        if(profile.status==='PENDING'){
          window.dispatchEvent(new CustomEvent('magasin:pending-user',{detail:profile}));
          return {ok:false,pending:true,message:'Tài khoản đã xác thực nhưng đang chờ quản lý kích hoạt.',data:{user:profile,sessionToken:token}};
        }
        if(profile.status!=='ACTIVE'){
          try{await c.auth.signOut();}catch(e){} if(api.clearSession)api.clearSession();
          throw new Error('Tài khoản MAGASIN đang bị vô hiệu hóa.');
        }
        return {ok:true,user:profile,sessionToken:token,data:{user:profile,sessionToken:token}};
      }
      if(name==='getSession'){
        const sr=await c.auth.getSession(); if(sr.error)throw sr.error;
        const session=sr.data&&sr.data.session; if(!session)return {ok:false,message:'Chưa có phiên Supabase.'};
        const profile=await getProfile(session); const token=session.access_token||'';
        if(api.setSessionToken)api.setSessionToken(token);
        if(profile.status==='PENDING'){window.dispatchEvent(new CustomEvent('magasin:pending-user',{detail:profile}));return {ok:true,user:profile,sessionToken:token,data:{user:profile,sessionToken:token}};}
        if(profile.status!=='ACTIVE'){try{await c.auth.signOut();}catch(e){} if(api.clearSession)api.clearSession();return {ok:false,message:'Tài khoản MAGASIN đang bị vô hiệu hóa.'};}
        return {ok:true,user:profile,sessionToken:token,data:{user:profile,sessionToken:token}};
      }
      return base(action,payload);
    };
  }

  function observeOwner(){
    const menu=document.getElementById('drawerMenu'); if(!menu||menu.dataset.approvalV2==='1')return;
    menu.dataset.approvalV2='1';
    new MutationObserver(function(){
      if(menu.querySelector('[data-approval-menu]'))return;
      const role=document.getElementById('userRole');
      if(!role||role.textContent!=='Chủ hệ thống')return;
      const b=document.createElement('button'); b.type='button'; b.className='drawer-btn'; b.dataset.approvalMenu='1'; b.innerHTML='<span>👥</span><span>Yêu cầu duyệt</span>';
      b.addEventListener('click',function(e){e.preventDefault();e.stopPropagation();closeDrawer();document.querySelectorAll('[data-page]').forEach(function(x){x.classList.remove('active');});renderApprovalRequests();});
      menu.appendChild(b);
    }).observe(menu,{childList:true,subtree:true});
  }

  function closeDrawer(){['drawer','overlay','hamburger'].forEach(function(id){const e=document.getElementById(id);if(!e)return;if(id==='drawer')e.classList.remove('open');else if(id==='overlay')e.classList.remove('active');else e.classList.remove('open');});}

  async function renderApprovalRequests(){
    const content=document.getElementById('content'), title=document.getElementById('pageTitle'), desc=document.getElementById('pageDescription');
    if(!content)return;
    try{
      const sr=await supa().auth.getSession(), session=sr.data&&sr.data.session; if(!session)throw new Error('Phiên đăng nhập đã hết hạn.');
      const p=await getProfile(session); if(!p||p.status!=='ACTIVE'||p.role!=='OWNER')throw new Error('Bạn không có quyền truy cập khu vực này.');
      if(title)title.textContent='Duyệt tài khoản'; if(desc)desc.textContent='Xét duyệt yêu cầu truy cập hệ thống';
      content.innerHTML='<section class="card panel"><div class="approval-admin-head"><div><div class="eyebrow">QUẢN TRỊ TRUY CẬP</div><h2>Yêu cầu chờ duyệt</h2><p>Kiểm tra thông tin trước khi kích hoạt tài khoản.</p></div><button id="refreshApprovals" class="approval-refresh" type="button">↻ Làm mới</button></div><div id="approvalAdminList" class="approval-admin-list"><div class="empty">Đang tải…</div></div></section>';
      document.getElementById('refreshApprovals').addEventListener('click',loadApprovals); await loadApprovals();
    }catch(e){content.innerHTML='<section class="card panel"><div class="error-box">'+esc(friendly(e))+'</div></section>';}
  }

  async function loadApprovals(){
    const list=document.getElementById('approvalAdminList'); if(!list)return; list.innerHTML='<div class="empty">Đang tải yêu cầu…</div>';
    try{
      const r=await supa().rpc('list_pending_approval_requests'); if(r.error)throw r.error; const rows=Array.isArray(r.data)?r.data:[];
      if(!rows.length){list.innerHTML='<div class="approval-empty"><div class="approval-empty-icon">✓</div><strong>Không có yêu cầu chờ duyệt</strong><span>Khi nhân viên gửi yêu cầu, hồ sơ sẽ xuất hiện tại đây.</span></div>';return;}
      list.innerHTML=rows.map(function(x){return '<article class="approval-admin-card"><div class="approval-admin-main"><div class="approval-admin-avatar">'+esc((x.full_name||x.username||'?').charAt(0).toUpperCase())+'</div><div><h3>'+esc(x.full_name||'Chưa có tên')+'</h3><p>@'+esc(x.username||'—')+'</p></div><span class="approval-badge">CHỜ DUYỆT</span></div><div class="approval-admin-grid"><div><span>Email</span><strong>'+esc(x.email||'—')+'</strong></div><div><span>Số điện thoại</span><strong>'+esc(x.phone||'—')+'</strong></div><div><span>Ngày gửi</span><strong>'+esc(formatDate(x.requested_at))+'</strong></div></div><div class="approval-admin-actions"><button type="button" class="approve-btn" data-approval="approve" data-id="'+esc(x.id)+'">Duyệt tài khoản</button><button type="button" class="reject-btn" data-approval="reject" data-id="'+esc(x.id)+'">Từ chối</button></div></article>';}).join('');
      list.querySelectorAll('[data-approval]').forEach(function(b){b.addEventListener('click',function(){review(b.dataset.id,b.dataset.approval);});});
    }catch(e){list.innerHTML='<div class="error-box">'+esc(friendly(e))+'</div>';}
  }

  function formatDate(v){const d=new Date(v);return Number.isNaN(d.getTime())?String(v||'—'):d.toLocaleString('vi-VN',{dateStyle:'short',timeStyle:'short'});}

  async function review(id,action){
    let note=''; if(action==='reject')note=window.prompt('Lý do từ chối (không bắt buộc):','')||'';
    try{const r=await supa().rpc('review_approval_request',{p_request_id:id,p_decision:action==='approve'?'APPROVED':'REJECTED',p_note:note});if(r.error)throw r.error;await loadApprovals();}catch(e){window.alert(friendly(e));}
  }

  function init(){
    if(ready||!window.MAGASIN_SUPABASE||!window.MAGASIN_API)return;
    ready=true; styles(); installApiGuard(); observeOwner();
    window.addEventListener('magasin:pending-user',function(e){showPending(e.detail||{});});
    const c=supa();
    c.auth.onAuthStateChange(async function(event,session){
      if(!session)return;
      try{const p=await getProfile(session);if(p&&p.status==='PENDING')showPending(p);else if(p&&p.status==='ACTIVE')observeOwner();}catch(e){}
    });
  }

  (function wait(){if(window.MAGASIN_SUPABASE&&window.MAGASIN_API)init();else setTimeout(wait,100);})();
})(window,document);

/* MAGASIN NOIBO — account approval workflow
 * Loaded by api-config.js so we can add the approval flow without rewriting app.js.
 * Uses Supabase Auth + owner-only PostgreSQL RPCs.
 */
(function(window, document){
  'use strict';

  const SUPABASE_URL = 'https://menvbzlsncmpuvnaifxa.supabase.co';
  const APPROVAL_PAGE = 'approval_requests';
  let initialized = false;
  let originalApiCall = null;

  const esc = function(v){
    return String(v == null ? '' : v).replace(/[&<>\"']/g, function(m){
      return {'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;',"'":'&#39;'}[m];
    });
  };

  function client(){
    return window.MAGASIN_SUPABASE || null;
  }

  function authUserSnapshot(user){
    user = user || {};
    return {
      id: user.id || '',
      username: (user.username || (user.user_metadata && user.user_metadata.username) || '').trim(),
      name: user.name || user.fullName || (user.user_metadata && user.user_metadata.full_name) || user.username || '',
      fullName: user.fullName || user.name || (user.user_metadata && user.user_metadata.full_name) || '',
      email: user.email || '',
      phone: user.phone || (user.user_metadata && user.user_metadata.phone) || '',
      role: String(user.role || 'STAFF').toUpperCase(),
      status: String(user.status || 'PENDING').toUpperCase(),
      accessScope: user.accessScope || ''
    };
  }

  function setAuthMessage(text, error){
    const el = document.getElementById('authMessage');
    if(!el) return;
    el.textContent = text || '';
    el.className = 'message ' + (error ? 'error' : 'success');
  }

  function showAuthShell(){
    const auth = document.getElementById('authShell');
    const app = document.getElementById('appShell');
    if(auth) auth.classList.remove('hidden');
    if(app) app.classList.add('hidden');
  }

  function showPendingScreen(profile){
    profile = authUserSnapshot(profile);
    showAuthShell();

    document.querySelectorAll('.auth-view').forEach(function(v){
      v.classList.remove('active');
    });

    let view = document.getElementById('auth-pending');
    if(!view){
      view = document.createElement('section');
      view.id = 'auth-pending';
      view.className = 'auth-view';
      view.innerHTML = '' +
        '<div class="approval-hero">' +
          '<div class="approval-icon" aria-hidden="true">⏳</div>' +
          '<div class="approval-kicker">MAGASIN NOIBO</div>' +
          '<h2 class="approval-title">Tài khoản đang chờ duyệt</h2>' +
          '<p class="approval-text">Email của bạn đã được xác thực. Tài khoản cần quản lý phê duyệt trước khi bạn có thể truy cập hệ thống.</p>' +
        '</div>' +
        '<div class="approval-user-card">' +
          '<div><span>Nhân viên</span><strong id="pendingUserName"></strong></div>' +
          '<div><span>Tên đăng nhập</span><strong id="pendingUsername"></strong></div>' +
          '<div><span>Email</span><strong id="pendingEmail"></strong></div>' +
        '</div>' +
        '<div id="approvalState" class="approval-state"></div>' +
        '<button id="requestApprovalBtn" class="primary" type="button">Gửi yêu cầu duyệt</button>' +
        '<button id="pendingLogoutBtn" class="approval-secondary" type="button">Đăng xuất</button>' +
        '<p class="approval-help">Sau khi gửi yêu cầu, bạn có thể đóng trang. Khi được duyệt, hãy đăng nhập lại để vào hệ thống.</p>';
      const shell = document.getElementById('authShell');
      const card = shell && shell.querySelector('.auth-card');
      if(card){
        const footer = card.querySelector('.auth-footer');
        card.insertBefore(view, footer || null);
      }
      bindPendingEvents();
    }

    view.classList.add('active');
    const name = document.getElementById('pendingUserName');
    const username = document.getElementById('pendingUsername');
    const email = document.getElementById('pendingEmail');
    if(name) name.textContent = profile.name || 'Nhân viên';
    if(username) username.textContent = profile.username || '—';
    if(email) email.textContent = profile.email || '—';

    window.MAGASIN_PENDING_PROFILE = profile;
    updateApprovalState(profile);
  }

  function bindPendingEvents(){
    const requestBtn = document.getElementById('requestApprovalBtn');
    const logoutBtn = document.getElementById('pendingLogoutBtn');

    if(requestBtn && requestBtn.dataset.bound !== '1'){
      requestBtn.dataset.bound = '1';
      requestBtn.addEventListener('click', requestApproval);
    }
    if(logoutBtn && logoutBtn.dataset.bound !== '1'){
      logoutBtn.dataset.bound = '1';
      logoutBtn.addEventListener('click', async function(){
        try{
          if(client()) await client().auth.signOut();
        }catch(err){}
        window.MAGASIN_PENDING_PROFILE = null;
        location.href = location.origin + location.pathname;
      });
    }
  }

  async function readApprovalStatus(){
    const c = client();
    if(!c) throw new Error('Supabase client chưa sẵn sàng.');
    const result = await c.rpc('get_my_approval_status');
    if(result.error) throw result.error;
    return result.data || {};
  }

  async function requestApproval(){
    const btn = document.getElementById('requestApprovalBtn');
    if(btn){ btn.disabled = true; btn.textContent = 'Đang gửi yêu cầu…'; }

    try{
      const c = client();
      if(!c) throw new Error('Supabase client chưa sẵn sàng.');
      const result = await c.rpc('submit_approval_request');
      if(result.error) throw result.error;
      const data = result.data || {};
      showApprovalState(data.status || 'PENDING', data.message || 'Đã gửi yêu cầu duyệt.');
      if(btn){
        btn.textContent = '✓ Đã gửi yêu cầu';
        btn.disabled = true;
      }
    }catch(err){
      showApprovalState('ERROR', friendlyApprovalError(err));
      if(btn){ btn.disabled = false; btn.textContent = 'Gửi yêu cầu duyệt'; }
    }
  }

  function friendlyApprovalError(err){
    const msg = String((err && err.message) || err || '');
    if(msg.indexOf('EMAIL_NOT_CONFIRMED') !== -1) return 'Email chưa được xác thực. Hãy mở email xác nhận rồi thử lại.';
    if(msg.indexOf('PROFILE_NOT_FOUND') !== -1) return 'Không tìm thấy hồ sơ MAGASIN của tài khoản này.';
    if(msg.indexOf('NOT_AUTHENTICATED') !== -1) return 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.';
    return msg || 'Không thể gửi yêu cầu duyệt.';
  }

  function showApprovalState(status, message){
    const box = document.getElementById('approvalState');
    if(!box) return;
    const s = String(status || '').toUpperCase();
    box.className = 'approval-state ' + (s === 'ERROR' ? 'error' : 'success');
    box.innerHTML = '<strong>' + esc(s === 'PENDING' ? 'ĐANG CHỜ DUYỆT' : s === 'APPROVED' ? 'ĐÃ ĐƯỢC DUYỆT' : s === 'REJECTED' ? 'YÊU CẦU BỊ TỪ CHỐI' : 'THÔNG BÁO') + '</strong><span>' + esc(message || '') + '</span>';
  }

  async function updateApprovalState(profile){
    try{
      const data = await readApprovalStatus();
      const request = data.request || null;
      if(request){
        showApprovalState(request.status, request.status === 'PENDING'
          ? 'Yêu cầu của bạn đã được gửi và đang chờ quản lý xử lý.'
          : request.note || ('Trạng thái yêu cầu: ' + request.status));
        const btn = document.getElementById('requestApprovalBtn');
        if(btn && String(request.status).toUpperCase() === 'PENDING'){
          btn.disabled = true;
          btn.textContent = '✓ Đã gửi yêu cầu';
        }
      }else{
        showApprovalState(profile.status === 'ACTIVE' ? 'APPROVED' : 'INFO',
          profile.status === 'ACTIVE' ? 'Tài khoản đã được kích hoạt.' : 'Bạn chưa gửi yêu cầu duyệt.');
      }
    }catch(err){
      showApprovalState('ERROR', friendlyApprovalError(err));
    }
  }

  function injectStyles(){
    if(document.getElementById('magasinApprovalStyles')) return;
    const style = document.createElement('style');
    style.id = 'magasinApprovalStyles';
    style.textContent = '' +
      '.approval-hero{text-align:center;margin:4px 0 20px}' +
      '.approval-icon{width:62px;height:62px;margin:0 auto 12px;border-radius:18px;display:grid;place-items:center;background:#fff7ed;color:#d97706;font-size:28px;box-shadow:0 10px 26px #0002}' +
      '.approval-kicker{font-size:11px;letter-spacing:.12em;color:#72e1df;font-weight:700}' +
      '.approval-title{margin:8px 0 8px;font-size:24px;color:#fff}' +
      '.approval-text{margin:0;color:#c4d0df;font-size:13px;line-height:1.7}' +
      '.approval-user-card{display:grid;gap:9px;margin:18px 0;padding:14px;border-radius:14px;background:#ffffff09;border:1px solid #ffffff16}' +
      '.approval-user-card span{display:block;color:#91a3ba;font-size:11px;margin-bottom:3px}' +
      '.approval-user-card strong{display:block;color:#fff;font-size:13px;word-break:break-word}' +
      '.approval-state{display:grid;gap:4px;margin:14px 0;padding:13px 14px;border-radius:12px;background:#ffffff09;border:1px solid #ffffff14;text-align:left}' +
      '.approval-state strong{font-size:11px;letter-spacing:.06em;color:#8ff0cb}' +
      '.approval-state span{font-size:12px;color:#d3dce8;line-height:1.55}' +
      '.approval-state.error{background:#7f1d1d22;border-color:#f59e0b55}' +
      '.approval-state.error strong{color:#ffd49b}' +
      '.approval-secondary{width:100%;height:46px;margin-top:10px;border:1px solid #ffffff20;border-radius:11px;background:#ffffff08;color:#dce5f0;font-weight:700;cursor:pointer}' +
      '.approval-secondary:hover{background:#ffffff12}' +
      '.approval-help{margin:14px 0 0;text-align:center;color:#91a3ba;font-size:11px;line-height:1.6}';
    document.head.appendChild(style);
  }

  async function getLoginProfileFromSession(c, session){
    const user = session && session.user;
    if(!user) return null;
    const result = await c.from('profiles')
      .select('id,username,full_name,email,phone,role,status,access_scope')
      .eq('id', user.id)
      .single();
    if(result.error) throw result.error;
    const p = result.data || {};
    return authUserSnapshot({
      id:p.id,
      username:p.username,
      fullName:p.full_name,
      email:p.email || user.email,
      phone:p.phone,
      role:p.role,
      status:p.status,
      accessScope:p.access_scope
    });
  }

  function wrapApiForPending(){
    const api = window.MAGASIN_API;
    const c = client();
    if(!api || !c || api.__approvalWrapped) return;
    originalApiCall = api.call.bind(api);

    api.call = async function(action, payload){
      const name = String(action || '');
      if(name !== 'login' && name !== 'getSession'){
        return originalApiCall(action, payload);
      }

      const result = await originalApiCall(action, payload);
      const data = result && result.data !== undefined ? result.data : result;
      const profile = data && data.user;
      if(profile && String(profile.status || '').toUpperCase() === 'PENDING'){
        window.dispatchEvent(new CustomEvent('magasin:pending-user', {detail: profile}));
        if(name === 'getSession'){
          return result;
        }
        return {
          ok: false,
          pending: true,
          message: 'Tài khoản đã xác thực nhưng đang chờ quản lý kích hoạt.',
          data: { user: profile, sessionToken: data.sessionToken || '' }
        };
      }
      return result;
    };
    api.__approvalWrapped = true;
  }

  function patchManagerMenu(){
    const menu = document.getElementById('drawerMenu');
    if(!menu) return;
    const role = String((window.MAGASIN_PENDING_PROFILE && window.MAGASIN_PENDING_PROFILE.role) || '').toUpperCase();
    if(role === 'OWNER') return;
  }

  async function renderApprovalRequests(){
    const app = document.getElementById('appShell');
    const content = document.getElementById('content');
    const title = document.getElementById('pageTitle');
    const description = document.getElementById('pageDescription');
    if(!app || !content) return;

    try{
      const c = client();
      const sessionResult = await c.auth.getSession();
      const session = sessionResult.data && sessionResult.data.session;
      if(!session) throw new Error('Phiên đăng nhập đã hết hạn.');
      const profile = await getLoginProfileFromSession(c, session);
      if(profile.role !== 'OWNER') throw new Error('Bạn không có quyền truy cập khu vực này.');

      if(title) title.textContent = 'Duyệt tài khoản';
      if(description) description.textContent = 'Xét duyệt yêu cầu truy cập hệ thống';
      content.innerHTML = '<section class="card panel"><div class="approval-admin-head"><div><div class="eyebrow">QUẢN TRỊ TRUY CẬP</div><h2>Yêu cầu chờ duyệt</h2><p>Kiểm tra hồ sơ trước khi kích hoạt quyền truy cập.</p></div><button id="refreshApprovals" class="approval-refresh" type="button">↻ Làm mới</button></div><div id="approvalAdminList" class="approval-admin-list"><div class="empty">Đang tải…</div></div></section>';
      const refresh = document.getElementById('refreshApprovals');
      if(refresh) refresh.addEventListener('click', loadApprovalRequests);
      await loadApprovalRequests();
    }catch(err){
      content.innerHTML = '<section class="card panel"><div class="error-box">' + esc(friendlyApprovalError(err)) + '</div></section>';
    }
  }

  async function loadApprovalRequests(){
    const list = document.getElementById('approvalAdminList');
    if(!list) return;
    list.innerHTML = '<div class="empty">Đang tải yêu cầu…</div>';
    try{
      const c = client();
      const result = await c.rpc('list_pending_approval_requests');
      if(result.error) throw result.error;
      const rows = Array.isArray(result.data) ? result.data : [];
      if(!rows.length){
        list.innerHTML = '<div class="approval-empty"><div class="approval-empty-icon">✓</div><strong>Không có yêu cầu chờ duyệt</strong><span>Khi nhân viên gửi yêu cầu, hồ sơ sẽ xuất hiện tại đây.</span></div>';
        return;
      }
      list.innerHTML = rows.map(function(row){
        return '<article class="approval-admin-card" data-request-id="'+esc(row.id)+'">' +
          '<div class="approval-admin-main"><div class="approval-admin-avatar">'+esc((row.full_name || row.username || '?').charAt(0).toUpperCase())+'</div><div><h3>'+esc(row.full_name || 'Chưa có tên')+'</h3><p>@'+esc(row.username || '—')+'</p></div><span class="approval-badge">CHỜ DUYỆT</span></div>' +
          '<div class="approval-admin-grid"><div><span>Email</span><strong>'+esc(row.email || '—')+'</strong></div><div><span>Số điện thoại</span><strong>'+esc(row.phone || '—')+'</strong></div><div><span>Ngày gửi</span><strong>'+esc(formatDateTime(row.requested_at))+'</strong></div></div>' +
          '<div class="approval-admin-actions"><button type="button" class="approve-btn" data-action="approve" data-id="'+esc(row.id)+'">Duyệt tài khoản</button><button type="button" class="reject-btn" data-action="reject" data-id="'+esc(row.id)+'">Từ chối</button></div>' +
        '</article>';
      }).join('');

      list.querySelectorAll('[data-action]').forEach(function(button){
        button.addEventListener('click', function(){
          reviewRequest(button.dataset.id, button.dataset.action);
        });
      });
    }catch(err){
      list.innerHTML = '<div class="error-box">'+esc(friendlyApprovalError(err))+'</div>';
    }
  }

  function formatDateTime(value){
    if(!value) return '—';
    const d = new Date(value);
    if(Number.isNaN(d.getTime())) return String(value);
    return d.toLocaleString('vi-VN',{dateStyle:'short',timeStyle:'short'});
  }

  async function reviewRequest(id, decision){
    let note = '';
    if(decision === 'reject'){
      note = window.prompt('Lý do từ chối (không bắt buộc):', '') || '';
    }
    const c = client();
    if(!c) return;
    try{
      const result = await c.rpc('review_approval_request', {
        p_request_id: id,
        p_decision: decision === 'approve' ? 'APPROVED' : 'REJECTED',
        p_note: note
      });
      if(result.error) throw result.error;
      await loadApprovalRequests();
    }catch(err){
      alert(friendlyApprovalError(err));
    }
  }

  function injectAdminStyles(){
    if(document.getElementById('magasinApprovalAdminStyles')) return;
    const style = document.createElement('style');
    style.id = 'magasinApprovalAdminStyles';
    style.textContent = '' +
      '.approval-admin-head{display:flex;justify-content:space-between;gap:16px;align-items:flex-start;margin-bottom:20px}' +
      '.approval-admin-head h2{margin:4px 0 5px}' +
      '.approval-admin-head p{margin:0}' +
      '.approval-refresh{border:1px solid #dbe3eb;background:#fff;border-radius:10px;padding:9px 13px;color:#1f3a56;font-weight:700;cursor:pointer}' +
      '.approval-admin-list{display:grid;gap:12px}' +
      '.approval-admin-card{border:1px solid #e3e9ef;border-radius:15px;padding:17px;background:#fff}' +
      '.approval-admin-main{display:flex;align-items:center;gap:12px}' +
      '.approval-admin-avatar{width:42px;height:42px;border-radius:50%;display:grid;place-items:center;background:#16c3c5;color:#fff;font-weight:800}' +
      '.approval-admin-main h3{margin:0;font-size:15px;color:#16324f}' +
      '.approval-admin-main p{margin:3px 0 0;color:#76869a;font-size:12px}' +
      '.approval-badge{margin-left:auto;border-radius:999px;padding:5px 9px;background:#fff7ed;color:#b45309;font-size:10px;font-weight:800}' +
      '.approval-admin-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:10px;margin:14px 0}' +
      '.approval-admin-grid>div{padding:11px;border-radius:11px;background:#f8fafc}' +
      '.approval-admin-grid span{display:block;color:#8190a3;font-size:10px;margin-bottom:4px}' +
      '.approval-admin-grid strong{display:block;color:#27445f;font-size:12px;word-break:break-word}' +
      '.approval-admin-actions{display:flex;gap:9px}' +
      '.approval-admin-actions button{height:42px;border-radius:10px;padding:0 14px;font-weight:700;cursor:pointer}' +
      '.approve-btn{border:0;background:#16c3c5;color:#fff}' +
      '.reject-btn{border:1px solid #f1c7c7;background:#fff;color:#b42318}' +
      '.approval-empty{padding:34px;text-align:center;border:1px dashed #d7e0e8;border-radius:14px;display:grid;gap:7px}' +
      '.approval-empty-icon{margin:auto;width:42px;height:42px;border-radius:50%;display:grid;place-items:center;background:#ecfdf5;color:#059669;font-weight:800}' +
      '.approval-empty strong{color:#1f3a56}' +
      '.approval-empty span{font-size:12px;color:#7b8b9f}' +
      '@media(max-width:700px){.approval-admin-grid{grid-template-columns:1fr}.approval-admin-head{display:block}.approval-refresh{margin-top:12px}.approval-admin-actions{display:grid;grid-template-columns:1fr 1fr}.approval-badge{display:none}}';
    document.head.appendChild(style);
  }

  function addOwnerMenuItem(){
    const menu = document.getElementById('drawerMenu');
    if(!menu || menu.querySelector('[data-approval-menu]')) return;
    const ownerText = document.getElementById('userRole');
    if(!ownerText || ownerText.textContent !== 'Chủ hệ thống') return;
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'drawer-btn';
    button.setAttribute('data-approval-menu','1');
    button.innerHTML = '<span>👥</span><span>Yêu cầu duyệt</span>';
    button.addEventListener('click', function(e){
      e.preventDefault();
      e.stopPropagation();
      const drawer=document.getElementById('drawer');
      const overlay=document.getElementById('overlay');
      const hamburger=document.getElementById('hamburger');
      if(drawer)drawer.classList.remove('open');
      if(overlay)overlay.classList.remove('active');
      if(hamburger)hamburger.classList.remove('open');
      document.querySelectorAll('[data-page]').forEach(function(x){x.classList.remove('active');});
      renderApprovalRequests();
    });
    menu.appendChild(button);
  }

  function observeMenu(){
    const menu = document.getElementById('drawerMenu');
    if(!menu || menu.dataset.approvalObserver === '1') return;
    menu.dataset.approvalObserver = '1';
    new MutationObserver(function(){ addOwnerMenuItem(); }).observe(menu,{childList:true,subtree:true});
    addOwnerMenuItem();
  }

  function handlePendingEvent(event){
    const profile = event.detail || {};
    showPendingScreen(profile);
  }

  function init(){
    if(initialized) return;
    if(!window.MAGASIN_SUPABASE || !window.MAGASIN_API) return;
    initialized = true;
    injectStyles();
    injectAdminStyles();
    wrapApiForPending();
    observeMenu();
    window.addEventListener('magasin:pending-user', handlePendingEvent);

    window.addEventListener('load', function(){
      observeMenu();
      setTimeout(observeMenu, 500);
    });

    const c = client();
    if(c){
      c.auth.onAuthStateChange(async function(event, session){
        if((event === 'SIGNED_IN' || event === 'INITIAL_SESSION') && session){
          try{
            const profile = await getLoginProfileFromSession(c, session);
            if(profile && profile.status === 'PENDING') showPendingScreen(profile);
            if(profile && profile.status === 'ACTIVE') observeMenu();
          }catch(err){}
        }
      });
    }
  }

  function waitForDependencies(){
    if(window.MAGASIN_SUPABASE && window.MAGASIN_API){
      init();
      return;
    }
    setTimeout(waitForDependencies, 100);
  }

  waitForDependencies();
})(window, document);

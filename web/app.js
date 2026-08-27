/* MAGASIN GitHub Frontend — production client
 * No google.script.run here. All backend calls go through web/api.js.
 */
(function(){
  'use strict';

  const KEY_PAGE='magasin_current_page';
  const KEY_STATE='magasin_page_state';
  const $=s=>document.querySelector(s);
  const esc=v=>String(v==null?'':v).replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));

  function resultData(r){ return r&&r.data ? r.data : r; }
  function messageOf(r){
    return String((r&&r.message)||((r&&r.data)&&r.data.message)||'');
  }
  function isOk(r){ return !!(r&&r.ok!==false && (!r.data || r.data.ok!==false)); }

  const PAGES={
    dashboard:['Tổng quan','Tổng quan hoạt động hệ thống'],
    schedule:['Nhân viên','Quản lý công việc cá nhân'],
    attendance:['Nhân viên','Theo dõi giờ công và lịch sử chấm công'],
    swap:['Nhân viên','Đổi ca làm việc'],
    inventory:['Kho hàng','Quản lý hàng hóa và tồn kho'],
    account:['Tài khoản','Thông tin cá nhân và bảo mật tài khoản'],
    reports:['Báo cáo','Theo dõi dữ liệu hoạt động'],
    settings:['Cài đặt','Thiết lập hệ thống']
  };

  let user=null;

  function showMessage(text,error){
    const el=$('#authMessage');
    if(!el)return;
    el.textContent=text||'';
    el.className='auth-message '+(error?'error':'success');
  }

  function showAuthView(name){
    document.querySelectorAll('.auth-view').forEach(v=>v.classList.toggle('active',v.id===`auth-${name}`));
    showMessage('');
  }

  function setBusy(btn,busy,label){
    if(!btn)return;
    if(busy){btn.disabled=true;btn.dataset.label=btn.textContent;btn.textContent=label||'Đang xử lý…';}
    else{btn.disabled=false;btn.textContent=btn.dataset.label||btn.textContent;}
  }

  async function login(e){
    e.preventDefault();
    const f=e.currentTarget, btn=f.querySelector('button[type=submit]');
    setBusy(btn,true,'Đang đăng nhập…');
    showMessage('');
    try{
      const r=await window.MAGASIN_API.call('login',{username:f.username.value.trim(),password:f.password.value});
      if(!isOk(r)) throw new Error(messageOf(r)||'Tên đăng nhập hoặc mật khẩu không đúng.');
      const d=resultData(r);
      user=d.user||null;
      const token=d.sessionToken||window.MAGASIN_API.getSessionToken();
      if(!token) throw new Error('Đăng nhập thành công nhưng chưa nhận được session token.');
      sessionStorage.setItem('magasin_user_snapshot',JSON.stringify(user||{}));
      openApp(user, restorePage());
    }catch(err){ showMessage(err.message||'Không thể đăng nhập.',true); }
    finally{ setBusy(btn,false); }
  }

  async function register(e){
    e.preventDefault();
    const f=e.currentTarget, btn=f.querySelector('button[type=submit]');
    setBusy(btn,true,'Gửi mã xác thực…');
    try{
      const r=await window.MAGASIN_API.call('registerUser',{
        fullName:f.fullName.value.trim(),phone:f.phone.value.trim(),email:f.email.value.trim(),
        username:f.username.value.trim(),password:f.password.value
      });
      if(!isOk(r)) throw new Error(messageOf(r)||'Không thể đăng ký.');
      const d=resultData(r);
      $('#verifyEmailValue').textContent=d.email||f.email.value.trim();
      sessionStorage.setItem('magasin_pending_email',d.email||f.email.value.trim());
      showAuthView('verify'); showMessage(messageOf(r)||'Mã xác thực đã được gửi.');
    }catch(err){showMessage(err.message,true);}finally{setBusy(btn,false);}
  }

  async function verify(e){
    e.preventDefault();
    const f=e.currentTarget, btn=f.querySelector('button[type=submit]');
    setBusy(btn,true,'Đang xác thực…');
    try{
      const email=sessionStorage.getItem('magasin_pending_email')||'';
      const r=await window.MAGASIN_API.call('verifyEmail',{email,code:f.code.value.trim()});
      if(!isOk(r)) throw new Error(messageOf(r)||'Mã xác thực không đúng.');
      showAuthView('login'); showMessage(messageOf(r)||'Xác thực thành công.');
    }catch(err){showMessage(err.message,true);}finally{setBusy(btn,false);}
  }

  async function forgot(e){
    e.preventDefault();
    const f=e.currentTarget, btn=f.querySelector('button[type=submit]');
    setBusy(btn,true,'Gửi hướng dẫn…');
    try{
      const r=await window.MAGASIN_API.call('requestPasswordReset',{email:f.email.value.trim()});
      if(!isOk(r)) throw new Error(messageOf(r)||'Không thể xử lý yêu cầu.');
      f.reset(); showMessage(messageOf(r)||'Đã gửi hướng dẫn.');
    }catch(err){showMessage(err.message,true);}finally{setBusy(btn,false);}
  }

  async function resetPassword(e){
    e.preventDefault();
    const f=e.currentTarget, btn=f.querySelector('button[type=submit]');
    if(f.password.value!==f.confirmPassword.value){showMessage('Mật khẩu nhập lại chưa trùng khớp.',true);return;}
    setBusy(btn,true,'Đang cập nhật…');
    try{
      const token=new URLSearchParams(location.search).get('reset')||'';
      const r=await window.MAGASIN_API.call('resetPassword',{token,password:f.password.value,confirmPassword:f.confirmPassword.value});
      if(!isOk(r)) throw new Error(messageOf(r)||'Không thể đổi mật khẩu.');
      history.replaceState({},document.title,location.pathname+location.search.replace(/([?&])reset=[^&]*/,'').replace(/[?&]$/,''));
      showAuthView('login'); showMessage(messageOf(r)||'Đổi mật khẩu thành công.');
    }catch(err){showMessage(err.message,true);}finally{setBusy(btn,false);}
  }

  function restorePage(){
    const page=localStorage.getItem(KEY_PAGE)||'dashboard';
    return PAGES[page]?page:'dashboard';
  }

  function persistPage(page){
    localStorage.setItem(KEY_PAGE,page);
    localStorage.setItem(KEY_STATE,JSON.stringify({page,savedAt:new Date().toISOString()}));
  }

  function updateHeader(page){
    const meta=PAGES[page]||PAGES.dashboard;
    $('#pageTitle').textContent=meta[0];
    $('#pageDescription').textContent=meta[1];
  }

  function setUserUI(){
    if(!user)return;
    const name=user.name||user.username||'Người dùng';
    const role=user.role||'STAFF';
    const label={OWNER:'Chủ hệ thống',STORE_MANAGER:'Quản lý cửa hàng',WAREHOUSE:'Kho hàng',STAFF:'Nhân viên'}[role]||role;
    document.querySelectorAll('[data-user-name]').forEach(e=>e.textContent=name);
    document.querySelectorAll('[data-user-role]').forEach(e=>e.textContent=label);
    const initial=name.charAt(0).toUpperCase();
    document.querySelectorAll('[data-user-avatar]').forEach(e=>e.textContent=initial);

    const staff=role==='STAFF';
    document.querySelectorAll('.staff-only').forEach(e=>e.hidden=!staff);
    document.querySelectorAll('.manager-only').forEach(e=>e.hidden=staff);
  }

  function openApp(u,page){
    user=u||user||{};
    $('#authShell').classList.add('hidden');
    $('#appShell').classList.remove('hidden');
    setUserUI();
    renderPage(page||'dashboard');
  }

  function closeApp(){
    $('#appShell').classList.add('hidden');
    $('#authShell').classList.remove('hidden');
  }

  function renderPage(page){
    if(!PAGES[page])page='dashboard';
    document.querySelectorAll('[data-page]').forEach(b=>b.classList.toggle('active',b.dataset.page===page));
    updateHeader(page); persistPage(page); closeDrawer();
    const box=$('#pageContent');
    box.innerHTML='<div class="loading-card">Đang tải dữ liệu…</div>';

    if(page==='schedule') return renderSchedule(box);
    if(page==='attendance') return renderAttendance(box);
    if(page==='account') return renderAccount(box);
    if(page==='swap') return renderSwap(box);
    if(page==='inventory') return renderSimple(box,'Kho hàng','Khu vực quản lý hàng hóa và tồn kho sẽ được kết nối tiếp theo.');
    if(page==='reports') return renderSimple(box,'Báo cáo','Khu vực báo cáo sẽ sử dụng dữ liệu backend hiện tại.');
    if(page==='settings') return renderSimple(box,'Cài đặt','Khu vực cài đặt hệ thống.');
    return renderDashboard(box);
  }

  function renderDashboard(box){
    box.innerHTML=`<section class="hero-card"><div><div class="eyebrow">MAGASIN NOIBO</div><h1>Xin chào, ${esc(user&&user.name||'bạn')}!</h1><p>Hệ thống nội bộ đang chạy frontend trên GitHub Pages và backend Google Apps Script.</p></div></section>
      <div class="summary-grid"><div class="summary-card"><span>Phiên đăng nhập</span><strong>Đang hoạt động</strong></div><div class="summary-card"><span>Vai trò</span><strong>${esc(user&&user.role||'STAFF')}</strong></div><div class="summary-card"><span>Backend</span><strong>Apps Script</strong></div><div class="summary-card"><span>Frontend</span><strong>GitHub Pages</strong></div></div>`;
  }

  async function renderSchedule(box){
    try{
      const r=await window.MAGASIN_API.call('getMySchedule',{});
      if(!isOk(r))throw new Error(messageOf(r)||'Không tải được lịch làm.');
      const d=resultData(r)||{};
      const rows=Array.isArray(d.schedules)?d.schedules:(Array.isArray(d)?d:[]);
      box.innerHTML=`<div class="section-card"><div class="section-head"><div><h2>Lịch làm việc</h2><p>Lịch chính thức trong tuần và đăng ký ca cho tuần kế tiếp.</p></div></div><div id="scheduleData"></div></div>`;
      const target=$('#scheduleData');
      if(!rows.length){target.innerHTML='<div class="empty-state">Chưa có dữ liệu lịch làm.</div>';return;}
      target.innerHTML=rows.map(x=>`<div class="data-row"><strong>${esc(x.date||x.Ngay||'')}</strong><span>${esc(x.start||x['Giờ bắt đầu']||'')} – ${esc(x.end||x['Giờ kết thúc']||'')}</span><span>${esc(x.store||x['Cửa hàng']||'')}</span></div>`).join('');
    }catch(err){box.innerHTML=`<div class="section-card"><h2>Lịch làm việc</h2><div class="error-box">${esc(err.message)}</div></div>`;}
  }

  async function renderAttendance(box){
    try{
      const r=await window.MAGASIN_API.call('getAttendanceHistory',{});
      if(!isOk(r))throw new Error(messageOf(r)||'Không tải được lịch sử chấm công.');
      const d=resultData(r)||{};
      const rows=Array.isArray(d.records)?d.records:(Array.isArray(d)?d:[]);
      box.innerHTML=`<div class="section-card"><h2>Chấm công</h2><p>Lịch sử chấm công của tài khoản hiện tại.</p><div class="table-wrap">${rows.length?'<table><thead><tr><th>Ngày</th><th>Check-in</th><th>Check-out</th><th>Trạng thái</th></tr></thead><tbody>'+rows.map(x=>`<tr><td>${esc(x.date||x.Ngay||'')}</td><td>${esc(x.checkIn||x['Check-in']||'')}</td><td>${esc(x.checkOut||x['Check-out']||'')}</td><td>${esc(x.status||x['Trạng thái']||'')}</td></tr>`).join('')+'</tbody></table>':'</div><div class="empty-state">Chưa có lịch sử chấm công.</div>'}</div></div>`;
    }catch(err){box.innerHTML=`<div class="section-card"><h2>Chấm công</h2><div class="error-box">${esc(err.message)}</div></div>`;}
  }

  function renderAccount(box){box.innerHTML=`<div class="section-card"><h2>Thông tin cá nhân</h2><div class="profile-grid"><div><span>Họ tên</span><strong>${esc(user&&user.name||'')}</strong></div><div><span>Tên đăng nhập</span><strong>${esc(user&&user.username||'')}</strong></div><div><span>Email</span><strong>${esc(user&&user.email||'')}</strong></div><div><span>Số điện thoại</span><strong>${esc(user&&user.phone||'')}</strong></div></div></div>`;}
  async function renderSwap(box){try{const r=await window.MAGASIN_API.call('getMyShiftSwapRequests',{});const d=resultData(r)||{};const rows=Array.isArray(d.requests)?d.requests:(Array.isArray(d)?d:[]);box.innerHTML=`<div class="section-card"><h2>Đổi ca</h2><p>Danh sách yêu cầu đổi ca của bạn.</p>${rows.length?rows.map(x=>`<div class="data-row"><span>${esc(x.date||x.Ngay||'')}</span><span>${esc(x.status||x.Trạng_thái||x['Trạng thái']||'')}</span></div>`).join(''):'<div class="empty-state">Chưa có yêu cầu đổi ca.</div>'}</div>`;}catch(err){box.innerHTML=`<div class="section-card"><h2>Đổi ca</h2><div class="error-box">${esc(err.message)}</div></div>`;}}
  function renderSimple(box,title,text){box.innerHTML=`<div class="section-card"><h2>${esc(title)}</h2><p>${esc(text)}</p></div>`;}

  function toggleDrawer(){
    $('#drawer').classList.toggle('open');$('#overlay').classList.toggle('active');$('#headerMenuToggle').classList.toggle('open');
  }
  function closeDrawer(){$('#drawer').classList.remove('open');$('#overlay').classList.remove('active');$('#headerMenuToggle').classList.remove('open');}

  async function logout(){
    try{ await window.MAGASIN_API.call('logout',{}); }catch(err){}
    window.MAGASIN_API.clearSession();
    sessionStorage.removeItem('magasin_user_snapshot');
    user=null; closeDrawer(); closeApp(); showAuthView('login'); showMessage('Bạn đã đăng xuất.');
  }

  async function boot(){
    const reset=new URLSearchParams(location.search).get('reset');
    if(reset)showAuthView('reset');

    document.querySelectorAll('[data-auth-view]').forEach(a=>a.addEventListener('click',e=>{e.preventDefault();showAuthView(a.dataset.authView);}));
    $('#loginForm').addEventListener('submit',login); $('#registerForm').addEventListener('submit',register); $('#verifyForm').addEventListener('submit',verify); $('#forgotForm').addEventListener('submit',forgot); $('#resetForm').addEventListener('submit',resetPassword);
    $('#headerMenuToggle').addEventListener('click',toggleDrawer); $('#overlay').addEventListener('click',closeDrawer); $('#sidebarLogoutButton').addEventListener('click',logout);
    document.querySelectorAll('[data-page]').forEach(b=>b.addEventListener('click',()=>renderPage(b.dataset.page)));

    try{const snap=sessionStorage.getItem('magasin_user_snapshot'); if(snap)user=JSON.parse(snap);}catch(err){}
    const token=window.MAGASIN_API.getSessionToken();
    if(token){
      document.documentElement.classList.add('booting');
      try{
        const r=await window.MAGASIN_API.call('getSession',{});
        if(isOk(r)&&resultData(r)&&resultData(r).user){openApp(resultData(r).user,restorePage());}
        else{window.MAGASIN_API.clearSession();}
      }catch(err){/* stay on auth; do not destroy token on transient failure */}
      finally{document.documentElement.classList.remove('booting');}
    }
  }

  window.MAGASIN_WEB={renderPage,logout};
  document.addEventListener('DOMContentLoaded',boot);
})();

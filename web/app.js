/* MAGASIN GitHub Frontend — production client
 * GitHub Pages frontend. All backend calls go through web/api.js.
 * ARCH-06: selectors are aligned with web/index.html.
 */
(function(){
  'use strict';

  const KEY_PAGE = 'magasin_current_page';
  const KEY_STATE = 'magasin_page_state';
  const SNAPSHOT_KEY = 'magasin_user_snapshot';
  const $ = id => document.getElementById(id);
  const esc = v => String(v == null ? '' : v).replace(/[&<>"']/g, m => ({
    '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;'
  }[m]));

  const PAGES = {
    dashboard: ['Tổng quan', 'Tổng quan hoạt động hệ thống'],
    schedule: ['Nhân viên', 'Quản lý công việc cá nhân'],
    attendance: ['Nhân viên', 'Theo dõi giờ công và lịch sử chấm công'],
    swap: ['Nhân viên', 'Đổi ca làm việc'],
    inventory: ['Kho hàng', 'Quản lý hàng hóa và tồn kho'],
    account: ['Tài khoản', 'Thông tin cá nhân và bảo mật tài khoản'],
    reports: ['Báo cáo', 'Theo dõi dữ liệu hoạt động'],
    settings: ['Cài đặt', 'Thiết lập hệ thống']
  };

  let user = null;

  function resultData(r){ return r && r.data !== undefined ? r.data : r; }
  function messageOf(r){ return String((r && r.message) || ((r && r.data) && r.data.message) || ''); }
  function isOk(r){ return !!(r && r.ok !== false && (!r.data || r.data.ok !== false)); }

  function showMessage(text, error){
    const el = $('authMessage');
    if(!el) return;
    el.textContent = text || '';
    el.className = 'message ' + (error ? 'error' : 'success');
  }

  function showAuth(){
    const auth = $('auth');
    const app = $('app');
    if(auth) auth.style.display = 'grid';
    if(app) app.classList.remove('active');
  }

  function hideAuth(){
    const auth = $('auth');
    const app = $('app');
    if(auth) auth.style.display = 'none';
    if(app) app.classList.add('active');
  }

  function setBusy(btn, busy, label){
    if(!btn) return;
    if(busy){
      btn.disabled = true;
      btn.dataset.label = btn.textContent;
      btn.textContent = label || 'Đang xử lý…';
    }else{
      btn.disabled = false;
      btn.textContent = btn.dataset.label || btn.textContent;
    }
  }

  function restorePage(){
    const page = localStorage.getItem(KEY_PAGE) || 'dashboard';
    return PAGES[page] ? page : 'dashboard';
  }

  function persistPage(page){
    try{
      localStorage.setItem(KEY_PAGE, page);
      localStorage.setItem(KEY_STATE, JSON.stringify({page, savedAt:new Date().toISOString()}));
    }catch(err){}
  }

  function updateHeader(page){
    const meta = PAGES[page] || PAGES.dashboard;
    if($('pageTitle')) $('pageTitle').textContent = meta[0];
    if($('pageDescription')) $('pageDescription').textContent = meta[1];
  }

  function role(){
    const raw = String(user && user.role || 'STAFF').toUpperCase();
    if(raw === 'OWNER' || raw === 'CHỦ CỬA HÀNG') return 'OWNER';
    if(raw === 'STORE_MANAGER' || raw === 'MANAGER' || raw === 'QUẢN LÝ CỬA HÀNG') return 'STORE_MANAGER';
    if(raw === 'WAREHOUSE' || raw === 'INVENTORY_MANAGER' || raw === 'QUẢN LÝ KHO') return 'WAREHOUSE';
    return 'STAFF';
  }

  function roleLabel(r){
    return ({
      OWNER:'Chủ hệ thống',
      STORE_MANAGER:'Quản lý cửa hàng',
      WAREHOUSE:'Quản lý kho',
      STAFF:'Nhân viên'
    })[r] || r;
  }

  function setUserUI(){
    if(!user) return;
    const name = user.name || user.fullName || user.username || 'Người dùng';
    const r = role();
    const label = roleLabel(r);

    if($('userName')) $('userName').textContent = name;
    if($('userRole')) $('userRole').textContent = label;
    if($('avatar')) $('avatar').textContent = name.charAt(0).toUpperCase();
    if($('userDot')) $('userDot').title = name;
    if($('userDot')) $('userDot').setAttribute('aria-label', name);
    renderMenu();
  }

  function renderMenu(){
    const el = $('drawerMenu');
    if(!el) return;
    const r = role();
    let html = '<button type="button" class="drawer-btn" data-page="dashboard"><span>🏠</span><span>Tổng quan</span></button>';

    if(r === 'STAFF'){
      html += '<div class="drawer-group open" data-group-container="work">';
      html += '<button type="button" class="drawer-parent" data-group="work"><span> Công việc </span><span class="arrow">›</span></button>';
      html += '<div class="drawer-children">';
      html += menuButton('schedule','📅','Lịch làm');
      html += menuButton('attendance','⏱️','Chấm công');
      html += menuButton('swap','🔄','Đổi ca');
      html += '</div></div>';
      html += menuButton('inventory','📦','Tồn hàng');
      html += menuButton('account','👤','Thông tin cá nhân');
    }else{
      html += menuButton('inventory','📦','Kho hàng');
      html += menuButton('attendance','⏱️','Chấm công');
      if(r === 'OWNER' || r === 'STORE_MANAGER'){
        html += menuButton('reports','📊','Báo cáo');
        html += menuButton('settings','⚙️','Cài đặt');
      }
      html += menuButton('account','👤','Thông tin cá nhân');
    }
    el.innerHTML = html;
  }

  function menuButton(page, icon, label){
    return '<button type="button" class="drawer-btn" data-page="' + page + '"><span>' + icon + '</span><span>' + label + '</span></button>';
  }

  function wireMenuEvents(){
    const menu = $('drawerMenu');
    if(!menu) return;
    menu.addEventListener('click', function(e){
      const groupBtn = e.target.closest('[data-group]');
      if(groupBtn){
        const group = groupBtn.closest('.drawer-group');
        if(group) group.classList.toggle('open');
        return;
      }
      const btn = e.target.closest('[data-page]');
      if(btn){
        renderPage(btn.dataset.page);
      }
    });
  }

  function toggleDrawer(){
    const drawer = $('drawer');
    const overlay = $('overlay');
    const hamburger = $('hamburger');
    if(!drawer || !overlay) return;
    drawer.classList.toggle('open');
    overlay.classList.toggle('active');
    if(hamburger) hamburger.classList.toggle('open');
  }

  function closeDrawer(){
    const drawer = $('drawer');
    const overlay = $('overlay');
    const hamburger = $('hamburger');
    if(drawer) drawer.classList.remove('open');
    if(overlay) overlay.classList.remove('active');
    if(hamburger) hamburger.classList.remove('open');
  }

  async function login(e){
    e.preventDefault();
    const form = e.currentTarget;
    const btn = form.querySelector('button[type="submit"]');
    setBusy(btn,true,'Đang đăng nhập…');
    showMessage('');
    try{
      const r = await window.MAGASIN_API.call('login', {
        username: ($('username') && $('username').value || '').trim(),
        password: ($('password') && $('password').value || '')
      });
      if(!isOk(r)) throw new Error(messageOf(r) || 'Tên đăng nhập hoặc mật khẩu không đúng.');
      const d = resultData(r) || {};
      user = d.user || null;
      const token = d.sessionToken || window.MAGASIN_API.getSessionToken();
      if(!token) throw new Error('Đăng nhập thành công nhưng chưa nhận được session token.');
      try{ sessionStorage.setItem(SNAPSHOT_KEY, JSON.stringify(user || {})); }catch(err){}
      openApp(user, restorePage());
    }catch(err){
      showMessage(err.message || 'Không thể đăng nhập.', true);
    }finally{
      setBusy(btn,false);
    }
  }

  async function bootSession(){
    const token = window.MAGASIN_API.getSessionToken();
    if(!token) return false;
    try{
      let snap = null;
      try{
        snap = sessionStorage.getItem(SNAPSHOT_KEY);
        if(snap) user = JSON.parse(snap);
      }catch(err){}

      const r = await window.MAGASIN_API.call('getSession', {});
      const d = resultData(r);
      if(isOk(r) && d && d.user){
        user = d.user;
        try{ sessionStorage.setItem(SNAPSHOT_KEY, JSON.stringify(user)); }catch(err){}
        openApp(user, restorePage());
        return true;
      }
      window.MAGASIN_API.clearSession();
      try{ sessionStorage.removeItem(SNAPSHOT_KEY); }catch(err){}
      return false;
    }catch(err){
      // Không xóa token khi bridge/network lỗi tạm thời.
      if(user){
        openApp(user, restorePage());
        return true;
      }
      return false;
    }
  }

  function openApp(u, page){
    user = u || user || {};
    hideAuth();
    setUserUI();
    renderPage(page || 'dashboard');
  }

  function closeApp(){
    closeDrawer();
    const app = $('app');
    const auth = $('auth');
    if(app) app.classList.remove('active');
    if(auth) auth.style.display = 'grid';
  }

  function renderPage(page){
    if(!PAGES[page]) page = 'dashboard';
    updateHeader(page);
    persistPage(page);
    closeDrawer();

    document.querySelectorAll('[data-page]').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.page === page);
    });

    const box = $('content');
    if(!box) return;
    box.innerHTML = '<div class="loading-card card panel">Đang tải dữ liệu…</div>';

    if(page === 'schedule') return renderSchedule(box);
    if(page === 'attendance') return renderAttendance(box);
    if(page === 'swap') return renderSwap(box);
    if(page === 'account') return renderAccount(box);
    if(page === 'inventory') return renderSimple(box,'Kho hàng','Khu vực quản lý hàng hóa và tồn kho.');
    if(page === 'reports') return renderSimple(box,'Báo cáo','Khu vực báo cáo hoạt động.');
    if(page === 'settings') return renderSimple(box,'Cài đặt','Thiết lập hệ thống.');
    return renderDashboard(box);
  }

  function renderDashboard(box){
    box.innerHTML = '<section class="card panel"><div class="eyebrow">MAGASIN NOIBO</div>' +
      '<h1>Xin chào, ' + esc(user && (user.name || user.username) || 'bạn') + '!</h1>' +
      '<p>Frontend chạy trên GitHub Pages và backend chạy trên Google Apps Script.</p></section>';
  }

  function parseRows(data, keys){
    if(Array.isArray(data)) return data;
    for(const k of keys){
      if(data && Array.isArray(data[k])) return data[k];
    }
    return [];
  }

  function formatTime(v){
    if(v == null) return '';
    const s = String(v);
    const m = s.match(/(?:T|\s)(\d{1,2}):(\d{2})/);
    return m ? String(m[1]).padStart(2,'0') + ':' + m[2] : s;
  }

  async function renderSchedule(box){
    try{
      const r = await window.MAGASIN_API.call('getMySchedule', {});
      if(!isOk(r)) throw new Error(messageOf(r) || 'Không tải được lịch làm.');
      const d = resultData(r) || {};
      const rows = parseRows(d,['schedules','records','data']);
      box.innerHTML = '<section class="card panel"><div class="toolbar"><div><h2>Lịch làm việc</h2><p>Lịch làm trong tuần.</p></div></div><div id="scheduleGrid" class="week-grid"></div></section>';
      const grid = $('scheduleGrid');
      if(!grid) return;
      const monday = new Date();
      const day = monday.getDay();
      monday.setDate(monday.getDate() - (day === 0 ? 6 : day - 1));
      monday.setHours(0,0,0,0);
      const names = ['THỨ HAI','THỨ BA','THỨ TƯ','THỨ NĂM','THỨ SÁU','THỨ BẢY','CHỦ NHẬT'];
      const cards = names.map((name,i)=>{
        const date = new Date(monday); date.setDate(monday.getDate()+i);
        const key = date.getFullYear()+'-'+String(date.getMonth()+1).padStart(2,'0')+'-'+String(date.getDate()).padStart(2,'0');
        const same = rows.filter(x => String(x.date||x.Ngay||'').slice(0,10) === key);
        const shifts = same.map(x => {
          const start = formatTime(x.start || x.startTime || x['Giờ bắt đầu']);
          const end = formatTime(x.end || x.endTime || x['Giờ kết thúc']);
          const h = Number(start.slice(0,2));
          const cls = h < 12 ? 'm' : h < 17 ? 'a' : 'e';
          return '<div class="shift '+cls+'">'+esc(start+'-'+end)+'</div>';
        }).join('');
        return '<div class="day"><div class="day-head"><strong>'+name+'</strong><span>'+date.toLocaleDateString('vi-VN')+'</span></div><div class="shifts">'+(shifts||'<div class="empty">Chưa có ca</div>')+'</div></div>';
      }).join('');
      grid.innerHTML = cards;
    }catch(err){
      box.innerHTML = '<section class="card panel"><h2>Lịch làm việc</h2><div class="error-box">'+esc(err.message)+'</div></section>';
    }
  }

  async function renderAttendance(box){
    try{
      const r = await window.MAGASIN_API.call('getAttendanceHistory', {});
      if(!isOk(r)) throw new Error(messageOf(r) || 'Không tải được lịch sử chấm công.');
      const rows = parseRows(resultData(r)||{},['records','history','data']);
      box.innerHTML = '<section class="card panel"><h2>Chấm công</h2><p>Lịch sử chấm công của tài khoản.</p><div class="table-wrap"><table class="table"><thead><tr><th>Ngày</th><th>Check-in</th><th>Check-out</th><th>Trạng thái</th></tr></thead><tbody>'+(
        rows.length ? rows.map(x => '<tr><td>'+esc(x.date||x.Ngay||'')+'</td><td>'+esc(x.checkIn||x['Check-in']||'')+'</td><td>'+esc(x.checkOut||x['Check-out']||'')+'</td><td>'+esc(x.status||x['Trạng thái']||'')+'</td></tr>').join('') : '<tr><td colspan="4">Chưa có lịch sử chấm công.</td></tr>'
      )+'</tbody></table></div></section>';
    }catch(err){
      box.innerHTML = '<section class="card panel"><h2>Chấm công</h2><div class="error-box">'+esc(err.message)+'</div></section>';
    }
  }

  async function renderSwap(box){
    try{
      const r = await window.MAGASIN_API.call('getMyShiftSwapRequests', {});
      if(!isOk(r)) throw new Error(messageOf(r) || 'Không tải được yêu cầu đổi ca.');
      const rows = parseRows(resultData(r)||{},['requests','records','data']);
      box.innerHTML = '<section class="card panel"><h2>Đổi ca</h2><p>Danh sách yêu cầu đổi ca.</p>' + (rows.length ? rows.map(x => '<div class="data-row"><span>'+esc(x.date||x.Ngay||'')+'</span><span>'+esc(x.status||x['Trạng thái']||'')+'</span></div>').join('') : '<div class="empty-state">Chưa có yêu cầu đổi ca.</div>') + '</section>';
    }catch(err){
      box.innerHTML = '<section class="card panel"><h2>Đổi ca</h2><div class="error-box">'+esc(err.message)+'</div></section>';
    }
  }

  function renderAccount(box){
    box.innerHTML = '<section class="card panel"><h2>Thông tin cá nhân</h2><div class="profile-grid">'+
      '<div><span>Họ tên</span><strong>'+esc(user&& (user.name||user.fullName)||'')+'</strong></div>'+
      '<div><span>Tên đăng nhập</span><strong>'+esc(user&&user.username||'')+'</strong></div>'+
      '<div><span>Email</span><strong>'+esc(user&&user.email||'')+'</strong></div>'+
      '<div><span>Số điện thoại</span><strong>'+esc(user&&user.phone||'')+'</strong></div>'+
      '</div></section>';
  }

  function renderSimple(box, title, text){
    box.innerHTML = '<section class="card panel"><h2>'+esc(title)+'</h2><p>'+esc(text)+'</p></section>';
  }

  async function logout(){
    try{ await window.MAGASIN_API.call('logout',{}); }catch(err){}
    window.MAGASIN_API.clearSession();
    try{ sessionStorage.removeItem(SNAPSHOT_KEY); }catch(err){}
    user = null;
    closeApp();
    showMessage('Bạn đã đăng xuất.');
  }

  function bindOptionalAuthLinks(){
    document.querySelectorAll('[data-auth-view]').forEach(a => a.addEventListener('click', function(e){
      e.preventDefault();
      const target = this.dataset.authView;
      // Giữ tương thích nếu sau này index.html bổ sung forgot/register/reset.
      document.querySelectorAll('.auth-view').forEach(v => v.classList.toggle('active', v.id === 'auth-'+target));
    }));
  }

  async function boot(){
    // Luôn gắn các handler có thật trong GitHub shell; không giả định các form cũ tồn tại.
    const loginForm = $('loginForm');
    if(loginForm) loginForm.addEventListener('submit', login);

    const hamburger = $('hamburger');
    if(hamburger) hamburger.addEventListener('click', toggleDrawer);
    if($('overlay')) $('overlay').addEventListener('click', closeDrawer);
    if($('logoutBtn')) $('logoutBtn').addEventListener('click', logout);

    renderMenu();
    wireMenuEvents();
    bindOptionalAuthLinks();

    let restored = false;
    try{
      restored = await bootSession();
    }catch(err){
      restored = false;
    }finally{
      // Quan trọng: không để booting giữ toàn bộ trang trắng nếu bridge lỗi.
      document.body.classList.remove('booting');
      document.documentElement.classList.remove('booting');
      if(!restored && !user) showAuth();
    }
  }

  window.MAGASIN_WEB = {renderPage, logout};
  document.addEventListener('DOMContentLoaded', boot);
})();

/* =========================================================
   MAGASIN — SUPABASE AUTH COMPATIBILITY LAYER

   Production flow for GitHub Pages:
   - Login: MAGASIN username -> Supabase Auth email/password
   - Signup: Supabase email confirmation link -> GitHub Pages
   - Recovery: Supabase password-reset link -> GitHub Pages
   - Session: persisted by Supabase Auth

   IMPORTANT:
   The current Supabase project uses the default email templates.
   Therefore signup confirmation is LINK-based, not OTP-based.
========================================================= */
(function(window){
  'use strict';

  const client = window.MAGASIN_SUPABASE;
  const api = window.MAGASIN_API;

  if (!client || !api) {
    console.error('MAGASIN Auth: Supabase client hoặc MAGASIN_API chưa sẵn sàng.');
    return;
  }

  const originalCall = api.call.bind(api);
  const originalGetToken = api.getSessionToken ? api.getSessionToken.bind(api) : function(){ return ''; };
  const originalSetToken = api.setSessionToken ? api.setSessionToken.bind(api) : function(){};
  const originalClearSession = api.clearSession ? api.clearSession.bind(api) : function(){};

  const PROD_URL = 'https://magasincoffee.github.io/noibo/web/';
  const VERIFY_REDIRECT = PROD_URL + '?auth=verify';
  const RESET_REDIRECT = PROD_URL + '?auth=reset';
  const PENDING_EMAIL_KEY = 'magasin_pending_signup_email';

  let cachedAccessToken = '';

  function setMessage(text, isError){
    const el = document.getElementById('authMessage');
    if (!el) return;
    el.textContent = String(text || '');
    el.className = 'message ' + (isError ? 'error' : 'success');
  }

  function showView(name){
    document.querySelectorAll('.auth-view').forEach(function(el){
      el.classList.toggle('active', el.id === 'auth-' + name);
    });
  }

  function savePendingEmail(email){
    try { sessionStorage.setItem(PENDING_EMAIL_KEY, String(email || '')); } catch (err) {}
  }

  function clearPendingEmail(){
    try { sessionStorage.removeItem(PENDING_EMAIL_KEY); } catch (err) {}
  }

  function getPendingEmail(){
    try { return String(sessionStorage.getItem(PENDING_EMAIL_KEY) || '').trim(); }
    catch (err) { return ''; }
  }

  function removeAuthCallbackFromUrl(){
    try {
      const cleanUrl = window.location.origin + window.location.pathname;
      window.history.replaceState({}, document.title, cleanUrl);
    } catch (err) {}
  }

  function normalizeProfile(profile, authUser){
    profile = profile || {};
    authUser = authUser || {};
    return {
      id: profile.id || authUser.id || '',
      username: profile.username || (authUser.user_metadata && authUser.user_metadata.username) || '',
      name: profile.full_name || (authUser.user_metadata && authUser.user_metadata.full_name) || profile.username || '',
      fullName: profile.full_name || '',
      email: profile.email || authUser.email || '',
      phone: profile.phone || (authUser.user_metadata && authUser.user_metadata.phone) || '',
      role: profile.role || 'STAFF',
      status: profile.status || 'PENDING',
      accessScope: profile.access_scope || ''
    };
  }

  async function getProfile(authUser, requireActive){
    const { data, error } = await client
      .from('profiles')
      .select('id,username,full_name,email,phone,role,status,access_scope')
      .eq('id', authUser.id)
      .single();

    if (error) {
      throw new Error('Không tìm thấy hồ sơ MAGASIN cho tài khoản Supabase. ' + error.message);
    }

    const profile = normalizeProfile(data, authUser);
    if (requireActive && String(profile.status).toUpperCase() !== 'ACTIVE') {
      if (String(profile.status).toUpperCase() === 'PENDING') {
        throw new Error('Tài khoản đã xác thực nhưng đang chờ quản lý kích hoạt.');
      }
      throw new Error('Tài khoản MAGASIN đang bị vô hiệu hóa.');
    }

    return profile;
  }

  async function resolveEmailByUsername(username){
    const value = String(username || '').trim();
    if (!value) throw new Error('Vui lòng nhập tên đăng nhập.');
    if (value.indexOf('@') !== -1) return value;

    const { data, error } = await client.rpc('resolve_login_email', {
      p_username: value
    });

    if (error) {
      throw new Error('Không thể tra cứu tên đăng nhập. ' + error.message);
    }
    if (!data) throw new Error('Tên đăng nhập không tồn tại.');
    return String(data);
  }

  async function login(payload){
    const username = String(payload && payload.username || '').trim();
    const password = String(payload && payload.password || '');
    if (!username || !password) throw new Error('Vui lòng nhập tên đăng nhập và mật khẩu.');

    const email = await resolveEmailByUsername(username);
    const { data, error } = await client.auth.signInWithPassword({ email, password });
    if (error) throw new Error('Tên đăng nhập hoặc mật khẩu không đúng.');
    if (!data || !data.user || !data.session) throw new Error('Supabase Auth chưa tạo phiên đăng nhập.');

    try {
      const profile = await getProfile(data.user, true);
      cachedAccessToken = data.session.access_token || '';
      return {
        ok: true,
        user: profile,
        sessionToken: cachedAccessToken,
        data: { user: profile, sessionToken: cachedAccessToken }
      };
    } catch (err) {
      try { await client.auth.signOut(); } catch (signoutErr) {}
      cachedAccessToken = '';
      throw err;
    }
  }

  async function getSession(){
    const { data, error } = await client.auth.getSession();
    if (error) throw new Error(error.message);

    const session = data && data.session;
    if (!session || !session.user) {
      cachedAccessToken = '';
      return { ok: false, message: 'Chưa có phiên Supabase.' };
    }

    try {
      const profile = await getProfile(session.user, true);
      cachedAccessToken = session.access_token || '';
      return {
        ok: true,
        user: profile,
        sessionToken: cachedAccessToken,
        data: { user: profile, sessionToken: cachedAccessToken }
      };
    } catch (err) {
      try { await client.auth.signOut(); } catch (signoutErr) {}
      cachedAccessToken = '';
      throw err;
    }
  }

  async function logout(){
    const { error } = await client.auth.signOut();
    cachedAccessToken = '';
    originalClearSession();
    if (error) throw new Error(error.message);
    return { ok: true, message: 'Đã đăng xuất.' };
  }

  async function register(payload){
    const fullName = String(payload && payload.fullName || '').trim();
    const phone = String(payload && payload.phone || '').trim();
    const email = String(payload && payload.email || '').trim();
    const username = String(payload && payload.username || '').trim();
    const password = String(payload && payload.password || '');

    if (!fullName || !email || !username || !password) {
      throw new Error('Vui lòng nhập đầy đủ thông tin đăng ký.');
    }
    if (password.length < 8) throw new Error('Mật khẩu phải có ít nhất 8 ký tự.');

    // The project is using the default Supabase confirmation-link template.
    // The email link returns to the production GitHub Pages application.
    const { data, error } = await client.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: VERIFY_REDIRECT,
        data: { username, full_name: fullName, phone }
      }
    });

    if (error) throw new Error(error.message);

    savePendingEmail(email);

    // When email confirmation is enabled, data.session is normally null.
    // If confirmation is disabled, immediately sign out so registration still
    // follows the MAGASIN workflow: manager activation is required.
    if (data && data.session) {
      try { await client.auth.signOut(); } catch (signoutErr) {}
      cachedAccessToken = '';
    }

    showView('login');
    setMessage('Đăng ký thành công. Hãy kiểm tra email và bấm “Confirm email address” để xác thực tài khoản. Sau đó quản lý sẽ kích hoạt tài khoản.', false);

    return {
      ok: true,
      requiresEmailConfirmation: !(data && data.session),
      message: 'Đăng ký thành công. Hãy kiểm tra email và bấm liên kết xác nhận.'
    };
  }

  async function forgotPassword(payload){
    const email = String(payload && payload.email || '').trim();
    if (!email) throw new Error('Vui lòng nhập email.');

    const { error } = await client.auth.resetPasswordForEmail(email, {
      redirectTo: RESET_REDIRECT
    });
    if (error) throw new Error(error.message);

    return {
      ok: true,
      message: 'Đã gửi hướng dẫn đặt lại mật khẩu. Hãy kiểm tra email và bấm liên kết trong thư.'
    };
  }

  async function updatePassword(payload){
    const password = String(payload && payload.password || '');
    const confirmPassword = String(payload && payload.confirmPassword || '');
    if (password.length < 8) throw new Error('Mật khẩu mới phải có ít nhất 8 ký tự.');
    if (password !== confirmPassword) throw new Error('Mật khẩu nhập lại không khớp.');

    const { error } = await client.auth.updateUser({ password: password });
    if (error) throw new Error(error.message);

    try { await client.auth.signOut(); } catch (signoutErr) {}
    cachedAccessToken = '';
    originalClearSession();
    showView('login');
    removeAuthCallbackFromUrl();
    setMessage('Đã cập nhật mật khẩu. Bạn có thể đăng nhập bằng mật khẩu mới.', false);

    return { ok: true, message: 'Đã cập nhật mật khẩu.' };
  }

  api.call = async function(action, payload){
    switch (String(action || '')) {
      case 'login': return login(payload || {});
      case 'getSession': return getSession();
      case 'logout': return logout();
      case 'register': return register(payload || {});
      case 'forgotPassword': return forgotPassword(payload || {});
      case 'updatePassword': return updatePassword(payload || {});
      default: return originalCall(action, payload || {});
    }
  };

  api.getSessionToken = function(){
    return cachedAccessToken || originalGetToken();
  };

  api.setSessionToken = function(token){
    cachedAccessToken = String(token || '');
    originalSetToken(token);
  };

  api.clearSession = function(){
    cachedAccessToken = '';
    originalClearSession();
  };

  function handleAuthCallback(){
    const params = new URLSearchParams(window.location.search || '');
    const mode = params.get('auth');

    if (mode === 'reset') {
      showView('reset');
      setMessage('Liên kết đặt lại mật khẩu hợp lệ. Hãy tạo mật khẩu mới.', false);
      return;
    }

    if (mode === 'verify') {
      // With Supabase email-confirm links, detectSessionInUrl exchanges the
      // callback tokens and emits SIGNED_IN below. We show a neutral state
      // while that callback is being processed.
      showView('login');
      setMessage('Đang xác nhận email…', false);
    }
  }

  client.auth.onAuthStateChange(function(event, session){
    cachedAccessToken = session && session.access_token ? session.access_token : '';

    if (event === 'PASSWORD_RECOVERY') {
      showView('reset');
      setMessage('Liên kết đặt lại mật khẩu hợp lệ. Hãy tạo mật khẩu mới.', false);
      return;
    }

    if (event === 'SIGNED_IN' && session && session.user) {
      const params = new URLSearchParams(window.location.search || '');
      const mode = params.get('auth');

      if (mode === 'verify') {
        // Email confirmation may create a temporary session. MAGASIN should
        // not treat that as a login because the account still needs manager
        // activation. Sign out and return to the login screen.
        setTimeout(async function(){
          try { await client.auth.signOut(); } catch (err) {}
          cachedAccessToken = '';
          clearPendingEmail();
          showView('login');
          removeAuthCallbackFromUrl();
          setMessage('Email đã được xác thực thành công. Tài khoản đang chờ quản lý kích hoạt.', false);
        }, 0);
      }
    }
  });

  document.addEventListener('DOMContentLoaded', function(){
    // The current UI originally said “Gửi mã xác thực”. That no longer matches
    // the real Supabase flow because this project uses a confirmation LINK.
    const registerForm = document.getElementById('registerForm');
    if (registerForm && !registerForm.dataset.supabaseAuthBound) {
      registerForm.dataset.supabaseAuthBound = '1';
      const submit = registerForm.querySelector('button[type="submit"]');
      if (submit) submit.textContent = 'Đăng ký';

      registerForm.addEventListener('submit', async function(e){
        e.preventDefault();
        const btn = registerForm.querySelector('button[type="submit"]');
        if (btn) btn.disabled = true;
        const fd = new FormData(registerForm);
        try {
          const result = await api.call('register', {
            fullName: fd.get('fullName'),
            phone: fd.get('phone'),
            email: fd.get('email'),
            username: fd.get('username'),
            password: fd.get('password')
          });
          setMessage(result.message || 'Đăng ký thành công.', false);
          registerForm.reset();
        } catch (err) {
          setMessage(err.message || 'Không thể đăng ký.', true);
        } finally {
          if (btn) btn.disabled = false;
        }
      });
    }

    // OTP UI is intentionally disabled because the current Supabase template
    // is the default confirmation-link template.
    const verifyView = document.getElementById('auth-verify');
    if (verifyView) verifyView.style.display = 'none';

    const forgotForm = document.getElementById('forgotForm');
    if (forgotForm && !forgotForm.dataset.supabaseAuthBound) {
      forgotForm.dataset.supabaseAuthBound = '1';
      forgotForm.addEventListener('submit', async function(e){
        e.preventDefault();
        const btn = forgotForm.querySelector('button[type="submit"]');
        if (btn) btn.disabled = true;
        const fd = new FormData(forgotForm);
        try {
          const result = await api.call('forgotPassword', { email: fd.get('email') });
          setMessage(result.message || 'Đã gửi hướng dẫn đặt lại mật khẩu.', false);
        } catch (err) {
          setMessage(err.message || 'Không thể gửi email đặt lại mật khẩu.', true);
        } finally {
          if (btn) btn.disabled = false;
        }
      });
    }

    const resetForm = document.getElementById('resetForm');
    if (resetForm && !resetForm.dataset.supabaseAuthBound) {
      resetForm.dataset.supabaseAuthBound = '1';
      resetForm.addEventListener('submit', async function(e){
        e.preventDefault();
        const btn = resetForm.querySelector('button[type="submit"]');
        if (btn) btn.disabled = true;
        const fd = new FormData(resetForm);
        try {
          await api.call('updatePassword', {
            password: fd.get('password'),
            confirmPassword: fd.get('confirmPassword')
          });
          resetForm.reset();
        } catch (err) {
          setMessage(err.message || 'Không thể cập nhật mật khẩu.', true);
        } finally {
          if (btn) btn.disabled = false;
        }
      });
    }

    handleAuthCallback();
  });
})(window);

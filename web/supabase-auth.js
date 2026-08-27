/* MAGASIN — Supabase Auth compatibility layer
 * Keeps the current MAGASIN_WEB UI/API contract while moving
 * authentication from Apps Script sessions to Supabase Auth.
 */
(function(window){
  'use strict';

  const client = window.MAGASIN_SUPABASE;
  if (!client) {
    console.error('MAGASIN Supabase client chưa sẵn sàng.');
    return;
  }

  const originalApi = window.MAGASIN_API;
  const originalCall = originalApi && originalApi.call;
  const originalGetToken = originalApi && originalApi.getSessionToken;
  const originalSetToken = originalApi && originalApi.setSessionToken;
  const originalClearToken = originalApi && originalApi.clearSession;

  let cachedAccessToken = '';
  let currentSession = null;

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

  async function getProfile(authUser){
    const { data, error } = await client
      .from('profiles')
      .select('id,username,full_name,email,phone,role,status,access_scope')
      .eq('id', authUser.id)
      .single();

    if (error) {
      throw new Error('Không tìm thấy hồ sơ MAGASIN cho tài khoản Supabase. ' + error.message);
    }

    const profile = normalizeProfile(data, authUser);
    if (profile.status !== 'ACTIVE') {
      throw new Error(
        profile.status === 'PENDING'
          ? 'Tài khoản đã xác thực nhưng đang chờ quản lý kích hoạt.'
          : 'Tài khoản MAGASIN đang bị vô hiệu hóa.'
      );
    }
    return profile;
  }

  async function resolveEmailByUsername(username){
    const name = String(username || '').trim();
    if (!name) throw new Error('Vui lòng nhập tên đăng nhập.');

    if (name.indexOf('@') !== -1) return name;

    const { data, error } = await client.rpc('resolve_login_email', {
      p_username: name
    });

    if (error) {
      throw new Error('Không thể tra cứu tên đăng nhập. Hãy kiểm tra migration resolve_login_email trên Supabase.');
    }
    if (!data) throw new Error('Tên đăng nhập không tồn tại.');
    return String(data);
  }

  async function supabaseLogin(payload){
    const username = String(payload && payload.username || '').trim();
    const password = String(payload && payload.password || '');
    if (!username || !password) throw new Error('Vui lòng nhập tên đăng nhập và mật khẩu.');

    const email = await resolveEmailByUsername(username);
    const { data, error } = await client.auth.signInWithPassword({ email, password });
    if (error) throw new Error('Tên đăng nhập hoặc mật khẩu không đúng.');
    if (!data || !data.user || !data.session) throw new Error('Supabase Auth chưa tạo phiên đăng nhập.');

    currentSession = data.session;
    cachedAccessToken = data.session.access_token || '';

    let profile;
    try {
      profile = await getProfile(data.user);
    } catch (err) {
      await client.auth.signOut();
      currentSession = null;
      cachedAccessToken = '';
      throw err;
    }

    return {
      ok: true,
      user: profile,
      sessionToken: data.session.access_token,
      data: {
        user: profile,
        sessionToken: data.session.access_token
      }
    };
  }

  async function supabaseGetSession(){
    const { data, error } = await client.auth.getSession();
    if (error) throw new Error(error.message);
    const session = data && data.session;
    if (!session || !session.user) return {ok:false, message:'Chưa có phiên Supabase.'};

    currentSession = session;
    cachedAccessToken = session.access_token || '';
    const profile = await getProfile(session.user);
    return {
      ok:true,
      user:profile,
      sessionToken:session.access_token,
      data:{user:profile,sessionToken:session.access_token}
    };
  }

  async function supabaseLogout(){
    const { error } = await client.auth.signOut();
    currentSession = null;
    cachedAccessToken = '';
    if (error) throw new Error(error.message);
    return {ok:true,message:'Đã đăng xuất.'};
  }

  async function signUp(payload){
    const fullName = String(payload && payload.fullName || '').trim();
    const phone = String(payload && payload.phone || '').trim();
    const email = String(payload && payload.email || '').trim();
    const username = String(payload && payload.username || '').trim();
    const password = String(payload && payload.password || '');

    if (!fullName || !email || !username || !password) {
      throw new Error('Vui lòng nhập đầy đủ thông tin đăng ký.');
    }

    const { data, error } = await client.auth.signUp({
      email,
      password,
      options: {
        data: { username, full_name: fullName, phone }
      }
    });

    if (error) throw new Error(error.message);

    return {
      ok:true,
      requiresEmailConfirmation: !data.session,
      message: data.session
        ? 'Đăng ký thành công. Tài khoản đang chờ quản lý kích hoạt.'
        : 'Đăng ký thành công. Vui lòng kiểm tra email để xác thực tài khoản.'
    };
  }

  async function resetPassword(email){
    const target = String(email || '').trim();
    if (!target) throw new Error('Vui lòng nhập email.');
    const redirectTo = window.location.origin + window.location.pathname;
    const { error } = await client.auth.resetPasswordForEmail(target, { redirectTo });
    if (error) throw new Error(error.message);
    return {ok:true,message:'Đã gửi hướng dẫn đặt lại mật khẩu nếu email tồn tại.'};
  }

  async function updatePassword(password, confirmPassword){
    if (!password || password.length < 8) throw new Error('Mật khẩu mới phải có ít nhất 8 ký tự.');
    if (password !== confirmPassword) throw new Error('Mật khẩu nhập lại không khớp.');
    const { error } = await client.auth.updateUser({password});
    if (error) throw new Error(error.message);
    return {ok:true,message:'Đã cập nhật mật khẩu.'};
  }

  if (!originalApi) return;

  originalApi.call = async function(action, payload){
    switch(String(action || '')){
      case 'login': return supabaseLogin(payload || {});
      case 'getSession': return supabaseGetSession();
      case 'logout': return supabaseLogout();
      case 'register': return signUp(payload || {});
      case 'forgotPassword': return resetPassword(payload && payload.email);
      case 'updatePassword': return updatePassword(payload && payload.password, payload && payload.confirmPassword);
      default:
        if (typeof originalCall === 'function') return originalCall(action, payload);
        throw new Error('API action chưa được triển khai: ' + action);
    }
  };

  originalApi.getSessionToken = function(){
    if (cachedAccessToken) return cachedAccessToken;
    try {
      for (let i=0;i<localStorage.length;i++) {
        const key = localStorage.key(i) || '';
        if (key.indexOf('sb-') === 0) return 'supabase-session';
      }
    } catch(err) {}
    return typeof originalGetToken === 'function' ? originalGetToken() : '';
  };

  originalApi.setSessionToken = function(token){
    cachedAccessToken = String(token || '');
    if (typeof originalSetToken === 'function') originalSetToken(token);
  };

  originalApi.clearSession = function(){
    cachedAccessToken = '';
    currentSession = null;
    if (typeof originalClearToken === 'function') originalClearToken();
  };

  client.auth.onAuthStateChange(function(event, session){
    currentSession = session || null;
    cachedAccessToken = session && session.access_token ? session.access_token : '';
  });

  // Bind forms that existed in the previous UI but were not wired by app.js.
  document.addEventListener('DOMContentLoaded', function(){
    const registerForm=document.getElementById('registerForm');
    if(registerForm && !registerForm.dataset.supabaseBound){
      registerForm.dataset.supabaseBound='1';
      registerForm.addEventListener('submit', async function(e){
        e.preventDefault();
        const btn=registerForm.querySelector('button[type="submit"]');
        if(btn)btn.disabled=true;
        const fd=new FormData(registerForm);
        try{
          const result=await originalApi.call('register',{
            fullName:fd.get('fullName'), phone:fd.get('phone'), email:fd.get('email'),
            username:fd.get('username'), password:fd.get('password')
          });
          const message=document.getElementById('authMessage');
          if(message){message.textContent=result.message||'Đăng ký thành công.';message.className='message success';}
        }catch(err){
          const message=document.getElementById('authMessage');
          if(message){message.textContent=err.message||'Không thể đăng ký.';message.className='message error';}
        }finally{if(btn)btn.disabled=false;}
      });
    }

    const forgotForm=document.getElementById('forgotForm');
    if(forgotForm && !forgotForm.dataset.supabaseBound){
      forgotForm.dataset.supabaseBound='1';
      forgotForm.addEventListener('submit', async function(e){
        e.preventDefault();
        const btn=forgotForm.querySelector('button[type="submit"]');
        if(btn)btn.disabled=true;
        const fd=new FormData(forgotForm);
        try{
          const result=await originalApi.call('forgotPassword',{email:fd.get('email')});
          const message=document.getElementById('authMessage');
          if(message){message.textContent=result.message||'Đã gửi hướng dẫn.';message.className='message success';}
        }catch(err){
          const message=document.getElementById('authMessage');
          if(message){message.textContent=err.message||'Không thể gửi email.';message.className='message error';}
        }finally{if(btn)btn.disabled=false;}
      });
    }

    const resetForm=document.getElementById('resetForm');
    if(resetForm && !resetForm.dataset.supabaseBound){
      resetForm.dataset.supabaseBound='1';
      resetForm.addEventListener('submit', async function(e){
        e.preventDefault();
        const btn=resetForm.querySelector('button[type="submit"]');
        if(btn)btn.disabled=true;
        const fd=new FormData(resetForm);
        try{
          const result=await originalApi.call('updatePassword',{
            password:fd.get('password'), confirmPassword:fd.get('confirmPassword')
          });
          const message=document.getElementById('authMessage');
          if(message){message.textContent=result.message||'Đã cập nhật mật khẩu.';message.className='message success';}
        }catch(err){
          const message=document.getElementById('authMessage');
          if(message){message.textContent=err.message||'Không thể cập nhật mật khẩu.';message.className='message error';}
        }finally{if(btn)btn.disabled=false;}
      });
    }
  }, {once:true});
})(window);

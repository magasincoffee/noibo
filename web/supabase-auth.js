/* MAGASIN — Supabase Auth compatibility layer
 * Production auth flows for GitHub Pages:
 * - Login by MAGASIN username -> Supabase Auth email/password
 * - Signup email verification by 8-digit OTP
 * - Password recovery -> GitHub Pages reset screen
 * - Session persistence through Supabase Auth
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

  const PROD_URL = 'https://magasincoffee.github.io/noibo/web/';
  const VERIFY_REDIRECT = PROD_URL + '?auth=verify';
  const RESET_REDIRECT = PROD_URL + '?auth=reset';
  const PENDING_VERIFY_KEY = 'magasin_pending_verification_email';

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

  function savePendingEmail(email){
    try{sessionStorage.setItem(PENDING_VERIFY_KEY,String(email||''));}catch(err){}
  }

  function getPendingEmail(){
    try{return String(sessionStorage.getItem(PENDING_VERIFY_KEY)||'').trim();}catch(err){return '';}
  }

  function clearPendingEmail(){
    try{sessionStorage.removeItem(PENDING_VERIFY_KEY);}catch(err){}
  }

  function showAuthView(view){
    document.querySelectorAll('.auth-view').forEach(function(el){
      el.classList.toggle('active', el.id === 'auth-' + view);
    });
  }

  function showMessage(text,error){
    const el=document.getElementById('authMessage');
    if(!el)return;
    el.textContent=String(text||'');
    el.className='message '+(error?'error':'success');
  }

  function setVerifyUI(email){
    const value=document.getElementById('verifyEmailValue');
    if(value)value.textContent=email||'';
    const input=document.querySelector('#verifyForm input[name="code"]');
    if(input){
      input.maxLength=8;
      input.inputMode='numeric';
      input.autocomplete='one-time-code';
      input.pattern='[0-9]{8}';
    }
    showAuthView('verify');
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
    if (password.length < 8) throw new Error('Mật khẩu phải có ít nhất 8 ký tự.');

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
    setVerifyUI(email);

    return {
      ok:true,
      requiresEmailConfirmation: !data.session,
      message: data.session
        ? 'Đăng ký thành công. Tài khoản đang chờ quản lý kích hoạt.'
        : 'Đã gửi mã xác thực 8 số đến email. Hãy nhập mã để xác thực.'
    };
  }

  async function resendSignup(email){
    const target=String(email||getPendingEmail()||'').trim();
    if(!target)throw new Error('Chưa có email cần xác thực.');
    const {error}=await client.auth.resend({
      type:'signup',
      email:target,
      options:{emailRedirectTo:VERIFY_REDIRECT}
    });
    if(error)throw new Error(error.message);
    savePendingEmail(target);
    setVerifyUI(target);
    return {ok:true,message:'Đã gửi lại mã xác thực 8 số.'};
  }

  async function verifySignupOtp(email,code){
    const target=String(email||getPendingEmail()||'').trim();
    const token=String(code||'').replace(/\D/g,'');
    if(!target)throw new Error('Không xác định được email cần xác thực.');
    if(token.length!==8)throw new Error('Mã xác thực phải gồm 8 chữ số.');

    const {data,error}=await client.auth.verifyOtp({email:target,token,type:'email'});
    if(error)throw new Error('Mã xác thực không đúng hoặc đã hết hạn.');

    // The confirmation may create a session. The MAGASIN account must still
    // be activated by management, so do not leave the browser signed in.
    if(data && data.session){
      try{await client.auth.signOut();}catch(err){}
    }
    clearPendingEmail();
    showAuthView('login');
    showMessage('Xác thực email thành công. Tài khoản đang chờ quản lý kích hoạt.');
    return {ok:true,message:'Xác thực email thành công. Tài khoản đang chờ quản lý kích hoạt.'};
  }

  async function resetPassword(email){
    const target = String(email || '').trim();
    if (!target) throw new Error('Vui lòng nhập email.');

    // Always return to the production GitHub Pages app. This prevents links
    // generated during a local test from sending the user back to localhost.
    const { error } = await client.auth.resetPasswordForEmail(target, {
      redirectTo: RESET_REDIRECT
    });
    if (error) throw new Error(error.message);
    return {ok:true,message:'Đã gửi hướng dẫn đặt lại mật khẩu. Hãy kiểm tra email.'};
  }

  async function updatePassword(password, confirmPassword){
    if (!password || password.length < 8) throw new Error('Mật khẩu mới phải có ít nhất 8 ký tự.');
    if (password !== confirmPassword) throw new Error('Mật khẩu nhập lại không khớp.');
    const { error } = await client.auth.updateUser({password});
    if (error) throw new Error(error.message);
    try{await client.auth.signOut();}catch(err){}
    showAuthView('login');
    showMessage('Đã cập nhật mật khẩu. Bạn có thể đăng nhập bằng mật khẩu mới.');
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
        if (key.indexOf('sb-') === 0 && key.indexOf('-auth-token') !== -1) return 'supabase-session';
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

    if(event === 'PASSWORD_RECOVERY'){
      showAuthView('reset');
      showMessage('Liên kết đặt lại mật khẩu hợp lệ. Hãy tạo mật khẩu mới.');
      return;
    }

    // A confirmation link can still be clicked from an older email template.
    // Treat it as a successful verification and return to login instead of
    // exposing the authenticated session to the user.
    if(event === 'SIGNED_IN' && session && session.user){
      const params = new URLSearchParams(window.location.search || '');
      const authMode = params.get('auth');
      if(authMode === 'verify'){
        setTimeout(async function(){
          try{await client.auth.signOut();}catch(err){}
          clearPendingEmail();
          showAuthView('login');
          showMessage('Email đã được xác thực. Tài khoản đang chờ quản lý kích hoạt.');
        },0);
      }
    }
  });

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
          showMessage(result.message||'Đăng ký thành công.');
        }catch(err){showMessage(err.message||'Không thể đăng ký.',true);}
        finally{if(btn)btn.disabled=false;}
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
          showMessage(result.message||'Đã gửi hướng dẫn.');
        }catch(err){showMessage(err.message||'Không thể gửi email.',true);}
        finally{if(btn)btn.disabled=false;}
      });
    }

    const verifyForm=document.getElementById('verifyForm');
    if(verifyForm && !verifyForm.dataset.supabaseBound){
      verifyForm.dataset.supabaseBound='1';
      const input=verifyForm.querySelector('input[name="code"]');
      if(input){
        input.maxLength=8;
        input.inputMode='numeric';
        input.autocomplete='one-time-code';
        input.pattern='[0-9]{8}';
      }
      verifyForm.addEventListener('submit', async function(e){
        e.preventDefault();
        const btn=verifyForm.querySelector('button[type="submit"]');
        if(btn)btn.disabled=true;
        const fd=new FormData(verifyForm);
        try{
          const result=await verifySignupOtp(getPendingEmail(),fd.get('code'));
          showMessage(result.message||'Xác thực thành công.');
          verifyForm.reset();
        }catch(err){showMessage(err.message||'Không thể xác thực email.',true);}
        finally{if(btn)btn.disabled=false;}
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
          resetForm.reset();
          showMessage(result.message||'Đã cập nhật mật khẩu.');
        }catch(err){showMessage(err.message||'Không thể cập nhật mật khẩu.',true);}
        finally{if(btn)btn.disabled=false;}
      });
    }

    const pending=getPendingEmail();
    const params=new URLSearchParams(window.location.search || '');
    if(params.get('auth') === 'verify' && pending){
      setVerifyUI(pending);
    }
    if(params.get('auth') === 'reset'){
      showAuthView('reset');
    }

    const resend=document.getElementById('resendVerifyBtn');
    if(resend && !resend.dataset.supabaseBound){
      resend.dataset.supabaseBound='1';
      resend.addEventListener('click',async function(){
        try{
          const result=await resendSignup(getPendingEmail());
          showMessage(result.message||'Đã gửi lại mã.');
        }catch(err){showMessage(err.message||'Không thể gửi lại mã.',true);}
      });
    }
  }, {once:true});

})(window);

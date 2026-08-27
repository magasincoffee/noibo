/* =========================================================
   MAGASIN — GITHUB FRONTEND API CLIENT

   Authentication:
   GitHub Pages -> Supabase Auth -> public.profiles

   Legacy application actions:
   GitHub Pages -> Apps Script Bridge (kept temporarily for modules
   that have not yet migrated to Supabase).
========================================================= */
(function(window){
  'use strict';

  const STORAGE_KEY='magasin_session_token';
  const RESPONSE_TYPE='MAGASIN_BRIDGE_RESPONSE';
  const READY_TYPE='MAGASIN_BRIDGE_READY';
  const BRIDGE_TIMEOUT=20000;

  const SUPABASE_CONFIG = window.MAGASIN_SUPABASE_CONFIG || {
    url:'https://menvbzlsncmpuvnaifxa.supabase.co',
    publishableKey:'sb_publishable_HsvCS6HDZnCDInd9PUoh0g_V34wJVqx'
  };

  let supabaseClient=null;
  let supabaseReadyPromise=null;

  let bridgeFrame=null;
  let bridgePort=null;
  let bridgeReadyPromise=null;
  const pending=new Map();

  function getApiUrl_(){
    const url=String(window.MAGASIN_API_URL||'').trim();
    if(!url)throw new Error('Chưa cấu hình MAGASIN_API_URL trong web/api-config.js');
    return url;
  }

  function getSessionToken(){
    try{
      const direct=sessionStorage.getItem(STORAGE_KEY)||'';
      if(direct)return direct;

      for(let i=0;i<localStorage.length;i++){
        const key=localStorage.key(i)||'';
        if(key.indexOf('sb-')===0 && key.indexOf('-auth-token')!==-1){
          return 'supabase-session';
        }
      }
    }catch(err){}
    return '';
  }

  function setSessionToken(token){
    try{
      if(token)sessionStorage.setItem(STORAGE_KEY,String(token));
      else sessionStorage.removeItem(STORAGE_KEY);
    }catch(err){}
  }

  function clearSession(){setSessionToken('');}

  function loadScript_(src){
    return new Promise(function(resolve,reject){
      const existing=document.querySelector('script[data-magasin-src="'+src+'"]');
      if(existing){
        if(existing.dataset.loaded==='1')return resolve();
        existing.addEventListener('load',function(){resolve();},{once:true});
        existing.addEventListener('error',function(){reject(new Error('Không tải được thư viện: '+src));},{once:true});
        return;
      }

      const script=document.createElement('script');
      script.src=src;
      script.async=true;
      script.dataset.magasinSrc=src;
      script.addEventListener('load',function(){script.dataset.loaded='1';resolve();},{once:true});
      script.addEventListener('error',function(){reject(new Error('Không tải được thư viện Supabase.'));},{once:true});
      document.head.appendChild(script);
    });
  }

  async function getSupabase_(){
    if(supabaseClient)return supabaseClient;
    if(supabaseReadyPromise)return supabaseReadyPromise;

    supabaseReadyPromise=(async function(){
      if(!window.MAGASIN_SUPABASE_CONFIG){
        try{
          await loadScript_('supabase-config.js');
        }catch(err){
          // Fall back to the browser-safe constants above.
        }
      }

      if(!window.supabase || typeof window.supabase.createClient!=='function'){
        await loadScript_('https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2');
      }

      const cfg=window.MAGASIN_SUPABASE_CONFIG || SUPABASE_CONFIG;
      if(!window.supabase || typeof window.supabase.createClient!=='function'){
        throw new Error('Supabase JS chưa được tải.');
      }
      if(!cfg.url || !cfg.publishableKey){
        throw new Error('Thiếu Supabase URL hoặc Publishable Key.');
      }

      supabaseClient=window.supabase.createClient(cfg.url,cfg.publishableKey,{
        auth:{
          autoRefreshToken:true,
          persistSession:true,
          detectSessionInUrl:true
        }
      });
      return supabaseClient;
    })();

    try{
      return await supabaseReadyPromise;
    }catch(err){
      supabaseReadyPromise=null;
      throw err;
    }
  }

  async function getProfile_(client,authUser){
    const {data,error}=await client
      .from('profiles')
      .select('id,username,full_name,email,phone,role,status,access_scope')
      .eq('id',authUser.id)
      .single();

    if(error){
      throw new Error('Không tìm thấy hồ sơ MAGASIN cho tài khoản Supabase. '+error.message);
    }

    const profile=data||{};
    if(String(profile.status||'').toUpperCase()!=='ACTIVE'){
      if(String(profile.status||'').toUpperCase()==='PENDING'){
        throw new Error('Tài khoản đã xác thực nhưng đang chờ quản lý kích hoạt.');
      }
      throw new Error('Tài khoản MAGASIN đang bị vô hiệu hóa.');
    }

    return {
      id:profile.id||authUser.id,
      username:profile.username||(authUser.user_metadata&&authUser.user_metadata.username)||'',
      name:profile.full_name||(authUser.user_metadata&&authUser.user_metadata.full_name)||profile.username||'',
      fullName:profile.full_name||'',
      email:profile.email||authUser.email||'',
      phone:profile.phone||(authUser.user_metadata&&authUser.user_metadata.phone)||'',
      role:profile.role||'STAFF',
      status:profile.status||'PENDING',
      accessScope:profile.access_scope||''
    };
  }

  async function resolveEmailByUsername_(client,username){
    const name=String(username||'').trim();
    if(!name)throw new Error('Vui lòng nhập tên đăng nhập.');
    if(name.indexOf('@')!==-1)return name;

    const {data,error}=await client.rpc('resolve_login_email',{p_username:name});
    if(error)throw new Error('Không thể tra cứu tên đăng nhập. '+error.message);
    if(!data)throw new Error('Tên đăng nhập không tồn tại.');
    return String(data);
  }

  async function supabaseLogin_(payload){
    const client=await getSupabase_();
    const username=String(payload&&payload.username||'').trim();
    const password=String(payload&&payload.password||'');
    if(!username||!password)throw new Error('Vui lòng nhập tên đăng nhập và mật khẩu.');

    const email=await resolveEmailByUsername_(client,username);
    const {data,error}=await client.auth.signInWithPassword({email,password});
    if(error)throw new Error('Tên đăng nhập hoặc mật khẩu không đúng.');
    if(!data||!data.user||!data.session)throw new Error('Supabase Auth chưa tạo phiên đăng nhập.');

    const profile=await getProfile_(client,data.user);
    const token=data.session.access_token||'';
    setSessionToken(token);

    return {
      ok:true,
      user:profile,
      sessionToken:token,
      data:{user:profile,sessionToken:token}
    };
  }

  async function supabaseGetSession_(){
    const client=await getSupabase_();
    const {data,error}=await client.auth.getSession();
    if(error)throw new Error(error.message);
    const session=data&&data.session;
    if(!session||!session.user){
      clearSession();
      return {ok:false,message:'Chưa có phiên Supabase.'};
    }

    const profile=await getProfile_(client,session.user);
    setSessionToken(session.access_token||'');
    return {
      ok:true,
      user:profile,
      sessionToken:session.access_token||'',
      data:{user:profile,sessionToken:session.access_token||''}
    };
  }

  async function supabaseLogout_(){
    const client=await getSupabase_();
    const {error}=await client.auth.signOut();
    clearSession();
    if(error)throw new Error(error.message);
    return {ok:true,message:'Đã đăng xuất.'};
  }

  async function supabaseRegister_(payload){
    const client=await getSupabase_();
    const fullName=String(payload&&payload.fullName||'').trim();
    const phone=String(payload&&payload.phone||'').trim();
    const email=String(payload&&payload.email||'').trim();
    const username=String(payload&&payload.username||'').trim();
    const password=String(payload&&payload.password||'');

    if(!fullName||!email||!username||!password){
      throw new Error('Vui lòng nhập đầy đủ thông tin đăng ký.');
    }

    const {data,error}=await client.auth.signUp({
      email,
      password,
      options:{data:{username,full_name:fullName,phone}}
    });

    if(error)throw new Error(error.message);

    return {
      ok:true,
      requiresEmailConfirmation:!data.session,
      message:data.session
        ?'Đăng ký thành công. Tài khoản đang chờ quản lý kích hoạt.'
        :'Đăng ký thành công. Vui lòng kiểm tra email để xác thực tài khoản.'
    };
  }

  async function supabaseForgotPassword_(payload){
    const client=await getSupabase_();
    const email=String(payload&&payload.email||'').trim();
    if(!email)throw new Error('Vui lòng nhập email.');
    const redirectTo=window.location.origin+window.location.pathname;
    const {error}=await client.auth.resetPasswordForEmail(email,{redirectTo});
    if(error)throw new Error(error.message);
    return {ok:true,message:'Đã gửi hướng dẫn đặt lại mật khẩu nếu email tồn tại.'};
  }

  async function supabaseUpdatePassword_(payload){
    const client=await getSupabase_();
    const password=String(payload&&payload.password||'');
    const confirmPassword=String(payload&&payload.confirmPassword||'');
    if(password.length<8)throw new Error('Mật khẩu mới phải có ít nhất 8 ký tự.');
    if(password!==confirmPassword)throw new Error('Mật khẩu nhập lại không khớp.');
    const {error}=await client.auth.updateUser({password});
    if(error)throw new Error(error.message);
    return {ok:true,message:'Đã cập nhật mật khẩu.'};
  }

  async function supabaseHealth_(){
    const client=await getSupabase_();
    const {data,error}=await client.rpc('resolve_login_email',{p_username:''});
    if(error)throw new Error('Supabase API chưa hoạt động: '+error.message);
    return {
      ok:true,
      message:'Supabase API đang hoạt động.',
      data:{reachable:true,result:data||null}
    };
  }

  function getBridgeUrl_(bridgeId){
    const u=new URL(getApiUrl_());
    u.searchParams.set('bridge','1');
    u.searchParams.set('_bridge','20260827-06');
    u.searchParams.set('bridgeId',bridgeId);
    return u.toString();
  }

  function ensureBridge_(){
    if(bridgeReadyPromise)return bridgeReadyPromise;

    bridgeReadyPromise=new Promise(function(resolve,reject){
      const bridgeId='bridge_'+Date.now()+'_'+Math.random().toString(36).slice(2);
      const frame=document.createElement('iframe');
      frame.title='MAGASIN API Bridge';
      frame.setAttribute('aria-hidden','true');
      frame.style.position='fixed';
      frame.style.width='1px';
      frame.style.height='1px';
      frame.style.left='-10000px';
      frame.style.top='-10000px';
      frame.style.border='0';
      frame.style.opacity='0';
      frame.style.pointerEvents='none';
      bridgeFrame=frame;

      let loadSeen=false;
      let timeout=null;

      function cleanup(){
        window.removeEventListener('message',onReady);
        frame.removeEventListener('load',onLoad);
        if(timeout)clearTimeout(timeout);
      }

      function fail(){
        cleanup();
        bridgeReadyPromise=null;
        bridgePort=null;
        reject(new Error(loadSeen?'Bridge đã tải nhưng không thiết lập được MessageChannel.':'Không tải được Bridge.'));
      }

      function onReady(event){
        const data=event.data||{};
        if(data.type!==READY_TYPE)return;
        if(event.origin!=='https://magasincoffee.github.io')return;
        if(String(data.bridgeId||'')!==bridgeId)return;
        if(!event.ports||!event.ports[0])return;

        bridgePort=event.ports[0];
        bridgePort.onmessage=function(messageEvent){
          const message=messageEvent.data||{};
          if(message.type!==RESPONSE_TYPE)return;
          const id=String(message.requestId||'');
          const item=pending.get(id);
          if(!item)return;
          pending.delete(id);
          clearTimeout(item.timer);
          item.resolve(message.result||{ok:false,message:'Bridge không trả về dữ liệu.'});
        };
        if(bridgePort.start)bridgePort.start();
        cleanup();
        resolve(frame);
      }

      function onLoad(){loadSeen=true;}

      window.addEventListener('message',onReady);
      frame.addEventListener('load',onLoad);
      document.body.appendChild(frame);
      frame.src=getBridgeUrl_(bridgeId);
      timeout=setTimeout(fail,BRIDGE_TIMEOUT);
    });

    return bridgeReadyPromise;
  }

  async function bridgeCall_(action,payload){
    await ensureBridge_();
    if(!bridgePort)throw new Error('Bridge chưa sẵn sàng.');

    const requestId='req_'+Date.now()+'_'+Math.random().toString(36).slice(2);
    const token=getSessionToken();
    const body=payload&&typeof payload==='object'?payload:{};

    return new Promise(function(resolve,reject){
      const timer=setTimeout(function(){
        pending.delete(requestId);
        reject(new Error('Apps Script Bridge timeout.'));
      },BRIDGE_TIMEOUT);

      pending.set(requestId,{resolve:resolve,reject:reject,timer:timer});
      try{
        bridgePort.postMessage({type:'MAGASIN_BRIDGE_REQUEST',requestId:requestId,action:String(action||''),sessionToken:token,payload:body});
      }catch(err){
        clearTimeout(timer);
        pending.delete(requestId);
        reject(err);
      }
    });
  }

  async function call(action,payload){
    const name=String(action||'').trim();
    if(!name)throw new Error('Thiếu action.');

    switch(name){
      case 'login': return supabaseLogin_(payload||{});
      case 'getSession': return supabaseGetSession_();
      case 'logout': return supabaseLogout_();
      case 'register': return supabaseRegister_(payload||{});
      case 'forgotPassword': return supabaseForgotPassword_(payload||{});
      case 'updatePassword': return supabaseUpdatePassword_(payload||{});
      case 'health': return supabaseHealth_();
      default: return bridgeCall_(name,payload||{});
    }
  }

  window.MAGASIN_API={
    call:call,
    health:function(){return call('health',{});},
    getSessionToken:getSessionToken,
    setSessionToken:setSessionToken,
    clearSession:clearSession
  };
})(window);

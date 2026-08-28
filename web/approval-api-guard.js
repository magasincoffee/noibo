/* MAGASIN NOIBO — approval API guard
 * Keeps the PENDING/ACTIVE login decision authoritative even though legacy
 * auth compatibility code may replace MAGASIN_API.call after page load.
 */
(function(window){
  'use strict';

  function install(){
    const api=window.MAGASIN_API;
    const c=window.MAGASIN_SUPABASE;
    if(!api || !c || typeof api.call!=='function') return;
    if(api.call.__magasinApprovalGuard==='1') return;

    const base=api.call.bind(api);
    const wrapped=async function(action,payload){
      const name=String(action||'');
      if(name!=='login' && name!=='getSession') return base(action,payload);

      if(name==='login'){
        const p=payload||{};
        const username=String(p.username||'').trim();
        const password=String(p.password||'');
        if(!username || !password) throw new Error('Vui lòng nhập tên đăng nhập và mật khẩu.');

        const resolved=username.indexOf('@')!==-1
          ? {data:username,error:null}
          : await c.rpc('resolve_login_email',{p_username:username});
        if(resolved.error) throw new Error('Không thể tra cứu tên đăng nhập. '+resolved.error.message);
        if(!resolved.data) throw new Error('Tên đăng nhập không tồn tại.');

        const auth=await c.auth.signInWithPassword({email:String(resolved.data),password:password});
        if(auth.error) throw new Error('Tên đăng nhập hoặc mật khẩu không đúng.');
        const session=auth.data&&auth.data.session;
        if(!session) throw new Error('Không thể tạo phiên đăng nhập.');

        const profileResult=await c.from('profiles')
          .select('id,username,full_name,email,phone,role,status,access_scope')
          .eq('id',session.user.id)
          .single();
        if(profileResult.error) throw new Error('Không tìm thấy hồ sơ MAGASIN cho tài khoản Supabase.');

        const pRow=profileResult.data||{};
        const profile={
          id:pRow.id||session.user.id,
          username:pRow.username||'',
          name:pRow.full_name||pRow.username||'',
          fullName:pRow.full_name||'',
          email:pRow.email||session.user.email||'',
          phone:pRow.phone||'',
          role:String(pRow.role||'STAFF').toUpperCase(),
          status:String(pRow.status||'PENDING').toUpperCase(),
          accessScope:pRow.access_scope||''
        };
        const token=session.access_token||'';
        if(api.setSessionToken) api.setSessionToken(token);

        if(profile.status==='PENDING'){
          window.dispatchEvent(new CustomEvent('magasin:pending-user',{detail:profile}));
          return {ok:false,pending:true,message:'Tài khoản đã xác thực nhưng đang chờ quản lý kích hoạt.',data:{user:profile,sessionToken:token}};
        }
        if(profile.status!=='ACTIVE'){
          try{await c.auth.signOut();}catch(e){}
          if(api.clearSession) api.clearSession();
          throw new Error('Tài khoản MAGASIN đang bị vô hiệu hóa.');
        }
        return {ok:true,user:profile,sessionToken:token,data:{user:profile,sessionToken:token}};
      }

      const sr=await c.auth.getSession();
      if(sr.error) throw sr.error;
      const session=sr.data&&sr.data.session;
      if(!session) return {ok:false,message:'Chưa có phiên Supabase.'};

      const profileResult=await c.from('profiles')
        .select('id,username,full_name,email,phone,role,status,access_scope')
        .eq('id',session.user.id)
        .single();
      if(profileResult.error) throw new Error('Không tìm thấy hồ sơ MAGASIN cho tài khoản Supabase.');
      const pRow=profileResult.data||{};
      const profile={
        id:pRow.id||session.user.id,
        username:pRow.username||'',
        name:pRow.full_name||pRow.username||'',
        fullName:pRow.full_name||'',
        email:pRow.email||session.user.email||'',
        phone:pRow.phone||'',
        role:String(pRow.role||'STAFF').toUpperCase(),
        status:String(pRow.status||'PENDING').toUpperCase(),
        accessScope:pRow.access_scope||''
      };
      const token=session.access_token||'';
      if(api.setSessionToken) api.setSessionToken(token);

      if(profile.status==='PENDING'){
        window.dispatchEvent(new CustomEvent('magasin:pending-user',{detail:profile}));
        return {ok:true,user:profile,sessionToken:token,data:{user:profile,sessionToken:token}};
      }
      if(profile.status!=='ACTIVE'){
        try{await c.auth.signOut();}catch(e){}
        if(api.clearSession) api.clearSession();
        return {ok:false,message:'Tài khoản MAGASIN đang bị vô hiệu hóa.'};
      }
      return {ok:true,user:profile,sessionToken:token,data:{user:profile,sessionToken:token}};
    };
    wrapped.__magasinApprovalGuard='1';
    api.call=wrapped;
  }

  install();
  setInterval(install,500);
})(window);

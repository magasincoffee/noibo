/* =========================================================
   MAGASIN — SUPABASE PUBLIC CLIENT CONFIG + DATA ADAPTER

   Browser-safe only. Never put database passwords, service_role
   keys, secret keys, or access tokens in this file.

   Authentication is already handled by web/api.js.
   This adapter handles read-only application pages that have not
   yet been migrated away from the old Apps Script action names.
========================================================= */
(function(window){
  'use strict';

  const CONFIG=Object.freeze({
    url:'https://menvbzlsncmpuvnaifxa.supabase.co',
    publishableKey:'sb_publishable_HsvCS6HDZnCDInd9PUoh0g_V34wJVqx'
  });

  window.MAGASIN_SUPABASE_CONFIG=CONFIG;

  let client=null;
  let clientPromise=null;

  function loadSdk_(){
    if(window.supabase&&typeof window.supabase.createClient==='function'){
      return Promise.resolve();
    }
    return new Promise(function(resolve,reject){
      const src='https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2';
      const existing=document.querySelector('script[data-magasin-supabase-sdk="1"]');
      if(existing){
        existing.addEventListener('load',resolve,{once:true});
        existing.addEventListener('error',()=>reject(new Error('Không tải được Supabase JS.')),{once:true});
        return;
      }
      const s=document.createElement('script');
      s.src=src;
      s.async=true;
      s.dataset.magasinSupabaseSdk='1';
      s.addEventListener('load',resolve,{once:true});
      s.addEventListener('error',()=>reject(new Error('Không tải được Supabase JS.')),{once:true});
      document.head.appendChild(s);
    });
  }

  async function getClient_(){
    if(client)return client;
    if(clientPromise)return clientPromise;
    clientPromise=(async function(){
      await loadSdk_();
      client=window.supabase.createClient(CONFIG.url,CONFIG.publishableKey,{
        auth:{autoRefreshToken:true,persistSession:true,detectSessionInUrl:true}
      });
      return client;
    })();
    try{return await clientPromise;}catch(err){clientPromise=null;throw err;}
  }

  function installAdapter_(){
    const api=window.MAGASIN_API;
    if(!api||typeof api.call!=='function'||api.__supabaseDataAdapter)return false;

    const originalCall=api.call.bind(api);

    api.call=async function(action,payload){
      const name=String(action||'').trim();
      const client=await getClient_();

      if(name==='getMySchedule'){
        const {data,error}=await client.rpc('get_my_schedule');
        if(error)throw new Error('Không tải được lịch làm: '+error.message);
        return {ok:true,data:{schedules:Array.isArray(data)?data:[]}};
      }

      if(name==='getAttendanceHistory'){
        const {data,error}=await client.rpc('get_my_attendance');
        if(error)throw new Error('Không tải được lịch sử chấm công: '+error.message);
        return {ok:true,data:{records:Array.isArray(data)?data:[]}};
      }

      if(name==='getMyShiftSwapRequests'){
        const {data,error}=await client.rpc('get_my_shift_swaps');
        if(error)throw new Error('Không tải được yêu cầu đổi ca: '+error.message);
        return {ok:true,data:{requests:Array.isArray(data)?data:[]}};
      }

      return originalCall(action,payload);
    };

    api.__supabaseDataAdapter=true;
    return true;
  }

  // api.js loads this file during its first Supabase call. At that moment
  // MAGASIN_API normally already exists. Retry briefly to cover load order.
  installAdapter_();
  window.setTimeout(installAdapter_,0);
  window.setTimeout(installAdapter_,50);
  window.setTimeout(installAdapter_,250);
  window.setTimeout(installAdapter_,1000);

  // UI hardening is kept as a separate file so authentication logic stays
  // isolated from the data adapter. This script loads before app.js and uses
  // capture-phase handling to neutralize the legacy eye-button handler.
  (function loadAuthUiHotfix_(){
    const id='magasin-auth-ui-hotfix';
    if(document.querySelector('script[data-magasin-auth-ui-hotfix="1"]'))return;
    const s=document.createElement('script');
    s.src='auth-ui-hotfix.js?v=20260828-2';
    s.async=false;
    s.dataset.magasinAuthUiHotfix='1';
    s.addEventListener('error',function(){console.warn('MAGASIN: không tải được auth-ui-hotfix.js');},{once:true});
    document.head.appendChild(s);
  })();
})(window);

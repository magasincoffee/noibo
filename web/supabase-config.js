/* MAGASIN — Supabase browser configuration
 * Only the public publishable key is stored here.
 * Never put service_role keys, database passwords or secrets in the frontend.
 */
(function(window){
  'use strict';
  const CONFIG=Object.freeze({
    url:'https://menvbzlsncmpuvnaifxa.supabase.co',
    publishableKey:'sb_publishable_HsvCS6HDZnCDInd9PUoh0g_V34wJVqx'
  });
  if(!window.supabase||typeof window.supabase.createClient!=='function'){
    throw new Error('Supabase JS chưa được tải.');
  }
  window.MAGASIN_SUPABASE_CONFIG=CONFIG;
  window.MAGASIN_SUPABASE=window.supabase.createClient(CONFIG.url,CONFIG.publishableKey,{auth:{autoRefreshToken:true,persistSession:true,detectSessionInUrl:true}});

  // Load the employee Workforce V2 surface after the application shell is ready.
  function loadWorkforceUi(){
    if(document.getElementById('magasin-workforce-ui')) return;
    const script=document.createElement('script');
    script.id='magasin-workforce-ui';
    script.src='workforce-ui.js';
    script.async=false;
    document.head.appendChild(script);
  }
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',loadWorkforceUi,{once:true});
  else loadWorkforceUi();
})(window);

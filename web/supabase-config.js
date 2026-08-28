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
})(window);

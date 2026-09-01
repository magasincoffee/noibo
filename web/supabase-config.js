/* MAGASIN — Supabase browser configuration */
(function(window, document){
  'use strict';
  const CONFIG=Object.freeze({
    url:'https://menvbzlsncmpuvnaifxa.supabase.co',
    publishableKey:'sb_publishable_HsvCS6HDZnCDInd9PUoh0g_V34wJVqx'
  });
  if(!window.supabase||typeof window.supabase.createClient!=='function') throw new Error('Supabase JS chưa được tải.');
  window.MAGASIN_SUPABASE_CONFIG=CONFIG;
  window.MAGASIN_SUPABASE=window.supabase.createClient(CONFIG.url,CONFIG.publishableKey,{auth:{autoRefreshToken:true,persistSession:true,detectSessionInUrl:true}});
  function loadWorkforceUi(){
    ['workforce-ui.js','attendance-workforce-ui.js','manager-workforce-ui.js','shift-swap-workforce-ui.js','schedule-ui-v2.js'].forEach((src)=>{
      if(document.querySelector('script[data-magasin-module="'+src+'"]'))return;
      const script=document.createElement('script');script.src=src+'?v=20260901-attendance-ui-v2';script.async=false;script.dataset.magasinModule=src;document.head.appendChild(script);
    });
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',loadWorkforceUi,{once:true});else setTimeout(loadWorkforceUi,0);
})(window, document);

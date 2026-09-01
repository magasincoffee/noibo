/* MAGASIN — shared auth entry guard for manager shell */
(function(window, document){
  'use strict';
  const sb=window.MAGASIN_SUPABASE;
  if(!sb)return;
  const INDEX=new URL('./index.html',window.top?.location?.href||location.href).href;
  const goLogin=()=>{ if(window.top&&window.top!==window) window.top.location.replace(INDEX); else location.replace(INDEX); };
  const hideLegacyAuth=()=>{ const el=document.getElementById('authShell'); if(el) el.style.display='none'; };
  const ensureSession=async()=>{ try{ const {data,error}=await sb.auth.getSession(); if(error||!data.session) goLogin(); }catch(_){ goLogin(); } };
  const bindLogout=()=>{
    const btn=document.getElementById('logoutBtn');
    if(!btn||btn.dataset.sharedAuthLogoutBound)return;
    btn.dataset.sharedAuthLogoutBound='1';
    btn.addEventListener('click',async e=>{
      e.preventDefault();
      e.stopImmediatePropagation();
      btn.disabled=true;
      try{await sb.auth.signOut();}finally{goLogin();}
    },true);
  };
  const boot=()=>{hideLegacyAuth();bindLogout();ensureSession();};
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',boot,{once:true}); else boot();
  sb.auth.onAuthStateChange(event=>{ if(event==='SIGNED_OUT') goLogin(); });
  window.MAGASIN_SHARED_AUTH_ENTRY={boot};
})(window,document);

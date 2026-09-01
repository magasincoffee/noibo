/* MAGASIN — remove legacy manager authentication surface before app boot */
(function(window, document){
  'use strict';
  const sb=window.MAGASIN_SUPABASE;
  const INDEX=new URL('./index.html', window.top?.location?.href || location.href).href;
  const goLogin=()=>{try{(window.top||window).location.replace(INDEX)}catch(_){location.replace(INDEX)}};
  const removeLegacyAuth=()=>{const el=document.getElementById('authShell');if(el)el.remove();};
  const bindLogout=()=>{const btn=document.getElementById('logoutBtn');if(!btn||btn.dataset.sharedAuthLogoutBound)return;btn.dataset.sharedAuthLogoutBound='1';btn.addEventListener('click',async e=>{e.preventDefault();e.stopImmediatePropagation();btn.disabled=true;try{await sb?.auth.signOut()}finally{goLogin();}},true)};
  const boot=()=>{removeLegacyAuth();bindLogout();if(sb)sb.auth.getSession().then(({data,error})=>{if(error||!data.session)goLogin()}).catch(goLogin);};
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
  window.MAGASIN_SHARED_AUTH_ENTRY={boot};
})(window,document);

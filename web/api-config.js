/* MAGASIN API CONFIG
   GitHub Frontend → Google Apps Script Web App

   Canonical Web App deployment for GitHub Pages.
   Không đặt mật khẩu, API key hoặc secret vào file này.
*/
window.MAGASIN_API_URL = 'https://script.google.com/macros/s/AKfycbwRRoB2RtiYSqNcXYuQ9uZ0boWwmS4iiyB0Abb5-fYNV4dh1mIedW8-PT-jlhGI-Ufk/exec';

/* Approval workflow loader.
   It starts early but waits until Supabase + MAGASIN_API are ready before
   installing the pending-account guard and OWNER approval UI. */
(function(){
  var src = 'approval-ui-v2.js?v=20260828-approval1';
  var s = document.createElement('script');
  s.src = src;
  s.async = true;
  s.defer = true;
  s.dataset.magasinApproval = '1';
  document.head.appendChild(s);
})();

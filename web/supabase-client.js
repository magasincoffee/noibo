/* MAGASIN — Supabase browser client
 * Uses only the public publishable key from supabase-config.js.
 * Never put service_role/database passwords in this file.
 */
(function(window){
  'use strict';
  const cfg = window.MAGASIN_SUPABASE_CONFIG;
  if (!cfg || !cfg.url || !cfg.publishableKey) {
    console.error('MAGASIN Supabase config is missing.');
    return;
  }
  if (!window.supabase || typeof window.supabase.createClient !== 'function') {
    console.error('Supabase JS library is not loaded.');
    return;
  }

  window.MAGASIN_SUPABASE = window.supabase.createClient(
    cfg.url,
    cfg.publishableKey,
    {
      auth: {
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: true
      }
    }
  );
})(window);

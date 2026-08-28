/* MAGASIN NOIBO — pending-session boot guard
 * Covers the page-reload case: if a persisted Supabase session belongs to a
 * verified but unapproved account, never leave the dashboard visible.
 */
(function(window){
  'use strict';
  var done=false;

  async function run(){
    if(done || !window.MAGASIN_SUPABASE) return;
    var c=window.MAGASIN_SUPABASE;
    try{
      var r=await c.auth.getSession();
      if(r.error || !r.data || !r.data.session) return;
      var session=r.data.session;
      var p=await c.from('profiles')
        .select('id,username,full_name,email,phone,role,status,access_scope')
        .eq('id',session.user.id)
        .single();
      if(p.error || !p.data) return;
      if(String(p.data.status||'').toUpperCase()==='PENDING'){
        done=true;
        var profile={
          id:p.data.id,
          username:p.data.username||'',
          name:p.data.full_name||p.data.username||'',
          fullName:p.data.full_name||'',
          email:p.data.email||session.user.email||'',
          phone:p.data.phone||'',
          role:String(p.data.role||'STAFF').toUpperCase(),
          status:'PENDING',
          accessScope:p.data.access_scope||''
        };
        window.dispatchEvent(new CustomEvent('magasin:pending-user',{detail:profile}));
      }
    }catch(e){}
  }

  var timer=setInterval(function(){
    if(window.MAGASIN_SUPABASE && document.body){
      run();
      if(done) clearInterval(timer);
    }
  },300);
  run();
})(window);

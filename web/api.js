/* =========================================================
   MAGASIN — GITHUB FRONTEND API CLIENT
   ARCH-03 / HTML Service iframe bridge
========================================================= */

(function(window){
  'use strict';

  const STORAGE_KEY = 'magasin_session_token';
  const REQUEST_TYPE = 'MAGASIN_BRIDGE_REQUEST';
  const RESPONSE_TYPE = 'MAGASIN_BRIDGE_RESPONSE';
  const READY_TYPE = 'MAGASIN_BRIDGE_READY';
  const BRIDGE_TIMEOUT = 15000;

  let bridgeFrame = null;
  let bridgeReadyPromise = null;
  const pending = new Map();

  function getApiUrl_(){
    const url = String(window.MAGASIN_API_URL || '').trim();
    if(!url) throw new Error('Chưa cấu hình MAGASIN_API_URL trong web/api-config.js');
    return url;
  }

  function getBridgeOrigin_(){
    return new URL(getApiUrl_()).origin;
  }

  function getBridgeUrl_(){
    const url = new URL(getApiUrl_());
    url.searchParams.set('bridge','1');
    return url.toString();
  }

  function getSessionToken(){
    try { return sessionStorage.getItem(STORAGE_KEY) || ''; } catch(err) { return ''; }
  }

  function setSessionToken(token){
    try {
      if(token) sessionStorage.setItem(STORAGE_KEY,String(token));
      else sessionStorage.removeItem(STORAGE_KEY);
    } catch(err) {}
  }

  function clearSession(){ setSessionToken(''); }

  function ensureBridge_(){
    if(bridgeReadyPromise) return bridgeReadyPromise;

    bridgeReadyPromise = new Promise(function(resolve,reject){
      const frame = document.createElement('iframe');
      frame.title = 'MAGASIN API Bridge';
      frame.setAttribute('aria-hidden','true');
      frame.style.position='fixed';
      frame.style.width='1px';
      frame.style.height='1px';
      frame.style.left='-9999px';
      frame.style.top='-9999px';
      frame.style.border='0';
      frame.style.opacity='0';
      frame.style.pointerEvents='none';
      frame.src = getBridgeUrl_();

      bridgeFrame = frame;

      const timer = setTimeout(function(){
        bridgeReadyPromise = null;
        reject(new Error('Không khởi tạo được Apps Script Bridge. Hãy kiểm tra Web App URL, quyền truy cập và Bridge.html.'));
      },BRIDGE_TIMEOUT);

      function onReady(event){
        if(event.source !== frame.contentWindow) return;
        if(event.origin !== getBridgeOrigin_()) return;
        if(!event.data || event.data.type !== READY_TYPE) return;
        clearTimeout(timer);
        window.removeEventListener('message',onReady);
        resolve(frame);
      }

      window.addEventListener('message',onReady);
      document.body.appendChild(frame);
    });

    return bridgeReadyPromise;
  }

  window.addEventListener('message',function(event){
    if(!event.data || event.data.type !== RESPONSE_TYPE) return;
    if(!bridgeFrame || event.source !== bridgeFrame.contentWindow) return;
    if(event.origin !== getBridgeOrigin_()) return;

    const id = String(event.data.requestId || '');
    const item = pending.get(id);
    if(!item) return;

    pending.delete(id);
    clearTimeout(item.timer);
    item.resolve(event.data.result || {ok:false,message:'Bridge không trả về dữ liệu.'});
  });

  async function call(action,payload){
    const name = String(action || '').trim();
    if(!name) throw new Error('Thiếu action.');

    const frame = await ensureBridge_();
    const requestId = 'req_' + Date.now() + '_' + Math.random().toString(36).slice(2);
    const token = getSessionToken();
    const body = payload && typeof payload === 'object' ? payload : {};
    const origin = getBridgeOrigin_();

    return new Promise(function(resolve,reject){
      const timer = setTimeout(function(){
        pending.delete(requestId);
        reject(new Error('Apps Script Bridge timeout.'));
      },BRIDGE_TIMEOUT);

      pending.set(requestId,{resolve:resolve,reject:reject,timer:timer});

      frame.contentWindow.postMessage({
        type:REQUEST_TYPE,
        requestId:requestId,
        action:name,
        sessionToken:token,
        payload:body
      },origin);
    }).then(function(result){
      if(name === 'login' && result && result.sessionToken) setSessionToken(result.sessionToken);
      else if(name === 'login' && result && result.data && result.data.sessionToken) setSessionToken(result.data.sessionToken);
      if(name === 'logout') clearSession();
      return result;
    });
  }

  async function health(){ return call('health',{}); }

  window.MAGASIN_API = {
    call:call,
    health:health,
    getSessionToken:getSessionToken,
    setSessionToken:setSessionToken,
    clearSession:clearSession
  };

})(window);

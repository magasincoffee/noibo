/* =========================================================
   MAGASIN — GITHUB FRONTEND API CLIENT
   ARCH-04 / HTML Service iframe bridge

   Robust handshake:
   GitHub Pages -> iframe Apps Script Web App -> INIT/READY
   -> postMessage -> google.script.run -> MAGASIN backend.
========================================================= */
(function(window){
  'use strict';

  const STORAGE_KEY='magasin_session_token';
  const REQUEST_TYPE='MAGASIN_BRIDGE_REQUEST';
  const INIT_TYPE='MAGASIN_BRIDGE_INIT';
  const RESPONSE_TYPE='MAGASIN_BRIDGE_RESPONSE';
  const READY_TYPE='MAGASIN_BRIDGE_READY';
  const BRIDGE_TIMEOUT=20000;
  const HANDSHAKE_INTERVAL=300;
  const HANDSHAKE_RETRIES=6;

  let bridgeFrame=null;
  let bridgeOrigin='';
  let bridgeReadyPromise=null;
  const pending=new Map();

  function getApiUrl_(){
    const url=String(window.MAGASIN_API_URL||'').trim();
    if(!url)throw new Error('Chưa cấu hình MAGASIN_API_URL trong web/api-config.js');
    return url;
  }

  function isAllowedBridgeOrigin_(origin){
    try{
      const u=new URL(origin);
      return u.protocol==='https:' && (
        u.hostname==='script.google.com' ||
        u.hostname==='script.googleusercontent.com'
      );
    }catch(err){return false;}
  }

  function getBridgeUrl_(){
    const u=new URL(getApiUrl_());
    u.searchParams.set('bridge','1');
    u.searchParams.set('_bridge','20260827-05');
    return u.toString();
  }

  function getSessionToken(){
    try{return sessionStorage.getItem(STORAGE_KEY)||'';}catch(err){return '';}
  }

  function setSessionToken(token){
    try{
      if(token)sessionStorage.setItem(STORAGE_KEY,String(token));
      else sessionStorage.removeItem(STORAGE_KEY);
    }catch(err){}
  }

  function clearSession(){setSessionToken('');}

  function sendInit_(frame){
    try{
      if(frame&&frame.contentWindow){
        frame.contentWindow.postMessage({type:INIT_TYPE,version:'20260827-05'},'*');
      }
    }catch(err){}
  }

  function ensureBridge_(){
    if(bridgeReadyPromise)return bridgeReadyPromise;

    bridgeReadyPromise=new Promise(function(resolve,reject){
      const frame=document.createElement('iframe');
      frame.title='MAGASIN API Bridge';
      frame.setAttribute('aria-hidden','true');
      frame.style.position='fixed';
      frame.style.width='1px';
      frame.style.height='1px';
      frame.style.left='-10000px';
      frame.style.top='-10000px';
      frame.style.border='0';
      frame.style.opacity='0';
      frame.style.pointerEvents='none';
      bridgeFrame=frame;

      let loadSeen=false;
      let retryCount=0;
      let retryTimer=null;

      function cleanup(){
        window.removeEventListener('message',onReady);
        frame.removeEventListener('load',onLoad);
        if(retryTimer)clearInterval(retryTimer);
        clearTimeout(timeout);
      }

      function fail(){
        cleanup();
        bridgeReadyPromise=null;
        bridgeOrigin='';
        reject(new Error(
          loadSeen
            ? 'Bridge đã tải nhưng không trả lời handshake. Kiểm tra quyền truy cập Web App và deployment đang trỏ tới phiên bản mới nhất.'
            : 'Không tải được Bridge. Kiểm tra URL /exec và quyền truy cập Web App.'
        ));
      }

      const timeout=setTimeout(fail,BRIDGE_TIMEOUT);

      function onReady(event){
        if(event.source!==frame.contentWindow)return;
        if(!isAllowedBridgeOrigin_(event.origin))return;
        if(!event.data||event.data.type!==READY_TYPE)return;
        cleanup();
        bridgeOrigin=event.origin;
        resolve(frame);
      }

      function onLoad(){
        loadSeen=true;
        sendInit_(frame);
      }

      window.addEventListener('message',onReady);
      frame.addEventListener('load',onLoad);
      document.body.appendChild(frame);
      frame.src=getBridgeUrl_();

      retryTimer=setInterval(function(){
        if(bridgeOrigin||!bridgeReadyPromise){
          clearInterval(retryTimer);
          return;
        }
        if(retryCount>=HANDSHAKE_RETRIES){
          clearInterval(retryTimer);
          return;
        }
        retryCount+=1;
        sendInit_(frame);
      },HANDSHAKE_INTERVAL);
    });

    return bridgeReadyPromise;
  }

  window.addEventListener('message',function(event){
    if(!event.data||event.data.type!==RESPONSE_TYPE)return;
    if(!bridgeFrame||event.source!==bridgeFrame.contentWindow)return;
    if(!isAllowedBridgeOrigin_(event.origin))return;
    if(bridgeOrigin&&event.origin!==bridgeOrigin)return;

    const id=String(event.data.requestId||'');
    const item=pending.get(id);
    if(!item)return;
    pending.delete(id);
    clearTimeout(item.timer);
    item.resolve(event.data.result||{ok:false,message:'Bridge không trả về dữ liệu.'});
  });

  async function call(action,payload){
    const name=String(action||'').trim();
    if(!name)throw new Error('Thiếu action.');
    const frame=await ensureBridge_();
    if(!bridgeOrigin)throw new Error('Bridge chưa xác nhận origin.');

    const requestId='req_'+Date.now()+'_'+Math.random().toString(36).slice(2);
    const token=getSessionToken();
    const body=payload&&typeof payload==='object'?payload:{};

    return new Promise(function(resolve,reject){
      const timer=setTimeout(function(){
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
      },bridgeOrigin);
    }).then(function(result){
      if(name==='login'){
        const tokenResult=result&&(result.sessionToken||(result.data&&result.data.sessionToken));
        if(tokenResult)setSessionToken(tokenResult);
      }
      if(name==='logout')clearSession();
      return result;
    });
  }

  async function health(){return call('health',{});}

  window.MAGASIN_API={
    call:call,
    health:health,
    getSessionToken:getSessionToken,
    setSessionToken:setSessionToken,
    clearSession:clearSession
  };
})(window);

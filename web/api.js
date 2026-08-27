/* =========================================================
   MAGASIN — GITHUB FRONTEND API CLIENT
   ARCH-05 / Apps Script HTML Service nested-iframe bridge

   Transport:
   GitHub top window
      ↕ MessageChannel
   Apps Script userCodeAppPanel (Bridge.html)
      ↓ google.script.run
   MAGASIN backend

   Apps Script HTML Service is rendered inside a Google-controlled
   nested iframe. Direct window.parent messaging is not reliable.
   Bridge.html transfers a MessagePort directly to the GitHub top window.
========================================================= */
(function(window){
  'use strict';

  const STORAGE_KEY='magasin_session_token';
  const RESPONSE_TYPE='MAGASIN_BRIDGE_RESPONSE';
  const READY_TYPE='MAGASIN_BRIDGE_READY';
  const BRIDGE_TIMEOUT=20000;

  let bridgeFrame=null;
  let bridgePort=null;
  let bridgeReadyPromise=null;
  const pending=new Map();

  function getApiUrl_(){
    const url=String(window.MAGASIN_API_URL||'').trim();
    if(!url)throw new Error('Chưa cấu hình MAGASIN_API_URL trong web/api-config.js');
    return url;
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

  function getBridgeUrl_(bridgeId){
    const u=new URL(getApiUrl_());
    u.searchParams.set('bridge','1');
    u.searchParams.set('_bridge','20260827-06');
    u.searchParams.set('bridgeId',bridgeId);
    return u.toString();
  }

  function ensureBridge_(){
    if(bridgeReadyPromise)return bridgeReadyPromise;

    bridgeReadyPromise=new Promise(function(resolve,reject){
      const bridgeId='bridge_'+Date.now()+'_'+Math.random().toString(36).slice(2);
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
      let timeout=null;

      function cleanup(){
        window.removeEventListener('message',onReady);
        frame.removeEventListener('load',onLoad);
        if(timeout)clearTimeout(timeout);
      }

      function fail(){
        cleanup();
        bridgeReadyPromise=null;
        bridgePort=null;
        reject(new Error(
          loadSeen
            ? 'Bridge đã tải nhưng không thiết lập được MessageChannel. Kiểm tra Web App deployment và Bridge.html.'
            : 'Không tải được Bridge. Kiểm tra URL /exec và quyền truy cập Web App.'
        ));
      }

      function onReady(event){
        const data=event.data||{};
        if(data.type!==READY_TYPE)return;
        if(event.origin!=='https://magasincoffee.github.io')return;
        if(String(data.bridgeId||'')!==bridgeId)return;
        if(!event.ports||!event.ports[0])return;

        bridgePort=event.ports[0];
        bridgePort.onmessage=function(messageEvent){
          const message=messageEvent.data||{};
          if(message.type!==RESPONSE_TYPE)return;
          const id=String(message.requestId||'');
          const item=pending.get(id);
          if(!item)return;
          pending.delete(id);
          clearTimeout(item.timer);
          item.resolve(message.result||{ok:false,message:'Bridge không trả về dữ liệu.'});
        };
        if(bridgePort.start)bridgePort.start();
        cleanup();
        resolve(frame);
      }

      function onLoad(){loadSeen=true;}

      window.addEventListener('message',onReady);
      frame.addEventListener('load',onLoad);
      document.body.appendChild(frame);
      frame.src=getBridgeUrl_(bridgeId);
      timeout=setTimeout(fail,BRIDGE_TIMEOUT);
    });

    return bridgeReadyPromise;
  }

  async function call(action,payload){
    const name=String(action||'').trim();
    if(!name)throw new Error('Thiếu action.');
    await ensureBridge_();
    if(!bridgePort)throw new Error('Bridge chưa sẵn sàng.');

    const requestId='req_'+Date.now()+'_'+Math.random().toString(36).slice(2);
    const token=getSessionToken();
    const body=payload&&typeof payload==='object'?payload:{};

    return new Promise(function(resolve,reject){
      const timer=setTimeout(function(){
        pending.delete(requestId);
        reject(new Error('Apps Script Bridge timeout.'));
      },BRIDGE_TIMEOUT);

      pending.set(requestId,{resolve:resolve,reject:reject,timer:timer});

      try{
        bridgePort.postMessage({
          type:'MAGASIN_BRIDGE_REQUEST',
          requestId:requestId,
          action:name,
          sessionToken:token,
          payload:body
        });
      }catch(err){
        clearTimeout(timer);
        pending.delete(requestId);
        reject(err);
      }
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

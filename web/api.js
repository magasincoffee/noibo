/* =========================================================
   MAGASIN — GITHUB FRONTEND API CLIENT
   ARCH-02

   Transport:
   GitHub Pages → HTTP POST → Apps Script Web App

   Important:
   - Request body là JSON string.
   - Không tự thêm Authorization / custom headers.
   - Content-Type text/plain giúp tránh CORS preflight.
   - Session token được lưu ở sessionStorage, không lưu mật khẩu.
========================================================= */

(function(window){
  'use strict';

  const STORAGE_KEY = 'magasin_session_token';

  function getApiUrl_(){
    const url = String(window.MAGASIN_API_URL || '').trim();
    if(!url){
      throw new Error('Chưa cấu hình MAGASIN_API_URL trong web/api-config.js');
    }
    return url;
  }

  function getSessionToken(){
    try{
      return sessionStorage.getItem(STORAGE_KEY) || '';
    }catch(err){
      return '';
    }
  }

  function setSessionToken(token){
    try{
      if(token){
        sessionStorage.setItem(STORAGE_KEY, String(token));
      }else{
        sessionStorage.removeItem(STORAGE_KEY);
      }
    }catch(err){}
  }

  function clearSession(){
    setSessionToken('');
  }

  async function call(action, payload){
    const url = getApiUrl_();
    const token = getSessionToken();

    const request = {
      action: String(action || '').trim(),
      sessionToken: token,
      payload: payload && typeof payload === 'object' ? payload : {}
    };

    const response = await fetch(url, {
      method: 'POST',
      redirect: 'follow',
      credentials: 'omit',
      headers: {
        'Content-Type': 'text/plain;charset=utf-8'
      },
      body: JSON.stringify(request)
    });

    const text = await response.text();

    let result;
    try{
      result = JSON.parse(text);
    }catch(err){
      throw new Error('API trả về dữ liệu không phải JSON: ' + text.slice(0,180));
    }

    if(!result || result.ok === false){
      return result || {ok:false,message:'API không trả về dữ liệu hợp lệ.'};
    }

    if(action === 'login' && result.data && result.data.sessionToken){
      setSessionToken(result.data.sessionToken);
    }

    if(action === 'logout'){
      clearSession();
    }

    return result;
  }

  async function health(){
    return call('health',{});
  }

  window.MAGASIN_API = {
    call: call,
    health: health,
    getSessionToken: getSessionToken,
    setSessionToken: setSessionToken,
    clearSession: clearSession
  };

})(window);

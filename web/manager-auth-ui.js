/* MAGASIN — Manager/OWNER Auth UI V1 */
(function(window, document){
  'use strict';
  function injectStyles(){
    if(document.getElementById('manager-auth-ui-v1')) return;
    const style=document.createElement('style');
    style.id='manager-auth-ui-v1';
    style.textContent=`
      .auth-shell{min-height:100vh!important;display:grid!important;place-items:center!important;padding:24px!important;box-sizing:border-box!important;background:radial-gradient(circle at 8% 20%,rgba(22,183,197,.10),transparent 34%),#F4F7FB!important}
      .auth-card{width:min(1080px,100%)!important;min-height:650px!important;padding:0!important;display:grid!important;grid-template-columns:minmax(360px,.92fr) minmax(420px,1.08fr)!important;grid-template-rows:1fr auto auto!important;grid-template-areas:"brand view" "brand message" "brand footer"!important;overflow:hidden!important;border:1px solid #DCE5F0!important;border-radius:28px!important;background:#fff!important;color:#102A43!important;box-shadow:0 24px 70px rgba(16,42,67,.14)!important}
      .auth-card .brand{grid-area:brand!important;margin:0!important;padding:52px 46px!important;text-align:left!important;display:flex!important;flex-direction:column!important;justify-content:center!important;align-items:flex-start!important;background:linear-gradient(160deg,#102A43 0%,#12405A 58%,#08777A 100%)!important;color:#fff!important;position:relative!important;overflow:hidden!important}
      .auth-card .brand:before,.auth-card .brand:after{content:"";position:absolute;border-radius:50%;background:rgba(255,255,255,.07);pointer-events:none}.auth-card .brand:before{width:360px;height:360px;right:-210px;top:-150px}.auth-card .brand:after{width:240px;height:240px;left:-130px;bottom:-120px}
      .auth-card .brand .logo{width:62px!important;height:62px!important;margin:0 0 24px!important;border-radius:18px!important;background:linear-gradient(135deg,#16B7C5,#2F9DE0)!important;z-index:1}.auth-card .brand .logo svg{width:42px!important;height:42px!important}
      .auth-kicker{position:relative;z-index:1;display:inline-flex;padding:7px 10px;border:1px solid rgba(255,255,255,.18);border-radius:999px;background:rgba(255,255,255,.08);font-size:10px;font-weight:800;letter-spacing:.08em;color:#B8F4F0;margin-bottom:18px}
      .auth-card .brand h1{position:relative;z-index:1;margin:0!important;font-size:31px!important;line-height:1.15!important;letter-spacing:.01em!important}.auth-card .brand p{position:relative;z-index:1;margin:8px 0 22px!important;color:#B6CADD!important;font-size:13px!important}
      .auth-brand-headline{position:relative;z-index:1;max-width:430px;font-size:28px;line-height:1.18;font-weight:800;margin:0 0 14px;color:#fff}.auth-brand-copy{position:relative;z-index:1;max-width:440px;color:#D8EAF0;font-size:14px;line-height:1.7;margin:0 0 24px}
      .auth-brand-list{position:relative;z-index:1;display:grid;gap:11px;margin:0;padding:0;list-style:none}.auth-brand-list li{display:flex;gap:10px;align-items:flex-start;color:#EFFBFC;font-size:13px;line-height:1.5}.auth-brand-list li:before{content:"✓";display:grid;place-items:center;flex:0 0 22px;width:22px;height:22px;border-radius:50%;background:rgba(22,183,197,.18);color:#72E8E4;font-weight:900}
      .auth-card .auth-view{grid-area:view!important;align-self:start!important;padding:54px 58px 12px!important;color:#102A43!important}.auth-heading{margin:0 0 8px;font-size:30px;font-weight:800;line-height:1.18;color:#102A43}.auth-subheading{margin:0 0 28px;color:#617793;font-size:13px;line-height:1.55}
      .auth-card .auth-label{margin:16px 0 8px!important;color:#102A43!important;font-size:12px!important;font-weight:800!important}.auth-card .auth-input,.auth-card select{height:52px!important;border:1px solid #DCE5F0!important;border-radius:12px!important;background:#fff!important;color:#102A43!important;box-shadow:none!important}.auth-card .auth-input:focus,.auth-card select:focus{outline:none!important;border-color:#16B7C5!important;box-shadow:0 0 0 4px rgba(22,183,197,.10)!important}
      .auth-card .eye{color:#6C8199!important;right:4px!important;top:3px!important}.auth-card .link{color:#167A86!important}.auth-card .switch{color:#617793!important;margin-top:18px!important}.auth-card .forgot{margin:9px 0 18px!important;text-align:right!important}.auth-card .primary{background:#16B7C5!important;box-shadow:0 10px 22px rgba(22,183,197,.18)!important;border-radius:11px!important}
      .auth-card .message{grid-area:message!important;margin:0!important;padding:0 58px 8px!important;min-height:22px!important;text-align:left!important;color:#617793!important}.auth-card .message.error{color:#A44739!important}.auth-card .message.success{color:#166E5A!important}.auth-card .auth-footer{grid-area:footer!important;margin:0!important;padding:0 58px 28px!important;color:#8A9BB0!important;text-align:left!important;font-size:11px!important}
      @media(max-width:900px){.auth-shell{padding:14px!important;place-items:stretch!important}.auth-card{width:min(720px,100%)!important;min-height:0!important;grid-template-columns:1fr!important;grid-template-rows:auto auto auto auto!important;grid-template-areas:"brand" "view" "message" "footer"!important;border-radius:22px!important}.auth-card .brand{padding:34px 30px!important}.auth-brand-headline{font-size:23px}.auth-card .auth-view{padding:34px 30px 8px!important}.auth-card .message{padding:0 30px 8px!important}.auth-card .auth-footer{padding:0 30px 22px!important}}
      @media(max-width:520px){.auth-card .brand{padding:28px 22px!important}.auth-card .brand .logo{width:54px!important;height:54px!important}.auth-card .brand h1{font-size:27px!important}.auth-brand-headline{font-size:21px}.auth-brand-copy{font-size:13px}.auth-card .auth-view{padding:28px 22px 6px!important}.auth-heading{font-size:25px}.auth-card .message{padding:0 22px 8px!important}.auth-card .auth-footer{padding:0 22px 18px!important}}
    `;
    document.head.appendChild(style);
  }
  function enhanceBrand(){
    const brand=document.querySelector('#authShell .brand');
    if(!brand || brand.dataset.managerAuthEnhanced) return;
    brand.dataset.managerAuthEnhanced='1';
    const logo=brand.querySelector('.logo'),h1=brand.querySelector('h1'),p=brand.querySelector('p');
    if(h1) h1.textContent='MAGASIN'; if(p) p.textContent='Hệ thống quản lý nội bộ';
    const kicker=document.createElement('div'); kicker.className='auth-kicker'; kicker.textContent='WORKFORCE · SECURE ACCESS';
    const headline=document.createElement('div'); headline.className='auth-brand-headline'; headline.textContent='Đăng nhập để quản lý công việc mỗi ngày.';
    const copy=document.createElement('p'); copy.className='auth-brand-copy'; copy.textContent='Một tài khoản dùng cho lịch làm, chấm công, ca làm và các tính năng nội bộ được phân quyền theo vai trò.';
    const list=document.createElement('ul'); list.className='auth-brand-list'; ['Xác thực tài khoản bằng Supabase Auth.','Tài khoản mới chờ quản lý cấp quyền.','Quyền truy cập được kiểm soát theo vai trò.'].forEach(t=>{const li=document.createElement('li');li.textContent=t;list.appendChild(li);});
    if(logo) logo.insertAdjacentElement('afterend',kicker); else brand.prepend(kicker); const anchor=p||h1||brand.lastElementChild; if(anchor) anchor.insertAdjacentElement('afterend',headline); headline.insertAdjacentElement('afterend',copy); copy.insertAdjacentElement('afterend',list);
  }
  function enhanceViews(){
    const specs={'auth-login':['Chào mừng trở lại','Đăng nhập bằng tên đăng nhập hoặc email của bạn.'],'auth-register':['Tạo tài khoản','Đăng ký tài khoản để bắt đầu sử dụng hệ thống nội bộ.'],'auth-forgot':['Khôi phục mật khẩu','Nhập email đã đăng ký để nhận liên kết đặt lại mật khẩu.'],'auth-reset':['Đặt mật khẩu mới','Tạo mật khẩu mới bằng liên kết khôi phục đã nhận qua email.']};
    Object.entries(specs).forEach(([id,[title,sub]])=>{const view=document.getElementById(id);if(!view||view.querySelector('.auth-heading'))return;const heading=document.createElement('div');heading.className='auth-heading';heading.textContent=title;const subheading=document.createElement('p');subheading.className='auth-subheading';subheading.textContent=sub;view.prepend(subheading);view.prepend(heading);});
  }
  function boot(){injectStyles();enhanceBrand();enhanceViews();}
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',boot,{once:true}); else boot();
  window.MAGASIN_MANAGER_AUTH_UI={refresh:boot};
})(window,document);

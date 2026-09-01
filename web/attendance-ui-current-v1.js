/* MAGASIN — Current Employee V40 attendance entry UI
 * UI-only stage: no Supabase read/write calls are made here.
 * Purpose: add the attendance-entry surface to the existing V40 screen
 * before connecting the approved Attendance RPCs.
 */
(function(window, document){
  'use strict';

  const ROOT_ID='magasin-current-attendance-entry';
  const STYLE_ID='magasin-current-attendance-style';
  const STORE_OPTIONS=['CN1','CN2','CN3','CN4'];

  const pad=n=>String(n).padStart(2,'0');
  const todayVN=()=>{
    const parts=new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Ho_Chi_Minh',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(new Date());
    const map={};parts.forEach(p=>map[p.type]=p.value);
    return `${map.year}-${map.month}-${map.day}`;
  };
  const times=()=>{
    const out=[];
    for(let h=0;h<24;h++)for(const m of [0,30])out.push(`${pad(h)}:${pad(m)}`);
    return out;
  };
  const esc=v=>String(v??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
  const optionList=(items,selected)=>items.map(v=>`<option value="${esc(v)}"${v===selected?' selected':''}>${esc(v)}</option>`).join('');

  function injectStyles(doc){
    if(doc.getElementById(STYLE_ID))return;
    const s=doc.createElement('style');
    s.id=STYLE_ID;
    s.textContent=`
      #${ROOT_ID}{margin-top:0;margin-bottom:16px}
      #${ROOT_ID} .att-ui-entry-grid{display:grid;grid-template-columns:minmax(0,1.55fr) minmax(420px,1fr);gap:16px;align-items:stretch}
      #${ROOT_ID} .att-ui-card{background:#fff;border:1px solid #DCE5F0;border-radius:16px;box-shadow:0 2px 8px rgba(16,42,67,.06);padding:20px}
      #${ROOT_ID} .att-ui-title{font-size:17px;font-weight:700;color:#102A43;margin:0}
      #${ROOT_ID} .att-ui-sub{margin-top:4px;font-size:12px;color:#617793}
      #${ROOT_ID} .att-ui-form-grid{display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-top:16px}
      #${ROOT_ID} .att-ui-field label{display:block;margin-bottom:7px;color:#617793;font-size:13px;font-weight:500}
      #${ROOT_ID} .att-ui-field input,#${ROOT_ID} .att-ui-field select{width:100%;height:46px;border:1px solid #DCE5F0;border-radius:10px;background:#fff;color:#102A43;padding:0 12px;font:500 14px Inter,system-ui,sans-serif;box-sizing:border-box}
      #${ROOT_ID} .att-ui-field input:focus,#${ROOT_ID} .att-ui-field select:focus{outline:none;border-color:#16B7C5;box-shadow:0 0 0 3px rgba(22,183,197,.14)}
      #${ROOT_ID} .att-ui-help{margin-top:16px;padding:12px 14px;border-radius:11px;background:#F8FAFD;color:#617793;font-size:12px;line-height:1.5}
      #${ROOT_ID} .att-ui-action-row{display:flex;justify-content:flex-start;gap:8px;margin-top:16px;flex-wrap:wrap}
      #${ROOT_ID} .att-ui-primary{height:44px;padding:0 17px;border:0;border-radius:10px;background:#16B7C5;color:#fff;font:700 14px Inter,system-ui,sans-serif;cursor:pointer}
      #${ROOT_ID} .att-ui-primary:hover{filter:brightness(.98)}
      #${ROOT_ID} .att-ui-primary:disabled{opacity:.55;cursor:not-allowed}
      #${ROOT_ID} .att-ui-status{min-height:19px;margin-top:9px;color:#617793;font-size:12px}
      #${ROOT_ID} .att-ui-history-head{display:flex;justify-content:space-between;gap:12px;align-items:flex-start}
      #${ROOT_ID} .att-ui-history-note{margin-top:4px;font-size:12px;color:#617793}
      #${ROOT_ID} .att-ui-empty{display:flex;align-items:center;justify-content:center;min-height:168px;margin-top:16px;border:1px dashed #DCE5F0;border-radius:12px;color:#95A3B7;font-size:13px;text-align:center;padding:12px}
      @media(max-width:1050px){#${ROOT_ID} .att-ui-entry-grid{grid-template-columns:1fr}.att-ui-card{min-width:0}}
      @media(max-width:760px){#${ROOT_ID} .att-ui-form-grid{grid-template-columns:1fr}#${ROOT_ID} .att-ui-card{padding:16px}}
    `;
    doc.head.appendChild(s);
  }

  function findView(doc){return doc.querySelector('#view-attendance');}

  function build(doc){
    const view=findView(doc);
    if(!view)return false;
    injectStyles(doc);
    let root=doc.getElementById(ROOT_ID);
    if(root)return true;

    root=doc.createElement('section');
    root.id=ROOT_ID;
    root.setAttribute('data-ui-stage','attendance-entry-v1');
    root.innerHTML=`
      <div class="att-ui-entry-grid">
        <section class="att-ui-card">
          <div class="att-ui-title">Chấm công</div>
          <div class="att-ui-sub">Nhập thông tin ca làm theo giao diện MAGASIN V40.</div>
          <div class="att-ui-form-grid">
            <div class="att-ui-field">
              <label for="attUiDate">Ngày</label>
              <input id="attUiDate" type="date" value="${esc(todayVN())}">
            </div>
            <div class="att-ui-field">
              <label for="attUiStore">Cửa hàng</label>
              <select id="attUiStore"><option value="">Chọn cửa hàng</option>${optionList(STORE_OPTIONS,'')}</select>
            </div>
            <div class="att-ui-field">
              <label for="attUiStart">Giờ vào · 24 giờ</label>
              <select id="attUiStart"><option value="">Chọn giờ vào</option>${optionList(times(),'')}</select>
            </div>
            <div class="att-ui-field">
              <label for="attUiEnd">Giờ ra · 24 giờ</label>
              <select id="attUiEnd"><option value="">Chọn giờ ra</option>${optionList(times(),'')}</select>
            </div>
          </div>
          <div class="att-ui-help">Giai đoạn UI: biểu mẫu đã sẵn sàng nhưng chưa ghi dữ liệu. Nút xác nhận sẽ được nối vào luồng chấm công thật ở bước backend.</div>
          <div class="att-ui-action-row"><button id="attUiConfirm" class="att-ui-primary" type="button">Hoàn thành chấm công</button></div>
          <div id="attUiStatus" class="att-ui-status" aria-live="polite"></div>
        </section>
        <section class="att-ui-card">
          <div class="att-ui-history-head"><div><div class="att-ui-title">Lịch sử chấm công</div><div class="att-ui-history-note">Khu vực hiện tại được giữ nguyên để nối dữ liệu thật ở bước backend.</div></div></div>
          <div class="att-ui-empty">Chưa nối dữ liệu ở bước UI. Lịch sử chấm công hiện tại của Employee V40 vẫn được giữ nguyên bên dưới.</div>
        </section>
      </div>
    `;

    const anchor=view.firstElementChild;
    if(anchor) view.insertBefore(root,anchor); else view.appendChild(root);

    const status=doc.getElementById('attUiStatus');
    const confirm=doc.getElementById('attUiConfirm');
    confirm?.addEventListener('click',()=>{
      const date=doc.getElementById('attUiDate')?.value||'';
      const store=doc.getElementById('attUiStore')?.value||'';
      const start=doc.getElementById('attUiStart')?.value||'';
      const end=doc.getElementById('attUiEnd')?.value||'';
      if(!date||!store||!start||!end){if(status)status.textContent='Vui lòng chọn đủ ngày, cửa hàng, giờ vào và giờ ra.';return;}
      if(status)status.textContent='Giao diện đã sẵn sàng. Chưa ghi dữ liệu — sẽ nối RPC ở bước backend.';
    });
    return true;
  }

  function mount(doc){
    if(!doc)return;
    build(doc);
    const view=findView(doc);
    if(!view||view.__attUiObserver)return;
    const obs=new MutationObserver(()=>{if(!doc.getElementById(ROOT_ID))build(doc);});
    obs.observe(view,{childList:true,subtree:true});
    view.__attUiObserver=obs;
  }

  function start(){
    mount(document);
    let tries=0;
    const timer=setInterval(()=>{mount(document);if(++tries>30)clearInterval(timer);},250);
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
  window.MAGASIN_CURRENT_ATTENDANCE_UI={mount};
})(window,document);

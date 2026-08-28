/* MAGASIN — SCHEDULE V2 CONTROL LAYER */
(function(window, document){
  'use strict';
  const esc=function(v){return String(v==null?'':v).replace(/[&<>\"']/g,function(m){return {'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;',"'":'&#39;'}[m];});};
  const key=function(d){return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');};
  const monday=function(offset){var d=new Date();d.setHours(12,0,0,0);var day=d.getDay();d.setDate(d.getDate()-(day===0?6:day-1)+(offset||0)*7);return d;};
  const timeOptions=function(){var s='<option value="">Chọn giờ</option>';for(var h=0;h<24;h++){for(var m of [0,30]){var v=String(h).padStart(2,'0')+':'+String(m).padStart(2,'0');s+='<option value="'+v+'">'+v+'</option>';}}return s;};

  function installOwnerMenu(){
    var menus=[document.getElementById('appMenu'),document.getElementById('drawerMenu')].filter(Boolean);
    menus.forEach(function(menu){
      if(menu.dataset.sv2Control==='1')return;
      menu.dataset.sv2Control='1';
      var observer=new MutationObserver(function(){
        var role=(document.getElementById('userRole')||{}).textContent||'';
        if(role!=='Chủ hệ thống')return;
        if(menu.querySelector('[data-sv2-requirements]'))return;
        var b=document.createElement('button');
        b.type='button';
        b.dataset.sv2Requirements='1';
        b.className=menu.classList.contains('menu')?'menu-item manager-only-menu':'drawer-btn';
        b.innerHTML=menu.classList.contains('menu')?'<span class="menu-icon">🎯</span><span class="menu-text">Nhu cầu nhân sự</span>':'<span>🎯</span><span>Nhu cầu nhân sự</span>';
        b.addEventListener('click',function(e){e.preventDefault();e.stopPropagation();if(typeof window.renderStaffingRequirementsV2_==='function')window.renderStaffingRequirementsV2_();});
        menu.appendChild(b);
      });
      observer.observe(menu,{childList:true,subtree:true});
    });
  }

  function renderStaffingRequirementsV2(){
    if(typeof resetPageLayout_==='function')resetPageLayout_();
    var box=document.getElementById('pageContent');if(!box)return;
    var w=monday(1), end=new Date(w);end.setDate(end.getDate()+6);
    var fmt=new Intl.DateTimeFormat('vi-VN',{day:'2-digit',month:'2-digit',year:'numeric'});
    box.innerHTML='<div class="sv2-card"><div class="sv2-head"><div><h3>Nhu cầu nhân sự</h3><p>Chủ hệ thống khai báo số người cần theo từng khoảng thời gian và năng lực. Có thể sao chép tuần trước.</p></div><span class="sv2-badge">OWNER</span></div><div class="sv2-manager-toolbar" style="margin-top:14px"><label>Cửa hàng<select id="sv2ReqStore"><option>Đang tải…</option></select></label><label>Tuần bắt đầu<input id="sv2ReqStart" type="date" value="'+key(w)+'"></label><label>Tuần kết thúc<input id="sv2ReqEnd" type="date" value="'+key(end)+'" readonly></label><button class="sv2-primary" id="sv2ReqLoad" type="button">Xem</button></div><div class="sv2-actions" style="justify-content:flex-start"><button class="sv2-secondary" id="sv2ReqCopy" type="button">↗ Sao chép tuần trước</button><button class="sv2-primary" id="sv2ReqAdd" type="button">＋ Thêm nhu cầu</button></div><div id="sv2ReqForm" style="display:none" class="sv2-card"><div class="sv2-form"><label>Ngày<input id="sv2ReqDate" type="date"></label><label>Giờ bắt đầu<select id="sv2ReqStartTime">'+timeOptions()+'</select></label><label>Giờ kết thúc<select id="sv2ReqEndTime">'+timeOptions()+'</select></label><label>Năng lực<input id="sv2ReqSkill" placeholder="Ví dụ: BARISTA"></label><label>Cấp tối thiểu<input id="sv2ReqSkillLevel" type="number" min="0" max="4" value="0"></label><label>Tối thiểu<input id="sv2ReqMin" type="number" min="0" value="1"></label><label>Mục tiêu<input id="sv2ReqTarget" type="number" min="0" value="1"></label><label>Tối đa<input id="sv2ReqMax" type="number" min="0" value="1"></label></div><div class="sv2-actions"><button class="sv2-primary" id="sv2ReqSave" type="button">Lưu nhu cầu</button></div><div id="sv2ReqMsg" class="sv2-status"></div></div><div id="sv2ReqList" class="sv2-requirements"><div class="sv2-empty">Chọn cửa hàng và bấm Xem.</div></div></div>';
    google.script.run.withSuccessHandler(function(r){var s=document.getElementById('sv2ReqStore');s.innerHTML='<option value="">Chọn cửa hàng</option>'+((r&&r.ok?r.stores:[])||[]).map(function(x){return '<option value="'+esc(x)+'">'+esc(x)+'</option>';}).join('');}).getScheduleV2StoreOptions(currentSessionToken);
    document.getElementById('sv2ReqLoad').onclick=loadRequirements;
    document.getElementById('sv2ReqAdd').onclick=function(){document.getElementById('sv2ReqForm').style.display='block';document.getElementById('sv2ReqDate').value=document.getElementById('sv2ReqStart').value;};
    document.getElementById('sv2ReqSave').onclick=saveRequirement;
    document.getElementById('sv2ReqCopy').onclick=copyRequirementWeek;
  }

  function loadRequirements(){
    var store=document.getElementById('sv2ReqStore').value,start=document.getElementById('sv2ReqStart').value,end=document.getElementById('sv2ReqEnd').value,list=document.getElementById('sv2ReqList');
    google.script.run.withSuccessHandler(function(r){if(!r||!r.ok){list.innerHTML='<div class="sv2-empty">'+esc(r&&r.message||'Không tải được.')+'</div>';return;}var items=r.items||[];list.innerHTML=items.length?items.map(function(x){return '<div class="sv2-req"><strong>'+esc(x.date)+'</strong><strong>'+esc(x.start)+'–'+esc(x.end)+'</strong><span>'+esc(x.skill||'GENERAL')+'</span><span>Min '+x.minimum+' · Target '+x.target+' · Max '+x.maximum+'</span><span>Level ≥ '+x.minSkill+'</span></div>';}).join(''):'<div class="sv2-empty">Chưa có nhu cầu nhân sự.</div>';}).getStaffingRequirements(currentSessionToken,{store:store,startDate:start,endDate:end});
  }

  function saveRequirement(){
    var data={date:document.getElementById('sv2ReqDate').value,start:document.getElementById('sv2ReqStartTime').value,end:document.getElementById('sv2ReqEndTime').value,store:document.getElementById('sv2ReqStore').value,skill:document.getElementById('sv2ReqSkill').value,minSkill:Number(document.getElementById('sv2ReqSkillLevel').value||0),minimum:Number(document.getElementById('sv2ReqMin').value||0),target:Number(document.getElementById('sv2ReqTarget').value||0),maximum:Number(document.getElementById('sv2ReqMax').value||0)};
    var msg=document.getElementById('sv2ReqMsg');
    google.script.run.withSuccessHandler(function(r){msg.className='sv2-status '+(r&&r.ok?'ok':'err');msg.textContent=r&&r.message||'';if(r&&r.ok){loadRequirements();}}).withFailureHandler(function(e){msg.className='sv2-status err';msg.textContent=e&&e.message||'Lỗi kết nối.';}).saveStaffingRequirement(currentSessionToken,data);
  }

  function copyRequirementWeek(){
    var store=document.getElementById('sv2ReqStore').value,toStart=document.getElementById('sv2ReqStart').value;var d=new Date(toStart+'T12:00:00');d.setDate(d.getDate()-7);var fromStart=key(d);var msg=document.getElementById('sv2ReqMsg')||document.createElement('div');google.script.run.withSuccessHandler(function(r){msg.className='sv2-status '+(r&&r.ok?'ok':'err');msg.textContent=r&&r.message||'';loadRequirements();}).withFailureHandler(function(e){msg.className='sv2-status err';msg.textContent=e&&e.message||'Lỗi kết nối.';}).copyStaffingRequirements(currentSessionToken,{fromStart:fromStart,toStart:toStart,store:store});
  }

  document.addEventListener('click',function(e){
    var btn=e.target.closest && e.target.closest('#sv2AutoSchedule');
    if(!btn)return;
    e.preventDefault();e.stopPropagation();e.stopImmediatePropagation();
    var store=document.getElementById('sv2ManagerStore')&&document.getElementById('sv2ManagerStore').value;
    var start=document.getElementById('sv2ManagerStart')&&document.getElementById('sv2ManagerStart').value;
    var end=document.getElementById('sv2ManagerEnd')&&document.getElementById('sv2ManagerEnd').value;
    var msg=document.getElementById('sv2ManagerMsg');
    if(!store){msg.className='sv2-status err';msg.textContent='Vui lòng chọn cửa hàng.';return;}
    msg.className='sv2-status';msg.textContent='Đang tạo và kiểm tra lịch nháp…';btn.disabled=true;
    google.script.run.withSuccessHandler(function(r){
      if(!r||!r.ok){msg.className='sv2-status err';msg.textContent=r&&r.message||'Không tạo được lịch.';btn.disabled=false;return;}
      google.script.run.withSuccessHandler(function(v){
        btn.disabled=false;
        if(!v||!v.ok){msg.className='sv2-status err';msg.textContent=(v&&v.message||'Draft bị chặn.')+' '+((v&&v.errors)||[]).join(' | ');return;}
        msg.className='sv2-status ok';msg.textContent='Draft hợp lệ: '+(r.assignments||[]).length+' phân công, '+(r.warnings||[]).length+' cảnh báo. Chưa publish.';
        if(typeof loadManagerBoard==='function')loadManagerBoard();
      }).withFailureHandler(function(e){btn.disabled=false;msg.className='sv2-status err';msg.textContent='Không kiểm tra được draft: '+(e&&e.message||'Lỗi');}).validateScheduleDraftHardRules(currentSessionToken,r.generationId);
    }).withFailureHandler(function(e){btn.disabled=false;msg.className='sv2-status err';msg.textContent='Không tạo được draft: '+(e&&e.message||'Lỗi');}).generateScheduleDraft(currentSessionToken,{store:store,startDate:start,endDate:end});
  },true);

  window.renderStaffingRequirementsV2_=renderStaffingRequirementsV2;
  installOwnerMenu();
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',installOwnerMenu);else installOwnerMenu();
})(window);

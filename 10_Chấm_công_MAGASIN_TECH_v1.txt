/* =========================================================
   MAGASIN — CHẤM CÔNG V26
   File được tách từ Code.gs hiện tại.
   Chỉ tách module, không thay đổi logic chức năng.
   Chứa toàn bộ logic chấm công, tính giờ công và tiền công.
   Dùng hàm chuẩn hóa ngày/phạm vi/quyền chung từ module 02 và 07.

   LƯU Ý:
   - Tên FILE dùng tiếng Việt 100% để dễ kiểm soát.
   - Tên HÀM hiện tại được giữ nguyên để không làm hỏng các lời gọi
     từ Index.html và giữa các module.
   - Tất cả file .gs trong cùng Apps Script Project dùng chung phạm vi.
========================================================= */

function ensureAttendanceStructure_(){
  ensureOperationalSheets_();
  const sh=getUsersSheet_().getParent().getSheetByName('Chấm công');
  if(!sh)return;
  const headers=['Id','Ngày','Người dùng','Cửa hàng','Check-in','Check-out','Trạng thái','Đi muộn phút','Về sớm phút','Ghi chú','Ngày tạo','Họ tên','Ca','Bậc NV','Đơn giá giờ','Giờ công','Thành tiền','Giờ ca bắt đầu','Giờ ca kết thúc'];
  const cur=sh.getRange(1,1,1,Math.max(1,sh.getLastColumn())).getValues()[0].map(x=>String(x||'').trim());
  headers.forEach((x,i)=>{if(cur[i]!==x)sh.getRange(1,i+1).setValue(x);});

  // Chuẩn hóa định dạng Sheet theo múi giờ Việt Nam và 24 giờ.
  const lastRow=sh.getLastRow();
  if(lastRow>=2){
    sh.getRange(2,5,lastRow-1,2).setNumberFormat('HH:mm'); // E:F Check-in/Check-out
    sh.getRange(2,11,lastRow-1,1).setNumberFormat('dd/MM/yyyy HH:mm:ss'); // K Ngày tạo
    sh.getRange(2,18,lastRow-1,2).setNumberFormat('HH:mm'); // R:S Giờ ca bắt đầu/kết thúc
  }
}

function ensureEmployeeGrade_(username,fullName){
  const sh=getOperationalSheet_('Bậc nhân viên'),rows=getOperationalRows_(sh),t=clean_(username).toLowerCase();
  for(let i=1;i<rows.length;i++)if(String(rows[i][1]||'').toLowerCase()===t)return{grade:String(rows[i][3]||''),rate:Number(rows[i][4]||0)};
  sh.appendRow([Utilities.getUuid(),username,fullName||'','1',16000,'ACTIVE',new Date()]);
  return{grade:'1',rate:16000};
}

function parseClockTime_(v){
  const m=clean_(v).match(/^(\d{2}):(\d{2})$/);
  if(!m)return null;
  const hour=Number(m[1]), minute=Number(m[2]);
  if(hour<0||hour>23||minute<0||minute>59)return null;
  return hour*60+minute;
}

function findCurrentScheduledShift_(username,store){
  const rows=getOperationalRows_(getOperationalSheet_('Lịch làm việc'));
  const today=Utilities.formatDate(new Date(),'Asia/Ho_Chi_Minh','yyyy-MM-dd');
  const now=Number(Utilities.formatDate(new Date(),VN_TIMEZONE,'HH'))*60+Number(Utilities.formatDate(new Date(),VN_TIMEZONE,'mm'));
  for(let i=1;i<rows.length;i++){const r=rows[i];if(String(r[6]||'').toLowerCase()!==String(username||'').toLowerCase()||scheduleDateKey_(r[1])!==today||String(r[7]||'').toUpperCase()!=='APPROVED')continue;if(store&&String(r[5]||'').toUpperCase()!==String(store).toUpperCase())continue;const s=parseClockTime_(r[3]),e=parseClockTime_(r[4]);if(s==null||e==null)continue;let end=e;if(end<s)end+=1440;let n=now;if(n<s&&end>1440)n+=1440;if(n>=s-120&&n<=end+120)return{shift:String(r[2]||''),start:String(r[3]||''),end:String(r[4]||''),store:String(r[5]||'')};}
  return null;
}

function findScheduledShiftForDate_(username, store, dateValue, startTime, endTime){
  const rows = getOperationalRows_(getOperationalSheet_('Lịch làm việc'));
  const targetDate = scheduleDateKey_(dateValue);

  for(let i=1;i<rows.length;i++){
    const r=rows[i];
    if(String(r[6]||'').toLowerCase()!==String(username||'').toLowerCase()) continue;
    if(scheduleDateKey_(r[1])!==targetDate) continue;
    if(String(r[7]||'').toUpperCase()!=='APPROVED') continue;
    if(store && String(r[5]||'').toUpperCase()!==String(store).toUpperCase()) continue;
    if(startTime && String(r[3]||'')!==String(startTime)) continue;
    if(endTime && String(r[4]||'')!==String(endTime)) continue;

    return {
      shift:String(r[2]||''),
      start:String(r[3]||''),
      end:String(r[4]||''),
      store:String(r[5]||'')
    };
  }
  return null;
}


function attendanceMoney_(hours,rate){const h=Number(hours||0),r=Number(rate||0);return h>0&&r>0?Math.round(h*r):0;}

function attendanceRow_(r){
  // TECH-01: Cột P (index 15) là nguồn giờ công chính thức.
  // Fallback chỉ chạy khi E/F thực sự là Date object; không parse
  // chuỗi HH:mm bằng new Date() vì phụ thuộc locale/browser/runtime.
  let hours=Number(r[15]||0);

  if(
    !hours &&
    r[4] instanceof Date &&
    r[5] instanceof Date &&
    !isNaN(r[4].getTime()) &&
    !isNaN(r[5].getTime())
  ){
    const ms=r[5].getTime()-r[4].getTime();

    if(isFinite(ms)&&ms>=0){
      hours=Math.round(ms/3600000*100)/100;
    }
  }

  const rate=Number(r[14]||0);

  return{
    id:String(r[0]||''),
    date:String(r[1]||''),
    username:String(r[2]||''),
    store:String(r[3]||''),
    checkIn:r[4]||'',
    checkOut:r[5]||'',
    status:String(r[6]||''),
    lateMinutes:Number(r[7]||0),
    earlyMinutes:Number(r[8]||0),
    name:String(r[11]||''),
    shift:String(r[12]||''),
    grade:String(r[13]||''),
    rate:rate,
    hours:hours,
    amount:Number(r[16]||attendanceMoney_(hours,rate)),
    plannedStart:String(r[17]||''),
    plannedEnd:String(r[18]||'')
  };
}

function checkOutEmployee(token){
  ensureAttendanceStructure_();
  const user=getCurrentOperationalUser_(token);
  if(!user)return fail_('Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.');

  const currentDateTime=new Date();
  const today=Utilities.formatDate(currentDateTime,VN_TIMEZONE,'yyyy-MM-dd');
  const currentTime=Utilities.formatDate(currentDateTime,VN_TIMEZONE,'HH:mm');
  const now=vietNamDateTime_(today,currentTime);

  const sh=getOperationalSheet_('Chấm công');
  const rows=getOperationalRows_(sh);

  for(let i=rows.length-1;i>=1;i--){
    const r=rows[i];

    if(
      String(r[1])!==today ||
      String(r[2]).toLowerCase()!==user.username.toLowerCase() ||
      !r[4] ||
      r[5]
    ) continue;

    const ms=now.getTime()-new Date(r[4]).getTime();

    if(!isFinite(ms)||ms<0){
      return fail_('Thời gian check-out không hợp lệ.');
    }

    const hours=Math.round(ms/3600000*100)/100;
    const amount=attendanceMoney_(hours,Number(r[14]||0));
    let early=0;

    if(r[18]){
      const planned=parseClockTime_(r[18]);
      const actual=Number(Utilities.formatDate(now,VN_TIMEZONE,'HH'))*60+
        Number(Utilities.formatDate(now,VN_TIMEZONE,'mm'));

      if(planned!=null&&actual<planned){
        early=planned-actual;
      }
    }

    const lock=LockService.getScriptLock();

    try{
      lock.waitLock(10000);

      // HIGH-01: check-out cũng khóa ghi đồng thời.
      sh.getRange(i+1,6).setValue(now);
      sh.getRange(i+1,7).setValue('COMPLETED');
      sh.getRange(i+1,9).setValue(early);
      sh.getRange(i+1,16).setValue(hours);
      sh.getRange(i+1,17).setValue(amount);
      sh.getRange(i+1,6).setNumberFormat('@');
      SpreadsheetApp.flush();

    }catch(err){
      return fail_('Không thể ghi check-out: '+String(err&&err.message||err));
    }finally{
      try{lock.releaseLock();}catch(e){}
    }

    return{
      ok:true,
      message:'Check-out thành công.',
      timestamp:formatVietnamDateTime_(now),
      hours:hours,
      amount:amount
    };
  }

  return fail_('Chưa có ca đang chấm công để check-out.');
}

function getAttendanceHistory(token,filters){

  const user=getCurrentOperationalUser_(token);
  if(!user) return fail_('Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.');

  const startDate=clean_(filters&&filters.startDate);
  const endDate=clean_(filters&&filters.endDate);

  const rows=getOperationalRows_(getOperationalSheet_('Chấm công'));
  const items=[];

  for(let i=1;i<rows.length;i++){
    if(isAttendanceDeleted_(rows[i][6])) continue;
    if(
      String(rows[i][2]||'').toLowerCase()!==
      user.username.toLowerCase()
    ) continue;

    const dateKey=toVietnamDateKey_(rows[i][1]);

    if(startDate && dateKey<startDate) continue;
    if(endDate && dateKey>endDate) continue;

    const item=attendanceRow_(rows[i]);

    const confirmedAt=rows[i][10]
      ?new Date(rows[i][10])
      :null;

    item.date=dateKey;
    item.checkIn=formatVietnamTime_(rows[i][4]);
    item.checkOut=formatVietnamTime_(rows[i][5]);
    item.confirmedAt=formatVietnamDateTime_(rows[i][10]);

    item.canEdit=!!(
      confirmedAt &&
      !isNaN(confirmedAt.getTime()) &&
      Date.now()-confirmedAt.getTime()<=24*60*60*1000
    );

    items.push(item);
  }

  items.sort(function(a,b){
    const dateCompare=String(b.date||'').localeCompare(
      String(a.date||'')
    );

    if(dateCompare!==0) return dateCompare;

    const bTime=b.confirmedAt
      ?new Date(b.confirmedAt).getTime()
      :0;

    const aTime=a.confirmedAt
      ?new Date(a.confirmedAt).getTime()
      :0;

    return bTime-aTime;
  });

  return {
    ok:true,
    items:items,
    filters:{
      startDate:startDate,
      endDate:endDate
    }
  };
}


/* =========================================================
   QUẢN LÝ CHẤM CÔNG — CHỈNH SỬA / XÓA / THÔNG BÁO
========================================================= */

function isAttendanceDeleted_(status){
  const s=String(status||'').trim().toUpperCase();
  return s==='DELETED'||s==='DELETED_BY_MANAGER';
}

/* =========================================================
   QUẢN LÝ CHẤM CÔNG — ĐỌC QUYỀN TRỰC TIẾP TỪ SHEET NGƯỜI DÙNG
   Không phụ thuộc Vai trò/Phạm vi truy cập cũ trong session.
========================================================= */
function getLiveAttendanceManager_(token){
  const sessionUser=requireSessionUser_(token);
  if(!sessionUser)return null;
  const rows=getUsersSheet_().getDataRange().getValues();
  const username=String(sessionUser.username||'').trim().toLowerCase();
  for(let i=1;i<rows.length;i++){
    if(String(rows[i][1]||'').trim().toLowerCase()!==username)continue;
    return {
      username:String(rows[i][1]||''),
      name:String(rows[i][2]||''),
      email:String(rows[i][3]||''),
      role:normalizeRole_(rows[i][7]),
      accessScope:String(rows[i][15]||'').trim()
    };
  }
  return {
    username:String(sessionUser.username||''),
    name:String(sessionUser.name||''),
    email:String(sessionUser.email||''),
    role:normalizeRole_(sessionUser.role),
    accessScope:String(sessionUser.accessScope||'').trim()
  };
}
function findEmployeeEmailByUsername_(username){
  const rows=getUsersSheet_().getDataRange().getValues();
  const target=String(username||'').trim().toLowerCase();

  for(let i=1;i<rows.length;i++){
    if(String(rows[i][1]||'').trim().toLowerCase()===target){
      return String(rows[i][3]||'').trim();
    }
  }

  return '';
}

function sendAttendanceManagerNotice_(action,employeeUsername,employeeName,managerName,oldData,newData,reason){
  const email=findEmployeeEmailByUsername_(employeeUsername);
  if(!email){
    return {ok:false,message:'Không tìm thấy email của nhân viên.'};
  }

  const body=[
    'MAGASIN — THÔNG BÁO CẬP NHẬT CHẤM CÔNG',
    '',
    'Xin chào '+String(employeeName||employeeUsername)+',',
    '',
    action==='DELETE'
      ?'Bản chấm công của bạn đã được quản lý xóa.'
      :'Bản chấm công của bạn đã được quản lý điều chỉnh.',
    '',
    'Ngày: '+String(newData&&newData.date||oldData&&oldData.date||''),
    'Chi nhánh: '+String(newData&&newData.store||oldData&&oldData.store||''),
    'Giờ vào trước: '+String(oldData&&oldData.checkIn||'—'),
    'Giờ ra trước: '+String(oldData&&oldData.checkOut||'—'),
    'Giờ vào sau: '+String(newData&&newData.checkIn||'—'),
    'Giờ ra sau: '+String(newData&&newData.checkOut||'—'),
    '',
    'Lý do/ghi chú: '+String(reason||'Không có ghi chú'),
    'Người thực hiện: '+String(managerName||'Quản lý'),
    '',
    'Thông báo được gửi tự động từ hệ thống MAGASIN.'
  ].join('\n');

  try{
    MailApp.sendEmail({
      to:email,
      subject:'MAGASIN — Thông báo '+(action==='DELETE'?'xóa':'điều chỉnh')+' chấm công',
      body:body
    });
    return {ok:true,message:'Đã gửi email thông báo tới nhân viên.'};
  }catch(err){
    return {
      ok:false,
      message:'Đã cập nhật dữ liệu nhưng không gửi được email: '+String(err&&err.message||err)
    };
  }
}

function managerUpdateAttendanceRecord(token,data){
  ensureAttendanceStructure_();

  const id=clean_(data&&data.id);
  const date=clean_(data&&data.date);
  const store=clean_(data&&data.store);
  const checkIn=clean_(data&&data.checkIn);
  const checkOut=clean_(data&&data.checkOut);
  const reason=clean_(data&&data.reason);

  if(!id||!date||!store||!checkIn||!checkOut){
    return fail_('Thiếu thông tin chấm công cần chỉnh sửa.');
  }

  const found=getAttendanceRecordById_(id);
  if(!found) return fail_('Không tìm thấy bản chấm công.');

  const row=found.row;
  if(isAttendanceDeleted_(row[6])){
    return fail_('Bản chấm công này đã bị xóa.');
  }

  const permission=requireManagerRole_(token,store);
  if(!permission.ok) return fail_(permission.message);

  const manager=permission.user;
  const employeeUsername=String(row[2]||'');
  const employeeName=String(row[11]||employeeUsername);

  const todayKey=Utilities.formatDate(new Date(),'Asia/Ho_Chi_Minh','yyyy-MM-dd');
  if(date>todayKey){
    return fail_('Không thể chỉnh sửa thành ngày trong tương lai.');
  }

  const checkInDate=vietNamDateTime_(date,checkIn);
  const checkOutDate=vietNamDateTime_(date,checkOut);
  const inMinutes=parseClockTime_(checkIn);
  const outMinutes=parseClockTime_(checkOut);

  if(!checkInDate||!checkOutDate||
     isNaN(checkInDate.getTime())||
     isNaN(checkOutDate.getTime())){
    return fail_('Giờ vào hoặc giờ ra không hợp lệ.');
  }

  if(inMinutes==null||outMinutes==null||outMinutes<=inMinutes){
    return fail_('Giờ ra phải lớn hơn giờ vào.');
  }

  const grade=ensureEmployeeGrade_(employeeUsername,employeeName);
  const metrics=calculateAttendanceMetrics_(
    date,
    checkInDate,
    checkOutDate,
    store,
    employeeUsername
  );
  const scheduled=metrics.scheduled;

  const oldData={
    date:toVietnamDateKey_(row[1]),
    store:String(row[3]||''),
    checkIn:formatVietnamTime_(row[4]),
    checkOut:formatVietnamTime_(row[5])
  };

  const newData={
    date:date,
    store:store,
    checkIn:checkIn,
    checkOut:checkOut
  };

  const auditNote='Quản lý '+String(manager.name||manager.username||'')+
    ' chỉnh sửa '+formatVietnamDateTime_(new Date())+
    (reason?' | Lý do: '+reason:'');

  const noteBase=String(row[9]||'').trim();
  const finalNote=noteBase?noteBase+' || '+auditNote:auditNote;

  const lock=LockService.getScriptLock();

  try{
    lock.waitLock(10000);

    found.sheet.getRange(found.rowIndex,2,1,18).setValues([[
      date,
      employeeUsername,
      store,
      checkIn,
      checkOut,
      'CONFIRMED',
      metrics.lateMinutes,
      metrics.earlyMinutes,
      finalNote,
      row[10],
      employeeName,
      scheduled?scheduled.shift:'',
      grade.grade,
      grade.rate,
      metrics.hours,
      attendanceMoney_(metrics.hours,grade.rate),
      scheduled?scheduled.start:checkIn,
      scheduled?scheduled.end:checkOut
    ]]);

    found.sheet.getRange(found.rowIndex,2).setNumberFormat('dd/MM/yyyy');
    found.sheet.getRange(found.rowIndex,5,1,2).setNumberFormat('@');
    found.sheet.getRange(found.rowIndex,11).setNumberFormat('dd/MM/yyyy HH:mm:ss');
    found.sheet.getRange(found.rowIndex,18,1,2).setNumberFormat('@');
    SpreadsheetApp.flush();

  }catch(err){
    return fail_('Không thể cập nhật chấm công: '+String(err&&err.message||err));
  }finally{
    try{lock.releaseLock();}catch(e){}
  }

  const notice=sendAttendanceManagerNotice_(
    'UPDATE',
    employeeUsername,
    employeeName,
    manager.name||manager.username,
    oldData,
    newData,
    reason
  );

  return {
    ok:true,
    message:notice.ok
      ?'Đã chỉnh sửa chấm công và gửi email cho nhân viên.'
      :'Đã chỉnh sửa chấm công. '+notice.message,
    emailSent:notice.ok
  };
}

function managerDeleteAttendanceRecord(token,data){
  ensureAttendanceStructure_();

  const id=clean_(data&&data.id);
  const reason=clean_(data&&data.reason);

  if(!id) return fail_('Thiếu mã bản chấm công.');

  const found=getAttendanceRecordById_(id);
  if(!found) return fail_('Không tìm thấy bản chấm công.');

  const row=found.row;
  const store=String(row[3]||'');

  if(isAttendanceDeleted_(row[6])){
    return fail_('Bản chấm công này đã được xóa trước đó.');
  }

  const permission=requireManagerRole_(token,store);
  if(!permission.ok) return fail_(permission.message);

  const manager=permission.user;
  const employeeUsername=String(row[2]||'');
  const employeeName=String(row[11]||employeeUsername);

  const oldData={
    date:toVietnamDateKey_(row[1]),
    store:store,
    checkIn:formatVietnamTime_(row[4]),
    checkOut:formatVietnamTime_(row[5])
  };

  const auditNote='Quản lý '+String(manager.name||manager.username||'')+
    ' xóa '+formatVietnamDateTime_(new Date())+
    (reason?' | Lý do: '+reason:'');

  const noteBase=String(row[9]||'').trim();
  const finalNote=noteBase?noteBase+' || '+auditNote:auditNote;

  const lock=LockService.getScriptLock();

  try{
    lock.waitLock(10000);

    found.sheet.getRange(found.rowIndex,7).setValue('DELETED');
    found.sheet.getRange(found.rowIndex,10).setValue(finalNote);
    SpreadsheetApp.flush();

  }catch(err){
    return fail_('Không thể xóa chấm công: '+String(err&&err.message||err));
  }finally{
    try{lock.releaseLock();}catch(e){}
  }

  const notice=sendAttendanceManagerNotice_(
    'DELETE',
    employeeUsername,
    employeeName,
    manager.name||manager.username,
    oldData,
    oldData,
    reason
  );

  return {
    ok:true,
    message:notice.ok
      ?'Đã xóa chấm công và gửi email cho nhân viên.'
      :'Đã xóa chấm công. '+notice.message,
    emailSent:notice.ok
  };
}

function getAttendanceManagement(token,filters){
  // TECH-02: compatibility wrapper.
  // Logic thực tế chỉ nằm ở getAttendanceManagementV33().
  return getAttendanceManagementV33(token,filters);
}

function getAttendanceOptions(token){
  const user=getCurrentOperationalUser_(token);
  if(!user) return fail_('Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.');

  const scope=parseScopeList_(user.accessScope);
  let stores=scope.filter(function(x){return x!=='ALL';});

  if(scope.indexOf('ALL')!==-1){
    const storeSheet=ensureStoreMasterData_();
    const rows=getOperationalRows_(storeSheet);

    stores=rows.slice(1)
      .filter(function(r){return String(r[3]||'ACTIVE').toUpperCase()!=='INACTIVE';})
      .map(function(r){return clean_(r[1]||r[2]);})
      .filter(Boolean);
  }

  const unique={};
  stores.forEach(function(store){
    const key=normalizeStoreKey_(store);
    if(key&&!unique[key]) unique[key]=store;
  });

  stores=Object.keys(unique)
    .map(function(key){return unique[key];})
    .sort();

  return {
    ok:true,
    stores:stores
  };
}


function getAttendanceRecordById_(id){
  const sheet=getOperationalSheet_('Chấm công');
  const rows=getOperationalRows_(sheet);

  for(let i=1;i<rows.length;i++){
    if(String(rows[i][0]||'')===String(id||'')){
      return {
        sheet:sheet,
        rowIndex:i+1,
        row:rows[i]
      };
    }
  }

  return null;
}


function vietNamDateTime_(dateValue,timeValue){
  const dateText=clean_(dateValue);
  const timeText=clean_(timeValue);

  if(!/^\d{4}-\d{2}-\d{2}$/.test(dateText)||
     !/^\d{2}:\d{2}$/.test(timeText)){
    return null;
  }

  const parts=timeText.split(':').map(Number);
  if(parts[0]<0||parts[0]>23||parts[1]<0||parts[1]>59){
    return null;
  }

  return new Date(
    dateText+'T'+timeText+':00+07:00'
  );
}

function formatVietnamTime_(value){
  if(value instanceof Date && !isNaN(value.getTime())){
    return Utilities.formatDate(
      value,
      'Asia/Ho_Chi_Minh',
      'HH:mm'
    );
  }

  const text=String(value||'').trim();
  const match=text.match(/(\d{1,2}):(\d{2})/);

  if(!match) return text;

  const hour=Number(match[1]);
  const minute=Number(match[2]);

  if(hour<0||hour>23||minute<0||minute>59){
    return text;
  }

  return String(hour).padStart(2,'0')+':'+
    String(minute).padStart(2,'0');
}

function formatVietnamDateTime_(value){
  if(value instanceof Date && !isNaN(value.getTime())){
    return Utilities.formatDate(value,'Asia/Ho_Chi_Minh','dd/MM/yyyy HH:mm:ss');
  }
  return String(value||'');
}

function createAttendanceRecord(token,data){
  ensureAttendanceStructure_();

  const user=getCurrentOperationalUser_(token);
  if(!user) return fail_('Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.');

  const date=clean_(data&&data.date);
  const store=clean_(data&&data.store);
  const checkIn=clean_(data&&data.checkIn);
  const checkOut=clean_(data&&data.checkOut);

  if(!date||!store||!checkIn||!checkOut){
    return fail_('Vui lòng chọn ngày, cửa hàng, giờ vào và giờ ra.');
  }

  const todayKey=Utilities.formatDate(
    new Date(),
    'Asia/Ho_Chi_Minh',
    'yyyy-MM-dd'
  );

  if(date>todayKey){
    return fail_('Không thể chấm công cho ngày trong tương lai.');
  }

  if(!scopeAllows_(user.accessScope,store)){
    return fail_('Bạn không có quyền chấm công tại cửa hàng này.');
  }

  const checkInDate=vietNamDateTime_(date,checkIn);
  const checkOutDate=vietNamDateTime_(date,checkOut);

  if(!checkInDate||!checkOutDate||
     isNaN(checkInDate.getTime())||
     isNaN(checkOutDate.getTime())){
    return fail_('Giờ vào hoặc giờ ra không hợp lệ. Hãy nhập theo dạng HH:mm.');
  }

  const inMinutes=parseClockTime_(checkIn);
  const outMinutes=parseClockTime_(checkOut);

  if(inMinutes==null||outMinutes==null||outMinutes<=inMinutes){
    return fail_('Giờ ra phải lớn hơn giờ vào.');
  }

  const sheet=getOperationalSheet_('Chấm công');
  const rows=getOperationalRows_(sheet);

  // Không cho tạo bản ghi trùng hoàn toàn.
  for(let i=1;i<rows.length;i++){
    if(isAttendanceDeleted_(rows[i][6])) continue;
    if(
      scheduleDateKey_(rows[i][1])===date &&
      String(rows[i][2]||'').toLowerCase()===user.username.toLowerCase() &&
      String(rows[i][3]||'').toUpperCase()===store.toUpperCase()
    ){
      const oldIn=rows[i][4];
      const oldOut=rows[i][5];

      if(oldIn&&oldOut){
        const oldInText=Utilities.formatDate(
          new Date(oldIn),
          VN_TIMEZONE,
          'HH:mm'
        );
        const oldOutText=Utilities.formatDate(
          new Date(oldOut),
          VN_TIMEZONE,
          'HH:mm'
        );

        if(oldInText===checkIn&&oldOutText===checkOut){
          return fail_('Bạn đã có một bản chấm công trùng thời gian này.');
        }
      }
    }
  }

  const grade=ensureEmployeeGrade_(user.username,user.name);
  const metrics=calculateAttendanceMetrics_(
    date,
    checkInDate,
    checkOutDate,
    store,
    user.username
  );

  const scheduled=metrics.scheduled;

  const row=[
    Utilities.getUuid(),       // A Id
    date,                      // B Ngày
    user.username,             // C Người dùng
    store,                     // D Cửa hàng
    checkInDate,               // E Check-in
    checkOutDate,              // F Check-out
    'CONFIRMED',               // G Trạng thái
    metrics.lateMinutes,       // H Đi muộn
    metrics.earlyMinutes,      // I Về sớm
    '',                        // J Ghi chú
    new Date(),                // K Ngày tạo = mốc xác nhận
    user.name,                 // L Họ tên
    scheduled?scheduled.shift:'', // M Ca
    grade.grade,               // N Bậc
    grade.rate,                // O Đơn giá
    metrics.hours,             // P Giờ công
    attendanceMoney_(metrics.hours,grade.rate), // Q Thành tiền
    scheduled?scheduled.start:checkIn,           // R Giờ ca bắt đầu
    scheduled?scheduled.end:checkOut               // S Giờ ca kết thúc
  ];

  const lock=LockService.getScriptLock();
  try{
    lock.waitLock(10000);
    sheet.appendRow(row);
    const newRow=sheet.getLastRow();
    sheet.getRange(newRow,2).setNumberFormat('dd/MM/yyyy');
    sheet.getRange(newRow,5,1,2).setNumberFormat('@');
    sheet.getRange(newRow,11).setNumberFormat('dd/MM/yyyy HH:mm:ss');
    sheet.getRange(newRow,18,1,2).setNumberFormat('@');
    SpreadsheetApp.flush();
  }catch(err){
    return fail_('Không thể ghi dữ liệu chấm công: '+String(err&&err.message||err));
  }finally{
    try{lock.releaseLock();}catch(e){}
  }

  return {
    ok:true,
    message:'Đã xác nhận chấm công.',
    id:row[0],
    confirmedAt:formatVietnamDateTime_(row[10])
  };
}

function updateAttendanceRecord(token,data){
  ensureAttendanceStructure_();

  const user=getCurrentOperationalUser_(token);
  if(!user) return fail_('Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.');

  const id=clean_(data&&data.id);
  const date=clean_(data&&data.date);
  const store=clean_(data&&data.store);
  const checkIn=clean_(data&&data.checkIn);
  const checkOut=clean_(data&&data.checkOut);

  if(!id||!date||!store||!checkIn||!checkOut){
    return fail_('Thiếu thông tin chấm công cần cập nhật.');
  }

  const found=getAttendanceRecordById_(id);
  if(!found) return fail_('Không tìm thấy bản chấm công.');

  const row=found.row;

  // CRITICAL-03: không cho sửa bản ghi đã bị quản lý xóa mềm.
  if(isAttendanceDeleted_(row[6])){
    return fail_('Bản chấm công này đã bị xóa bởi quản lý và không thể sửa.');
  }

  if(String(row[2]||'').toLowerCase()!==user.username.toLowerCase()){
    return fail_('Bạn không thể sửa bản chấm công của người khác.');
  }

  const confirmedAt=new Date(row[10]);

  if(isNaN(confirmedAt.getTime())){
    return fail_('Không xác định được thời điểm xác nhận chấm công.');
  }

  const elapsed=Date.now()-confirmedAt.getTime();

  if(elapsed>24*60*60*1000){
    return fail_('Bản chấm công đã quá 24 giờ và không thể sửa.');
  }

  const todayKey=Utilities.formatDate(
    new Date(),
    'Asia/Ho_Chi_Minh',
    'yyyy-MM-dd'
  );

  if(date>todayKey){
    return fail_('Không thể sửa thành ngày trong tương lai.');
  }

  if(!scopeAllows_(user.accessScope,store)){
    return fail_('Bạn không có quyền chấm công tại cửa hàng này.');
  }

  const checkInDate=vietNamDateTime_(date,checkIn);
  const checkOutDate=vietNamDateTime_(date,checkOut);

  if(!checkInDate||!checkOutDate||
     isNaN(checkInDate.getTime())||
     isNaN(checkOutDate.getTime())){
    return fail_('Giờ vào hoặc giờ ra không hợp lệ. Hãy nhập theo dạng HH:mm.');
  }

  const inMinutes=parseClockTime_(checkIn);
  const outMinutes=parseClockTime_(checkOut);

  if(inMinutes==null||outMinutes==null||outMinutes<=inMinutes){
    return fail_('Giờ ra phải lớn hơn giờ vào.');
  }

  const grade=ensureEmployeeGrade_(user.username,user.name);

  const metrics=calculateAttendanceMetrics_(
    date,
    checkInDate,
    checkOutDate,
    store,
    user.username
  );

  const scheduled=metrics.scheduled;

  const lock=LockService.getScriptLock();
  try{
    lock.waitLock(10000);
    found.sheet.getRange(found.rowIndex,2,1,18).setValues([[
    date,
    user.username,
    store,
    checkIn,
    checkOut,
    'CONFIRMED',
    metrics.lateMinutes,
    metrics.earlyMinutes,
    String(row[9]||''),
    confirmedAt,
    user.name,
    scheduled?scheduled.shift:'',
    grade.grade,
    grade.rate,
    metrics.hours,
    attendanceMoney_(metrics.hours,grade.rate),
    scheduled?scheduled.start:checkIn,
    scheduled?scheduled.end:checkOut
  ]]);
    found.sheet.getRange(found.rowIndex,2).setNumberFormat('dd/MM/yyyy');
    found.sheet.getRange(found.rowIndex,5,1,2).setNumberFormat('@');
    found.sheet.getRange(found.rowIndex,11).setNumberFormat('dd/MM/yyyy HH:mm:ss');
    found.sheet.getRange(found.rowIndex,18,1,2).setNumberFormat('@');
    SpreadsheetApp.flush();
  }catch(err){
    return fail_('Không thể cập nhật chấm công: '+String(err&&err.message||err));
  }finally{
    try{lock.releaseLock();}catch(e){}
  }

  return {
    ok:true,
    message:'Đã cập nhật bản chấm công.',
    id:id,
    confirmedAt:formatVietnamDateTime_(confirmedAt)
  };
}


/* =========================================================
   QUẢN LÝ CHẤM CÔNG V33 — NGUỒN DỮ LIỆU TRỰC TIẾP
   Mục tiêu:
   - Đọc trực tiếp Spreadsheet MAGASIN chính thức.
   - Không phụ thuộc getOperationalSheet_() cho báo cáo quản lý.
   - Không phụ thuộc tên hàm getAttendanceManagement() cũ.
   - Trả chẩn đoán nguồn dữ liệu để xác nhận WebApp đang đọc đúng nơi.
========================================================= */

function getCanonicalAttendanceSheetV33_(){
  const spreadsheetId = MAGASIN_DATABASE_SPREADSHEET_ID;
  const book = SpreadsheetApp.openById(spreadsheetId);
  const sheet = book.getSheetByName('Chấm công');

  if(!sheet){
    throw new Error(
      'Không tìm thấy tab "Chấm công" trong Spreadsheet MAGASIN. '+
      'ID: '+spreadsheetId+' | Tên: '+book.getName()
    );
  }

  return {
    book:book,
    sheet:sheet
  };
}

/* TECH-02: CORE DUY NHẤT cho báo cáo/quản lý chấm công. */
function getAttendanceManagementV33(token,filters){
  const sessionUser=requireSessionUser_(token);
  if(!sessionUser){
    return fail_('Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.');
  }

  // Đọc quyền LIVE từ Sheet Người dùng trong Spreadsheet chính thức.
  const userRows=getUsersSheet_().getDataRange().getValues();
  const targetUsername=String(sessionUser.username||'').trim().toLowerCase();

  let manager={
    username:String(sessionUser.username||''),
    name:String(sessionUser.name||''),
    role:normalizeRole_(sessionUser.role),
    accessScope:String(sessionUser.accessScope||'').trim()
  };

  for(let i=1;i<userRows.length;i++){
    if(String(userRows[i][1]||'').trim().toLowerCase()!==targetUsername) continue;

    manager={
      username:String(userRows[i][1]||''),
      name:String(userRows[i][2]||''),
      email:String(userRows[i][3]||''),
      role:normalizeRole_(userRows[i][7]),
      accessScope:String(userRows[i][15]||'').trim()
    };
    break;
  }

  if(manager.role!=='OWNER' && manager.role!=='STORE_MANAGER'){
    return fail_(
      'Tài khoản chưa có quyền quản lý chấm công. '+
      'Vai trò hiện tại: '+String(manager.role||'(trống)')
    );
  }

  const startDate=String(clean_(filters&&filters.startDate)||'').trim();
  const endDate=String(clean_(filters&&filters.endDate)||'').trim();
  const requestedStore=normalizeAttendanceStore_(filters&&filters.store);

  if(startDate&&endDate&&startDate>endDate){
    return fail_('Khoảng ngày không hợp lệ.');
  }

  const source=getCanonicalAttendanceSheetV33_();
  const book=source.book;
  const sheet=source.sheet;
  const rowInfo=getLimitedSheetRows_(sheet);
  const rows=rowInfo.rows;

  const details=[];
  const dailyMap={};
  const employees={};
  const allStoreMap={};
  const dateRangeStoreMap={};

  let rawDataRows=0;
  let matchedDateRows=0;
  let matchedStoreRows=0;
  let matchedScopeRows=0;

  for(let i=1;i<rows.length;i++){
    const r=rows[i];
    if(!r || r.length<7) continue;
    if(isAttendanceDeleted_(r[6])) continue;

    rawDataRows++;

    const dateKey=toVietnamDateKey_(r[1]);
    const store=clean_(r[3]);
    const storeKey=normalizeAttendanceStore_(store);

    if(storeKey) allStoreMap[storeKey]=store;

    if(startDate&&dateKey<startDate) continue;
    if(endDate&&dateKey>endDate) continue;

    matchedDateRows++;
    if(storeKey) dateRangeStoreMap[storeKey]=store;

    if(requestedStore&&storeKey!==requestedStore) continue;
    matchedStoreRows++;

    if(
      manager.role!=='OWNER' &&
      !scopeAllows_(manager.accessScope,storeKey)
    ) continue;

    matchedScopeRows++;

    const item=attendanceRow_(r);
    item.date=dateKey;
    item.checkIn=formatVietnamTime_(r[4]);
    item.checkOut=formatVietnamTime_(r[5]);
    item.confirmedAt=formatVietnamDateTime_(r[10]);

    details.push(item);

    const key=dateKey+'|'+storeKey;
    if(!dailyMap[key]){
      dailyMap[key]={
        date:dateKey,
        store:store,
        hours:0,
        amount:0,
        records:0,
        employeeSet:{}
      };
    }

    dailyMap[key].hours+=Number(item.hours||0);
    dailyMap[key].amount+=Number(item.amount||0);
    dailyMap[key].records++;
    dailyMap[key].employeeSet[
      String(item.username||'').toLowerCase()
    ]=true;

    employees[
      String(item.username||'').toLowerCase()
    ]=true;
  }

  details.sort(function(a,b){
    const d=String(b.date||'').localeCompare(String(a.date||''));
    if(d!==0) return d;

    const bTime=b.confirmedAt?new Date(b.confirmedAt).getTime():0;
    const aTime=a.confirmedAt?new Date(a.confirmedAt).getTime():0;

    return bTime-aTime;
  });

  const daily=Object.keys(dailyMap)
    .map(function(key){
      const x=dailyMap[key];
      return {
        date:x.date,
        store:x.store,
        employeeCount:Object.keys(x.employeeSet).length,
        records:x.records||0,
        hours:Math.round(x.hours*100)/100,
        amount:Math.round(x.amount)
      };
    })
    .sort(function(a,b){
      const d=String(b.date).localeCompare(String(a.date));
      if(d!==0) return d;
      return String(a.store).localeCompare(String(b.store));
    });

  const totals=details.reduce(function(acc,x){
    acc.hours+=Number(x.hours||0);
    acc.amount+=Number(x.amount||0);
    return acc;
  },{hours:0,amount:0});

  const visibleStores=Object.keys(
    details.reduce(function(map,item){
      const key=normalizeAttendanceStore_(item.store);
      if(key) map[key]=item.store;
      return map;
    },{})
  ).map(function(k){
    const first=details.find(function(x){
      return normalizeAttendanceStore_(x.store)===k;
    });
    return first?first.store:k;
  }).sort();

  const storesInDateRange=Object.keys(dateRangeStoreMap)
    .map(function(k){return dateRangeStoreMap[k];})
    .sort();

  const allStores=Object.keys(allStoreMap)
    .map(function(k){return allStoreMap[k];})
    .sort();

  return {
    ok:true,
    stores:visibleStores,
    totals:{
      hours:Math.round(totals.hours*100)/100,
      amount:Math.round(totals.amount),
      employees:Object.keys(employees).length,
      records:details.length
    },
    daily:daily,
    details:details,
    diagnostics:{
      endpoint:'getAttendanceManagementV33',
      spreadsheetId:book.getId(),
      spreadsheetName:book.getName(),
      sheetName:sheet.getName(),
      sheetLastRow:sheet.getLastRow(),
      sheetLastColumn:sheet.getLastColumn(),
      role:manager.role,
      accessScope:String(manager.accessScope||'').trim(),
      requestedStore:requestedStore,
      rawDataRows:rawDataRows,
      truncated:rowInfo.truncated,
      totalDataRows:rowInfo.totalRows,
      truncated:rowInfo.truncated,
      totalDataRows:rowInfo.totalRows,
      matchedDateRows:matchedDateRows,
      matchedStoreRows:matchedStoreRows,
      matchedScopeRows:matchedScopeRows,
      allStores:allStores,
      storesInDateRange:storesInDateRange,
      visibleStores:visibleStores
    }
  };
}


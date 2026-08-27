/* =========================================================
   MAGASIN — NỀN TẢNG HỆ THỐNG
   File được tách từ Code.gs hiện tại.
   Chỉ tách module, không thay đổi logic chức năng.
   Chứa các hàm dùng chung cho Sheet, tiện ích dữ liệu và nghiệp vụ nền.

   LƯU Ý:
   - Tên FILE dùng tiếng Việt 100% để dễ kiểm soát.
   - Tên HÀM hiện tại được giữ nguyên để không làm hỏng các lời gọi
     từ Index.html và giữa các module.
   - Tất cả file .gs trong cùng Apps Script Project dùng chung phạm vi.
========================================================= */

/*
 * ============================================================
 * NGUỒN DỮ LIỆU CHÍNH THỨC CỦA MAGASIN
 * ============================================================
 *
 * Spreadsheet:
 * MAGASIN - Cơ sở dữ liệu tài khoản
 *
 * Spreadsheet ID:
 * 1g5U4mSPvpTYC_0P0PrZEK95bPE6s-MpcV256wT0iMO8
 *
 * URL:
 * https://docs.google.com/spreadsheets/d/1g5U4mSPvpTYC_0P0PrZEK95bPE6s-MpcV256wT0iMO8/edit
 *
 * LƯU Ý:
 * - Đây là ID của SPREADSHEET, không phải tên của một tab Sheet.
 * - Các tab nghiệp vụ gồm: Người dùng, Chấm công, Lịch làm việc,
 *   Bậc nhân viên, Đổi ca, KPI...
 * - Mọi module phải lấy dữ liệu từ cùng Spreadsheet này.
 * - Không tạo Spreadsheet mới nếu Spreadsheet chính đã tồn tại.
 *
 * Tương thích cấu hình cũ:
 * - MAGASIN_USERS_SHEET_ID
 * - BREWFLOW_USERS_SHEET_ID
 *
 * Tuy nhiên, ID cố định dưới đây là nguồn sự thật duy nhất của
 * project hiện tại để tránh tình trạng mỗi module/deployment đọc
 * nhầm một Spreadsheet khác.
 */
const MAGASIN_DATABASE_SPREADSHEET_ID =
  '1g5U4mSPvpTYC_0P0PrZEK95bPE6s-MpcV256wT0iMO8';

const MAGASIN_USERS_SHEET_ID_PROPERTY = 'MAGASIN_USERS_SHEET_ID';
const MAGASIN_OLD_USERS_SHEET_ID_PROPERTY = 'BREWFLOW_USERS_SHEET_ID';

function getUsersSpreadsheetId_() {
  const props = PropertiesService.getScriptProperties();

  // Nguồn chính thức: luôn dùng đúng Spreadsheet MAGASIN hiện tại.
  const canonicalId = MAGASIN_DATABASE_SPREADSHEET_ID;

  // Đồng bộ Script Properties để các lần chạy sau luôn có cùng nguồn dữ liệu.
  if (props.getProperty(MAGASIN_USERS_SHEET_ID_PROPERTY) !== canonicalId) {
    props.setProperty(MAGASIN_USERS_SHEET_ID_PROPERTY, canonicalId);
  }

  // Giữ lại property cũ để tránh phá các module/phiên bản trước đây.
  // Không dùng giá trị cũ làm nguồn dữ liệu nữa.
  if (!props.getProperty(MAGASIN_OLD_USERS_SHEET_ID_PROPERTY)) {
    props.setProperty(MAGASIN_OLD_USERS_SHEET_ID_PROPERTY, canonicalId);
  }

  return canonicalId;
}

function ensureOperationalSheets_() {
  const userSheetId = getUsersSpreadsheetId_();
  if (!userSheetId) return;

  const book = SpreadsheetApp.openById(userSheetId);

  Object.keys(OPERATIONAL_SHEET_DEFS).forEach(function(name) {
    let sheet = book.getSheetByName(name);

    if (!sheet) {
      sheet = book.insertSheet(name);
      const headers = OPERATIONAL_SHEET_DEFS[name];
      sheet.getRange(1,1,1,headers.length).setValues([headers]);
      sheet.setFrozenRows(1);
      sheet.getRange(1,1,1,headers.length)
        .setFontWeight('bold')
        .setBackground('#0ea5a8')
        .setFontColor('#ffffff');
      sheet.autoResizeColumns(1, headers.length);
    }
  });
}

function getOperationalSheet_(name) {
  ensureOperationalSheets_();

  const book = SpreadsheetApp.openById(MAGASIN_DATABASE_SPREADSHEET_ID);
  const sheet = book.getSheetByName(name);

  if (!sheet) {
    throw new Error(
      'Không tìm thấy Sheet nghiệp vụ "' + name +
      '" trong Spreadsheet MAGASIN: ' + MAGASIN_DATABASE_SPREADSHEET_ID
    );
  }

  return sheet;
}


/**
 * Đọc header + tối đa MAX_ROWS_PER_REQUEST dòng dữ liệu mới nhất.
 * Dùng cho các truy vấn nghiệp vụ để tránh tải toàn bộ Sheet.
 *
 * Giá trị trả về:
 * {
 *   rows: [...],          // gồm header ở vị trí 0
 *   truncated: boolean,   // true nếu dữ liệu vượt giới hạn
 *   totalRows: number,
 *   lastRow: number
 * }
 */
function getLimitedSheetRows_(sheet, maxDataRows) {
  const maxRows = Number(maxDataRows || MAX_ROWS_PER_REQUEST);
  const lastRow = sheet.getLastRow();
  const lastColumn = sheet.getLastColumn();

  if (!lastRow || !lastColumn) {
    return {rows:[], truncated:false, totalRows:0, lastRow:lastRow || 0};
  }

  const dataRows = Math.max(0, lastRow - 1);
  const take = Math.min(dataRows, maxRows);
  const startRow = take > 0 ? lastRow - take + 1 : 1;

  const rows = sheet.getRange(
    1,
    1,
    Math.max(1, take + 1),
    lastColumn
  ).getValues();

  return {
    rows: rows,
    truncated: dataRows > take,
    totalRows: dataRows,
    lastRow: lastRow
  };
}

function getOperationalRows_(sheet, maxDataRows) {
  return getLimitedSheetRows_(sheet, maxDataRows).rows;
}

function getCurrentOperationalUser_(token) {
  const user = requireSessionUser_(token);
  if (!user) return null;
  return {
    username: String(user.username || ''),
    name: String(user.name || ''),
    role: normalizeRole_(user.role),
    accessScope: String(user.accessScope || '')
  };
}

function normalizeStoreKey_(store) {
  return clean_(store)
    .replace(/\s+/g, '')
    .toUpperCase();
}

function parseScopeList_(scope) {
  return clean_(scope)
    .split(/[,;\n]+/)
    .map(function(x){ return normalizeStoreKey_(x); })
    .filter(Boolean);
}

function scopeAllows_(scope, store) {
  const list = parseScopeList_(scope);
  const target = normalizeStoreKey_(store);

  if (!target) return true;
  if (!list.length) return false;
  if (list.indexOf('ALL') !== -1) return true;

  return list.indexOf(target) !== -1;
}

function toVietnamDateKey_(value) {
  if (value instanceof Date && !isNaN(value.getTime())) {
    return Utilities.formatDate(value, VN_TIMEZONE, 'yyyy-MM-dd');
  }

  const text = String(value == null ? '' : value).trim();
  if (!text) return '';

  const iso = text.match(/^(\d{4}-\d{2}-\d{2})/);
  if (iso) return iso[1];

  const vn = text.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  if (vn) {
    return vn[3] + '-' +
      String(Number(vn[2])).padStart(2, '0') + '-' +
      String(Number(vn[1])).padStart(2, '0');
  }

  const parsed = new Date(text);
  if (!isNaN(parsed.getTime())) {
    return Utilities.formatDate(parsed, VN_TIMEZONE, 'yyyy-MM-dd');
  }

  return text.slice(0, 10);
}



/**
 * Bảo đảm Sheet "Cửa hàng" có danh mục cửa hàng.
 * Chỉ bootstrap một lần khi Sheet mới chưa có dữ liệu.
 * Sau đó getAttendanceOptions() chỉ đọc Sheet "Cửa hàng".
 */
function ensureStoreMasterData_() {
  const sheet = getOperationalSheet_('Cửa hàng');
  const lastRow = sheet.getLastRow();

  if (lastRow > 1) return sheet;

  const found = {};
  const sourceSheets = [
    {name:'Chấm công', column:4},
    {name:'Lịch làm việc', column:6}
  ];

  sourceSheets.forEach(function(source) {
    const sourceSheet = getOperationalSheet_(source.name);
    const info = getLimitedSheetRows_(sourceSheet);
    const rows = info.rows;

    for (let i = 1; i < rows.length; i++) {
      const value = clean_(rows[i][source.column - 1]);
      const key = normalizeStoreKey_(value);
      if (!key || found[key]) continue;

      found[key] = value;
    }
  });

  const values = Object.keys(found).sort().map(function(key) {
    return [
      Utilities.getUuid(),
      key,
      found[key],
      'ACTIVE',
      new Date(),
      'Tự đồng bộ lần đầu từ dữ liệu nghiệp vụ'
    ];
  });

  if (values.length) {
    sheet.getRange(2, 1, values.length, values[0].length).setValues(values);
    sheet.getRange(2, 5, values.length, 1).setNumberFormat('dd/MM/yyyy HH:mm:ss');
    SpreadsheetApp.flush();
  }

  return sheet;
}

function getMyEmployeeData(token) {
  const user = getCurrentOperationalUser_(token);
  if (!user) return fail_('Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.');
  return {ok:true, user:user};
}

function getUsersSheet_() {
  const id = getUsersSpreadsheetId_();
  const book = SpreadsheetApp.openById(id);
  const sheet = book.getSheetByName('Người dùng');

  if (!sheet) {
    throw new Error(
      'Không tìm thấy tab "Người dùng" trong Spreadsheet "' +
      book.getName() + '". ID: ' + id
    );
  }

  return sheet;
}

function clean_(value) { return String(value || '').trim(); }

function fail_(message) { return {ok:false, message:message}; }

function hash_(value) { return Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, value).map(function(b) { return ('0' + (b & 255).toString(16)).slice(-2); }).join(''); }

function escapeHtml_(value) {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * Kiểm tra chính xác nguồn dữ liệu mà toàn bộ WebApp MAGASIN đang sử dụng.
 * Dùng khi cần xác nhận nhân viên và quản lý đang đọc cùng một Spreadsheet.
 */
function kiemTraNguonDuLieuMAGASIN_() {
  const id = getUsersSpreadsheetId_();
  const book = SpreadsheetApp.openById(id);
  const userSheet = book.getSheetByName('Người dùng');
  const attendanceSheet = book.getSheetByName('Chấm công');

  return {
    ok: true,
    sourceType: 'MAGASIN_DATABASE_SPREADSHEET_ID',
    expectedSpreadsheetId: MAGASIN_DATABASE_SPREADSHEET_ID,
    actualSpreadsheetId: book.getId(),
    spreadsheetName: book.getName(),
    spreadsheetUrl: book.getUrl(),
    sameSpreadsheet: book.getId() === MAGASIN_DATABASE_SPREADSHEET_ID,
    userSheetExists: !!userSheet,
    attendanceSheetExists: !!attendanceSheet,
    attendanceLastRow: attendanceSheet ? attendanceSheet.getLastRow() : 0,
    attendanceLastColumn: attendanceSheet ? attendanceSheet.getLastColumn() : 0
  };
}

/* =========================================================
   MAGASIN — ĐỒNG BỘ GITHUB → APPS SCRIPT V2
   PHASE: Clean source synchronization

   QUY TẮC:
   - GitHub main là source-of-truth.
   - Apps Script là runtime.
   - Mỗi lần sync sẽ THAY TOÀN BỘ HEAD bằng đúng manifest + canonical files.
   - Không merge và không giữ file legacy ngoài danh sách canonical.
   - Luôn tạo backup Version trước khi update.
   - Không tự deploy.

   LƯU Ý QUAN TRỌNG:
   Apps Script Files API dùng name KHÔNG có phần mở rộng.
   Ví dụ: 01_Cấu_hình_hệ_thống.gs -> name = 01_Cấu_hình_hệ_thống.
   Manifest -> name = appsscript, type = JSON.
========================================================= */

const MAGASIN_SYNC_CONFIG = {
  repo: 'magasincoffee/noibo',
  ref: 'main',
  rawBase: 'https://raw.githubusercontent.com/magasincoffee/noibo/main/',
  manifestPath: 'PROJECT_CONTROL/appsscript.json',
  canonicalFiles: [
    'backend/01_Cấu_hình_hệ_thống.gs',
    'backend/02_Nền_tảng_hệ_thống.gs',
    'backend/03_Đăng_nhập_xác_thực.gs',
    'backend/04_Khôi_phục_mật_khẩu.gs',
    'backend/05_Phiên_đăng_nhập.gs',
    'backend/06_Hồ_sơ_nhân_viên.gs',
    'backend/07_Phân_quyền.gs',
    'backend/08_Quản_lý_người_dùng.gs',
    'backend/09_Lịch_làm_việc.gs',
    'backend/10_Chấm_công.gs',
    'backend/11_Đổi_ca.gs',
    'backend/12_KPI.gs',
    'backend/13_Kho_hàng.gs',
    'backend/14_Báo_cáo.gs',
    'backend/15_Ứng_dụng_web.gs',
    'backend/16_API_Bridge.gs',
    'backend/17_GitHub_Bridge.gs',
    'backend/18_GitHub_Frontend_Loader.gs',
    'backend/19_Phase2_Auth_Session_Role_Test.gs',
    'backend/20_Đồng_bộ_GitHub.gs',
    'frontend/Index.html',
    'frontend/_styles.html',
    'frontend/_auth.html',
    'frontend/_schedule.html',
    'frontend/_attendance.html',
    'frontend/_management.html',
    'frontend/_phase2_ui_fix.html'
  ]
};

function testDongBoGitHub() {
  const scriptId = ScriptApp.getScriptId();
  const content = getAppsScriptProjectContent_(scriptId);
  const result = {
    ok: true,
    message: 'Apps Script API đã đọc được project hiện tại.',
    scriptId: scriptId,
    fileCount: (content.files || []).length,
    files: (content.files || []).map(function(file) {
      return file.name + ' [' + file.type + ']';
    })
  };
  Logger.log(JSON.stringify(result, null, 2));
  return result;
}

function previewDongBoGitHub() {
  const project = buildCanonicalProjectContent_();
  const result = {
    ok: true,
    message: 'Đọc GitHub canonical thành công. Chưa thay đổi Apps Script.',
    repo: MAGASIN_SYNC_CONFIG.repo,
    ref: MAGASIN_SYNC_CONFIG.ref,
    targetFileCount: project.files.length,
    targetFiles: project.files.map(function(file) {
      return file.name + ' [' + file.type + ']';
    })
  };
  Logger.log(JSON.stringify(result, null, 2));
  return result;
}

function previewDongBoGitHubSyncPlan() {
  const scriptId = ScriptApp.getScriptId();
  const current = getAppsScriptProjectContent_(scriptId);
  const target = buildCanonicalProjectContent_();

  const currentMap = mapFilesByName_(current.files || []);
  const targetMap = mapFilesByName_(target.files || []);

  const toAdd = [];
  const toReplace = [];
  const toRemove = [];

  Object.keys(targetMap).forEach(function(name) {
    if (!currentMap[name]) {
      toAdd.push(name);
    } else if (currentMap[name].type !== targetMap[name].type ||
               currentMap[name].source !== targetMap[name].source) {
      toReplace.push(name);
    }
  });

  Object.keys(currentMap).forEach(function(name) {
    if (!targetMap[name]) toRemove.push(name);
  });

  const result = {
    ok: true,
    message: 'Sync plan đã tạo. Chưa thay đổi Apps Script.',
    currentFileCount: Object.keys(currentMap).length,
    targetFileCount: Object.keys(targetMap).length,
    toAdd: toAdd,
    toReplace: toReplace,
    toRemove: toRemove
  };
  Logger.log(JSON.stringify(result, null, 2));
  return result;
}

function dongBoGitHubSangAppsScript() {
  const scriptId = ScriptApp.getScriptId();
  const current = getAppsScriptProjectContent_(scriptId);
  const target = buildCanonicalProjectContent_();
  const targetMap = mapFilesByName_(target.files);
  const currentMap = mapFilesByName_(current.files || []);

  if (!targetMap.appsscript || targetMap.appsscript.type !== 'JSON') {
    throw new Error('GitHub canonical project thiếu appsscript.json hợp lệ. Đã hủy sync.');
  }
  if (!targetMap.Index || targetMap.Index.type !== 'HTML') {
    throw new Error('GitHub canonical project thiếu frontend/Index.html hợp lệ. Đã hủy sync.');
  }

  const backup = createAppsScriptVersion_(
    scriptId,
    'MAGASIN backup before CLEAN GitHub sync ' + new Date().toISOString()
  );

  const updated = updateAppsScriptProjectContent_(scriptId, target);

  const removed = Object.keys(currentMap).filter(function(name) {
    return !targetMap[name];
  });

  const result = {
    ok: true,
    message: 'CLEAN SYNC GitHub → Apps Script thành công. Apps Script HEAD hiện khớp canonical GitHub. Chưa tự deploy.',
    repo: MAGASIN_SYNC_CONFIG.repo,
    ref: MAGASIN_SYNC_CONFIG.ref,
    backupVersionNumber: backup && backup.versionNumber ? backup.versionNumber : null,
    targetFileCount: target.files.length,
    resultingFileCount: (updated.files || []).length,
    removedLegacyFileCount: removed.length,
    removedLegacyFiles: removed,
    nextStep: 'Chạy testDongBoGitHub(), kiểm tra compile, rồi deploy Web App có kiểm soát.'
  };
  Logger.log(JSON.stringify(result, null, 2));
  return result;
}

function buildCanonicalProjectContent_() {
  const manifestSource = fetchGithubFile_(MAGASIN_SYNC_CONFIG.manifestPath);
  let manifest;
  try {
    manifest = JSON.parse(manifestSource);
  } catch (err) {
    throw new Error('PROJECT_CONTROL/appsscript.json không phải JSON hợp lệ: ' + err.message);
  }

  const files = [{
    name: 'appsscript',
    type: 'JSON',
    source: JSON.stringify(manifest, null, 2)
  }];

  const seen = { appsscript: true };

  MAGASIN_SYNC_CONFIG.canonicalFiles.forEach(function(path) {
    const source = fetchGithubFile_(path);
    const file = toAppsScriptFile_(path, source);

    if (seen[file.name]) {
      throw new Error('Trùng tên file Apps Script trong canonical source: ' + file.name);
    }
    seen[file.name] = true;
    files.push(file);
  });

  return { files: files };
}

function fetchGithubFile_(path) {
  const url = MAGASIN_SYNC_CONFIG.rawBase + encodeGithubPath_(path);
  const response = UrlFetchApp.fetch(url, {
    muteHttpExceptions: true,
    followRedirects: true
  });
  const code = response.getResponseCode();
  if (code < 200 || code >= 300) {
    throw new Error('Không tải được ' + path + ' từ GitHub (HTTP ' + code + ').');
  }
  return response.getContentText('UTF-8');
}

function toAppsScriptFile_(path, source) {
  const baseName = path.split('/').pop();
  if (/\.gs$/i.test(baseName)) {
    return {
      name: baseName.replace(/\.gs$/i, ''),
      type: 'SERVER_JS',
      source: source
    };
  }
  if (/\.html$/i.test(baseName)) {
    return {
      name: baseName.replace(/\.html$/i, ''),
      type: 'HTML',
      source: source
    };
  }
  throw new Error('Loại file canonical không được hỗ trợ: ' + path);
}

function encodeGithubPath_(path) {
  return path.split('/').map(function(part) {
    return encodeURIComponent(part);
  }).join('/');
}

function mapFilesByName_(files) {
  const map = {};
  (files || []).forEach(function(file) {
    if (file && file.name) map[file.name] = file;
  });
  return map;
}

function getAppsScriptProjectContent_(scriptId) {
  return appsScriptApiFetch_('/projects/' + encodeURIComponent(scriptId) + '/content', {
    method: 'get'
  });
}

function createAppsScriptVersion_(scriptId, description) {
  return appsScriptApiFetch_('/projects/' + encodeURIComponent(scriptId) + '/versions', {
    method: 'post',
    payload: { description: String(description || 'MAGASIN backup') }
  });
}

function updateAppsScriptProjectContent_(scriptId, content) {
  return appsScriptApiFetch_('/projects/' + encodeURIComponent(scriptId) + '/content', {
    method: 'put',
    payload: content
  });
}

function appsScriptApiFetch_(path, options) {
  const token = ScriptApp.getOAuthToken();
  if (!token) {
    throw new Error('Không lấy được OAuth token của Apps Script.');
  }

  const params = {
    method: options.method || 'get',
    muteHttpExceptions: true,
    followRedirects: true,
    headers: { Authorization: 'Bearer ' + token },
    contentType: 'application/json'
  };

  if (options.payload !== undefined) {
    params.payload = JSON.stringify(options.payload);
  }

  const response = UrlFetchApp.fetch('https://script.googleapis.com/v1' + path, params);
  const code = response.getResponseCode();
  const text = response.getContentText('UTF-8');

  let data = {};
  try {
    data = text ? JSON.parse(text) : {};
  } catch (err) {
    data = { raw: text };
  }

  if (code < 200 || code >= 300) {
    const detail = data && data.error && data.error.message ? data.error.message : text;
    throw new Error('Apps Script API HTTP ' + code + ': ' + detail);
  }

  return data;
}

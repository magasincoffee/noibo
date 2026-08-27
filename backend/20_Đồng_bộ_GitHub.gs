/* =========================================================
   MAGASIN — ĐỒNG BỘ GITHUB → APPS SCRIPT
   PHASE: Source synchronization

   MỤC TIÊU
   - GitHub main là source-of-truth cho backend/ + frontend/.
   - Apps Script là runtime.
   - Đồng bộ có kiểm tra, không tự động deploy.
   - Không xóa file Apps Script chưa nằm trong danh sách canonical.
   - Không lưu mật khẩu/token GitHub trong source.

   YÊU CẦU MỘT LẦN
   1) Apps Script project phải được cấp OAuth scope:
      https://www.googleapis.com/auth/script.projects
   2) Google Apps Script API phải được bật cho Cloud Project của Apps Script.
   3) Chạy testDongBoGitHub() trước khi chạy dongBoGitHubSangAppsScript().

   QUAN TRỌNG
   projects.updateContent() thay toàn bộ HEAD content của project.
   Vì vậy module này luôn đọc nội dung hiện tại trước, chỉ thay/ghép
   các file canonical backend/ + frontend/, rồi mới gửi toàn bộ content.
   File khác đang tồn tại trong Apps Script được giữ nguyên.
========================================================= */

const MAGASIN_SYNC_CONFIG = {
  repo: 'magasincoffee/noibo',
  ref: 'main',
  githubRawBase: 'https://raw.githubusercontent.com/magasincoffee/noibo/main/',

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
  const githubFiles = loadCanonicalGithubFiles_();
  const result = {
    ok: true,
    message: 'Đọc canonical source từ GitHub thành công. Chưa thay đổi Apps Script.',
    repo: MAGASIN_SYNC_CONFIG.repo,
    ref: MAGASIN_SYNC_CONFIG.ref,
    files: Object.keys(githubFiles),
    count: Object.keys(githubFiles).length
  };
  Logger.log(JSON.stringify(result, null, 2));
  return result;
}

function dongBoGitHubSangAppsScript() {
  const scriptId = ScriptApp.getScriptId();
  const current = getAppsScriptProjectContent_(scriptId);
  const githubFiles = loadCanonicalGithubFiles_();

  if (!githubFiles['frontend/Index.html']) {
    throw new Error('GitHub không có frontend/Index.html. Hủy đồng bộ để tránh ghi sai project.');
  }

  const backup = createAppsScriptVersion_(scriptId, 'MAGASIN backup before GitHub sync ' + new Date().toISOString());
  const merged = mergeGithubIntoAppsScript_(current, githubFiles);
  const updated = updateAppsScriptProjectContent_(scriptId, merged);

  const result = {
    ok: true,
    message: 'Đồng bộ GitHub → Apps Script thành công. Chưa tự deploy.',
    backupVersionNumber: backup && backup.versionNumber ? backup.versionNumber : null,
    synchronizedFiles: Object.keys(githubFiles),
    synchronizedCount: Object.keys(githubFiles).length,
    resultingFileCount: (updated.files || []).length,
    nextStep: 'Kiểm tra WebApp rồi mới tạo deployment/version production.'
  };
  Logger.log(JSON.stringify(result, null, 2));
  return result;
}

/* ======================== GITHUB ======================== */

function loadCanonicalGithubFiles_() {
  const requests = MAGASIN_SYNC_CONFIG.canonicalFiles.map(function(path) {
    return {
      url: MAGASIN_SYNC_CONFIG.githubRawBase + encodeGithubPath_(path),
      muteHttpExceptions: true,
      followRedirects: true
    };
  });

  const responses = UrlFetchApp.fetchAll(requests);
  const result = {};

  responses.forEach(function(response, index) {
    const path = MAGASIN_SYNC_CONFIG.canonicalFiles[index];
    const code = response.getResponseCode();

    if (code < 200 || code >= 300) {
      throw new Error('Không tải được ' + path + ' từ GitHub (HTTP ' + code + ').');
    }

    result[path] = response.getContentText('UTF-8');
  });

  return result;
}

function encodeGithubPath_(path) {
  return path.split('/').map(function(part) {
    return encodeURIComponent(part);
  }).join('/');
}

/* ======================== APPS SCRIPT API ======================== */

function getAppsScriptProjectContent_(scriptId) {
  return appsScriptApiFetch_('/projects/' + encodeURIComponent(scriptId) + '/content', {
    method: 'get'
  });
}

function createAppsScriptVersion_(scriptId, description) {
  return appsScriptApiFetch_('/projects/' + encodeURIComponent(scriptId) + '/versions', {
    method: 'post',
    payload: {
      description: String(description || 'MAGASIN backup')
    }
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

  const base = 'https://script.googleapis.com/v1';
  const params = {
    method: options.method || 'get',
    muteHttpExceptions: true,
    followRedirects: true,
    headers: {
      Authorization: 'Bearer ' + token
    },
    contentType: 'application/json'
  };

  if (options.payload !== undefined) {
    params.payload = JSON.stringify(options.payload);
  }

  const response = UrlFetchApp.fetch(base + path, params);
  const code = response.getResponseCode();
  const text = response.getContentText('UTF-8');

  let data = null;
  try {
    data = text ? JSON.parse(text) : {};
  } catch (err) {
    data = { raw: text };
  }

  if (code < 200 || code >= 300) {
    const detail = data && data.error && data.error.message
      ? data.error.message
      : text;
    throw new Error('Apps Script API HTTP ' + code + ': ' + detail);
  }

  return data;
}

/* ======================== MERGE ======================== */

function mergeGithubIntoAppsScript_(currentContent, githubFiles) {
  const currentFiles = Array.isArray(currentContent.files)
    ? currentContent.files.slice()
    : [];

  const indexByName = {};
  currentFiles.forEach(function(file, index) {
    if (file && file.name) indexByName[file.name] = index;
  });

  Object.keys(githubFiles).forEach(function(path) {
    const appsName = path.split('/').pop();
    const source = githubFiles[path];
    const type = /\.html$/i.test(appsName) ? 'HTML' : 'SERVER_JS';

    const nextFile = {
      name: appsName,
      type: type,
      source: source
    };

    if (Object.prototype.hasOwnProperty.call(indexByName, appsName)) {
      currentFiles[indexByName[appsName]] = nextFile;
    } else {
      currentFiles.push(nextFile);
    }
  });

  return {
    files: currentFiles
  };
}

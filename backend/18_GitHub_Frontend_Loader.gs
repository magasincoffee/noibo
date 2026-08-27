/* =========================================================
   MAGASIN — GITHUB FRONTEND LOADER
   ARCH-05

   Mục tiêu:
   - Google Apps Script là runtime chính.
   - GitHub main là SOURCE OF TRUTH của frontend.
   - Apps Script tải Index.html + các partial frontend từ GitHub
     rồi ghép thành một HtmlOutput duy nhất.
   - Không dùng iframe/CORS bridge cho runtime chính.

   Public repository:
   https://github.com/magasincoffee/noibo

   Canonical frontend:
   frontend/Index.html
   frontend/_styles.html
   frontend/_auth.html
   frontend/_schedule.html
   frontend/_attendance.html
   frontend/_management.html

   LƯU Ý:
   - Repository phải public để UrlFetchApp đọc raw files mà không cần token.
   - Chỉ dùng source cố định ở branch main.
========================================================= */

const MAGASIN_GITHUB_RAW_BASE_ =
  'https://raw.githubusercontent.com/magasincoffee/noibo/main/frontend/';

const MAGASIN_GITHUB_FRONTEND_FILES_ = [
  'Index.html',
  '_styles.html',
  '_auth.html',
  '_schedule.html',
  '_attendance.html',
  '_management.html'
];

function renderGithubFrontend_() {
  const contents = githubFrontendLoadFiles_();
  let html = contents['Index.html'];

  html = html.replace(
    /<\?!=\s*include\(['"]_styles['"]\)\s*;?\s*\?>/g,
    function() {
      return contents['_styles.html'] || '';
    }
  );

  const partials = [
    '_auth.html',
    '_schedule.html',
    '_attendance.html',
    '_management.html'
  ];

  partials.forEach(function(fileName) {
    const partialName = fileName.replace('.html', '');
    const pattern = new RegExp(
      '<\\?!=\\s*include\\([\\\'\"]' +
      partialName +
      '[\\\'\"]\\)\\s*;?\\s*\\?>',
      'g'
    );

    html = html.replace(pattern, function() {
      return contents[fileName] || '';
    });
  });

  return HtmlService
    .createHtmlOutput(html)
    .addMetaTag(
      'viewport',
      'width=device-width, initial-scale=1, viewport-fit=cover'
    )
    .setTitle('MAGASIN | Hệ thống nội bộ');
}

function githubFrontendLoadFiles_() {
  const requests = MAGASIN_GITHUB_FRONTEND_FILES_.map(function(fileName) {
    return {
      url: MAGASIN_GITHUB_RAW_BASE_ + encodeURIComponent(fileName),
      muteHttpExceptions: true,
      followRedirects: true
    };
  });

  const responses = UrlFetchApp.fetchAll(requests);
  const result = {};

  responses.forEach(function(response, index) {
    const fileName = MAGASIN_GITHUB_FRONTEND_FILES_[index];
    const code = response.getResponseCode();

    if (code < 200 || code >= 300) {
      throw new Error(
        'Không tải được frontend từ GitHub: ' +
        fileName + ' (HTTP ' + code + ').'
      );
    }

    result[fileName] = response.getContentText('UTF-8');
  });

  if (!result['Index.html']) {
    throw new Error('GitHub frontend không có Index.html.');
  }

  return result;
}

function testGithubFrontendLoader_() {
  const files = githubFrontendLoadFiles_();
  return {
    ok: true,
    message: 'Đã tải frontend từ GitHub thành công.',
    files: Object.keys(files),
    baseUrl: MAGASIN_GITHUB_RAW_BASE_
  };
}

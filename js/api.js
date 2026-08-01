/**
 * ============================================================================
 * API — thin wrapper around fetch() calls to the Apps Script Web App.
 *
 * NOTE: Apps Script web apps do not support custom request headers well with
 * CORS preflight, so we send requests as `text/plain` (a "simple request"
 * that skips the OPTIONS preflight) and let the backend JSON.parse the body.
 * ============================================================================
 */
const Api = (function () {

  function getToken() {
    return localStorage.getItem('nexus_token') || '';
  }

  function setToken(token) {
    if (token) localStorage.setItem('nexus_token', token);
    else localStorage.removeItem('nexus_token');
  }

  async function call(action, payload) {
    if (!CONFIG.API_URL || CONFIG.API_URL.indexOf('PASTE_YOUR') !== -1) {
      throw new Error('لم يتم ضبط رابط الخادم بعد. افتح js/config.js وأدخل رابط Apps Script Web App.');
    }

    const body = JSON.stringify({ action: action, token: getToken(), payload: payload || {} });

    let res;
    try {
      res = await fetch(CONFIG.API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: body
      });
    } catch (networkErr) {
      throw new Error('تعذر الاتصال بالخادم. تحقق من الإنترنت أو رابط الـ API.');
    }

    let json;
    try {
      json = await res.json();
    } catch (parseErr) {
      throw new Error('استجابة غير صالحة من الخادم.');
    }

    if (!json.ok) {
      if (json.error === 'AUTH_EXPIRED') {
        setToken(null);
        Auth.forceLogout('انتهت صلاحية الجلسة، الرجاء تسجيل الدخول مجددًا.');
      }
      throw new Error(json.message || json.error || 'حدث خطأ غير متوقع.');
    }
    return json.data;
  }

  return { call, getToken, setToken };
})();

/**
 * ============================================================================
 * APP — bootstrap, sidebar navigation router, theme + language toggles.
 * ============================================================================
 */
const App = (function () {

  const ROUTES = {
    dashboard: { title: 'لوحة التحكم', sub: 'نظرة عامة على حضور اليوم', mod: 'Dashboard' },
    students: { title: 'قاعدة بيانات الطلاب', sub: 'إدارة بيانات الطلاب المسجلين', mod: 'Students' },
    scan: { title: 'تسجيل الحضور', sub: 'مسح كود QR لتسجيل الحضور فورًا', mod: 'Scanner' },
    attendance: { title: 'سجل الحضور', sub: 'كل عمليات تسجيل الحضور والغياب', mod: 'AttendanceLog' },
    reports: { title: 'التقارير', sub: 'إحصائيات وتحليلات الحضور', mod: 'Reports' },
    cards: { title: 'بطاقات الطلاب', sub: 'إنشاء وطباعة بطاقات تعريف قابلة للمسح', mod: 'Cards' },
    teachers: { title: 'إدارة المعلمين', sub: 'حسابات المعلمين والصلاحيات', mod: 'Teachers' },
    settings: { title: 'الإعدادات', sub: 'ضبط بيانات المركز والصفوف والحصص', mod: 'Settings' }
  };

  // NOTE: top-level `const X = ...` in each module file does NOT attach X to
  // `window` in a plain (non-module) script. We keep a direct reference map
  // here instead of doing `window[meta.mod]`, which was silently undefined.
  const MODULES = {
    Dashboard: Dashboard,
    Students: Students,
    Scanner: Scanner,
    AttendanceLog: AttendanceLog,
    Reports: Reports,
    Cards: Cards,
    Teachers: Teachers,
    Settings: Settings
  };

  let currentRoute = null;

  function navigate(route) {
    if (!ROUTES[route]) route = 'dashboard';
    if (route === 'teachers' || route === 'settings') {
      if (!Auth.isAdmin()) route = 'dashboard';
    }
    if (currentRoute && MODULES[ROUTES[currentRoute].mod] && typeof MODULES[ROUTES[currentRoute].mod].onLeave === 'function' && currentRoute !== route) {
      MODULES[ROUTES[currentRoute].mod].onLeave();
    }

    currentRoute = route;
    const meta = ROUTES[route];
    document.getElementById('pageTitle').textContent = meta.title;
    document.getElementById('pageSubtitle').textContent = meta.sub;

    document.querySelectorAll('.nav-item[data-route]').forEach(function (el) {
      el.classList.toggle('active', el.dataset.route === route);
    });

    const root = document.getElementById('viewRoot');
    MODULES[meta.mod].render(root);

    document.getElementById('sidebar').classList.remove('open');
    window.location.hash = route;
  }

  function initNav() {
    document.querySelectorAll('.nav-item[data-route]').forEach(function (el) {
      el.addEventListener('click', function () { navigate(el.dataset.route); });
    });
    document.getElementById('logoutBtn').addEventListener('click', function () {
      Auth.logout();
    });
    document.getElementById('menuToggle').addEventListener('click', function () {
      document.getElementById('sidebar').classList.toggle('open');
    });
    window.addEventListener('hashchange', function () {
      const route = window.location.hash.replace('#', '');
      if (route && route !== currentRoute) navigate(route);
    });
  }

  function initTheme() {
    const saved = localStorage.getItem('nexus_theme') || 'light';
    document.documentElement.setAttribute('data-theme', saved);
    updateThemeIcon(saved);
    document.getElementById('themeToggle').addEventListener('click', function () {
      const cur = document.documentElement.getAttribute('data-theme');
      const next = cur === 'dark' ? 'light' : 'dark';
      document.documentElement.setAttribute('data-theme', next);
      localStorage.setItem('nexus_theme', next);
      updateThemeIcon(next);
    });
  }
  function updateThemeIcon(theme) {
    document.getElementById('themeToggle').innerHTML = theme === 'dark' ? '<i class="fa-solid fa-sun"></i>' : '<i class="fa-solid fa-moon"></i>';
  }

  function initLang() {
    const saved = localStorage.getItem('nexus_lang') || 'ar';
    applyLang(saved);
    document.getElementById('langToggle').addEventListener('click', function () {
      const cur = document.documentElement.lang === 'ar' ? 'en' : 'ar';
      localStorage.setItem('nexus_lang', cur);
      applyLang(cur);
    });
  }
  function applyLang(lang) {
    // NOTE: This app is Arabic-first. The toggle flips direction/typography
    // for bilingual staff; full English copy can be layered in per-string
    // using this same hook without touching layout or logic.
    document.documentElement.lang = lang;
    document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr';
    document.body.classList.toggle('lang-en', lang === 'en');
  }

  function enterApp() {
    const user = Auth.getUser();
    document.getElementById('loginScreen').style.display = 'none';
    document.getElementById('appShell').classList.add('active');
    document.getElementById('sidebarName').textContent = user.fullName;
    document.getElementById('sidebarRole').textContent = user.role === 'admin' ? 'مدير النظام' : 'معلم';
    document.getElementById('sidebarAvatar').textContent = (user.fullName || '?').trim().charAt(0);
    Auth.applyRoleGating();
    const initialRoute = window.location.hash.replace('#', '') || 'dashboard';
    navigate(initialRoute);
  }

  function init() {
    initTheme();
    initLang();
    initNav();
    Auth.initLoginForm();

    if (Auth.restoreSession()) {
      enterApp();
    }
  }

  return { navigate, enterApp, init };
})();

document.addEventListener('DOMContentLoaded', App.init);

/**
 * ============================================================================
 * CARDS — printable student ID cards ("class pass" ticket-stub design),
 * each with a live QR code (scanned at the door) and a Code128 barcode.
 *
 * Paginated on purpose: QR/barcode generation is synchronous client-side
 * work, so rendering hundreds/thousands of cards at once would visibly
 * freeze the page. We only generate codes for the current page.
 * ============================================================================
 */
const Cards = (function () {
  const PAGE_SIZE = 24;
  let allStudents = [];
  let currentPage = 1;
  let centerName = 'Nexus Tutoring Center';

  function render(root) {
    root.innerHTML =
      '<div class="section-header">' +
        '<h2>بطاقات الطلاب</h2>' +
        '<button class="btn btn-gold no-print" id="printAllBtn"><i class="fa-solid fa-print"></i> طباعة هذه الصفحة</button>' +
      '</div>' +
      '<div class="toolbar no-print">' +
        '<div class="search-box"><i class="fa-solid fa-magnifying-glass"></i><input class="input" id="cardSearch" placeholder="ابحث عن طالب لطباعة بطاقته..."></div>' +
      '</div>' +
      '<div class="card-grid" id="cardGrid"></div>' +
      '<div class="flex items-center justify-between no-print" id="cardPager" style="margin-top:18px;"></div>';

    document.getElementById('cardSearch').addEventListener('input', debounce(function () { currentPage = 1; load(); }, 300));
    document.getElementById('printAllBtn').addEventListener('click', function () { window.print(); });
    load();
  }

  function debounce(fn, ms) { let t; return function () { clearTimeout(t); t = setTimeout(fn, ms); }; }

  async function load() {
    try {
      const settings = await Api.call('getSettings', {});
      centerName = settings.centerName;
      const q = document.getElementById('cardSearch').value;
      allStudents = await UI.withLoader(function () { return Api.call('getStudents', { search: q, activeOnly: true }); });
      renderGrid();
      renderPager();
    } catch (err) { UI.toast(err.message, 'error'); }
  }

  function renderPager() {
    const pager = document.getElementById('cardPager');
    const totalPages = Math.max(1, Math.ceil(allStudents.length / PAGE_SIZE));
    if (allStudents.length <= PAGE_SIZE) { pager.innerHTML = ''; return; }
    pager.innerHTML =
      '<div class="text-muted" style="font-size:13px;">صفحة ' + currentPage + ' من ' + totalPages + ' — إجمالي ' + allStudents.length + ' طالب</div>' +
      '<div class="flex gap-1">' +
        '<button class="btn btn-ghost btn-sm" id="cardPrevBtn" ' + (currentPage <= 1 ? 'disabled' : '') + '><i class="fa-solid fa-arrow-right"></i> السابق</button>' +
        '<button class="btn btn-ghost btn-sm" id="cardNextBtn" ' + (currentPage >= totalPages ? 'disabled' : '') + '>التالي <i class="fa-solid fa-arrow-left"></i></button>' +
      '</div>';
    const prevBtn = document.getElementById('cardPrevBtn');
    const nextBtn = document.getElementById('cardNextBtn');
    if (prevBtn) prevBtn.addEventListener('click', function () { if (currentPage > 1) { currentPage--; renderGrid(); renderPager(); } });
    if (nextBtn) nextBtn.addEventListener('click', function () { if (currentPage < totalPages) { currentPage++; renderGrid(); renderPager(); } });
  }

  function renderGrid() {
    const grid = document.getElementById('cardGrid');
    if (!allStudents.length) {
      grid.innerHTML = '<div class="empty-state"><i class="fa-solid fa-id-card"></i>لا يوجد طلاب لعرض بطاقاتهم</div>';
      return;
    }
    const start = (currentPage - 1) * PAGE_SIZE;
    const pageStudents = allStudents.slice(start, start + PAGE_SIZE);

    grid.innerHTML = pageStudents.map(function (s) {
      const initial = (s.FullName || '?').trim().charAt(0);
      return '<div class="id-card">' +
        '<div class="stub-top">' +
          '<div class="center-name"><span class="dot"></span>' + UI.escapeHtml(centerName) + '</div>' +
          '<div class="photo-badge">' + UI.escapeHtml(initial) + '</div>' +
        '</div>' +
        '<div class="perforation"></div>' +
        '<div class="stub-body">' +
          '<div class="name">' + UI.escapeHtml(s.FullName) + '</div>' +
          '<div class="meta">' + UI.escapeHtml(s.Grade) + ' — مجموعة ' + UI.escapeHtml(s.Group) + '</div>' +
          '<div class="code-row">' +
            '<div class="qr-box" id="qr-' + s.StudentID + '"></div>' +
            '<div class="barcode-box"><svg id="bar-' + s.StudentID + '"></svg><div class="id-text">' + UI.escapeHtml(s.StudentID) + '</div></div>' +
          '</div>' +
        '</div>' +
      '</div>';
    }).join('');

    // Only generate QR/barcode images for the students actually visible on
    // this page — this is what keeps the view fast for large rosters.
    pageStudents.forEach(function (s) {
      const qrEl = document.getElementById('qr-' + s.StudentID);
      if (qrEl) new QRCode(qrEl, { text: s.StudentID, width: 76, height: 76, correctLevel: QRCode.CorrectLevel.M });
      const barEl = document.getElementById('bar-' + s.StudentID);
      if (barEl) {
        try {
          JsBarcode(barEl, s.StudentID, { format: 'CODE128', width: 1.4, height: 34, displayValue: false, margin: 0 });
        } catch (e) { /* non-fatal — card still shows the QR + printed ID text */ }
      }
    });
  }

  return { render };
})();

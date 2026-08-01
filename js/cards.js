/**
 * ============================================================================
 * CARDS — printable student ID cards ("class pass" ticket-stub design),
 * each with a live QR code (scanned at the door) and a Code128 barcode.
 * ============================================================================
 */
const Cards = (function () {
  let studentsCache = [];
  let centerName = 'Nexus Tutoring Center';

  function render(root) {
    root.innerHTML =
      '<div class="section-header">' +
        '<h2>بطاقات الطلاب</h2>' +
        '<button class="btn btn-gold no-print" id="printAllBtn"><i class="fa-solid fa-print"></i> طباعة الكل</button>' +
      '</div>' +
      '<div class="toolbar no-print">' +
        '<div class="search-box"><i class="fa-solid fa-magnifying-glass"></i><input class="input" id="cardSearch" placeholder="ابحث عن طالب لطباعة بطاقته..."></div>' +
      '</div>' +
      '<div class="card-grid" id="cardGrid"></div>';

    document.getElementById('cardSearch').addEventListener('input', debounce(load, 300));
    document.getElementById('printAllBtn').addEventListener('click', function () { window.print(); });
    load();
  }

  function debounce(fn, ms) { let t; return function () { clearTimeout(t); t = setTimeout(fn, ms); }; }

  async function load() {
    try {
      const settings = await Api.call('getSettings', {});
      centerName = settings.centerName;
      const q = document.getElementById('cardSearch').value;
      studentsCache = await Api.call('getStudents', { search: q, activeOnly: true });
      renderGrid();
    } catch (err) { UI.toast(err.message, 'error'); }
  }

  function renderGrid() {
    const grid = document.getElementById('cardGrid');
    if (!studentsCache.length) {
      grid.innerHTML = '<div class="empty-state"><i class="fa-solid fa-id-card"></i>لا يوجد طلاب لعرض بطاقاتهم</div>';
      return;
    }
    grid.innerHTML = studentsCache.map(function (s) {
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
        '<div class="card-actions no-print">' +
          '<button class="btn btn-ghost btn-sm w-full" onclick="Cards.printOne(\'' + s.StudentID + '\')"><i class="fa-solid fa-print"></i> طباعة</button>' +
        '</div>' +
      '</div>';
    }).join('');

    studentsCache.forEach(function (s) {
      const qrEl = document.getElementById('qr-' + s.StudentID);
      if (qrEl) new QRCode(qrEl, { text: s.StudentID, width: 76, height: 76, correctLevel: QRCode.CorrectLevel.M });
      const barEl = document.getElementById('bar-' + s.StudentID);
      if (barEl) {
        try {
          JsBarcode(barEl, s.StudentID, { format: 'CODE128', width: 1.4, height: 34, displayValue: false, margin: 0 });
        } catch (e) {}
      }
    });
  }

  function printOne(studentId) {
    // Simplest reliable approach in a static site: rely on browser print with
    // print CSS already hiding chrome; user can select the relevant page range.
    window.print();
  }

  return { render, printOne };
})();

/**
 * ============================================================================
 * ATTENDANCE — full attendance log with search/filter, plus manual
 * attendance / absence entry for teachers.
 * ============================================================================
 */
const AttendanceLog = (function () {
  let settingsCache = null;
  let studentsCache = [];

  function render(root) {
    root.innerHTML =
      '<div class="section-header">' +
        '<h2>سجل الحضور</h2>' +
        '<button class="btn btn-gold" id="manualEntryBtn"><i class="fa-solid fa-pen-to-square"></i> تسجيل يدوي</button>' +
      '</div>' +
      '<div class="toolbar">' +
        '<div class="search-box"><i class="fa-solid fa-magnifying-glass"></i><input class="input" id="attSearch" placeholder="ابحث باسم الطالب..."></div>' +
        '<input type="date" class="input" id="attDate" style="max-width:170px;">' +
        '<select class="input" id="attGrade" style="max-width:160px;"><option value="">كل الصفوف</option></select>' +
        '<select class="input" id="attSession" style="max-width:160px;"><option value="">كل الحصص</option></select>' +
        '<button class="btn btn-ghost" id="attClearFilters">مسح الفلاتر</button>' +
      '</div>' +
      '<div class="card table-wrap"><div id="attTableHost"></div></div>';

    document.getElementById('attSearch').addEventListener('input', debounce(load, 300));
    document.getElementById('attDate').addEventListener('change', load);
    document.getElementById('attGrade').addEventListener('change', load);
    document.getElementById('attSession').addEventListener('change', load);
    document.getElementById('attClearFilters').addEventListener('click', function () {
      document.getElementById('attSearch').value = '';
      document.getElementById('attDate').value = '';
      document.getElementById('attGrade').value = '';
      document.getElementById('attSession').value = '';
      load();
    });
    document.getElementById('manualEntryBtn').addEventListener('click', openManualForm);

    loadFilterOptions();
    load();
  }

  function debounce(fn, ms) { let t; return function () { clearTimeout(t); t = setTimeout(fn, ms); }; }

  async function loadFilterOptions() {
    try {
      settingsCache = await Api.call('getSettings', {});
      const gradeSel = document.getElementById('attGrade');
      const sessSel = document.getElementById('attSession');
      settingsCache.grades.forEach(function (g) { gradeSel.innerHTML += '<option value="' + g + '">' + g + '</option>'; });
      settingsCache.sessions.forEach(function (s) { sessSel.innerHTML += '<option value="' + s.name + '">' + s.name + '</option>'; });
    } catch (e) {}
  }

  async function load() {
    const host = document.getElementById('attTableHost');
    try {
      const payload = {
        search: document.getElementById('attSearch').value,
        date: document.getElementById('attDate').value,
        grade: document.getElementById('attGrade').value,
        session: document.getElementById('attSession').value
      };
      const log = await Api.call('getAttendanceLog', payload);
      renderTable(host, log);
    } catch (err) { UI.toast(err.message, 'error'); }
  }

  function renderTable(host, log) {
    if (!log.length) {
      host.innerHTML = '<div class="empty-state"><i class="fa-solid fa-clipboard"></i>لا توجد سجلات مطابقة</div>';
      return;
    }
    host.innerHTML =
      '<table class="data-table"><thead><tr>' +
        '<th>الطالب</th><th>الصف</th><th>التاريخ</th><th>الوقت</th><th>الحصة</th><th>الحالة</th><th>المعلم</th>' +
      '</tr></thead><tbody>' +
      log.map(function (r) {
        return '<tr>' +
          '<td>' + UI.escapeHtml(r.FullName) + '</td>' +
          '<td>' + UI.escapeHtml(r.Grade) + '</td>' +
          '<td>' + UI.escapeHtml(r.Date) + '</td>' +
          '<td>' + UI.escapeHtml(r.Time) + '</td>' +
          '<td>' + UI.escapeHtml(r.Session) + '</td>' +
          '<td>' + UI.statusBadge(r.Status) + '</td>' +
          '<td>' + UI.escapeHtml(r.Teacher) + '</td>' +
        '</tr>';
      }).join('') +
      '</tbody></table>';
  }

  async function openManualForm() {
    // Always fetch fresh (not cached) — a student added moments ago must be
    // selectable immediately, and the list is also role-filtered per teacher.
    try { studentsCache = await UI.withLoader(function () { return Api.call('getStudents', { activeOnly: true }); }); } catch (e) { UI.toast(e.message, 'error'); return; }
    if (!studentsCache.length) { UI.toast('لا يوجد طلاب متاحون لك حاليًا', 'warn'); return; }
    const sessions = settingsCache ? settingsCache.sessions : [];
    UI.openModal(
      '<div class="modal-header"><h3>تسجيل حضور / غياب يدوي</h3></div>' +
      '<div class="modal-body">' +
        '<div class="field"><label>الطالب</label><select class="input" id="manStudent">' +
          studentsCache.map(function (s) { return '<option value="' + s.StudentID + '">' + s.FullName + ' — ' + s.Grade + '</option>'; }).join('') +
        '</select></div>' +
        '<div class="field"><label>الحصة</label><select class="input" id="manSession">' +
          sessions.map(function (s) { return '<option value="' + s.name + '">' + s.name + '</option>'; }).join('') +
        '</select></div>' +
        '<div class="field"><label>الحالة</label><select class="input" id="manStatus">' +
          '<option value="Present">حاضر</option><option value="Late">متأخر</option><option value="Absent">غائب</option>' +
        '</select></div>' +
      '</div>' +
      '<div class="modal-footer">' +
        '<button class="btn btn-ghost" onclick="UI.closeModal()">إلغاء</button>' +
        '<button class="btn btn-primary" id="manSaveBtn">حفظ</button>' +
      '</div>'
    );
    document.getElementById('manSaveBtn').addEventListener('click', async function () {
      const studentId = document.getElementById('manStudent').value;
      const session = document.getElementById('manSession').value;
      const status = document.getElementById('manStatus').value;
      try {
        const action = status === 'Absent' ? 'manualAbsence' : 'manualAttendance';
        const result = await UI.withLoader(function () { return Api.call(action, { studentId: studentId, session: session, status: status }); });
        if (result.status === 'DUPLICATE') { UI.toast('تم تسجيل حضور هذا الطالب مسبقًا اليوم', 'warn'); }
        else { UI.toast('تم الحفظ بنجاح', 'success'); }
        UI.closeModal();
        load();
      } catch (err) { UI.toast(err.message, 'error'); }
    });
  }

  return { render };
})();

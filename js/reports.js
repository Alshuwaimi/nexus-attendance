/**
 * ============================================================================
 * REPORTS — daily/weekly/monthly summaries, most-absent & top-attendance
 * lists, and CSV / print export.
 * ============================================================================
 */
const Reports = (function () {
  let currentType = 'daily';
  let lastData = null;

  function render(root) {
    root.innerHTML =
      '<div class="section-header">' +
        '<h2>التقارير</h2>' +
        '<div class="flex gap-1">' +
          '<button class="btn btn-ghost" id="exportCsvBtn"><i class="fa-solid fa-file-csv"></i> تصدير CSV</button>' +
          '<button class="btn btn-ghost" id="printReportBtn"><i class="fa-solid fa-print"></i> طباعة PDF</button>' +
        '</div>' +
      '</div>' +
      '<div class="report-tabs">' +
        '<div class="report-tab active" data-type="daily">يومي</div>' +
        '<div class="report-tab" data-type="weekly">أسبوعي</div>' +
        '<div class="report-tab" data-type="monthly">شهري</div>' +
      '</div>' +
      '<div class="kpi-row" id="kpiRow"></div>' +
      '<div class="chart-grid" style="grid-template-columns:1fr 1fr;">' +
        '<div class="card chart-card"><h4>الأكثر غيابًا</h4><div id="mostAbsentHost"></div></div>' +
        '<div class="card chart-card"><h4>الأعلى حضورًا</h4><div id="topAttendanceHost"></div></div>' +
      '</div>' +
      '<div class="card table-wrap" style="margin-top:16px;"><div id="reportTableHost"></div></div>';

    root.querySelectorAll('.report-tab').forEach(function (tab) {
      tab.addEventListener('click', function () {
        root.querySelectorAll('.report-tab').forEach(function (t) { t.classList.remove('active'); });
        tab.classList.add('active');
        currentType = tab.dataset.type;
        load();
      });
    });
    document.getElementById('exportCsvBtn').addEventListener('click', exportCsv);
    document.getElementById('printReportBtn').addEventListener('click', function () { window.print(); });

    load();
  }

  async function load() {
    try {
      const data = await Api.call('getReports', { type: currentType });
      lastData = data;
      renderKpis(data);
      renderMiniList('mostAbsentHost', data.mostAbsent, 'absent', 'غياب');
      renderMiniList('topAttendanceHost', data.topAttendance, 'attendancePct', '% حضور');
      renderTable(data.rows);
    } catch (err) { UI.toast(err.message, 'error'); }
  }

  function renderKpis(data) {
    document.getElementById('kpiRow').innerHTML =
      kpi(data.attendancePercentage + '%', 'نسبة الحضور') +
      kpi(data.absencePercentage + '%', 'نسبة الغياب') +
      kpi(data.totalRecords, 'إجمالي السجلات') +
      kpi(data.rows.length, 'عدد الطلاب المتأثرين');
  }
  function kpi(val, lbl) {
    return '<div class="card kpi-mini"><div class="val">' + val + '</div><div class="lbl">' + lbl + '</div></div>';
  }

  function renderMiniList(hostId, list, key, suffix) {
    const host = document.getElementById(hostId);
    if (!list.length) { host.innerHTML = '<div class="text-muted" style="padding:10px 0;">لا توجد بيانات كافية</div>'; return; }
    host.innerHTML = '<table class="data-table"><tbody>' +
      list.map(function (r) {
        return '<tr><td>' + UI.escapeHtml(r.fullName) + '</td><td style="text-align:left;font-weight:700;">' + r[key] + (key === 'attendancePct' ? '%' : '') + '</td></tr>';
      }).join('') + '</tbody></table>';
  }

  function renderTable(rows) {
    const host = document.getElementById('reportTableHost');
    if (!rows.length) { host.innerHTML = '<div class="empty-state"><i class="fa-solid fa-chart-simple"></i>لا توجد بيانات لهذه الفترة</div>'; return; }
    host.innerHTML =
      '<table class="data-table"><thead><tr>' +
        '<th>الطالب</th><th>الصف</th><th>أيام الحضور</th><th>أيام التأخير</th><th>أيام الغياب</th><th>نسبة الحضور</th>' +
      '</tr></thead><tbody>' +
      rows.map(function (r) {
        return '<tr><td>' + UI.escapeHtml(r.fullName) + '</td><td>' + UI.escapeHtml(r.grade) + '</td>' +
          '<td>' + r.present + '</td><td>' + r.late + '</td><td>' + r.absent + '</td><td>' + r.attendancePct + '%</td></tr>';
      }).join('') + '</tbody></table>';
  }

  function exportCsv() {
    if (!lastData) return;
    const rows = lastData.rows;
    const header = ['StudentID', 'FullName', 'Grade', 'Present', 'Late', 'Absent', 'AttendancePct'];
    const lines = [header.join(',')].concat(rows.map(function (r) {
      return [r.studentId, r.fullName, r.grade, r.present, r.late, r.absent, r.attendancePct].join(',');
    }));
    const blob = new Blob(['\uFEFF' + lines.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'attendance_report_' + currentType + '.csv';
    a.click();
    URL.revokeObjectURL(url);
  }

  return { render };
})();

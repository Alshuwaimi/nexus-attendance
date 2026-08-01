/**
 * ============================================================================
 * DASHBOARD — stat cards, the "Attendance Pulse" live feed, and charts.
 * ============================================================================
 */
const Dashboard = (function () {
  let trendChart = null;
  let gradeChart = null;
  let currentRange = 'weekly';

  function render(root) {
    root.innerHTML =
      '<div class="pulse-card">' +
        '<div class="pulse-top">' +
          '<div class="label"><span class="live-dot"></span>نبض الحضور اللحظي</div>' +
          '<div class="label" id="pulseClock"></div>' +
        '</div>' +
        '<div class="pulse-svg-wrap"><svg viewBox="0 0 900 64" width="100%" height="64" preserveAspectRatio="none">' +
          '<polyline points="0,32 60,32 80,8 100,56 120,32 260,32 280,10 300,54 320,32 460,32 480,6 500,58 520,32 700,32 720,10 740,54 760,32 900,32" ' +
          'fill="none" stroke="#E8B93D" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/></svg></div>' +
        '<div class="pulse-feed" id="pulseFeed"><div class="pulse-feed-item text-muted">لا توجد عمليات مسح اليوم بعد</div></div>' +
      '</div>' +

      '<div class="stat-grid" id="statGrid"></div>' +

      '<div class="chart-grid">' +
        '<div class="chart-card">' +
          '<div class="flex justify-between items-center">' +
            '<h4>اتجاه الحضور</h4>' +
            '<div class="chart-tabs">' +
              '<div class="chart-tab" data-range="daily">يومي</div>' +
              '<div class="chart-tab active" data-range="weekly">أسبوعي</div>' +
              '<div class="chart-tab" data-range="monthly">شهري</div>' +
            '</div>' +
          '</div>' +
          '<canvas id="trendChart" height="180"></canvas>' +
        '</div>' +
        '<div class="chart-card">' +
          '<h4>الحضور حسب الصف (اليوم)</h4>' +
          '<canvas id="gradeChart" height="180"></canvas>' +
        '</div>' +
      '</div>';

    root.querySelectorAll('.chart-tab').forEach(function (tab) {
      tab.addEventListener('click', function () {
        root.querySelectorAll('.chart-tab').forEach(function (t) { t.classList.remove('active'); });
        tab.classList.add('active');
        currentRange = tab.dataset.range;
        loadCharts();
      });
    });

    tickClock();
    setInterval(tickClock, 1000);
    loadAll();
  }

  function tickClock() {
    const el = document.getElementById('pulseClock');
    if (el) el.textContent = new Date().toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' });
  }

  async function loadAll() {
    await Promise.all([loadStats(), loadCharts(), loadRecentFeed()]);
  }

  async function loadStats() {
    try {
      const s = await Api.call('getDashboardStats', {});
      const grid = document.getElementById('statGrid');
      if (!grid) return;
      grid.innerHTML =
        statCard('fa-users', s.totalStudents, 'إجمالي الطلاب', 'blue') +
        statCard('fa-user-check', s.presentToday, 'الحضور اليوم', 'green') +
        statCard('fa-user-xmark', s.absentToday, 'الغياب اليوم', 'red') +
        statCard('fa-percent', s.attendancePercentage + '%', 'نسبة الحضور', 'gold') +
        statCard('fa-calendar-day', s.todaysSessions, 'حصص اليوم', 'blue') +
        statCard('fa-clock', s.lateToday, 'الطلاب المتأخرون', 'gold');
    } catch (err) { UI.toast(err.message, 'error'); }
  }

  function statCard(icon, value, label, color) {
    return '<div class="card stat-card stat-' + color + '">' +
      '<div class="icon-wrap"><i class="fa-solid ' + icon + '"></i></div>' +
      '<div class="value">' + value + '</div>' +
      '<div class="label">' + label + '</div>' +
      '</div>';
  }

  async function loadCharts() {
    try {
      const data = await Api.call('getChartData', { range: currentRange });
      renderTrendChart(data);
      renderGradeChart(data.byGrade);
    } catch (err) { UI.toast(err.message, 'error'); }
  }

  function renderTrendChart(data) {
    const ctx = document.getElementById('trendChart');
    if (!ctx) return;
    if (trendChart) trendChart.destroy();
    trendChart = new Chart(ctx, {
      type: 'line',
      data: {
        labels: data.labels,
        datasets: [
          { label: 'حاضر', data: data.present, borderColor: '#2FB380', backgroundColor: 'rgba(47,179,128,.12)', fill: true, tension: .35 },
          { label: 'غائب', data: data.absent, borderColor: '#E5484D', backgroundColor: 'rgba(229,72,77,.10)', fill: true, tension: .35 }
        ]
      },
      options: { responsive: true, plugins: { legend: { position: 'bottom' } }, scales: { y: { beginAtZero: true } } }
    });
  }

  function renderGradeChart(byGrade) {
    const ctx = document.getElementById('gradeChart');
    if (!ctx) return;
    if (gradeChart) gradeChart.destroy();
    const labels = Object.keys(byGrade);
    gradeChart = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: labels,
        datasets: [
          { label: 'حاضر', data: labels.map(function (g) { return byGrade[g].present; }), backgroundColor: '#2FB380' },
          { label: 'غائب', data: labels.map(function (g) { return byGrade[g].absent; }), backgroundColor: '#E5484D' }
        ]
      },
      options: { responsive: true, plugins: { legend: { position: 'bottom' } }, scales: { x: { stacked: true }, y: { stacked: true, beginAtZero: true } } }
    });
  }

  async function loadRecentFeed() {
    try {
      const log = await Api.call('getAttendanceLog', {});
      const feed = document.getElementById('pulseFeed');
      if (!feed) return;
      const recent = log.slice(0, 12);
      if (!recent.length) return;
      feed.innerHTML = recent.map(function (r) {
        const lateClass = r.Status === 'Late' ? 'late' : '';
        return '<div class="pulse-feed-item ' + lateClass + '"><span class="name">' + UI.escapeHtml(r.FullName) + '</span> — ' + UI.escapeHtml(r.Time) + '</div>';
      }).join('');
    } catch (err) { /* silent — non-critical widget */ }
  }

  return { render };
})();

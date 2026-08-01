/**
 * ============================================================================
 * SETTINGS — center identity, grades, groups, and session schedules
 * (used by the automatic-absence engine on the backend).
 * ============================================================================
 */
const Settings = (function () {
  let data = null;

  function render(root) {
    root.innerHTML = '<div class="section-header"><h2>الإعدادات</h2></div><div id="settingsHost"></div>';
    load();
  }

  async function load() {
    try {
      data = await Api.call('getSettings', {});
      draw();
    } catch (err) { UI.toast(err.message, 'error'); }
  }

  function draw() {
    const host = document.getElementById('settingsHost');
    host.innerHTML =
      '<div class="card" style="padding:22px;margin-bottom:18px;">' +
        '<h4 style="margin-top:0;">هوية المركز</h4>' +
        '<div class="form-grid">' +
          '<div class="field"><label>اسم المركز</label><input class="input" id="setCenterName" value="' + UI.escapeHtml(data.centerName) + '"></div>' +
          '<div class="field"><label>رابط الشعار (اختياري)</label><input class="input" id="setLogoUrl" value="' + UI.escapeHtml(data.logoUrl) + '"></div>' +
        '</div>' +
      '</div>' +

      '<div class="card" style="padding:22px;margin-bottom:18px;">' +
        '<h4 style="margin-top:0;">الصفوف الدراسية</h4>' +
        '<div id="gradesList" class="flex gap-1" style="flex-wrap:wrap;margin-bottom:12px;"></div>' +
        '<div class="flex gap-1"><input class="input" id="newGradeInput" placeholder="اسم صف جديد" style="max-width:220px;"><button class="btn btn-ghost btn-sm" id="addGradeBtn">إضافة</button></div>' +
      '</div>' +

      '<div class="card" style="padding:22px;margin-bottom:18px;">' +
        '<h4 style="margin-top:0;">المجموعات</h4>' +
        '<div id="groupsList" class="flex gap-1" style="flex-wrap:wrap;margin-bottom:12px;"></div>' +
        '<div class="flex gap-1"><input class="input" id="newGroupInput" placeholder="اسم مجموعة جديدة" style="max-width:220px;"><button class="btn btn-ghost btn-sm" id="addGroupBtn">إضافة</button></div>' +
      '</div>' +

      '<div class="card" style="padding:22px;margin-bottom:18px;">' +
        '<h4 style="margin-top:0;">الحصص الدراسية</h4>' +
        '<div id="sessionsList"></div>' +
        '<div class="flex gap-1" style="margin-top:12px;">' +
          '<input class="input" id="newSessName" placeholder="اسم الحصة" style="max-width:160px;">' +
          '<input type="time" class="input" id="newSessStart" style="max-width:130px;">' +
          '<input type="time" class="input" id="newSessEnd" style="max-width:130px;">' +
          '<button class="btn btn-ghost btn-sm" id="addSessBtn">إضافة حصة</button>' +
        '</div>' +
        '<div class="text-muted" style="font-size:12.5px;margin-top:10px;">يتم استخدام أوقات الحصص لتحديد التأخير، ولتشغيل آلية الغياب التلقائي بعد انتهاء كل حصة.</div>' +
      '</div>' +

      '<button class="btn btn-primary" id="saveSettingsBtn"><i class="fa-solid fa-floppy-disk"></i> حفظ كل الإعدادات</button>';

    renderChipList('gradesList', data.grades, removeGrade);
    renderChipList('groupsList', data.groups, removeGroup);
    renderSessions();

    document.getElementById('addGradeBtn').addEventListener('click', function () {
      const val = document.getElementById('newGradeInput').value.trim();
      if (val) { data.grades.push(val); document.getElementById('newGradeInput').value = ''; renderChipList('gradesList', data.grades, removeGrade); }
    });
    document.getElementById('addGroupBtn').addEventListener('click', function () {
      const val = document.getElementById('newGroupInput').value.trim();
      if (val) { data.groups.push(val); document.getElementById('newGroupInput').value = ''; renderChipList('groupsList', data.groups, removeGroup); }
    });
    document.getElementById('addSessBtn').addEventListener('click', function () {
      const name = document.getElementById('newSessName').value.trim();
      const start = document.getElementById('newSessStart').value;
      const end = document.getElementById('newSessEnd').value;
      if (!name || !start || !end) { UI.toast('أدخل اسم الحصة ووقت البداية والنهاية', 'error'); return; }
      data.sessions.push({ name: name, start: start, end: end });
      document.getElementById('newSessName').value = '';
      renderSessions();
    });
    document.getElementById('saveSettingsBtn').addEventListener('click', save);
  }

  function renderChipList(hostId, items, onRemove) {
    const host = document.getElementById(hostId);
    host.innerHTML = items.map(function (item, idx) {
      return '<span class="badge badge-muted" style="padding:8px 12px;">' + UI.escapeHtml(item) +
        ' <i class="fa-solid fa-xmark" style="cursor:pointer;margin-inline-start:6px;" onclick="Settings.remove(\'' + hostId + '\',' + idx + ')"></i></span>';
    }).join('');
    window.__settingsRemoveMap = window.__settingsRemoveMap || {};
    window.__settingsRemoveMap[hostId] = onRemove;
  }

  function remove(hostId, idx) {
    if (window.__settingsRemoveMap && window.__settingsRemoveMap[hostId]) window.__settingsRemoveMap[hostId](idx);
  }
  function removeGrade(idx) { data.grades.splice(idx, 1); renderChipList('gradesList', data.grades, removeGrade); }
  function removeGroup(idx) { data.groups.splice(idx, 1); renderChipList('groupsList', data.groups, removeGroup); }

  function renderSessions() {
    const host = document.getElementById('sessionsList');
    if (!data.sessions.length) { host.innerHTML = '<div class="text-muted">لا توجد حصص بعد</div>'; return; }
    host.innerHTML = '<table class="data-table"><thead><tr><th>الحصة</th><th>البداية</th><th>النهاية</th><th></th></tr></thead><tbody>' +
      data.sessions.map(function (s, idx) {
        return '<tr><td>' + UI.escapeHtml(s.name) + '</td><td>' + s.start + '</td><td>' + s.end + '</td>' +
          '<td><button class="btn btn-ghost btn-sm" onclick="Settings.removeSession(' + idx + ')"><i class="fa-solid fa-trash"></i></button></td></tr>';
      }).join('') + '</tbody></table>';
  }
  function removeSession(idx) { data.sessions.splice(idx, 1); renderSessions(); }

  async function save() {
    const payload = {
      centerName: document.getElementById('setCenterName').value.trim(),
      logoUrl: document.getElementById('setLogoUrl').value.trim(),
      grades: data.grades,
      groups: data.groups,
      sessions: data.sessions
    };
    try {
      await UI.withLoader(function () { return Api.call('updateSettings', payload); });
      UI.toast('تم حفظ الإعدادات بنجاح', 'success');
    } catch (err) { UI.toast(err.message, 'error'); }
  }

  return { render, remove, removeSession };
})();

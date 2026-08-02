/**
 * ============================================================================
 * STUDENTS — search, filter, add, edit, delete, bulk import, and teacher
 * assignment (a student can belong to one specific teacher, or to "ALL").
 * ============================================================================
 */
const Students = (function () {
  let cache = [];
  let settingsCache = null;
  let teachersCache = []; // only populated for admins (needed for the assignment dropdown)

  function render(root) {
    const isAdmin = Auth.isAdmin();
    root.innerHTML =
      '<div class="section-header">' +
        '<h2>قاعدة بيانات الطلاب</h2>' +
        '<div class="flex gap-1">' +
          (isAdmin ? '<button class="btn btn-ghost" id="importBtn"><i class="fa-solid fa-file-import"></i> استيراد Excel/CSV</button>' : '') +
          '<button class="btn btn-gold" id="addStudentBtn"><i class="fa-solid fa-plus"></i> إضافة طالب</button>' +
        '</div>' +
      '</div>' +
      '<div class="toolbar">' +
        '<div class="search-box"><i class="fa-solid fa-magnifying-glass"></i><input class="input" id="studentSearch" placeholder="ابحث بالاسم أو الرقم أو الهاتف..."></div>' +
        '<select class="input" id="gradeFilter" style="max-width:160px;"><option value="">كل الصفوف</option></select>' +
        '<select class="input" id="groupFilter" style="max-width:140px;"><option value="">كل المجموعات</option></select>' +
        (isAdmin ? '<select class="input" id="teacherFilter" style="max-width:180px;"><option value="">كل المعلمين</option></select>' : '') +
      '</div>' +
      '<div class="card table-wrap"><div id="studentsTableHost"></div></div>' +
      '<input type="file" id="importFile" accept=".csv" class="hidden">';

    document.getElementById('studentSearch').addEventListener('input', debounce(loadStudents, 300));
    document.getElementById('gradeFilter').addEventListener('change', loadStudents);
    document.getElementById('groupFilter').addEventListener('change', loadStudents);
    document.getElementById('addStudentBtn').addEventListener('click', function () { openStudentForm(null); });

    if (isAdmin) {
      document.getElementById('teacherFilter').addEventListener('change', loadStudents);
      document.getElementById('importBtn').addEventListener('click', function () { document.getElementById('importFile').click(); });
      document.getElementById('importFile').addEventListener('change', handleImportFile);
    }

    loadSettingsAndFilters();
    loadStudents();
  }

  function debounce(fn, ms) {
    let t; return function () { clearTimeout(t); t = setTimeout(fn, ms); };
  }

  async function loadSettingsAndFilters() {
    try {
      settingsCache = await Api.call('getSettings', {});
      const gradeSel = document.getElementById('gradeFilter');
      const groupSel = document.getElementById('groupFilter');
      if (gradeSel) settingsCache.grades.forEach(function (g) { gradeSel.innerHTML += '<option value="' + g + '">' + g + '</option>'; });
      if (groupSel) settingsCache.groups.forEach(function (g) { groupSel.innerHTML += '<option value="' + g + '">' + g + '</option>'; });
    } catch (err) { /* non-blocking */ }

    if (Auth.isAdmin()) {
      try {
        teachersCache = await Api.call('getTeachers', {});
        const teacherSel = document.getElementById('teacherFilter');
        if (teacherSel) {
          teacherSel.innerHTML += '<option value="ALL">كل المعلمين (مشتركين)</option>';
          teachersCache.forEach(function (t) { teacherSel.innerHTML += '<option value="' + t.teacherId + '">' + t.fullName + '</option>'; });
        }
      } catch (err) { /* non-blocking */ }
    }
  }

  async function loadStudents() {
    const host = document.getElementById('studentsTableHost');
    try {
      const isAdmin = Auth.isAdmin();
      const payload = {
        search: document.getElementById('studentSearch').value,
        grade: document.getElementById('gradeFilter').value,
        group: document.getElementById('groupFilter').value
      };
      if (isAdmin) payload.teacherFilter = document.getElementById('teacherFilter').value;
      cache = await Api.call('getStudents', payload);
      renderTable(host);
    } catch (err) { UI.toast(err.message, 'error'); }
  }

  function renderTable(host) {
    if (!cache.length) {
      host.innerHTML = '<div class="empty-state"><i class="fa-solid fa-user-slash"></i>لا يوجد طلاب مطابقون للبحث</div>';
      return;
    }
    const isAdmin = Auth.isAdmin();
    host.innerHTML =
      '<table class="data-table"><thead><tr>' +
        '<th>الرقم</th><th>الاسم</th><th>الصف</th><th>المجموعة</th><th>ولي الأمر</th><th>هاتف ولي الأمر</th>' +
        (isAdmin ? '<th>المعلم المسؤول</th>' : '') +
        '<th>الحالة</th>' +
        (isAdmin ? '<th>إجراءات</th>' : '') +
      '</tr></thead><tbody>' +
      cache.map(function (s) {
        const active = String(s.Active).toUpperCase() !== 'FALSE';
        return '<tr>' +
          '<td>' + UI.escapeHtml(s.StudentID) + '</td>' +
          '<td>' + UI.escapeHtml(s.FullName) + '</td>' +
          '<td>' + UI.escapeHtml(s.Grade) + '</td>' +
          '<td>' + UI.escapeHtml(s.Group) + '</td>' +
          '<td>' + UI.escapeHtml(s.ParentName) + '</td>' +
          '<td dir="ltr">' + UI.escapeHtml(s.ParentPhone) + '</td>' +
          (isAdmin ? '<td>' + teacherBadge(s) + '</td>' : '') +
          '<td>' + (active ? '<span class="badge badge-success">نشط</span>' : '<span class="badge badge-muted">غير نشط</span>') + '</td>' +
          (isAdmin ? '<td><div class="row-actions">' +
            '<button title="تعديل" onclick="Students.edit(\'' + s.StudentID + '\')"><i class="fa-solid fa-pen"></i></button>' +
            '<button title="حذف" onclick="Students.remove(\'' + s.StudentID + '\')"><i class="fa-solid fa-trash"></i></button>' +
          '</div></td>' : '') +
        '</tr>';
      }).join('') +
      '</tbody></table>';
  }

  function teacherBadge(s) {
    const assigned = s.AssignedTeacher || 'ALL';
    if (assigned === 'ALL') return '<span class="badge badge-muted">كل المعلمين</span>';
    return '<span class="badge badge-warn">' + UI.escapeHtml(s.AssignedTeacherName || assigned) + '</span>';
  }

  function openStudentForm(studentId) {
    const student = studentId ? cache.filter(function (s) { return s.StudentID === studentId; })[0] : null;
    const grades = settingsCache ? settingsCache.grades : [];
    const groups = settingsCache ? settingsCache.groups : [];
    const isAdmin = Auth.isAdmin();

    let assignmentField = '';
    if (isAdmin) {
      const currentAssigned = student ? (student.AssignedTeacher || 'ALL') : 'ALL';
      assignmentField =
        '<div class="field"><label>المعلم المسؤول عن الطالب</label><select class="input" id="sAssignedTeacher">' +
          '<option value="ALL" ' + (currentAssigned === 'ALL' ? 'selected' : '') + '>كل المعلمين (مشترك)</option>' +
          teachersCache.map(function (t) {
            return '<option value="' + t.teacherId + '" ' + (String(currentAssigned) === String(t.teacherId) ? 'selected' : '') + '>' + UI.escapeHtml(t.fullName) + '</option>';
          }).join('') +
        '</select>' +
        '<div class="text-muted" style="font-size:12px;margin-top:4px;">لو اخترت معلمًا محددًا، هذا الطالب هيظهر بس عنده هو (والمدير). لو "كل المعلمين"، هيظهر عند الجميع.</div>' +
        '</div>';
    } else if (!student) {
      // A teacher registering a new student themselves: locked to their own roster.
      assignmentField = '<div class="text-muted" style="font-size:12.5px;margin-bottom:14px;"><i class="fa-solid fa-circle-info"></i> هذا الطالب هيتسجل تلقائيًا ضمن طلابك أنت فقط.</div>';
    }

    UI.openModal(
      '<div class="modal-header"><h3>' + (student ? 'تعديل بيانات الطالب' : 'إضافة طالب جديد') + '</h3></div>' +
      '<div class="modal-body">' +
        '<div class="form-grid">' +
          field('الاسم الكامل', 'sFullName', student ? student.FullName : '') +
          selectField('الصف', 'sGrade', grades, student ? student.Grade : '') +
          selectField('المجموعة', 'sGroup', groups, student ? student.Group : '') +
          field('اسم ولي الأمر', 'sParentName', student ? student.ParentName : '') +
          field('هاتف ولي الأمر', 'sParentPhone', student ? student.ParentPhone : '') +
          field('هاتف الطالب', 'sStudentPhone', student ? student.StudentPhone : '') +
        '</div>' +
        assignmentField +
        '<div class="field"><label>ملاحظات</label><textarea class="input" id="sNotes" rows="2">' + (student ? UI.escapeHtml(student.Notes) : '') + '</textarea></div>' +
      '</div>' +
      '<div class="modal-footer">' +
        '<button class="btn btn-ghost" onclick="UI.closeModal()">إلغاء</button>' +
        '<button class="btn btn-primary" id="saveStudentBtn">حفظ</button>' +
      '</div>'
    );

    document.getElementById('saveStudentBtn').addEventListener('click', async function () {
      const payload = {
        fullName: document.getElementById('sFullName').value.trim(),
        grade: document.getElementById('sGrade').value,
        group: document.getElementById('sGroup').value,
        parentName: document.getElementById('sParentName').value.trim(),
        parentPhone: document.getElementById('sParentPhone').value.trim(),
        studentPhone: document.getElementById('sStudentPhone').value.trim(),
        notes: document.getElementById('sNotes').value.trim()
      };
      if (isAdmin) {
        const assignedSelect = document.getElementById('sAssignedTeacher');
        if (assignedSelect) payload.assignedTeacher = assignedSelect.value;
      }
      if (!payload.fullName) { UI.toast('الاسم مطلوب', 'error'); return; }
      try {
        if (student) {
          payload.studentId = student.StudentID;
          await UI.withLoader(function () { return Api.call('updateStudent', payload); });
          UI.toast('تم تحديث بيانات الطالب', 'success');
        } else {
          await UI.withLoader(function () { return Api.call('addStudent', payload); });
          UI.toast('تمت إضافة الطالب بنجاح', 'success');
        }
        UI.closeModal();
        loadStudents();
      } catch (err) { UI.toast(err.message, 'error'); }
    });
  }

  function field(label, id, value) {
    return '<div class="field"><label>' + label + '</label><input class="input" id="' + id + '" value="' + UI.escapeHtml(value) + '"></div>';
  }
  function selectField(label, id, options, value) {
    return '<div class="field"><label>' + label + '</label><select class="input" id="' + id + '">' +
      options.map(function (o) { return '<option value="' + o + '" ' + (o === value ? 'selected' : '') + '>' + o + '</option>'; }).join('') +
      '</select></div>';
  }

  function edit(studentId) { openStudentForm(studentId); }

  async function remove(studentId) {
    const ok = await UI.confirmAction('هل أنت متأكد من حذف هذا الطالب؟ لا يمكن التراجع عن هذا الإجراء.');
    if (!ok) return;
    try {
      await UI.withLoader(function () { return Api.call('deleteStudent', { studentId: studentId }); });
      UI.toast('تم حذف الطالب', 'success');
      loadStudents();
    } catch (err) { UI.toast(err.message, 'error'); }
  }

  function handleImportFile(e) {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async function (evt) {
      const text = evt.target.result;
      const lines = text.split(/\r?\n/).filter(function (l) { return l.trim() !== ''; });
      if (lines.length < 2) { UI.toast('الملف فارغ أو غير صالح', 'error'); return; }
      const headers = parseCsvLine(lines[0]).map(function (h) { return h.trim().toLowerCase(); });
      const students = lines.slice(1).map(function (line) {
        const cols = parseCsvLine(line);
        const obj = {};
        headers.forEach(function (h, i) {
          const val = (cols[i] || '').trim();
          if (h.indexOf('name') !== -1 && h.indexOf('parent') === -1) obj.fullName = val;
          else if (h === 'grade') obj.grade = val;
          else if (h === 'group') obj.group = val;
          else if (h.indexOf('parentname') !== -1) obj.parentName = val;
          else if (h.indexOf('parentphone') !== -1) obj.parentPhone = val;
          else if (h.indexOf('studentphone') !== -1) obj.studentPhone = val;
          else if (h === 'notes') obj.notes = val;
        });
        return obj;
      }).filter(function (s) { return s.fullName; });

      try {
        const result = await UI.withLoader(function () { return Api.call('importStudents', { students: students }); });
        UI.toast('تم استيراد ' + result.imported + ' طالب بنجاح', 'success');
        loadStudents();
      } catch (err) { UI.toast(err.message, 'error'); }
    };
    reader.readAsText(file);
    e.target.value = '';
  }

  // Minimal quote-aware CSV line parser: handles values containing commas
  // (e.g. free-text notes) when wrapped in double quotes, and escaped ""
  // quotes inside a quoted field. A plain .split(',') would silently shift
  // every column after such a value.
  function parseCsvLine(line) {
    const result = [];
    let current = '';
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (inQuotes) {
        if (ch === '"' && line[i + 1] === '"') { current += '"'; i++; }
        else if (ch === '"') { inQuotes = false; }
        else { current += ch; }
      } else if (ch === '"') {
        inQuotes = true;
      } else if (ch === ',') {
        result.push(current);
        current = '';
      } else {
        current += ch;
      }
    }
    result.push(current);
    return result;
  }

  return { render, edit, remove };
})();

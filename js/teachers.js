/**
 * ============================================================================
 * TEACHERS — admin-only management of teacher/admin accounts.
 * ============================================================================
 */
const Teachers = (function () {
  let cache = [];

  function render(root) {
    root.innerHTML =
      '<div class="section-header">' +
        '<h2>إدارة المعلمين</h2>' +
        '<button class="btn btn-gold" id="addTeacherBtn"><i class="fa-solid fa-user-plus"></i> إضافة معلم</button>' +
      '</div>' +
      '<div class="card table-wrap"><div id="teachersTableHost"></div></div>';

    document.getElementById('addTeacherBtn').addEventListener('click', function () { openForm(null); });
    load();
  }

  async function load() {
    const host = document.getElementById('teachersTableHost');
    try {
      cache = await Api.call('getTeachers', {});
      if (!cache.length) { host.innerHTML = '<div class="empty-state"><i class="fa-solid fa-chalkboard-user"></i>لا يوجد معلمون بعد</div>'; return; }
      host.innerHTML =
        '<table class="data-table"><thead><tr><th>الاسم</th><th>اسم المستخدم</th><th>الدور</th><th>الحالة</th><th>إجراءات</th></tr></thead><tbody>' +
        cache.map(function (t) {
          const active = String(t.active).toUpperCase() !== 'FALSE';
          return '<tr>' +
            '<td>' + UI.escapeHtml(t.fullName) + '</td>' +
            '<td dir="ltr">' + UI.escapeHtml(t.username) + '</td>' +
            '<td>' + (t.role === 'admin' ? '<span class="badge badge-warn">مدير</span>' : '<span class="badge badge-muted">معلم</span>') + '</td>' +
            '<td>' + (active ? '<span class="badge badge-success">نشط</span>' : '<span class="badge badge-muted">موقوف</span>') + '</td>' +
            '<td><div class="row-actions">' +
              '<button title="تعديل" onclick="Teachers.edit(\'' + t.teacherId + '\')"><i class="fa-solid fa-pen"></i></button>' +
              '<button title="حذف" onclick="Teachers.remove(\'' + t.teacherId + '\')"><i class="fa-solid fa-trash"></i></button>' +
            '</div></td>' +
          '</tr>';
        }).join('') + '</tbody></table>';
    } catch (err) { UI.toast(err.message, 'error'); }
  }

  function openForm(teacherId) {
    const teacher = teacherId ? cache.filter(function (t) { return t.teacherId === teacherId; })[0] : null;
    UI.openModal(
      '<div class="modal-header"><h3>' + (teacher ? 'تعديل معلم' : 'إضافة معلم جديد') + '</h3></div>' +
      '<div class="modal-body">' +
        '<div class="field"><label>الاسم الكامل</label><input class="input" id="tFullName" value="' + (teacher ? UI.escapeHtml(teacher.fullName) : '') + '"></div>' +
        '<div class="field"><label>اسم المستخدم</label><input class="input" id="tUsername" dir="ltr" ' + (teacher ? 'disabled' : '') + ' value="' + (teacher ? UI.escapeHtml(teacher.username) : '') + '"></div>' +
        '<div class="field"><label>' + (teacher ? 'كلمة مرور جديدة (اختياري)' : 'كلمة المرور') + '</label><input type="password" class="input" id="tPassword"></div>' +
        '<div class="field"><label>الدور</label><select class="input" id="tRole">' +
          '<option value="teacher" ' + (teacher && teacher.role === 'teacher' ? 'selected' : '') + '>معلم</option>' +
          '<option value="admin" ' + (teacher && teacher.role === 'admin' ? 'selected' : '') + '>مدير</option>' +
        '</select></div>' +
      '</div>' +
      '<div class="modal-footer">' +
        '<button class="btn btn-ghost" onclick="UI.closeModal()">إلغاء</button>' +
        '<button class="btn btn-primary" id="saveTeacherBtn">حفظ</button>' +
      '</div>'
    );
    document.getElementById('saveTeacherBtn').addEventListener('click', async function () {
      const fullName = document.getElementById('tFullName').value.trim();
      const role = document.getElementById('tRole').value;
      const password = document.getElementById('tPassword').value;
      if (!fullName) { UI.toast('الاسم مطلوب', 'error'); return; }
      try {
        if (teacher) {
          await UI.withLoader(function () { return Api.call('updateTeacher', { teacherId: teacher.teacherId, fullName: fullName, role: role, password: password || undefined }); });
        } else {
          const username = document.getElementById('tUsername').value.trim();
          if (!username || !password) { UI.toast('اسم المستخدم وكلمة المرور مطلوبان', 'error'); return; }
          await UI.withLoader(function () { return Api.call('addTeacher', { fullName: fullName, username: username, password: password, role: role }); });
        }
        UI.toast('تم الحفظ بنجاح', 'success');
        UI.closeModal();
        load();
      } catch (err) { UI.toast(err.message, 'error'); }
    });
  }

  function edit(teacherId) { openForm(teacherId); }

  async function remove(teacherId) {
    const ok = await UI.confirmAction('هل تريد حذف حساب هذا المعلم؟');
    if (!ok) return;
    try {
      await UI.withLoader(function () { return Api.call('deleteTeacher', { teacherId: teacherId }); });
      UI.toast('تم الحذف', 'success');
      load();
    } catch (err) { UI.toast(err.message, 'error'); }
  }

  return { render, edit, remove };
})();

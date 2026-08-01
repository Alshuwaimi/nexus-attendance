/**
 * ============================================================================
 * UI — shared helpers used across all views: toasts, loader, modal, escaping.
 * ============================================================================
 */
const UI = (function () {

  function showLoader() { document.getElementById('loaderOverlay').classList.add('active'); }
  function hideLoader() { document.getElementById('loaderOverlay').classList.remove('active'); }

  function toast(message, type) {
    const host = document.getElementById('toastHost');
    const el = document.createElement('div');
    el.className = 'toast ' + (type || '');
    const icon = type === 'success' ? 'fa-circle-check' : type === 'error' ? 'fa-circle-exclamation' : type === 'warn' ? 'fa-triangle-exclamation' : 'fa-circle-info';
    el.innerHTML = '<i class="fa-solid ' + icon + '"></i><span>' + escapeHtml(message) + '</span>';
    host.appendChild(el);
    setTimeout(function () {
      el.style.opacity = '0';
      el.style.transition = 'opacity .3s ease';
      setTimeout(function () { el.remove(); }, 300);
    }, 3600);
  }

  function escapeHtml(str) {
    if (str === null || str === undefined) return '';
    return String(str)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  function openModal(html) {
    document.getElementById('modalBox').innerHTML = html;
    document.getElementById('modalOverlay').classList.add('active');
  }
  function closeModal() {
    document.getElementById('modalOverlay').classList.remove('active');
    document.getElementById('modalBox').innerHTML = '';
  }

  function statusBadge(status) {
    const map = {
      Present: '<span class="badge badge-success"><i class="fa-solid fa-circle-check"></i> حاضر</span>',
      Late: '<span class="badge badge-warn"><i class="fa-solid fa-clock"></i> متأخر</span>',
      Absent: '<span class="badge badge-danger"><i class="fa-solid fa-circle-xmark"></i> غائب</span>'
    };
    return map[status] || '<span class="badge badge-muted">' + escapeHtml(status) + '</span>';
  }

  async function withLoader(promiseFn) {
    showLoader();
    try {
      return await promiseFn();
    } finally {
      hideLoader();
    }
  }

  async function confirmAction(message) {
    return new Promise(function (resolve) {
      openModal(
        '<div class="modal-header"><h3>تأكيد الإجراء</h3></div>' +
        '<div class="modal-body">' + escapeHtml(message) + '</div>' +
        '<div class="modal-footer">' +
        '<button class="btn btn-ghost" id="confirmNo">إلغاء</button>' +
        '<button class="btn btn-danger" id="confirmYes">تأكيد</button>' +
        '</div>'
      );
      document.getElementById('confirmYes').onclick = function () { closeModal(); resolve(true); };
      document.getElementById('confirmNo').onclick = function () { closeModal(); resolve(false); };
    });
  }

  return { showLoader, hideLoader, toast, escapeHtml, openModal, closeModal, statusBadge, withLoader, confirmAction };
})();

document.getElementById('modalOverlay').addEventListener('click', function (e) {
  if (e.target === this) UI.closeModal();
});

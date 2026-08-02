/**
 * ============================================================================
 * SCANNER — QR attendance capture via the device camera (html5-qrcode).
 * ============================================================================
 */
const Scanner = (function () {
  let html5QrCode = null;
  let scanning = false;
  let isProcessing = false; // guards against html5-qrcode firing its success
                              // callback on every video frame while a code
                              // stays in view (was causing duplicate scans)
  let lastCode = null;
  let lastCodeAt = 0;
  const RESCAN_COOLDOWN_MS = 4000; // ignore the same code again for 4s

  function render(root) {
    isProcessing = false;
    lastCode = null;
    lastCodeAt = 0;
    root.innerHTML =
      '<div class="section-header"><h2>تسجيل الحضور عبر QR</h2></div>' +
      '<div class="scan-wrap">' +
        '<div class="card scan-card">' +
          '<div id="qr-reader"></div>' +
          '<button class="big-scan-btn" id="toggleScanBtn" style="margin-top:16px;"><i class="fa-solid fa-camera"></i> بدء المسح</button>' +
          '<div class="manual-entry">' +
            '<input class="input" id="manualQrInput" placeholder="أو أدخل رقم الطالب يدويًا (مثال: STU250731-1234)">' +
            '<button class="btn btn-primary" id="manualSubmitBtn">تسجيل</button>' +
          '</div>' +
        '</div>' +
        '<div class="card scan-result" id="scanResultBox">' +
          '<div class="result-icon"><i class="fa-solid fa-qrcode"></i></div>' +
          '<div style="font-weight:700;">جاهز للمسح</div>' +
          '<div class="text-muted" style="margin-top:6px;font-size:13px;">وجّه كاميرا الجهاز نحو كود QR الخاص بالطالب</div>' +
        '</div>' +
      '</div>';

    document.getElementById('toggleScanBtn').addEventListener('click', toggleScan);
    document.getElementById('manualSubmitBtn').addEventListener('click', function () {
      if (isProcessing) return; // avoid double-submit firing two requests
      const val = document.getElementById('manualQrInput').value.trim();
      if (val) { processCode(val); document.getElementById('manualQrInput').value = ''; }
    });
    document.getElementById('manualQrInput').addEventListener('keydown', function (e) {
      if (e.key === 'Enter') document.getElementById('manualSubmitBtn').click();
    });
  }

  function toggleScan() {
    if (scanning) stopScan(); else startScan();
  }

  function startScan() {
    const btn = document.getElementById('toggleScanBtn');
    html5QrCode = new Html5Qrcode('qr-reader');
    html5QrCode.start(
      { facingMode: 'environment' },
      { fps: 10, qrbox: { width: 240, height: 240 } },
      function (decodedText) {
        // html5-qrcode calls this on EVERY frame where the code is still
        // visible (can be several times per second). Without this guard,
        // holding a card in front of the camera fires several concurrent
        // "record attendance" requests, which is how duplicate attendance
        // rows for the same student/day happened before this fix.
        const now = Date.now();
        if (isProcessing) return;
        if (decodedText === lastCode && (now - lastCodeAt) < RESCAN_COOLDOWN_MS) return;
        lastCode = decodedText;
        lastCodeAt = now;
        processCode(decodedText);
      },
      function () { /* ignore per-frame scan errors */ }
    ).then(function () {
      scanning = true;
      btn.innerHTML = '<i class="fa-solid fa-stop"></i> إيقاف المسح';
    }).catch(function (err) {
      UI.toast('تعذر تشغيل الكاميرا: ' + err, 'error');
    });
  }

  function stopScan() {
    if (html5QrCode) {
      html5QrCode.stop().then(function () {
        html5QrCode.clear();
        scanning = false;
        document.getElementById('toggleScanBtn').innerHTML = '<i class="fa-solid fa-camera"></i> بدء المسح';
      }).catch(function () {});
    }
  }

  async function processCode(code) {
    isProcessing = true;
    const box = document.getElementById('scanResultBox');
    box.className = 'card scan-result';
    box.innerHTML = '<div class="spinner" style="border-top-color:var(--ink-700);"></div>';
    try {
      const result = await Api.call('recordAttendanceByQR', {
        qrValue: code,
        device: navigator.userAgent.substring(0, 60)
      });
      renderResult(result);
      if (result.status === 'SUCCESS') beep();
    } catch (err) {
      box.className = 'card scan-result error';
      box.innerHTML = '<div class="result-icon"><i class="fa-solid fa-circle-exclamation"></i></div>' +
        '<div style="font-weight:700;">تعذر تسجيل الحضور</div>' +
        '<div class="text-muted" style="margin-top:6px;font-size:13px;">' + UI.escapeHtml(err.message) + '</div>';
    } finally {
      isProcessing = false;
    }
  }

  function renderResult(result) {
    const box = document.getElementById('scanResultBox');
    if (result.status === 'SUCCESS') {
      box.className = 'card scan-result success';
      box.innerHTML = '<div class="result-icon"><i class="fa-solid fa-circle-check"></i></div>' +
        '<div style="font-weight:800;font-size:16px;">تم تسجيل الحضور بنجاح</div>' +
        '<div style="margin-top:8px;font-weight:700;">' + UI.escapeHtml(result.student.FullName) + '</div>' +
        '<div class="text-muted" style="font-size:13px;">' + UI.escapeHtml(result.student.Grade) + ' — ' + UI.escapeHtml(result.student.Group) + '</div>' +
        (result.attendanceStatus === 'Late' ? '<div class="badge badge-warn" style="margin-top:10px;">وصل متأخرًا</div>' : '');
    } else if (result.status === 'DUPLICATE') {
      box.className = 'card scan-result duplicate';
      box.innerHTML = '<div class="result-icon"><i class="fa-solid fa-triangle-exclamation"></i></div>' +
        '<div style="font-weight:800;">تم تسجيل الحضور مسبقًا اليوم</div>' +
        '<div class="text-muted" style="margin-top:6px;font-size:13px;">' + UI.escapeHtml(result.student ? result.student.FullName : '') + '</div>';
    } else if (result.status === 'FORBIDDEN') {
      box.className = 'card scan-result error';
      box.innerHTML = '<div class="result-icon"><i class="fa-solid fa-lock"></i></div>' +
        '<div style="font-weight:800;">هذا الطالب غير مسند إليك</div>' +
        '<div class="text-muted" style="margin-top:6px;font-size:13px;">راجع المدير لو ده خطأ في التوزيع</div>';
    } else {
      box.className = 'card scan-result error';
      box.innerHTML = '<div class="result-icon"><i class="fa-solid fa-circle-xmark"></i></div>' +
        '<div style="font-weight:800;">لم يتم العثور على الطالب</div>' +
        '<div class="text-muted" style="margin-top:6px;font-size:13px;">تأكد من صحة كود QR</div>';
    }
  }

  function beep() {
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      const osc = ctx.createOscillator();
      osc.type = 'sine'; osc.frequency.value = 880;
      osc.connect(ctx.destination);
      osc.start(); osc.stop(ctx.currentTime + 0.12);
    } catch (e) {}
  }

  function onLeave() { stopScan(); }

  return { render, onLeave };
})();

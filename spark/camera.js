/**
 * camera.js — CameraOverlay module v1
 * Features:
 *  • Photo + Video modes
 *  • Front / Back camera flip
 *  • Flash (torch) toggle
 *  • Pinch-to-zoom
 *  • Tap-to-focus
 *  • Preview + Confirm step
 *  • Uploads via Server.uploadCompressedImage / Server.uploadFile
 *  • onCapture(url, type) callback — 'image' | 'video'
 */

const CameraOverlay = (() => {

  let _stream    = null;
  let _recorder  = null;
  let _chunks    = [];
  let _facingMode = 'environment';
  let _mode      = 'photo';   // 'photo' | 'video'
  let _flashOn   = false;
  let _recording = false;
  let _recTimer  = null;
  let _recSecs   = 0;
  let _onCapture = null;
  let _el        = null;
  let _zoomLevel = 1;
  let _zoomTimer = null;

  /* ── Open ─────────────────────────────────────────────────── */
  const open = async (onCapture) => {
    if (_el) return;
    _onCapture = onCapture;
    _mode      = 'photo';
    _flashOn   = false;

    _el = document.createElement('div');
    _el.className = 'cam-overlay';
    _el.innerHTML = _html();
    document.body.appendChild(_el);

    _bindEvents();

    try {
      await _startStream();
    } catch (e) {
      _showError(e.message || 'Camera access denied. Please allow camera permission and try again.');
    }
  };

  /* ── Close ────────────────────────────────────────────────── */
  const close = () => {
    _stopStream();
    _el?.remove();
    _el = null;
    _onCapture = null;
    _recording = false;
    clearInterval(_recTimer);
  };

  /* ── HTML skeleton ────────────────────────────────────────── */
  const _html = () => `
    <div class="cam-viewfinder" id="cam-vf">
      <video class="cam-video mirrored" id="cam-vid" autoplay playsinline muted></video>
      <div class="cam-flash-overlay" id="cam-flash-overlay"></div>
      <div class="cam-focus-ring" id="cam-focus-ring"></div>
      <div class="cam-rec-dot" id="cam-rec-dot"></div>
      <div class="cam-rec-time" id="cam-rec-time">
        <span id="cam-rec-secs">0:00</span>
      </div>
      <div class="cam-countdown" id="cam-countdown"></div>
      <div class="cam-zoom-indicator" id="cam-zoom-ind">1×</div>

      <!-- Top bar -->
      <div class="cam-top-bar">
        <div class="cam-top-btn" id="cam-close-btn">
          <span class="material-icons-round">close</span>
        </div>
        <div class="cam-mode-tabs">
          <div class="cam-mode-tab active" data-mode="photo">PHOTO</div>
          <div class="cam-mode-tab"        data-mode="video">VIDEO</div>
        </div>
        <div class="cam-top-btn" id="cam-flash-btn">
          <span class="material-icons-round" id="cam-flash-icon">flash_off</span>
        </div>
      </div>
    </div>

    <!-- Bottom bar -->
    <div class="cam-bottom-bar">
      <div class="cam-side-btn" id="cam-gallery-btn" title="Gallery">
        <span class="material-icons-round">photo_library</span>
        <input type="file" id="cam-gallery-in" accept="image/*,video/*" style="display:none">
      </div>
      <div class="cam-shutter" id="cam-shutter">
        <div class="cam-shutter-inner"></div>
      </div>
      <div class="cam-side-btn" id="cam-flip-btn" title="Flip camera">
        <span class="material-icons-round">flip_camera_ios</span>
      </div>
    </div>

    <!-- Preview -->
    <div class="cam-preview" id="cam-preview">
      <img   id="cam-preview-img" class="cam-preview-media" style="display:none">
      <video id="cam-preview-vid" class="cam-preview-media" controls style="display:none"></video>
      <div class="cam-preview-bar">
        <div class="cam-preview-action" id="cam-retake-btn">
          <span class="material-icons-round">refresh</span>
          Retake
        </div>
        <button class="cam-use-btn" id="cam-use-btn">
          <span class="material-icons-round">send</span> Send
        </button>
      </div>
    </div>`;

  /* ── Start stream ─────────────────────────────────────────── */
  const _startStream = async () => {
    if (_stream) _stopStream();

    const constraints = {
      video: {
        facingMode: _facingMode,
        width:  { ideal: 1920 },
        height: { ideal: 1080 },
      },
      audio: true
    };

    _stream = await navigator.mediaDevices.getUserMedia(constraints);

    const vid = document.getElementById('cam-vid');
    if (!vid) return;
    vid.srcObject = _stream;
    vid.classList.toggle('mirrored', _facingMode === 'user');
    await vid.play().catch(() => {});
  };

  /* ── Stop stream ──────────────────────────────────────────── */
  const _stopStream = () => {
    _stream?.getTracks().forEach(t => t.stop());
    _stream = null;
  };

  /* ── Events ───────────────────────────────────────────────── */
  const _bindEvents = () => {
    // Close
    document.getElementById('cam-close-btn').onclick = close;

    // Mode tabs
    document.querySelectorAll('.cam-mode-tab').forEach(tab => {
      tab.onclick = () => {
        if (_recording) return;
        _mode = tab.dataset.mode;
        document.querySelectorAll('.cam-mode-tab').forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
      };
    });

    // Flash
    document.getElementById('cam-flash-btn').onclick = _toggleFlash;

    // Flip
    document.getElementById('cam-flip-btn').onclick = async () => {
      if (_recording) return;
      _facingMode = _facingMode === 'environment' ? 'user' : 'environment';
      try { await _startStream(); } catch {}
    };

    // Shutter
    document.getElementById('cam-shutter').onclick = _handleShutter;

    // Gallery fallback
    const galIn = document.getElementById('cam-gallery-in');
    document.getElementById('cam-gallery-btn').onclick = () => galIn.click();
    galIn.onchange = (e) => {
      const f = e.target.files[0];
      if (!f) return;
      e.target.value = '';
      _showPreview(URL.createObjectURL(f), f.type.startsWith('video') ? 'video' : 'image', f);
    };

    // Tap to focus
    document.getElementById('cam-vf').addEventListener('click', _handleTapFocus);

    // Pinch to zoom
    _bindPinchZoom();

    // Preview actions
    document.getElementById('cam-retake-btn').onclick = () => {
      document.getElementById('cam-preview').classList.remove('show');
    };
    document.getElementById('cam-use-btn').onclick = _handleUse;
  };

  /* ── Shutter ──────────────────────────────────────────────── */
  const _handleShutter = () => {
    if (_mode === 'photo') {
      _capturePhoto();
    } else {
      _recording ? _stopRecording() : _startRecording();
    }
  };

  /* ── Photo capture ────────────────────────────────────────── */
  const _capturePhoto = () => {
    const vid = document.getElementById('cam-vid');
    if (!vid) return;

    // Flash effect
    const fo = document.getElementById('cam-flash-overlay');
    fo.classList.remove('flash');
    requestAnimationFrame(() => fo.classList.add('flash'));

    const canvas  = document.createElement('canvas');
    canvas.width  = vid.videoWidth;
    canvas.height = vid.videoHeight;
    const ctx = canvas.getContext('2d');

    if (_facingMode === 'user') {
      ctx.translate(canvas.width, 0);
      ctx.scale(-1, 1);
    }
    ctx.drawImage(vid, 0, 0);

    canvas.toBlob(blob => {
      if (!blob) return;
      const url = URL.createObjectURL(blob);
      _showPreview(url, 'image', blob);
    }, 'image/jpeg', 0.92);
  };

  /* ── Video recording ──────────────────────────────────────── */
  const _startRecording = () => {
    if (!_stream) return;
    _chunks = [];
    _recSecs = 0;

    const mimeType = MediaRecorder.isTypeSupported('video/webm;codecs=vp9')
      ? 'video/webm;codecs=vp9' : 'video/webm';

    _recorder = new MediaRecorder(_stream, { mimeType });
    _recorder.ondataavailable = e => { if (e.data.size > 0) _chunks.push(e.data); };
    _recorder.onstop = () => {
      const blob = new Blob(_chunks, { type: 'video/webm' });
      const url  = URL.createObjectURL(blob);
      _showPreview(url, 'video', blob);
    };
    _recorder.start(100);
    _recording = true;

    const shutter = document.getElementById('cam-shutter');
    shutter?.classList.add('recording');
    document.getElementById('cam-rec-dot')?.classList.add('show');
    document.getElementById('cam-rec-time')?.classList.add('show');

    _recTimer = setInterval(() => {
      _recSecs++;
      const m = Math.floor(_recSecs / 60);
      const s = String(_recSecs % 60).padStart(2, '0');
      const el = document.getElementById('cam-rec-secs');
      if (el) el.textContent = `${m}:${s}`;
    }, 1000);
  };

  const _stopRecording = () => {
    clearInterval(_recTimer);
    _recorder?.stop();
    _recording = false;
    document.getElementById('cam-shutter')?.classList.remove('recording');
    document.getElementById('cam-rec-dot')?.classList.remove('show');
    document.getElementById('cam-rec-time')?.classList.remove('show');
  };

  /* ── Preview ──────────────────────────────────────────────── */
  let _previewBlob = null;
  let _previewType = 'image';

  const _showPreview = (url, type, blob) => {
    _previewBlob = blob;
    _previewType = type;

    const preview = document.getElementById('cam-preview');
    const img     = document.getElementById('cam-preview-img');
    const vid     = document.getElementById('cam-preview-vid');

    if (type === 'image') {
      img.src = url; img.style.display = 'block';
      vid.style.display = 'none';
    } else {
      vid.src = url; vid.style.display = 'block';
      img.style.display = 'none';
    }

    preview.classList.add('show');
  };

  /* ── Use / upload ─────────────────────────────────────────── */
  const _handleUse = async () => {
    if (!_previewBlob || !_onCapture) return;

    const btn = document.getElementById('cam-use-btn');
    if (btn) btn.innerHTML = '<div class="spinner" style="width:20px;height:20px;border-width:2px;border-top-color:#fff"></div>';

    try {
      let url;
      if (_previewType === 'image') {
        const file = _previewBlob instanceof File ? _previewBlob : new File([_previewBlob], 'camera.jpg', { type: 'image/jpeg' });
        url = await Server.uploadCompressedImage(file, 'spark_chat_imgs');
      } else {
        const file = _previewBlob instanceof File ? _previewBlob : new File([_previewBlob], 'video.webm', { type: 'video/webm' });
        const result = await Server.uploadFile(file, 'spark_chat_videos');
        url = result?.url;
      }

      if (url) {
        _onCapture(url, _previewType);
        close();
      } else {
        throw new Error('Upload failed');
      }
    } catch {
      App.showToast('Upload failed', 'error');
      if (btn) btn.innerHTML = '<span class="material-icons-round">send</span> Send';
    }
  };

  /* ── Flash ────────────────────────────────────────────────── */
  const _toggleFlash = async () => {
    _flashOn = !_flashOn;
    const icon = document.getElementById('cam-flash-icon');
    if (icon) icon.textContent = _flashOn ? 'flash_on' : 'flash_off';
    const track = _stream?.getVideoTracks()[0];
    if (track) {
      const caps = track.getCapabilities?.() || {};
      if (caps.torch) {
        await track.applyConstraints({ advanced: [{ torch: _flashOn }] }).catch(() => {});
      }
    }
  };

  /* ── Tap-to-focus ─────────────────────────────────────────── */
  const _handleTapFocus = (e) => {
    const ring = document.getElementById('cam-focus-ring');
    if (!ring) return;
    const rect = e.currentTarget.getBoundingClientRect();
    ring.style.left = (e.clientX - rect.left) + 'px';
    ring.style.top  = (e.clientY - rect.top)  + 'px';
    ring.classList.add('show');
    setTimeout(() => ring.classList.remove('show'), 800);
  };

  /* ── Pinch zoom ───────────────────────────────────────────── */
  const _bindPinchZoom = () => {
    const vf = document.getElementById('cam-vf');
    if (!vf) return;

    let initDist = 0;
    let initZoom = 1;

    vf.addEventListener('touchstart', e => {
      if (e.touches.length === 2) {
        initDist = Math.hypot(
          e.touches[0].clientX - e.touches[1].clientX,
          e.touches[0].clientY - e.touches[1].clientY
        );
        initZoom = _zoomLevel;
      }
    }, { passive: true });

    vf.addEventListener('touchmove', e => {
      if (e.touches.length !== 2) return;
      const dist = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      );
      const zoom = Math.min(Math.max(initZoom * (dist / initDist), 1), 5);
      _setZoom(zoom);
    }, { passive: true });
  };

  const _setZoom = async (zoom) => {
    _zoomLevel = Math.round(zoom * 10) / 10;
    const track = _stream?.getVideoTracks()[0];
    if (track) {
      const caps = track.getCapabilities?.() || {};
      if (caps.zoom) {
        const clamped = Math.min(Math.max(_zoomLevel, caps.zoom.min || 1), caps.zoom.max || 5);
        await track.applyConstraints({ advanced: [{ zoom: clamped }] }).catch(() => {});
      }
    }
    const ind = document.getElementById('cam-zoom-ind');
    if (ind) {
      ind.textContent = `${_zoomLevel}×`;
      ind.classList.add('show');
      clearTimeout(_zoomTimer);
      _zoomTimer = setTimeout(() => ind.classList.remove('show'), 1500);
    }
  };

  /* ── Error state ──────────────────────────────────────────── */
  const _showError = (msg) => {
    const vf = document.getElementById('cam-vf');
    if (!vf) return;
    vf.innerHTML = `
      <div class="cam-error">
        <span class="material-icons-round">no_photography</span>
        <h3 style="color:#fff;font-size:18px;font-weight:700">Camera unavailable</h3>
        <p>${msg}</p>
      </div>`;
  };

  return { open, close };
})();

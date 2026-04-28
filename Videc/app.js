/**
 * COMPRESS — Browser-native Video Compressor
 * Uses FFmpeg.wasm for in-browser compression
 * No upload, no server — 100% local processing
 *
 * MODES:
 *  • Auto  — analyses your video and picks optimal settings automatically
 *  • Manual — you choose bitrate, codec, resolution, fps, audio
 */

'use strict';

// ── FFmpeg globals — resolved lazily inside ensureFFmpeg() ─
let createFFmpeg = null;
let fetchFile    = null;

// ── App State ──────────────────────────────────────────────
const State = { IDLE: 'idle', LOADING: 'loading', PROCESSING: 'processing', DONE: 'done', ERROR: 'error' };
let currentState = State.IDLE;
let ffmpeg       = null;
let ffmpegLoaded = false;
let currentFile  = null;
let outputUrl    = null;
let videoDurSec  = 0;   // real duration for progress %
let lastPct      = 0;   // last reported progress %

// ── Active mode: 'auto' | 'manual' ────────────────────────
let activeMode = localStorage.getItem('compress-mode') || 'auto';

// ── Manual settings (mirrors the UI controls) ─────────────
const manualDefaults = {
  compressionMethod: 'crf',   // crf | bitrate | filesize | percentage
  crfValue:          '23',
  videoBitrate:      '2500k',
  targetFilesize:    '10',    // MB
  targetPercentage:  '60',    // quality %
  videoCodec:        'libx264',
  audioCodec:        'aac',
  audioBitrate:      '128k',
  frameRate:         '30',
  resolution:        'original', // original | 1920x1080 | 1280x720 | 854x480
};
let manualSettings = { ...manualDefaults };

// ── DOM References ─────────────────────────────────────────
const $ = id => document.getElementById(id);
const el = {
  // States
  stateIdle:       $('state-idle'),
  stateLoading:    $('state-loading'),
  stateProcessing: $('state-processing'),
  stateDone:       $('state-done'),
  stateError:      $('state-error'),
  // Drop zone
  dropZone:        $('drop-zone'),
  fileInput:       $('file-input'),
  // Mode buttons
  btnAuto:         $('btn-auto'),
  btnManual:       $('btn-manual'),
  manualPanel:     $('manual-panel'),
  modeDesc:        $('mode-desc'),
  // Manual controls
  ctrlMethod:      $('ctrl-method'),
  ctrlCrf:         $('ctrl-crf'),
  ctrlBitrate:     $('ctrl-bitrate'),
  ctrlFilesize:    $('ctrl-filesize'),
  ctrlPercentage:  $('ctrl-percentage'),
  selCrf:          $('sel-crf'),
  selBitrateV:     $('sel-bitrate-v'),
  selFilesize:     $('sel-filesize'),
  selPercentage:   $('sel-percentage'),
  selCodecV:       $('sel-codec-v'),
  selCodecA:       $('sel-codec-a'),
  selBitrateA:     $('sel-bitrate-a'),
  selFps:          $('sel-fps'),
  selRes:          $('sel-res'),
  // Loading
  loadingSub:      $('loading-sub'),
  // Processing
  procFilename:    $('proc-filename'),
  procModeBadge:   $('proc-mode-badge'),
  progressFill:    $('progress-fill'),
  progressPct:     $('progress-pct'),
  procStage:       $('proc-stage'),
  procSpeed:       $('proc-speed'),
  origSize:        $('orig-size'),
  estSize:         $('est-size'),
  // Done
  successIcon:     $('success-icon'),
  savingsPct:      $('savings-pct'),
  resultBefore:    $('result-before'),
  resultAfter:     $('result-after'),
  downloadBtn:     $('download-btn'),
  downloadSize:    $('download-size'),
  // Error
  errorMsg:        $('error-msg'),
  coiToast:        $('coi-toast'),
};

// ══════════════════════════════════════════════════════════
//  INITIALISATION
// ══════════════════════════════════════════════════════════

function init() {
  setupDropZone();
  setupFileInput();
  setupModeButtons();
  setupManualPanel();
  applyMode(activeMode);
  checkCOI();
}

function checkCOI() {
  if (window.__coiFailed) el.coiToast.hidden = false;
}

// ══════════════════════════════════════════════════════════
//  MODE TOGGLE
// ══════════════════════════════════════════════════════════

function setupModeButtons() {
  el.btnAuto.addEventListener('click', () => switchMode('auto'));
  el.btnManual.addEventListener('click', () => switchMode('manual'));
}

function switchMode(m) {
  activeMode = m;
  localStorage.setItem('compress-mode', m);
  applyMode(m);
}

function applyMode(m) {
  el.btnAuto.classList.toggle('active', m === 'auto');
  el.btnManual.classList.toggle('active', m === 'manual');
  el.manualPanel.hidden = (m !== 'manual');
  el.modeDesc.textContent = m === 'auto'
    ? 'Analyzes your video and picks the best settings automatically'
    : 'You control every setting — full manual override';
}

// Expose for inline onclick fallback
window.switchMode = switchMode;

// ══════════════════════════════════════════════════════════
//  MANUAL PANEL
// ══════════════════════════════════════════════════════════

function setupManualPanel() {
  // Compression method toggle — show relevant sub-control
  el.ctrlMethod.addEventListener('change', () => {
    manualSettings.compressionMethod = el.ctrlMethod.value;
    showMethodControl(el.ctrlMethod.value);
  });

  // Sync all other selects into manualSettings
  const bindings = [
    [el.selCrf,       'crfValue'],
    [el.selBitrateV,  'videoBitrate'],
    [el.selFilesize,  'targetFilesize'],
    [el.selPercentage,'targetPercentage'],
    [el.selCodecV,    'videoCodec'],
    [el.selCodecA,    'audioCodec'],
    [el.selBitrateA,  'audioBitrate'],
    [el.selFps,       'frameRate'],
    [el.selRes,       'resolution'],
  ];
  bindings.forEach(([sel, key]) => {
    if (!sel) return;
    sel.value = manualSettings[key]; // restore saved value
    sel.addEventListener('change', () => { manualSettings[key] = sel.value; });
  });

  showMethodControl(manualSettings.compressionMethod);
}

function showMethodControl(method) {
  el.ctrlCrf.hidden        = method !== 'crf';
  el.ctrlBitrate.hidden    = method !== 'bitrate';
  el.ctrlFilesize.hidden   = method !== 'filesize';
  el.ctrlPercentage.hidden = method !== 'percentage';
}

// ══════════════════════════════════════════════════════════
//  DROP ZONE
// ══════════════════════════════════════════════════════════

function setupDropZone() {
  const zone = el.dropZone;

  zone.addEventListener('dragover', e => {
    e.preventDefault();
    zone.classList.add('drag-over');
  });

  zone.addEventListener('dragleave', e => {
    if (!zone.contains(e.relatedTarget)) zone.classList.remove('drag-over');
  });

  zone.addEventListener('drop', e => {
    e.preventDefault();
    zone.classList.remove('drag-over');
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  });

  zone.addEventListener('click', () => el.fileInput.click());
}

function setupFileInput() {
  el.fileInput.addEventListener('change', e => {
    const file = e.target.files[0];
    if (file) handleFile(file);
    e.target.value = ''; // reset so same file can be re-selected
  });
}

// ══════════════════════════════════════════════════════════
//  FILE HANDLING
// ══════════════════════════════════════════════════════════

async function handleFile(file) {
  if (!file.type.startsWith('video/') && !isVideoByExtension(file.name)) {
    showError('Please drop a video file (MP4, MOV, AVI, MKV, WebM, etc.)');
    return;
  }

  currentFile = file;
  lastRatio = 0;

  setState(State.LOADING);
  el.loadingSub.textContent = 'Downloading FFmpeg engine (~30 MB, once only)';

  try {
    await ensureFFmpeg();
    await compress(file);
  } catch (err) {
    console.error('[Compress]', err);
    showError(
      err.message.includes('SharedArrayBuffer')
        ? 'SharedArrayBuffer not available. Please run via http://localhost (see instructions below).'
        : `Compression failed: ${err.message}`
    );
  }
}

function isVideoByExtension(name) {
  return /\.(mp4|mov|avi|mkv|webm|wmv|flv|m4v|3gp|ts|mts|m2ts|ogv|vob|mpg|mpeg)$/i.test(name);
}

// ══════════════════════════════════════════════════════════
//  FFMPEG LOADER
// ══════════════════════════════════════════════════════════

async function ensureFFmpeg() {
  if (ffmpegLoaded) return;

  if (!createFFmpeg) {
    if (typeof window.FFmpeg === 'undefined') {
      throw new Error('FFmpeg library failed to load. Check your internet connection and refresh.');
    }
    createFFmpeg = window.FFmpeg.createFFmpeg;
    fetchFile    = window.FFmpeg.fetchFile;
  }

  ffmpeg = createFFmpeg({
    corePath: 'https://unpkg.com/@ffmpeg/core@0.11.0/dist/ffmpeg-core.js',
    log: false,
  });

  // ── THE KEY FIX ────────────────────────────────────────
  // setProgress({ratio}) is BROKEN in ffmpeg.wasm 0.11 for most formats
  // (ratio stays near 0 the entire time — that's why you saw 3% for an hour).
  // We parse real progress from FFmpeg's stderr time= output instead.
  ffmpeg.setLogger(({ type, message }) => {
    if (type === 'fferr' || type === 'ffout') {
      parseFFmpegLog(message);
    }
  });

  await ffmpeg.load();
  ffmpegLoaded = true;
}

// Parse "time=00:01:23.45" from FFmpeg stderr — the only reliable progress source
function parseFFmpegLog(line) {
  // e.g. "frame=  240 fps= 18 q=28.0 size=    512kB time=00:00:08.00 bitrate= 524kbits/s speed=0.6x"
  const tm = line.match(/time=(\d+):(\d+):(\d+)\.(\d+)/);
  if (tm && videoDurSec > 0) {
    const elapsed = parseInt(tm[1]) * 3600 + parseInt(tm[2]) * 60 + parseInt(tm[3]) + parseInt(tm[4]) / 100;
    const pct = Math.min(95, Math.round((elapsed / videoDurSec) * 95));
    if (pct > lastPct) {
      lastPct = pct;
      updateProgress(pct, pct < 10 ? 'Starting encoder...' : pct < 90 ? 'Compressing...' : 'Almost done...');
    }
    // Live speed display
    const sp = line.match(/speed=\s*([\d.]+)x/);
    if (sp && el.procSpeed) {
      const spd = parseFloat(sp[1]);
      const rem = spd > 0 ? (videoDurSec - elapsed) / spd : 0;
      el.procSpeed.textContent = spd > 0
        ? `${sp[1]}× speed · ~${formatTime(rem)} left`
        : `${sp[1]}× speed`;
    }
  } else if (tm) {
    // No duration — bump slowly so bar isn't frozen
    const bump = Math.min(lastPct + 1, 85);
    if (bump > lastPct) { lastPct = bump; updateProgress(bump, 'Compressing...'); }
  }
}

function formatTime(sec) {
  if (!isFinite(sec) || sec <= 0) return '…';
  if (sec < 60) return `${Math.ceil(sec)}s`;
  return `${Math.floor(sec / 60)}m ${Math.ceil(sec % 60)}s`;
}

// ══════════════════════════════════════════════════════════
//  SMART AUTO-SETTINGS
// ══════════════════════════════════════════════════════════

/**
 * Analyze the video file and compute optimal FFmpeg settings.
 * The goal is max size reduction while keeping perceptual quality good.
 */
async function analyzeVideo(file) {
  return new Promise(resolve => {
    const video = document.createElement('video');
    video.preload = 'metadata';
    video.muted = true;
    const url = URL.createObjectURL(file);
    video.src = url;

    const cleanup = () => URL.revokeObjectURL(url);

    video.onloadedmetadata = () => {
      const { videoWidth: w, videoHeight: h, duration } = video;
      cleanup();
      resolve({ width: w || 1920, height: h || 1080, duration: duration || 60 });
    };

    video.onerror = () => {
      cleanup();
      resolve({ width: 1920, height: 1080, duration: 60 });
    };

    setTimeout(() => { cleanup(); resolve({ width: 1920, height: 1080, duration: 60 }); }, 5000);
  });
}

/**
 * Compute CRF, scale filter, and audio settings from file metadata.
 *
 * Strategy:
 *  - Use CRF encoding (constant quality) — better than bitrate targeting for unknowns
 *  - Scale 4K/2K content down to 1080p (major savings, barely noticeable at screen size)
 *  - Adjust CRF up/down based on input bitrate (already-compressed vs raw)
 *  - Rip all metadata, strip non-primary streams
 */
function computeAutoSettings(file, { width, height, duration }) {
  const pixels = (width || 1920) * (height || 1080);
  const fileSizeBits = file.size * 8;
  const inputBitrateMbps = fileSizeBits / ((duration || 60) * 1_000_000);

  // Base CRF by resolution (H.264 scale: 0=lossless, 51=trash, 23=default)
  let crf;
  let scaleFilter = null;

  if (pixels >= 3840 * 2160) {         // 4K
    crf = 27;
    scaleFilter = 'scale=1920:-2:flags=lanczos';
  } else if (pixels >= 2560 * 1440) {  // 2K / 1440p
    crf = 26;
    scaleFilter = 'scale=1920:-2:flags=lanczos';
  } else if (pixels >= 1920 * 1080) {  // 1080p
    crf = 24;
    // keep resolution
  } else if (pixels >= 1280 * 720) {   // 720p
    crf = 23;
  } else if (pixels >= 854 * 480) {    // 480p
    crf = 22;
  } else {                              // lower res
    crf = 21;
  }

  // ── Bitrate-based adjustment ───────────────────────────
  // Very high bitrate (raw/screen-recorded) → can compress aggressively
  if (inputBitrateMbps > 30) {
    crf = Math.min(crf + 3, 32);
  } else if (inputBitrateMbps > 15) {
    crf = Math.min(crf + 2, 30);
  } else if (inputBitrateMbps > 8) {
    crf = Math.min(crf + 1, 28);
  }
  // Already tightly compressed → be gentle to avoid quality loss
  else if (inputBitrateMbps < 0.8) {
    crf = Math.max(crf - 3, 18);
  } else if (inputBitrateMbps < 2) {
    crf = Math.max(crf - 2, 19);
  } else if (inputBitrateMbps < 4) {
    crf = Math.max(crf - 1, 20);
  }

  // Audio: 128 kbps AAC is transparent for most content
  // Drop to 96 for very small inputs to save more
  const audioBitrate = inputBitrateMbps < 1.5 ? '96k' : '128k';

  return { crf: crf.toString(), scaleFilter, audioBitrate };
}

// ══════════════════════════════════════════════════════════
//  COMPRESSION
// ══════════════════════════════════════════════════════════

async function compress(file) {
  setState(State.PROCESSING);
  lastPct = 0;
  el.procFilename.textContent = file.name;
  el.origSize.textContent     = formatBytes(file.size);
  el.estSize.textContent      = '—';
  if (el.procSpeed) el.procSpeed.textContent = '';
  if (el.procModeBadge) el.procModeBadge.textContent = activeMode === 'auto' ? '⚡ Auto mode' : '⚙ Manual mode';

  updateProgress(1, 'Reading video info...');

  // Get real duration for accurate progress %
  const meta = await analyzeVideo(file);
  videoDurSec = meta.duration || 0;

  const ext       = getExtension(file.name);
  const inputName = `input.${ext}`;

  updateProgress(3, 'Loading file into memory...');
  ffmpeg.FS('writeFile', inputName, await fetchFile(file));

  // Build FFmpeg args based on mode
  let args;
  if (activeMode === 'auto') {
    const autoSettings = computeAutoSettings(file, meta);
    args = buildAutoArgs(inputName, autoSettings);
  } else {
    args = buildManualArgs(inputName, meta);
  }

  console.info('[Compress] Mode:', activeMode, '| Args:', args.join(' '));
  updateProgress(5, 'Starting encoder...');

  await ffmpeg.run(...args);

  updateProgress(97, 'Reading output...');

  let outputData;
  try {
    outputData = ffmpeg.FS('readFile', 'output.mp4');
  } catch (e) {
    throw new Error('FFmpeg produced no output. The video format may be unsupported — try converting to MP4 first.');
  }

  try { ffmpeg.FS('unlink', inputName);   } catch (_) {}
  try { ffmpeg.FS('unlink', 'output.mp4'); } catch (_) {}

  if (outputUrl) URL.revokeObjectURL(outputUrl);
  outputUrl = URL.createObjectURL(new Blob([outputData.buffer], { type: 'video/mp4' }));

  updateProgress(100, 'Done!');
  await sleep(350);
  showResults(file.size, outputData.length);
}

// ── SHARED common tail args (metadata strip + mapping) ────
function commonTailArgs() {
  return [
    '-map_metadata', '-1',   // strip ALL metadata (GPS, author, camera etc.)
    '-map_chapters', '-1',   // strip chapter markers
    '-map', '0:v:0',         // primary video stream only
    '-map', '0:a?',          // all audio if present (? = don't error if none)
    '-movflags', '+faststart',
    '-avoid_negative_ts', 'make_zero',
    'output.mp4',
  ];
}

// ── AUTO mode: fast ultrafast preset, CRF from analysis ───
function buildAutoArgs(inputName, { crf, scaleFilter, audioBitrate }) {
  const args = [
    '-i', inputName,
    '-c:v', 'libx264',
    '-crf', crf,
    '-preset', 'ultrafast',   // fastest WASM encode — key fix for speed
    '-pix_fmt', 'yuv420p',
  ];
  if (scaleFilter) args.push('-vf', scaleFilter);
  args.push(
    '-c:a', 'aac',
    '-b:a', audioBitrate,
    '-ar', '44100',
    '-ac', '2',
    ...commonTailArgs()
  );
  return args;
}

// ── MANUAL mode: user's exact settings ────────────────────
function buildManualArgs(inputName, meta) {
  const s = manualSettings;

  // Video codec
  const vcodec = s.videoCodec; // libx264 | libx265

  // Quality argument
  let qualArgs = [];
  switch (s.compressionMethod) {
    case 'crf':
      qualArgs = ['-crf', s.crfValue, '-preset', 'fast'];
      break;
    case 'bitrate':
      qualArgs = ['-b:v', s.videoBitrate, '-preset', 'fast'];
      break;
    case 'filesize': {
      // target-size bitrate = (filesize_bits) / duration  — minus audio
      const durS   = meta.duration || 60;
      const tBits  = parseFloat(s.targetFilesize) * 1024 * 1024 * 8;
      const aBps   = parseInt(s.audioBitrate) * 1000;
      const vBps   = Math.max(100000, Math.round((tBits / durS) - aBps));
      qualArgs = ['-b:v', `${Math.round(vBps/1000)}k`, '-preset', 'fast'];
      break;
    }
    case 'percentage': {
      // Map quality% → CRF (100%=18, 1%=51)
      const crf = Math.round(51 - (parseInt(s.targetPercentage) / 100) * 33);
      qualArgs = ['-crf', String(crf), '-preset', 'fast'];
      break;
    }
    default:
      qualArgs = ['-crf', '23', '-preset', 'fast'];
  }

  // Resolution filter
  let vfArgs = [];
  if (s.resolution && s.resolution !== 'original') {
    const [rw] = s.resolution.split('x');
    vfArgs = ['-vf', `scale=${rw}:-2:flags=lanczos`];
  }

  // Frame rate
  const fpsArgs = s.frameRate !== 'original' ? ['-r', s.frameRate] : [];

  // Audio
  const aArgs = [
    '-c:a', s.audioCodec === 'mp3' ? 'libmp3lame' : 'aac',
    '-b:a', s.audioBitrate,
    '-ar', '44100',
    '-ac', '2',
  ];

  return [
    '-i', inputName,
    '-c:v', vcodec,
    ...qualArgs,
    '-pix_fmt', 'yuv420p',
    ...vfArgs,
    ...fpsArgs,
    ...aArgs,
    ...commonTailArgs()
  ];
}

// ══════════════════════════════════════════════════════════
//  UI HELPERS
// ══════════════════════════════════════════════════════════

function setState(next) {
  currentState = next;
  const stateMap = {
    [State.IDLE]:       el.stateIdle,
    [State.LOADING]:    el.stateLoading,
    [State.PROCESSING]: el.stateProcessing,
    [State.DONE]:       el.stateDone,
    [State.ERROR]:      el.stateError,
  };
  Object.values(stateMap).forEach(s => { if(s) s.hidden = true; });
  const target = stateMap[next];
  if (target) target.hidden = false;
}

function updateProgress(pct, stage) {
  pct = Math.max(0, Math.min(100, pct));
  el.progressFill.style.width = pct + '%';
  el.progressPct.textContent  = pct + '%';
  if (stage) el.procStage.textContent = stage;
  // Rough size estimate: auto saves ~50%, manual varies
  if (currentFile && pct > 8 && pct < 96) {
    const targetRatio = activeMode === 'auto' ? 0.45 : 0.60;
    const estimated = currentFile.size * targetRatio;
    el.estSize.textContent = '~' + formatBytes(estimated);
  }
}

function showResults(inputSize, outputSize) {
  setState(State.DONE);

  const savings = Math.max(0, Math.round((1 - outputSize / inputSize) * 100));
  el.savingsPct.textContent = `${savings}%`;
  el.resultBefore.textContent = formatBytes(inputSize);
  el.resultAfter.textContent = formatBytes(outputSize);

  el.downloadBtn.href = outputUrl;
  el.downloadBtn.download = buildOutputName(currentFile.name);
  el.downloadSize.textContent = `(${formatBytes(outputSize)})`;
}

function showError(msg) {
  setState(State.ERROR);
  el.errorMsg.textContent = msg;
}

// ══════════════════════════════════════════════════════════
//  PUBLIC: Reset App
// ══════════════════════════════════════════════════════════

function resetApp() {
  if (outputUrl) { URL.revokeObjectURL(outputUrl); outputUrl = null; }
  currentFile = null;
  lastPct     = 0;
  videoDurSec = 0;
  setState(State.IDLE);
  el.progressFill.style.width = '0%';
  el.progressPct.textContent  = '0%';
  el.procStage.textContent    = 'Analyzing...';
  el.origSize.textContent     = '—';
  el.estSize.textContent      = '—';
  if (el.procSpeed) el.procSpeed.textContent = '';
}

// ══════════════════════════════════════════════════════════
//  UTILITIES
// ══════════════════════════════════════════════════════════

function formatBytes(bytes) {
  if (bytes === 0 || !bytes) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  const val = bytes / Math.pow(k, i);
  return `${val < 10 ? val.toFixed(1) : Math.round(val)} ${sizes[i]}`;
}

function getExtension(filename) {
  return filename.split('.').pop().toLowerCase() || 'mp4';
}

function buildOutputName(originalName) {
  const dot = originalName.lastIndexOf('.');
  const base = dot > 0 ? originalName.slice(0, dot) : originalName;
  return `${base}_compressed.mp4`;
}

function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

// ══════════════════════════════════════════════════════════
//  BOOT
// ══════════════════════════════════════════════════════════

document.addEventListener('DOMContentLoaded', init);

// Also expose resetApp globally for inline onclick
window.resetApp = resetApp;
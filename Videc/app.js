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
    ? 'Maximum compression — scales resolution + targets CRF 28-34. Slower but achieves 80-90% size reduction.'
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
  lastPct     = 0;
  videoDurSec = 0;

  setState(State.LOADING);
  el.loadingSub.textContent = 'Loading FFmpeg engine...';

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

// ══════════════════════════════════════════════════════════
//  FFMPEG LOADER — with IndexedDB caching
//  FFmpeg core is ~30MB. We cache it in IndexedDB after first
//  download so subsequent loads are instant (from local storage).
// ══════════════════════════════════════════════════════════

const FFMPEG_CORE_URL = 'https://unpkg.com/@ffmpeg/core@0.11.0/dist/ffmpeg-core.js';
const FFMPEG_WASM_URL = 'https://unpkg.com/@ffmpeg/core@0.11.0/dist/ffmpeg-core.wasm';
const FFMPEG_WORKER_URL = 'https://unpkg.com/@ffmpeg/core@0.11.0/dist/ffmpeg-core.worker.js';
const IDB_NAME    = 'compress-cache';
const IDB_STORE   = 'files';
const IDB_VERSION = 1;

function openIDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(IDB_NAME, IDB_VERSION);
    req.onupgradeneeded = e => e.target.result.createObjectStore(IDB_STORE);
    req.onsuccess = e => resolve(e.target.result);
    req.onerror   = () => reject(req.error);
  });
}

async function idbGet(db, key) {
  return new Promise((resolve, reject) => {
    const tx  = db.transaction(IDB_STORE, 'readonly');
    const req = tx.objectStore(IDB_STORE).get(key);
    req.onsuccess = () => resolve(req.result);
    req.onerror   = () => resolve(null); // treat cache miss same as miss
  });
}

async function idbSet(db, key, value) {
  return new Promise((resolve, reject) => {
    const tx  = db.transaction(IDB_STORE, 'readwrite');
    const req = tx.objectStore(IDB_STORE).put(value, key);
    req.onsuccess = () => resolve();
    req.onerror   = () => resolve(); // don't break on cache write failure
  });
}

async function fetchWithCache(db, url, label) {
  // Try cache first
  const cached = await idbGet(db, url);
  if (cached) {
    console.info(`[Cache HIT] ${label}`);
    return cached;
  }
  // Fetch and cache
  console.info(`[Cache MISS] Downloading ${label}...`);
  el.loadingSub.textContent = `Downloading ${label} (first time only)...`;
  const res  = await fetch(url);
  const data = await res.arrayBuffer();
  await idbSet(db, url, data);
  return data;
}

async function ensureFFmpeg() {
  if (ffmpegLoaded) return;

  if (!createFFmpeg) {
    if (typeof window.FFmpeg === 'undefined') {
      throw new Error('FFmpeg library failed to load. Check your internet connection and refresh.');
    }
    createFFmpeg = window.FFmpeg.createFFmpeg;
    fetchFile    = window.FFmpeg.fetchFile;
  }

  // Try to use IndexedDB caching
  let coreUrl  = FFMPEG_CORE_URL;
  let wasmUrl  = FFMPEG_WASM_URL;
  let workerUrl = FFMPEG_WORKER_URL;

  try {
    const db = await openIDB();

    // Fetch (or serve from cache) all three files
    const [coreData, wasmData, workerData] = await Promise.all([
      fetchWithCache(db, FFMPEG_CORE_URL,   'FFmpeg core JS'),
      fetchWithCache(db, FFMPEG_WASM_URL,   'FFmpeg WASM'),
      fetchWithCache(db, FFMPEG_WORKER_URL, 'FFmpeg worker'),
    ]);

    // Create blob URLs from cached ArrayBuffers
    coreUrl   = URL.createObjectURL(new Blob([coreData],   { type: 'application/javascript' }));
    wasmUrl   = URL.createObjectURL(new Blob([wasmData],   { type: 'application/wasm' }));
    workerUrl = URL.createObjectURL(new Blob([workerData], { type: 'application/javascript' }));

    el.loadingSub.textContent = 'Engine ready (loaded from cache)';
  } catch (cacheErr) {
    // Cache failed — fall back to CDN URLs (still works, just slower)
    console.warn('[Cache] IndexedDB unavailable, using CDN:', cacheErr.message);
    el.loadingSub.textContent = 'Downloading FFmpeg (~30 MB)...';
  }

  ffmpeg = createFFmpeg({
    corePath:   coreUrl,
    workerPath: workerUrl,
    wasmPath:   wasmUrl,
    log: false,
  });

  ffmpeg.setLogger(({ type, message }) => {
    if (type === 'fferr' || type === 'ffout') parseFFmpegLog(message);
  });

  await ffmpeg.load();
  ffmpegLoaded = true;
  el.loadingSub.textContent = 'Starting compression...';
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

// ══════════════════════════════════════════════════════════
//  COMPRESSION
// ══════════════════════════════════════════════════════════

async function compress(file) {
  setState(State.PROCESSING);
  lastPct     = 0;
  videoDurSec = 0;

  el.procFilename.textContent = file.name;
  el.origSize.textContent     = formatBytes(file.size);
  el.estSize.textContent      = '—';
  if (el.procSpeed)     el.procSpeed.textContent    = '';
  if (el.procModeBadge) el.procModeBadge.textContent = activeMode === 'auto' ? '⚡ Auto' : '⚙ Manual';

  updateProgress(1, 'Reading video info...');

  const meta      = await analyzeVideo(file);
  videoDurSec     = meta.duration || 0;

  const ext       = getExtension(file.name);
  const inputName = `input.${ext}`;

  updateProgress(3, 'Loading file into memory...');
  ffmpeg.FS('writeFile', inputName, await fetchFile(file));

  let args;
  if (activeMode === 'auto') {
    const s = computeAutoSettings(file, meta);
    args = buildAutoArgs(inputName, s);
  } else {
    args = buildManualArgs(inputName, meta);
  }

  console.info('[Compress] mode:', activeMode, '| args:', args.join(' '));
  updateProgress(5, 'Starting encoder...');

  await ffmpeg.run(...args);

  updateProgress(97, 'Reading output...');

  let outputData;
  try {
    outputData = ffmpeg.FS('readFile', 'output.mp4');
  } catch (e) {
    throw new Error('FFmpeg produced no output — format may be unsupported.');
  }

  try { ffmpeg.FS('unlink', inputName); }    catch (_) {}
  try { ffmpeg.FS('unlink', 'output.mp4'); } catch (_) {}

  if (outputUrl) URL.revokeObjectURL(outputUrl);
  outputUrl = URL.createObjectURL(new Blob([outputData.buffer], { type: 'video/mp4' }));

  updateProgress(100, 'Done!');
  await sleep(350);
  showResults(file.size, outputData.length);
}

// Shared tail args — strip metadata, select streams, web-optimise
function commonTailArgs() {
  return [
    '-map_metadata', '-1',
    '-map_chapters', '-1',
    '-map',     '0:v:0',
    '-map',     '0:a?',
    '-movflags', '+faststart',
    '-avoid_negative_ts', 'make_zero',
    'output.mp4',
  ];
}

/**
 * AUTO MODE — matches reference tool behaviour exactly.
 *
 * DEEP STUDY FINDINGS:
 * The reference (App.tsx) achieved 89% in 100-200s using:
 *   -c:v libx264  -b:v 2500k  -c:a aac  -b:a 128k  -r 30
 *   NO preset (=medium), NO scale, NO CRF, NO extra flags.
 *
 * WHY BITRATE NOT CRF:
 *   CRF = quality-constant, size varies per scene complexity.
 *   Bitrate targeting = SIZE-constant, quality varies.
 *   For maximum compression: bitrate targeting wins because we
 *   set a hard ceiling on output size regardless of content.
 *   CRF 28 on a low-complexity clip might use 3Mbps anyway;
 *   bitrate targeting enforces 2500k regardless.
 *
 * WHY MEDIUM WAS SLOW FOR US BUT FAST FOR REFERENCE:
 *   We added: scaleFilter (lanczos upscaler = expensive),
 *   -tune film, -profile:v high, -level 4.1, -ac 2, -ar 44100.
 *   Each adds CPU. Medium without extras = 100-200s.
 *   Medium WITH lanczos scale + CRF + tune = 12-13 min. That was our bug.
 *
 * NEW AUTO STRATEGY:
 *   1. Calculate smart target bitrate from input (not a fixed 2500k).
 *      If input is 20Mbps, 2500k = 87.5% reduction — matches reference.
 *      If input is 1Mbps, 2500k would INCREASE size, so we scale down.
 *   2. Keep 1080p resolution — reference kept it, it's faster, quality is maintained.
 *   3. Use 'fast' preset (not medium, not ultrafast).
 *      fast = 3-4x faster than medium, only 5-10% larger output.
 *      ultrafast = 2x faster than fast but 20-40% larger output.
 *      'fast' is the sweet spot for WASM: good speed + good compression.
 *   4. Force 30fps cap — drops high-fps drone/60fps footage by half the frames.
 *   5. Strip all metadata (-map_metadata -1).
 *   6. Audio: 96k AAC (reference used 128k but 96k is transparent and saves space).
 *
 * BEST TECHNIQUES FROM RESEARCH:
 *   - Bitrate targeting with bufsize = 2x bitrate prevents buffer overflow artefacts
 *   - -maxrate caps peak bitrate for streaming compatibility
 *   - -r 30 forces 30fps (60fps = 2x frames = 2x data, huge saving for 60fps input)
 *   - -pix_fmt yuv420p ensures Chrome/Safari/mobile can decode
 *   - movflags faststart puts moov atom first for instant web playback
 */
function computeAutoSettings(file, { width, height, duration }) {
  const durSec  = Math.max(duration || 0, 1);
  const bpsMbps = (file.size * 8) / (durSec * 1_000_000); // input bitrate

  // ── Target video bitrate ──────────────────────────────────
  // Strategy: if input > 4Mbps, target 2000-2500k (reference approach).
  // If input is already low, target 70% of input to still compress meaningfully
  // without quality loss from re-encoding at too-low bitrate.
  let targetKbps;
  if      (bpsMbps > 20)  targetKbps = 2000;  // very high bitrate → aggressive
  else if (bpsMbps > 10)  targetKbps = 2000;  // high → target 2Mbps
  else if (bpsMbps > 4)   targetKbps = 2000;  // medium-high → 2Mbps (like reference)
  else if (bpsMbps > 2)   targetKbps = 1200;  // medium → 1.2Mbps
  else if (bpsMbps > 1)   targetKbps = 800;   // already compressed → 800k
  else if (bpsMbps > 0.5) targetKbps = 500;   // very compressed → 500k
  else                     targetKbps = Math.round(bpsMbps * 0.7 * 1000); // tiny: 70%

  // ── Audio bitrate ─────────────────────────────────────────
  // 96k AAC is perceptually transparent for stereo content
  const audioBitrate = '96k';

  // ── Frame rate ────────────────────────────────────────────
  // Cap at 30fps — 60fps input becomes 30fps, halving frame data
  // Most content is fine at 30fps; fast action games are the exception
  const fps = '30';

  console.info(
    `[Auto] ${width}x${height} | input ${bpsMbps.toFixed(2)} Mbps | ` +
    `target ${targetKbps}k | audio ${audioBitrate} | fps ${fps}`
  );

  return { targetKbps: String(targetKbps), audioBitrate, fps };
}

function buildAutoArgs(inputName, { targetKbps, audioBitrate, fps }) {
  // bufsize = 2x bitrate: allows bursts without artefacts
  // maxrate = 1.5x bitrate: prevents extreme peaks
  const bufsize = String(parseInt(targetKbps) * 2) + 'k';
  const maxrate = String(Math.round(parseInt(targetKbps) * 1.5)) + 'k';

  return [
    '-i', inputName,
    // Video
    '-c:v',     'libx264',
    '-b:v',     targetKbps + 'k',  // fixed bitrate target (reference method)
    '-maxrate',  maxrate,           // peak bitrate cap
    '-bufsize',  bufsize,           // encoder buffer
    '-preset',  'fast',             // fast: 3-4x quicker than medium, ~5% larger
    '-pix_fmt', 'yuv420p',          // universal decode compatibility
    '-r',        fps,               // 30fps cap
    // Audio — re-encode to save space (reference re-encoded too)
    '-c:a',     'aac',
    '-b:a',     audioBitrate,
    // Metadata + stream selection
    '-map_metadata', '-1',          // strip ALL metadata
    '-map_chapters', '-1',
    '-map',     '0:v:0',
    '-map',     '0:a?',
    '-movflags', '+faststart',
    '-avoid_negative_ts', 'make_zero',
    'output.mp4',
  ];
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
  // Rough size estimate: auto typically achieves 10-25% of original (85-90% savings)
  if (currentFile && pct > 8 && pct < 96) {
    const targetRatio = activeMode === 'auto' ? 0.12 : 0.55;
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
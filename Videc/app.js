/**
 * COMPRESS — Browser-native Video Compressor
 * Uses FFmpeg.wasm for in-browser compression
 * No upload, no server — 100% local processing
 */

'use strict';

// ── FFmpeg globals — resolved lazily inside ensureFFmpeg() ─
// (avoids top-level crash if CDN script hasn't fully parsed)
let createFFmpeg = null;
let fetchFile = null;

// ── App State ──────────────────────────────────────────────
const State = { IDLE: 'idle', LOADING: 'loading', PROCESSING: 'processing', DONE: 'done', ERROR: 'error' };
let currentState = State.IDLE;
let ffmpeg = null;
let ffmpegLoaded = false;
let currentFile = null;
let outputUrl  = null;
let startTime  = 0;
let lastRatio  = 0;

// ── DOM References ─────────────────────────────────────────
const $ = id => document.getElementById(id);
const el = {
  stateIdle:       $('state-idle'),
  stateLoading:    $('state-loading'),
  stateProcessing: $('state-processing'),
  stateDone:       $('state-done'),
  stateError:      $('state-error'),
  dropZone:        $('drop-zone'),
  fileInput:       $('file-input'),
  loadingSub:      $('loading-sub'),
  procFilename:    $('proc-filename'),
  progressFill:    $('progress-fill'),
  progressPct:     $('progress-pct'),
  procStage:       $('proc-stage'),
  origSize:        $('orig-size'),
  estSize:         $('est-size'),
  successIcon:     $('success-icon'),
  savingsPct:      $('savings-pct'),
  resultBefore:    $('result-before'),
  resultAfter:     $('result-after'),
  downloadBtn:     $('download-btn'),
  downloadSize:    $('download-size'),
  errorMsg:        $('error-msg'),
  coiToast:        $('coi-toast'),
};

// ══════════════════════════════════════════════════════════
//  INITIALISATION
// ══════════════════════════════════════════════════════════

function init() {
  setupDropZone();
  setupFileInput();
  checkCOI();
}

function checkCOI() {
  // Show helpful error if not cross-origin isolated (SharedArrayBuffer unavailable)
  if (typeof crossOriginIsolated !== 'undefined' && !crossOriginIsolated) {
    if (window.__coiFailed) {
      el.coiToast.hidden = false;
    }
  }
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

  // Resolve globals lazily from the UMD bundle (<script> loads before app.js)
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

  ffmpeg.setLogger(({ type, message }) => {
    // Parse frame progress as fallback
    if (type === 'fferr' && message.includes('frame=')) {
      parseFrameProgress(message);
    }
  });

  ffmpeg.setProgress(({ ratio }) => {
    const pct = Math.round(Math.max(lastRatio, Math.min(1, ratio)) * 95); // cap at 95% until done
    if (pct > lastRatio * 100) {
      lastRatio = pct / 100;
      updateProgress(pct, getStageLabel(pct));
    }
  });

  await ffmpeg.load();
  ffmpegLoaded = true;
  el.loadingSub.textContent = 'Engine ready — analyzing video...';
}

function parseFrameProgress(log) {
  // Fallback progress from FFmpeg log lines
  const m = log.match(/frame=\s*(\d+)/);
  if (m) {
    const frame = parseInt(m[1]);
    // We don't know total frames here, but we can bump progress slowly
    const bump = Math.min(0.9, lastRatio + 0.01);
    if (bump > lastRatio) {
      lastRatio = bump;
      updateProgress(Math.round(bump * 100), getStageLabel(Math.round(bump * 100)));
    }
  }
}

function getStageLabel(pct) {
  if (pct < 5)  return 'Analyzing...';
  if (pct < 15) return 'Starting encode...';
  if (pct < 85) return 'Compressing...';
  if (pct < 95) return 'Stripping metadata...';
  return 'Finalizing...';
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
function computeSettings(file, { width, height, duration }) {
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

  el.procFilename.textContent = file.name;
  el.origSize.textContent = formatBytes(file.size);
  el.estSize.textContent = '—';
  startTime = Date.now();

  // Analyze video for smart settings
  const meta = await analyzeVideo(file);
  const settings = computeSettings(file, meta);

  // Write input to FFmpeg virtual FS
  const ext = getExtension(file.name);
  const inputName = `input.${ext}`;

  updateProgress(2, 'Loading file...');
  ffmpeg.FS('writeFile', inputName, await fetchFile(file));

  // Build FFmpeg command
  const args = buildFFmpegArgs(inputName, settings);
  console.info('[Compress] FFmpeg args:', args.join(' '));

  updateProgress(5, 'Analyzing...');

  // Run compression
  await ffmpeg.run(...args);

  updateProgress(96, 'Reading output...');

  // Read output
  let outputData;
  try {
    outputData = ffmpeg.FS('readFile', 'output.mp4');
  } catch (e) {
    throw new Error('FFmpeg produced no output. The video format may be unsupported.');
  }

  // Cleanup virtual FS
  try { ffmpeg.FS('unlink', inputName); } catch (_) {}
  try { ffmpeg.FS('unlink', 'output.mp4'); } catch (_) {}

  // Create object URL for download
  if (outputUrl) URL.revokeObjectURL(outputUrl);
  const blob = new Blob([outputData.buffer], { type: 'video/mp4' });
  outputUrl = URL.createObjectURL(blob);

  updateProgress(100, 'Done!');

  // Show results after a short delay
  await sleep(400);
  showResults(file.size, outputData.length);
}

/**
 * Build the FFmpeg argument array.
 * Key decisions:
 *  - CRF mode: constant quality, size adapts to content complexity
 *  - veryfast preset: good speed/quality tradeoff in WASM
 *  - -map_metadata -1: strip ALL metadata (GPS, camera, author, etc.)
 *  - -map 0:v:0 -map 0:a:0?: keep ONLY primary video + audio streams
 *  - -movflags +faststart: move moov atom to front (better for web)
 */
function buildFFmpegArgs(inputName, { crf, scaleFilter, audioBitrate }) {
  const args = [
    '-i', inputName,

    // ── Video codec & quality ──────────────────────────
    '-c:v', 'libx264',
    '-crf', crf,
    '-preset', 'veryfast',        // Fast encode, good quality
    '-profile:v', 'high',         // H.264 High profile
    '-level', '4.1',              // Wide compatibility
    '-pix_fmt', 'yuv420p',        // Universal playback compatibility
  ];

  // ── Scale filter (4K/2K → 1080p) ────────────────────
  if (scaleFilter) {
    args.push('-vf', scaleFilter);
  }

  // ── Audio ────────────────────────────────────────────
  args.push(
    '-c:a', 'aac',
    '-b:a', audioBitrate,
    '-ar', '44100',               // Normalize sample rate
    '-ac', '2',                   // Stereo (downmix surround if needed)
  );

  // ── Metadata & stream mapping ────────────────────────
  args.push(
    '-map_metadata', '-1',        // ← Remove ALL metadata (EXIF, GPS, author, etc.)
    '-map_chapters', '-1',        // Remove chapter markers
    '-map', '0:v:0',              // Keep only first video stream
    '-map', '0:a:0?',             // Keep only first audio stream (optional)
    '-movflags', '+faststart',    // Web-optimised (moov atom first)
    '-avoid_negative_ts', 'make_zero',
  );

  args.push('output.mp4');

  return args;
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
  Object.values(stateMap).forEach(s => s.hidden = true);
  const target = stateMap[next];
  if (target) { target.hidden = false; }
}

function updateProgress(pct, stage) {
  pct = Math.max(0, Math.min(100, pct));
  el.progressFill.style.width = `${pct}%`;
  el.progressPct.textContent = `${pct}%`;
  if (stage) el.procStage.textContent = stage;

  // Estimate output size during compression (rough: assume 40% final size)
  if (currentFile && pct > 10 && pct < 95) {
    const ratio = pct / 100;
    const estimated = currentFile.size * (0.35 + (1 - ratio) * 0.25);
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
  lastRatio = 0;
  setState(State.IDLE);
  // Reset progress UI
  el.progressFill.style.width = '0%';
  el.progressPct.textContent = '0%';
  el.procStage.textContent = 'Analyzing...';
  el.origSize.textContent = '—';
  el.estSize.textContent = '—';
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
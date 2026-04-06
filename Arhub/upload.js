/**
 * upload.js — Upload Page: Post (multi-image/gif) + Reel (video) creation
 * Uses localStorage for drafts, simulates upload to local state
 */

var UploadManager = (() => {

  /* ── State ──────────────────────────────────────────────────────────────── */
  let selectedType   = null;   // 'post' | 'reel'
  let postImages     = [];     // { file, dataUrl, name }[]
  let reelVideo      = null;   // { file, dataUrl, name }
  let activeImageIdx = 0;
  let hideToggleOn   = false;
  let commentToggleOn= true;

  /* ══════════════════════════════════════════════════════════════════
     RENDER
  ══════════════════════════════════════════════════════════════════ */

  function render() {
    const page = document.getElementById('page-upload');
    if (!page) return;

    // Reset state
    selectedType  = null;
    postImages    = [];
    reelVideo     = null;
    activeImageIdx= 0;

    page.innerHTML = `
      <div class="upload-root">

        <!-- Header -->
        <div class="upload-header">
          <div class="upload-header-close" onclick="App.navigateTo('home')">${Icons.close}</div>
          <span class="upload-header-title">New post</span>
          <span class="upload-share-btn disabled" id="upload-share-btn" onclick="UploadManager.share()">Share</span>
        </div>

        <!-- Type selector -->
        <div class="upload-type-selector" id="upload-type-selector">
          <div class="upload-type-card" id="type-post" onclick="UploadManager.selectType('post')">
            <div class="upload-type-icon">${Icons.image}</div>
            <div class="upload-type-label">Post</div>
            <div class="upload-type-desc">Photos & GIFs</div>
          </div>
          <div class="upload-type-card" id="type-reel" onclick="UploadManager.selectType('reel')">
            <div class="upload-type-icon">${Icons.reels}</div>
            <div class="upload-type-label">Reel</div>
            <div class="upload-type-desc">Short videos</div>
          </div>
        </div>

        <!-- Post form -->
        <div class="upload-form" id="upload-post-form">

          <!-- Dropzone / thumbnails -->
          <div id="upload-post-dropzone-wrap">
            <div class="upload-dropzone" id="upload-post-dz">
              <input type="file" accept="image/*,image/gif" multiple
                     onchange="UploadManager.handlePostFiles(event)">
              <div class="upload-dz-icon">${Icons.image}</div>
              <div class="upload-dz-title">Select photos or GIFs</div>
              <div class="upload-dz-sub">Drag & drop or tap to choose</div>
              <div class="upload-dz-btn">Select from library</div>
            </div>
          </div>

          <!-- Preview -->
          <div class="upload-preview-area" id="upload-post-preview">
            <img class="upload-preview-img" id="upload-post-img" src="" alt="">
            <div class="upload-preview-remove" onclick="UploadManager.removeCurrentImage()">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round" width="14" height="14"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
            </div>
          </div>

          <!-- Thumbnails row -->
          <div class="upload-thumbnails" id="upload-thumbs"></div>

          <!-- Caption -->
          <div class="upload-caption-wrap">
            <div class="upload-caption-header">
              <div class="upload-caption-avatar">
                <img src="${InstagramData.currentUser.avatar}" alt="" onerror="this.src='https://i.pravatar.cc/150?img=1'">
              </div>
              <span class="upload-caption-username">${InstagramData.currentUser.username}</span>
            </div>
            <textarea class="upload-caption-textarea" id="upload-post-caption"
                      placeholder="Write a caption…" maxlength="2200"
                      oninput="UploadManager.onCaptionInput(this)"></textarea>
            <div class="upload-caption-footer">
              <div class="upload-caption-emoji" onclick="UploadManager.addEmoji('upload-post-caption')">${Icons.emoji}</div>
              <span class="upload-char-count" id="upload-post-charcount">0 / 2200</span>
            </div>
          </div>

          <!-- Options -->
          <div class="upload-options">
            <div class="upload-option-row" onclick="showToast('Alt text coming soon')">
              <span class="upload-option-label">Accessibility (Alt text)</span>
              <span class="upload-option-value">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" width="18" height="18"><polyline points="9 18 15 12 9 6"/></svg>
              </span>
            </div>
            <div class="upload-option-row">
              <span class="upload-option-label">Hide like count</span>
              <div class="upload-toggle" id="hide-likes-toggle" onclick="UploadManager.toggleOption('hide-likes-toggle','hideToggle')"></div>
            </div>
            <div class="upload-option-row">
              <span class="upload-option-label">Turn off commenting</span>
              <div class="upload-toggle" id="comments-toggle" onclick="UploadManager.toggleOption('comments-toggle','commentsToggle')"></div>
            </div>
          </div>

        </div><!-- /post form -->

        <!-- Reel form -->
        <div class="upload-form" id="upload-reel-form">

          <!-- Video dropzone -->
          <div id="upload-reel-dropzone-wrap">
            <div class="upload-dropzone" id="upload-reel-dz">
              <input type="file" accept="video/*"
                     onchange="UploadManager.handleReelFile(event)">
              <div class="upload-dz-icon">${Icons.reels}</div>
              <div class="upload-dz-title">Select a video</div>
              <div class="upload-dz-sub">MP4, MOV · up to 90 seconds</div>
              <div class="upload-dz-btn">Select video</div>
            </div>
          </div>

          <!-- Video preview -->
          <div class="upload-preview-area" id="upload-reel-preview">
            <video class="upload-preview-video" id="upload-reel-video"
                   controls playsinline muted></video>
            <div class="upload-preview-remove" onclick="UploadManager.removeReel()">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round" width="14" height="14"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
            </div>
          </div>

          <!-- Reel caption -->
          <div class="upload-caption-wrap">
            <div class="upload-caption-header">
              <div class="upload-caption-avatar">
                <img src="${InstagramData.currentUser.avatar}" alt="" onerror="this.src='https://i.pravatar.cc/150?img=1'">
              </div>
              <span class="upload-caption-username">${InstagramData.currentUser.username}</span>
            </div>
            <textarea class="upload-caption-textarea" id="upload-reel-caption"
                      placeholder="Write a caption…" maxlength="2200"
                      oninput="UploadManager.onCaptionInput(this)"></textarea>
            <div class="upload-caption-footer">
              <div class="upload-caption-emoji" onclick="UploadManager.addEmoji('upload-reel-caption')">${Icons.emoji}</div>
              <span class="upload-char-count" id="upload-reel-charcount">0 / 2200</span>
            </div>
          </div>

          <!-- Reel options -->
          <div class="upload-options">
            <div class="upload-option-row">
              <span class="upload-option-label">Remix</span>
              <div class="upload-toggle" id="remix-toggle" onclick="UploadManager.toggleOption('remix-toggle','remixToggle')"></div>
            </div>
            <div class="upload-option-row">
              <span class="upload-option-label">Turn off commenting</span>
              <div class="upload-toggle" id="reel-comments-toggle" onclick="UploadManager.toggleOption('reel-comments-toggle','reelCommentsToggle')"></div>
            </div>
          </div>

        </div><!-- /reel form -->

      </div>

      <!-- Progress overlay -->
      <div class="upload-progress-overlay" id="upload-progress-overlay">
        <div class="upload-progress-card">
          <div class="upload-progress-spinner"></div>
          <div class="upload-progress-text" id="upload-progress-text">Uploading…</div>
          <div class="upload-progress-sub" id="upload-progress-sub">Please wait</div>
          <div class="upload-progress-bar-wrap">
            <div class="upload-progress-bar-fill" id="upload-progress-fill"></div>
          </div>
        </div>
      </div>

      <!-- Success overlay -->
      <div class="upload-success-overlay" id="upload-success-overlay">
        <div class="upload-success-card">
          <div class="upload-success-icon">
            <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><polyline points="20 6 9 17 4 12"/></svg>
          </div>
          <div class="upload-success-title" id="upload-success-title">Posted!</div>
          <div class="upload-success-sub"  id="upload-success-sub">Your post is live.</div>
          <div class="upload-success-btn" onclick="UploadManager.afterShare()">Done</div>
        </div>
      </div>`;

    // Setup drag events
    _setupDragDrop('upload-post-dz', 'image');
    _setupDragDrop('upload-reel-dz', 'video');
  }

  /* ══════════════════════════════════════════════════════════════════
     TYPE SELECTION
  ══════════════════════════════════════════════════════════════════ */

  function selectType(type) {
    selectedType = type;

    document.getElementById('type-post')?.classList.toggle('selected', type === 'post');
    document.getElementById('type-reel')?.classList.toggle('selected', type === 'reel');

    document.getElementById('upload-post-form')?.classList.toggle('visible', type === 'post');
    document.getElementById('upload-reel-form')?.classList.toggle('visible', type === 'reel');

    _updateShareBtn();
  }

  /* ══════════════════════════════════════════════════════════════════
     POST — handle files
  ══════════════════════════════════════════════════════════════════ */

  function handlePostFiles(event) {
    const files = Array.from(event.target.files);
    if (!files.length) return;

    const validTypes = ['image/jpeg','image/png','image/gif','image/webp','image/avif'];
    const filtered   = files.filter(f => validTypes.includes(f.type));
    if (!filtered.length) { showToast('Please select image or GIF files'); return; }

    let loaded = 0;
    filtered.forEach(file => {
      const reader = new FileReader();
      reader.onload = e => {
        postImages.push({ file, dataUrl: e.target.result, name: file.name });
        loaded++;
        if (loaded === filtered.length) {
          activeImageIdx = postImages.length - filtered.length;
          _renderPostPreviews();
          _updateShareBtn();
        }
      };
      reader.readAsDataURL(file);
    });
  }

  function _renderPostPreviews() {
    const dz      = document.getElementById('upload-post-dropzone-wrap');
    const preview = document.getElementById('upload-post-preview');
    const img     = document.getElementById('upload-post-img');
    const thumbs  = document.getElementById('upload-thumbs');

    if (!postImages.length) {
      if (dz) dz.style.display = '';
      if (preview) preview.classList.remove('visible');
      if (thumbs) thumbs.innerHTML = '';
      return;
    }

    if (dz) dz.style.display = 'none';
    if (preview) preview.classList.add('visible');
    if (img) img.src = postImages[activeImageIdx].dataUrl;

    if (thumbs) {
      thumbs.innerHTML = postImages.map((p, i) => `
        <div class="upload-thumb ${i === activeImageIdx ? 'active' : ''}"
             onclick="UploadManager.setActiveImage(${i})">
          <img src="${p.dataUrl}" alt="${p.name}">
          <div class="upload-thumb-remove" onclick="event.stopPropagation();UploadManager.removeImage(${i})">×</div>
        </div>`).join('') + `
        <div class="upload-add-more">
          <input type="file" accept="image/*,image/gif" multiple onchange="UploadManager.handlePostFiles(event)">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" width="24" height="24"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
        </div>`;
    }
  }

  function setActiveImage(idx) {
    activeImageIdx = idx;
    _renderPostPreviews();
  }

  function removeImage(idx) {
    postImages.splice(idx, 1);
    if (activeImageIdx >= postImages.length) activeImageIdx = Math.max(0, postImages.length - 1);
    _renderPostPreviews();
    _updateShareBtn();
  }

  function removeCurrentImage() {
    removeImage(activeImageIdx);
  }

  /* ══════════════════════════════════════════════════════════════════
     REEL — handle video file
  ══════════════════════════════════════════════════════════════════ */

  function handleReelFile(event) {
    const file = event.target.files[0];
    if (!file) return;

    if (!file.type.startsWith('video/')) { showToast('Please select a video file'); return; }
    if (file.size > 100 * 1024 * 1024)  { showToast('Video must be under 100MB'); return; }

    const reader = new FileReader();
    reader.onload = e => {
      reelVideo = { file, dataUrl: e.target.result, name: file.name };

      const dz      = document.getElementById('upload-reel-dropzone-wrap');
      const preview = document.getElementById('upload-reel-preview');
      const video   = document.getElementById('upload-reel-video');

      if (dz) dz.style.display = 'none';
      if (preview) preview.classList.add('visible');
      if (video) {
        video.classList.add('visible');
        video.src = e.target.result;
        video.load();
      }

      _updateShareBtn();
    };
    reader.readAsDataURL(file);
  }

  function removeReel() {
    reelVideo = null;
    const dz      = document.getElementById('upload-reel-dropzone-wrap');
    const preview = document.getElementById('upload-reel-preview');
    const video   = document.getElementById('upload-reel-video');
    if (dz) dz.style.display = '';
    if (preview) preview.classList.remove('visible');
    if (video) { video.classList.remove('visible'); video.src = ''; }
    _updateShareBtn();
  }

  /* ══════════════════════════════════════════════════════════════════
     SHARE / UPLOAD SIMULATION
  ══════════════════════════════════════════════════════════════════ */

  function share() {
    if (!_canShare()) return;

    const captionId = selectedType === 'post' ? 'upload-post-caption' : 'upload-reel-caption';
    const caption   = document.getElementById(captionId)?.value?.trim() || '';

    // Show progress
    const progressOverlay = document.getElementById('upload-progress-overlay');
    if (progressOverlay) progressOverlay.classList.add('visible');

    // Simulate upload progress
    let pct = 0;
    const fill = document.getElementById('upload-progress-fill');
    const text = document.getElementById('upload-progress-text');
    const sub  = document.getElementById('upload-progress-sub');

    if (text) text.textContent = selectedType === 'post' ? 'Uploading photo…' : 'Processing video…';

    const interval = setInterval(() => {
      pct += Math.random() * 18 + 5;
      if (pct > 100) pct = 100;
      if (fill) fill.style.width = pct + '%';
      if (sub) sub.textContent = Math.floor(pct) + '%';

      if (pct >= 100) {
        clearInterval(interval);
        setTimeout(() => {
          if (progressOverlay) progressOverlay.classList.remove('visible');
          _completeShare(caption);
        }, 400);
      }
    }, 180);
  }

  function _completeShare(caption) {
    // Add to local data
    const cu = InstagramData.currentUser;

    if (selectedType === 'post' && postImages.length) {
      const newPost = {
        id:        `post_upload_${Date.now()}`,
        userId:    cu.id,
        images:    postImages.map(p => p.dataUrl),
        caption:   caption || 'New post ✨',
        likes:     0, liked: false, saved: false,
        comments:  [],
        timestamp: Date.now(),
        location:  null,
      };
      InstagramData.posts.unshift(newPost);
      cu.postsCount = (cu.postsCount || 0) + 1;
    }

    // Show success
    const successOverlay = document.getElementById('upload-success-overlay');
    const title  = document.getElementById('upload-success-title');
    const subEl  = document.getElementById('upload-success-sub');

    if (title) title.textContent = selectedType === 'reel' ? 'Reel posted!' : 'Post shared!';
    if (subEl) subEl.textContent = selectedType === 'reel' ? 'Your reel is now live.' : 'Your post is now live on your profile.';
    if (successOverlay) successOverlay.classList.add('visible');
  }

  function afterShare() {
    const successOverlay = document.getElementById('upload-success-overlay');
    if (successOverlay) successOverlay.classList.remove('visible');
    App.navigateTo('home');
  }

  /* ══════════════════════════════════════════════════════════════════
     HELPERS
  ══════════════════════════════════════════════════════════════════ */

  function _canShare() {
    if (!selectedType) { showToast('Choose Post or Reel first'); return false; }
    if (selectedType === 'post' && !postImages.length) { showToast('Add at least one photo'); return false; }
    if (selectedType === 'reel' && !reelVideo) { showToast('Add a video first'); return false; }
    return true;
  }

  function _updateShareBtn() {
    const btn = document.getElementById('upload-share-btn');
    if (!btn) return;
    const canShare = selectedType && (
      (selectedType === 'post' && postImages.length > 0) ||
      (selectedType === 'reel' && reelVideo)
    );
    btn.classList.toggle('disabled', !canShare);
  }

  function onCaptionInput(textarea) {
    const max  = 2200;
    const len  = textarea.value.length;
    const id   = textarea.id === 'upload-post-caption' ? 'upload-post-charcount' : 'upload-reel-charcount';
    const el   = document.getElementById(id);
    if (el) {
      el.textContent = `${len} / ${max}`;
      el.classList.toggle('warning', len > max - 200);
    }
  }

  function addEmoji(textareaId) {
    const el = document.getElementById(textareaId);
    if (!el) return;
    const emojis = ['❤️','🔥','✨','😍','🙌','💯','🎉','🤩'];
    el.value += emojis[Math.floor(Math.random() * emojis.length)];
    el.focus();
    onCaptionInput(el);
  }

  function toggleOption(toggleId) {
    const el = document.getElementById(toggleId);
    if (el) el.classList.toggle('on');
  }

  // Drag & drop
  function _setupDragDrop(dzId, type) {
    const dz = document.getElementById(dzId);
    if (!dz) return;
    dz.addEventListener('dragover', e => { e.preventDefault(); dz.classList.add('drag-over'); });
    dz.addEventListener('dragleave', () => dz.classList.remove('drag-over'));
    dz.addEventListener('drop', e => {
      e.preventDefault();
      dz.classList.remove('drag-over');
      const files = Array.from(e.dataTransfer.files);
      if (type === 'image') {
        const fakeEvent = { target: { files } };
        handlePostFiles(fakeEvent);
      } else {
        const fakeEvent = { target: { files: [files[0]] } };
        handleReelFile(fakeEvent);
      }
    });
  }

  /* ── Public ─────────────────────────────────────────────────────── */
  return {
    render,
    selectType,
    handlePostFiles, handleReelFile,
    setActiveImage, removeImage, removeCurrentImage, removeReel,
    share, afterShare,
    onCaptionInput, addEmoji, toggleOption,
  };

})();
  

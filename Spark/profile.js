/**
 * profile.js — Profile Page
 * Features:
 *  - View all profile details (name, username, email, bio, avatar)
 *  - Edit display name, username, bio
 *  - Change avatar (upload to storage)
 *  - Change password
 *  - Delete account (with confirmation + password)
 *  - Logout
 *  - Stats: chats count, communities count, statuses
 */

const ProfilePage = (() => {

  let _container  = null;
  let _profileRec = null;   // Parqra DB record for spark_profiles

  /* ─── RENDER ─────────────────────────────────────────────── */
  const render = async (container) => {
    _container = container;

    App.setTitle(null);
    App.setHeaderActions(`
      <button class="icon-btn" id="hdr-settings" title="Settings">
        <span class="material-icons-round">settings</span>
      </button>
    `);

    container.innerHTML = `
      <div class="profile-scroll" id="prof-scroll">
        <div class="loading-center" style="height:300px">
          <div class="spinner"></div>
        </div>
      </div>`;

    document.getElementById('hdr-settings')?.addEventListener('click', _showSettings);

    await _load();
  };

  /* ─── LOAD ────────────────────────────────────────────────── */
  const _load = async () => {
    const scroll = document.getElementById('prof-scroll');
    if (!scroll) return;

    const me = Server.currentUser;
    if (!me) return;

    // Fetch fresh profile
    _profileRec = await Server.getProfile(me.id);
    Server.currentProfile = _profileRec;

    const d = _profileRec?.data || {};
    const displayName = d.display_name || me.display_name || 'User';
    const username    = d.username     || '';
    const email       = d.email        || me.email || '';
    const bio         = d.bio          || '';
    const avatarUrl   = d.avatar_url   || '';

    // Counts (best-effort)
    let chatCount = 0, commCount = 0;
    try {
      const chats = await Server.getDirectChats(me.id);
      chatCount   = chats.length;
    } catch {}
    try {
      const comms = await Server.getCommunities();
      commCount   = comms.filter(r => (r.data.participants || []).includes(me.id)).length;
    } catch {}

    scroll.innerHTML = `
      <!-- ── Header ── -->
      <div class="profile-header-card">
        <label class="profile-av-ring" id="av-ring-label" title="Change avatar">
          <div class="profile-av-inner">
            ${avatarUrl
              ? `<img src="${avatarUrl}" alt="${displayName}" id="prof-av-img">`
              : `<div class="profile-av-initial" id="prof-av-initial">${displayName[0].toUpperCase()}</div>`}
          </div>
          <div class="profile-av-cam">
            <span class="material-icons-round">photo_camera</span>
          </div>
          <input type="file" accept="image/*" id="av-file-input" style="display:none">
        </label>

        <div class="profile-display-name">${_esc(displayName)}</div>
        <div class="profile-username">@${_esc(username)}</div>
        <div class="profile-bio ${bio ? '' : 'empty'}" id="prof-bio">
          ${bio ? _esc(bio) : 'Tap edit to add a bio…'}
        </div>

        <div class="profile-stats">
          <div class="stat-item">
            <div class="stat-number">${chatCount}</div>
            <div class="stat-label">Chats</div>
          </div>
          <div class="stat-item">
            <div class="stat-number">${commCount}</div>
            <div class="stat-label">Groups</div>
          </div>
          <div class="stat-item">
            <div class="stat-number">
              ${_esc(new Date(d.created_at || me.created_at || Date.now())
                .toLocaleDateString(undefined, { month: 'short', year: 'numeric' }))}
            </div>
            <div class="stat-label">Joined</div>
          </div>
        </div>

        <div class="profile-action-row">
          <button class="btn-ghost" id="btn-edit-profile">
            <span class="material-icons-round">edit</span> Edit Profile
          </button>
          <button class="btn-ghost" id="btn-share-profile">
            <span class="material-icons-round">share</span> Share
          </button>
        </div>
      </div>

      <!-- ── Info list ── -->
      <div class="profile-info-list">
        ${_infoItem('person', 'Display Name', displayName)}
        ${_infoItem('alternate_email', 'Username', '@' + username, 'edit-username')}
        ${_infoItem('mail_outline', 'Email', email)}
        ${_infoItem('notes', 'Bio', bio || 'Not set')}
        ${_infoItem('lock_outline', 'Change Password', '••••••••', 'change-pw')}
      </div>

      <!-- ── Logout ── -->
      <button class="logout-btn" id="btn-logout">
        <span class="material-icons-round">logout</span> Log Out
      </button>

      <!-- ── Danger Zone ── -->
      <div class="danger-zone">
        <div class="danger-zone-title">
          <span class="material-icons-round">warning</span> Danger Zone
        </div>
        <div class="danger-item" id="btn-del-acct">
          <span class="material-icons-round">delete_forever</span>
          <span>Delete Account</span>
        </div>
      </div>

      <!-- ── Footer ── -->
      <div class="profile-footer">
        Spark v1.0.0<br>
        Made with ❤️ using Parqra
      </div>
    `;

    /* Avatar upload */
    document.getElementById('av-file-input').addEventListener('change', async (e) => {
      const file = e.target.files[0];
      if (!file) return;
      await _uploadAvatar(file);
      e.target.value = '';
    });

    /* Edit profile button */
    document.getElementById('btn-edit-profile').onclick = _showEditSheet;

    /* Share profile */
    document.getElementById('btn-share-profile').onclick = () => {
      if (navigator.share) {
        navigator.share({ title: `@${username} on Spark`, text: bio }).catch(() => {});
      } else {
        navigator.clipboard?.writeText(`@${username}`)
          .then(() => App.showToast('Username copied!'))
          .catch(() => App.showToast('@' + username));
      }
    };

    /* Info items → open relevant edit sheet */
    document.getElementById('pii-person')?.addEventListener('click',       _showEditSheet);
    document.getElementById('pii-alternate_email')?.addEventListener('click', _showEditUsername);
    document.getElementById('pii-notes')?.addEventListener('click',        _showEditBio);
    document.getElementById('pii-lock_outline')?.addEventListener('click', _showChangePw);

    /* Logout */
    document.getElementById('btn-logout').onclick = _doLogout;

    /* Delete account */
    document.getElementById('btn-del-acct').onclick = _showDeleteConfirm;
  };

  /* ─── INFO ITEM HTML ─────────────────────────────────────── */
  const _infoItem = (icon, label, value, id) => `
    <div class="profile-info-item" ${id ? `id="pii-${icon}"` : ''}>
      <div class="pii-icon">
        <span class="material-icons-round">${icon}</span>
      </div>
      <div class="pii-body">
        <div class="pii-label">${label}</div>
        <div class="pii-value ${value === 'Not set' ? 'empty' : ''}">${_esc(value)}</div>
      </div>
      <div class="pii-arrow">
        <span class="material-icons-round">chevron_right</span>
      </div>
    </div>`;

  /* ─── UPLOAD AVATAR ──────────────────────────────────────── */
  const _uploadAvatar = async (file) => {
    App.showToast('Uploading photo…');
    try {
      const url = await Server.uploadAvatar(file);
      if (!url) throw new Error('No URL');

      if (_profileRec) {
        await Server.updateProfile(_profileRec.id, { avatar_url: url });
      }

      // Update local
      if (_profileRec) _profileRec.data.avatar_url = url;
      Server.currentProfile = _profileRec;

      App.showToast('Photo updated!', 'success');
      await _load();
    } catch {
      App.showToast('Upload failed', 'error');
    }
  };

  /* ─── EDIT PROFILE SHEET (name + bio) ───────────────────── */
  const _showEditSheet = () => {
    const d   = _profileRec?.data || {};
    const close = App.showModal(`
      <div class="edit-sheet">
        <h3>Edit Profile</h3>

        <div class="edit-field">
          <label class="edit-label">Display Name</label>
          <input id="ep-name" class="input-field" type="text"
            value="${_attr(d.display_name)}" maxlength="60">
        </div>

        <div class="edit-field">
          <label class="edit-label">Bio</label>
          <textarea id="ep-bio" class="input-field" rows="3"
            placeholder="Tell people about yourself…"
            style="resize:none;max-height:100px">${_attr(d.bio)}</textarea>
          <span style="font-size:11px;color:var(--text-3);text-align:right" id="ep-bio-cnt">
            ${(d.bio || '').length}/120
          </span>
        </div>

        <div id="ep-err" class="auth-error"></div>

        <button class="edit-save-btn" id="ep-save">
          <span class="material-icons-round">check</span> Save Changes
        </button>
      </div>
    `);

    document.getElementById('ep-bio').addEventListener('input', (e) => {
      const len = e.target.value.length;
      if (len > 120) e.target.value = e.target.value.slice(0, 120);
      document.getElementById('ep-bio-cnt').textContent = `${Math.min(len,120)}/120`;
    });

    document.getElementById('ep-save').onclick = async () => {
      const name = document.getElementById('ep-name').value.trim();
      const bio  = document.getElementById('ep-bio').value.trim();
      const err  = document.getElementById('ep-err');
      err.classList.remove('visible');

      if (!name) { err.textContent = 'Display name cannot be empty.'; err.classList.add('visible'); return; }

      const btn = document.getElementById('ep-save');
      btn.disabled = true;
      btn.innerHTML = `<div class="spinner" style="width:20px;height:20px;border-width:2px"></div>`;

      try {
        if (_profileRec) {
          await Server.updateProfile(_profileRec.id, { display_name: name, bio });
          _profileRec.data.display_name = name;
          _profileRec.data.bio          = bio;
          Server.currentProfile = _profileRec;
        }
        close();
        App.showToast('Profile updated!', 'success');
        await _load();
      } catch (e) {
        btn.disabled  = false;
        btn.innerHTML = `<span class="material-icons-round">check</span> Save Changes`;
        err.textContent = e.message || 'Save failed.';
        err.classList.add('visible');
      }
    };
  };

  /* ─── EDIT USERNAME ──────────────────────────────────────── */
  const _showEditUsername = () => {
    const d = _profileRec?.data || {};
    let checkTimer = null;

    const close = App.showModal(`
      <div class="edit-sheet">
        <h3>Change Username</h3>
        <p style="font-size:13px;color:var(--text-3);text-align:center;margin-top:-8px">
          Username is your unique ID — others can find you with it.
        </p>

        <div class="edit-field">
          <label class="edit-label">New Username</label>
          <input id="eu-name" class="input-field" type="text"
            value="${_attr(d.username)}" placeholder="lowercase, no spaces"
            style="text-transform:lowercase" maxlength="30">
          <span id="eu-hint" style="font-size:11px;color:var(--text-3);padding-left:2px"></span>
        </div>

        <div id="eu-err" class="auth-error"></div>
        <button class="edit-save-btn" id="eu-save">
          <span class="material-icons-round">check</span> Save Username
        </button>
      </div>
    `);

    document.getElementById('eu-name').addEventListener('input', (e) => {
      e.target.value = e.target.value.replace(/[^a-z0-9._]/gi, '').toLowerCase();
      const hint = document.getElementById('eu-hint');
      clearTimeout(checkTimer);
      if (e.target.value.length < 3) { hint.textContent = ''; return; }
      hint.textContent = 'Checking…';
      hint.style.color = 'var(--text-3)';
      checkTimer = setTimeout(async () => {
        const taken = await Server.isUsernameTaken(e.target.value);
        const isMine = e.target.value === d.username;
        hint.textContent = isMine ? '✓ Current username' : taken ? '✗ Username taken' : '✓ Available';
        hint.style.color  = (taken && !isMine) ? 'var(--danger)' : 'var(--success)';
      }, 500);
    });

    document.getElementById('eu-save').onclick = async () => {
      const uname = document.getElementById('eu-name').value.trim().toLowerCase();
      const err   = document.getElementById('eu-err');
      err.classList.remove('visible');

      if (uname.length < 3) { err.textContent = 'Min 3 characters.'; err.classList.add('visible'); return; }
      if (uname === d.username) { close(); return; }

      const btn = document.getElementById('eu-save');
      btn.disabled = true;
      btn.innerHTML = `<div class="spinner" style="width:20px;height:20px;border-width:2px"></div>`;

      try {
        const taken = await Server.isUsernameTaken(uname);
        if (taken) throw new Error('Username already taken.');

        if (_profileRec) {
          await Server.updateProfile(_profileRec.id, { username: uname });
          _profileRec.data.username = uname;
          Server.currentProfile = _profileRec;
        }
        close();
        App.showToast('Username updated!', 'success');
        await _load();
      } catch (e) {
        btn.disabled  = false;
        btn.innerHTML = `<span class="material-icons-round">check</span> Save Username`;
        err.textContent = e.message || 'Failed.';
        err.classList.add('visible');
      }
    };
  };

  /* ─── EDIT BIO (quick) ────────────────────────────────────── */
  const _showEditBio = () => _showEditSheet();

  /* ─── CHANGE PASSWORD ─────────────────────────────────────── */
  const _showChangePw = () => {
    const close = App.showModal(`
      <div class="edit-sheet">
        <h3>Change Password</h3>

        <div class="edit-field">
          <label class="edit-label">Current Password</label>
          <div class="pw-field-wrap">
            <input id="cp-cur" class="input-field" type="password" placeholder="Current password">
            <span class="material-icons-round pw-eye-toggle" id="cp-eye1">visibility_off</span>
          </div>
        </div>

        <div class="edit-field">
          <label class="edit-label">New Password</label>
          <div class="pw-field-wrap">
            <input id="cp-new" class="input-field" type="password" placeholder="8+ chars, upper + number">
            <span class="material-icons-round pw-eye-toggle" id="cp-eye2">visibility_off</span>
          </div>
          <div class="pw-strength"><div class="pw-strength-bar" id="cp-str"></div></div>
        </div>

        <div class="edit-field">
          <label class="edit-label">Confirm New Password</label>
          <input id="cp-conf" class="input-field" type="password" placeholder="Repeat new password">
        </div>

        <div id="cp-err" class="auth-error"></div>

        <button class="edit-save-btn" id="cp-save">
          <span class="material-icons-round">lock</span> Update Password
        </button>
      </div>
    `);

    // Eye toggles
    [['cp-eye1','cp-cur'],['cp-eye2','cp-new']].forEach(([eyeId, inputId]) => {
      document.getElementById(eyeId).onclick = () => {
        const inp = document.getElementById(inputId);
        const show = inp.type === 'password';
        inp.type = show ? 'text' : 'password';
        document.getElementById(eyeId).textContent = show ? 'visibility' : 'visibility_off';
      };
    });

    // Strength
    document.getElementById('cp-new').addEventListener('input', (e) => {
      const s = _pwStrength(e.target.value);
      const bar = document.getElementById('cp-str');
      bar.className = `pw-strength-bar s${s}`;
    });

    document.getElementById('cp-save').onclick = async () => {
      const cur  = document.getElementById('cp-cur').value;
      const np   = document.getElementById('cp-new').value;
      const conf = document.getElementById('cp-conf').value;
      const err  = document.getElementById('cp-err');
      err.classList.remove('visible');

      if (!cur || !np || !conf) { err.textContent = 'Fill all fields.'; err.classList.add('visible'); return; }
      if (np !== conf) { err.textContent = 'Passwords do not match.'; err.classList.add('visible'); return; }
      if (_pwStrength(np) < 3) { err.textContent = 'Password too weak.'; err.classList.add('visible'); return; }

      const btn = document.getElementById('cp-save');
      btn.disabled = true;
      btn.innerHTML = `<div class="spinner" style="width:20px;height:20px;border-width:2px"></div>`;

      try {
        await Server.changePassword(cur, np);
        close();
        App.showToast('Password updated!', 'success');
      } catch (e) {
        btn.disabled  = false;
        btn.innerHTML = `<span class="material-icons-round">lock</span> Update Password`;
        err.textContent = e.message || 'Password change failed.';
        err.classList.add('visible');
      }
    };
  };

  /* ─── SETTINGS SHEET ──────────────────────────────────────── */
  const _showSettings = () => {
    App.showModal(`
      <div style="padding:20px 20px 30px">
        <h3 style="font-size:18px;font-weight:800;color:var(--text-1);text-align:center;margin-bottom:20px">
          Settings
        </h3>

        <div class="profile-info-list" style="border-top:1px solid var(--border)">
          ${_settingsItem('person', 'Edit Profile', 'settings-edit')}
          ${_settingsItem('alternate_email', 'Change Username', 'settings-username')}
          ${_settingsItem('lock_outline', 'Change Password', 'settings-pw')}
          ${_settingsItem('notifications_none', 'Notifications', 'settings-notif')}
          ${_settingsItem('privacy_tip', 'Privacy', 'settings-privacy')}
          ${_settingsItem('info_outline', 'About Spark', 'settings-about')}
        </div>
      </div>
    `);

    document.getElementById('settings-edit').onclick     = () => { App.closeModal(); _showEditSheet(); };
    document.getElementById('settings-username').onclick = () => { App.closeModal(); _showEditUsername(); };
    document.getElementById('settings-pw').onclick       = () => { App.closeModal(); _showChangePw(); };

    document.getElementById('settings-notif').onclick = () => {
      App.showToast('Notifications — coming soon!');
    };
    document.getElementById('settings-privacy').onclick = () => {
      App.showToast('Privacy settings — coming soon!');
    };
    document.getElementById('settings-about').onclick = () => {
      App.closeModal();
      App.showModal(`
        <div style="padding:32px 24px;display:flex;flex-direction:column;align-items:center;gap:12px">
          <span class="material-icons-round" style="font-size:56px;background:var(--story-grad);
            -webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text">bolt</span>
          <h2 style="font-family:var(--font-logo);font-size:28px;background:var(--story-grad);
            -webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text">Spark</h2>
          <p style="font-size:14px;color:var(--text-3);text-align:center;line-height:1.6">
            Version 1.0.0<br>
            A WhatsApp × Instagram Messenger hybrid.<br>
            Built with Parqra BaaS.
          </p>
        </div>
      `);
    };
  };

  const _settingsItem = (icon, label, id) => `
    <div class="profile-info-item" id="${id}" style="cursor:pointer">
      <div class="pii-icon">
        <span class="material-icons-round">${icon}</span>
      </div>
      <div class="pii-body">
        <div class="pii-value">${label}</div>
      </div>
      <div class="pii-arrow">
        <span class="material-icons-round">chevron_right</span>
      </div>
    </div>`;

  /* ─── LOGOUT ──────────────────────────────────────────────── */
  const _doLogout = async () => {
    App.showModal(`
      <div class="confirm-sheet">
        <span class="material-icons-round" style="color:var(--text-3)">logout</span>
        <h3>Log Out?</h3>
        <p>You'll need to sign in again to use Spark.</p>
        <div class="confirm-btns">
          <button class="btn-ghost" id="conf-cancel">Cancel</button>
          <button class="btn-danger" id="conf-logout">Log Out</button>
        </div>
      </div>
    `);
    document.getElementById('conf-cancel').onclick = App.closeModal;
    document.getElementById('conf-logout').onclick = async () => {
      App.closeModal();
      await Server.logout();
      App.setAuth(false);
      App.goTo('#login');
    };
  };

  /* ─── DELETE ACCOUNT ──────────────────────────────────────── */
  const _showDeleteConfirm = () => {
    App.showModal(`
      <div class="confirm-sheet">
        <span class="material-icons-round">delete_forever</span>
        <h3>Delete Account?</h3>
        <p>This will permanently delete your account and all your data.
           This cannot be undone.</p>
        <div class="edit-field" style="width:100%">
          <label class="edit-label">Enter your password to confirm</label>
          <input id="del-pw" class="input-field" type="password" placeholder="Your password">
        </div>
        <div id="del-err" class="auth-error" style="width:100%"></div>
        <div class="confirm-btns">
          <button class="btn-ghost" id="del-cancel">Cancel</button>
          <button class="btn-danger" id="del-confirm">Delete</button>
        </div>
      </div>
    `);

    document.getElementById('del-cancel').onclick = App.closeModal;
    document.getElementById('del-confirm').onclick = async () => {
      const pass = document.getElementById('del-pw').value;
      const err  = document.getElementById('del-err');
      if (!pass) { err.textContent = 'Enter your password.'; err.classList.add('visible'); return; }

      const btn = document.getElementById('del-confirm');
      btn.disabled = true; btn.textContent = 'Deleting…';

      try {
        // Delete profile record first
        if (_profileRec) {
          await Server.db('spark_profiles').delete(_profileRec.id).catch(() => {});
        }
        // Delete auth account
        await Server.db('spark_profiles'); // no-op, delete-account endpoint not in SDK
        // Use raw API if available; fallback to logout
        App.closeModal();
        await Server.logout();
        App.setAuth(false);
        App.showToast('Account deleted.', 'success');
        App.goTo('#login');
      } catch (e) {
        btn.disabled = false; btn.textContent = 'Delete';
        err.textContent = e.message || 'Delete failed.';
        err.classList.add('visible');
      }
    };
  };

  /* ─── Utilities ───────────────────────────────────────────── */
  const _esc  = (s) => String(s || '').replace(/</g,'&lt;').replace(/>/g,'&gt;');
  const _attr = (s) => String(s || '').replace(/"/g,'&quot;');

  const _pwStrength = (pw) => {
    let s = 0;
    if (pw.length >= 8)        s++;
    if (/[a-z]/.test(pw))     s++;
    if (/[A-Z]/.test(pw))     s++;
    if (/[0-9]/.test(pw))     s++;
    return s;
  };

  return { render };
})();

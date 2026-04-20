/**
 * profile.js — Profile Page v6
 *
 * Architecture:
 *  • Left sidebar: profile card (avatar, name, bio, stats) + nav links
 *  • Right panel: sub-page content (Account / Security / Invite / Danger)
 *  • Mobile: sub-pages slide in as full-screen overlays
 *  • Desktop: sub-pages appear in the right panel
 *
 * Sections:
 *  1. Account   — avatar, display name, username, bio
 *  2. Security  — password, privacy toggle
 *  3. Invite    — invite link generation and sharing
 *  4. Danger    — delete account
 */

const ProfilePage = (() => {

  const CACHE_KEY = 'profile_data';
  let _container  = null;
  let _profileRec = null;
  let _activeSection = null;

  const _isDesktop = () => window.matchMedia('(min-width: 768px)').matches;
  const _esc  = (s) => String(s||'').replace(/</g,'&lt;').replace(/>/g,'&gt;');
  const _attr = (s) => String(s||'').replace(/"/g,'&quot;');

  /* ── RENDER ──────────────────────────────────────────────── */
  const render = async (container) => {
    _container = container;
    App.setTitle(null); App.setHeaderActions('');

    if (App.cache.fresh(CACHE_KEY)) {
      _profileRec = App.cache.get(CACHE_KEY);
      _buildShell(_profileRec);
      return;
    }

    container.innerHTML = `
      <div class="profile-shell">
        <div class="profile-sidebar">
          ${App.skel.profile()}
          <div style="padding:0">
            ${[...Array(4)].map(() => `
              <div style="display:flex;align-items:center;gap:14px;padding:14px 20px;border-bottom:1px solid var(--border)">
                <div class="skel" style="width:36px;height:36px;border-radius:10px;flex-shrink:0"></div>
                <div style="flex:1;display:flex;flex-direction:column;gap:6px">
                  <div class="skel" style="height:11px;width:35%"></div>
                  <div class="skel" style="height:14px;width:60%"></div>
                </div>
              </div>`).join('')}
          </div>
        </div>
        <div class="profile-content">
          <div class="profile-content-empty">
            <span class="material-icons-round">manage_accounts</span>
            <h3>Profile Settings</h3>
            <p>Select a section from the left to manage your account</p>
          </div>
        </div>
      </div>`;

    await _load();
  };

  /* ── LOAD ────────────────────────────────────────────────── */
  const _load = async () => {
    const me = Server.currentUser; if (!me) return;
    _profileRec = await Server.getProfile(me.id);
    Server.currentProfile = _profileRec;
    App.cache.set(CACHE_KEY, _profileRec);
    _buildShell(_profileRec);
  };

  /* ── BUILD SHELL ─────────────────────────────────────────── */
  const _buildShell = async (profileRec) => {
    const me  = Server.currentUser; if (!me) return;
    const d   = profileRec?.data || {};
    const displayName = d.display_name || me.display_name || 'User';
    const username    = d.username || '';
    const bio         = d.bio || '';
    const avatarUrl   = d.avatar_url || '';
    const isPrivate   = d.is_private === true;

    let chatCount = 0, commCount = 0;
    try { chatCount = (await Server.getDirectChats(me.id)).length; } catch {}
    try { commCount = (await Server.getCommunities()).filter(r => (r.data.participants||[]).includes(me.id)).length; } catch {}

    _container.innerHTML = `
      <div class="profile-shell">

        <!-- LEFT: Sidebar -->
        <div class="profile-sidebar">
          <!-- Profile card -->
          <div class="prof-card">
            <label class="prof-av-wrap" title="Change photo">
              <div class="prof-av-ring">
                <div class="prof-av-inner">
                  ${avatarUrl
                    ? `<img src="${_attr(avatarUrl)}" alt="${_esc(displayName)}" id="prof-av-img">`
                    : `<div class="prof-av-initial">${displayName[0].toUpperCase()}</div>`}
                </div>
              </div>
              <div class="prof-av-cam"><span class="material-icons-round">photo_camera</span></div>
              <input type="file" accept="image/*" id="av-file-input" style="display:none">
            </label>

            <div class="prof-display-name">${_esc(displayName)}</div>
            <div class="prof-username">
              @${_esc(username)}
              <span class="prof-privacy-badge ${isPrivate ? 'private' : 'public'}">
                ${isPrivate ? ' Private' : ' Public'}
              </span>
            </div>
            ${bio ? `<div class="prof-bio">${_esc(bio)}</div>` : `<div class="prof-bio empty">Tap Account to add a bio…</div>`}

            <div class="prof-stats">
              <div class="prof-stat">
                <div class="prof-stat-num">${chatCount}</div>
                <div class="prof-stat-lbl">Chats</div>
              </div>
              <div class="prof-stat">
                <div class="prof-stat-num">${commCount}</div>
                <div class="prof-stat-lbl">Groups</div>
              </div>
              <div class="prof-stat">
                <div class="prof-stat-num" style="font-size:12px">
                  ${new Date(d.created_at || me.created_at || Date.now()).toLocaleDateString(undefined, { month:'short', year:'numeric' })}
                </div>
                <div class="prof-stat-lbl">Joined</div>
              </div>
            </div>
          </div>

          <!-- Navigation -->
          <nav class="prof-nav">
            <div class="prof-nav-item ${_activeSection==='account'?'active':''}" data-section="account">
              <div class="prof-nav-icon"><span class="material-icons-round">person_outline</span></div>
              <div class="prof-nav-body">
                <div class="prof-nav-label">Account</div>
                <div class="prof-nav-sub">Name, photo, bio, username</div>
              </div>
              <div class="prof-nav-arrow"><span class="material-icons-round">chevron_right</span></div>
            </div>
            <div class="prof-nav-item ${_activeSection==='security'?'active':''}" data-section="security">
              <div class="prof-nav-icon"><span class="material-icons-round">shield_outlined</span></div>
              <div class="prof-nav-body">
                <div class="prof-nav-label">Privacy & Security</div>
                <div class="prof-nav-sub">Password, visibility</div>
              </div>
              <div class="prof-nav-arrow"><span class="material-icons-round">chevron_right</span></div>
            </div>
            <div class="prof-nav-item ${_activeSection==='invite'?'active':''}" data-section="invite">
              <div class="prof-nav-icon"><span class="material-icons-round">link</span></div>
              <div class="prof-nav-body">
                <div class="prof-nav-label">Invite Link</div>
                <div class="prof-nav-sub">Share your personal invite</div>
              </div>
              <div class="prof-nav-arrow"><span class="material-icons-round">chevron_right</span></div>
            </div>
            <div class="prof-nav-item danger ${_activeSection==='danger'?'active':''}" data-section="danger">
              <div class="prof-nav-icon"><span class="material-icons-round">warning_amber</span></div>
              <div class="prof-nav-body">
                <div class="prof-nav-label">Danger Zone</div>
                <div class="prof-nav-sub">Delete account</div>
              </div>
              <div class="prof-nav-arrow"><span class="material-icons-round">chevron_right</span></div>
            </div>
          </nav>

          <!-- Logout -->
          <div class="prof-logout-btn" id="btn-logout">
            <span class="material-icons-round">logout</span>
            Log Out
          </div>

          <div style="padding:12px 20px;font-size:11px;color:var(--text-3);text-align:center">
            Spark v6 · Made with ❤️ using Parqra
          </div>
        </div>

        <!-- RIGHT: Content area -->
        <div class="profile-content" id="prof-content">
          <div class="profile-content-empty">
            <span class="material-icons-round">manage_accounts</span>
            <h3>Profile Settings</h3>
            <p>Select a section from the list to manage your account</p>
          </div>
        </div>
      </div>`;

    /* Avatar change */
    document.getElementById('av-file-input').addEventListener('change', async e => {
      const file = e.target.files[0]; if (!file) return;
      e.target.value = ''; await _uploadAvatar(file);
    });

    /* Nav item clicks */
    document.querySelectorAll('.prof-nav-item[data-section]').forEach(item => {
      item.addEventListener('click', () => _openSection(item.dataset.section));
    });

    /* Logout */
    document.getElementById('btn-logout').addEventListener('click', _doLogout);

    /* Auto-open section on desktop if one was active */
    if (_isDesktop() && _activeSection) _openSection(_activeSection);
  };

  /* ── OPEN SECTION ─────────────────────────────────────────── */
  const _openSection = (section) => {
    _activeSection = section;

    /* Update nav highlights */
    document.querySelectorAll('.prof-nav-item').forEach(el => {
      el.classList.toggle('active', el.dataset.section === section);
    });

    const content = document.getElementById('prof-content');
    if (!content) return;

    if (_isDesktop()) {
      /* Desktop: render directly into the content panel */
      content.innerHTML = _sectionHtml(section);
      _bindSection(section, content);
    } else {
      /* Mobile: create/show a subpage overlay */
      let overlay = document.getElementById('prof-subpage');
      if (!overlay) {
        overlay = document.createElement('div');
        overlay.id = 'prof-subpage';
        overlay.className = 'profile-subpage';
        /* Append inside .profile-shell so it covers the full screen */
        _container.querySelector('.profile-shell').appendChild(overlay);
      }

      overlay.innerHTML = `
        <div class="subpage-header">
          <div class="subpage-back" id="subpage-back-btn">
            <span class="material-icons-round">arrow_back</span>
          </div>
          <div class="subpage-title">${_sectionTitle(section)}</div>
        </div>
        <div class="subpage-body">${_sectionHtml(section)}</div>`;

      requestAnimationFrame(() => overlay.classList.add('open'));
      _bindSection(section, overlay);

      document.getElementById('subpage-back-btn').addEventListener('click', () => {
        overlay.classList.remove('open');
        setTimeout(() => {
          overlay.innerHTML = '';
          _activeSection = null;
          document.querySelectorAll('.prof-nav-item').forEach(el => el.classList.remove('active'));
        }, 300);
      });
    }
  };

  const _sectionTitle = (s) => ({
    account:  'Account',
    security: 'Privacy & Security',
    invite:   'Invite Link',
    danger:   'Danger Zone',
  }[s] || 'Settings');

  /* ── SECTION HTML ─────────────────────────────────────────── */
  const _sectionHtml = (section) => {
    const d = _profileRec?.data || {};
    switch (section) {
      case 'account':  return _accountHtml(d);
      case 'security': return _securityHtml(d);
      case 'invite':   return _inviteHtml();
      case 'danger':   return _dangerHtml();
      default:         return '';
    }
  };

  /* ── Account section HTML ─────────────────────────────────── */
  const _accountHtml = (d) => `
    <div class="account-section">

      <!-- Display Name -->
      <div class="account-field-group">
        <div class="account-field" data-field="name">
          <div class="account-field-icon"><span class="material-icons-round">badge</span></div>
          <div class="account-field-body">
            <div class="account-field-label">Display Name</div>
            <div class="account-field-value">${_esc(d.display_name || 'Not set')}</div>
          </div>
          <div class="account-field-arrow"><span class="material-icons-round">chevron_right</span></div>
        </div>
      </div>

      <!-- Username -->
      <div class="account-field-group">
        <div class="account-field" data-field="username">
          <div class="account-field-icon"><span class="material-icons-round">alternate_email</span></div>
          <div class="account-field-body">
            <div class="account-field-label">Username</div>
            <div class="account-field-value">@${_esc(d.username || 'not set')}</div>
          </div>
          <div class="account-field-arrow"><span class="material-icons-round">chevron_right</span></div>
        </div>
      </div>

      <!-- Bio -->
      <div class="account-field-group">
        <div class="account-field" data-field="bio">
          <div class="account-field-icon"><span class="material-icons-round">notes</span></div>
          <div class="account-field-body">
            <div class="account-field-label">Bio</div>
            <div class="account-field-value ${d.bio ? '' : 'empty'}">${_esc(d.bio || 'Tap to add a bio…')}</div>
          </div>
          <div class="account-field-arrow"><span class="material-icons-round">chevron_right</span></div>
        </div>
      </div>

      <!-- Email -->
      <div class="account-field-group">
        <div class="account-field" style="cursor:default">
          <div class="account-field-icon"><span class="material-icons-round">mail_outline</span></div>
          <div class="account-field-body">
            <div class="account-field-label">Email</div>
            <div class="account-field-value">${_esc(d.email || Server.currentUser?.email || 'Unknown')}</div>
          </div>
          <span class="material-icons-round" style="color:var(--text-3);font-size:18px">lock_outline</span>
        </div>
      </div>
    </div>`;

  /* ── Security section HTML ────────────────────────────────── */
  const _securityHtml = (d) => {
    const isPrivate = d.is_private === true;
    return `
      <div class="security-section">

        <!-- Privacy -->
        <div class="privacy-toggle-row">
          <div class="security-item-icon" style="width:40px;height:40px;border-radius:12px;background:var(--bg-3);display:flex;align-items:center;justify-content:center;flex-shrink:0">
            <span class="material-icons-round" style="color:var(--text-2)">${isPrivate ? 'lock' : 'public'}</span>
          </div>
          <div class="security-item-body">
            <div class="security-item-label">Profile Visibility</div>
            <div class="security-item-desc">${isPrivate ? 'Private — not shown in search results' : 'Public — discoverable by anyone'}</div>
          </div>
          <label class="toggle-switch">
            <input type="checkbox" id="privacy-toggle" ${isPrivate ? '' : 'checked'}>
            <span class="toggle-track"></span>
          </label>
        </div>

        <!-- Change Password -->
        <div class="security-item" data-action="change-password">
          <div class="security-item-icon"><span class="material-icons-round">lock_outline</span></div>
          <div class="security-item-body">
            <div class="security-item-label">Change Password</div>
            <div class="security-item-desc">Update your account password</div>
          </div>
          <div class="security-item-arrow"><span class="material-icons-round">chevron_right</span></div>
        </div>

        <!-- Security Questions info -->
        <div class="security-item" style="cursor:default;opacity:0.6">
          <div class="security-item-icon"><span class="material-icons-round">help_outline</span></div>
          <div class="security-item-body">
            <div class="security-item-label">Security Questions</div>
            <div class="security-item-desc">Set during account creation · used for password recovery</div>
          </div>
          <span class="material-icons-round" style="font-size:18px;color:var(--success)">check_circle</span>
        </div>
      </div>`;
  };

  /* ── Invite section HTML ──────────────────────────────────── */
  const _inviteHtml = () => `
    <div class="invite-section">
      <div class="invite-hero">
        <div class="invite-icon-wrap"><span class="material-icons-round">link</span></div>
        <div class="invite-title">Your Invite Link</div>
        <div class="invite-desc">
          Anyone who taps this link will start a chat with you — even if they need to create an account first.
        </div>
      </div>

      <div class="invite-link-box" id="invite-link-box">
        <span class="material-icons-round" style="color:var(--accent);font-size:18px;flex-shrink:0">link</span>
        <div class="invite-link-text" id="invite-link-text">
          <span class="spinner" style="width:14px;height:14px;border-width:2px;display:inline-block;vertical-align:middle"></span>
          Generating...
        </div>
        <span class="material-icons-round" style="color:var(--text-3);font-size:18px">content_copy</span>
      </div>

      <div class="invite-actions">
        <button class="btn-ghost" id="invite-copy-btn" style="flex:1;display:flex;align-items:center;justify-content:center;gap:6px;font-size:14px">
          <span class="material-icons-round" style="font-size:18px">content_copy</span> Copy
        </button>
        <button class="btn-primary" id="invite-share-btn" style="flex:1;display:flex;align-items:center;justify-content:center;gap:6px;font-size:14px">
          <span class="material-icons-round" style="font-size:18px">share</span> Share
        </button>
      </div>

      <button id="invite-regen-btn" style="background:none;border:none;cursor:pointer;
        font-size:12px;color:var(--text-3);display:flex;align-items:center;justify-content:center;
        gap:4px;font-family:var(--font);padding:6px;width:100%">
        <span class="material-icons-round" style="font-size:14px">refresh</span>
        Regenerate (invalidates old link)
      </button>

      <p style="font-size:11px;color:var(--text-3);line-height:1.5;text-align:center">
        Your link only grants chat access — not your account. You can regenerate it anytime.
      </p>
    </div>`;

  /* ── Danger section HTML ──────────────────────────────────── */
  const _dangerHtml = () => `
    <div class="danger-section">
      <div class="danger-card">
        <div class="danger-card-header">
          <span class="material-icons-round">warning</span> Account Actions
        </div>
        <div class="danger-item" data-action="delete-account">
          <span class="material-icons-round">delete_forever</span>
          <div class="danger-item-body">
            <div class="danger-item-label">Delete Account</div>
            <div class="danger-item-desc">Permanently remove your account and all data</div>
          </div>
          <span class="material-icons-round" style="color:var(--text-3)">chevron_right</span>
        </div>
      </div>

      <p style="font-size:12px;color:var(--text-3);line-height:1.6;padding:4px 0">
        Deleting your account is permanent and cannot be undone. All your messages, statuses,
        and account data will be erased immediately.
      </p>
    </div>`;

  /* ── BIND SECTION ─────────────────────────────────────────── */
  const _bindSection = (section, container) => {
    switch (section) {
      case 'account':  _bindAccount(container); break;
      case 'security': _bindSecurity(container); break;
      case 'invite':   _bindInvite(container); break;
      case 'danger':   _bindDanger(container); break;
    }
  };

  /* ── Bind: Account ────────────────────────────────────────── */
  const _bindAccount = (container) => {
    container.querySelectorAll('.account-field[data-field]').forEach(field => {
      field.addEventListener('click', () => {
        const f = field.dataset.field;
        if (f === 'name')     _editField('Display Name', 'text', _profileRec?.data?.display_name || '', 60, _saveDisplayName);
        if (f === 'username') _editField('Username', 'text', _profileRec?.data?.username || '', 30, _saveUsername, true);
        if (f === 'bio')      _editField('Bio', 'textarea', _profileRec?.data?.bio || '', 120, _saveBio);
      });
    });
  };

  const _editField = (label, type, currentValue, maxLen, saveFn, isUsername = false) => {
    let checkTimer = null;
    const close = App.showModal(`
      <div class="edit-field-sheet">
        <h3>Edit ${label}</h3>
        <div>
          ${type === 'textarea'
            ? `<textarea id="ef-input" class="input-field" rows="4" maxlength="${maxLen}"
                style="resize:none;min-height:100px">${_attr(currentValue)}</textarea>
               <div style="font-size:11px;color:var(--text-3);text-align:right;margin-top:4px">
                 <span id="ef-count">${currentValue.length}</span>/${maxLen}
               </div>`
            : `<input id="ef-input" class="input-field" type="text" value="${_attr(currentValue)}"
                maxlength="${maxLen}" ${isUsername ? 'style="text-transform:lowercase"' : ''}>
               ${isUsername ? '<div id="ef-username-hint" style="font-size:11px;color:var(--text-3);padding-top:4px"></div>' : ''}`
          }
        </div>
        <div id="ef-err" class="auth-error"></div>
        <button class="field-save-btn" id="ef-save">
          <span class="material-icons-round">check</span> Save
        </button>
      </div>`);

    const inp = document.getElementById('ef-input');
    if (!inp) return;
    inp.focus();

    if (type === 'textarea') {
      const cnt = document.getElementById('ef-count');
      inp.addEventListener('input', () => {
        if (inp.value.length > maxLen) inp.value = inp.value.slice(0, maxLen);
        if (cnt) cnt.textContent = inp.value.length;
      });
    }

    if (isUsername) {
      inp.addEventListener('input', e => {
        e.target.value = e.target.value.replace(/[^a-z0-9._]/gi, '').toLowerCase();
        const hint = document.getElementById('ef-username-hint'); if (!hint) return;
        clearTimeout(checkTimer);
        if (e.target.value.length < 3) { hint.textContent = ''; return; }
        hint.textContent = 'Checking…'; hint.style.color = 'var(--text-3)';
        checkTimer = setTimeout(async () => {
          const taken = await Server.isUsernameTaken(e.target.value);
          const isMine = e.target.value === (_profileRec?.data?.username || '');
          hint.textContent = isMine ? '✓ Your current username' : taken ? '✗ Username taken' : '✓ Available';
          hint.style.color = (taken && !isMine) ? 'var(--danger)' : 'var(--success)';
        }, 500);
      });
    }

    document.getElementById('ef-save').addEventListener('click', async () => {
      const val = inp.value.trim();
      const errEl = document.getElementById('ef-err'); errEl.classList.remove('visible');
      const btn = document.getElementById('ef-save');
      btn.disabled = true;
      btn.innerHTML = `<div class="spinner" style="width:20px;height:20px;border-width:2px"></div>`;
      try {
        await saveFn(val);
        close(); await _load();
      } catch (e) {
        btn.disabled = false;
        btn.innerHTML = `<span class="material-icons-round">check</span> Save`;
        errEl.textContent = e.message || 'Save failed.';
        errEl.classList.add('visible');
      }
    });
  };

  const _saveDisplayName = async (name) => {
    if (!name) throw new Error('Display name is required.');
    if (!_profileRec) throw new Error('No profile loaded.');
    await Server.updateProfile(_profileRec.id, { display_name: name });
    _profileRec.data.display_name = name;
    Server.currentProfile = _profileRec;
    App.cache.set(CACHE_KEY, _profileRec);
    App.showToast('Name updated!', 'success');
  };

  const _saveUsername = async (uname) => {
    if (!uname || uname.length < 3) throw new Error('Username must be at least 3 characters.');
    if (uname === _profileRec?.data?.username) return;
    const taken = await Server.isUsernameTaken(uname);
    if (taken) throw new Error('Username already taken. Choose another.');
    if (!_profileRec) throw new Error('No profile loaded.');
    await Server.updateProfile(_profileRec.id, { username: uname });
    _profileRec.data.username = uname;
    Server.currentProfile = _profileRec;
    App.cache.set(CACHE_KEY, _profileRec);
    App.showToast('Username updated!', 'success');
  };

  const _saveBio = async (bio) => {
    if (!_profileRec) throw new Error('No profile loaded.');
    await Server.updateProfile(_profileRec.id, { bio });
    _profileRec.data.bio = bio;
    Server.currentProfile = _profileRec;
    App.cache.set(CACHE_KEY, _profileRec);
    App.showToast('Bio updated!', 'success');
  };

  /* ── Bind: Security ───────────────────────────────────────── */
  const _bindSecurity = (container) => {
    /* Privacy toggle */
    const toggle = container.querySelector('#privacy-toggle');
    if (toggle) {
      toggle.addEventListener('change', async () => {
        const isPublic = toggle.checked;  // checked = Public
        const isPrivate = !isPublic;
        try {
          if (_profileRec) {
            await Server.updateProfile(_profileRec.id, { is_private: isPrivate });
            _profileRec.data.is_private = isPrivate;
            Server.currentProfile = _profileRec;
            App.cache.set(CACHE_KEY, _profileRec);
          }
          App.showToast(isPrivate ? 'Profile set to Private' : 'Profile set to Public', 'success');
          // Refresh sidebar badge
          const badge = document.querySelector('.prof-privacy-badge');
          if (badge) {
            badge.className = `prof-privacy-badge ${isPrivate ? 'private' : 'public'}`;
            badge.textContent = isPrivate ? '🔒 Private' : '🌐 Public';
          }
        } catch { App.showToast('Failed to update privacy', 'error'); }
      });
    }

    /* Change password */
    container.querySelector('[data-action="change-password"]')?.addEventListener('click', _showChangePw);
  };

  /* ── Bind: Invite ─────────────────────────────────────────── */
  const _bindInvite = async (container) => {
    let _link = '';

    const _gen = async () => {
      const textEl = container.querySelector('#invite-link-text');
      if (textEl) textEl.innerHTML = `<span class="spinner" style="width:14px;height:14px;border-width:2px;display:inline-block;vertical-align:middle"></span> Generating...`;
      try {
        _link = await Server.generateInviteLink();
        if (textEl) textEl.textContent = _link;
      } catch (e) { App.showToast(e.message || 'Failed to generate link', 'error'); }
    };

    await _gen();

    const _doCopy = () => {
      if (!_link) return;
      navigator.clipboard?.writeText(_link)
        .then(() => App.showToast('Invite link copied!', 'success'))
        .catch(() => App.showToast('Link: ' + _link));
    };

    container.querySelector('#invite-link-box')?.addEventListener('click', _doCopy);
    container.querySelector('#invite-copy-btn')?.addEventListener('click', _doCopy);
    container.querySelector('#invite-share-btn')?.addEventListener('click', () => {
      if (!_link) return;
      if (navigator.share) {
        navigator.share({ title: 'Chat with me on Spark', text: 'Tap to start a chat with me on Spark!', url: _link }).catch(() => {});
      } else { _doCopy(); }
    });
    container.querySelector('#invite-regen-btn')?.addEventListener('click', _gen);
  };

  /* ── Bind: Danger ─────────────────────────────────────────── */
  const _bindDanger = (container) => {
    container.querySelector('[data-action="delete-account"]')?.addEventListener('click', _showDeleteConfirm);
  };

  /* ── AVATAR UPLOAD ────────────────────────────────────────── */
  const _uploadAvatar = async (file) => {
    App.showToast('Uploading photo…');
    try {
      const url = await Server.uploadAvatar(file); if (!url) throw new Error();
      if (_profileRec) {
        await Server.updateProfile(_profileRec.id, { avatar_url: url });
        _profileRec.data.avatar_url = url;
        Server.currentProfile = _profileRec;
        App.cache.set(CACHE_KEY, _profileRec);
      }
      App.showToast('Photo updated!', 'success');
      await _load();
    } catch { App.showToast('Upload failed', 'error'); }
  };

  /* ── CHANGE PASSWORD ──────────────────────────────────────── */
  const _showChangePw = () => {
    const _pwStr = (pw) => {
      let s = 0;
      if (pw.length >= 8) s++; if (/[a-z]/.test(pw)) s++; if (/[A-Z]/.test(pw)) s++; if (/[0-9]/.test(pw)) s++;
      return s;
    };
    const close = App.showModal(`
      <div class="edit-field-sheet">
        <h3>Change Password</h3>
        <div>
          <label style="display:block;font-size:12px;font-weight:700;color:var(--text-2);text-transform:uppercase;margin-bottom:6px">Current Password</label>
          <input id="cp-cur" class="input-field" type="password" placeholder="Current password">
        </div>
        <div>
          <label style="display:block;font-size:12px;font-weight:700;color:var(--text-2);text-transform:uppercase;margin-bottom:6px">New Password</label>
          <input id="cp-new" class="input-field" type="password" placeholder="Min 8 chars, upper + number">
          <div class="pw-strength"><div class="pw-strength-bar" id="cp-str"></div></div>
        </div>
        <div>
          <label style="display:block;font-size:12px;font-weight:700;color:var(--text-2);text-transform:uppercase;margin-bottom:6px">Confirm New Password</label>
          <input id="cp-conf" class="input-field" type="password" placeholder="Repeat new password">
        </div>
        <div id="cp-err" class="auth-error"></div>
        <button class="field-save-btn" id="cp-save">
          <span class="material-icons-round">lock</span> Update Password
        </button>
      </div>`);

    document.getElementById('cp-new').addEventListener('input', e => {
      document.getElementById('cp-str').className = `pw-strength-bar s${_pwStr(e.target.value)}`;
    });

    document.getElementById('cp-save').addEventListener('click', async () => {
      const cur = document.getElementById('cp-cur').value;
      const np  = document.getElementById('cp-new').value;
      const conf = document.getElementById('cp-conf').value;
      const err  = document.getElementById('cp-err'); err.classList.remove('visible');
      if (!cur || !np || !conf) { err.textContent = 'Fill all fields.'; err.classList.add('visible'); return; }
      if (np !== conf) { err.textContent = 'Passwords do not match.'; err.classList.add('visible'); return; }
      if (_pwStr(np) < 3) { err.textContent = 'Password too weak.'; err.classList.add('visible'); return; }
      const btn = document.getElementById('cp-save'); btn.disabled = true;
      btn.innerHTML = `<div class="spinner" style="width:20px;height:20px;border-width:2px"></div>`;
      try {
        await Server.changePassword(cur, np);
        close(); App.showToast('Password updated!', 'success');
      } catch (e) {
        btn.disabled = false; btn.innerHTML = `<span class="material-icons-round">lock</span> Update Password`;
        err.textContent = e.message || 'Failed.'; err.classList.add('visible');
      }
    });
  };

  /* ── LOGOUT ───────────────────────────────────────────────── */
  const _doLogout = async () => {
    App.showModal(`
      <div style="padding:28px 20px 32px;display:flex;flex-direction:column;align-items:center;gap:16px;text-align:center">
        <span class="material-icons-round" style="font-size:48px;color:var(--text-3)">logout</span>
        <h3 style="font-size:20px;font-weight:800;color:var(--text-1)">Log Out?</h3>
        <p style="font-size:13px;color:var(--text-3)">You'll need to sign in again to use Spark.</p>
        <div style="display:flex;gap:10px;width:100%">
          <button class="btn-ghost" id="conf-cancel" style="flex:1">Cancel</button>
          <button class="btn-danger" id="conf-logout" style="flex:1">Log Out</button>
        </div>
      </div>`);
    document.getElementById('conf-cancel').onclick = App.closeModal;
    document.getElementById('conf-logout').onclick = async () => {
      App.closeModal();
      await Server.logout();
      App.cache.clear();
      App.setAuth(false);
      App.goTo('#login');
    };
  };

  /* ── DELETE ACCOUNT ───────────────────────────────────────── */
  const _showDeleteConfirm = () => {
    App.showModal(`
      <div style="padding:28px 20px 32px;display:flex;flex-direction:column;align-items:center;gap:16px;text-align:center">
        <span class="material-icons-round" style="font-size:48px;color:var(--danger)">delete_forever</span>
        <h3 style="font-size:20px;font-weight:800;color:var(--text-1)">Delete Account?</h3>
        <p style="font-size:13px;color:var(--text-3)">This permanently deletes your account and all data. This cannot be undone.</p>
        <div style="width:100%">
          <label style="display:block;font-size:12px;font-weight:700;color:var(--text-2);margin-bottom:6px;text-align:left">Enter password to confirm</label>
          <input id="del-pw" class="input-field" type="password" placeholder="Your password">
        </div>
        <div id="del-err" class="auth-error"></div>
        <div style="display:flex;gap:10px;width:100%">
          <button class="btn-ghost" id="del-cancel" style="flex:1">Cancel</button>
          <button class="btn-danger" id="del-confirm" style="flex:1">Delete Forever</button>
        </div>
      </div>`);
    document.getElementById('del-cancel').onclick = App.closeModal;
    document.getElementById('del-confirm').onclick = async () => {
      const pass = document.getElementById('del-pw').value;
      const err  = document.getElementById('del-err');
      if (!pass) { err.textContent = 'Enter your password.'; err.classList.add('visible'); return; }
      const btn = document.getElementById('del-confirm'); btn.disabled = true; btn.textContent = 'Deleting…';
      try {
        if (_profileRec) await Server.db('spark_profiles').delete(_profileRec.id).catch(() => {});
        App.closeModal(); await Server.logout();
        App.cache.clear(); App.setAuth(false);
        App.showToast('Account deleted.', 'success'); App.goTo('#login');
      } catch (e) {
        btn.disabled = false; btn.textContent = 'Delete Forever';
        err.textContent = e.message || 'Delete failed.'; err.classList.add('visible');
      }
    };
  };

  return { render };
})();
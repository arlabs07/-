/**
 * login.js — Auth UI v6
 * Adds: renderGuestInvite() — landing page for non-auth users
 * arriving via invite link. Primary CTA is "Sign Up", not login.
 */

const LoginPage = (() => {

  const SECURITY_QUESTIONS = [
    "What is your childhood nickname?",
    "What is the name of your first pet?",
    "What city were you born in?",
    "What is your mother's maiden name?",
    "What was the name of your elementary school?",
    "What was your childhood dream job?",
    "What is the name of your favorite childhood friend?",
    "What street did you grow up on?"
  ];

  let _container = null;

  const setError = (id, msg) => {
    const el = document.getElementById(id); if (!el) return;
    el.textContent = msg; el.classList.toggle('visible', !!msg);
  };

  const setLoading = (btnId, loading) => {
    const btn = document.getElementById(btnId); if (!btn) return;
    btn.disabled = loading;
    btn.innerHTML = loading
      ? `<span class="spinner" style="width:20px;height:20px;border-width:2px"></span>`
      : btn.dataset.label || btn.textContent;
  };

  const pwStrength = (pass) => {
    let score = 0;
    if (pass.length >= 8) score++; if (/[a-z]/.test(pass)) score++;
    if (/[A-Z]/.test(pass)) score++; if (/[0-9]/.test(pass)) score++;
    return score;
  };

  const questionsOptions = () => SECURITY_QUESTIONS.map(q => `<option value="${q}">${q}</option>`).join('');

  /* ─── GUEST INVITE LANDING ────────────────────────────────── */
  const renderGuestInvite = (container, token, inviterName) => {
    _container = container;
    const esc = (s) => String(s||'').replace(/</g,'&lt;').replace(/>/g,'&gt;');

    container.innerHTML = `
      <div class="auth-wrap" style="gap:0">
        <!-- Logo -->
        <div class="auth-hero" style="margin-bottom:28px">
          <span class="material-icons-round auth-bolt">bolt</span>
          <span class="auth-logo">Spark</span>
        </div>

        <!-- Invite card -->
        <div style="background:var(--glass-light);backdrop-filter:blur(20px);-webkit-backdrop-filter:blur(20px);
          border:1px solid var(--glass-border);border-radius:var(--radius-lg);
          padding:28px 24px;text-align:center;margin-bottom:28px">
          <div style="width:56px;height:56px;border-radius:50%;background:var(--glass-mid);
            display:flex;align-items:center;justify-content:center;margin:0 auto 14px;
            font-size:26px;font-weight:800;color:var(--text-1)">
            ${esc(inviterName[0] || '?').toUpperCase()}
          </div>
          <div style="font-size:20px;font-weight:800;color:var(--text-1);margin-bottom:6px">
            You're invited!
          </div>
          <div style="font-size:14px;color:var(--text-2);line-height:1.55;margin-bottom:4px">
            <strong style="color:var(--text-1)">${esc(inviterName)}</strong>
            wants to chat with you on Spark.
          </div>
        </div>

        <!-- Guest name input -->
        <div style="margin-bottom:16px">
          <div style="font-size:11px;font-weight:700;color:var(--text-3);
            text-transform:uppercase;letter-spacing:0.5px;margin-bottom:8px">
            Your display name
          </div>
          <input id="gi-name" class="input-field" type="text"
            placeholder="Enter your name…" maxlength="40" autocomplete="name">
        </div>

        <div id="gi-error" class="auth-error" style="margin-bottom:12px"></div>

        <!-- Chat as Guest -->
        <button id="gi-guest-btn" class="auth-submit" data-label="Continue as Guest"
          style="margin-bottom:12px">
          Continue as Guest
        </button>

        <!-- Divider -->
        <div style="display:flex;align-items:center;gap:12px;margin-bottom:16px">
          <div style="flex:1;height:1px;background:var(--glass-border)"></div>
          <span style="font-size:12px;color:var(--text-3);font-weight:600">or</span>
          <div style="flex:1;height:1px;background:var(--glass-border)"></div>
        </div>

        <!-- Sign Up CTA -->
        <button id="gi-signup-btn"
          style="width:100%;padding:14px;background:var(--text-1);color:#050505;
            font-family:var(--font);font-size:15px;font-weight:700;border:none;
            border-radius:var(--radius-md);cursor:pointer;display:flex;
            align-items:center;justify-content:center;gap:8px;
            margin-bottom:14px;transition:opacity 0.15s">
          <span class="material-icons-round" style="font-size:18px">person_add</span>
          Create Account — it's free
        </button>

        <!-- Already have account -->
        <div style="text-align:center;font-size:13px;color:var(--text-3)">
          Already have an account?
          <span id="gi-login-link" style="color:var(--text-2);font-weight:700;cursor:pointer">
            Sign In
          </span>
        </div>

        <!-- Guest feature notice -->
        <div style="margin-top:24px;padding:14px;background:var(--glass-thin);
          border-radius:var(--radius-md);border:1px solid var(--glass-border)">
          <div style="font-size:11px;font-weight:700;color:var(--text-3);text-transform:uppercase;letter-spacing:0.5px;margin-bottom:8px">Guest mode</div>
          <div style="font-size:12px;color:var(--text-3);line-height:1.55">
            Text messaging only · Photos & files require an account ·
            Messages won't be saved when you leave
          </div>
        </div>
      </div>`;

    // Guest chat
    document.getElementById('gi-guest-btn').onclick = async () => {
      const name = document.getElementById('gi-name').value.trim();
      if (!name) {
        setError('gi-error', 'Please enter your name to continue.');
        return;
      }
      setLoading('gi-guest-btn', true);
      try {
        // Set up guest mode
        App.setGuest(name);
        // Try to resolve invite and start chat
        const chatId = await Server.acceptInvite(token).catch(() => null);
        App.cache.dirty('chats_threads');
        window.location.hash = chatId ? `#chats/${chatId}` : '#chats';
      } catch (e) {
        App.clearGuest();
        setError('gi-error', e.message || 'Could not join. Please try again.');
        setLoading('gi-guest-btn', false);
      }
    };

    // Sign up
    document.getElementById('gi-signup-btn').onclick = () => {
      // Token already in sessionStorage; signup flow will pick it up
      App.goTo('#signup');
    };

    // Sign in
    document.getElementById('gi-login-link').onclick = () => {
      App.goTo('#login');
    };

    // Enter key on name field
    document.getElementById('gi-name').addEventListener('keydown', e => {
      if (e.key === 'Enter') document.getElementById('gi-guest-btn').click();
    });
  };

  /* ─── LOGIN ──────────────────────────────────────────────── */
  const renderLogin = () => {
    _container.innerHTML = `
      <div class="auth-wrap">
        <div class="auth-hero">
          <span class="material-icons-round auth-bolt">bolt</span>
          <span class="auth-logo">Spark</span>
          <span class="auth-tagline">Connect Instantly</span>
        </div>
        <h2 class="auth-heading">Welcome back</h2>
        <p class="auth-sub">Sign in to your account</p>
        <div class="auth-form">
          <div id="login-error" class="auth-error"></div>
          <div class="auth-field">
            <label class="auth-label">Email</label>
            <input id="li-email" class="auth-input" type="email" placeholder="you@example.com" autocomplete="email">
          </div>
          <div class="auth-field">
            <label class="auth-label">Password</label>
            <div class="pw-field">
              <input id="li-pass" class="auth-input" type="password" placeholder="Your password" autocomplete="current-password">
              <span class="material-icons-round pw-toggle" id="li-eye">visibility_off</span>
            </div>
          </div>
          <button id="li-submit" class="auth-submit" data-label="Sign in">Sign in</button>
        </div>
        <div class="auth-footer">
          <div class="auth-link">Forgot your password? <span id="go-forgot">Reset it</span></div>
          <div class="auth-link">Don't have an account? <span id="go-signup">Sign up</span></div>
        </div>
      </div>`;

    const eye = document.getElementById('li-eye'); const pw = document.getElementById('li-pass');
    eye.onclick = () => { const show = pw.type === 'password'; pw.type = show ? 'text' : 'password'; eye.textContent = show ? 'visibility' : 'visibility_off'; };
    document.getElementById('go-forgot').onclick = () => App.goTo('#forgot');
    document.getElementById('go-signup').onclick = () => App.goTo('#signup');

    const doLogin = async () => {
      const email = document.getElementById('li-email').value.trim();
      const pass  = document.getElementById('li-pass').value;
      setError('login-error', '');
      if (!email || !pass) { setError('login-error', 'Please fill in all fields.'); return; }
      setLoading('li-submit', true);
      try {
        const res = await Server.login(email, pass);
        if (!res || !res.user) throw new Error('Invalid credentials');
        Server.currentUser = res.user;
        const profile = await Server.getProfile(res.user.id);
        Server.currentProfile = profile;
        App.setAuth(true);
        App.showToast('Welcome back!', 'success');
        await App.checkPendingInvite();
        if (window.location.hash.startsWith('#chats') || window.location.hash === '') {
          App.goTo('#chats');
        }
      } catch (e) {
        setError('login-error', e.message || 'Login failed. Check your credentials.');
      } finally { setLoading('li-submit', false); }
    };

    document.getElementById('li-submit').onclick = doLogin;
    document.getElementById('li-pass').addEventListener('keydown', e => { if (e.key === 'Enter') doLogin(); });
  };

  /* ─── SIGNUP ─────────────────────────────────────────────── */
  const renderSignup = () => {
    _container.innerHTML = `
      <div class="auth-wrap">
        <div class="auth-hero">
          <span class="material-icons-round auth-bolt">bolt</span>
          <span class="auth-logo">Spark</span>
        </div>
        <h2 class="auth-heading">Create account</h2>
        <p class="auth-sub">Join Spark and connect with anyone</p>
        <div class="auth-form">
          <div id="su-error" class="auth-error"></div>
          <div class="auth-field">
            <label class="auth-label">Full Name</label>
            <input id="su-name" class="auth-input" type="text" placeholder="John Doe" autocomplete="name">
          </div>
          <div class="auth-field">
            <label class="auth-label">Username</label>
            <input id="su-user" class="auth-input" type="text" placeholder="@johndoe" autocomplete="username" style="text-transform:lowercase">
            <span id="su-user-hint" style="font-size:11px;color:var(--text-3);padding-left:2px"></span>
          </div>
          <div class="auth-field">
            <label class="auth-label">Email</label>
            <input id="su-email" class="auth-input" type="email" placeholder="you@example.com" autocomplete="email">
          </div>
          <div class="auth-field">
            <label class="auth-label">Password</label>
            <div class="pw-field">
              <input id="su-pass" class="auth-input" type="password" placeholder="Min 8 chars, upper + number" autocomplete="new-password">
              <span class="material-icons-round pw-toggle" id="su-eye">visibility_off</span>
            </div>
            <div class="pw-strength"><div class="pw-strength-bar" id="su-strength-bar"></div></div>
          </div>
          <div class="auth-field">
            <label class="auth-label">Confirm Password</label>
            <input id="su-pass2" class="auth-input" type="password" placeholder="Repeat your password" autocomplete="new-password">
          </div>
          <div class="sq-group">
            <div class="sq-section-title"><span class="material-icons-round">shield</span>Security Questions (required for recovery)</div>
            <div><label>Question 1</label><select id="sq1-q"><option value="">Choose a question…</option>${questionsOptions()}</select></div>
            <div><input id="sq1-a" type="text" placeholder="Your answer" autocomplete="off"></div>
            <div style="margin-top:10px"><label>Question 2</label><select id="sq2-q"><option value="">Choose a question…</option>${questionsOptions()}</select></div>
            <div><input id="sq2-a" type="text" placeholder="Your answer" autocomplete="off"></div>
          </div>
          <button id="su-submit" class="auth-submit" data-label="Create Account">Create Account</button>
        </div>
        <div class="auth-footer">
          <div class="auth-link">Already have an account? <span id="go-login">Sign in</span></div>
        </div>
      </div>`;

    const eye = document.getElementById('su-eye'); const pw = document.getElementById('su-pass');
    eye.onclick = () => { const show = pw.type === 'password'; pw.type = show ? 'text' : 'password'; eye.textContent = show ? 'visibility' : 'visibility_off'; };
    pw.addEventListener('input', () => { const bar = document.getElementById('su-strength-bar'); bar.className = `pw-strength-bar s${pwStrength(pw.value)}`; });

    let _uTimer = null;
    document.getElementById('su-user').addEventListener('input', e => {
      const hint = document.getElementById('su-user-hint');
      e.target.value = e.target.value.replace(/[^a-z0-9._]/gi, '').toLowerCase();
      clearTimeout(_uTimer);
      if (e.target.value.length < 3) { hint.textContent = ''; return; }
      hint.textContent = 'Checking…';
      _uTimer = setTimeout(async () => {
        const taken = await Server.isUsernameTaken(e.target.value);
        hint.style.color  = taken ? 'var(--danger)' : 'var(--success)';
        hint.textContent  = taken ? '✗ Username taken' : '✓ Available';
      }, 500);
    });

    document.getElementById('go-login').onclick = () => App.goTo('#login');
    document.getElementById('su-submit').onclick = async () => {
      setError('su-error', '');
      const name  = document.getElementById('su-name').value.trim();
      const uname = document.getElementById('su-user').value.trim().toLowerCase();
      const email = document.getElementById('su-email').value.trim();
      const pass  = document.getElementById('su-pass').value;
      const pass2 = document.getElementById('su-pass2').value;
      const sq1q  = document.getElementById('sq1-q').value;
      const sq1a  = document.getElementById('sq1-a').value.trim();
      const sq2q  = document.getElementById('sq2-q').value;
      const sq2a  = document.getElementById('sq2-a').value.trim();

      if (!name || !uname || !email || !pass || !pass2) return setError('su-error', 'Please fill in all required fields.');
      if (uname.length < 3) return setError('su-error', 'Username must be at least 3 characters.');
      if (pass !== pass2) return setError('su-error', 'Passwords do not match.');
      if (pwStrength(pass) < 3) return setError('su-error', 'Password must be at least 8 characters with uppercase and a number.');
      if (!sq1q || !sq1a || !sq2q || !sq2a) return setError('su-error', 'Both security questions and answers are required.');
      if (sq1q === sq2q) return setError('su-error', 'Please choose two different security questions.');

      setLoading('su-submit', true);
      try {
        const taken = await Server.isUsernameTaken(uname);
        if (taken) { setError('su-error', 'Username already taken. Choose another.'); return; }
        const res = await Server.signUp(email, pass, name, uname, [{ question: sq1q, answer: sq1a }, { question: sq2q, answer: sq2a }]);
        if (!res || !res.user) throw new Error('Signup failed.');
        const profile = await Server.getProfile(res.user.id);
        Server.currentProfile = profile;
        App.clearGuest(); // clear any guest session
        App.setAuth(true);
        App.showToast('Welcome to Spark! 🎉', 'success', 4000);
        await App.checkPendingInvite();
        if (window.location.hash.startsWith('#chats') || window.location.hash === '') {
          App.goTo('#chats');
        }
      } catch (e) {
        setError('su-error', e.message || 'Signup failed. Please try again.');
      } finally { setLoading('su-submit', false); }
    };
  };

  /* ─── FORGOT PASSWORD ────────────────────────────────────── */
  let _forgotState = {};
  const renderForgot = () => { _forgotState = { step: 1, email: '', questionId: '', resetToken: '' }; renderForgotStep1(); };
  const stepDots = (active) => [1,2,3].map(i => `<div class="step-dot ${i < active ? 'done' : i === active ? 'active' : ''}"></div>`).join('');

  const renderForgotStep1 = () => {
    _container.innerHTML = `
      <div class="auth-wrap">
        <div class="step-indicator">${stepDots(1)}</div>
        <h2 class="auth-heading">Reset Password</h2>
        <p class="auth-sub">Enter the email address linked to your account</p>
        <div class="auth-form">
          <div id="fp1-error" class="auth-error"></div>
          <div class="auth-field"><label class="auth-label">Email</label><input id="fp1-email" class="auth-input" type="email" placeholder="you@example.com"></div>
          <button id="fp1-submit" class="auth-submit" data-label="Continue">Continue</button>
        </div>
        <div class="auth-footer"><div class="auth-link">Remembered it? <span id="go-login2">Sign in</span></div></div>
      </div>`;
    document.getElementById('go-login2').onclick = () => App.goTo('#login');
    document.getElementById('fp1-submit').onclick = async () => {
      const email = document.getElementById('fp1-email').value.trim();
      if (!email) return setError('fp1-error', 'Enter your email address.');
      setLoading('fp1-submit', true);
      try {
        const res = await Server.forgotPassword(email);
        if (!res.success || !res.question_id) { setError('fp1-error', 'Email not found or no security questions set.'); return; }
        _forgotState.email = email; _forgotState.questionId = res.question_id; _forgotState.question = res.question;
        renderForgotStep2();
      } catch (e) { setError('fp1-error', e.message || 'Could not find account.'); }
      finally { setLoading('fp1-submit', false); }
    };
  };

  const renderForgotStep2 = () => {
    _container.innerHTML = `
      <div class="auth-wrap">
        <div class="step-indicator">${stepDots(2)}</div>
        <h2 class="auth-heading">Security Check</h2>
        <p class="auth-sub">Answer your security question</p>
        <div class="auth-form">
          <div id="fp2-error" class="auth-error"></div>
          <div class="sq-card"><p class="question-text">${_forgotState.question}</p><input id="fp2-answer" class="auth-input" type="text" placeholder="Your answer" autocomplete="off"></div>
          <button id="fp2-submit" class="auth-submit" data-label="Verify Answer">Verify Answer</button>
        </div>
      </div>`;
    document.getElementById('fp2-submit').onclick = async () => {
      const answer = document.getElementById('fp2-answer').value.trim();
      if (!answer) return setError('fp2-error', 'Enter your answer.');
      setLoading('fp2-submit', true);
      try {
        const res = await Server.verifyAnswer(_forgotState.email, _forgotState.questionId, answer);
        if (!res.success || !res.reset_token) throw new Error('Incorrect answer.');
        _forgotState.resetToken = res.reset_token; renderForgotStep3();
      } catch (e) { setError('fp2-error', e.message || 'Incorrect answer. Try again.'); }
      finally { setLoading('fp2-submit', false); }
    };
  };

  const renderForgotStep3 = () => {
    _container.innerHTML = `
      <div class="auth-wrap">
        <div class="step-indicator">${stepDots(3)}</div>
        <h2 class="auth-heading">New Password</h2>
        <p class="auth-sub">Choose a strong new password</p>
        <div class="auth-form">
          <div id="fp3-error" class="auth-error"></div>
          <div class="auth-field">
            <label class="auth-label">New Password</label>
            <div class="pw-field">
              <input id="fp3-pass" class="auth-input" type="password" placeholder="New password">
              <span class="material-icons-round pw-toggle" id="fp3-eye">visibility_off</span>
            </div>
            <div class="pw-strength"><div class="pw-strength-bar" id="fp3-strength-bar"></div></div>
          </div>
          <div class="auth-field"><label class="auth-label">Confirm Password</label><input id="fp3-pass2" class="auth-input" type="password" placeholder="Repeat new password"></div>
          <button id="fp3-submit" class="auth-submit" data-label="Reset Password">Reset Password</button>
        </div>
      </div>`;
    const eye = document.getElementById('fp3-eye'); const pw = document.getElementById('fp3-pass');
    eye.onclick = () => { const show = pw.type === 'password'; pw.type = show ? 'text' : 'password'; eye.textContent = show ? 'visibility' : 'visibility_off'; };
    pw.addEventListener('input', () => { document.getElementById('fp3-strength-bar').className = `pw-strength-bar s${pwStrength(pw.value)}`; });
    document.getElementById('fp3-submit').onclick = async () => {
      const pass = document.getElementById('fp3-pass').value; const pass2 = document.getElementById('fp3-pass2').value;
      if (!pass || !pass2) return setError('fp3-error', 'Fill in both fields.');
      if (pass !== pass2) return setError('fp3-error', 'Passwords do not match.');
      if (pwStrength(pass) < 3) return setError('fp3-error', 'Password too weak.');
      setLoading('fp3-submit', true);
      try {
        const res = await Server.resetPassword(_forgotState.resetToken, pass);
        if (res.success) { App.showToast('Password reset! Please sign in.', 'success'); App.goTo('#login'); }
        else throw new Error('Reset failed.');
      } catch (e) { setError('fp3-error', e.message || 'Reset failed. The link may have expired.'); }
      finally { setLoading('fp3-submit', false); }
    };
  };

  const render = (container, view, param) => {
    _container = container;
    App.showNav(false); App.setTitle(null, false); App.setHeaderActions('');
    switch (view) {
      case 'signup':       renderSignup(); break;
      case 'forgot':       renderForgot(); break;
      case 'guest-invite': renderGuestInvite(container, param, 'Someone'); break;
      default:             renderLogin();  break;
    }
  };

  return { render, renderGuestInvite };
})();
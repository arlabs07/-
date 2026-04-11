/**
 * login.js — Authentication UI: Login / Signup / Forgot / Reset
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

  /* ─── Utilities ──────────────────────────────────────────── */
  const setError = (id, msg) => {
    const el = document.getElementById(id);
    if (!el) return;
    el.textContent = msg;
    el.classList.toggle('visible', !!msg);
  };

  const setLoading = (btnId, loading) => {
    const btn = document.getElementById(btnId);
    if (!btn) return;
    btn.disabled = loading;
    btn.innerHTML = loading
      ? `<span class="spinner" style="width:20px;height:20px;border-width:2px"></span>`
      : btn.dataset.label || btn.textContent;
  };

  const pwStrength = (pass) => {
    let score = 0;
    if (pass.length >= 8)                    score++;
    if (/[a-z]/.test(pass))                 score++;
    if (/[A-Z]/.test(pass))                 score++;
    if (/[0-9]/.test(pass))                 score++;
    return score;
  };

  const questionsOptions = () =>
    SECURITY_QUESTIONS.map(q => `<option value="${q}">${q}</option>`).join('');

  /* ─── LOGIN VIEW ─────────────────────────────────────────── */
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
        <div class="auth-link">
          Forgot your password?
          <span id="go-forgot"> Reset it</span>
        </div>
        <div class="auth-link">
          Don't have an account?
          <span id="go-signup"> Sign up</span>
        </div>
      </div>
    </div>`;

    /* Bindings */
    const eye = document.getElementById('li-eye');
    const pw  = document.getElementById('li-pass');
    eye.onclick = () => {
      const show = pw.type === 'password';
      pw.type        = show ? 'text' : 'password';
      eye.textContent = show ? 'visibility' : 'visibility_off';
    };

    document.getElementById('go-forgot').onclick = () => App.goTo('#forgot');
    document.getElementById('go-signup').onclick = () => App.goTo('#signup');

    const submit = document.getElementById('li-submit');
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

        // Load profile
        const profile = await Server.getProfile(res.user.id);
        Server.currentProfile = profile;

        App.setAuth(true);
        App.showToast('Welcome back!', 'success');
        App.goTo('#chats');
      } catch (e) {
        setError('login-error', e.message || 'Login failed. Check your credentials.');
      } finally {
        setLoading('li-submit', false);
      }
    };

    submit.onclick = doLogin;
    document.getElementById('li-pass').addEventListener('keydown', e => {
      if (e.key === 'Enter') doLogin();
    });
  };

  /* ─── SIGNUP VIEW ─────────────────────────────────────────── */
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
          <input id="su-user" class="auth-input" type="text" placeholder="@johndoe" autocomplete="username"
            style="text-transform:lowercase">
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
          <div class="sq-section-title">
            <span class="material-icons-round">shield</span>
            Security Questions (required for account recovery)
          </div>

          <div>
            <label>Question 1</label>
            <select id="sq1-q"><option value="">Choose a question…</option>${questionsOptions()}</select>
          </div>
          <div>
            <input id="sq1-a" type="text" placeholder="Your answer" autocomplete="off">
          </div>

          <div style="margin-top:10px">
            <label>Question 2</label>
            <select id="sq2-q"><option value="">Choose a question…</option>${questionsOptions()}</select>
          </div>
          <div>
            <input id="sq2-a" type="text" placeholder="Your answer" autocomplete="off">
          </div>
        </div>

        <button id="su-submit" class="auth-submit" data-label="Create Account">Create Account</button>
      </div>

      <div class="auth-footer">
        <div class="auth-link">
          Already have an account?
          <span id="go-login"> Sign in</span>
        </div>
      </div>
    </div>`;

    /* Password eye toggle */
    const eye = document.getElementById('su-eye');
    const pw  = document.getElementById('su-pass');
    eye.onclick = () => {
      const show = pw.type === 'password';
      pw.type        = show ? 'text' : 'password';
      eye.textContent = show ? 'visibility' : 'visibility_off';
    };

    /* Password strength */
    pw.addEventListener('input', () => {
      const bar = document.getElementById('su-strength-bar');
      const s   = pwStrength(pw.value);
      bar.className = `pw-strength-bar s${s}`;
    });

    /* Username validation */
    let _uTimer = null;
    document.getElementById('su-user').addEventListener('input', (e) => {
      const hint = document.getElementById('su-user-hint');
      e.target.value = e.target.value.replace(/[^a-z0-9._]/gi, '').toLowerCase();
      clearTimeout(_uTimer);
      if (e.target.value.length < 3) { hint.textContent = ''; return; }
      hint.textContent = 'Checking…';
      _uTimer = setTimeout(async () => {
        const taken = await Server.isUsernameTaken(e.target.value);
        hint.style.color = taken ? 'var(--danger)' : 'var(--success)';
        hint.textContent  = taken ? '✗ Username taken' : '✓ Available';
      }, 500);
    });

    document.getElementById('go-login').onclick = () => App.goTo('#login');

    const submit = document.getElementById('su-submit');
    submit.onclick = async () => {
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

      if (!name || !uname || !email || !pass || !pass2)
        return setError('su-error', 'Please fill in all required fields.');
      if (uname.length < 3)
        return setError('su-error', 'Username must be at least 3 characters.');
      if (pass !== pass2)
        return setError('su-error', 'Passwords do not match.');
      if (pwStrength(pass) < 3)
        return setError('su-error', 'Password must be at least 8 characters with uppercase and a number.');
      if (!sq1q || !sq1a || !sq2q || !sq2a)
        return setError('su-error', 'Both security questions and answers are required.');
      if (sq1q === sq2q)
        return setError('su-error', 'Please choose two different security questions.');

      setLoading('su-submit', true);
      try {
        const taken = await Server.isUsernameTaken(uname);
        if (taken) { setError('su-error', 'Username already taken. Choose another.'); return; }

        const res = await Server.signUp(email, pass, name, uname, [
          { question: sq1q, answer: sq1a },
          { question: sq2q, answer: sq2a }
        ]);

        if (!res || !res.user) throw new Error('Signup failed.');

        const profile = await Server.getProfile(res.user.id);
        Server.currentProfile = profile;
        App.setAuth(true);
        App.showToast('Account created! Welcome to Spark 🎉', 'success', 4000);
        App.goTo('#chats');
      } catch (e) {
        setError('su-error', e.message || 'Signup failed. Please try again.');
      } finally {
        setLoading('su-submit', false);
      }
    };
  };

  /* ─── FORGOT PASSWORD (3-step) ───────────────────────────── */
  let _forgotState = {};

  const renderForgot = () => {
    _forgotState = { step: 1, email: '', questionId: '', resetToken: '' };
    renderForgotStep1();
  };

  const stepDots = (active) => {
    return [1,2,3].map(i => {
      const cls = i < active ? 'done' : i === active ? 'active' : '';
      return `<div class="step-dot ${cls}"></div>`;
    }).join('');
  };

  const renderForgotStep1 = () => {
    _container.innerHTML = `
    <div class="auth-wrap">
      <div class="step-indicator">${stepDots(1)}</div>
      <h2 class="auth-heading">Reset Password</h2>
      <p class="auth-sub">Enter the email address linked to your account</p>

      <div class="auth-form">
        <div id="fp1-error" class="auth-error"></div>
        <div class="auth-field">
          <label class="auth-label">Email</label>
          <input id="fp1-email" class="auth-input" type="email" placeholder="you@example.com">
        </div>
        <button id="fp1-submit" class="auth-submit" data-label="Continue">Continue</button>
      </div>

      <div class="auth-footer">
        <div class="auth-link">Remembered it? <span id="go-login2">Sign in</span></div>
      </div>
    </div>`;

    document.getElementById('go-login2').onclick = () => App.goTo('#login');
    document.getElementById('fp1-submit').onclick = async () => {
      const email = document.getElementById('fp1-email').value.trim();
      if (!email) return setError('fp1-error', 'Enter your email address.');
      setLoading('fp1-submit', true);
      try {
        const res = await Server.forgotPassword(email);
        if (!res.success || !res.question_id) {
          setError('fp1-error', 'Email not found or no security questions set.');
          return;
        }
        _forgotState.email      = email;
        _forgotState.questionId = res.question_id;
        _forgotState.question   = res.question;
        renderForgotStep2();
      } catch (e) {
        setError('fp1-error', e.message || 'Could not find account.');
      } finally {
        setLoading('fp1-submit', false);
      }
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
        <div class="sq-card">
          <p class="question-text">${_forgotState.question}</p>
          <input id="fp2-answer" class="auth-input" type="text" placeholder="Your answer" autocomplete="off">
        </div>
        <button id="fp2-submit" class="auth-submit" data-label="Verify">Verify Answer</button>
      </div>
    </div>`;

    document.getElementById('fp2-submit').onclick = async () => {
      const answer = document.getElementById('fp2-answer').value.trim();
      if (!answer) return setError('fp2-error', 'Enter your answer.');
      setLoading('fp2-submit', true);
      try {
        const res = await Server.verifyAnswer(_forgotState.email, _forgotState.questionId, answer);
        if (!res.success || !res.reset_token) throw new Error('Incorrect answer.');
        _forgotState.resetToken = res.reset_token;
        renderForgotStep3();
      } catch (e) {
        setError('fp2-error', e.message || 'Incorrect answer. Try again.');
      } finally {
        setLoading('fp2-submit', false);
      }
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
        <div class="auth-field">
          <label class="auth-label">Confirm Password</label>
          <input id="fp3-pass2" class="auth-input" type="password" placeholder="Repeat new password">
        </div>
        <button id="fp3-submit" class="auth-submit" data-label="Reset Password">Reset Password</button>
      </div>
    </div>`;

    const eye = document.getElementById('fp3-eye');
    const pw  = document.getElementById('fp3-pass');
    eye.onclick = () => {
      const show = pw.type === 'password';
      pw.type = show ? 'text' : 'password';
      eye.textContent = show ? 'visibility' : 'visibility_off';
    };
    pw.addEventListener('input', () => {
      const bar = document.getElementById('fp3-strength-bar');
      bar.className = `pw-strength-bar s${pwStrength(pw.value)}`;
    });

    document.getElementById('fp3-submit').onclick = async () => {
      const pass  = document.getElementById('fp3-pass').value;
      const pass2 = document.getElementById('fp3-pass2').value;
      if (!pass || !pass2) return setError('fp3-error', 'Fill in both fields.');
      if (pass !== pass2)  return setError('fp3-error', 'Passwords do not match.');
      if (pwStrength(pass) < 3) return setError('fp3-error', 'Password too weak.');
      setLoading('fp3-submit', true);
      try {
        const res = await Server.resetPassword(_forgotState.resetToken, pass);
        if (res.success) {
          App.showToast('Password reset! Please sign in.', 'success');
          App.goTo('#login');
        } else {
          throw new Error('Reset failed.');
        }
      } catch (e) {
        setError('fp3-error', e.message || 'Reset failed. The link may have expired.');
      } finally {
        setLoading('fp3-submit', false);
      }
    };
  };

  /* ─── Public render ──────────────────────────────────────── */
  const render = (container, view) => {
    _container = container;
    App.showNav(false);
    App.setTitle(null, false);
    App.setHeaderActions('');

    switch (view) {
      case 'signup': renderSignup(); break;
      case 'forgot': renderForgot(); break;
      default:       renderLogin();  break;
    }
  };

  return { render };
})();


(function() {
    /* 
     * ARKit 2.0 - Ultimate Notification System
     * Features: Stacking, Promises, Actions, Sounds, Haptics, Positioning
     */

    const DEFAULT_CONFIG = {
        position: 'top-right', // top-right, top-left, bottom-right, bottom-left, top-center, bottom-center
        duration: 5000,
        maxStack: 7,
        sound: false,
        haptics: true,
        blur: true,
        grouping: true // Deduplicate identical messages
    };

    class ArkitSystem {
        constructor() {
            this.config = { ...DEFAULT_CONFIG };
            this.queue = [];
            this.historyLog = [];
            this.container = null;
            this.audioCtx = null;
            this.activeNotificationGroups = new Map(); // For deduplication
            
            this.init();
        }

        init() {
            this.injectStyles();
            this.createContainer();
            this.setupGlobalListeners();
            this.interceptConsole();
            this.interceptFetch();
        }

        injectStyles() {
            const css = `
            :root { 
                --ak-z: 99999; 
                --ak-font: 'Outfit', system-ui, sans-serif;
                --ak-bg: rgba(15, 15, 15, 0.9);
                --ak-border: rgba(255,255,255,0.08);
            }
            #arkit-container { 
                position: fixed; z-index: var(--ak-z); 
                display: flex; flex-direction: column; gap: 10px;
                width: 380px; max-width: 90vw; pointer-events: none;
                padding: 20px; perspective: 1000px;
                transition: all 0.3s ease;
            }
            /* Positions */
            .ak-pos-top-right { top: 0; right: 0; align-items: flex-end; }
            .ak-pos-top-left { top: 0; left: 0; align-items: flex-start; }
            .ak-pos-bottom-right { bottom: 0; right: 0; flex-direction: column-reverse; align-items: flex-end; }
            .ak-pos-bottom-left { bottom: 0; left: 0; flex-direction: column-reverse; align-items: flex-start; }
            .ak-pos-top-center { top: 0; left: 50%; transform: translateX(-50%); align-items: center; }
            .ak-pos-bottom-center { bottom: 0; left: 50%; transform: translateX(-50%) !important; flex-direction: column-reverse; align-items: center; }

            .ak-card {
                pointer-events: auto;
                background: var(--ak-bg);
                backdrop-filter: blur(12px); -webkit-backdrop-filter: blur(12px);
                border: 1px solid var(--ak-border);
                color: #fff;
                width: 100%;
                border-radius: 16px;
                box-shadow: 0 8px 32px rgba(0,0,0,0.4);
                display: flex; flex-direction: column;
                transform-origin: center bottom;
                transition: transform 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275), opacity 0.3s, height 0.3s;
                overflow: hidden;
                position: relative;
                opacity: 0; transform: scale(0.9) translateY(20px);
            }
            .ak-card.ak-visible { opacity: 1; transform: scale(1) translateY(0); }
            
            .ak-main-row { display: flex; align-items: flex-start; padding: 16px; gap: 14px; width: 100%; }
            
            .ak-icon-box { 
                flex-shrink: 0; width: 24px; height: 24px; display: flex; align-items: center; justify-content: center; 
                border-radius: 50%; font-size: 16px;
            }
            .ak-content-box { flex: 1; min-width: 0; }
            .ak-title { font-family: var(--ak-font); font-weight: 600; font-size: 14px; line-height: 1.4; margin-bottom: 2px; }
            .ak-msg { font-family: var(--ak-font); font-size: 13px; color: #aaa; line-height: 1.4; word-break: break-word; }
            
            /* Type Colors */
            .ak-t-success .ak-icon-box { color: #4ade80; background: rgba(74, 222, 128, 0.1); }
            .ak-t-error .ak-icon-box { color: #f87171; background: rgba(248, 113, 113, 0.1); }
            .ak-t-warn .ak-icon-box { color: #fbbf24; background: rgba(251, 191, 36, 0.1); }
            .ak-t-info .ak-icon-box { color: #60a5fa; background: rgba(96, 165, 250, 0.1); }
            .ak-t-loading .ak-icon-box { color: #a78bfa; animation: ak-spin 1s linear infinite; }

            /* Badge for Groups */
            .ak-badge { 
                position: absolute; top: -5px; right: -5px; background: #ef4444; color: white; 
                font-size: 10px; font-weight: bold; height: 18px; min-width: 18px; border-radius: 9px; 
                display: flex; align-items: center; justify-content: center; padding: 0 4px;
                box-shadow: 0 2px 5px rgba(0,0,0,0.3); z-index: 10; animation: ak-pop 0.3s;
            }

            /* Progress Bar */
            .ak-progress { position: absolute; bottom: 0; left: 0; height: 3px; background: linear-gradient(90deg, #3b82f6, #8b5cf6); width: 100%; transform-origin: left; }
            
            /* Actions */
            .ak-actions { 
                display: flex; gap: 8px; padding: 0 16px 16px 54px; 
            }
            .ak-btn {
                background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1);
                color: #ddd; padding: 4px 12px; border-radius: 6px; font-size: 12px; cursor: pointer;
                transition: all 0.2s; font-family: var(--ak-font);
            }
            .ak-btn:hover { background: rgba(255,255,255,0.15); color: #fff; }

            /* Close Button */
            .ak-close-btn { 
                position: absolute; top: 12px; right: 12px; width: 20px; height: 20px; 
                display: flex; align-items: center; justify-content: center; cursor: pointer; 
                opacity: 0; transition: 0.2s; color: #666; font-size: 14px;
            }
            .ak-card:hover .ak-close-btn { opacity: 1; }
            .ak-close-btn:hover { color: #fff; }

            @keyframes ak-spin { to { transform: rotate(360deg); } }
            @keyframes ak-pop { 0% { transform: scale(0); } 80% { transform: scale(1.2); } 100% { transform: scale(1); } }
            `;
            const style = document.createElement('style');
            style.textContent = css;
            document.head.appendChild(style);
        }

        createContainer() {
            this.container = document.createElement('div');
            this.container.id = 'arkit-container';
            this.updatePositionClass();
            document.body.appendChild(this.container);
        }

        updatePositionClass() {
            this.container.className = `ak-pos-${this.config.position}`;
        }

        // --- Public API ---

        configure(opts) {
            Object.assign(this.config, opts);
            if (opts.position) this.updatePositionClass();
        }

        notify(type, message, options = {}) {
            // Options: title, duration, sticky, icon, action, onAction, html
            
            // 1. Grouping Check
            if (this.config.grouping) {
                const groupKey = `${type}-${message}`;
                const existing = this.activeNotificationGroups.get(groupKey);
                if (existing) {
                    this.incrementBadge(existing);
                    this.resetTimer(existing);
                    return existing; // Return existing ID
                }
            }

            // 2. Formatting
            if (typeof message === 'object') message = JSON.stringify(message, null, 2);
            
            // 3. Create Element
            const el = document.createElement('div');
            el.className = `ak-card ak-t-${type}`;
            const id = Date.now() + Math.random().toString(36).substr(2, 9);
            el.dataset.id = id;
            el.dataset.groupKey = `${type}-${message}`;

            const iconSvg = options.icon || this.getIcon(type);
            const contentHtml = options.html ? message : this.escapeHtml(message);
            const titleHtml = options.title ? `<div class="ak-title">${options.title}</div>` : '';

            let actionHtml = '';
            if (options.action) {
                actionHtml = `<div class="ak-actions"><button class="ak-btn">${options.action.text}</button></div>`;
            }

            el.innerHTML = `
                <div class="ak-main-row">
                    <div class="ak-icon-box">${iconSvg}</div>
                    <div class="ak-content-box">
                        ${titleHtml}
                        <div class="ak-msg">${contentHtml}</div>
                    </div>
                    <div class="ak-close-btn">✕</div>
                </div>
                ${actionHtml}
                ${!options.sticky && options.duration !== 0 ? '<div class="ak-progress"></div>' : ''}
            `;

            // 4. Mount
            if (this.config.position.includes('bottom')) {
                this.container.appendChild(el); // Append for bottom stacks (uses column-reverse)
            } else {
                this.container.insertBefore(el, this.container.firstChild);
            }

            // 5. Animate In
            requestAnimationFrame(() => el.classList.add('ak-visible'));

            // 6. Sound & Haptics
            if (this.config.sound) this.playSound(type);
            if (this.config.haptics && (type === 'error' || type === 'warn') && navigator.vibrate) navigator.vibrate(50);

            // 7. Logic
            const notificationObj = { 
                id, 
                el, 
                duration: options.duration || this.config.duration, 
                sticky: options.sticky,
                startTime: Date.now(),
                remaining: options.duration || this.config.duration,
                timer: null,
                count: 1
            };

            this.activeNotificationGroups.set(el.dataset.groupKey, notificationObj);
            this.historyLog.push({ type, message, time: new Date() });

            // Events
            el.querySelector('.ak-close-btn').onclick = (e) => { e.stopPropagation(); this.dismiss(id); };
            if (options.action && options.action.onClick) {
                el.querySelector('.ak-btn').onclick = (e) => {
                    e.stopPropagation();
                    options.action.onClick(e);
                    if (options.action.dismiss !== false) this.dismiss(id);
                };
            }

            // Timer
            if (!options.sticky) this.startTimer(notificationObj);

            // Hover Pause
            el.onmouseenter = () => this.pauseTimer(notificationObj);
            el.onmouseleave = () => this.resumeTimer(notificationObj);

            // Click to Copy/Expand (Simple logic)
            el.onclick = (e) => {
                if(e.target.tagName !== 'BUTTON') {
                   // Could expand logic here if needed
                }
            };

            this.setupGestures(el, id);
            this.manageStack();

            return { id, el: el };
        }

        // --- Promise Handler ---
        promise(promiseOrFn, messages = {}) {
            const loadingId = this.notify('loading', messages.loading || 'Processing...', { sticky: true }).id;
            
            const p = typeof promiseOrFn === 'function' ? promiseOrFn() : promiseOrFn;

            return p.then(data => {
                this.dismiss(loadingId);
                this.notify('success', messages.success || 'Completed Successfully', { duration: 3000 });
                return data;
            }).catch(err => {
                this.dismiss(loadingId);
                this.notify('error', messages.error || 'Operation Failed', { duration: 5000 });
                throw err;
            });
        }

        // --- Internal Mechanics ---

        incrementBadge(obj) {
            obj.count++;
            let badge = obj.el.querySelector('.ak-badge');
            if (!badge) {
                badge = document.createElement('div');
                badge.className = 'ak-badge';
                obj.el.appendChild(badge);
            }
            badge.innerText = obj.count > 99 ? '99+' : obj.count;
            // Pop animation reset
            badge.style.animation = 'none';
            badge.offsetHeight; /* trigger reflow */
            badge.style.animation = 'ak-pop 0.3s';
        }

        startTimer(obj) {
            if (obj.duration <= 0) return;
            const progressBar = obj.el.querySelector('.ak-progress');
            
            // CSS Animation approach for smoother performance
            if (progressBar) {
                progressBar.style.transition = `transform ${obj.remaining}ms linear`;
                requestAnimationFrame(() => progressBar.style.transform = 'scaleX(0)');
            }

            obj.timer = setTimeout(() => {
                this.dismiss(obj.id);
            }, obj.remaining);
            
            obj.startTime = Date.now();
        }

        pauseTimer(obj) {
            if (obj.sticky || !obj.timer) return;
            clearTimeout(obj.timer);
            obj.remaining -= (Date.now() - obj.startTime);
            const progressBar = obj.el.querySelector('.ak-progress');
            if(progressBar) {
                const currentScale = progressBar.getBoundingClientRect().width / obj.el.offsetWidth;
                progressBar.style.transition = 'none';
                progressBar.style.transform = `scaleX(${currentScale})`;
            }
        }

        resumeTimer(obj) {
            if (obj.sticky || obj.remaining <= 0) return;
            this.startTimer(obj);
        }

        resetTimer(obj) {
            // When grouped, reset the timer to full duration
            this.pauseTimer(obj);
            obj.remaining = obj.duration;
            const progressBar = obj.el.querySelector('.ak-progress');
            if (progressBar) {
                progressBar.style.transition = 'none';
                progressBar.style.transform = 'scaleX(1)';
            }
            this.startTimer(obj);
        }

        dismiss(id) {
            const el = this.container.querySelector(`[data-id="${id}"]`);
            if (!el) return;

            // Remove from maps
            const groupKey = el.dataset.groupKey;
            this.activeNotificationGroups.delete(groupKey);

            // Animate out
            el.style.opacity = '0';
            el.style.transform = 'scale(0.9) translateY(-20px)';
            el.style.height = '0';
            el.style.margin = '0';
            el.style.padding = '0';
            
            setTimeout(() => {
                if (el.parentNode) el.parentNode.removeChild(el);
            }, 400);
        }

        clear() {
            this.activeNotificationGroups.clear();
            this.container.innerHTML = '';
        }

        manageStack() {
            const children = Array.from(this.container.children);
            if (children.length > this.config.maxStack) {
                // Remove oldest (last in list if top-stack, first if bottom-stack? 
                // Actually DOM order depends on append/prepend. 
                // If prepending (top), last child is oldest.
                // If appending (bottom), first child is oldest.
                const toRemove = this.config.position.includes('bottom') 
                    ? children[0] 
                    : children[children.length - 1];
                
                if (toRemove && !toRemove.classList.contains('ak-leaving')) {
                    this.dismiss(toRemove.dataset.id);
                }
            }
        }

        setupGestures(el, id) {
            let startX = 0, currentX = 0;
            const touchStart = (e) => { startX = e.touches[0].clientX; el.style.transition = 'none'; };
            const touchMove = (e) => {
                currentX = e.touches[0].clientX - startX;
                el.style.transform = `translateX(${currentX}px)`;
                el.style.opacity = Math.max(0, 1 - Math.abs(currentX) / 200);
            };
            const touchEnd = () => {
                el.style.transition = 'all 0.4s ease';
                if (Math.abs(currentX) > 100) this.dismiss(id);
                else {
                    el.style.transform = 'translateX(0)';
                    el.style.opacity = '1';
                }
            };
            el.addEventListener('touchstart', touchStart, {passive: true});
            el.addEventListener('touchmove', touchMove, {passive: true});
            el.addEventListener('touchend', touchEnd);
        }

        setupGlobalListeners() {
            // Pause on blur to prevent timers running when user not looking
            window.addEventListener('blur', () => this.activeNotificationGroups.forEach(obj => this.pauseTimer(obj)));
            window.addEventListener('focus', () => this.activeNotificationGroups.forEach(obj => this.resumeTimer(obj)));
            
            // ESC key
            document.addEventListener('keydown', (e) => {
                if (e.key === 'Escape') {
                    const top = this.container.firstElementChild; // Or last depending on stack
                    if (top) this.dismiss(top.dataset.id);
                }
            });
        }

        // --- Audio Context for generated beeps ---
        playSound(type) {
            if (!window.AudioContext) return;
            if (!this.audioCtx) this.audioCtx = new (window.AudioContext || window.webkitAudioContext)();
            if (this.audioCtx.state === 'suspended') this.audioCtx.resume();

            const osc = this.audioCtx.createOscillator();
            const gain = this.audioCtx.createGain();
            osc.connect(gain);
            gain.connect(this.audioCtx.destination);

            const now = this.audioCtx.currentTime;
            
            if (type === 'success') {
                osc.type = 'sine';
                osc.frequency.setValueAtTime(500, now);
                osc.frequency.exponentialRampToValueAtTime(1000, now + 0.1);
                gain.gain.setValueAtTime(0.1, now);
                gain.gain.exponentialRampToValueAtTime(0.01, now + 0.3);
                osc.start(now);
                osc.stop(now + 0.3);
            } else if (type === 'error') {
                osc.type = 'sawtooth';
                osc.frequency.setValueAtTime(150, now);
                osc.frequency.linearRampToValueAtTime(100, now + 0.2);
                gain.gain.setValueAtTime(0.1, now);
                gain.gain.linearRampToValueAtTime(0.01, now + 0.2);
                osc.start(now);
                osc.stop(now + 0.2);
            } else {
                // Generic pop
                osc.type = 'triangle';
                osc.frequency.setValueAtTime(400, now);
                gain.gain.setValueAtTime(0.05, now);
                gain.gain.exponentialRampToValueAtTime(0.01, now + 0.1);
                osc.start(now);
                osc.stop(now + 0.1);
            }
        }

        // --- Icons ---
        getIcon(type) {
            const icons = {
                success: '<svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path d="M5 13l4 4L19 7"/></svg>',
                error: '<svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path d="M6 18L18 6M6 6l12 12"/></svg>',
                warn: '<svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/></svg>',
                info: '<svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>',
                loading: '<svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/></svg>'
            };
            return icons[type] || icons.info;
        }

        escapeHtml(str) {
            return str.replace(/[&<>"']/g, function(m) {
                return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' }[m];
            });
        }

        // --- Interceptors ---
        interceptConsole() {
            const levels = ['log', 'info', 'warn', 'error'];
            const original = {};
            levels.forEach(l => original[l] = console[l]);

            levels.forEach(level => {
                console[level] = (...args) => {
                    original[level].apply(console, args);
                    const msg = args.map(a => typeof a === 'object' ? JSON.stringify(a) : String(a)).join(' ');
                    // Map log -> info, error -> error
                    const type = level === 'log' ? 'info' : (level === 'warn' ? 'warn' : (level === 'error' ? 'error' : 'info'));
                    this.notify(type, msg);
                };
            });
        }

        interceptFetch() {
            const originalFetch = window.fetch;
            window.fetch = async (...args) => {
                try {
                    const res = await originalFetch(...args);
                    if (!res.ok) this.notify('error', `HTTP Error: ${res.status}`);
                    return res;
                } catch (err) {
                    this.notify('error', 'Network Connection Failed');
                    throw err;
                }
            };
        }
    }

    // Initialize
    window.arkit = new ArkitSystem();
    console.log("%c ARKit 2.0 Ultimate ", "background: #3b82f6; color: white; padding: 2px 6px; border-radius: 4px;", "Loaded successfully");

})();

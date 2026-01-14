
(function() {
    /* 
     * ARKit 2.1 - Ultimate Notification System
     * Features: 3D Stacking, Physics, Promises, Actions, Sounds, Haptics, Full Customization
     */

    const DEFAULT_CONFIG = {
        position: 'top-right', // top-right, top-left, bottom-right, bottom-left, top-center, bottom-center
        duration: 5000,
        maxStack: 6,
        sound: false,
        haptics: true,
        blur: true,
        grouping: true, // Deduplicate identical messages
        theme: {
            // Default Theme Colors
            '--ak-bg': 'rgba(15, 15, 15, 0.95)',
            '--ak-text': '#ffffff',
            '--ak-font': "'Outfit', system-ui, -apple-system, sans-serif",
            '--ak-border': 'rgba(255,255,255,0.08)',
            '--ak-radius': '16px',
            '--ak-shadow': '0 10px 40px rgba(0,0,0,0.5)',
            '--ak-accent': '#3b82f6'
        }
    };

    class ArkitSystem {
        constructor() {
            // Merge User Config (pre-defined) -> Default Config
            const userConfig = window.arkitConfig || {};
            this.config = this.deepMerge(DEFAULT_CONFIG, userConfig);
            
            this.queue = [];
            this.historyLog = [];
            this.container = null;
            this.audioCtx = null;
            this.activeNotificationGroups = new Map(); // For deduplication
            this.activeElements = []; // For stacking order
            
            this.init();
        }

        deepMerge(target, source) {
            for (const key in source) {
                if (source[key] instanceof Object && key in target) {
                    Object.assign(source[key], this.deepMerge(target[key], source[key]));
                }
            }
            Object.assign(target || {}, source);
            return target;
        }

        init() {
            this.injectStyles();
            this.createContainer();
            this.applyTheme(this.config.theme);
            this.setupGlobalListeners();
            this.interceptConsole();
            this.interceptFetch();
        }

        injectStyles() {
            const css = `
            :root { 
                --ak-z: 99999; 
            }
            #arkit-container { 
                position: fixed; z-index: var(--ak-z); 
                width: 380px; max-width: 92vw; pointer-events: none;
                perspective: 1000px;
                /* Reset standard layout for absolute stacking */
                display: block;
                height: 0;
            }
            
            /* Positions */
            .ak-pos-top-right { top: 20px; right: 20px; }
            .ak-pos-top-left { top: 20px; left: 20px; }
            .ak-pos-bottom-right { bottom: 20px; right: 20px; }
            .ak-pos-bottom-left { bottom: 20px; left: 20px; }
            .ak-pos-top-center { top: 20px; left: 50%; transform: translateX(-50%); }
            .ak-pos-bottom-center { bottom: 20px; left: 50%; transform: translateX(-50%); }

            /* Mobile Adjustments */
            @media (max-width: 768px) {
                #arkit-container { width: 92vw; left: 50% !important; transform: translateX(-50%) !important; right: auto; top: 10px; }
                .ak-pos-bottom-right, .ak-pos-bottom-left, .ak-pos-bottom-center { top: auto; bottom: 20px; }
            }

            .ak-card {
                pointer-events: auto;
                background: var(--ak-bg);
                color: var(--ak-text);
                font-family: var(--ak-font);
                border: 1px solid var(--ak-border);
                border-radius: var(--ak-radius);
                box-shadow: var(--ak-shadow);
                
                width: 100%;
                /* Fixed default height for stack uniformity, expands if needed */
                min-height: 70px;
                position: absolute; /* Vital for stack effect */
                top: 0; left: 0;
                
                display: flex; flex-direction: column;
                overflow: visible; /* FIXED: Visible so badges can pop out */
                
                transform-origin: 50% -20px;
                will-change: transform, opacity;
                transition: transform 0.4s cubic-bezier(0.2, 0.8, 0.2, 1), opacity 0.4s ease;
                
                opacity: 0; transform: translateY(-30px) scale(0.9);
            }
            
            .ak-blur { backdrop-filter: blur(12px); -webkit-backdrop-filter: blur(12px); }

            /* Internal Wrapper to handle clipping while keeping badge visible */
            .ak-inner-content {
                border-radius: var(--ak-radius);
                overflow: hidden; 
                width: 100%; height: 100%;
                display: flex; flex-direction: column;
            }

            .ak-main-row { display: flex; align-items: flex-start; padding: 16px; gap: 14px; width: 100%; }
            
            .ak-icon-box { 
                flex-shrink: 0; width: 24px; height: 24px; display: flex; align-items: center; justify-content: center; 
                border-radius: 50%; font-size: 16px;
            }
            .ak-content-box { flex: 1; min-width: 0; padding-right: 12px; }
            .ak-title { font-weight: 600; font-size: 14px; line-height: 1.4; margin-bottom: 2px; }
            .ak-msg { font-size: 13px; opacity: 0.8; line-height: 1.4; word-break: break-word; }
            
            /* Type Colors */
            .ak-t-success .ak-icon-box { color: #4ade80; background: rgba(74, 222, 128, 0.1); }
            .ak-t-error .ak-icon-box { color: #f87171; background: rgba(248, 113, 113, 0.1); }
            .ak-t-warn .ak-icon-box { color: #fbbf24; background: rgba(251, 191, 36, 0.1); }
            .ak-t-info .ak-icon-box { color: #60a5fa; background: rgba(96, 165, 250, 0.1); }
            .ak-t-loading .ak-icon-box { color: #a78bfa; animation: ak-spin 1s linear infinite; }

            /* Badge for Groups - Now Popping OUT */
            .ak-badge { 
                position: absolute; top: -6px; right: -6px; 
                background: #ef4444; color: white; 
                font-size: 10px; font-weight: bold; 
                height: 20px; min-width: 20px; 
                border-radius: 10px; 
                display: flex; align-items: center; justify-content: center; 
                padding: 0 5px;
                box-shadow: 0 2px 8px rgba(0,0,0,0.4); 
                z-index: 100; border: 2px solid #111; /* Contrast border */
                animation: ak-pop 0.3s;
            }

            /* Progress Bar */
            .ak-progress { position: absolute; bottom: 0; left: 0; height: 3px; background: linear-gradient(90deg, #3b82f6, #8b5cf6); width: 100%; transform-origin: left; z-index: 50; }
            
            /* Actions */
            .ak-actions { 
                display: flex; gap: 8px; padding: 0 16px 16px 54px; 
            }
            .ak-btn {
                background: rgba(255,255,255,0.08); border: 1px solid rgba(255,255,255,0.1);
                color: inherit; opacity: 0.9; padding: 5px 12px; border-radius: 6px; font-size: 12px; cursor: pointer;
                transition: all 0.2s; font-family: var(--ak-font); font-weight: 500;
            }
            .ak-btn:hover { background: rgba(255,255,255,0.2); opacity: 1; }

            /* Close Button */
            .ak-close-btn { 
                position: absolute; top: 10px; right: 10px; width: 24px; height: 24px; 
                display: flex; align-items: center; justify-content: center; cursor: pointer; 
                opacity: 0; transition: 0.2s; color: inherit; border-radius: 50%;
                background: rgba(255,255,255,0.05); z-index: 20;
            }
            .ak-card:hover .ak-close-btn { opacity: 1; }
            .ak-close-btn:hover { background: rgba(255,255,255,0.2); }

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
            // If position changes, we must re-calculate stack directions in reposition()
            this.reposition();
        }

        applyTheme(themeObj) {
            if(!themeObj) return;
            const root = document.documentElement;
            Object.entries(themeObj).forEach(([key, val]) => {
                root.style.setProperty(key, val);
            });
        }

        // --- Public API ---

        configure(opts) {
            if (opts.theme) {
                this.config.theme = { ...this.config.theme, ...opts.theme };
                this.applyTheme(this.config.theme);
                delete opts.theme; // Handled separately
            }
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
                    
                    // Move to front of visual stack
                    this.moveToFront(existing);
                    return existing; 
                }
            }

            // 2. Formatting
            if (typeof message === 'object') message = JSON.stringify(message, null, 2);
            
            // 3. Create Element
            const el = document.createElement('div');
            el.className = `ak-card ak-t-${type} ${this.config.blur ? 'ak-blur' : ''}`;
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

            // Inner wrapper for safe overflow hidden
            el.innerHTML = `
                <div class="ak-inner-content">
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
                </div>
            `;

            // 4. Mount
            // For Absolute stacking, we just append. Visual order is handled by Z-Index and Transform.
            this.container.appendChild(el);

            // 5. Sound & Haptics
            if (this.config.sound) this.playSound(type);
            if (this.config.haptics && (type === 'error' || type === 'warn') && navigator.vibrate) navigator.vibrate(50);

            // 6. Logic
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
            // Add to the START of the array (Newest is index 0)
            this.activeElements.unshift(notificationObj);
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

            // Hover Interactions
            el.onmouseenter = () => {
                this.pauseTimer(notificationObj);
                // Expand logic if needed, or z-index boost
                el.style.zIndex = '100000';
            };
            el.onmouseleave = () => {
                this.resumeTimer(notificationObj);
                this.reposition(); // Reset z-index
            };

            this.setupGestures(el, id);
            
            // 7. Render Stack
            this.reposition();

            return { id, el: el };
        }

        // --- Stacking Physics ---

        reposition() {
            // Logic: The array `this.activeElements` has newest at [0].
            // Visuals: [0] is front, [1] is behind and slightly moved, etc.
            
            const isBottom = this.config.position.includes('bottom');
            const spacing = 14; // Pixels visible of card behind
            const scaleStep = 0.05;

            this.activeElements.forEach((obj, index) => {
                const el = obj.el;
                
                // If stack limit reached, hide or remove
                if (index >= this.config.maxStack) {
                    el.style.opacity = '0';
                    el.style.pointerEvents = 'none';
                    // Optional: auto-dismiss invisible ones? 
                    // this.dismiss(obj.id); 
                    return;
                }

                // Calculate Transform
                const yOffset = isBottom ? -(index * spacing) : (index * spacing);
                const scale = 1 - (index * scaleStep);
                const zIndex = this.config.maxStack - index + 100; // +100 base z-index

                el.style.transform = `translateY(${yOffset}px) scale(${scale})`;
                el.style.zIndex = zIndex;
                el.style.opacity = index === 0 ? '1' : (1 - (index * 0.15)).toString(); // Fade back cards
                el.style.pointerEvents = index === 0 ? 'auto' : 'none'; // Only top card interactive by default? Or allow clicking back ones to swap?
                
                // Allow clicking background cards to bring to front
                if (index > 0) {
                    el.style.pointerEvents = 'auto';
                    el.onclick = () => {
                        this.moveToFront(obj);
                    };
                } else {
                    el.onclick = null; // Clear swap click
                }
            });
        }

        moveToFront(obj) {
            // Remove from current position
            this.activeElements = this.activeElements.filter(o => o.id !== obj.id);
            // Add to start
            this.activeElements.unshift(obj);
            this.reposition();
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
                obj.el.appendChild(badge); // Appended to .ak-card, outside .ak-inner-content (overflow:visible)
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
            const obj = this.activeElements.find(o => o.id === id);
            if (!obj) return;
            const el = obj.el;

            // Remove from tracking
            this.activeNotificationGroups.delete(el.dataset.groupKey);
            this.activeElements = this.activeElements.filter(o => o.id !== id);

            // Animate out
            el.style.transform = `${el.style.transform} translateX(50px)`;
            el.style.opacity = '0';
            
            // Re-render others immediately to fill gap
            this.reposition();

            setTimeout(() => {
                if (el.parentNode) el.parentNode.removeChild(el);
            }, 400);
        }

        clear() {
            this.activeNotificationGroups.clear();
            this.activeElements = [];
            this.container.innerHTML = '';
        }

        setupGestures(el, id) {
            let startX = 0, currentX = 0;
            const touchStart = (e) => { startX = e.touches[0].clientX; el.style.transition = 'none'; };
            const touchMove = (e) => {
                currentX = e.touches[0].clientX - startX;
                el.style.transform = `translateX(${currentX}px)`; // Just translate X, keep Y from reposition
                el.style.opacity = Math.max(0, 1 - Math.abs(currentX) / 200);
            };
            const touchEnd = () => {
                el.style.transition = 'transform 0.4s ease, opacity 0.4s ease';
                if (Math.abs(currentX) > 100) this.dismiss(id);
                else {
                    el.style.opacity = '1';
                    this.reposition(); // Snap back
                }
            };
            el.addEventListener('touchstart', touchStart, {passive: true});
            el.addEventListener('touchmove', touchMove, {passive: true});
            el.addEventListener('touchend', touchEnd);
        }

        setupGlobalListeners() {
            window.addEventListener('blur', () => this.activeElements.forEach(obj => this.pauseTimer(obj)));
            window.addEventListener('focus', () => this.activeElements.forEach(obj => this.resumeTimer(obj)));
            
            document.addEventListener('keydown', (e) => {
                if (e.key === 'Escape') {
                    if (this.activeElements.length > 0) this.dismiss(this.activeElements[0].id);
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
    console.log("%c ARKit 2.1 Loaded ", "background: #3b82f6; color: white; padding: 2px 6px; border-radius: 4px;");

})();

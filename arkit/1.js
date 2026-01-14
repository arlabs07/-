
(function() {
    // --- Styles Injection ---
    const css = `
    :root { --ak-bg: rgba(20, 20, 20, 0.95); --ak-text: #ffffff; --ak-font: system-ui, -apple-system, sans-serif; --ak-radius: 16px; --ak-shadow: 0 10px 40px rgba(0, 0, 0, 0.5); }
    #arkit-container { position: fixed; top: 20px; right: 20px; width: 360px; height: 0; z-index: 99999; perspective: 1000px; pointer-events: none; }
    @media (max-width: 768px) { #arkit-container { right: auto; left: 50%; transform: translateX(-50%); width: 92vw; max-width: 360px; top: 10px; } }
    .ak-notification { pointer-events: auto; background: var(--ak-bg); color: var(--ak-text); font-family: var(--ak-font); width: 100%; height: 70px; position: absolute; top: 0; left: 0; padding: 0 20px; border-radius: var(--ak-radius); box-shadow: var(--ak-shadow); display: flex; align-items: center; gap: 16px; cursor: pointer; user-select: none; transition: transform 0.4s cubic-bezier(0.2, 0.8, 0.2, 1), opacity 0.4s ease, height 0.3s ease, background 0.3s; will-change: transform, opacity; border: 1px solid rgba(255,255,255,0.08); backdrop-filter: blur(12px); -webkit-backdrop-filter: blur(12px); opacity: 0; transform-origin: 50% -20px; overflow: hidden; }
    .ak-notification:hover { background: rgba(30, 30, 30, 0.98); }
    .ak-notification.ak-expanded { height: auto; min-height: 70px; align-items: flex-start; padding-top: 23px; padding-bottom: 23px; z-index: 10000 !important; }
    .ak-icon { font-family: sans-serif; font-size: 20px; flex-shrink: 0; display: flex; align-items: center; justify-content: center; width: 24px; height: 24px; }
    .ak-type-log .ak-icon { color: #9ca3af; } .ak-type-info .ak-icon { color: #3b82f6; } .ak-type-warn .ak-icon { color: #f59e0b; } .ak-type-error .ak-icon { color: #ef4444; } .ak-type-network .ak-icon { color: #10b981; }
    .ak-content { flex: 1; font-size: 14px; font-weight: 500; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; line-height: 1.5; color: rgba(255,255,255,0.9); transition: all 0.3s; }
    .ak-notification.ak-expanded .ak-content { white-space: normal; overflow: visible; padding-top: 0; }
    .ak-close { width: 24px; height: 24px; cursor: pointer; opacity: 0; pointer-events: none; transition: all 0.2s; border-radius: 50%; display: flex; align-items: center; justify-content: center; background: rgba(255,255,255,0.1); font-size: 14px; }
    .ak-notification:hover .ak-close, .ak-notification.ak-expanded .ak-close { opacity: 1; pointer-events: auto; }
    .ak-close:hover { background: rgba(255,255,255,0.2); color: #fff; }
    .ak-notification.leaving { pointer-events: none; }
    `;
    const style = document.createElement('style');
    style.textContent = css;
    document.head.appendChild(style);

    // --- Configuration ---
    const CONFIG = { types: ['log', 'info', 'warn', 'error', 'network'], duration: 5000, maxStack: 6 };
    let container = document.getElementById('arkit-container');
    if (!container) {
        container = document.createElement('div');
        container.id = 'arkit-container';
        document.body.appendChild(container);
    }

    // --- Icons (SVG fallback since material icons might not be present) ---
    const SVG_ICONS = {
        log: '<svg width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M4 17l6-6-6-6M12 19h8"></path></svg>',
        info: '<svg width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"></circle><path d="M12 16v-4M12 8h.01"></path></svg>',
        warn: '<svg width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0zM12 9v4M12 17h.01"></path></svg>',
        error: '<svg width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"></circle><path d="M15 9l-6 6M9 9l6 6"></path></svg>',
        network: '<svg width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M5 12.55a11 11 0 0114.08 0M1.42 9a16 16 0 0121.16 0M8.53 16.11a6 6 0 016.95 0M12 20h.01"></path></svg>'
    };

    // --- Core Logic ---
    function notify(type, message) {
        if (!CONFIG.types.includes(type)) return;
        if (typeof message === 'object') { try { message = JSON.stringify(message, null, 2); } catch (e) { message = '[Object]'; } }
        message = String(message);

        const el = document.createElement('div');
        el.className = `ak-notification ak-type-${type}`;
        el.innerHTML = `
            <span class="ak-icon">${SVG_ICONS[type] || ''}</span>
            <div class="ak-content">${escapeHtml(message)}</div>
            <div class="ak-close">✕</div>
        `;
        
        el.style.transform = `translateY(-40px) scale(0.9)`;
        el.style.zIndex = '1000';

        if (container.firstChild) container.insertBefore(el, container.firstChild);
        else container.appendChild(el);

        requestAnimationFrame(() => repositionStack());

        // Timer Logic
        let timeout;
        const startTimer = () => { timeout = setTimeout(() => removeNotification(el), CONFIG.duration); };
        startTimer();

        // Interactions
        el.addEventListener('mouseenter', () => clearTimeout(timeout));
        el.addEventListener('mouseleave', () => {
            if (!el.classList.contains('ak-expanded')) startTimer();
        });

        // Click to Expand
        el.addEventListener('click', (e) => {
            if (e.target.closest('.ak-close')) return;
            // Toggle Expand
            const isExpanded = el.classList.toggle('ak-expanded');
            if (isExpanded) {
                clearTimeout(timeout); // Stay open while reading
                // Reset styling to ensure it sits on top if needed, though z-index handles it
            } else {
                startTimer(); // Resume timer
            }
        });

        // Close
        el.querySelector('.ak-close').addEventListener('click', (e) => {
            e.stopPropagation();
            removeNotification(el);
        });

        setupGestures(el);
    }

    function repositionStack() {
        const items = Array.from(container.children).filter(el => !el.classList.contains('leaving'));
        items.forEach((el, index) => {
            if (index >= CONFIG.maxStack) { removeNotification(el); return; }
            const yOffset = index * 14;
            const scale = 1 - (index * 0.05);
            const z = 1000 - index;
            const opacity = index === 0 ? 1 : (1 - (index * 0.15));
            el.style.transform = `translateY(${yOffset}px) scale(${scale})`;
            el.style.zIndex = z;
            el.style.opacity = Math.max(0, opacity);
            el.style.visibility = opacity <= 0 ? 'hidden' : 'visible';
        });
    }

    function removeNotification(el) {
        if (!el || el.classList.contains('leaving')) return;
        el.classList.add('leaving');
        el.style.transform = `translateY(-50px) scale(0.8)`;
        el.style.opacity = '0';
        setTimeout(() => { if (el.parentNode) el.parentNode.removeChild(el); }, 400);
        repositionStack();
    }

    function escapeHtml(text) { return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;"); }

    function setupGestures(el) {
        let startX = 0, currentX = 0, isDragging = false;
        const start = (e) => {
            if (e.target.closest('.ak-close') || el.classList.contains('ak-expanded')) return;
            isDragging = true;
            startX = e.type.includes('mouse') ? e.clientX : e.touches[0].clientX;
            el.style.transition = 'none';
        };
        const move = (e) => {
            if (!isDragging) return;
            const cx = e.type.includes('mouse') ? e.clientX : e.touches[0].clientX;
            currentX = cx - startX;
            el.style.transform = `${el.style.transform.split(' translateX')[0]} translateX(${currentX}px)`;
            el.style.opacity = Math.max(0, 1 - Math.abs(currentX) / 200);
        };
        const end = () => {
            if (!isDragging) return;
            isDragging = false;
            el.style.transition = 'transform 0.4s ease, opacity 0.4s ease, height 0.3s ease';
            if (Math.abs(currentX) > 100) {
                el.style.transform = `translateX(${currentX * 2}px)`;
                el.style.opacity = '0';
                removeNotification(el);
            } else { repositionStack(); }
            currentX = 0;
        };
        el.addEventListener('mousedown', start); window.addEventListener('mousemove', move); window.addEventListener('mouseup', end);
        el.addEventListener('touchstart', start, {passive: true}); window.addEventListener('touchmove', move, {passive: false}); window.addEventListener('touchend', end);
    }

    // --- Global Access ---
    window.arkit = { notify };

    // --- Console & Fetch Interceptors ---
    const originalConsole = { log: console.log, info: console.info, warn: console.warn, error: console.error };
    ['log', 'info', 'warn', 'error'].forEach(type => {
        console[type] = function(...args) {
            originalConsole[type].apply(console, args);
            notify(type, args.map(a => (typeof a === 'object' ? JSON.stringify(a) : String(a))).join(' '));
        };
    });
    
    // Optional: Fetch interceptor (simplified)
    const originalFetch = window.fetch;
    window.fetch = async function(...args) {
        try {
            const res = await originalFetch(...args);
            if (!res.ok) notify('error', `HTTP ${res.status}`);
            return res;
        } catch (err) { notify('error', 'Network Error'); throw err; }
    };
    
    console.log('ARKit 2.0 (Standalone) Loaded');
})();

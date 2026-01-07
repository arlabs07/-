
document.addEventListener('DOMContentLoaded', () => {

    // --- STATE MANAGEMENT ---
    const fs = {
        'index.html': { type: 'html', content: '<!DOCTYPE html>\n<html>\n<head>\n  <title>App</title>\n  <link rel="stylesheet" href="style.css">\n</head>\n<body>\n  <div class="center">\n    <h1>Hello World</h1>\n    <p>Edit me in the code editor.</p>\n    <button id="btn">Click Me</button>\n  </div>\n  <script src="script.js"><\/script>\n</body>\n</html>' },
        'style.css': { type: 'css', content: 'body {\n  background: #111;\n  color: #fff;\n  font-family: sans-serif;\n  display: flex;\n  height: 100vh;\n  align-items: center;\n  justify-content: center;\n}\n\n.center {\n  text-align: center;\n}\n\nh1 {\n  background: linear-gradient(45deg, #00ff88, #00c8ff);\n  -webkit-background-clip: text;\n  color: transparent;\n  font-size: 3rem;\n}\n\nbutton {\n  margin-top: 20px;\n  padding: 10px 20px;\n  border-radius: 5px;\n  border: none;\n  background: #00ff88;\n  font-weight: bold;\n  cursor: pointer;\n}' },
        'script.js': { type: 'js', content: 'console.log("System initialized.");\n\ndocument.getElementById("btn").addEventListener("click", () => {\n  console.log("Button clicked!");\n  alert("Interaction successful.");\n});' }
    };
    
    let activeFile = 'index.html';
    let isSaved = true;

    // --- ELEMENTS ---
    const els = {
        editor: document.getElementById('code-input'),
        highlight: document.getElementById('highlight-layer'),
        gutter: document.getElementById('gutter'),
        fileTree: document.getElementById('file-tree'),
        tabBar: document.getElementById('tab-bar'),
        previewFrame: document.getElementById('preview-frame'),
        consoleLogs: document.getElementById('console-logs'),
        consoleInput: document.getElementById('console-input'),
        resizer: document.getElementById('resizer'),
        sidebar: document.getElementById('sidebar'),
        editorPane: document.getElementById('pane-editor'),
        outputPane: document.getElementById('pane-output'),
        saveStatus: document.getElementById('save-status'),
        modal: document.getElementById('file-modal')
    };

    // --- EDITOR LOGIC ---
    function escapeHtml(text) {
        return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
                   .replace(/"/g, "&quot;").replace(/'/g, "&#039;");
    }

    function tokenize(code, type) {
        let html = escapeHtml(code);
        if (type === 'html') {
            html = html.replace(/(&lt;!--[\s\S]*?--&gt;)/g, '<span class="tok-com">$1</span>');
            html = html.replace(/(&lt;\/?)(\w+)/g, '$1<span class="tok-tag">$2</span>');
            html = html.replace(/(\s)([\w-]+)(=)/g, '$1<span class="tok-attr">$2</span><span class="tok-op">$3</span>');
        } else if (type === 'css') {
            html = html.replace(/([^{]+)({)/g, '<span class="tok-tag">$1</span>$2');
            html = html.replace(/([\w-]+)(:)/g, '<span class="tok-attr">$1</span>$2');
        } else if (type === 'js') {
            const keywords = /\b(const|let|var|function|return|if|else|for|while|import|from|class)\b/g;
            html = html.replace(keywords, '<span class="tok-kwd">$1</span>');
            html = html.replace(/('.*?')|(".*?")|(`.*?`)/g, '<span class="tok-str">$1</span>');
            html = html.replace(/(\/\/.*)/g, '<span class="tok-com">$1</span>');
            html = html.replace(/console\.(log|error|warn)/g, '<span class="tok-kwd">console</span>.$1');
        }
        return html + '\n'; // Ensure last line render
    }

    function updateEditor() {
        const code = els.editor.value;
        const type = fs[activeFile].type;
        els.highlight.innerHTML = tokenize(code, type);
        
        // Line Numbers
        const lines = code.split('\n').length;
        els.gutter.innerHTML = Array(lines).fill(0).map((_, i) => `<div>${i + 1}</div>`).join('');
        
        // Save State
        if (fs[activeFile].content !== code) {
            fs[activeFile].content = code;
            isSaved = false;
            els.saveStatus.innerHTML = '<i class="fas fa-circle" style="color:#ffb86c"></i> Unsaved';
        }

        syncScroll();
    }

    function syncScroll() {
        els.highlight.scrollTop = els.editor.scrollTop;
        els.highlight.scrollLeft = els.editor.scrollLeft;
        els.gutter.scrollTop = els.editor.scrollTop;
    }

    els.editor.addEventListener('input', updateEditor);
    els.editor.addEventListener('scroll', syncScroll);
    els.editor.addEventListener('keydown', (e) => {
        if (e.key === 'Tab') {
            e.preventDefault();
            const start = els.editor.selectionStart;
            const end = els.editor.selectionEnd;
            els.editor.value = els.editor.value.substring(0, start) + "  " + els.editor.value.substring(end);
            els.editor.selectionStart = els.editor.selectionEnd = start + 2;
            updateEditor();
        }
        // Ctrl+S
        if ((e.ctrlKey || e.metaKey) && e.key === 's') {
            e.preventDefault();
            isSaved = true;
            els.saveStatus.innerHTML = '<i class="fas fa-check"></i> Saved';
        }
    });

    // --- FILE SYSTEM UI ---
    function renderFileTree() {
        els.fileTree.innerHTML = '';
        els.tabBar.innerHTML = '';

        Object.keys(fs).forEach(filename => {
            const type = fs[filename].type;
            const icon = type === 'html' ? 'fa-html5 text-orange-500' : (type === 'css' ? 'fa-css3-alt text-blue-500' : 'fa-js text-yellow-400');
            
            // Sidebar Item
            const node = document.createElement('div');
            node.className = `file-node ${filename === activeFile ? 'active' : ''}`;
            node.innerHTML = `
                <i class="fab ${icon}"></i> 
                <span>${filename}</span>
                <div class="file-actions">
                    <button class="file-node-btn" onclick="deleteFile('${filename}', event)"><i class="fas fa-trash"></i></button>
                </div>
            `;
            node.onclick = () => openFile(filename);
            els.fileTree.appendChild(node);

            // Tab Item
            const tab = document.createElement('div');
            tab.className = `tab ${filename === activeFile ? 'active' : ''}`;
            tab.innerHTML = `<i class="fab ${icon}"></i> ${filename}`;
            tab.onclick = () => openFile(filename);
            els.tabBar.appendChild(tab);
        });
    }

    function openFile(filename) {
        activeFile = filename;
        els.editor.value = fs[filename].content;
        updateEditor();
        renderFileTree();
        // Force sync after content change
        setTimeout(updateEditor, 10);
    }

    window.deleteFile = (name, e) => {
        e.stopPropagation();
        if(Object.keys(fs).length <= 1) return alert("Cannot delete the last file.");
        if(confirm(`Delete ${name}?`)) {
            delete fs[name];
            if(activeFile === name) openFile(Object.keys(fs)[0]);
            else renderFileTree();
        }
    };

    // --- NEW FILE MODAL ---
    document.getElementById('new-file-btn').onclick = () => els.modal.classList.add('active');
    document.getElementById('cancel-file').onclick = () => els.modal.classList.remove('active');
    document.getElementById('confirm-file').onclick = () => {
        const name = document.getElementById('new-filename').value.trim();
        if(name && !fs[name]) {
            let type = 'html';
            if(name.endsWith('.css')) type = 'css';
            if(name.endsWith('.js')) type = 'js';
            fs[name] = { type, content: '' };
            els.modal.classList.remove('active');
            openFile(name);
        }
    };

    // --- EXECUTION ENGINE ---
    document.getElementById('run-btn').onclick = runCode;

    function runCode() {
        // Clear Console
        els.consoleLogs.innerHTML = '';
        logToConsole('system', 'Bundling assets...');

        const html = fs['index.html'] ? fs['index.html'].content : '<h1>No index.html</h1>';
        const css = fs['style.css'] ? `<style>${fs['style.css'].content}</style>` : '';
        const js = fs['script.js'] ? fs['script.js'].content : '';

        // Console Interceptor Script
        const interceptor = `
        <script>
            (function(){
                const oldLog = console.log;
                const oldErr = console.error;
                const oldWarn = console.warn;
                
                function send(type, args) {
                    const msg = Array.from(args).join(' ');
                    window.parent.postMessage({ type: 'console', method: type, msg: msg }, '*');
                }

                console.log = function(...args) { send('log', args); oldLog.apply(console, args); };
                console.error = function(...args) { send('error', args); oldErr.apply(console, args); };
                console.warn = function(...args) { send('warn', args); oldWarn.apply(console, args); };
                
                window.onerror = function(msg, url, line) {
                    send('error', [msg + ' (Line ' + line + ')']);
                };
            })();
        <\/script>
        `;

        // Assemble Final HTML
        let finalHtml = html;
        if(finalHtml.includes('</head>')) {
            finalHtml = finalHtml.replace('</head>', `${css}</head>`);
        } else {
            finalHtml = `${css}${finalHtml}`;
        }

        // Inject JS + Interceptor at bottom
        const scripts = `${interceptor}<script>${js}<\/script>`;
        if(finalHtml.includes('</body>')) {
            finalHtml = finalHtml.replace('</body>', `${scripts}</body>`);
        } else {
            finalHtml += scripts;
        }

        // Write to Iframe
        const frameDoc = els.previewFrame.contentWindow.document;
        frameDoc.open();
        frameDoc.write(finalHtml);
        frameDoc.close();
        
        logToConsole('system', 'Build successful. App running.');
        
        // Switch to Preview tab on mobile automatically
        if(window.innerWidth < 768) {
            switchView('preview');
        }
    }

    // --- CONSOLE LOGIC ---
    window.addEventListener('message', (e) => {
        if(e.data && e.data.type === 'console') {
            logToConsole(e.data.method, e.data.msg);
        }
    });

    function logToConsole(type, msg) {
        const div = document.createElement('div');
        div.className = `log-entry ${type}`;
        
        const time = new Date().toLocaleTimeString('en-US', { hour12: false, hour: "numeric", minute: "numeric", second: "numeric"});
        div.innerHTML = `<span style="opacity:0.5; font-size:0.75em; margin-right:8px">[${time}]</span> ${escapeHtml(msg)}`;
        
        els.consoleLogs.appendChild(div);
        els.consoleLogs.scrollTop = els.consoleLogs.scrollHeight;
    }

    document.getElementById('clear-console').onclick = () => {
        els.consoleLogs.innerHTML = '';
    };

    // Console Input (Basic Eval)
    els.consoleInput.addEventListener('keydown', (e) => {
        if(e.key === 'Enter') {
            const cmd = els.consoleInput.value;
            logToConsole('log', `> ${cmd}`);
            try {
                // Execute in context of iframe window
                const result = els.previewFrame.contentWindow.eval(cmd);
                logToConsole('info', String(result));
            } catch(err) {
                logToConsole('error', err.message);
            }
            els.consoleInput.value = '';
        }
    });

    // --- LAYOUT & RESIZING ---
    let isResizing = false;
    els.resizer.addEventListener('mousedown', () => {
        isResizing = true;
        els.outputPane.style.pointerEvents = 'none'; // Fix iframe capture
        document.body.style.cursor = 'col-resize';
    });

    document.addEventListener('mouseup', () => {
        isResizing = false;
        els.outputPane.style.pointerEvents = 'auto';
        document.body.style.cursor = 'default';
    });

    document.addEventListener('mousemove', (e) => {
        if(!isResizing) return;
        const containerWidth = document.body.clientWidth;
        const newWidth = containerWidth - e.clientX;
        if(newWidth > 200 && newWidth < containerWidth - 200) {
            els.outputPane.style.width = newWidth + 'px';
        }
    });

    // --- MOBILE VIEW SWITCHER ---
    const viewBtns = document.querySelectorAll('.view-btn');
    
    function switchView(target) {
        // Update Buttons
        viewBtns.forEach(b => b.classList.toggle('active', b.dataset.target === target));

        // Logic
        if (target === 'editor') {
            els.editorPane.classList.add('active-mobile');
            els.outputPane.classList.remove('active-mobile');
        } else {
            els.editorPane.classList.remove('active-mobile');
            els.outputPane.classList.add('active-mobile');
            
            // Sub-switch for Preview vs Console
            document.getElementById('view-preview').style.display = target === 'preview' ? 'flex' : 'none';
            document.getElementById('view-console').style.display = target === 'console' ? 'flex' : 'none';
        }
    }

    viewBtns.forEach(btn => {
        btn.addEventListener('click', () => switchView(btn.dataset.target));
    });

    document.getElementById('sidebar-toggle').addEventListener('click', () => {
        els.sidebar.classList.toggle('active');
    });

    // Desktop: Tab Switching for Output
    // (Optional: You could add tabs for Console/Preview on Desktop too, currently they are separate or stacked.
    // In this CSS grid layout, I kept them simple. For "Replit" feel, usually Console is below Preview or a tab.)
    // We will reuse the mobile logic for the right pane content on desktop if clicked manually.
    
    // --- INIT ---
    openFile('index.html');
});
</script>

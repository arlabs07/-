
document.addEventListener('DOMContentLoaded', () => {
    const defaultCode = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>ARhub Preview</title>
  <style>
    body {
      background: #09090b;
      color: #e4e4e7;
      font-family: 'Segoe UI', sans-serif;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      height: 100vh;
      margin: 0;
      overflow: hidden;
    }
    .container {
      position: relative;
      text-align: center;
      z-index: 10;
    }
    h1 {
      font-size: 2.5rem;
      margin: 0 0 10px 0;
      background: linear-gradient(to right, #00c6ff, #0072ff);
      -webkit-background-clip: text;
      color: transparent;
    }
    .card {
      background: rgba(255, 255, 255, 0.05);
      border: 1px solid rgba(255, 255, 255, 0.1);
      padding: 2rem;
      border-radius: 16px;
      backdrop-filter: blur(10px);
      box-shadow: 0 20px 50px rgba(0,0,0,0.5);
      animation: float 6s ease-in-out infinite;
    }
    p { color: #a1a1aa; line-height: 1.6; }
    .btn {
      margin-top: 20px;
      padding: 10px 24px;
      background: #fff;
      color: #000;
      border: none;
      border-radius: 50px;
      font-weight: bold;
      cursor: pointer;
      transition: transform 0.2s;
    }
    .btn:hover { transform: scale(1.05); }
    @keyframes float {
      0%, 100% { transform: translateY(0); }
      50% { transform: translateY(-10px); }
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="card">
      <h1>Hello World.</h1>
      <p>The compiler is now fully operational.<br>
      Edit this code to reshape reality.</p>
      <button class="btn">Initialize</button>
    </div>
  </div>
</body>
</html>`;

    const editor = document.getElementById('code-editor');
    const highlighting = document.getElementById('highlighting-content');
    const iframe = document.getElementById('live-preview');
    const lineNumbers = document.getElementById('line-numbers');
    
    const btns = document.querySelectorAll('.switch-btn');
    const paneCode = document.getElementById('pane-code');
    const panePreview = document.getElementById('pane-preview');

    btns.forEach(btn => {
        btn.addEventListener('click', () => {
            btns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');

            const view = btn.dataset.view;
            if (view === 'code') {
                paneCode.classList.add('active');
                panePreview.classList.remove('active');
            } else {
                paneCode.classList.remove('active');
                panePreview.classList.add('active');
            }
        });
    });

    function escapeHtml(unsafe) {
        return unsafe
             .replace(/&/g, "&amp;")
             .replace(/</g, "&lt;")
             .replace(/>/g, "&gt;")
             .replace(/"/g, "&quot;")
             .replace(/'/g, "&#039;");
    }

    function simpleHighlight(code) {
        let lines = code.split('\n');
        let highlighted = lines.map(line => {
            let safeLine = escapeHtml(line);
            
            if (safeLine.trim().startsWith('&lt;!--')) {
                return `<span class="syn-comment">${safeLine}</span>`;
            }
            
            if (safeLine.toLowerCase().includes('&lt;!doctype')) {
                return `<span class="syn-doctype">${safeLine}</span>`;
            }

            safeLine = safeLine.replace(/(&lt;\/?)(\w+)(.*?)(\/?&gt;)/g, (match, p1, p2, p3, p4) => {
                let attrs = p3.replace(/(\s+)([\w-]+)(=)(&quot;.*?&quot;|&#039;.*?&#039;)/g, 
                    '$1<span class="syn-attr">$2</span>$3<span class="syn-str">$4</span>');
                return `${p1}<span class="syn-tag">${p2}</span>${attrs}${p4}`;
            });

            return safeLine;
        });
        
        return highlighted.join('\n');
    }

    function updateLineNumbers(code) {
        const lines = code.split('\n').length;
        let html = '';
        for (let i = 1; i <= lines; i++) {
            html += `<span class="line-number-item">${i}</span>`;
        }
        lineNumbers.innerHTML = html;
    }

    function updateEditor() {
        const code = editor.value;
        let html = simpleHighlight(code);
        if (code[code.length-1] === "\n") {
            html += " "; 
        }
        highlighting.innerHTML = html;
        updateLineNumbers(code);
        updatePreview(code);
    }

    let timeout;
    function updatePreview(code) {
        clearTimeout(timeout);
        timeout = setTimeout(() => {
            const doc = iframe.contentWindow.document;
            doc.open();
            doc.write(code);
            doc.close();
        }, 500);
    }

    if (editor && highlighting) {
        editor.value = defaultCode;
        updateEditor();

        editor.addEventListener('input', updateEditor);

        editor.addEventListener('scroll', () => {
            highlighting.parentElement.scrollTop = editor.scrollTop;
            highlighting.parentElement.scrollLeft = editor.scrollLeft;
            lineNumbers.scrollTop = editor.scrollTop;
        });

        editor.addEventListener('keydown', (e) => {
            if (e.key === 'Tab') {
                e.preventDefault();
                const start = editor.selectionStart;
                const end = editor.selectionEnd;
                const spaces = "  "; 
                editor.value = editor.value.substring(0, start) + spaces + editor.value.substring(end);
                editor.selectionStart = editor.selectionEnd = start + 2;
                updateEditor();
            }
        });
    }
});

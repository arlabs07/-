
document.addEventListener('DOMContentLoaded', () => {
    
    const messagesContainer = document.getElementById('messages-container');
    const input = document.getElementById('chat-input');
    const sendBtn = document.getElementById('send-btn');
    const sidebar = document.getElementById('chat-sidebar');
    const toggleBtn = document.getElementById('toggle-sidebar');
    const newChatBtn = document.getElementById('new-chat-btn');
    const historyList = document.getElementById('history-list');

    let isProcessing = false;

    // --- 1. UI HELPERS ---

    // Resize textarea on input
    input.addEventListener('input', () => {
        input.style.height = 'auto';
        input.style.height = Math.min(input.scrollHeight, 150) + 'px';
        sendBtn.disabled = input.value.trim() === '';
    });

    // Toggle Sidebar Mobile
    toggleBtn.addEventListener('click', () => {
        sidebar.classList.toggle('active');
    });

    // Close sidebar when clicking outside on mobile
    document.addEventListener('click', (e) => {
        if(window.innerWidth < 768 && 
           sidebar.classList.contains('active') && 
           !sidebar.contains(e.target) && 
           !toggleBtn.contains(e.target)) {
            sidebar.classList.remove('active');
        }
    });

    // Reset Input
    function resetInput() {
        input.value = '';
        input.style.height = 'auto';
        sendBtn.disabled = true;
    }

    // Scroll to bottom
    function scrollToBottom() {
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
    }

    // --- 2. MESSAGE RENDERING ---

    function appendMessage(role, text) {
        const msgDiv = document.createElement('div');
        msgDiv.className = `message ${role === 'user' ? 'user-message' : 'ai-message'}`;
        
        const avatarHtml = role === 'user' 
            ? '<i class="fas fa-user"></i>' 
            : '<i class="fas fa-robot"></i>';

        // Format Text (Basic Markdown)
        let formattedText = text;
        if(role === 'ai') {
            formattedText = parseMarkdown(text);
        } else {
            // Escape HTML for user input security
            formattedText = text.replace(/</g, "&lt;").replace(/>/g, "&gt;");
        }

        msgDiv.innerHTML = `
            <div class="avatar">${avatarHtml}</div>
            <div class="content">${formattedText}</div>
        `;

        messagesContainer.appendChild(msgDiv);
        scrollToBottom();
    }

    function appendTyping() {
        const id = 'typing-' + Date.now();
        const msgDiv = document.createElement('div');
        msgDiv.className = 'message ai-message';
        msgDiv.id = id;
        msgDiv.innerHTML = `
            <div class="avatar"><i class="fas fa-robot"></i></div>
            <div class="content">
                <div class="typing-indicator">
                    <div class="dot"></div><div class="dot"></div><div class="dot"></div>
                </div>
            </div>
        `;
        messagesContainer.appendChild(msgDiv);
        scrollToBottom();
        return id;
    }

    function removeTyping(id) {
        const el = document.getElementById(id);
        if(el) el.remove();
    }

    // Simple Markdown Parser (Bold, Code Blocks, Inline Code)
    function parseMarkdown(text) {
        // Code Blocks ```lang ... ```
        text = text.replace(/```(\w+)?\n([\s\S]*?)```/g, (match, lang, code) => {
            return `<div class="code-block">
                        <div class="code-header"><span>${lang || 'code'}</span></div>
                        <pre class="code-content">${code.replace(/</g, "&lt;")}</pre>
                    </div>`;
        });
        
        // Inline Code `...`
        text = text.replace(/`([^`]+)`/g, '<span style="background:#333; padding:2px 5px; border-radius:4px; font-family:monospace;">$1</span>');
        
        // Bold **...**
        text = text.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
        
        // Newlines to <br>
        text = text.replace(/\n/g, '<br>');
        
        return text;
    }

    // --- 3. API INTERACTION ---

    async function handleSend() {
        const text = input.value.trim();
        if(!text || isProcessing) return;

        isProcessing = true;
        resetInput();
        
        // 1. Show User Message
        appendMessage('user', text);

        // 2. Show Typing Indicator
        const typingId = appendTyping();

        try {
            // 3. Fetch from Pollinations AI
            // Using GET request as per simplest API usage: https://text.pollinations.ai/{prompt}
            const encodedPrompt = encodeURIComponent(text);
            const response = await fetch(`https://text.pollinations.ai/${encodedPrompt}`);
            
            if (!response.ok) throw new Error("API Error");
            
            const reply = await response.text();

            // 4. Remove Typing & Show AI Response
            removeTyping(typingId);
            appendMessage('ai', reply);
            
            // Add to history (UI only for now)
            addToSidebarHistory(text);

        } catch (error) {
            removeTyping(typingId);
            appendMessage('ai', "Sorry, I encountered a connection error. Please try again.");
            console.error(error);
        }

        isProcessing = false;
    }

    // --- 4. HISTORY LOGIC ---
    
    function addToSidebarHistory(prompt) {
        // Only add if it's the first message of a "session" or simplified logic
        // For this demo, just prepend the prompt as a history item
        const div = document.createElement('div');
        div.className = 'chat-item';
        div.innerHTML = `<i class="far fa-comment-alt"></i> ${prompt.substring(0, 20)}...`;
        
        // Insert after label
        const label = document.querySelector('.history-label');
        if(label && label.nextSibling) {
            historyList.insertBefore(div, label.nextSibling);
        } else {
            historyList.appendChild(div);
        }
    }

    newChatBtn.addEventListener('click', () => {
        messagesContainer.innerHTML = `
            <div class="message ai-message">
                <div class="avatar"><i class="fas fa-robot"></i></div>
                <div class="content">
                    <p>New session started. How can I help you?</p>
                </div>
            </div>
        `;
    });

    // Event Listeners
    sendBtn.addEventListener('click', handleSend);
    input.addEventListener('keydown', (e) => {
        if(e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    });

});
</file>

<file="sitemap.xml">
<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>https://arlabs07.netlify.app/</loc>
    <lastmod>2026-01-07</lastmod>
    <changefreq>weekly</changefreq>
    <priority>1.0</priority>
  </url>
  <url>
    <loc>https://arlabs07.netlify.app/playground.html</loc>
    <lastmod>2026-01-07</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.9</priority>
  </url>
  <url>
    <loc>https://arlabs07.netlify.app/arai.html</loc>
    <lastmod>2026-01-07</lastmod>
    <changefreq>daily</changefreq>
    <priority>0.9</priority>
  </url>
  <url>
    <loc>https://arlabs07.netlify.app/purplepdf.html</loc>
    <lastmod>2026-01-07</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.9</priority>
  </url>
  <url>
    <loc>https://arlabs07.netlify.app/ardev.html</loc>
    <lastmod>2026-01-07</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.9</priority>
  </url>
  <url>
    <loc>https://arlabs07.netlify.app/arkit.html</loc>
    <lastmod>2026-01-07</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.8</priority>
  </url>
  <url>
    <loc>https://arlabs07.netlify.app/app.html</loc>
    <lastmod>2026-01-07</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
  </url>
  <url>
    <loc>https://arlabs07.netlify.app/app/1.html</loc>
    <lastmod>2026-01-07</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.7</priority>
  </url>
  <url>
    <loc>https://arlabs07.netlify.app/about.html</loc>
    <lastmod>2026-01-07</lastmod>
    <changefreq>yearly</changefreq>
    <priority>0.5</priority>
  </url>
  <url>
    <loc>https://arlabs07.netlify.app/contact.html</loc>
    <lastmod>2026-01-07</lastmod>
    <changefreq>yearly</changefreq>
    <priority>0.5</priority>
  </url>
  <url>
    <loc>https://arlabs07.netlify.app/faq.html</loc>
    <lastmod>2026-01-07</lastmod>
    <changefreq>yearly</changefreq>
    <priority>0.5</priority>
  </url>
  <url>
    <loc>https://arlabs07.netlify.app/privacy.html</loc>
    <lastmod>2026-01-07</lastmod>
    <changefreq>yearly</changefreq>
    <priority>0.3</priority>
  </url>
</urlset>


document.addEventListener('DOMContentLoaded', () => {
    
    // --- 1. CONFIGURATION ---
    let blogs = [];
    if (typeof AR_DISCOVERY !== 'undefined' && AR_DISCOVERY.blogs) {
        blogs = AR_DISCOVERY.blogs;
    } else {
        console.error('AR_DISCOVERY.blogs not found.');
    }
    
    const gridView = document.getElementById('grid-view');
    const readerView = document.getElementById('reader-view');
    const blogGrid = document.getElementById('blog-grid');
    const searchInput = document.getElementById('blog-search');
    const catContainer = document.getElementById('cat-filters');
    const brContainer = document.getElementById('br-container');
    
    let currentCategory = 'All';
    let searchTerm = '';

    // --- 2. GRID RENDERING ---

    function renderCategories() {
        if(!catContainer) return;
        const cats = ['All', ...new Set(blogs.map(b => b.category))];
        catContainer.innerHTML = '';
        cats.forEach(cat => {
            const btn = document.createElement('button');
            btn.className = `cat-pill ${cat === 'All' ? 'active' : ''}`;
            btn.innerText = cat;
            btn.addEventListener('click', () => {
                document.querySelectorAll('.cat-pill').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                currentCategory = cat;
                renderGrid();
            });
            catContainer.appendChild(btn);
        });
    }

    function renderGrid() {
        if(!blogGrid) return;
        blogGrid.innerHTML = ''; 

        const filtered = blogs.filter(post => {
            const matchesCat = currentCategory === 'All' || post.category === currentCategory;
            const matchesSearch = post.title.toLowerCase().includes(searchTerm) || 
                                  post.summary.toLowerCase().includes(searchTerm);
            return matchesCat && matchesSearch;
        });

        if(filtered.length === 0) {
            blogGrid.innerHTML = '<div class="no-blogs">No posts found matching your criteria.</div>';
            return;
        }

        filtered.forEach((post, index) => {
            const card = document.createElement('article');
            card.className = 'blog-card';
            card.style.animationDelay = `${index * 0.1}s`;

            let imgHtml = post.image ? `<div class="bc-img-wrap"><img src="${post.image}" alt="${post.title}" loading="lazy"></div>` : `<div class="bc-img-wrap" style="background:#1a1a1a; display:flex; align-items:center; justify-content:center; color:#333;"><i class="fas fa-newspaper fa-3x"></i></div>`;

            // Updated Meta Structure for horizontal scroll
            card.innerHTML = `
                ${imgHtml}
                <div class="bc-content">
                    <div class="bc-meta">
                        <span>${post.category}</span>
                        <span>•</span>
                        <span>${post.date}</span>
                        <span>•</span>
                        <span>By ${post.author}</span>
                    </div>
                    <h3 class="bc-title">${post.title}</h3>
                    <p class="bc-summary">${post.summary}</p>
                    <div class="bc-footer">
                        <span>${post.readTime}</span>
                        <span class="read-btn">Read Article <i class="fas fa-arrow-right"></i></span>
                    </div>
                </div>
            `;
            card.addEventListener('click', () => { window.location.hash = post.id; });
            blogGrid.appendChild(card);
        });
    }

    // --- 3. READER RENDERING (With Sticky TOC) ---

    function renderReader(postId) {
        const post = blogs.find(b => b.id === postId);
        if(!post) { window.location.hash = ''; return; }
        if(!brContainer) return;

        let imgHtml = post.image ? `<div class="br-image"><img src="${post.image}" alt="${post.title}"></div>` : '';

        // Generate IDs for Headers in Content to link TOC
        let content = post.content;
        const headers = [];
        
        // Regex to find h2, h3 and inject IDs
        // NOTE: This is a simple parser. For production, DOMParser is safer.
        let hCount = 0;
        content = content.replace(/<(h[2-3])>(.*?)<\/\1>/gi, (match, tag, text) => {
            const id = `section-${hCount++}`;
            // Strip tags from text for TOC display
            const cleanText = text.replace(/<[^>]*>?/gm, '');
            headers.push({ id, text: cleanText, tag });
            return `<${tag} id="${id}">${text}</${tag}>`;
        });

        // Build UI
        brContainer.innerHTML = `
            <div class="br-header">
                <div class="br-meta">
                    <span>${post.category}</span>
                    <span>•</span>
                    <span>${post.date}</span>
                    <span>•</span>
                    <span>By ${post.author}</span>
                </div>
                <h1 class="br-title">${post.title}</h1>
            </div>
            ${imgHtml}
            
            <!-- Action Bar (Updated: Socials & Share only) -->
            <div class="blog-action-bar">
                <div class="action-group">
                    <button class="action-btn" title="Share on X (Twitter)" onclick="window.open('https://twitter.com/intent/tweet?text=${encodeURIComponent(post.title)}&url=${encodeURIComponent(window.location.href)}', '_blank')">
                        <i class="fab fa-x-twitter"></i>
                    </button>
                    <button class="action-btn" title="Share on LinkedIn" onclick="window.open('https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(window.location.href)}', '_blank')">
                        <i class="fab fa-linkedin"></i>
                    </button>
                    <button class="action-btn" title="Share on WhatsApp" onclick="window.open('https://wa.me/?text=${encodeURIComponent(post.title + ' ' + window.location.href)}', '_blank')">
                        <i class="fab fa-whatsapp"></i>
                    </button>
                    <button class="action-btn" title="Share on Reddit" onclick="window.open('https://www.reddit.com/submit?url=${encodeURIComponent(window.location.href)}&title=${encodeURIComponent(post.title)}', '_blank')">
                        <i class="fab fa-reddit-alien"></i>
                    </button>
                    <button class="action-btn" title="Share on Instagram" onclick="alert('Open Instagram app to share this link!')">
                        <i class="fab fa-instagram"></i>
                    </button>
                </div>
                
                <div class="action-group">
                    <button class="action-btn" title="More Options" onclick="navigator.share ? navigator.share({title: '${post.title}', url: window.location.href}) : alert('Share menu not supported on this device.')">
                        <i class="fas fa-share-nodes"></i> <span>Share</span>
                    </button>
                </div>
            </div>

            <!-- Sticky TOC Bar -->
            <div class="sticky-toc-bar" id="sticky-toc">
                <div class="toc-current" id="toc-active-text">Introduction</div>
                <button class="toc-toggle" id="toc-btn"><i class="fas fa-chevron-down"></i></button>
                <div class="toc-dropdown" id="toc-list">
                    <!-- JS Injected -->
                </div>
            </div>

            <div class="br-content" id="article-content">
                ${content}
            </div>
        `;
        
        // Scroll to top
        window.scrollTo(0, 0);

        // --- Post-Render: Libraries ---
        if(window.mermaid) mermaid.init();
        if(window.Prism) Prism.highlightAll();
        if(window.renderMathInElement) {
            renderMathInElement(document.getElementById('article-content'), {
                delimiters: [
                    {left: '$$', right: '$$', display: true},
                    {left: '$', right: '$', display: false}
                ]
            });
        }

        // --- TOC Logic ---
        setupTOC(headers);
    }

    function setupTOC(headers) {
        const tocList = document.getElementById('toc-list');
        const tocBtn = document.getElementById('toc-btn');
        const tocActiveText = document.getElementById('toc-active-text');
        
        if(!headers.length) {
            document.getElementById('sticky-toc').style.display = 'none';
            return;
        }

        // Populate Dropdown
        headers.forEach(h => {
            const item = document.createElement('div');
            item.className = 'toc-item';
            item.innerText = h.text;
            // Indent h3
            if(h.tag === 'h3') item.style.paddingLeft = '25px';
            
            item.onclick = () => {
                document.getElementById(h.id).scrollIntoView({behavior: 'smooth', block: 'start'});
                tocList.classList.remove('active');
            };
            tocList.appendChild(item);
        });

        // Toggle
        tocBtn.onclick = () => tocList.classList.toggle('active');
        document.querySelector('.toc-current').onclick = () => tocList.classList.toggle('active');

        // ScrollSpy
        const observerOptions = { root: null, rootMargin: '-100px 0px -70% 0px', threshold: 0 };
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    const id = entry.target.id;
                    const header = headers.find(h => h.id === id);
                    if(header) {
                        tocActiveText.innerText = header.text;
                        // Update dropdown active class
                        Array.from(tocList.children).forEach(child => {
                            child.classList.toggle('active', child.innerText === header.text);
                        });
                    }
                }
            });
        }, observerOptions);

        headers.forEach(h => {
            const el = document.getElementById(h.id);
            if(el) observer.observe(el);
        });
    }

    // --- 4. ROUTING ---
    function checkHash() {
        const hash = window.location.hash.substring(1); 
        if(hash) {
            if(gridView) gridView.style.display = 'none';
            if(readerView) readerView.style.display = 'block';
            renderReader(hash);
        } else {
            if(readerView) readerView.style.display = 'none';
            if(gridView) gridView.style.display = 'block';
            renderGrid();
        }
    }

    function init() {
        renderCategories();
        checkHash(); 
        window.addEventListener('hashchange', checkHash); 
        if(searchInput) {
            searchInput.addEventListener('input', (e) => {
                searchTerm = e.target.value.toLowerCase();
                renderGrid();
            });
        }
    }

    init();
});
      

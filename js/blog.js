
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

    // --- MEDIA PLAYER HELPERS (Copied from Course Logic) ---
    function createVideoPlayer(src) {
        const container = document.createElement('div');
        container.className = 'custom-video-player';
        container.innerHTML = `
            <video src="${src}" playsinline></video>
            <div class="video-controls">
                <button class="play-pause-btn"><i class="fas fa-play"></i></button>
                <div class="progress-bar-container"><div class="progress-bar-fill"></div></div>
                <div class="time-display">00:00 / 00:00</div>
                <button class="fs-btn"><i class="fas fa-expand"></i></button>
            </div>`;
        
        const video = container.querySelector('video');
        const playBtn = container.querySelector('.play-pause-btn');
        const barFill = container.querySelector('.progress-bar-fill');
        const timeD = container.querySelector('.time-display');
        const fsBtn = container.querySelector('.fs-btn');

        const toggle = () => {
            if(video.paused) { video.play(); playBtn.innerHTML='<i class="fas fa-pause"></i>'; }
            else { video.pause(); playBtn.innerHTML='<i class="fas fa-play"></i>'; }
        };
        playBtn.onclick = video.onclick = toggle;
        
        video.ontimeupdate = () => {
            barFill.style.width = (video.currentTime/video.duration)*100 + '%';
            timeD.innerText = formatTime(video.currentTime) + ' / ' + formatTime(video.duration);
        };
        
        fsBtn.onclick = () => {
            if(container.requestFullscreen) container.requestFullscreen();
            else if(video.webkitRequestFullscreen) video.webkitRequestFullscreen();
        };

        return container;
    }

    function createAudioPlayer(src) {
        const container = document.createElement('div');
        container.className = 'custom-audio-player';
        container.innerHTML = `
            <audio src="${src}"></audio>
            <div class="audio-icon-box"><i class="fas fa-music"></i></div>
            <div class="audio-info">
                <span class="audio-title">Audio Clip</span>
                <div class="audio-visualizer"><div class="av-bar"></div><div class="av-bar"></div><div class="av-bar"></div></div>
            </div>
            <button class="play-pause-btn" style="color:#00c8ff;font-size:1.5rem;"><i class="fas fa-play-circle"></i></button>`;
        
        const audio = container.querySelector('audio');
        const btn = container.querySelector('.play-pause-btn');
        
        btn.onclick = () => {
            if(audio.paused) { audio.play(); btn.innerHTML='<i class="fas fa-pause-circle"></i>'; container.classList.add('playing'); }
            else { audio.pause(); btn.innerHTML='<i class="fas fa-play-circle"></i>'; container.classList.remove('playing'); }
        };
        return container;
    }

    function createPDFViewer(src) {
        const encoded = encodeURIComponent(src);
        const div = document.createElement('div');
        div.className = 'pdf-viewer-container';
        div.innerHTML = `
            <div class="pdf-toolbar"><span><i class="fas fa-file-pdf"></i> Document</span><a href="${src}" target="_blank" class="pdf-dl-btn">Download</a></div>
            <iframe src="https://docs.google.com/gview?url=${encoded}&embedded=true" frameborder="0"></iframe>
        `;
        return div;
    }

    function enhanceMedia(root) {
        // Videos
        root.querySelectorAll('video').forEach(v => {
            if(v.closest('.custom-video-player')) return;
            const src = v.src || v.querySelector('source')?.src;
            if(src) v.replaceWith(createVideoPlayer(src));
        });
        // Audio
        root.querySelectorAll('audio').forEach(a => {
            if(a.closest('.custom-audio-player')) return;
            const src = a.src || a.querySelector('source')?.src;
            if(src) a.replaceWith(createAudioPlayer(src));
        });
        // Images (Lightbox)
        root.querySelectorAll('img').forEach(img => {
            if(img.closest('.bc-img-wrap')) return; // Don't lightbox thumbnails
            img.style.cursor = 'zoom-in';
            img.onclick = () => {
                const m = document.createElement('div');
                m.className = 'lightbox-modal active';
                m.innerHTML = `<button class="lightbox-close">&times;</button><img src="${img.src}" class="lightbox-img">`;
                document.body.appendChild(m);
                m.onclick = (e) => { if(e.target !== m.querySelector('img')) m.remove(); }
            };
        });
        // Docs
        root.querySelectorAll('a').forEach(a => {
            const h = a.getAttribute('href');
            if(h && (h.endsWith('.pdf') || h.endsWith('.doc') || h.endsWith('.docx'))) {
                a.innerHTML += ' <i class="fas fa-eye"></i>';
                a.onclick = (e) => {
                    e.preventDefault();
                    const m = document.createElement('div');
                    m.className = 'lightbox-modal active';
                    const v = createPDFViewer(h);
                    v.style.cssText = "width:90%; height:80%; background:#1a1a1a;";
                    v.querySelector('iframe').style.height = "calc(100% - 40px)";
                    m.appendChild(v);
                    
                    const c = document.createElement('button');
                    c.className='lightbox-close'; c.innerHTML='&times;';
                    c.onclick=()=>m.remove();
                    m.appendChild(c);
                    document.body.appendChild(m);
                };
            }
        });
    }

    function formatTime(s) {
        if(isNaN(s)) return "00:00";
        const m = Math.floor(s/60);
        const sec = Math.floor(s%60);
        return `${m}:${sec.toString().padStart(2,'0')}`;
    }

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

            card.innerHTML = `
                ${imgHtml}
                <div class="bc-content">
                    <div class="bc-meta">
                        <span>${post.category}</span>•<span>${post.date}</span>
                    </div>
                    <h3 class="bc-title">${post.title}</h3>
                    <p class="bc-summary">${post.summary}</p>
                    <div class="bc-footer">
                        <span>${post.readTime}</span>
                        <span class="read-btn">Read <i class="fas fa-arrow-right"></i></span>
                    </div>
                </div>
            `;
            // Safe Nav
            card.addEventListener('click', () => { 
                try { window.location.hash = post.id; } catch(e) {}
            });
            blogGrid.appendChild(card);
        });
    }

    // --- 3. READER RENDERING ---

    function renderReader(postId) {
        const post = blogs.find(b => b.id === postId);
        if(!post) { try{window.location.hash = '';}catch(e){} return; }
        if(!brContainer) return;

        let imgHtml = post.image ? `<div class="br-image"><img src="${post.image}" alt="${post.title}"></div>` : '';

        // Generate IDs for headers
        let content = post.content;
        const headers = [];
        let hCount = 0;
        content = content.replace(/<(h[2-3])>(.*?)<\/\1>/gi, (match, tag, text) => {
            const id = `section-${hCount++}`;
            const cleanText = text.replace(/<[^>]*>?/gm, '');
            headers.push({ id, text: cleanText, tag });
            return `<${tag} id="${id}">${text}</${tag}>`;
        });

        brContainer.innerHTML = `
            <div class="br-header">
                <div class="br-meta">
                    <span>${post.category}</span>•<span>${post.date}</span>•<span>By ${post.author}</span>
                </div>
                <h1 class="br-title">${post.title}</h1>
            </div>
            ${imgHtml}
            
            <div class="sticky-toc-bar" id="sticky-toc">
                <div class="toc-current" id="toc-active-text">Introduction</div>
                <button class="toc-toggle" id="toc-btn"><i class="fas fa-chevron-down"></i></button>
                <div class="toc-dropdown" id="toc-list"></div>
            </div>

            <div class="br-content" id="article-content">
                ${content}
            </div>
        `;
        
        window.scrollTo(0, 0);

        // Apply Media Enhancements
        enhanceMedia(document.getElementById('article-content'));

        // Post-Render Libraries
        if(window.mermaid) mermaid.init();
        if(window.Prism) Prism.highlightAll();
        if(window.renderMathInElement) {
            renderMathInElement(document.getElementById('article-content'), {
                delimiters: [ {left: '$$', right: '$$', display: true}, {left: '$', right: '$', display: false} ]
            });
        }

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

        headers.forEach(h => {
            const item = document.createElement('div');
            item.className = 'toc-item';
            item.innerText = h.text;
            if(h.tag === 'h3') item.style.paddingLeft = '25px';
            item.onclick = () => {
                document.getElementById(h.id).scrollIntoView({behavior: 'smooth', block: 'start'});
                tocList.classList.remove('active');
            };
            tocList.appendChild(item);
        });

        tocBtn.onclick = () => tocList.classList.toggle('active');
        document.querySelector('.toc-current').onclick = () => tocList.classList.toggle('active');
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

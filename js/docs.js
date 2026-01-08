
document.addEventListener('DOMContentLoaded', () => {
    
    // --- 1. DATA ---
    let docsData = [];
    if (typeof AR_DISCOVERY !== 'undefined' && AR_DISCOVERY.docs) {
        docsData = AR_DISCOVERY.docs;
    }

    // --- 2. ELEMENTS ---
    const navRoot = document.getElementById('ds-nav');
    const contentArea = document.getElementById('docs-render-area');
    const tocRoot = document.getElementById('page-toc');
    const mobileToggle = document.getElementById('mobile-doc-nav-toggle');
    const sidebar = document.getElementById('docs-sidebar');
    const prevBtn = document.getElementById('prev-doc');
    const nextBtn = document.getElementById('next-doc');
    const searchInput = document.getElementById('doc-search');
    
    // Sticky
    const stickyBar = document.getElementById('sticky-doc-bar');
    const sdbCurrent = document.getElementById('sdb-current');
    const sdbBtn = document.getElementById('sdb-toggle');
    const sdbList = document.getElementById('sdb-list');

    // --- MEDIA HELPERS (Duplicated for isolation) ---
    function createVideoPlayer(src) {
        const c = document.createElement('div');
        c.className = 'custom-video-player';
        c.innerHTML = `
            <video src="${src}" playsinline></video>
            <div class="video-controls">
                <button class="play-pause-btn"><i class="fas fa-play"></i></button>
                <div class="progress-bar-container"><div class="progress-bar-fill"></div></div>
                <div class="time-display">00:00 / 00:00</div>
                <button class="fs-btn"><i class="fas fa-expand"></i></button>
            </div>`;
        const v = c.querySelector('video'), p = c.querySelector('.play-pause-btn'), f = c.querySelector('.progress-bar-fill'), t = c.querySelector('.time-display');
        const tog = () => { if(v.paused) { v.play(); p.innerHTML='<i class="fas fa-pause"></i>'; } else { v.pause(); p.innerHTML='<i class="fas fa-play"></i>'; } };
        p.onclick = v.onclick = tog;
        v.ontimeupdate = () => { f.style.width=(v.currentTime/v.duration)*100+'%'; t.innerText=`${Math.floor(v.currentTime/60)}:${Math.floor(v.currentTime%60)} / ...`; };
        c.querySelector('.fs-btn').onclick = () => { if(c.requestFullscreen) c.requestFullscreen(); else if(v.webkitRequestFullscreen) v.webkitRequestFullscreen(); };
        return c;
    }

    function createAudioPlayer(src) {
        const c = document.createElement('div');
        c.className = 'custom-audio-player';
        c.innerHTML = `<audio src="${src}"></audio><div class="audio-icon-box"><i class="fas fa-music"></i></div><div class="audio-info"><span class="audio-title">Audio</span><div class="audio-visualizer"><div class="av-bar"></div><div class="av-bar"></div></div></div><button class="play-pause-btn"><i class="fas fa-play-circle"></i></button>`;
        const a = c.querySelector('audio'), b = c.querySelector('.play-pause-btn');
        b.onclick = () => { if(a.paused) { a.play(); b.innerHTML='<i class="fas fa-pause-circle"></i>'; c.classList.add('playing'); } else { a.pause(); b.innerHTML='<i class="fas fa-play-circle"></i>'; c.classList.remove('playing'); } };
        return c;
    }

    // Expanded PDF Viewer for Docs
    function createPDFViewer(src) {
        const enc = encodeURIComponent(src);
        const d = document.createElement('div');
        d.className = 'pdf-viewer-container';
        // Explicit Download Text
        d.innerHTML = `
            <div class="pdf-toolbar">
                <span><i class="fas fa-file-pdf"></i> Document</span>
                <a href="${src}" target="_blank" class="pdf-dl-btn">Download</a>
            </div>
            <iframe src="https://docs.google.com/gview?url=${enc}&embedded=true" frameborder="0"></iframe>
        `;
        return d;
    }

    function enhanceMedia(root) {
        root.querySelectorAll('video').forEach(v => { if(!v.closest('.custom-video-player') && v.src) v.replaceWith(createVideoPlayer(v.src)); });
        root.querySelectorAll('audio').forEach(a => { if(!a.closest('.custom-audio-player') && a.src) a.replaceWith(createAudioPlayer(a.src)); });
        root.querySelectorAll('img').forEach(i => {
            i.style.cursor = 'zoom-in';
            i.onclick = () => {
                const m = document.createElement('div'); m.className='lightbox-modal active';
                m.innerHTML=`<button class="lightbox-close">&times;</button><img src="${i.src}" class="lightbox-img">`;
                document.body.appendChild(m);
                m.onclick=(e)=>{if(e.target!==m.querySelector('img')) m.remove();}
            };
        });
        root.querySelectorAll('a').forEach(a => {
            const h = a.getAttribute('href');
            if(h && (h.endsWith('.pdf')||h.endsWith('.doc')||h.endsWith('.docx'))) {
                a.innerHTML += ' <i class="fas fa-eye"></i>';
                a.onclick = (e) => {
                    e.preventDefault();
                    const m = document.createElement('div'); m.className='lightbox-modal active';
                    
                    const v = createPDFViewer(h);
                    v.style.cssText = "width:90%; height:80%; background:#1a1a1a; border-radius:8px;";
                    // Ensure toolbar height is accounted for
                    const frame = v.querySelector('iframe');
                    if(frame) frame.style.height = "calc(100% - 45px)";
                    
                    m.appendChild(v);
                    
                    const c = document.createElement('button'); c.className='lightbox-close'; c.innerHTML='&times;';
                    c.onclick=()=>m.remove(); m.appendChild(c);
                    document.body.appendChild(m);
                }
            }
        });
    }

    // --- 3. NAVIGATION ---
    
    function renderNavigation() {
        if(!navRoot) return;
        navRoot.innerHTML = '';
        const grouped = docsData.reduce((acc, doc) => { (acc[doc.category]=acc[doc.category]||[]).push(doc); return acc; }, {});

        for (const [cat, items] of Object.entries(grouped)) {
            const d = document.createElement('div'); d.className='nav-category';
            d.innerHTML = `<div class="nav-cat-title">${cat}</div>`;
            items.forEach(doc => {
                const l = document.createElement('div'); l.className='nav-item';
                l.dataset.id = doc.id;
                l.innerHTML = `<i class="${doc.icon||'fas fa-file-alt'}"></i> ${doc.title}`;
                l.addEventListener('click', () => navigateTo(doc.id));
                d.appendChild(l);
            });
            navRoot.appendChild(d);
        }
    }

    function renderDoc(id) {
        const doc = docsData.find(d => d.id === id);
        if(!doc) return;

        let content = doc.content;
        const headers = [];
        let hCount = 0;
        content = content.replace(/<(h[2-3])>(.*?)<\/\1>/gi, (m, tag, text) => {
            const hid = `sec-${hCount++}`;
            const clean = text.replace(/<[^>]*>?/gm, '');
            headers.push({ id: hid, text: clean, tag });
            return `<${tag} id="${hid}">${text}</${tag}>`;
        });

        contentArea.innerHTML = `
            <div class="doc-entry">
                <h1>${doc.title}</h1>
                <div class="doc-meta">Updated: ${doc.lastUpdated}</div>
                <div id="doc-body">${content}</div>
            </div>`;

        // Active State
        document.querySelectorAll('.nav-item').forEach(i => i.classList.toggle('active', i.dataset.id === id));

        // Enhance
        enhanceMedia(document.getElementById('doc-body'));
        if(window.Prism) Prism.highlightAll();
        if(window.mermaid) mermaid.init(undefined, document.querySelectorAll('.mermaid'));
        if(window.renderMathInElement) renderMathInElement(document.getElementById('doc-body'), {delimiters:[{left:'$$',right:'$$',display:true},{left:'$',right:'$',display:false}]});

        generateTOC(headers);
        setupStickyBar(headers);
        updateFooterNav(id);
        
        if(sidebar.classList.contains('active')) sidebar.classList.remove('active');
        window.scrollTo(0, 0);
    }

    function generateTOC(headers) {
        if(!tocRoot) return;
        tocRoot.innerHTML = '';
        if(headers.length === 0) { document.querySelector('.docs-toc').style.display='none'; return; }
        if(window.innerWidth >= 1200) document.querySelector('.docs-toc').style.display='block';

        headers.forEach(h => {
            const li = document.createElement('li');
            li.innerHTML = `<a href="#${h.id}" class="toc-link" style="padding-left:${h.tag==='h3'?'30px':'15px'}">${h.text}</a>`;
            li.querySelector('a').addEventListener('click', (e) => {
                e.preventDefault(); document.getElementById(h.id).scrollIntoView({behavior:'smooth'});
            });
            tocRoot.appendChild(li);
        });
    }

    function setupStickyBar(headers) {
        if(!headers.length) { stickyBar.style.display='none'; return; }
        stickyBar.style.display='flex';
        sdbCurrent.innerText='Introduction';
        sdbList.innerHTML='';
        
        headers.forEach(h => {
            const d = document.createElement('div'); d.className='sdb-item'; d.innerText=h.text;
            if(h.tag==='h3') d.style.paddingLeft='25px';
            d.onclick=()=>{ document.getElementById(h.id).scrollIntoView({behavior:'smooth'}); sdbList.classList.remove('active'); };
            sdbList.appendChild(d);
        });
        
        const togg = () => sdbList.classList.toggle('active');
        sdbBtn.onclick = sdbCurrent.onclick = togg;
    }

    function updateFooterNav(id) {
        const idx = docsData.findIndex(d => d.id === id);
        const prev = docsData[idx - 1];
        const next = docsData[idx + 1];
        
        const setB = (b, d) => {
            if(d) { b.classList.remove('disabled'); b.onclick=()=>navigateTo(d.id); b.title=d.title; }
            else { b.classList.add('disabled'); b.onclick=null; }
        };
        setB(prevBtn, prev);
        setB(nextBtn, next);
    }

    function navigateTo(id) {
        try { history.pushState(null, null, `#${id}`); } catch(e) { window.location.hash = id; }
        renderDoc(id);
    }

    // Init
    function init() {
        renderNavigation();
        const hash = window.location.hash.substring(1);
        if(hash && docsData.find(d=>d.id===hash)) renderDoc(hash);
        else if(docsData.length>0) renderDoc(docsData[0].id);

        if(mobileToggle) mobileToggle.onclick=()=>sidebar.classList.toggle('active');
        if(searchInput) searchInput.addEventListener('input', (e)=>{
            const term = e.target.value.toLowerCase();
            document.querySelectorAll('.nav-item').forEach(i=>{
                i.style.display = i.innerText.toLowerCase().includes(term) ? 'flex' : 'none';
            });
        });
    }
    init();
});
              

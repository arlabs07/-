
document.addEventListener('DOMContentLoaded', () => {
    
    // --- 1. DATA SOURCE ---
    let courses = [];
    if (typeof AR_DISCOVERY !== 'undefined' && AR_DISCOVERY.courses) {
        courses = AR_DISCOVERY.courses;
    }

    // --- 2. ELEMENTS ---
    const catalogView = document.getElementById('catalog-view');
    const playerView = document.getElementById('player-view');
    const courseGrid = document.getElementById('course-grid');
    
    const sidebar = document.getElementById('player-sidebar');
    const sidebarContent = document.getElementById('ps-modules');
    const courseTitleEl = document.getElementById('ps-course-title');
    const renderArea = document.getElementById('player-render-area');
    const mobileToggle = document.getElementById('mobile-syllabus-toggle');
    const backBtn = document.getElementById('back-to-catalog');
    
    const prevBtn = document.getElementById('prev-lesson');
    const nextBtn = document.getElementById('next-lesson');

    // Sticky TOC Elements
    const stickyToc = document.getElementById('lesson-toc');
    const tocCurrent = document.getElementById('lt-current-text');
    const tocToggle = document.getElementById('lt-toggle-btn');
    const tocList = document.getElementById('lt-list');

    // --- 3. ROUTING LOGIC ---
    
    function parseHash() {
        const hash = window.location.hash; 
        if(!hash || hash === '#') return { courseId: null, lessonId: null };
        const parts = hash.split('#').filter(p => p !== '');
        return { courseId: parts[0] || null, lessonId: parts[1] || null };
    }

    function handleRouting() {
        const { courseId, lessonId } = parseHash();
        if (courseId) {
            const course = courses.find(c => c.id === courseId);
            if (course) {
                showPlayer(course, lessonId);
            } else {
                safeSetHash('');
                showCatalog();
            }
        } else {
            showCatalog();
        }
    }

    function safeReplaceState(hash) { try { history.replaceState(null, null, hash); } catch (e) {} }
    function safeSetHash(hash) { try { window.location.hash = hash; } catch (e) {} }

    window.addEventListener('hashchange', handleRouting);

    // --- 4. CATALOG VIEW ---

    function showCatalog() {
        if(catalogView) catalogView.style.display = 'block';
        if(playerView) playerView.style.display = 'none';
        document.body.style.overflow = ''; 
        renderCatalog();
    }

    function renderCatalog() {
        if(!courseGrid) return;
        courseGrid.innerHTML = '';
        
        if(courses.length === 0) {
            courseGrid.innerHTML = '<div style="color:#666; text-align:center; padding:20px;">No courses available at the moment.</div>';
            return;
        }

        courses.forEach((course, index) => {
            const card = document.createElement('div');
            card.className = 'course-card';
            card.style.setProperty('--accent-color', course.color);
            card.style.animation = `fadeIn 0.5s ease forwards ${index * 0.1}s`;
            card.style.opacity = '0'; 

            card.innerHTML = `
                <div class="cc-thumb">
                    <img src="${course.thumbnail}" alt="${course.title}" loading="lazy">
                </div>
                <div class="cc-content">
                    <div class="cc-badge">${course.level}</div>
                    <h2 class="cc-title">${course.title}</h2>
                    <p class="cc-desc">${course.description}</p>
                    <div class="cc-meta">
                        <span><i class="fas fa-user"></i> ${course.instructor}</span>
                        <span><i class="fas fa-clock"></i> ${course.duration}</span>
                    </div>
                </div>
            `;
            
            card.onclick = () => { safeSetHash(`#${course.id}`); };
            courseGrid.appendChild(card);
        });
    }

    // --- 5. PLAYER VIEW ---

    let currentCourse = null;
    let flatLessons = []; 

    function showPlayer(course, lessonId) {
        if(catalogView) catalogView.style.display = 'none';
        if(playerView) playerView.style.display = 'flex';
        currentCourse = course;
        
        if(courseTitleEl) courseTitleEl.innerText = course.title;
        renderSidebar(course, lessonId);

        flatLessons = [];
        course.modules.forEach(mod => {
            mod.lessons.forEach(l => flatLessons.push(l));
        });

        let activeLesson = flatLessons.find(l => l.id === lessonId);
        
        if (!activeLesson && flatLessons.length > 0) {
            activeLesson = flatLessons[0];
            safeReplaceState(`#${course.id}#${activeLesson.id}`);
        }

        renderLessonContent(activeLesson);
        updateNavButtons(activeLesson);
        
        if(renderArea) renderArea.scrollTop = 0;
    }

    function renderSidebar(course, activeLessonId) {
        if(!sidebarContent) return;
        sidebarContent.innerHTML = '';
        
        course.modules.forEach(mod => {
            const modDiv = document.createElement('div');
            modDiv.className = 'ps-module';
            
            const title = document.createElement('div');
            title.className = 'ps-module-title';
            title.innerText = mod.title;
            modDiv.appendChild(title);

            mod.lessons.forEach(lesson => {
                const lDiv = document.createElement('div');
                lDiv.className = `ps-lesson ${lesson.id === activeLessonId ? 'active' : ''}`;
                
                let iconClass = 'fa-file-alt';
                if(lesson.type === 'video') iconClass = 'fa-play-circle';
                if(lesson.type === 'audio') iconClass = 'fa-headphones';
                if(lesson.type === 'image') iconClass = 'fa-image';
                if(lesson.type === 'pdf') iconClass = 'fa-file-pdf';

                lDiv.innerHTML = `<i class="fas ${iconClass}"></i> ${lesson.title}`;
                
                lDiv.onclick = () => {
                    safeSetHash(`#${course.id}#${lesson.id}`);
                    if(sidebar && window.innerWidth < 768) sidebar.classList.remove('active');
                };
                
                modDiv.appendChild(lDiv);
            });

            sidebarContent.appendChild(modDiv);
        });
    }

    function renderLessonContent(lesson) {
        if(!renderArea) return;
        if(!lesson) {
            renderArea.innerHTML = '<div class="empty-state">Select a lesson to begin.</div>';
            return;
        }
        
        renderArea.innerHTML = '';

        const wrapper = document.createElement('div');
        wrapper.className = 'lesson-content';

        // Title Header
        const header = document.createElement('div');
        header.innerHTML = `<h1 style="font-size:2rem; margin-bottom:20px; color:#fff; border-bottom:1px solid rgba(255,255,255,0.1); padding-bottom:15px;">${lesson.title}</h1>`;
        wrapper.appendChild(header);

        // Media Components (Using Hoisted Functions)
        if (lesson.type === 'video') {
            wrapper.appendChild(createVideoPlayer(lesson.src, lesson.poster));
        } else if (lesson.type === 'audio') {
            wrapper.appendChild(createAudioPlayer(lesson.src, lesson.title));
        } else if (lesson.type === 'image') {
            wrapper.appendChild(createImageViewer(lesson.src, lesson.caption));
        } else if (lesson.type === 'pdf') {
            wrapper.appendChild(createPDFViewer(lesson.src));
        }

        // Text Content with Header Injection for TOC
        if (lesson.content) {
            const textDiv = document.createElement('div');
            // Improved regex to handle attributes in headers
            let processedContent = lesson.content;
            let hCount = 0;
            // Add ids to h2 and h3, robustly handling attributes
            processedContent = processedContent.replace(/<(h[2-3])(.*?)>(.*?)<\/\1>/gi, (match, tag, attrs, text) => {
                const id = `toc-${hCount++}`;
                return `<${tag} id="${id}" ${attrs}>${text}</${tag}>`;
            });
            
            textDiv.className = 'prose';
            textDiv.innerHTML = processedContent;
            wrapper.appendChild(textDiv);
        }

        renderArea.appendChild(wrapper);

        // Post-Processing & Library Initialization
        enhanceMedia(wrapper);
        
        // 1. Prism Code Highlighting
        if(window.Prism) Prism.highlightAll();
        
        // 2. Mermaid Diagrams
        if(window.mermaid) {
            mermaid.init(undefined, wrapper.querySelectorAll('.mermaid'));
        }

        // 3. KaTeX Math
        if(window.renderMathInElement) {
            renderMathInElement(wrapper, {
                delimiters: [
                    {left: '$$', right: '$$', display: true},
                    {left: '$', right: '$', display: false}
                ],
                throwOnError: false
            });
        }
        
        // Generate TOC
        generateTOC(wrapper);
    }

    // --- TOC LOGIC ---
    function generateTOC(root) {
        const headings = root.querySelectorAll('h2, h3');
        
        if (headings.length === 0) {
            if(stickyToc) stickyToc.style.display = 'none';
            return;
        }

        if(stickyToc) stickyToc.style.display = 'flex';
        if(tocCurrent) tocCurrent.innerText = "Lesson Overview";
        if(tocList) {
            tocList.innerHTML = '';
            headings.forEach(h => {
                const item = document.createElement('div');
                item.className = 'lt-item';
                item.innerText = h.innerText;
                if(h.tagName === 'H3') item.style.paddingLeft = '35px';
                
                item.onclick = () => {
                    h.scrollIntoView({behavior: 'smooth', block: 'start'});
                    tocList.classList.remove('open');
                };
                
                tocList.appendChild(item);
            });
        }

        // Event for toggle
        const toggle = () => tocList.classList.toggle('open');
        if(tocToggle) tocToggle.onclick = toggle;
        
        // Close dropdown when clicking content to improve UX
        if(renderArea) renderArea.onclick = () => {
            if(tocList) tocList.classList.remove('open');
        };
    }

    // --- ENHANCED MEDIA COMPONENTS ---

    // 1. Image Viewer
    function createImageViewer(src, caption) {
        const div = document.createElement('div');
        div.className = 'image-viewer';
        div.innerHTML = `
            <img src="${src}" alt="${caption || 'Lesson Image'}" loading="lazy">
            ${caption ? `<div class="image-caption">${caption}</div>` : ''}
        `;
        
        // Lightbox integration
        const img = div.querySelector('img');
        img.onclick = () => {
            const m = document.createElement('div');
            m.className = 'lightbox-modal active';
            m.innerHTML = `<button class="lightbox-close">&times;</button><img src="${src}" class="lightbox-img">`;
            document.body.appendChild(m);
            m.onclick = (e) => { if (e.target !== m.querySelector('img')) m.remove(); };
        };
        
        return div;
    }

    // 2. PDF Viewer
    function createPDFViewer(src) {
        const encoded = encodeURIComponent(src);
        const div = document.createElement('div');
        div.className = 'pdf-viewer-container';
        div.innerHTML = `
            <div class="pdf-toolbar">
                <span class="pdf-label"><i class="fas fa-file-pdf"></i> Document</span>
                <a href="${src}" target="_blank" class="pdf-dl-btn">Download</a>
            </div>
            <iframe src="https://docs.google.com/gview?url=${encoded}&embedded=true" frameborder="0"></iframe>
        `;
        return div;
    }

    // 3. Video Player
    function createVideoPlayer(src, poster) {
        const container = document.createElement('div');
        container.className = 'custom-video-player paused';
        
        container.innerHTML = `
            <video src="${src}" poster="${poster || ''}" playsinline></video>
            <div class="video-controls">
                <button class="play-pause-btn" aria-label="Play"><i class="fas fa-play"></i></button>
                <div class="progress-bar-container" role="slider" aria-label="Video Progress">
                    <div class="progress-bar-fill"></div>
                </div>
                <div class="time-display">00:00 / 00:00</div>
                <button class="fs-btn" aria-label="Fullscreen"><i class="fas fa-expand"></i></button>
            </div>
        `;

        const video = container.querySelector('video');
        const playBtn = container.querySelector('.play-pause-btn');
        const barFill = container.querySelector('.progress-bar-fill');
        const barContainer = container.querySelector('.progress-bar-container');
        const timeDisplay = container.querySelector('.time-display');
        const fsBtn = container.querySelector('.fs-btn');

        const togglePlay = () => {
            if(video.paused) {
                video.play();
                playBtn.innerHTML = '<i class="fas fa-pause"></i>';
                playBtn.setAttribute('aria-label', 'Pause');
                container.classList.remove('paused');
            } else {
                video.pause();
                playBtn.innerHTML = '<i class="fas fa-play"></i>';
                playBtn.setAttribute('aria-label', 'Play');
                container.classList.add('paused');
            }
        };

        playBtn.onclick = (e) => { e.stopPropagation(); togglePlay(); };
        video.onclick = togglePlay;

        video.ontimeupdate = () => {
            if(video.duration) {
                const pct = (video.currentTime / video.duration) * 100;
                barFill.style.width = `${pct}%`;
                timeDisplay.innerText = formatTime(video.currentTime) + ' / ' + formatTime(video.duration);
            }
        };

        barContainer.onclick = (e) => {
            e.stopPropagation();
            const rect = barContainer.getBoundingClientRect();
            const pos = (e.clientX - rect.left) / rect.width;
            video.currentTime = pos * video.duration;
        };

        fsBtn.onclick = (e) => {
            e.stopPropagation();
            if (document.fullscreenElement) {
                document.exitFullscreen();
            } else {
                if (container.requestFullscreen) container.requestFullscreen();
                else if (video.webkitRequestFullscreen) video.webkitRequestFullscreen();
            }
        };

        return container;
    }

    // 4. Audio Player (Wave Animation)
    function createAudioPlayer(src, title) {
        const container = document.createElement('div');
        container.className = 'custom-audio-player';
        
        container.innerHTML = `
            <audio src="${src}"></audio>
            <div class="audio-icon-box"><i class="fas fa-music"></i></div>
            <div class="audio-info">
                <span class="audio-title">${title || 'Audio Track'}</span>
                <div class="audio-visualizer">
                    <div class="av-bar"></div><div class="av-bar"></div><div class="av-bar"></div><div class="av-bar"></div><div class="av-bar"></div>
                </div>
            </div>
            <button class="play-pause-btn" aria-label="Play Audio"><i class="fas fa-play-circle"></i></button>
        `;

        const audio = container.querySelector('audio');
        const playBtn = container.querySelector('.play-pause-btn');

        playBtn.onclick = () => {
            if(audio.paused) { 
                audio.play(); 
                playBtn.innerHTML = '<i class="fas fa-pause-circle"></i>';
                container.classList.add('playing');
            } else { 
                audio.pause(); 
                playBtn.innerHTML = '<i class="fas fa-play-circle"></i>';
                container.classList.remove('playing');
            }
        };

        return container;
    }

    // 5. Iframe & Media Enhancement
    function enhanceMedia(container) {
        // Videos (Convert raw tags to custom players)
        container.querySelectorAll('video').forEach(vid => {
            if(vid.closest('.custom-video-player')) return;
            const src = vid.src || vid.querySelector('source')?.src;
            if(src) {
                const player = createVideoPlayer(src, vid.poster);
                vid.replaceWith(player);
            }
        });

        // Audios
        container.querySelectorAll('audio').forEach(aud => {
            if(aud.closest('.custom-audio-player')) return;
            const src = aud.src || aud.querySelector('source')?.src;
            if(src) {
                const player = createAudioPlayer(src, "Audio Clip");
                aud.replaceWith(player);
            }
        });

        // Iframes (Responsive Wrapper)
        container.querySelectorAll('iframe').forEach(iframe => {
            if(iframe.closest('.responsive-embed') || iframe.closest('.pdf-viewer-container')) return;
            
            const wrapper = document.createElement('div');
            wrapper.className = 'responsive-embed';
            
            iframe.setAttribute('loading', 'lazy');
            if(!iframe.getAttribute('title')) iframe.setAttribute('title', 'Embedded Content');
            
            // Clone to preserve event listeners if any, though mostly for structure
            const newIframe = iframe.cloneNode(true);
            
            iframe.parentNode.insertBefore(wrapper, iframe);
            wrapper.appendChild(newIframe);
            iframe.remove();
        });
        
        // Docs & PDFs (Lightbox View)
        container.querySelectorAll('a').forEach(link => {
            const href = link.getAttribute('href');
            if(href && (href.endsWith('.pdf') || href.endsWith('.doc'))) {
                // Prevent duplicate icons
                if(!link.querySelector('.fa-eye')) {
                    link.innerHTML += ' <i class="fas fa-eye"></i>';
                }
                
                link.onclick = (e) => {
                    e.preventDefault();
                    const m = document.createElement('div');
                    m.className = 'lightbox-modal active';
                    
                    const viewer = createPDFViewer(href);
                    // Force style for lightbox context
                    viewer.style.cssText = "width:90%; height:85%; background:#1a1a1a; max-width:1000px; border-radius:8px; display:flex; flex-direction:column;";
                    const iframe = viewer.querySelector('iframe');
                    if(iframe) iframe.style.height = "100%";
                    
                    m.appendChild(viewer);
                    
                    const close = document.createElement('button');
                    close.className = 'lightbox-close';
                    close.innerHTML = '&times;';
                    close.onclick = () => m.remove();
                    m.appendChild(close);
                    
                    document.body.appendChild(m);
                }
            }
        });
    }

    function formatTime(seconds) {
        if(isNaN(seconds)) return "00:00";
        const m = Math.floor(seconds / 60);
        const s = Math.floor(seconds % 60);
        return `${m.toString().padStart(2,'0')}:${s.toString().padStart(2,'0')}`;
    }

    function updateNavButtons(currentLesson) {
        if(!currentLesson) return;
        const idx = flatLessons.findIndex(l => l.id === currentLesson.id);
        
        if(idx > 0) {
            prevBtn.classList.remove('disabled');
            prevBtn.onclick = () => safeSetHash(`#${currentCourse.id}#${flatLessons[idx-1].id}`);
        } else {
            prevBtn.classList.add('disabled');
            prevBtn.onclick = null;
        }

        if(idx < flatLessons.length - 1) {
            nextBtn.classList.remove('disabled');
            nextBtn.onclick = () => safeSetHash(`#${currentCourse.id}#${flatLessons[idx+1].id}`);
        } else {
            nextBtn.classList.add('disabled');
            nextBtn.onclick = null;
        }
    }

    if(backBtn) backBtn.onclick = () => safeSetHash('');
    if(mobileToggle) mobileToggle.onclick = () => sidebar.classList.toggle('active');

    handleRouting();
});

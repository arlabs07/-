
document.addEventListener('DOMContentLoaded', () => {
    
    // --- LOAD SYSTEMS FROM SITEMAP ---
    // Fallback if sitemap.js didn't load
    const systems = (typeof AR_DISCOVERY !== 'undefined') ? AR_DISCOVERY.systems : [];

    const grid = document.getElementById('projects-grid');
    const searchInput = document.getElementById('project-search');
    const loadMoreBtn = document.getElementById('load-more-btn');
    
    if(!grid) return; // Exit if grid doesn't exist (e.g. on subpage)

    // --- LOAD MORE LOGIC ---
    // 3 for Mobile, 6 for Desktop (>= 1024px)
    let itemsToShow = window.innerWidth >= 1024 ? 6 : 3;
    let currentFilteredList = [...systems]; // Start with full list

    function renderProjects(list, limit) {
        grid.innerHTML = '';
        
        if(list.length === 0) {
            grid.innerHTML = '<div class="status-msg">No tools found matching your search.</div>';
            loadMoreBtn.style.display = 'none';
            return;
        }

        // Slice the list based on limit
        const visibleItems = list.slice(0, limit);

        visibleItems.forEach((project, index) => {
            const div = document.createElement('div');
            div.className = 'project-card';
            
            let imageHtml = '';
            
            // Logic for images vs placeholders
            if (project.image && project.image.length > 5) {
                // If it's a favicon or specific image
                 imageHtml = `<div class="no-image-placeholder" style="background:#0d1117;color:#00c8ff"><i class="${project.iconClass || 'fas fa-cube'} fa-2x"></i></div>`;
            } else {
                // Default placeholder with icon
                imageHtml = `<div class="no-image-placeholder"><i class="${project.iconClass || 'fas fa-cube'}"></i></div>`;
            }

            // Button Logic
            let btnLabel = "Open Tool";
            let btnClass = "card-link";
            if(project.isPlaceholder) {
                btnLabel = "In Development";
                btnClass = "card-link disabled";
            }

            div.innerHTML = `
                <div class="card-image">
                    ${imageHtml}
                </div>
                <div class="card-content">
                    <span class="project-number">SYS.${(index + 1).toString().padStart(3, '0')}</span>
                    <h3 class="card-title">${project.title}</h3>
                    <p class="card-desc">${project.description}</p>
                    <a href="${project.link}" 
                       ${project.link.startsWith('http') ? 'target="_blank"' : ''} 
                       class="${btnClass}"
                       ${project.isPlaceholder ? 'style="opacity:0.5; cursor:not-allowed; pointer-events:none;"' : ''}>
                        ${btnLabel} <i class="fas fa-external-link-alt"></i>
                    </a>
                </div>
            `;
            grid.appendChild(div);
        });

        // Hide button if showing all items
        if (visibleItems.length >= list.length) {
            loadMoreBtn.style.display = 'none';
        } else {
            loadMoreBtn.style.display = 'block';
        }
    }

    // Initial Render
    renderProjects(currentFilteredList, itemsToShow);

    // Resize Handler
    window.addEventListener('resize', () => {
       // Optional dynamic adjustment logic
    });

    // Load More Click Handler
    if (loadMoreBtn) {
        loadMoreBtn.addEventListener('click', () => {
            itemsToShow += 3; // Load 3 more every time
            renderProjects(currentFilteredList, itemsToShow);
        });
    }

    // Search Functionality
    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            const term = e.target.value.toLowerCase();
            // Filter source list
            currentFilteredList = systems.filter(p => 
                p.title.toLowerCase().includes(term) || 
                p.description.toLowerCase().includes(term)
            );
            
            // Reset count for search results
            itemsToShow = window.innerWidth >= 1024 ? 6 : 3;
            renderProjects(currentFilteredList, itemsToShow);
        });
    }
});

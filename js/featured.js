
document.addEventListener('DOMContentLoaded', () => {
    
    // --- FEATURED PROJECTS CONFIGURATION ---
    // Load from sitemap.js
    const featuredProjects = (typeof AR_DISCOVERY !== 'undefined') ? AR_DISCOVERY.projects : [];

    const container = document.getElementById('featured-container');

    function renderFeatured() {
        if (!container) return;
        container.innerHTML = '';

        featuredProjects.forEach((proj, index) => {
            const card = document.createElement('div');
            card.className = 'f-project-card';
            // Add entry animation delay staggered
            card.style.animationDelay = `${index * 0.15}s`;
            
            // Set CSS variables dynamically
            card.style.setProperty('--glow-color', proj.color);
            card.style.setProperty('--accent-color', proj.color);
            card.style.setProperty('--btn-bg', `linear-gradient(135deg, ${proj.color}20, ${proj.color}05)`); 

            const tagsHtml = proj.tags.map(tag => `<span class="f-tag">${tag}</span>`).join('');

            card.innerHTML = `
                <div class="f-bg-glow"></div>
                <div class="f-content">
                    <div class="f-head">
                        <div class="f-icon-box">
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 576 512" width="24" height="24">
                                ${proj.svgPath}
                            </svg>
                        </div>
                        <h3 class="f-title">${proj.name}</h3>
                    </div>
                    
                    <p class="f-desc">${proj.description}</p>
                    
                    <div class="f-meta">
                        ${tagsHtml}
                    </div>

                    <a href="${proj.link}" class="f-link" aria-label="View ${proj.name}">
                        View Project 
                        <svg class="arrow-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 512" width="14" height="14"><path fill="currentColor" d="M278.6 233.4c12.5 12.5 12.5 32.8 0 45.3l-160 160c-12.5 12.5-32.8 12.5-45.3 0s-12.5-32.8 0-45.3L210.7 256 73.4 118.6c-12.5-12.5-12.5-32.8 0-45.3s32.8-12.5 45.3 0l112 112c12.5-12.5 12.5-32.8 0-45.3l-112-112c-12.5-12.5-32.8-12.5-45.3 0zm-306.7 0c-12.5-12.5-32.8-12.5-45.3 0l-112 112c-12.5 12.5-12.5 32.8 0 45.3l112 112c12.5 12.5 32.8 12.5 45.3 0s12.5-32.8 0-45.3L77.3 256l89.4-89.4c12.5-12.5 12.5-32.8 0-45.3z"/></svg>
                    </a>
                </div>
            `;

            container.appendChild(card);
        });
    }

    renderFeatured();
});

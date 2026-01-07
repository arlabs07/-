
/* 
   App Grid Renderer for app.html 
   Reads from sitemap.js to populate the list of applications
*/

document.addEventListener('DOMContentLoaded', () => {
    const grid = document.getElementById('apps-grid');
    if (!grid) return;

    // Use AR_DISCOVERY.systems as the data source (same as Index > Systems)
    // We can filter this if we want only specific "Apps", but for now it's unified.
    const apps = (typeof AR_DISCOVERY !== 'undefined') ? AR_DISCOVERY.systems : [];

    // Clear static content
    grid.innerHTML = '';

    apps.forEach(app => {
        // Skip purely placeholder items if desired, or show them with 'In Dev' state
        
        const card = document.createElement('article');
        card.className = 'app-entry';
        
        // Adjust opacity for placeholders
        if(app.isPlaceholder) {
            card.style.opacity = '0.6';
        }

        // Determine Button State
        let btnHtml = '';
        if(app.isPlaceholder) {
            btnHtml = `<span class="app-action" style="cursor: not-allowed; background: transparent; border: 1px dashed #444; color: #666;">In Development</span>`;
        } else {
            btnHtml = `<a href="${app.link}" ${app.link.startsWith('http') ? 'target="_blank"' : ''} class="app-action">Launch App</a>`;
        }

        // Icon Style
        const iconStyle = app.isPlaceholder ? 'background:rgba(255,255,255,0.05); color:#666;' : '';

        card.innerHTML = `
            <div class="app-icon" style="${iconStyle}">
                <i class="${app.iconClass}"></i>
            </div>
            <h2 class="app-name">${app.title}</h2>
            <p class="app-desc-text">
                ${app.description}
            </p>
            ${btnHtml}
        `;

        grid.appendChild(card);
    });
});

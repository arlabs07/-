
document.addEventListener('DOMContentLoaded', () => {

// --- 1. CONFIGURATION ---
// Data is now pulled from AR_DISCOVERY in sitemap.js
const siteStructure = (typeof AR_DISCOVERY !== 'undefined') 
    ? AR_DISCOVERY.navigation 
    : [ { label: "Home", url: "index.html", icon: "fas fa-home" } ]; // Fallback

// --- 2. LOGIC: GENERATE SIDEBAR HTML ---

let overlay = document.querySelector('.sidebar-overlay');
let sidebar = document.querySelector('.sidebar');

// Create elements if they don't exist
if (!sidebar) {
    overlay = document.createElement('div');
    overlay.className = 'sidebar-overlay';
    
    sidebar = document.createElement('aside');
    sidebar.className = 'sidebar';
    sidebar.innerHTML = `
        <div class="sidebar-header">
            <span class="sidebar-title">Navigation</span>
            <button class="close-menu" aria-label="Close Menu"><i class="fas fa-times"></i></button>
        </div>
        <div class="sidebar-content">
            <ul class="sb-nav-list" id="sb-nav-root"></ul>
        </div>
    `;
    
    document.body.appendChild(overlay);
    document.body.appendChild(sidebar);
}

const sbRoot = document.getElementById('sb-nav-root');
const currentPath = window.location.pathname;

// Helper: Normalize filenames for comparison
function getFileName(path) {
    if (!path) return '';
    let name = path.split('/').pop();
    if (name === '' || name === undefined) return 'index.html';
    return name.split('#')[0].split('?')[0];
}

const currentFile = getFileName(currentPath);

// Helper: Resolve Path for href attributes
function resolvePath(targetUrl) {
    // FIX: Handle undefined/null URLs safely
    if (!targetUrl) return '#';
    
    if (targetUrl.startsWith('http') || targetUrl.startsWith('#')) return targetUrl;
    
    const isInAppDir = currentPath.includes('/app/');
    const isTargetApp = targetUrl.startsWith('app/');
    
    if (isInAppDir) {
        if (isTargetApp) return targetUrl.replace('app/', '');
        return '../' + targetUrl;
    }
    return targetUrl;
}

// Helper: Robust Page Active Check
function isPageActive(targetUrl) {
    if (!targetUrl || targetUrl === '#') return false;
    
    // Handle external links
    if (targetUrl.startsWith('http')) return false;

    const targetFile = getFileName(targetUrl);
    return targetFile === currentFile;
}

// Helper: Get Page Outline (H1-H3)
function getPageOutline() {
    // We select from main to avoid grabbing footer/header items, fallback to body
    const root = document.querySelector('main') || document.body;
    const headings = root.querySelectorAll('h1, h2, h3');
    
    if (headings.length === 0) return [];

    const outlineItems = [];
    headings.forEach((h, index) => {
        if (!h.id) {
            // Generate clean ID from text or fallback to index
            const cleanText = h.innerText.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
            h.id = cleanText || ('section-' + index);
        }
        
        // Clean text for display (remove newlines, extra spaces)
        let text = h.innerText.replace(/\n/g, ' ').trim();
        if(text.length > 25) text = text.substring(0, 25) + '...';

        outlineItems.push({
            text: text,
            id: h.id,
            level: h.tagName.toLowerCase(),
            isOutline: true
        });
    });
    return outlineItems;
}

// --- RENDER LOOP ---
// Clear existing content to prevent duplicates if script re-runs
sbRoot.innerHTML = '';

siteStructure.forEach(item => {
    const li = document.createElement('li');
    li.className = 'sb-item';

    // FIX: Ensure URL exists before processing
    const rawUrl = item.url || '#';
    const finalUrl = resolvePath(rawUrl);
    const isActive = isPageActive(rawUrl);
    
    // 1. Gather Children (Static Children + Dynamic Outline)
    let children = item.children ? [...item.children] : [];

    // 2. If this item represents the CURRENT page, inject the Outline items
    if (isActive) {
        const outline = getPageOutline();
        if (outline.length > 0) {
            // Add separator if children already exist
            if (children.length > 0) {
                children.push({ label: 'On this page', isHeader: true });
            }
            
            // Map outline items
            const outlineChildren = outline.map(node => ({
                label: node.text,
                url: '#' + node.id,
                isOutline: true,
                level: node.level
            }));
            
            children = [...children, ...outlineChildren];
        }
    }

    const hasChildren = children.length > 0;

    // --- HTML Structure ---
    const rowDiv = document.createElement('div');
    rowDiv.className = `sb-link-wrapper ${isActive ? 'active-page' : ''}`;

    const mainLink = document.createElement('a');
    mainLink.className = 'sb-main-link';
    mainLink.href = finalUrl;
    if (item.isExternal) mainLink.target = "_blank";
    
    // If it's just a placeholder toggle (url is #), prevent default jump
    if (rawUrl === '#') {
        mainLink.addEventListener('click', (e) => e.preventDefault());
        mainLink.style.cursor = 'default';
    }

    mainLink.innerHTML = `
        <i class="${item.icon || 'fas fa-circle'}"></i>
        <span>${item.label}</span>
    `;
    
    // Setup Toggle Button
    let toggleBtn = null;
    if (hasChildren) {
        toggleBtn = document.createElement('button');
        toggleBtn.className = 'sb-toggle-btn';
        toggleBtn.innerHTML = '<i class="fas fa-chevron-down"></i>';
        toggleBtn.type = "button"; // Prevent form submission behavior
        toggleBtn.ariaLabel = "Toggle Submenu";
    }

    rowDiv.appendChild(mainLink);
    if (toggleBtn) rowDiv.appendChild(toggleBtn);
    li.appendChild(rowDiv);

    // --- Submenu Generation ---
    if (hasChildren) {
        const ulSub = document.createElement('ul');
        ulSub.className = 'sb-submenu'; 
        
        // Auto-open if active page
        if (isActive) {
            ulSub.classList.add('open');
            if (toggleBtn) toggleBtn.classList.add('open');
        }

        children.forEach(child => {
            const subLi = document.createElement('li');
            
            if (child.isHeader) {
                subLi.innerHTML = `<span style="display:block; font-size:0.65rem; color:#444; margin:10px 0 5px 12px; text-transform:uppercase; font-weight:700; letter-spacing:1px;">${child.label}</span>`;
            } else {
                const childUrlRaw = child.url || '#';
                const childUrl = resolvePath(childUrlRaw);
                // Indentation based on level
                let indent = '0px';
                if (child.level === 'h3') indent = '12px';
                
                subLi.innerHTML = `<a href="${childUrl}" class="sb-sub-link" style="padding-left:calc(12px + ${indent})">${child.label}</a>`;
                
                const a = subLi.querySelector('a');
                a.addEventListener('click', () => {
                    if (childUrlRaw.startsWith('#') && window.innerWidth < 1024) {
                        toggleMenu(false);
                    }
                });
            }
            ulSub.appendChild(subLi);
        });
        li.appendChild(ulSub);

        // Toggle Event
        if (toggleBtn) {
            toggleBtn.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                ulSub.classList.toggle('open');
                toggleBtn.classList.toggle('open');
            });
            
            // Also allow clicking the main link wrapper area (if it's a folder/placeholder) to toggle
            if (rawUrl === '#') {
                 mainLink.addEventListener('click', (e) => {
                    e.preventDefault();
                    ulSub.classList.toggle('open');
                    toggleBtn.classList.toggle('open');
                });
                mainLink.style.cursor = 'pointer';
            }
        }
    }

    sbRoot.appendChild(li);
});

// --- 3. EVENT HANDLERS ---

const menuBtn = document.querySelector('.menu-toggle');
const closeBtn = document.querySelector('.close-menu');

function toggleMenu(show) {
    if (show) {
        sidebar.classList.add('active');
        overlay.classList.add('active');
        document.body.style.overflow = 'hidden'; 
    } else {
        sidebar.classList.remove('active');
        overlay.classList.remove('active');
        document.body.style.overflow = '';
    }
}

if (menuBtn) {
    menuBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        toggleMenu(true);
    });
}

if (closeBtn) closeBtn.addEventListener('click', () => toggleMenu(false));
if (overlay) overlay.addEventListener('click', () => toggleMenu(false));
});

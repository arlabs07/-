
/* 
    ARhub Ecosystem - Central Data Source
    The "Source of Truth" for navigation, projects, and app directories.
    Loaded before other scripts to ensure data availability.
*/

const AR_DISCOVERY = {
    
    // --- 1. GLOBAL NAVIGATION (Sidebar & Footer) ---
    navigation: [
        { label: "Home", url: "index.html", icon: "fas fa-home" },
        { 
            label: "Systems & Apps", 
            url: "app.html", 
            icon: "fas fa-layer-group",
            children: [
                { label: "Universal Converter", url: "app/1.html" },
            ]
        },
        {
            label: "Workbench",
            url: "#",
            icon: "fas fa-code-branch",
            children: [
                { label: "Playground IDE", url: "playground.html" },
                { label: "Arai Chat", url: "arai.html" }
            ]
        },
        { 
            label: "Products", 
            url: "#", /* Placeholder URL for parent toggle */
            icon: "fas fa-box-open",
            children: [
                { label: "PurplePDF", url: "purplepdf.html" },
                { label: "ArDev Suite", url: "ardev.html" },
                { label: "AR-UI Kit", url: "arkit.html" }
            ]
        },
        // Meta / Company
        { label: "About arlabs07", url: "about.html", icon: "fas fa-user" },
        { label: "Privacy Policy", url: "privacy.html", icon: "fas fa-shield-alt" },
        { label: "Contact", url: "contact.html", icon: "fas fa-envelope" },
        { label: "FAQ", url: "faq.html", icon: "fas fa-question-circle" }
    ],

    // --- 2. UTILITY SYSTEMS (Index Page & App Page) ---
    systems: [
        {
            id: "sys_001",
            title: "Universal Converter",
            description: "Advanced unit converter for length, data, area, volume, weight, and real-time currency rates.",
            link: "app/1.html",
            iconClass: "fas fa-exchange-alt", 
            image: "https://arlabs07.netlify.app/images/index/favicon.svg", 
            isPlaceholder: false
        },
        {
            id: "sys_002",
            title: "Playground IDE",
            description: "A full-featured in-browser code editor with multi-file support and live preview.",
            link: "playground.html",
            iconClass: "fas fa-code",
            image: "", 
            isPlaceholder: false
        },
        {
            id: "sys_003",
            title: "Arai AI",
            description: "Intelligent coding assistant and chat bot powered by Pollinations AI.",
            link: "arai.html",
            iconClass: "fas fa-robot",
            image: "",
            isPlaceholder: false
        },
        {
            id: "sys_004",
            title: "CSS Glassmorphism",
            description: "A lightweight CSS library for creating glass effects instantly.",
            link: "arkit.html",
            iconClass: "fas fa-magic",
            image: "", 
            isPlaceholder: false
        }
    ],

    // --- 3. FLAGSHIP PROJECTS (Index Page > Featured) ---
    projects: [
        {
            name: "PurplePDF",
            description: "A comprehensive PDF manipulation suite. Merge, split, compress, and edit PDF documents with ease. Built for privacy and performance.",
            link: "purplepdf.html", 
            color: "#9d00ff", // Purple
            svgPath: `<path fill="currentColor" d="M128 0C92.7 0 64 28.7 64 64v96h64V64H226.7L384 221.3V448H64V304H0V448c0 35.3 28.7 64 64 64H384c35.3 0 64-28.7 64-64V192L314.7 66.7C308.5 60.5 300.2 57 291.3 57H128zM448 80h32c17.7 0 32 14.3 32 32v32c0 17.7-14.3 32-32 32H448v32c0 17.7-14.3 32-32 32s-32-14.3-32-32V80zM32 256c-17.7 0-32 14.3-32 32s14.3 32 32 32h32c17.7 0 32-14.3 32-32s-14.3-32-32-32H32z"/>`,
            tags: ["Productivity", "Utility", "Wasm"]
        },
        {
            name: "ArDev",
            description: "The developer's companion. Snippets, roadmaps, and a built-in code formatter designed to accelerate your coding journey.",
            link: "ardev.html", 
            color: "#00ff88", // Green
            svgPath: `<path fill="currentColor" d="M392.8 1.2c-17-4.9-34.7 5-39.6 22l-128 448c-4.9 17 5 34.7 22 39.6s34.7-5 39.6-22l128-448c4.9-17-5-34.7-22-39.6zm80.6 120.1c-12.5 12.5-12.5 32.8 0 45.3L562.7 256l-89.4 89.4c-12.5 12.5-12.5 32.8 0 45.3s32.8 12.5 45.3 0l112-112c12.5-12.5 12.5-32.8 0-45.3l-112-112c-12.5-12.5-32.8-12.5-45.3 0zm-306.7 0c-12.5-12.5-32.8-12.5-45.3 0l-112 112c-12.5 12.5-12.5 32.8 0 45.3l112 112c12.5 12.5 32.8 12.5 45.3 0s12.5-32.8 0-45.3L77.3 256l89.4-89.4c12.5-12.5 12.5-32.8 0-45.3z"/>`,
            tags: ["DevTool", "Education", "IDE"]
        },
        {
            name: "AR-UI Kit",
            description: "A modular, dark-mode-first CSS framework. Build stunning interfaces with pre-built components and utility classes.",
            link: "arkit.html",
            color: "#00c8ff", // Blue
            svgPath: `<path fill="currentColor" d="M224 0c-17.7 0-32 14.3-32 32V48H128c-35.3 0-64 28.7-64 64v48H32c-17.7 0-32 14.3-32 32s14.3 32 32 32h32v64H32c-17.7 0-32 14.3-32 32s14.3 32 32 32h32v48c0 35.3 28.7 64 64 64h64v16c0 17.7 14.3 32 32 32s32-14.3 32-32v-16h64c35.3 0 64-28.7 64-64v-48h32c17.7 0 32-14.3 32-32s-14.3-32-32-32h-32v-64h32c17.7 0 32-14.3 32-32s-14.3-32-32-32h-32V112c0-35.3-28.7-64-64-64h-64V32c0-17.7-14.3-32-32-32zM128 112h256v288H128V112z"/>`,
            tags: ["Library", "CSS", "UI"]
        }
    ],

    // --- 4. PURPLEPDF TOOLS ---
    purpleTools: [
        { id: 1, title: 'Merge PDF', desc: 'Combine multiple PDFs into one document.', icon: 'fa-layer-group', color: 'text-purple-400' },
        { id: 2, title: 'Split PDF', desc: 'Extract pages from your PDF documents.', icon: 'fa-cut', color: 'text-pink-400' },
        { id: 3, title: 'Compress PDF', desc: 'Reduce file size while maintaining quality.', icon: 'fa-compress-arrows-alt', color: 'text-green-400' },
        { id: 4, title: 'PDF to Image', desc: 'Convert PDF pages to JPG or PNG.', icon: 'fa-image', color: 'text-yellow-400' },
        { id: 5, title: 'Image to PDF', desc: 'Create PDFs from images instantly.', icon: 'fa-file-image', color: 'text-blue-400' },
        { id: 6, title: 'Protect PDF', desc: 'Encrypt your PDF with a password.', icon: 'fa-lock', color: 'text-red-400' },
        { id: 7, title: 'Unlock PDF', desc: 'Remove passwords from PDFs.', icon: 'fa-unlock', color: 'text-orange-400' },
        { id: 8, title: 'Organize PDF', desc: 'Rearrange or delete pages.', icon: 'fa-sort', color: 'text-teal-400' }
    ],

    // --- 5. ARDEV TOOLS (New) ---
    ardevTools: [
        { id: 1, title: 'JS Code Formatter', desc: 'Prettify and standardise your JavaScript code.', icon: 'fa-code', color: 'text-green-400' },
        { id: 2, title: 'Snippet Library', desc: 'Common patterns for React, Vue, and Vanilla JS.', icon: 'fa-book', color: 'text-emerald-400' },
        { id: 3, title: 'Regex Tester', desc: 'Test and debug regular expressions instantly.', icon: 'fa-vial', color: 'text-teal-400' },
        { id: 4, title: 'Linter Config', desc: 'Generate ESLint and Prettier configs.', icon: 'fa-tasks', color: 'text-cyan-400' },
        { id: 5, title: 'Roadmaps', desc: 'Interactive paths for learning Frontend/Backend.', icon: 'fa-map-signs', color: 'text-blue-400' },
        { id: 6, title: 'HTML Boilerplate', desc: 'Generate SEO-ready HTML5 templates.', icon: 'fa-html5', color: 'text-orange-500' }
    ],

    // --- 6. AR-KIT COMPONENTS (New) ---
    arkitComponents: [
        { id: 1, title: 'Glass Cards', desc: 'Frosted glass effect containers.', icon: 'fa-square', color: 'text-blue-400' },
        { id: 2, title: 'Neon Buttons', desc: 'High-contrast glowing action buttons.', icon: 'fa-toggle-on', color: 'text-cyan-400' },
        { id: 3, title: 'Navigation', desc: 'Responsive navbars and sidebars.', icon: 'fa-bars', color: 'text-sky-400' },
        { id: 4, title: 'Inputs', desc: 'Accessible form fields and toggles.', icon: 'fa-keyboard', color: 'text-indigo-400' },
        { id: 5, title: 'Modals', desc: 'Popups with backdrop blur support.', icon: 'fa-window-restore', color: 'text-violet-400' },
        { id: 6, title: 'Grid System', desc: 'CSS Grid layouts made simple.', icon: 'fa-th', color: 'text-purple-400' }
    ]
};

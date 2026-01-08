
/* 
    ARhub Ecosystem - Central Data Source
*/

const AR_DISCOVERY = {
    
    navigation: [
        { label: "Home", url: "index.html", icon: "fas fa-home" },
        { label: "Blog", url: "blog.html", icon: "fas fa-rss" },
        { 
            label: "Systems", 
            url: "app.html", 
            icon: "fas fa-layer-group",
            children: [ 
                { label: "Universal Converter", url: "app/1.html" },
                { label: "Meta Inspector", url: "app/2.html" }
            ]
        },
        {
            label: "Workbench", url: "#", icon: "fas fa-code-branch",
            children: [
                { label: "Playground IDE", url: "playground.html" },
                { label: "Arai Chat", url: "arai.html" }
            ]
        },
        { 
            label: "Products", url: "#", icon: "fas fa-box-open",
            children: [
                { label: "PurplePDF", url: "purplepdf.html" },
                { label: "ArDev Suite", url: "ardev.html" },
                { label: "AR-UI Kit", url: "arkit.html" }
            ]
        },
        { label: "About", url: "about.html", icon: "fas fa-user" },
        { label: "Contact", url: "contact.html", icon: "fas fa-envelope" },
        { label: "FAQ", url: "faq.html", icon: "fas fa-question-circle" }
    ],

    // --- BLOGS ---
    blogs: [
        {
            id: "feature-showcase",
            title: "Advanced Blog Features: Math, Code & Diagrams",
            date: "Jan 10, 2026",
            author: "arlabs07",
            category: "Technology",
            readTime: "4 min read",
            image: "https://arlabs07.netlify.app/images/index/arai2.avif",
            summary: "Testing the new horizontally scrollable mobile views, sticky TOC, and library integrations.",
            content: `
                <p>Welcome to the new ARhub blog reader. This update brings a significantly improved reading experience on mobile devices and native support for technical documentation.</p>
                
                <h2>1. Mathematical Equations (KaTeX)</h2>
                <p>We can now render complex mathematics directly in the browser using KaTeX. For example, the Quadratic Formula:</p>
                $$ x = \\frac{-b \\pm \\sqrt{b^2 - 4ac}}{2a} $$
                <p>Or inline equations like $E=mc^2$ seamlessly within the text.</p>

                <h2>2. Syntax Highlighting</h2>
                <p>Code blocks are now beautifully highlighted using Prism.js.</p>
                <pre><code class="language-javascript">// Example of an async fetch
async function getData(url) {
  try {
    const response = await fetch(url);
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Fetch failed:', error);
  }
}</code></pre>

                <h2>3. Diagrams (Mermaid)</h2>
                <p>We can also generate flowcharts and diagrams dynamically.</p>
                <div class="mermaid">
                graph TD;
                    A[Start] --> B{Is it working?};
                    B -- Yes --> C[Deploy];
                    B -- No --> D[Debug];
                    D --> B;
                </div>

                <h2>4. The Sticky Bar</h2>
                <p>Scroll up and down! Notice the bar at the top of the viewport? It updates as you read through these sections. This is perfect for long-form tutorials.</p>
            `
        },
        {
            id: "glassmorphism-guide",
            title: "Mastering Glassmorphism in 2026",
            date: "Jan 02, 2026",
            author: "arlabs07",
            category: "Design",
            readTime: "8 min read",
            image: "https://arlabs07.netlify.app/images/index/screenshot.png",
            summary: "A deep dive into creating performant frosted glass effects using CSS backdrop-filter and layers.",
            content: `
                <p>Glassmorphism has matured. It's no longer just about blur; it's about depth, hierarchy, and performance.</p>
                <h2>The CSS Stack</h2>
                <p>The key lies in <code>backdrop-filter</code>. Here is the secret sauce:</p>
                <pre><code class="language-css">.glass-panel {
  background: rgba(255, 255, 255, 0.05);
  backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);
  border: 1px solid rgba(255, 255, 255, 0.1);
}</code></pre>
                <h2>Performance Considerations</h2>
                <p>Overusing blur can cause GPU spikes. We recommend using it on static containers like cards or sidebars, rather than animated elements moving across the screen.</p>
            `
        }
    ],

    systems: [
        { id: "sys_001", title: "Universal Converter", description: "Advanced unit converter.", link: "app/1.html", iconClass: "fas fa-exchange-alt", isPlaceholder: false },
        { id: "sys_002", title: "Playground IDE", description: "In-browser code editor.", link: "playground.html", iconClass: "fas fa-code", isPlaceholder: false },
        { id: "sys_003", title: "Arai AI", description: "Intelligent coding assistant.", link: "arai.html", iconClass: "fas fa-robot", isPlaceholder: false },
        { id: "sys_004", title: "CSS Glassmorphism", description: "CSS library for glass effects.", link: "arkit.html", iconClass: "fas fa-magic", isPlaceholder: false },
        { id: "sys_005", title: "Meta Inspector", description: "SEO & Social preview tool.", link: "app/2.html", iconClass: "fas fa-tags", isPlaceholder: false }
    ],

    projects: [
        { name: "PurplePDF", description: "PDF manipulation suite.", link: "purplepdf.html", color: "#9d00ff", svgPath: "...", tags: ["Utility"] },
        { name: "ArDev", description: "Developer tools companion.", link: "ardev.html", color: "#00ff88", svgPath: "...", tags: ["DevTool"] },
        { name: "AR-UI Kit", description: "CSS framework.", link: "arkit.html", color: "#00c8ff", svgPath: "...", tags: ["UI"] }
    ],

    purpleTools: [ { id: 1, title: 'Merge PDF', desc: 'Combine PDFs.', icon: 'fa-layer-group', color: 'text-purple-400' } ],
    ardevTools: [ 
        { id: 1, title: 'Meta Inspector', desc: 'SEO & Social Previews.', icon: 'fa-tags', color: 'text-pink-400', link: 'app/2.html' },
        { id: 2, title: 'JS Formatter', desc: 'Prettify JS.', icon: 'fa-code', color: 'text-green-400', link: '#' } 
    ],
    arkitComponents: [ { id: 1, title: 'Glass Cards', desc: 'Frosted containers.', icon: 'fa-square', color: 'text-blue-400' } ]
};

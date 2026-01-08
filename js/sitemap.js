
/* 
    ARhub Ecosystem - Central Data Source
    Contains configuration for Navigation, Courses, Documentation, Blogs, and Tools.
*/

const AR_DISCOVERY = {
    
    // --- MAIN NAVIGATION ---
    navigation: [
        { label: "Home", url: "index.html", icon: "fas fa-home" },
        { label: "Docs", url: "docs.html", icon: "fas fa-book" },
        { label: "Courses", url: "course.html", icon: "fas fa-graduation-cap" },
        { label: "Blog", url: "blog.html", icon: "fas fa-rss" },
        { 
            label: "Systems", 
            url: "app.html", 
            icon: "fas fa-layer-group",
            children: [ 
                { label: "Universal Converter", url: "app/1.html" },
                { label: "Meta Inspector", url: "app/2.html" },
                { label: "OptiFit Calc", url: "app/3.html" }
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
        { label: "Contact", url: "contact.html", icon: "fas fa-envelope" }
    ],

    // --- COURSES ---
    courses: [
        {
            id: "web-mastery",
            title: "Modern Web Mastery 2026",
            description: "From HTML5 to advanced React patterns. The ultimate guide to becoming a Full Stack Developer.",
            instructor: "Abhinav Rawat",
            level: "Beginner to Pro",
            duration: "12 Hours",
            color: "#00c8ff",
            thumbnail: "https://arlabs07.netlify.app/images/index/screenshot.png",
            modules: [
                {
                    title: "Module 1: Foundations",
                    lessons: [
                        { 
                            id: "intro-video", 
                            title: "Course Introduction", 
                            type: "video", 
                            src: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4", 
                            poster: "https://arlabs07.netlify.app/images/index/screenshot.png",
                            content: `
                                <h2>Welcome Aboard</h2>
                                <p>In this introductory video, we outline the path to becoming a senior developer. We will cover the ecosystem, tools, and mindset required.</p>
                                <h3>What you will learn:</h3>
                                <ul>
                                    <li>Semantic HTML & Accessibility</li>
                                    <li>Modern CSS (Flex/Grid/Glassmorphism)</li>
                                    <li>JavaScript ES6+ & TypeScript</li>
                                </ul>
                            `
                        },
                        { 
                            id: "env-setup", 
                            title: "Environment Setup", 
                            type: "doc", 
                            content: `
                                <h2>Setting up VS Code</h2>
                                <p>We recommend using Visual Studio Code with the following extensions:</p>
                                <ul>
                                    <li><strong>Prettier:</strong> For consistent code formatting.</li>
                                    <li><strong>ESLint:</strong> To catch errors early.</li>
                                    <li><strong>Live Server:</strong> For real-time previews.</li>
                                </ul>
                                <h3>Terminal Basics</h3>
                                <pre><code class="language-bash"># Install Node.js
nvm install node --lts

# Verify installation
node -v
npm -v</code></pre>
                            `
                        }
                    ]
                },
                {
                    title: "Module 2: Advanced Resources",
                    lessons: [
                        { 
                            id: "css-cheatsheet", 
                            title: "CSS Grid Cheatsheet (PDF)", 
                            type: "pdf", 
                            src: "https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf",
                            content: "<p>Download or view the comprehensive CSS Grid layout guide. This PDF covers all properties from container to item.</p>"
                        },
                        { 
                            id: "podcast-arch", 
                            title: "Podcast: System Architecture", 
                            type: "audio", 
                            src: "https://www2.cs.uic.edu/~i101/SoundFiles/BabyElephantWalk60.wav", 
                            content: `
                                <h2>Audio Transcript</h2>
                                <p>In this episode, we discuss the shift from Monoliths to Microservices and when you should actually care about it. Listen while you commute.</p>
                            ` 
                        },
                        {
                            id: "external-embeds",
                            title: "External References (Iframe)",
                            type: "doc",
                            content: `
                                <h2>Documentation Embedding</h2>
                                <p>Sometimes you need to reference external documentation directly. Here is the Wikipedia entry for HTML embedded directly:</p>
                                <div class="responsive-embed">
                                    <iframe src="https://en.wikipedia.org/wiki/HTML" title="Wikipedia HTML"></iframe>
                                </div>
                                <p>Note how the iframe maintains responsiveness across devices.</p>
                            `
                        }
                    ]
                }
            ]
        },
        {
            id: "ai-engineering",
            title: "AI Engineering with Arai",
            description: "Learn how to integrate Large Language Models into your frontend applications. Prompt engineering and API integration.",
            instructor: "Arai Bot",
            level: "Advanced",
            duration: "6 Hours",
            color: "#ff2a6d",
            thumbnail: "https://arlabs07.netlify.app/images/index/arai2.avif",
            modules: [
                {
                    title: "LLM Fundamentals",
                    lessons: [
                        { 
                            id: "llm-basics", 
                            title: "How LLMs Work", 
                            type: "doc", 
                            content: `
                                <h2>Understanding Tokens</h2>
                                <p>Large Language Models don't see words; they see tokens. A token is roughly 0.75 words. This impacts cost and context window limits.</p>
                                <h3>Mathematical Representation</h3>
                                <p>The attention mechanism can be described as:</p>
                                $$ Attention(Q, K, V) = softmax(\\frac{QK^T}{\\sqrt{d_k}})V $$
                                <p>This formula is the heart of the Transformer architecture.</p>
                            ` 
                        },
                        {
                            id: "diagram-flow",
                            title: "Data Flow Diagram",
                            type: "doc",
                            content: `
                                <h2>RAG Architecture</h2>
                                <p>Retrieval-Augmented Generation helps AI access private data.</p>
                                <div class="mermaid">
                                graph LR
                                    A[User Query] --> B(Embeddings API)
                                    B --> C{Vector DB}
                                    C -->|Context| D[LLM]
                                    D --> E[Response]
                                </div>
                            `
                        }
                    ]
                }
            ]
        }
    ],

    // --- DOCUMENTATION ---
    docs: [
        {
            id: "intro",
            title: "Introduction",
            category: "Getting Started",
            lastUpdated: "Jan 12, 2026",
            icon: "fas fa-flag",
            content: `
                <p class="lead">Welcome to the ARhub documentation. This is your central hub for understanding the tools, libraries, and philosophies driving the ecosystem.</p>
                
                <h2>Ecosystem Overview</h2>
                <p>ARhub is composed of three primary pillars:</p>
                <ul>
                    <li><strong>PurplePDF:</strong> Wasm-powered PDF tools.</li>
                    <li><strong>Arai AI:</strong> Specialized coding assistant.</li>
                    <li><strong>ArDev:</strong> Utility belt for frontend developers.</li>
                </ul>
            `
        },
        {
            id: "rich-media-docs",
            title: "Embeds & Media",
            category: "Features",
            lastUpdated: "Jan 14, 2026",
            icon: "fas fa-photo-video",
            content: `
                <p>This page demonstrates how different media types are handled in the documentation engine.</p>

                <h2>1. Video Embeds</h2>
                <p>Native video players with custom UI:</p>
                <div class="custom-video-player">
                    <video src="https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/TearsOfSteel.mp4" poster="https://arlabs07.netlify.app/images/index/screenshot.png" playsinline></video>
                    <div class="video-controls">
                        <button class="play-pause-btn"><i class="fas fa-play"></i></button>
                        <div class="progress-bar-container"><div class="progress-bar-fill"></div></div>
                        <div class="time-display">00:00 / 00:00</div>
                        <button class="fs-btn"><i class="fas fa-expand"></i></button>
                    </div>
                </div>

                <h2>2. Iframe Embeds</h2>
                <p>Responsive iframes for external tools:</p>
                <div class="responsive-embed">
                    <iframe src="https://www.openstreetmap.org/export/embed.html?bbox=-0.004017949104309083%2C51.47612752641776%2C0.00030577182769775396%2C51.478569861898606&amp;layer=mapnik"></iframe>
                </div>

                <h2>3. PDF Embedding</h2>
                <p>Direct PDF visualization using Google Viewer integration:</p>
                <div class="pdf-viewer-container">
                    <div class="pdf-toolbar"><span><i class="fas fa-file-pdf"></i> Spec Sheet</span><a href="#" class="pdf-dl-btn">Download</a></div>
                    <iframe src="https://docs.google.com/gview?url=https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf&embedded=true" frameborder="0"></iframe>
                </div>
            `
        },
        {
            id: "code-math",
            title: "Code & Math",
            category: "Technical",
            lastUpdated: "Jan 10, 2026",
            icon: "fas fa-code",
            content: `
                <h2>Syntax Highlighting</h2>
                <p>Code blocks use Prism.js for syntax coloring.</p>
                <pre><code class="language-javascript">const greeting = "Hello, World!";
function sayHi() {
    console.log(greeting);
}</code></pre>

                <h2>Mathematics</h2>
                <p>KaTeX renders beautiful math inline $f(x) = x^2$ or as blocks:</p>
                $$ \\sum_{i=1}^n i^3 = \\left( \\frac{n(n+1)}{2} \\right)^2 $$
            `
        }
    ],

    // --- BLOGS ---
    blogs: [
        {
            id: "glassmorphism",
            title: "Mastering Glassmorphism in 2026",
            date: "Jan 08, 2026",
            author: "arlabs07",
            category: "Design",
            readTime: "6 min read",
            image: "https://arlabs07.netlify.app/images/index/screenshot.png",
            summary: "A deep dive into creating performant frosted glass effects using CSS backdrop-filter.",
            content: `
                <p>Glassmorphism isn't just a trend; it's a technique for establishing hierarchy. By using background blur, we can separate layers of content without solid barriers.</p>
                
                <h2>The CSS Stack</h2>
                <p>To achieve this effect, we rely on <code>backdrop-filter</code>:</p>
                <pre><code class="language-css">.glass-panel {
  background: rgba(255, 255, 255, 0.05);
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.1);
}</code></pre>

                <h2>Performance Implications</h2>
                <p>Blur filters are expensive. Use them sparingly on mobile devices or provide a fallback.</p>
                
                <h3>Browser Support</h3>
                <table>
                    <thead><tr><th>Browser</th><th>Support</th></tr></thead>
                    <tbody>
                        <tr><td>Chrome</td><td>Full</td></tr>
                        <tr><td>Firefox</td><td>Full</td></tr>
                        <tr><td>Safari</td><td>Full</td></tr>
                    </tbody>
                </table>
            `
        },
        {
            id: "wasm-pdf",
            title: "Why We Moved to Web Assembly for PDF",
            date: "Dec 20, 2025",
            author: "AR Team",
            category: "Engineering",
            readTime: "8 min read",
            image: "https://arlabs07.netlify.app/images/index/arai2.avif",
            summary: "How switching from JS-based PDF libraries to a Rust/Wasm pipeline improved performance by 400%.",
            content: `
                <p>Client-side PDF manipulation has always been a bottleneck. JavaScript, while versatile, struggles with large binary files.</p>
                
                <h2>The Wasm Advantage</h2>
                <p>By compiling Rust to WebAssembly, we process binary data near-natively. This results in:</p>
                <ul>
                    <li><strong>Speed:</strong> 4x faster rendering.</li>
                    <li><strong>Privacy:</strong> No server uploads required.</li>
                    <li><strong>Stability:</strong> Type-safe memory management.</li>
                </ul>

                <h2>Implementation Diagram</h2>
                <div class="mermaid">
                sequenceDiagram
                    participant User
                    participant JS
                    participant Wasm
                    User->>JS: Upload PDF
                    JS->>Wasm: Pass Buffer
                    Wasm->>Wasm: Process (Merge/Split)
                    Wasm->>JS: Return Blob
                    JS->>User: Download
                </div>
            `
        }
    ],

    // --- SYSTEMS & PROJECTS ---
    systems: [
        { id: "sys_001", title: "Universal Converter", description: "Advanced unit converter for everyday needs.", link: "app/1.html", iconClass: "fas fa-exchange-alt", isPlaceholder: false },
        { id: "sys_002", title: "Playground IDE", description: "In-browser HTML/CSS/JS code editor.", link: "playground.html", iconClass: "fas fa-code", isPlaceholder: false },
        { id: "sys_003", title: "Arai AI", description: "Intelligent coding assistant & debugger.", link: "arai.html", iconClass: "fas fa-robot", isPlaceholder: false },
        { id: "sys_004", title: "CSS Glassmorphism", description: "CSS library for instant glass effects.", link: "arkit.html", iconClass: "fas fa-magic", isPlaceholder: false },
        { id: "sys_005", title: "Meta Inspector", description: "SEO & Social Media preview tool.", link: "app/2.html", iconClass: "fas fa-tags", isPlaceholder: false },
        { id: "sys_006", title: "OptiFit Calc", description: "Health & Fitness calculator suite.", link: "app/3.html", iconClass: "fas fa-heartbeat", isPlaceholder: false }
    ],

    projects: [
        { name: "PurplePDF", description: "Secure, client-side PDF manipulation suite.", link: "purplepdf.html", color: "#9d00ff", svgPath: "<path fill='currentColor' d='M512 144v288c0 26.5-21.5 48-48 48H48c-26.5 0-48-21.5-48-48V144c0-26.5 21.5-48 48-48h88l12.3-32.9c7-18.7 24.9-31.1 44.9-31.1h125.5c20 0 37.9 12.4 44.9 31.1L376 96h88c26.5 0 48 21.5 48 48zM376 288c0-66.2-53.8-120-120-120s-120 53.8-120 120 53.8 120 120 120 120-53.8 120-120zm-32 0c0 48.6-39.4 88-88 88s-88-39.4-88-88 39.4-88 88-88 88 39.4 88 88z'/>", tags: ["Utility", "Wasm"] },
        { name: "ArDev", description: "Essential developer utilities companion.", link: "ardev.html", color: "#00ff88", svgPath: "<path fill='currentColor' d='M392.8 1.2c-17-4.9-34.7 5-39.6 22l-128 448c-4.9 17 5 34.7 22 39.6s34.7-5 39.6-22l128-448c4.9-17-5-34.7-22-39.6zm80.6 120.1c-12.5 12.5-12.5 32.8 0 45.3L562.7 256l-89.4 89.4c-12.5 12.5-12.5 32.8 0 45.3s32.8 12.5 45.3 0l112-112c12.5-12.5 12.5-32.8 0-45.3l-112-112c-12.5-12.5-32.8-12.5-45.3 0zm-306.7 0c-12.5-12.5-12.5 32.8 0 45.3l89.4 89.4-89.4 89.4c-12.5 12.5-12.5 32.8 0 45.3s32.8 12.5 45.3 0l112-112c12.5-12.5 12.5-32.8 0-45.3l-112-112c-12.5-12.5-32.8-12.5-45.3 0z'/>", tags: ["DevTool", "JS"] },
        { name: "AR-UI Kit", description: "Modern, glassmorphism CSS framework.", link: "arkit.html", color: "#00c8ff", svgPath: "<path fill='currentColor' d='M204.3 5.2c10.9-4 22.9-1.9 31.8 5.5l192 160c10.6 8.8 14.9 22.9 11 36.1s-15.3 22.5-29.1 22.5h-24v160c0 26.5-21.5 48-48 48h-80V320H128v117.3h-80c-26.5 0-48-21.5-48-48V229.3h-24c-13.8 0-25.2-9.3-29.1-22.5s.4-27.3 11-36.1l192-160c8.1-6.8 19.3-8.1 28.4-5.5z'/>", tags: ["UI", "CSS"] }
    ],

    purpleTools: [ { id: 1, title: 'Merge PDF', desc: 'Combine PDFs.', icon: 'fa-layer-group', color: 'text-purple-400' } ],
    ardevTools: [ 
        { id: 1, title: 'Meta Inspector', desc: 'SEO & Social Previews.', icon: 'fa-tags', color: 'text-pink-400', link: 'app/2.html' },
        { id: 2, title: 'JS Formatter', desc: 'Prettify JS.', icon: 'fa-code', color: 'text-green-400', link: '#' } 
    ],
    arkitComponents: [ { id: 1, title: 'Glass Cards', desc: 'Frosted containers.', icon: 'fa-square', color: 'text-blue-400' } ]
};
         

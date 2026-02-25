
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
            id: "Education",
            title: "introduction to financial management",
            date: "Feb 25, 2026",
            author: "AR Team",
            category: "education",
            readTime: "2 hr read",
            image: "https://arlabs07.netlify.app/images/index/arai2.avif",
            summary: "cover entire skin subject",
            content: `
            <h1>INVESTMENT BASICS</h1>
<h3>Session 1: Savings, Investment, and Inflation</h3>
<ul>
<li><strong>Investment</strong> involves using <strong>idle savings</strong> to get <strong>future returns</strong> .</li>
<li>One should <strong>invest</strong> to <strong>generate money</strong> for <strong>specific goals</strong> and an <strong>uncertain future</strong> .</li>
<li>The <strong>cost of living increases</strong> due to <strong>inflation</strong>, causing <strong>money</strong> to <strong>lose value</strong> over time .</li>
<li>The <strong>aim of investments</strong> is to provide a <strong>return above</strong> the <strong>inflation rate</strong> .</li>
<li>The <strong>&#39;real&#39; rate of return</strong> is the <strong>actual return</strong> calculated <strong>after inflation</strong> .</li>
<li><strong>Compounding</strong> allows <strong>investments to grow</strong> by accumulating <strong>principal and interest</strong> over time .</li>
<li>Three <strong>golden rules</strong> are to <strong>invest early</strong>, <strong>invest regularly</strong>, and for the <strong>long term</strong> .</li>
</ul>
<table>
<thead>
<tr>
<th align="left">Topic</th>
<th align="left">Detailed Summary</th>
<th align="left">Technical Details / Formulas</th>
</tr>
</thead>
<tbody><tr>
<td align="left"><strong>Inflation Impact</strong></td>
<td align="left">Inflation reduces the <strong>purchasing power</strong> of money over time .</td>
<td align="left"><strong>Inflation Example:</strong> Rs. 100 today at <strong>6% inflation</strong> costs <strong>Rs. 321</strong> in <strong>20 years</strong> .</td>
</tr>
<tr>
<td align="left"><strong>Compounding</strong></td>
<td align="left"><strong>Reinvesting earnings</strong> generates <strong>growth on growth</strong> over many years .</td>
<td align="left"><strong>Yield Target:</strong> Investment return must exceed <strong>(Inflation Rate + Taxes)</strong> to increase value .</td>
</tr>
</tbody></table>
<hr>
<h3>Session 2: The Investment Process and Interest Rates</h3>
<ul>
<li>Investors must <strong>verify legitimacy</strong> and <strong>understand written documents</strong> before investing .</li>
<li>The <strong>Twelve Important Steps</strong> include assessing <strong>risk-return profiles</strong>, <strong>liquidity</strong>, and <strong>safety</strong> .</li>
<li>Dealing <strong>only through authorized intermediaries</strong> is a critical <strong>safety step</strong> .</li>
<li><strong>Interest</strong> is the <strong>price paid</strong> for the <strong>privilege of using</strong> borrowed money .</li>
<li><strong>Interest rates</strong> are usually calculated as a <strong>percentage of the principal</strong> balance .</li>
</ul>
<table>
<thead>
<tr>
<th align="left">Topic</th>
<th align="left">Detailed Summary</th>
<th align="left">Technical Details / Macro Factors</th>
</tr>
</thead>
<tbody><tr>
<td align="left"><strong>Twelve Steps</strong></td>
<td align="left">A <strong>procedural checklist</strong> to ensure <strong>investor protection</strong> and <strong>goal alignment</strong> .</td>
<td align="left"><strong>Includes:</strong> Comparing opportunities, seeking clarifications, and exploring <strong>redressal options</strong> .</td>
</tr>
<tr>
<td align="left"><strong>Interest Rate Determinants</strong></td>
<td align="left"><strong>Macroeconomic factors</strong> that govern the <strong>cost of money</strong> in the economy .</td>
<td align="left"><strong>Factors:</strong> Demand/Supply of money, <strong>Govt borrowings</strong>, Inflation, and <strong>RBI policies</strong> .</td>
</tr>
</tbody></table>
<hr>
<h3>Session 3: Short-Term and Long-Term Investment Options</h3>
<ul>
<li><p><strong>Physical assets</strong> include <strong>real estate</strong>, <strong>gold</strong>, and <strong>commodities</strong> .</p>
</li>
<li><p><strong>Savings Bank Accounts</strong> offer <strong>easy access</strong> but provide <strong>low interest</strong> (4%-5% p.a.) .</p>
</li>
<li><p><strong>Money Market Funds</strong> prioritize <strong>capital protection</strong> and provide <strong>easy liquidity</strong> .</p>
</li>
<li><p><strong>Bank Fixed Deposits</strong> (FDs) are for <strong>low risk appetite</strong> with a <strong>minimum 30-day</strong> period .</p>
</li>
<li><p><strong>Post Office MIS</strong> provides <strong>8% per annum</strong> paid <strong>monthly</strong> with a <strong>6-year maturity</strong> .</p>
</li>
<li><p><strong>Public Provident Fund</strong> (PPF) is a <strong>15-year</strong> instrument with <strong>tax-free interest</strong> compounded <strong>annually</strong> .</p>
</li>
<li><p><strong>Bonds</strong> are <strong>debt instruments</strong> where the issuer <strong>promises to repay principal</strong> plus <strong>fixed interest</strong> .</p>
</li>
<li><p><strong>Mutual Funds</strong> provide <strong>professional management</strong> and <strong>diversification</strong> for small investors .</p>
</li>
</ul>
<table>
<thead>
<tr>
<th align="left">Investment Tool</th>
<th align="left">Detailed Summary</th>
<th align="left">Key Technical Specs &amp; Constraints</th>
</tr>
</thead>
<tbody><tr>
<td align="left"><strong>Savings Account</strong></td>
<td align="left"><strong>First banking product</strong> used for short-term liquidity .</td>
<td align="left"><strong>Returns:</strong> 4% to 5% per annum .</td>
</tr>
<tr>
<td align="left"><strong>Post Office MIS</strong></td>
<td align="left"><strong>Low risk</strong> monthly income saving scheme .</td>
<td align="left"><strong>Limits:</strong> Max Rs. 3L (Single) / 6L (Joint); <strong>10% Bonus</strong> at maturity .</td>
</tr>
<tr>
<td align="left"><strong>PPF</strong></td>
<td align="left"><strong>Long-term</strong> savings with <strong>tax benefits</strong> .</td>
<td align="left"><strong>Withdrawal:</strong> Allowed from <strong>7th year</strong>; limit <strong>50% of balance</strong> at end of 4th year .</td>
</tr>
<tr>
<td align="left"><strong>Mutual Funds</strong></td>
<td align="left"><strong>Pooled resources</strong> invested in diversified assets .</td>
<td align="left"><strong>Formula:</strong> $NAV = \frac{\text{Value of assets} - \text{Expenses}}{\text{Number of units issued}}$ .</td>
</tr>
</tbody></table>
<h3>Session 4: Stock Exchange and Security Types</h3>
<ul>
<li><p>A <strong>Stock Exchange</strong> is an entity <strong>regulating the business</strong> of <strong>buying and selling securities</strong> .</p>
</li>
<li><p><strong>Equity Shares</strong> represent <strong>fractional ownership</strong> in a company and provide <strong>voting rights</strong> .</p>
</li>
<li><p><strong>Debt Instruments</strong> represent a <strong>contract</strong> where <strong>money is lent</strong> for <strong>interest and principal</strong> repayment .</p>
</li>
<li><p><strong>Bonds</strong> generally refer to <strong>government debt</strong>, while <strong>debentures</strong> refer to <strong>private corporate debt</strong> .</p>
</li>
<li><p><strong>Derivatives</strong> are products whose <strong>value is derived</strong> from an <strong>underlying asset</strong> like equity or gold .</p>
</li>
<li><p>An <strong>Index</strong> shows <strong>market trends</strong> by tracking a <strong>specified portfolio</strong> of share prices .</p>
</li>
<li><p>A <strong>Depository</strong> holds <strong>securities</strong> like shares and bonds in <strong>electronic form</strong> .</p>
</li>
<li><p><strong>Dematerialization</strong> is the <strong>process</strong> of converting <strong>physical certificates</strong> into <strong>electronic form</strong> .</p>
</li>
</ul>
<table>
<thead>
<tr>
<th align="left">Concept</th>
<th align="left">Detailed Summary</th>
<th align="left">Technical Infrastructure</th>
</tr>
</thead>
<tbody><tr>
<td align="left"><strong>Equity vs Debt</strong></td>
<td align="left"><strong>Equity</strong> offers <strong>ownership</strong>; <strong>Debt</strong> is a <strong>loan contract</strong> with fixed terms .</td>
<td align="left"><strong>Equity:</strong> Riskier but higher growth potential; <strong>Debt:</strong> Fixed return and priority in repayment .</td>
</tr>
<tr>
<td align="left"><strong>Depository</strong></td>
<td align="left">Acts as a <strong>bank for securities</strong>, facilitating <strong>paperless trading</strong> .</td>
<td align="left"><strong>Mechanism:</strong> Securities are credited to the investor&#39;s account with a <strong>Depository Participant</strong> (DP) .</td>
</tr>
</tbody></table>
<hr>
<h1>SECURITIES</h1>
<h3>1. Definition and Function of the Securities Market</h3>
<ul>
<li><p><strong>Securities</strong> defined by <strong>SCRA 1956</strong> include <strong>shares, bonds, scrips, stocks</strong>, and other <strong>marketable instruments</strong> .</p>
</li>
<li><p>Other <strong>investable securities</strong> consist of <strong>government securities, derivatives</strong>, and <strong>units of mutual funds</strong> .</p>
</li>
<li><p>The <strong>Securities Market</strong> serves as a <strong>place</strong> for <strong>buyers and sellers</strong> to <strong>transact</strong> in financial products .</p>
</li>
<li><p>It performs the <strong>role</strong> of <strong>reallocating savings</strong> from <strong>investors</strong> to <strong>investments and entrepreneurship</strong> .</p>
</li>
<li><p>The market enables <strong>corporates and entrepreneurs</strong> to <strong>raise resources</strong> through <strong>public issues</strong> .</p>
</li>
<li><p>It ensures the <strong>efficient transfer</strong> of <strong>idle resources</strong> from those who have them to those who <strong>need them</strong> .</p>
</li>
</ul>
<table>
<thead>
<tr>
<th align="left">Feature</th>
<th align="left">Detailed Summary and Technical Details</th>
</tr>
</thead>
<tbody><tr>
<td align="left"><strong>Legal Definition</strong></td>
<td align="left">Under <strong>Securities Contracts Regulation Act (SCRA), 1956</strong>, securities include <strong>marketable securities</strong> of any <strong>body corporate</strong>, <strong>government securities</strong>, and <strong>rights/interest in securities</strong> .</td>
</tr>
<tr>
<td align="left"><strong>Market Core Function</strong></td>
<td align="left">Acts as a <strong>monitoring and control conduit</strong> for the <strong>reallocation of savings</strong> into productive <strong>entrepreneurship</strong> .</td>
</tr>
<tr>
<td align="left"><strong>Resource Flow</strong></td>
<td align="left">Facilitates the flow of <strong>household savings</strong> into <strong>corporate and government obligations</strong> .</td>
</tr>
</tbody></table>
<h3>2. Regulator and the Role of SEBI</h3>
<ul>
<li><p><strong>Regulators</strong> are <strong>essential</strong> due to the <strong>absence of perfect competition</strong> in the securities market .</p>
</li>
<li><p>They <strong>ensure</strong> that <strong>market participants behave</strong> in a <strong>desired manner</strong> to protect <strong>investor interests</strong> .</p>
</li>
<li><p><strong>Responsibility</strong> for <strong>regulation</strong> is <strong>shared</strong> by <strong>DEA, DCA, RBI</strong>, and <strong>SEBI</strong> .</p>
</li>
<li><p><strong>SEBI</strong> was <strong>established</strong> under the <strong>SEBI Act, 1992</strong> with <strong>statutory powers</strong> .</p>
</li>
<li><p>Its <strong>regulatory jurisdiction</strong> extends to <strong>corporates, intermediaries</strong>, and all <strong>persons associated</strong> with the market .</p>
</li>
<li><p><strong>SEBI&#39;s powers</strong> include <strong>registering brokers</strong>, <strong>regulating stock exchanges</strong>, and <strong>prohibiting unfair practices</strong> .</p>
</li>
<li><p>It can <strong>inspect, inquire</strong>, and <strong>audit</strong> any <strong>self-regulatory organization</strong> or <strong>mutual fund</strong> .</p>
</li>
</ul>
<table>
<thead>
<tr>
<th align="left">Regulatory Aspect</th>
<th align="left">Detailed Technical Roles and Functions</th>
</tr>
</thead>
<tbody><tr>
<td align="left"><strong>Statutory Authority</strong></td>
<td align="left"><strong>Securities and Exchange Board of India (SEBI)</strong> established under <strong>Section 3 of SEBI Act, 1992</strong> .</td>
</tr>
<tr>
<td align="left"><strong>Core Objectives</strong></td>
<td align="left">1. <strong>Protecting investor interests</strong>; 2. <strong>Promoting market development</strong>; 3. <strong>Regulating the market</strong> .</td>
</tr>
<tr>
<td align="left"><strong>Enforcement Powers</strong></td>
<td align="left">Authorized to <strong>prohibit fraudulent trade practices</strong> and <strong>call for information</strong> from market participants for <strong>audits</strong> .</td>
</tr>
<tr>
<td align="left"><strong>Participating Bodies</strong></td>
<td align="left"><strong>Department of Economic Affairs (DEA)</strong>, <strong>Department of Company Affairs (DCA)</strong>, and <strong>Reserve Bank of India (RBI)</strong> .</td>
</tr>
</tbody></table>
<h3>3. Market Participants and Intermediaries</h3>
<ul>
<li><p><strong>Issuers</strong> consist of <strong>corporates and government</strong> units that <strong>raise resources</strong> from the market .</p>
</li>
<li><p><strong>Investors</strong> are primarily <strong>households</strong> who <strong>invest savings</strong> into various <strong>securities</strong> .</p>
</li>
<li><p><strong>Intermediaries</strong> include <strong>brokers, merchant bankers</strong>, and <strong>bankers to an issue</strong> .</p>
</li>
<li><p>It is <strong>advisable</strong> to <strong>transact through intermediaries</strong> like <strong>trading members</strong> to buy or sell <strong>shares</strong> .</p>
</li>
<li><p><strong>Investors</strong> must <strong>maintain accounts</strong> with a <strong>depository</strong> to hold <strong>securities</strong> in <strong>demat form</strong> .</p>
</li>
<li><p>Using <strong>SEBI registered intermediaries</strong> ensures they are <strong>accountable</strong> for their <strong>activities</strong> .</p>
</li>
</ul>
<table>
<thead>
<tr>
<th align="left">Participant Type</th>
<th align="left">Role and Required Procedures</th>
</tr>
</thead>
<tbody><tr>
<td align="left"><strong>Issuers</strong></td>
<td align="left"><strong>Government and Corporates</strong> seeking to <strong>discharge obligations</strong> or <strong>fund investments</strong> .</td>
</tr>
<tr>
<td align="left"><strong>Intermediaries</strong></td>
<td align="left">Must be <strong>SEBI registered</strong>; includes <strong>trading members</strong> for exchange trades and <strong>depository participants</strong> for demat .</td>
</tr>
<tr>
<td align="left"><strong>Accountability</strong></td>
<td align="left"><strong>Registration</strong> with <strong>industry associations or exchanges</strong> makes the intermediary <strong>accountable</strong> for client transactions .</td>
</tr>
</tbody></table>
<h3>4. Segments of the Securities Market</h3>
<ul>
<li><p>The <strong>market</strong> is <strong>split</strong> into <strong>two interdependent segments</strong>: <strong>Primary</strong> and <strong>Secondary</strong> .</p>
</li>
<li><p>The <strong>Primary Market</strong> is the <strong>channel</strong> for the <strong>sale of new securities</strong> .</p>
</li>
<li><p>The <strong>Secondary Market</strong> deals exclusively in <strong>securities previously issued</strong> .</p>
</li>
</ul>
<table>
<thead>
<tr>
<th align="left">Market Segment</th>
<th align="left">Detailed Summary of Operations</th>
</tr>
</thead>
<tbody><tr>
<td align="left"><strong>Primary Market</strong></td>
<td align="left">Known as the <strong>New Issues Market</strong>; focuses on the <strong>initial issuance</strong> of securities to the public .</td>
</tr>
<tr>
<td align="left"><strong>Secondary Market</strong></td>
<td align="left">Provides a <strong>platform</strong> for <strong>trading existing securities</strong> among investors <strong>after listing</strong> .</td>
</tr>
<tr>
<td align="left"><strong>Interdependence</strong></td>
<td align="left">Both segments are <strong>interconnected</strong>; the <strong>Primary market</strong> creates assets that the <strong>Secondary market</strong> makes liquid .</td>
</tr>
</tbody></table>
<h1>PRIMARY MARKET</h1>
<h3>Session 1: Fundamentals of the New Issue Market</h3>
<ul>
<li><p>The <strong>primary market</strong> provides a <strong>channel for sale</strong> of <strong>new securities</strong> to raise <strong>investment resources</strong> .</p>
</li>
<li><p>Issuers including <strong>Government and corporates</strong> use this market to <strong>meet requirements</strong> or <strong>discharge obligations</strong> .</p>
</li>
<li><p><strong>Face Value</strong> (or Par Value) is the <strong>nominal amount assigned</strong> to a security by the <strong>issuer</strong> .</p>
</li>
<li><p>A <strong>Premium</strong> occurs when a <strong>security is sold above</strong> its <strong>face value</strong> .</p>
</li>
<li><p>A <strong>Discount</strong> occurs when a <strong>security is sold below</strong> its <strong>face value</strong> .</p>
</li>
<li><p><strong>Public Issues</strong> are used by <strong>companies to invite</strong> share <strong>capital from the public</strong> when <strong>promoter capital</strong> and <strong>bank borrowings</strong> are insufficient .</p>
</li>
</ul>
<table>
<thead>
<tr>
<th align="left">Topic</th>
<th align="left">Detailed Summary</th>
<th align="left">Technical Details &amp; Formulas</th>
</tr>
</thead>
<tbody><tr>
<td align="left"><strong>Market Role</strong></td>
<td align="left">Acts as the <strong>initial stage</strong> for <strong>raising equity or debt</strong> capital in <strong>domestic or international</strong> markets .</td>
<td align="left"><strong>Forms:</strong> Securities can take the form of <strong>equity or debt</strong> .</td>
</tr>
<tr>
<td align="left"><strong>Face Value Concepts</strong></td>
<td align="left">The <strong>stated amount</strong> (e.g., Rs. 5, 10, or 100) used for <strong>original cost</strong> or <strong>maturity repayment</strong> .</td>
<td align="left"><strong>Debt Repayment:</strong> For <strong>bonds</strong>, the <strong>face value</strong> is the amount <strong>repaid to the investor</strong> at maturity .</td>
</tr>
<tr>
<td align="left"><strong>Market Value</strong></td>
<td align="left"><strong>Market Capitalization</strong> represents the <strong>total market value</strong> of a <strong>quoted company</strong> .</td>
<td align="left"><strong>Formula:</strong> $\text{Market Capitalization} = \text{Current Market Price} \times \text{Number of Shares in Issue}$ .</td>
</tr>
</tbody></table>
<h3>Session 2: Classification of Issues</h3>
<ul>
<li><p>An <strong>Initial Public Offering (IPO)</strong> is when an <strong>unlisted company</strong> makes a <strong>fresh issue</strong> or <strong>offer for sale</strong> for the <strong>first time</strong> .</p>
</li>
<li><p>A <strong>Follow on Public Offering</strong> (Further Issue) involves an <strong>already listed company</strong> issuing <strong>securities to the public</strong> .</p>
</li>
<li><p><strong>Rights Issues</strong> offer <strong>fresh securities</strong> to <strong>existing shareholders</strong> in a <strong>specified ratio</strong> as of a <strong>record date</strong> .</p>
</li>
<li><p><strong>Preferential Issues</strong> (Private Placements) allow <strong>listed companies</strong> to <strong>issue shares</strong> to a <strong>select group</strong> of persons .</p>
</li>
<li><p>An <strong>issue becomes public</strong> under the <strong>Companies Act, 1956</strong> if it results in <strong>allotment to 50 persons</strong> or more .</p>
</li>
</ul>
<table>
<thead>
<tr>
<th align="left">Issue Type</th>
<th align="left">Detailed Summary</th>
<th align="left">Key Technical Constraints</th>
</tr>
</thead>
<tbody><tr>
<td align="left"><strong>IPO &amp; FPO</strong></td>
<td align="left">Methods for <strong>unlisted or listed companies</strong> to raise <strong>equity capital</strong> from the <strong>general public</strong> .</td>
<td align="left"><strong>IPO Goal:</strong> Paves the way for <strong>listing and trading</strong> of the issuer&#39;s securities .</td>
</tr>
<tr>
<td align="left"><strong>Rights Issue</strong></td>
<td align="left">A <strong>capital raising route</strong> that avoids <strong>diluting the stake</strong> of <strong>existing shareholders</strong> .</td>
<td align="left"><strong>Ratio-based:</strong> Offered in <strong>proportion</strong> to the <strong>number of securities held</strong> prior to the issue .</td>
</tr>
<tr>
<td align="left"><strong>Private Placement</strong></td>
<td align="left">A <strong>faster way</strong> to raise <strong>equity capital</strong> by targeting <strong>fewer than 50 persons</strong> .</td>
<td align="left"><strong>Regulation:</strong> Must comply with <strong>Companies Act</strong> and <strong>SEBI guidelines</strong> on <strong>pricing and disclosures</strong> .</td>
</tr>
</tbody></table>
<h3>Session 3: Pricing and Book Building</h3>
<ul>
<li><p>The <strong>Indian primary market</strong> uses <strong>free pricing</strong>, where the <strong>issuer and Merchant Banker</strong> decide the <strong>issue price</strong> .</p>
</li>
<li><p><strong>SEBI</strong> does <strong>not play a role</strong> in <strong>fixing the price</strong> of an issue .</p>
</li>
<li><p><strong>Book Building</strong> is a <strong>mechanism</strong> for <strong>efficient price discovery</strong> based on <strong>investor bids</strong> .</p>
</li>
<li><p>The <strong>Floor Price</strong> is the <strong>minimum price</strong> at which <strong>investors can bid</strong> .</p>
</li>
<li><p>The <strong>Price Band</strong> specifies a <strong>range</strong> where the <strong>cap cannot exceed 120%</strong> of the <strong>floor price</strong> .</p>
</li>
<li><p>The <strong>Cut-Off Price</strong> is the <strong>final issue price</strong> discovered after <strong>considering investor appetite</strong> .</p>
</li>
</ul>
<table>
<thead>
<tr>
<th align="left">Concept</th>
<th align="left">Detailed Summary</th>
<th align="left">Technical Rules</th>
</tr>
</thead>
<tbody><tr>
<td align="left"><strong>Book Building Process</strong></td>
<td align="left"><strong>Bids are collected</strong> from investors at <strong>various prices</strong> above the floor price <strong>while the IPO is open</strong> .</td>
<td align="left"><strong>Bidding Period:</strong> The <strong>book</strong> must remain open for <strong>minimum 3 days</strong> and <strong>maximum 10 days</strong> .</td>
</tr>
<tr>
<td align="left"><strong>Price Band Revisions</strong></td>
<td align="left">The <strong>price band can be revised</strong>, which requires a <strong>press release</strong> and <strong>terminal updates</strong> .</td>
<td align="left"><strong>Extension:</strong> If <strong>revised</strong>, the <strong>bidding period</strong> must be <strong>extended by 3 days</strong> .</td>
</tr>
<tr>
<td align="left"><strong>Fixed Price vs. Book Building</strong></td>
<td align="left">In <strong>Fixed Price</strong>, the <strong>price is known in advance</strong>; in <strong>Book Building</strong>, it is <strong>discovered later</strong> .</td>
<td align="left"><strong>Demand:</strong> In <strong>Book Building</strong>, <strong>demand is known daily</strong> as the book is being built .</td>
</tr>
</tbody></table>
<h3>Session 4: Procedures, Timelines, and Parties</h3>
<ul>
<li><p><strong>Merchant Bankers</strong> handle <strong>project appraisal</strong>, <strong>cost finalization</strong>, and <strong>preparing the Prospectus</strong> .</p>
</li>
<li><p>A <strong>Prospectus</strong> (Offer Document) contains <strong>essential information</strong> like <strong>project costs</strong>, <strong>promoter details</strong>, and <strong>risk factors</strong> .</p>
</li>
<li><p>An <strong>Abridged Prospectus</strong> is a <strong>shorter version</strong> that <strong>accompanies the application form</strong> .</p>
</li>
<li><p><strong>Registrars</strong> to an issue <strong>finalize the allottees</strong>, <strong>delete invalid applications</strong>, and <strong>handle refunds</strong> .</p>
</li>
<li><p>The <strong>Basis of Allotment</strong> must be <strong>completed within 8 days</strong> of the <strong>issue closing</strong> .</p>
</li>
<li><p><strong>Listing</strong> of securities on the <strong>exchange</strong> typically occurs <strong>within 12 working days</strong> of issue closure .</p>
</li>
</ul>
<table>
<thead>
<tr>
<th align="left">Procedure</th>
<th align="left">Detailed Summary</th>
<th align="left">Technical Timelines</th>
</tr>
</thead>
<tbody><tr>
<td align="left"><strong>Allotment &amp; Refund</strong></td>
<td align="left"><strong>Credit to demat accounts</strong> and <strong>dispatch of refund orders</strong> follows the <strong>finalized basis of allotment</strong> .</td>
<td align="left"><strong>Timeline:</strong> Allotment/refund details completed <strong>within 2 working days</strong> after the <strong>8-day basis period</strong> .</td>
</tr>
<tr>
<td align="left"><strong>Draft Offer Document</strong></td>
<td align="left">A <strong>preliminary document</strong> filed with <strong>SEBI</strong> for <strong>observations</strong> before the <strong>final prospectus</strong> .</td>
<td align="left"><strong>Observation Validity:</strong> <strong>SEBI&#39;s letter</strong> is valid for <strong>3 months</strong>; the <strong>draft</strong> is open for <strong>public comment for 21 days</strong> .</td>
</tr>
<tr>
<td align="left"><strong>Listing &amp; Agreement</strong></td>
<td align="left"><strong>Admission of securities</strong> to <strong>trading privileges</strong> on a <strong>stock exchange</strong> .</td>
<td align="left"><strong>Listing Agreement:</strong> Specifies <strong>terms, conditions</strong>, and <strong>continuous disclosures</strong> required by the exchange .</td>
</tr>
</tbody></table>
<h3>Session 5: Regulatory Measures and Foreign Capital</h3>
<ul>
<li><p><strong>SEBI</strong> scrutinizes issues for <strong>adequate disclosures</strong> but <strong>does not guarantee funds</strong> or <strong>recommend projects</strong> .</p>
</li>
<li><p><strong>Lock-in</strong> is a <strong>freeze on share sales</strong> for a <strong>specific period</strong>, primarily for <strong>promoter holdings</strong> .</p>
</li>
<li><p><strong>Delisting</strong> refers to the <strong>permanent removal</strong> of a <strong>listed company&#39;s securities</strong> from an <strong>exchange</strong> .</p>
</li>
<li><p><strong>Indian companies</strong> can raise <strong>foreign resources</strong> through <strong>Euro issues</strong>, <strong>ADRs</strong>, or <strong>GDRs</strong> .</p>
</li>
<li><p>An <strong>American Depository Receipt (ADR)</strong> represents <strong>ownership of shares</strong> in a <strong>non-U.S. company</strong> traded in <strong>U.S. markets</strong> .</p>
</li>
<li><p><strong>Global Depository Receipts (GDRs)</strong> allow an <strong>issuer to raise capital</strong> in <strong>multiple markets simultaneously</strong> .</p>
</li>
</ul>
<table>
<thead>
<tr>
<th align="left">Topic</th>
<th align="left">Detailed Summary</th>
<th align="left">Technical Characteristics</th>
</tr>
</thead>
<tbody><tr>
<td align="left"><strong>ADR / ADS</strong></td>
<td align="left"><strong>U.S. dollar denominated</strong> equity ownership traded on <strong>NYSE, AMEX, or NASDAQ</strong> .</td>
<td align="left"><strong>Currency Risk:</strong> Pay <strong>dividends in U.S. dollars</strong> but <strong>do not eliminate currency risk</strong> .</td>
</tr>
<tr>
<td align="left"><strong>GDR</strong></td>
<td align="left">A <strong>negotiable certificate</strong> usually representing a <strong>company&#39;s traded equity/debt</strong> in <strong>global markets</strong> .</td>
<td align="left"><strong>Ratio:</strong> Underlying <strong>shares correspond to GDRs</strong> in a <strong>fixed ratio</strong> (e.g., 1 GDR = 10 shares) .</td>
</tr>
<tr>
<td align="left"><strong>SEBI Jurisdiction</strong></td>
<td align="left">Extends over <strong>capital issuance</strong>, <strong>security transfers</strong>, and <strong>all associated intermediaries</strong> .</td>
<td align="left"><strong>Requirement:</strong> Companies issuing <strong>over Rs. 50 lakh</strong> must file <strong>draft documents with SEBI</strong> .</td>
</tr>
</tbody></table>
<h1>SECONDARY MARKET</h1>
<h3>Session 1: Fundamentals and Market Structure</h3>
<ul>
<li><p>The <strong>secondary market</strong> refers to the <strong>venue</strong> where <strong>previously issued securities</strong> are <strong>traded among investors</strong> .</p>
</li>
<li><p>While the <strong>primary market</strong> raises <strong>new capital</strong>, the <strong>secondary market</strong> provides <strong>liquidity and price discovery</strong> for existing assets .</p>
</li>
<li><p><strong>Stock Exchanges</strong> act as <strong>auction markets</strong> where <strong>buyers and sellers</strong> transact through <strong>SEBI-regulated platforms</strong> .</p>
</li>
<li><p><strong>Demutualisation</strong> is a <strong>legal structure</strong> where <strong>ownership, management, and trading rights</strong> are <strong>segregated</strong> to prevent <strong>conflicts of interest</strong> .</p>
</li>
<li><p>In a <strong>mutual exchange</strong>, these <strong>three functions</strong> are <strong>concentrated</strong> in a <strong>single group</strong> of broker-members .</p>
</li>
</ul>
<table>
<thead>
<tr>
<th align="left">Topic</th>
<th align="left">Detailed Summary</th>
<th align="left">Technical Details &amp; Registration</th>
</tr>
</thead>
<tbody><tr>
<td align="left"><strong>Market Role</strong></td>
<td align="left">Facilitates <strong>value-enhancing control</strong>, <strong>incentive-based contracts</strong>, and <strong>guides management</strong> via pricing .</td>
<td align="left"><strong>Segments:</strong> Comprises <strong>equity markets</strong> and <strong>debt markets</strong> .</td>
</tr>
<tr>
<td align="left"><strong>Broker Verification</strong></td>
<td align="left">Investors must ensure <strong>intermediaries</strong> are <strong>SEBI registered</strong> for <strong>legal protection</strong> .</td>
<td align="left"><strong>Prefixes:</strong> Broker codes start with <strong>&#39;INB&#39;</strong>; sub-brokers start with <strong>&#39;INS&#39;</strong> .</td>
</tr>
</tbody></table>
<h3>Session 2: Trading Mechanics and Procedures</h3>
<ul>
<li><p><strong>Screen Based Trading (SBTS)</strong> replaced the <strong>open outcry system</strong> with a <strong>nationwide, automated</strong> electronic network .</p>
</li>
<li><p>The <strong>NEAT system</strong> (National Exchange for Automated Trading) is a <strong>satellite-based</strong> application with a <strong>response time</strong> of <strong>under one second</strong> .</p>
</li>
<li><p>A <strong>Contract Note</strong> is a <strong>legally enforceable confirmation</strong> of trades that must be issued <strong>within 24 hours</strong> .</p>
</li>
<li><p>The <strong>maximum brokerage</strong> a broker can <strong>charge</strong> is capped at <strong>2.5%</strong> of the <strong>transaction value</strong> .</p>
</li>
<li><p><strong>Internet trading</strong> allows investors to <strong>access markets</strong> from any <strong>computer</strong> using a <strong>broker’s portal</strong> .</p>
</li>
</ul>
<table>
<thead>
<tr>
<th align="left">Concept</th>
<th align="left">Detailed Summary</th>
<th align="left">Mandatory Contract Note Details</th>
</tr>
</thead>
<tbody><tr>
<td align="left"><strong>NEAT System</strong></td>
<td align="left">A <strong>client-server application</strong> using an <strong>in-memory database</strong> for <strong>99.7% uptime</strong> .</td>
<td align="left"><strong>Includes:</strong> SEBI reg. number, <strong>trade time/number</strong>, quantity, <strong>brokerage</strong>, and <strong>STT charges</strong> .</td>
</tr>
<tr>
<td align="left"><strong>Order Placement</strong></td>
<td align="left">Clients can place orders via <strong>office visits, phone</strong>, or <strong>online interfaces</strong> per the <strong>Model Agreement</strong> .</td>
<td align="left"><strong>Legal Requirement:</strong> Must be <strong>signed</strong> by an <strong>authorized signatory</strong> to be valid for <strong>arbitration</strong> .</td>
</tr>
</tbody></table>
<h3>Session 3: Equity Investment Products</h3>
<ul>
<li><p><strong>Equity shares</strong> represent <strong>fractional ownership</strong> and provide <strong>voting rights</strong> in a company .</p>
</li>
<li><p><strong>Preference shares</strong> offer a <strong>fixed dividend</strong> and <strong>priority repayment</strong> during <strong>liquidation</strong> .</p>
</li>
<li><p><strong>Bonus shares</strong> are issued <strong>free of cost</strong> to existing shareholders based on their <strong>current holdings</strong> .</p>
</li>
<li><p><strong>Rights issues</strong> allow existing holders to <strong>buy new securities</strong> at a <strong>specific ratio</strong> and <strong>price</strong> .</p>
</li>
<li><p><strong>Growth stocks</strong> belong to companies with <strong>high earnings potential</strong> that <strong>reinvest profits</strong> instead of paying <strong>dividends</strong> .</p>
</li>
<li><p><strong>Value stocks</strong> are <strong>undervalued companies</strong> with <strong>hidden assets</strong> overlooked by the <strong>general market</strong> .</p>
</li>
</ul>
<table>
<thead>
<tr>
<th align="left">Product Type</th>
<th align="left">Detailed Summary</th>
<th align="left">Investment Metrics &amp; Formulas</th>
</tr>
</thead>
<tbody><tr>
<td align="left"><strong>Equities</strong></td>
<td align="left">Historically <strong>outperformed</strong> other options; <strong>average return</strong> in India is <strong>16% annually</strong> .</td>
<td align="left"><strong>Returns:</strong> Comprise <strong>capital appreciation</strong> + <strong>dividend yield</strong> (avg. 1.5%) .</td>
</tr>
<tr>
<td align="left"><strong>Preference Variants</strong></td>
<td align="left"><strong>Cumulative</strong> shares accumulate <strong>unpaid dividends</strong>; <strong>Convertible</strong> shares switch to <strong>equity</strong> later .</td>
<td align="left"><strong>Dividend Yield:</strong> $\frac{\text{Past year&#39;s dividend}}{\text{Current stock price}}$ .</td>
</tr>
</tbody></table>
<h3>Session 4: Analysis, Risks, and Risk Management</h3>
<ul>
<li><p><strong>Stock prices</strong> are influenced by <strong>stock-specific factors</strong> (management/earnings) and <strong>market-specific factors</strong> (sentiments/politics) .</p>
</li>
<li><p>The <strong>Bid price</strong> is the <strong>buyer&#39;s price</strong> (what you get when selling); the <strong>Ask price</strong> is the <strong>seller&#39;s price</strong> .</p>
</li>
<li><p>The <strong>Bid-Ask spread</strong> is the <strong>difference</strong> between these prices and serves as a <strong>liquidity indicator</strong> .</p>
</li>
<li><p>A <strong>Portfolio</strong> is a <strong>combination of assets</strong> (shares, bonds, gold) held to <strong>achieve financial goals</strong> .</p>
</li>
<li><p><strong>Diversification</strong> is a <strong>risk management technique</strong> that follows the rule: <strong>&quot;not putting all eggs in one basket&quot;</strong> .</p>
</li>
</ul>
<table>
<thead>
<tr>
<th align="left">Topic</th>
<th align="left">Detailed Summary</th>
<th align="left">Technical Indicators</th>
</tr>
</thead>
<tbody><tr>
<td align="left"><strong>Price Discovery</strong></td>
<td align="left">The <strong>best buy order</strong> has the <strong>highest price</strong>; the <strong>best sell order</strong> has the <strong>lowest price</strong> .</td>
<td align="left"><strong>Spread Indicator:</strong> A <strong>narrower spread</strong> implies the stock is <strong>highly liquid</strong> .</td>
</tr>
<tr>
<td align="left"><strong>Risk Mitigation</strong></td>
<td align="left"><strong>Market risk</strong> affects the <strong>whole market</strong>; <strong>Non-market risk</strong> (company-specific) is reduced by <strong>diversification</strong> .</td>
<td align="left"><strong>Value Strategy:</strong> Focused on <strong>P/E ratios</strong> and <strong>Total Sales</strong> relative to <strong>Market Cap</strong> .</td>
</tr>
</tbody></table>
<h3>Session 5: Debt Market Segments and Features</h3>
<ul>
<li><p><strong>Debt instruments</strong> are <strong>contracts</strong> to <strong>repay a loan</strong> with <strong>periodic interest</strong> (coupons) .</p>
</li>
<li><p><strong>Bonds</strong> generally describe <strong>Government/PSU debt</strong>, while <strong>Debentures</strong> describe <strong>private corporate debt</strong> .</p>
</li>
<li><p><strong>Zero Coupon Bonds</strong> are issued at a <strong>discount</strong> and repaid at <strong>face value</strong> with <strong>no periodic interest</strong> .</p>
</li>
<li><p><strong>Maturity</strong> is the <strong>date</strong> the borrower <strong>repays the principal</strong>; <strong>Term-to-Maturity</strong> reduces daily until that date .</p>
</li>
<li><p>The <strong>Debt Market</strong> is primarily a <strong>wholesale market</strong> dominated by <strong>institutional investors</strong> like banks .</p>
</li>
</ul>
<table>
<thead>
<tr>
<th align="left">Feature</th>
<th align="left">Detailed Summary</th>
<th align="left">Credit and Yield</th>
</tr>
</thead>
<tbody><tr>
<td align="left"><strong>Bond Valuation</strong></td>
<td align="left"><strong>Bond prices</strong> and <strong>interest rates</strong> move in <strong>opposite directions</strong> .</td>
<td align="left"><strong>Rating Agencies:</strong> CRISIL, CARE, ICRA, and Fitch <strong>assess credit quality</strong> .</td>
</tr>
<tr>
<td align="left"><strong>Yield Relationship</strong></td>
<td align="left">The <strong>safer the instrument</strong>, the <strong>lower the interest rate</strong> offered to investors .</td>
<td align="left"><strong>GS CG2008 11.4%:</strong> Example of a <strong>Central Govt bond</strong> maturing in 2008 with <strong>11.4% coupon</strong> .</td>
</tr>
</tbody></table>
<h3>Session 6: Clearing, Settlement, and Investor Protection</h3>
<ul>
<li><p>The <strong>Clearing Corporation</strong> (e.g., <strong>NSCCL</strong>) <strong>clears and settles</strong> trades while providing a <strong>financial guarantee</strong> .</p>
</li>
<li><p><strong>Rolling Settlement</strong> mandates that trades are settled on a <strong>T+2 basis</strong> (Trade day plus 2 working days) .</p>
</li>
<li><p><strong>Pay-in</strong> is the day <strong>sellers deliver securities</strong> and <strong>buyers provide funds</strong> to the exchange .</p>
</li>
<li><p><strong>Auctions</strong> occur if a <strong>seller fails to deliver</strong>; the <strong>Exchange buys</strong> the security and gives it to the <strong>purchaser</strong> .</p>
</li>
<li><p><strong>Arbitration</strong> is an <strong>alternative dispute resolution</strong> mechanism provided by the <strong>exchange</strong> .</p>
</li>
<li><p>The <strong>Investor Protection Fund (IPF)</strong> compensates investors up to <strong>Rs. 10 lakh</strong> if a <strong>broker defaults</strong> .</p>
</li>
</ul>
<table>
<thead>
<tr>
<th align="left">Procedure</th>
<th align="left">Detailed Summary</th>
<th align="left">Post-Market Technical Dates</th>
</tr>
</thead>
<tbody><tr>
<td align="left"><strong>Settlement Cycle</strong></td>
<td align="left"><strong>Funds and securities</strong> are exchanged on the <strong>second working day</strong> after execution .</td>
<td align="left"><strong>Record Date:</strong> The day <strong>ownership</strong> is checked to <strong>grant corporate benefits</strong> .</td>
</tr>
<tr>
<td align="left"><strong>No-Delivery Period</strong></td>
<td align="left">A <strong>period</strong> where <strong>trading continues</strong> but <strong>settlement is paused</strong> to determine <strong>entitlements</strong> .</td>
<td align="left"><strong>Ex-Date:</strong> The <strong>first day</strong> of the <strong>no-delivery period</strong>; buyers on/after this date <strong>miss benefits</strong> .</td>
</tr>
</tbody></table>
<h2><strong>TOPIC: Meaning &amp; Basic Concept of Derivative</strong></h2>
<ul>
<li><p><strong>Derivative</strong> ➙ product whose value is <strong>derived</strong> from one or more <strong>underlying basic variables</strong> .</p>
</li>
<li><p>The <strong>underlying asset</strong> can be <strong>equity</strong>, <strong>index</strong>, <strong>foreign exchange (forex)</strong>, or <strong>commodity</strong> .</p>
</li>
<li><p><strong>Derivatives</strong> initially emerged as <strong>hedging devices</strong> to protect against <strong>commodity price fluctuations</strong> .</p>
</li>
<li><p><strong>Financial derivatives</strong> became popular after 1970 due to <strong>growing instability</strong> in financial markets .</p>
</li>
</ul>
<table>
<thead>
<tr>
<th align="left"><strong>Concept</strong></th>
<th align="left"><strong>Definition</strong></th>
<th align="left"><strong>When used / Example</strong></th>
</tr>
</thead>
<tbody><tr>
<td align="left"><strong>Derivative</strong></td>
<td align="left">A contract deriving value from an underlying asset.</td>
<td align="left">Nifty Futures (Underlying is Nifty Index).</td>
</tr>
<tr>
<td align="left"><strong>Underlying</strong></td>
<td align="left">The basic variable/asset that determines derivative value.</td>
<td align="left">Equity, Index, Gold, or Currency.</td>
</tr>
</tbody></table>
<ul>
<li><p><strong>Worked Example</strong>: If the price of gold (underlying) rises, a gold-linked derivative contract’s value typically increases.</p>
</li>
<li><p><strong>Interpretation</strong>: The derivative has no independent value; it reflects the price movements of the actual asset.</p>
</li>
</ul>
<hr>
<h2><strong>TOPIC: Types of Derivatives - Forwards, Futures, Options, Warrants</strong></h2>
<ul>
<li><p><strong>Forward Contract</strong> ➙ <strong>customized contract</strong> between two entities for settlement on a future date .</p>
</li>
<li><p><strong>Futures Contract</strong> ➙ <strong>standardized</strong>, exchange-traded agreement to buy/sell an asset at a set price .</p>
</li>
<li><p><strong>Options</strong> ➙ contracts giving the <strong>right but not the obligation</strong> to buy or sell .</p>
</li>
<li><p><strong>Call Option</strong> ➙ gives the buyer the right to <strong>buy</strong> the underlying asset .</p>
</li>
<li><p><strong>Put Option</strong> ➙ gives the buyer the right to <strong>sell</strong> the underlying asset .</p>
</li>
<li><p><strong>Warrants</strong> ➙ <strong>longer-dated options</strong> with lives usually exceeding nine months, traded <strong>over-the-counter</strong> .</p>
</li>
</ul>
<table>
<thead>
<tr>
<th align="left"><strong>Contract / Topic</strong></th>
<th align="left"><strong>Definition / Rule</strong></th>
<th align="left"><strong>Key Features / Mechanics</strong></th>
<th align="left"><strong>Example / Centres</strong></th>
</tr>
</thead>
<tbody><tr>
<td align="left"><strong>Forwards</strong></td>
<td align="left">Customized agreement.</td>
<td align="left">Not traded on exchanges (OTC).</td>
<td align="left">Farmer-Miller wheat deal.</td>
</tr>
<tr>
<td align="left"><strong>Futures</strong></td>
<td align="left">Standardized forward.</td>
<td align="left">Traded on <strong>NSE/BSE</strong>; regulated.</td>
<td align="left"><strong>Nifty Index Futures</strong>.</td>
</tr>
<tr>
<td align="left"><strong>Options</strong></td>
<td align="left">Right, not obligation.</td>
<td align="left">Buyer pays <strong>Option Premium</strong>.</td>
<td align="left"><strong>BANK Nifty Options</strong>.</td>
</tr>
<tr>
<td align="left"><strong>Warrants</strong></td>
<td align="left">Long-dated options.</td>
<td align="left">Traded <strong>Over-the-Counter</strong>.</td>
<td align="left">Multi-year corporate rights.</td>
</tr>
</tbody></table>
<hr>
<h2><strong>TOPIC: Commodity vs Financial Derivatives</strong></h2>
<ul>
<li><p><strong>Commodity Derivatives</strong> ➙ trade contracts where the underlying asset is a <strong>physical commodity</strong> .</p>
</li>
<li><p><strong>Commodity Underlyings</strong> include <strong>agricultural products</strong> (wheat, cotton) or <strong>precious metals</strong> (gold, silver) .</p>
</li>
<li><p><strong>Financial Derivatives</strong> ➙ most contracts are <strong>cash settled</strong> rather than involving physical delivery .</p>
</li>
<li><p><strong>Physical Settlement</strong> in commodities creates a specific need for <strong>warehousing</strong> and storage facilities .</p>
</li>
<li><p><strong>Quality Variation</strong> ➙ the <strong>quality of the asset</strong> can vary in commodities but not in financial assets .</p>
</li>
</ul>
<table>
<thead>
<tr>
<th align="left"><strong>Aspect</strong></th>
<th align="left"><strong>Futures (Financial)</strong></th>
<th align="left"><strong>Commodity Derivatives</strong></th>
</tr>
</thead>
<tbody><tr>
<td align="left"><strong>Settlement</strong></td>
<td align="left">Mostly <strong>Cash Settled</strong>.</td>
<td align="left">Often <strong>Physical Settlement</strong>.</td>
</tr>
<tr>
<td align="left"><strong>Storage</strong></td>
<td align="left">Not required (intangible).</td>
<td align="left">Requires <strong>Warehousing</strong>.</td>
</tr>
<tr>
<td align="left"><strong>Quality</strong></td>
<td align="left">Uniform/Standardized.</td>
<td align="left"><strong>Quality can vary</strong> per contract.</td>
</tr>
</tbody></table>
<hr>
<h2><strong>TOPIC: Market Players &amp; Contract Mechanics</strong></h2>
<ul>
<li><p><strong>Hedgers</strong> ➙ use derivatives to <strong>eliminate risk</strong> associated with price uncertainty .</p>
</li>
<li><p><strong>Speculators</strong> ➙ take high risks to achieve <strong>high returns</strong> based on price predictions .</p>
</li>
<li><p><strong>Arbitrageurs</strong> ➙ profit from <strong>price differences</strong> of the same asset in different markets .</p>
</li>
<li><p><strong>Option Premium</strong> ➙ the <strong>upfront price</strong> paid by the buyer to the <strong>option writer</strong> .</p>
</li>
<li><p><strong>Standardization</strong> ➙ futures are <strong>standardized</strong> by the exchange for quantity and expiry .</p>
</li>
</ul>
<table>
<thead>
<tr>
<th align="left"><strong>Participant</strong></th>
<th align="left"><strong>Role / Objective</strong></th>
<th align="left"><strong>Example Behaviour</strong></th>
</tr>
</thead>
<tbody><tr>
<td align="left"><strong>Hedger</strong></td>
<td align="left">Risk reduction.</td>
<td align="left">Farmer locking in a sale price.</td>
</tr>
<tr>
<td align="left"><strong>Speculator</strong></td>
<td align="left">Profit from price moves.</td>
<td align="left">Buying futures expecting a rally.</td>
</tr>
<tr>
<td align="left"><strong>Arbitrageur</strong></td>
<td align="left">Risk-less profit.</td>
<td align="left">Buying in cash, selling in futures.</td>
</tr>
</tbody></table>
<hr>
<h2><strong>TOPIC: Exchanges &amp; Regulation</strong></h2>
<ul>
<li><p><strong>Commodity Exchange</strong> ➙ association/body corporate organizing <strong>futures trading</strong> in commodities .</p>
</li>
<li><p><strong>FCRA (1952)</strong> ➙ defines <strong>&quot;goods&quot;</strong> and regulates commodity <strong>forward contracts</strong> .</p>
</li>
<li><p><strong>NSE</strong> ➙ offers trading in futures and options for <strong>Nifty</strong>, <strong>CNX IT</strong>, and single stocks .</p>
</li>
<li><p><strong>Regulator</strong> ➙ derivatives in India are under the overall supervision of <strong>SEBI</strong> (and formerly FMC) .</p>
</li>
</ul>
<table>
<thead>
<tr>
<th align="left"><strong>Step</strong></th>
<th align="left"><strong>Action</strong></th>
<th align="left"><strong>Who</strong></th>
<th align="left"><strong>Why</strong></th>
</tr>
</thead>
<tbody><tr>
<td align="left"><strong>1. Registration</strong></td>
<td align="left">Register as a client.</td>
<td align="left">Investor/Broker</td>
<td align="left">To access the trading terminal.</td>
</tr>
<tr>
<td align="left"><strong>2. Margin</strong></td>
<td align="left">Deposit initial funds.</td>
<td align="left">Investor</td>
<td align="left">To guarantee contract performance.</td>
</tr>
<tr>
<td align="left"><strong>3. MTM</strong></td>
<td align="left"><strong>Marking-to-Market</strong>.</td>
<td align="left">Clearing Corp</td>
<td align="left">Daily profit/loss adjustment.</td>
</tr>
</tbody></table>
<hr>
<h2><strong>ONE-PAGE CHEAT-SHEET</strong></h2>
<table>
<thead>
<tr>
<th align="left"><strong>Term</strong></th>
<th align="left"><strong>Key Characteristic</strong></th>
<th align="left"><strong>Syllabus Context</strong></th>
</tr>
</thead>
<tbody><tr>
<td align="left"><strong>Derivative</strong></td>
<td align="left">Value derived from underlying.</td>
<td align="left">Meaning .</td>
</tr>
<tr>
<td align="left"><strong>Forward</strong></td>
<td align="left"><strong>Customized</strong> / Two-party.</td>
<td align="left">Type .</td>
</tr>
<tr>
<td align="left"><strong>Future</strong></td>
<td align="left"><strong>Standardized</strong> / Exchange.</td>
<td align="left">Type .</td>
</tr>
<tr>
<td align="left"><strong>Call Option</strong></td>
<td align="left">Right to <strong>Buy</strong>.</td>
<td align="left">Mechanics .</td>
</tr>
<tr>
<td align="left"><strong>Put Option</strong></td>
<td align="left">Right to <strong>Sell</strong>.</td>
<td align="left">Mechanics .</td>
</tr>
<tr>
<td align="left"><strong>Premium</strong></td>
<td align="left"><strong>Upfront fee</strong> paid by buyer.</td>
<td align="left">Mechanics .</td>
</tr>
<tr>
<td align="left"><strong>Commodity</strong></td>
<td align="left">Bulky / <strong>Warehouse</strong> needed.</td>
<td align="left">Comparison .</td>
</tr>
<tr>
<td align="left"><strong>Hedger</strong></td>
<td align="left"><strong>Eliminate price risk</strong>.</td>
<td align="left">Player .</td>
</tr>
</tbody></table>
<h1>DEPOSITORY</h1>
<h3>Session 1: Fundamentals of the Depository System</h3>
<ul>
<li><p>A <strong>depository</strong> is <strong>like a bank</strong> where <strong>securities</strong> such as <strong>shares, bonds, and mutual fund units</strong> are <strong>held in electronic form</strong> .</p>
</li>
<li><p>It facilitates <strong>transfers of ownership</strong> without the need to <strong>handle physical securities</strong> and ensures the <strong>safekeeping of shares</strong> .</p>
</li>
<li><p>In India, there are <strong>two depositories</strong> that provide these services: <strong>NSDL</strong> (National Securities Depository Limited) and <strong>CDSL</strong> (Central Depository Services (India) Limited) .</p>
</li>
<li><p>The <strong>Depository provides its services</strong> to investors through <strong>agents</strong> known as <strong>Depository Participants (DPs)</strong> .</p>
</li>
<li><p><strong>DPs</strong> must be <strong>approved by SEBI</strong> and typically include <strong>Banks, Financial Institutions</strong>, and <strong>SEBI registered trading members</strong> .</p>
</li>
</ul>
<table>
<thead>
<tr>
<th align="left">Topic</th>
<th align="left">Detailed Summary</th>
<th align="left">Technical Details &amp; Institutional Roles</th>
</tr>
</thead>
<tbody><tr>
<td align="left"><strong>Bank vs. Depository</strong></td>
<td align="left">Both systems are <strong>analogous</strong> as they involve <strong>safekeeping</strong> and <strong>account-based transfers</strong> of assets .</td>
<td align="left"><strong>Bank:</strong> Holds <strong>funds</strong>; <strong>Depository:</strong> Holds <strong>securities</strong> .</td>
</tr>
<tr>
<td align="left"><strong>DP Selection</strong></td>
<td align="left">Investors must <strong>open an account</strong> with a <strong>DP</strong> to access <strong>depository services</strong> .</td>
<td align="left"><strong>Eligibility:</strong> Only <strong>regulated entities</strong> like banks or <strong>registered brokers</strong> can become DPs .</td>
</tr>
<tr>
<td align="left"><strong>Asset Diversity</strong></td>
<td align="left">A <strong>single demat account</strong> is sufficient to hold <strong>diverse financial instruments</strong> .</td>
<td align="left"><strong>Includes:</strong> Equity, <strong>debt</strong>, <strong>mutual fund units</strong>, and <strong>Government securities</strong> .</td>
</tr>
</tbody></table>
<h3>Session 2: Identification and Custodial Services</h3>
<ul>
<li><p>Every <strong>security</strong> in the depository system is assigned an <strong>ISIN</strong> (International Securities Identification Number), which is a <strong>unique identification number</strong> .</p>
</li>
<li><p>A <strong>Custodian</strong> is an <strong>organization</strong> that helps <strong>register and safeguard</strong> the <strong>securities of its clients</strong> .</p>
</li>
<li><p>Beyond safekeeping, a <strong>custodian tracks corporate actions</strong>, <strong>maintains securities accounts</strong>, and <strong>collects rights or benefits</strong> accruing to the client .</p>
</li>
<li><p><strong>Custodians</strong> keep clients <strong>informed of actions</strong> taken by <strong>issuers</strong> that have a <strong>bearing on their benefits</strong> .</p>
</li>
</ul>
<table>
<thead>
<tr>
<th align="left">Topic</th>
<th align="left">Detailed Summary</th>
<th align="left">Technical Indicators &amp; Functions</th>
</tr>
</thead>
<tbody><tr>
<td align="left"><strong>ISIN</strong></td>
<td align="left">A <strong>global standard</strong> used to <strong>uniquely identify</strong> a specific <strong>security issue</strong> .</td>
<td align="left"><strong>Usage:</strong> Essential for <strong>accurate tracking</strong> and <strong>electronic settlement</strong> .</td>
</tr>
<tr>
<td align="left"><strong>Custodial Role</strong></td>
<td align="left">Acts as a <strong>professional manager</strong> for <strong>institutional or large investors&#39;</strong> portfolios .</td>
<td align="left"><strong>Functions:</strong> Record keeping, <strong>income collection</strong>, and <strong>corporate action tracking</strong> .</td>
</tr>
</tbody></table>
<h3>Session 3: Dematerialization and Rematerialization</h3>
<ul>
<li><p><strong>Dematerialization</strong> (Demat) is the <strong>process</strong> by which <strong>physical certificates</strong> are <strong>converted into electronic form</strong> .</p>
</li>
<li><p>To <strong>dematerialize</strong>, an investor fills a <strong>Demat Request Form (DRF)</strong> and submits it to the <strong>DP</strong> along with the <strong>physical certificates</strong> .</p>
</li>
<li><p>A <strong>separate DRF</strong> must be filled for <strong>each unique ISIN</strong> number .</p>
</li>
<li><p><strong>Odd lot shares</strong> can also be <strong>converted to electronic form</strong> through this process .</p>
</li>
<li><p><strong>Dematerialized shares</strong> are <strong>fungible</strong>, meaning they have <strong>no distinctive numbers</strong> and are <strong>identical and interchangeable</strong> .</p>
</li>
<li><p><strong>Rematerialization</strong> (Remat) is the <strong>reverse process</strong> where <strong>electronic balances</strong> are <strong>converted back</strong> into <strong>physical certificates</strong> .</p>
</li>
<li><p>To <strong>rematerialize</strong>, the investor submits a <strong>Remat Request Form (RRF)</strong> to their <strong>DP</strong> .</p>
</li>
</ul>
<table>
<thead>
<tr>
<th align="left">Procedure</th>
<th align="left">Detailed Summary</th>
<th align="left">Technical Documentation &amp; Forms</th>
</tr>
</thead>
<tbody><tr>
<td align="left"><strong>Demat (DRF)</strong></td>
<td align="left">Converts <strong>paper assets</strong> to <strong>digital entries</strong> in a <strong>securities account</strong> .</td>
<td align="left"><strong>Requirement:</strong> Physical certificates must be <strong>surrendered</strong> for cancellation .</td>
</tr>
<tr>
<td align="left"><strong>Rematerialisation (RRF)</strong></td>
<td align="left">Allows investors to <strong>exit the electronic system</strong> and hold <strong>paper certificates</strong> again .</td>
<td align="left"><strong>Process:</strong> <strong>Balances are deducted</strong> from the electronic account upon issuance of paper .</td>
</tr>
<tr>
<td align="left"><strong>Fungibility</strong></td>
<td align="left">Ensures that <strong>any unit</strong> of a security is <strong>equivalent</strong> to any other unit of the <strong>same class</strong> .</td>
<td align="left"><strong>Benefit:</strong> Facilitates <strong>rapid trading</strong> and <strong>settlement</strong> without tracking specific serial numbers .</td>
</tr>
</tbody></table>
<h3>Session 4: Benefits and Account Management</h3>
<ul>
<li><p>Participation in a <strong>depository</strong> allows for the <strong>immediate transfer of securities</strong> and <strong>eliminates stamp duty</strong> on transfers .</p>
</li>
<li><p>It <strong>eliminates risks</strong> associated with <strong>physical certificates</strong>, such as <strong>bad delivery, fake securities, theft, or forgery</strong> .</p>
</li>
<li><p>The system <strong>reduces paperwork</strong> and <strong>transaction costs</strong> for both <strong>investors and issuers</strong> .</p>
</li>
<li><p><strong>Corporate benefits</strong> like <strong>bonuses or split shares</strong> are <strong>credited automatically</strong> to the <strong>demat account</strong> .</p>
</li>
<li><p><strong>Address changes</strong> recorded with the <strong>DP</strong> are <strong>registered electronically</strong> with <strong>all companies</strong> where the investor holds shares, <strong>eliminating separate correspondence</strong> .</p>
</li>
<li><p>There is <strong>no minimum balance</strong> requirement for a <strong>demat account</strong>; investors can maintain a <strong>zero balance</strong> .</p>
</li>
<li><p><strong>Investors</strong> can use an <strong>easy nomination facility</strong> to manage <strong>transmission of securities</strong> upon death .</p>
</li>
</ul>
<table>
<thead>
<tr>
<th align="left">Concept</th>
<th align="left">Detailed Summary</th>
<th align="left">Administrative Technicalities</th>
</tr>
</thead>
<tbody><tr>
<td align="left"><strong>Efficiency Benefits</strong></td>
<td align="left">Dramatic <strong>reduction in settlement time</strong> and <strong>elimination of physical risks</strong> .</td>
<td align="left"><strong>Stamp Duty:</strong> Fully <strong>exempt</strong> for <strong>electronic transfers</strong> .</td>
</tr>
<tr>
<td align="left"><strong>Account Maintenance</strong></td>
<td align="left"><strong>Flexible management</strong> with <strong>zero balance</strong> options and <strong>consolidated tracking</strong> .</td>
<td align="left"><strong>Updates:</strong> <strong>One-time update</strong> with DP propagates to <strong>all linked companies</strong> .</td>
</tr>
<tr>
<td align="left"><strong>Corporate Benefits</strong></td>
<td align="left"><strong>Entitlements</strong> are determined based on the <strong>Record Date</strong> using <strong>electronic records</strong> .</td>
<td align="left"><strong>Mechanism:</strong> Credits for <strong>bonus/rights</strong> are done <strong>directly</strong> by the depository .</td>
</tr>
</tbody></table>
<h1>MUTUAL FUNDS</h1>
<h3>Session 1: Fundamentals and Regulatory Framework</h3>
<ul>
<li><p>A <strong>Mutual Fund</strong> is a <strong>body corporate</strong> registered with <strong>SEBI</strong> that <strong>pools money</strong> from investors .</p>
</li>
<li><p>It acts as a <strong>financial intermediary</strong> collecting funds from the <strong>public</strong> to <strong>invest on their behalf</strong> in various securities .</p>
</li>
<li><p>Funds are <strong>invested</strong> according to <strong>stated objectives</strong> in assets like <strong>equity</strong>, <strong>bonds</strong>, <strong>debentures</strong>, and <strong>government securities</strong> .</p>
</li>
<li><p>The <strong>Securities Exchange Board of India (SEBI)</strong> is the <strong>regulatory body</strong> for all mutual funds .</p>
</li>
</ul>
<table>
<thead>
<tr>
<th align="left">Topic</th>
<th align="left">Detailed Summary</th>
<th align="left">Technical Details &amp; Formulas</th>
</tr>
</thead>
<tbody><tr>
<td align="left"><strong>Net Asset Value (NAV)</strong></td>
<td align="left"><strong>NAV</strong> represents the <strong>market value</strong> of a single unit of a scheme .</td>
<td align="left"><strong>Formula:</strong> $NAV = \frac{\text{Value of assets} - \text{Liabilities}}{\text{Number of units issued}}$ .</td>
</tr>
<tr>
<td align="left"><strong>Transparency &amp; Publishing</strong></td>
<td align="left">Mutual funds must <strong>regularly provide info</strong> on <strong>investment value</strong> and <strong>portfolio disclosure</strong> .</td>
<td align="left"><strong>Disclosure:</strong> <strong>Open-ended</strong> funds publish NAV <strong>daily</strong>; <strong>Close-ended</strong> publish <strong>weekly</strong> .</td>
</tr>
</tbody></table>
<h3>Session 2: Benefits and Risk Factors</h3>
<ul>
<li><p>Investors benefit from <strong>small investment amounts</strong> allowing them to access a <strong>spread portfolio</strong> .</p>
</li>
<li><p><strong>Professional Fund Management</strong> ensures that experts <strong>analyze markets</strong> and <strong>economic factors</strong> to pick opportunities .</p>
</li>
<li><p><strong>Diversification</strong> spreads risk across <strong>various companies and industries</strong> so the portfolio doesn&#39;t rely on one security .</p>
</li>
<li><p><strong>Mutual Funds</strong> do <strong>not provide assured returns</strong>; they are subject to <strong>market fluctuations</strong> .</p>
</li>
</ul>
<table>
<thead>
<tr>
<th align="left">Topic</th>
<th align="left">Detailed Summary</th>
<th align="left">Technical Risk Categories</th>
</tr>
</thead>
<tbody><tr>
<td align="left"><strong>Market &amp; Non-Market Risk</strong></td>
<td align="left"><strong>Market risk</strong> stems from <strong>overall economic factors</strong> affecting the whole market .</td>
<td align="left"><strong>Non-market risk:</strong> <strong>Company-specific</strong> bad news; can be <strong>reduced via diversification</strong> .</td>
</tr>
<tr>
<td align="left"><strong>Financial Risks</strong></td>
<td align="left"><strong>Interest rate risk</strong> causes <strong>bond prices</strong> to fall when <strong>interest rates rise</strong> .</td>
<td align="left"><strong>Credit Risk:</strong> The risk of a <strong>corporate defaulting</strong> on <strong>interest/principal</strong> payments .</td>
</tr>
</tbody></table>
<h3>Session 3: Classification of Mutual Fund Schemes</h3>
<ul>
<li><p><strong>Open-ended Funds</strong> have <strong>no fixed maturity</strong>, allowing <strong>subscription and redemption</strong> throughout the year at <strong>NAV-linked prices</strong> .</p>
</li>
<li><p><strong>Close-ended Funds</strong> are open for <strong>entry during IPO</strong> only and have a <strong>fixed redemption date</strong> .</p>
</li>
<li><p><strong>Equity/Growth Funds</strong> aim for <strong>capital appreciation</strong> over the <strong>medium to long term</strong> .</p>
</li>
<li><p><strong>Debt/Income Funds</strong> invest in <strong>fixed-income instruments</strong> for <strong>regular income</strong> and <strong>capital preservation</strong> .</p>
</li>
<li><p><strong>Liquid/Money Market Funds</strong> provide <strong>easy liquidity</strong> by investing in <strong>extremely short-term</strong> instruments .</p>
</li>
<li><p><strong>Balanced Funds</strong> invest in <strong>both equity and debt</strong> to provide <strong>steady returns</strong> with <strong>reduced volatility</strong> .</p>
</li>
<li><p><strong>Gilt Funds</strong> invest in <strong>Government securities</strong>, ensuring <strong>safety of principal</strong> and <strong>secured returns</strong> .</p>
</li>
</ul>
<table>
<thead>
<tr>
<th align="left">Topic</th>
<th align="left">Detailed Summary</th>
<th align="left">Technical Constraints &amp; Characteristics</th>
</tr>
</thead>
<tbody><tr>
<td align="left"><strong>Index Funds</strong></td>
<td align="left"><strong>Passive funds</strong> that <strong>replicate a market index</strong> like the <strong>Nifty 50</strong> .</td>
<td align="left"><strong>Objective:</strong> Aims to match <strong>market returns</strong> rather than <strong>beating the market</strong> .</td>
</tr>
<tr>
<td align="left"><strong>Close-ended Liquidity</strong></td>
<td align="left">These funds are usually <strong>listed on stock exchanges</strong> to provide an <strong>exit route</strong> before maturity .</td>
<td align="left"><strong>Pricing:</strong> Generally <strong>traded at a discount</strong> to NAV, which <strong>narrows as maturity nears</strong> .</td>
</tr>
</tbody></table>
<h3>Session 4: Fund Management and Investment Plans</h3>
<ul>
<li><p><strong>Active Fund Management</strong> involves a <strong>manager deciding</strong> which assets to buy/sell based on <strong>research and analysis</strong> .</p>
</li>
<li><p><strong>Growth Investing Style</strong> looks for companies with <strong>above-average earnings growth</strong> .</p>
</li>
<li><p><strong>Value Investing Style</strong> seeks <strong>undervalued companies</strong> whose <strong>worth</strong> will eventually be <strong>recognized by the market</strong> .</p>
</li>
<li><p><strong>Passive Fund Management</strong> follows an <strong>index-based style</strong>, simply <strong>mirroring a portfolio</strong> like the <strong>CNX Nifty</strong> .</p>
</li>
<li><p><strong>Exchange Traded Funds (ETFs)</strong> trade <strong>like stocks</strong> on an exchange with <strong>prices fluctuating</strong> throughout the day .</p>
</li>
</ul>
<table>
<thead>
<tr>
<th align="left">Topic</th>
<th align="left">Detailed Summary</th>
<th align="left">Technical Advantages &amp; Plans</th>
</tr>
</thead>
<tbody><tr>
<td align="left"><strong>Investment Plans</strong></td>
<td align="left"><strong>Growth Plan</strong> reinvests returns for <strong>capital appreciation</strong>; <strong>Dividend Plan</strong> distributes <strong>periodic income</strong> .</td>
<td align="left"><strong>Dividend Reinvestment:</strong> Dividends are used to <strong>purchase additional units</strong> for the investor .</td>
</tr>
<tr>
<td align="left"><strong>ETFs vs. Index Funds</strong></td>
<td align="left">Both offer <strong>diversification</strong>, but <strong>ETFs</strong> offer the <strong>flexibility of a stock</strong> (short selling, margin) .</td>
<td align="left"><strong>Cost:</strong> ETFs typically have <strong>lower expense ratios</strong> than average mutual funds .</td>
</tr>
</tbody></table>
<h3>Session 5: Procedures and Investor Rights</h3>
<ul>
<li><p>The <strong>Fund Offer Document (Prospectus)</strong> contains <strong>investment objectives</strong>, <strong>risk factors</strong>, and <strong>summary of expenses</strong> .</p>
</li>
<li><p>Investors must <strong>read the prospectus</strong> to understand <strong>tax provisions</strong> and the <strong>constitution of the fund</strong> .</p>
</li>
<li><p>Investors are <strong>entitled</strong> to receive <strong>unit certificates/statements</strong> within <strong>6 weeks</strong> .</p>
</li>
<li><p><strong>Redemption proceeds</strong> must be received within <strong>10 days</strong> from the <strong>date of redemption</strong> .</p>
</li>
<li><p><strong>75% of unit holders</strong> can pass a <strong>resolution to wind up</strong> a scheme or <strong>terminate the AMC</strong> .</p>
</li>
</ul>
<table>
<thead>
<tr>
<th align="left">Topic</th>
<th align="left">Detailed Summary</th>
<th align="left">Technical Timelines &amp; Grievances</th>
</tr>
</thead>
<tbody><tr>
<td align="left"><strong>Investor Protection</strong></td>
<td align="left"><strong>Trustees</strong> are bound to <strong>disclose information</strong> that may have an <strong>adverse bearing</strong> on investments .</td>
<td align="left"><strong>Grievance:</strong> Complaints can be sent to <strong>SEBI</strong>, who follows up with <strong>concerned Mutual Funds</strong> .</td>
</tr>
<tr>
<td align="left"><strong>Dividend Payout</strong></td>
<td align="left">Investors must <strong>receive dividends</strong> within <strong>30 days</strong> of their declaration .</td>
<td align="left"><strong>Entitlement:</strong> Rights include info on <strong>policies, general affairs</strong>, and <strong>financial position</strong> .</td>
</tr>
</tbody></table>
<h1>MISCELLANEOUS</h1>
<h3>Session 1: Corporate Actions</h3>
<ul>
<li><p><strong>Corporate actions</strong> are <strong>processes</strong> initiated by a <strong>company</strong> that bring <strong>actual change</strong> to its <strong>securities</strong> .</p>
</li>
<li><p>These <strong>actions</strong> are <strong>agreed upon</strong> by the <strong>Board of Directors</strong> and <strong>authorized by shareholders</strong> .</p>
</li>
<li><p><strong>Dividend</strong> is a <strong>source of income</strong> for <strong>shareholders</strong> representing the <strong>distribution of profits</strong> .</p>
</li>
<li><p><strong>Dividends</strong> are typically <strong>expressed</strong> on a <strong>&quot;per share&quot; basis</strong> and can be <strong>interim or final</strong> .</p>
</li>
<li><p><strong>Dividend yield</strong> shows the <strong>relationship</strong> between the <strong>current stock price</strong> and the <strong>dividend paid</strong> over <strong>12 months</strong> .</p>
</li>
<li><p><strong>Stock splits</strong> divide <strong>existing shares</strong> into <strong>smaller denominations</strong> to <strong>increase the number of shares</strong> .</p>
</li>
<li><p>A <strong>stock split</strong> does <strong>not change</strong> the total <strong>market capitalization</strong> or the <strong>value of holdings</strong> for an investor .</p>
</li>
<li><p><strong>Companies split stocks</strong> to make the <strong>share price</strong> more <strong>&quot;attractive&quot;</strong> to <strong>small investors</strong> and <strong>improve liquidity</strong> .</p>
</li>
<li><p><strong>Buyback of shares</strong> is a <strong>method</strong> for a <strong>company to invest in itself</strong> by <strong>purchasing shares</strong> from the <strong>open market</strong> .</p>
</li>
<li><p><strong>Buybacks</strong> are used to <strong>reduce outstanding shares</strong>, <strong>improve liquidity</strong>, and <strong>enhance shareholder wealth</strong> .</p>
</li>
</ul>
<table>
<thead>
<tr>
<th align="left">Topic</th>
<th align="left">Detailed Summary</th>
<th align="left">Technical Details &amp; Formulas</th>
</tr>
</thead>
<tbody><tr>
<td align="left"><strong>Dividend Yield</strong></td>
<td align="left">Measures the <strong>annual return</strong> an investor gets from <strong>dividends</strong> relative to the <strong>stock price</strong>.</td>
<td align="left"><strong>Formula:</strong> $\frac{\text{Aggregate past year&#39;s dividend}}{\text{Current stock price}}$ .</td>
</tr>
<tr>
<td align="left"><strong>Stock Split</strong></td>
<td align="left"><strong>Reduces face value</strong> (e.g., from Rs. 10 to Rs. 5) while <strong>increasing share quantity</strong> proportionally.</td>
<td align="left"><strong>New Price Calculation:</strong> $\frac{\text{Previous price}}{\text{Split ratio}}$ (e.g., 40 / 4 = 10 for 4-for-1) .</td>
</tr>
<tr>
<td align="left"><strong>Buyback Timelines</strong></td>
<td align="left">SEBI regulations stipulate <strong>strict time limits</strong> to ensure <strong>speedy completion</strong> of the process.</td>
<td align="left"><strong>Timelines:</strong> Offer open max <strong>30 days</strong>; Verification <strong>15 days</strong>; Payment <strong>7 days</strong>; Extinguishment <strong>7 days</strong> .</td>
</tr>
</tbody></table>
<h3>Session 2: Stock Market Index</h3>
<ul>
<li><p>An <strong>Index</strong> is a <strong>basket of securities</strong> that shows how a <strong>specified portfolio</strong> of <strong>prices</strong> is moving .</p>
</li>
<li><p>The <strong>average price movement</strong> of this basket acts as an <strong>indicator of market trends</strong> .</p>
</li>
<li><p><strong>CNX Nifty (Nifty)</strong> is a <strong>scientifically developed index</strong> consisting of <strong>50 large and liquid stocks</strong> .</p>
</li>
<li><p><strong>Nifty</strong> acts as the <strong>barometer</strong> of the <strong>Indian markets</strong> and reflects <strong>market movement</strong> accurately .</p>
</li>
<li><p>The <strong>Index</strong> is <strong>maintained</strong> by <strong>India Index Services &amp; Products Ltd. (IISL)</strong>, a group company of <strong>NSE</strong> .</p>
</li>
</ul>
<table>
<thead>
<tr>
<th align="left">Topic</th>
<th align="left">Detailed Summary</th>
<th align="left">Technical Features</th>
</tr>
</thead>
<tbody><tr>
<td align="left"><strong>Index Application</strong></td>
<td align="left">Used for <strong>benchmarking</strong>, <strong>derivative trading</strong>, and <strong>managing index-linked funds</strong>.</td>
<td align="left"><strong>Characteristics:</strong> Must be <strong>diversified</strong>, <strong>professionally managed</strong>, and <strong>highly liquid</strong> .</td>
</tr>
<tr>
<td align="left"><strong>Nifty Index</strong></td>
<td align="left">Represents the <strong>top 50 companies</strong> across <strong>different sectors</strong> traded on the <strong>NSE</strong>.</td>
<td align="left"><strong>Role:</strong> Provides a <strong>macro view</strong> of the economy and <strong>investment sentiment</strong> .</td>
</tr>
</tbody></table>
<h3>Session 3: Clearing, Settlement, and Redressal</h3>
<ul>
<li><p>A <strong>Clearing Corporation</strong> (like <strong>NSCCL</strong>) <strong>clears and settles</strong> all transactions and <strong>receives/delivers funds and shares</strong> .</p>
</li>
<li><p>It provides a <strong>financial guarantee</strong> for all <strong>executed transactions</strong> and manages <strong>counter-party risk</strong> .</p>
</li>
<li><p><strong>Rolling settlement</strong> means all <strong>open positions</strong> must result in <strong>payment or delivery</strong> on a <strong>T+2 basis</strong> .</p>
</li>
<li><p><strong>Pay-in day</strong> is when <strong>sellers deliver securities</strong> and <strong>buyers provide funds</strong> to the exchange .</p>
</li>
<li><p><strong>Pay-out day</strong> is when the <strong>exchange delivers securities</strong> to <strong>buyers</strong> and <strong>funds</strong> to <strong>sellers</strong> .</p>
</li>
<li><p>An <strong>Auction</strong> is conducted by the <strong>Exchange</strong> if a <strong>trading member fails to deliver</strong> securities on the <strong>pay-in day</strong> .</p>
</li>
<li><p><strong>Investor grievances</strong> can be lodged with the <strong>Investor Grievances Cell (IGC)</strong> of the <strong>Exchange</strong> .</p>
</li>
<li><p><strong>Arbitration</strong> is an <strong>alternative dispute resolution</strong> mechanism used when <strong>amicable settlement</strong> cannot be reached .</p>
</li>
<li><p>The <strong>Investor Protection Fund (IPF)</strong> compensates investors for <strong>claims</strong> arising from <strong>member defaults</strong> .</p>
</li>
</ul>
<table>
<thead>
<tr>
<th align="left">Topic</th>
<th align="left">Detailed Summary</th>
<th align="left">Technical Constraints &amp; Limits</th>
</tr>
</thead>
<tbody><tr>
<td align="left"><strong>Settlement Cycle</strong></td>
<td align="left">The <strong>T+2 system</strong> ensures that <strong>pay-in and pay-out</strong> occur on the <strong>2nd working day</strong> after the trade.</td>
<td align="left"><strong>Timeline:</strong> Trade Day (T) + <strong>two full working days</strong> .</td>
</tr>
<tr>
<td align="left"><strong>Auction Process</strong></td>
<td align="left">The <strong>Exchange buys</strong> required quantity from the <strong>auction market</strong> to ensure the <strong>purchaser receives securities</strong>.</td>
<td align="left"><strong>Reason:</strong> Triggered by <strong>non-delivery</strong> of securities by the <strong>selling member</strong> .</td>
</tr>
<tr>
<td align="left"><strong>IPF Claims</strong></td>
<td align="left">Protects investors against <strong>non-payment</strong> or <strong>non-receipt</strong> of securities from <strong>defaulted brokers</strong>.</td>
<td align="left"><strong>Limit:</strong> Maximum claim payable is <strong>Rs. 10 lakh</strong> .</td>
</tr>
</tbody></table>
<h3>Session 4: Post-Market Activity Scheduling</h3>
<ul>
<li><p><strong>Book closure</strong> is the <strong>closing of the register</strong> of <strong>names of investors</strong> in the records of a <strong>company</strong> .</p>
</li>
<li><p><strong>Record date</strong> is a <strong>date declared in advance</strong> by a company to <strong>determine eligibility</strong> for <strong>corporate benefits</strong> .</p>
</li>
<li><p>A <strong>no-delivery period</strong> is set by the <strong>Exchange</strong> during which <strong>trades are not settled</strong> to determine <strong>entitlements</strong> clearly .</p>
</li>
<li><p><strong>Ex-dividend date</strong> is the <strong>date on or after</strong> which a security <strong>trades without the dividend</strong> included in the price .</p>
</li>
<li><p>The <strong>Ex-date</strong> is the <strong>first day</strong> of the <strong>no-delivery period</strong>; buyers on/after this date <strong>miss benefits</strong> like bonus or rights .</p>
</li>
</ul>
<table>
<thead>
<tr>
<th align="left">Topic</th>
<th align="left">Detailed Summary</th>
<th align="left">Timeline Relationships</th>
</tr>
</thead>
<tbody><tr>
<td align="left"><strong>Benefit Eligibility</strong></td>
<td align="left">Investors must <strong>hold shares</strong> on the <strong>Record Date</strong> to receive <strong>dividends or bonus issues</strong>.</td>
<td align="left"><strong>Registration:</strong> Depositories handle this <strong>electronically</strong>; physical submission is <strong>not required</strong> .</td>
</tr>
<tr>
<td align="left"><strong>Ex-Dates</strong></td>
<td align="left">Marks the <strong>cutoff</strong> for a buyer to be <strong>entitled</strong> to <strong>recently declared benefits</strong>.</td>
<td align="left"><strong>Rule:</strong> Buying on or after the <strong>Ex-date</strong> means the <strong>seller retains the benefit</strong> .</td>
</tr>
</tbody></table>
<h3>Session 5: Exchange Traded Funds (ETFs)</h3>
<ul>
<li><p>An <strong>ETF</strong> is a <strong>mutual fund</strong> that <strong>trades like a stock</strong> on a <strong>stock exchange</strong> .</p>
</li>
<li><p>It represents a <strong>basket of stocks</strong> that <strong>reflect an index</strong> such as the <strong>Nifty</strong> .</p>
</li>
<li><p>Unlike mutual funds, <strong>ETF prices</strong> change <strong>throughout the day</strong> based on <strong>supply and demand</strong> .</p>
</li>
<li><p><strong>ETFs</strong> offer the <strong>diversification of an index fund</strong> combined with the <strong>flexibility of a stock</strong> .</p>
</li>
<li><p>Investors can <strong>short sell</strong>, buy on <strong>margin</strong>, and purchase as little as <strong>one share</strong> of an ETF .</p>
</li>
<li><p><strong>Expense ratios</strong> for <strong>ETFs</strong> are generally <strong>lower</strong> than those of <strong>average mutual funds</strong> .</p>
</li>
</ul>
<table>
<thead>
<tr>
<th align="left">Topic</th>
<th align="left">Detailed Summary</th>
<th align="left">Technical Comparison</th>
</tr>
</thead>
<tbody><tr>
<td align="left"><strong>ETF vs. Mutual Fund</strong></td>
<td align="left"><strong>MF prices</strong> are set at <strong>end-of-day NAV</strong>; <strong>ETF prices</strong> fluctuate <strong>intraday</strong> on the exchange.</td>
<td align="left"><strong>Commission:</strong> ETFs involve regular <strong>brokerage commissions</strong> like any stock trade .</td>
</tr>
<tr>
<td align="left"><strong>Index Funds</strong></td>
<td align="left"><strong>Passively managed</strong> funds where <strong>investments match</strong> a <strong>select market index</strong>.</td>
<td align="left"><strong>Advantage:</strong> Low <strong>portfolio turnover</strong> leads to <strong>lower management costs</strong> .</td>
</tr>
</tbody></table>
<h1>concept analysis</h1>
<h2><strong>TOPIC: Time Value of Money - Simple Interest</strong></h2>
<ul>
<li><p><strong>Simple Interest</strong> ➙ interest paid only on the <strong>original principal amount</strong> borrowed or invested. </p>
</li>
<li><p><strong>Simple Interest</strong> calculation requires three components: <strong>principal</strong>, <strong>interest rate</strong>, and <strong>time</strong> duration. </p>
</li>
<li><p><strong>Simple Interest</strong> does not account for interest earned on previous interest periods. </p>
</li>
<li><p><strong>Simple Interest</strong> ➙ formula uses <strong>decimal forms</strong> for percentage rates in mathematical calculations.</p>
</li>
</ul>
<table>
<thead>
<tr>
<th align="left"><strong>Formula</strong></th>
<th align="left"><strong>Variables</strong></th>
<th align="left"><strong>Interpretation</strong></th>
<th align="left"><strong>PYQ relevance</strong></th>
</tr>
</thead>
<tbody><tr>
<td align="left"><strong>I = Prt</strong></td>
<td align="left">I=Interest, P=Principal, r=Rate, t=Time</td>
<td align="left">Measures total interest earned over a specific period.</td>
<td align="left">High (Basic Concept)</td>
</tr>
</tbody></table>
<p><strong>Worked Example (Based on NCERT data ):</strong></p>
<ul>
<li><p><strong>Case</strong>: One-year investment of ₹10,000 at 5% simple interest.</p>
</li>
<li><p><strong>Calculation</strong>: $I = 10,000 \times 0.05 \times 1 = ₹500$. Total = ₹10,500.</p>
</li>
<li><p><strong>Interpretation</strong>: The investment grows by exactly the fixed rate of the initial principal.</p>
</li>
</ul>
<hr>
<h2><strong>TOPIC: Concept of Compounding</strong></h2>
<ul>
<li><p><strong>Compounding</strong> ➙ earning interest on both <strong>original principal</strong> and <strong>accumulated interest</strong> from prior periods. , </p>
</li>
<li><p><strong>Compound Interest</strong> ➙ enables wealth growth at an <strong>accelerating rate</strong> compared to simple interest. </p>
</li>
<li><p><strong>Compounding</strong> ➙ the process of determining the <strong>future value</strong> of a current investment. </p>
</li>
<li><p><strong>Compounding</strong> ➙ interest is added back to principal at the end of each period.</p>
</li>
</ul>
<table>
<thead>
<tr>
<th align="left"><strong>Concept</strong></th>
<th align="left"><strong>Definition</strong></th>
<th align="left"><strong>When used / Example</strong></th>
</tr>
</thead>
<tbody><tr>
<td align="left"><strong>Compounding</strong></td>
<td align="left">Earning &quot;interest on interest&quot; over multiple time periods.</td>
<td align="left">Multi-year FD or reinvested stock dividends.</td>
</tr>
</tbody></table>
<p><strong>Worked Example (Compounding Logic ):</strong></p>
<ul>
<li><p><strong>Year 1</strong>: Earn interest on original capital.</p>
</li>
<li><p><strong>Year 2</strong>: Earn interest on (Capital + Year 1 Interest).</p>
</li>
<li><p><strong>Interpretation</strong>: The base for interest calculation grows every year.</p>
</li>
</ul>
<hr>
<h2><strong>TOPIC: Effective Annual Return</strong></h2>
<ul>
<li><p><strong>Effective Annual Return</strong> accounts for the effect of <strong>compounding</strong> within a single year. </p>
</li>
<li><p><strong>Effective Annual Return</strong> ➙ usually higher than the stated <strong>nominal annual interest rate</strong>. </p>
</li>
<li><p><strong>Compounding Frequency</strong> ➙ higher frequency (quarterly vs annual) increases the <strong>effective annual return</strong>.</p>
</li>
</ul>
<table>
<thead>
<tr>
<th align="left"><strong>Case</strong></th>
<th align="left"><strong>Given Data</strong></th>
<th align="left"><strong>Calculation Summary</strong></th>
<th align="left"><strong>Interpretation</strong></th>
</tr>
</thead>
<tbody><tr>
<td align="left"><strong>Nominal vs Effective</strong></td>
<td align="left">10% Nominal Rate</td>
<td align="left">Effective = 10.38% (if compounded)</td>
<td align="left">Compounding makes the real return higher than stated.</td>
</tr>
</tbody></table>
<hr>
<h2><strong>TOPIC: Systematic Company Analysis</strong></h2>
<ul>
<li><p><strong>Systematic Analysis</strong> involves three layers: <strong>Industry Analysis</strong>, <strong>Corporate Analysis</strong>, and <strong>Financial Analysis</strong>. </p>
</li>
<li><p><strong>Industry Analysis</strong> ➙ examines how specific sectors are faring under current <strong>Government policy</strong>. </p>
</li>
<li><p><strong>Industry Analysis</strong> ➙ considers future demand for products within a <strong>sector/industry</strong> (e.g., Power sector). </p>
</li>
<li><p><strong>Corporate Analysis</strong> ➙ evaluates <strong>managerial capabilities</strong>, growth plans, and performance against <strong>competitors</strong>. </p>
</li>
<li><p><strong>Financial Analysis</strong> ➙ uses key parameters like <strong>EPS</strong> and <strong>P/E ratio</strong> to estimate value. </p>
</li>
<li><p><strong>Financial Analysis</strong> ➙ requires a deep understanding of the <strong>Balance Sheet</strong> and <strong>P&amp;L Account</strong>.</p>
</li>
</ul>
<table>
<thead>
<tr>
<th align="left"><strong>Step</strong></th>
<th align="left"><strong>Action</strong></th>
<th align="left"><strong>Why / Interpretation</strong></th>
</tr>
</thead>
<tbody><tr>
<td align="left"><strong>1. Industry</strong></td>
<td align="left">Check sector trends (e.g., NHPC, NTPC).</td>
<td align="left">Determine if the environment is favorable for growth.</td>
</tr>
<tr>
<td align="left"><strong>2. Corporate</strong></td>
<td align="left">Evaluate management and growth plans.</td>
<td align="left">Assess if the company has a competitive edge.</td>
</tr>
<tr>
<td align="left"><strong>3. Financial</strong></td>
<td align="left">Analyze EPS and financial statements.</td>
<td align="left">Determine if the stock price is a &quot;good buy.&quot;</td>
</tr>
</tbody></table>
<hr>
<h2><strong>TOPIC: The Balance Sheet (Position Statement)</strong></h2>
<ul>
<li><p><strong>Balance Sheet</strong> ➙ a record showing <strong>sources of funds</strong> and their <strong>application</strong> for building assets. </p>
</li>
<li><p><strong>Balance Sheet</strong> ➙ drawn on a <strong>specific date</strong> (e.g., 31st March) to show a static position. </p>
</li>
<li><p><strong>Sources of Funds</strong> ➙ include <strong>Shareholders’ Funds</strong> (Capital + Reserves) and <strong>Loan Funds</strong>. , </p>
</li>
<li><p><strong>Application of Funds</strong> ➙ includes <strong>Fixed Assets</strong>, <strong>Investments</strong>, and <strong>Net Current Assets</strong>. , </p>
</li>
<li><p><strong>Fixed Assets</strong> ➙ long-term assets like plant and machinery, adjusted for <strong>depreciation</strong>. </p>
</li>
<li><p><strong>Net Current Assets</strong> ➙ calculated by subtracting <strong>Current Liabilities</strong> from <strong>Current Assets</strong>.</p>
</li>
</ul>
<table>
<thead>
<tr>
<th align="left"><strong>Concept</strong></th>
<th align="left"><strong>Definition</strong></th>
<th align="left"><strong>Example</strong></th>
</tr>
</thead>
<tbody><tr>
<td align="left"><strong>Sources of Funds</strong></td>
<td align="left">Where the money for business comes from.</td>
<td align="left">Share Capital, Secured Loans.</td>
</tr>
<tr>
<td align="left"><strong>Application of Funds</strong></td>
<td align="left">How the company uses its money.</td>
<td align="left">Fixed Assets (Machinery), Investments.</td>
</tr>
</tbody></table>
<h2><strong>TOPIC: Profit and Loss Account (Income Statement)</strong></h2>
<ul>
<li><p><strong>Profit and Loss Account</strong> ➙ most important document presented to <strong>shareholders</strong> regarding annual performance. </p>
</li>
<li><p><strong>Operational Management</strong> ➙ good if there is improvement in <strong>gross and net profits</strong> over time. </p>
</li>
<li><p><strong>Other Income</strong> ➙ must be checked carefully for potential <strong>manipulation</strong> or one-time gains. </p>
</li>
<li><p><strong>Interest Burden</strong> ➙ high debt-servicing costs can signal a <strong>red flag</strong> for future stability.</p>
</li>
</ul>
<table>
<thead>
<tr>
<th align="left"><strong>Component</strong></th>
<th align="left"><strong>Description</strong></th>
<th align="left"><strong>What it Shows</strong></th>
</tr>
</thead>
<tbody><tr>
<td align="left"><strong>Sales/Revenue</strong></td>
<td align="left">Total income from operations.</td>
<td align="left">Market reach and growth.</td>
</tr>
<tr>
<td align="left"><strong>Operating Profit</strong></td>
<td align="left">Profit before interest and tax.</td>
<td align="left">Core business efficiency.</td>
</tr>
<tr>
<td align="left"><strong>Net Profit</strong></td>
<td align="left">Final profit after all deductions.</td>
<td align="left">Returns available to shareholders.</td>
</tr>
</tbody></table>
<hr>
<h2><strong>TOPIC: Key Financial Metrics &amp; Ratios (Chapter 9 Context)</strong></h2>
<ul>
<li><p><strong>Earnings Per Share (EPS)</strong> ➙ measures the <strong>profitability</strong> of a company on a per-share basis. </p>
</li>
<li><p><strong>EPS Calculation</strong> ➙ annualized by multiplying half-yearly results by two. </p>
</li>
<li><p><strong>Depreciation</strong> ➙ assumption that fixed assets (except land) lose value due to <strong>usage</strong>. , </p>
</li>
<li><p><strong>Net Block</strong> ➙ the worth of fixed assets after subtracting <strong>accumulated depreciation</strong>.</p>
</li>
</ul>
<table>
<thead>
<tr>
<th align="left"><strong>Metric</strong></th>
<th align="left"><strong>Definition</strong></th>
<th align="left"><strong>Interpretation</strong></th>
</tr>
</thead>
<tbody><tr>
<td align="left"><strong>EPS</strong></td>
<td align="left">Net Profit divided by Total Shares.</td>
<td align="left">Higher EPS indicates better profitability for owners.</td>
</tr>
<tr>
<td align="left"><strong>Depreciation</strong></td>
<td align="left">Periodic fall in asset value.</td>
<td align="left">Reflects the cost of using fixed assets.</td>
</tr>
</tbody></table>
<p>—</p>
<h2><strong>ONE-PAGE CHEAT-SHEET</strong></h2>
<table>
<thead>
<tr>
<th align="left"><strong>Category</strong></th>
<th align="left"><strong>Key Term / Formula</strong></th>
<th align="left"><strong>Exam Interpretation</strong></th>
</tr>
</thead>
<tbody><tr>
<td align="left"><strong>Analysis Modes</strong></td>
<td align="left"><strong>Industry $\rightarrow$ Corporate $\rightarrow$ Financial</strong></td>
<td align="left">Systematic order of analyzing a company.</td>
</tr>
<tr>
<td align="left"><strong>Time Value</strong></td>
<td align="left"><strong>I = Prt</strong> (Simple Interest)</td>
<td align="left">Money today &gt; Money tomorrow.</td>
</tr>
<tr>
<td align="left"><strong>Funds</strong></td>
<td align="left"><strong>Source vs Application</strong></td>
<td align="left">Equity/Loans (Source) vs Assets (Application).</td>
</tr>
<tr>
<td align="left"><strong>Statements</strong></td>
<td align="left"><strong>Balance Sheet vs P&amp;L</strong></td>
<td align="left">Position (Date) vs Performance (Period).</td>
</tr>
<tr>
<td align="left"><strong>Asset Value</strong></td>
<td align="left"><strong>Net Block = Gross Block - Dep.</strong></td>
<td align="left">Real value of machinery/buildings.</td>
</tr>
</tbody></table>
<p>—</p>
<h1>Ratio Analysis</h1>
<h2><strong>Meaning and Importance</strong></h2>
<ul>
<li><p><strong>Ratio analysis is a popular tool used to extract meaningful information from financial statements.</strong> → Properly analyzed statements provide insight into a firm&#39;s performance.</p>
</li>
<li><p>Simple statistics do not reveal the true financial position. → <strong>Ratios interpret the relationship between different financial figures</strong> to judge a firm&#39;s health.</p>
</li>
</ul>
<hr>
<h2><strong>Ratio Analysis Framework</strong></h2>
<table>
<thead>
<tr>
<th><strong>Ratio Name</strong></th>
<th><strong>Formula</strong></th>
<th><strong>Standard</strong></th>
<th><strong>Interpretation</strong></th>
<th><strong>Use</strong></th>
</tr>
</thead>
<tbody><tr>
<td><strong>Ratio</strong></td>
<td><strong>Relationship</strong></td>
<td><strong>Industry</strong></td>
<td><strong>Evaluates</strong></td>
<td><strong>Decision making for</strong></td>
</tr>
<tr>
<td><strong>Analysis</strong></td>
<td><strong>b/w 2 variables</strong></td>
<td><strong>dependent</strong></td>
<td><strong>performance trends</strong></td>
<td><strong>investors | lenders</strong></td>
</tr>
</tbody></table>
<hr>
<h2><strong>Classification of Ratios</strong></h2>
<p>Ratios are classified into 3 primary categories:</p>
<ul>
<li><p><strong>Liquidity measures</strong> - short-term survival</p>
</li>
<li><p><strong>Solvency measures</strong> - long-term strength</p>
</li>
<li><p><strong>Profitability measures</strong> - management efficiency</p>
</li>
</ul>
<hr>
<h2><strong>Liquidity Ratios</strong></h2>
<p><strong>Meaning:</strong> Measures the ability of a firm to meet its short-term financial obligations (less than one year).</p>
<p><strong>List of Ratio:</strong></p>
<ul>
<li><p>Current ratio</p>
</li>
<li><p>Acid-test ratio (Quick ratio)</p>
</li>
<li><p>Turnover ratios</p>
</li>
</ul>
<p><strong>Purpose:</strong> To check if the business has enough liquid assets to pay back immediate creditors.</p>
<p><strong>Business Decision:</strong> Supported decisions on short-term borrowing and credit purchases.</p>
<hr>
<h3><strong>Current Ratio</strong></h3>
<table>
<thead>
<tr>
<th><strong>Ratio Name</strong></th>
<th><strong>Formula</strong></th>
<th><strong>Standard</strong></th>
<th><strong>Interpretation</strong></th>
</tr>
</thead>
<tbody><tr>
<td><strong>Current ratio</strong></td>
<td>$\frac{\text{Current Assets}}{\text{Current Liabilities}}$</td>
<td>2:1</td>
<td><strong>Ability to meet liabilities from assets.</strong></td>
</tr>
</tbody></table>
<hr>
<h3><strong>Acid-test (Quick) Ratio</strong></h3>
<table>
<thead>
<tr>
<th><strong>Ratio Name</strong></th>
<th><strong>Formula</strong></th>
<th><strong>Standard</strong></th>
<th><strong>Interpretation</strong></th>
</tr>
</thead>
<tbody><tr>
<td><strong>Acid-test (Quick) ratio</strong></td>
<td>$\frac{\text{Quick Assets}}{\text{Current Liabilities}}$</td>
<td>1:1</td>
<td><strong>Ability to convert assets to cash immediately</strong></td>
</tr>
</tbody></table>
<hr>
<h2><strong>Turnover Ratios</strong></h2>
<p>Turnover ratios measure how quickly assets are converted into cash or how efficiently they are employed.</p>
<p><strong>Inventory Turnover Ratio</strong> tells the efficiency of inventory management → Higher ratio indicates efficient management.</p>
<p><strong>Debtors Turnover Ratio</strong> shows how many times accounts receivable turn over during the year. → Higher turnover indicates greater credit management efficiency.</p>
<hr>
<table>
<thead>
<tr>
<th><strong>Ratio Name</strong></th>
<th><strong>Formula</strong></th>
<th><strong>Standard</strong></th>
<th><strong>Interpretation</strong></th>
<th><strong>Use</strong></th>
</tr>
</thead>
<tbody><tr>
<td><strong>Inventory Turnover</strong></td>
<td>$\frac{\text{COGS}}{\text{Average Inventory}}$</td>
<td>High</td>
<td><strong>Speed of stock movement</strong></td>
<td><strong>Efficiency of block management</strong></td>
</tr>
<tr>
<td><strong>Debtors Turnover</strong></td>
<td>$\frac{\text{Net credit Sales}}{\text{Average Debtors}}$</td>
<td>High</td>
<td><strong>Credit management</strong></td>
<td><strong>Speed of collecting efficiency from debtors</strong></td>
</tr>
<tr>
<td><strong>Average Collection Period</strong></td>
<td>$\frac{365}{\text{Debtors Turnover}}$</td>
<td>Industry Norm</td>
<td><strong>Days credit owed in debtors</strong></td>
<td><strong>Monitoring credit policy</strong></td>
</tr>
<tr>
<td><strong>Fixed Assets Turnover</strong></td>
<td>$\frac{\text{Net Sales}}{\text{Net Fixed Assets}}$</td>
<td>High</td>
<td><strong>Sales per rupee of fixed asset</strong></td>
<td><strong>Efficiency of asset employment</strong></td>
</tr>
</tbody></table>
<hr>
<h2><strong>Solvency (Leverage) Ratios</strong></h2>
<p><strong>Meaning:</strong> Measures the long-term financial strength and the ability to pay interest and principal on time.</p>
<p><strong>List of Ratios:</strong></p>
<ul>
<li><p>Debt-equity ratio</p>
</li>
<li><p>Debt-asset ratio</p>
</li>
<li><p>Interest coverage ratio</p>
</li>
<li><p>DSCR</p>
</li>
</ul>
<hr>
<h3><strong>Debt-Equity Ratio</strong></h3>
<table>
<thead>
<tr>
<th><strong>Ratio Name</strong></th>
<th><strong>Formula</strong></th>
<th><strong>Standard</strong></th>
<th><strong>Interpretation</strong></th>
<th><strong>Use</strong></th>
</tr>
</thead>
<tbody><tr>
<td><strong>Debt-equity ratio</strong></td>
<td>$\frac{\text{Total debt}}{\text{Total Equity}}$</td>
<td>Industry Norm</td>
<td><strong>Creditor vs. owner contribution</strong></td>
<td><strong>Judge&#39;s leverage</strong></td>
</tr>
</tbody></table>
<hr>
<h3><strong>Debt-Asset Ratio</strong></h3>
<table>
<thead>
<tr>
<th><strong>Ratio Name</strong></th>
<th><strong>Formula</strong></th>
<th><strong>Standard</strong></th>
<th><strong>Interpretation</strong></th>
<th><strong>Use</strong></th>
</tr>
</thead>
<tbody><tr>
<td><strong>Debt-asset ratio</strong></td>
<td>$\frac{\text{Total Debt}}{\text{Total Assets}}$</td>
<td>N/o</td>
<td><strong>Percentage of assets financed by debt</strong></td>
<td><strong>Measures long-term solvency</strong></td>
</tr>
</tbody></table>
<hr>
<h3><strong>Interest Coverage Ratio</strong></h3>
<table>
<thead>
<tr>
<th><strong>Ratio Name</strong></th>
<th><strong>Formula</strong></th>
<th><strong>Standard</strong></th>
<th><strong>Interpretation</strong></th>
<th><strong>Use</strong></th>
</tr>
</thead>
<tbody><tr>
<td><strong>Interest Coverage Ratio</strong></td>
<td>$\frac{\text{EBIT}}{\text{Interest}}$</td>
<td>High</td>
<td><strong>Ability to meet interest burden</strong></td>
<td><strong>Used by lenders to assess capacity</strong></td>
</tr>
</tbody></table>
<hr>
<h3><strong>Debt Service Coverage Ratio (DSCR)</strong></h3>
<p><strong>Debt Service Coverage Ratio (DSCR)</strong> is a comprehensive measure of debt service capacity used by financial institutions.</p>
<hr>
<h2><strong>Profitability Ratios</strong></h2>
<p><strong>Meaning:</strong> Used to judge the profitability &amp; operating efficiency of management.</p>
<p><strong>List of Ratios:</strong></p>
<ul>
<li><p>Gross profit ratio</p>
</li>
<li><p>Net profit ratio</p>
</li>
<li><p>Return on Capital Employed (ROCE)</p>
</li>
<li><p>EPS</p>
</li>
</ul>
<p><strong>Purpose:</strong> To measure how much profit is generated per rupee of sale or investment.</p>
<p><strong>Business Decision:</strong> Supported decisions for dividend declaration and investment attractiveness.</p>
<hr>
<h3><strong>Gross Profit Ratio</strong></h3>
<table>
<thead>
<tr>
<th><strong>Ratio Name</strong></th>
<th><strong>Formula</strong></th>
<th><strong>Standard</strong></th>
<th><strong>Interpretation</strong></th>
<th><strong>Use</strong></th>
</tr>
</thead>
<tbody><tr>
<td><strong>Gross Profit ratio</strong></td>
<td>$\frac{\text{Gross Profit} \times 100}{\text{Net Sales}}$</td>
<td>High</td>
<td><strong>Basic trading efficiency</strong></td>
<td><strong>Operating condition analysis</strong></td>
</tr>
</tbody></table>
<hr>
<h3><strong>Net Profit Ratio</strong></h3>
<table>
<thead>
<tr>
<th><strong>Ratio Name</strong></th>
<th><strong>Formula</strong></th>
<th><strong>Standard</strong></th>
<th><strong>Interpretation</strong></th>
<th><strong>Use</strong></th>
</tr>
</thead>
<tbody><tr>
<td><strong>Net profit ratio</strong></td>
<td>$\frac{\text{Net Profit} \times 100}{\text{Net Sales}}$</td>
<td>High</td>
<td><strong>Overall margin efficiency</strong></td>
<td><strong>Overall profit analysis</strong></td>
</tr>
</tbody></table>
<hr>
<h2><strong>Return on Capital Employed (Market-Based Ratios)</strong></h2>
<table>
<thead>
<tr>
<th><strong>Ratio Name</strong></th>
<th><strong>Formula</strong></th>
<th><strong>Standard</strong></th>
<th><strong>Interpretation</strong></th>
<th><strong>Use</strong></th>
</tr>
</thead>
<tbody><tr>
<td><strong>Return on Capital Employed</strong></td>
<td>$\frac{\text{NPAT}}{\text{Total Capital Employed}}$</td>
<td>High</td>
<td><strong>Return on investment efficiency</strong></td>
<td><strong>Measure of total funds used</strong></td>
</tr>
<tr>
<td><strong>Earnings per share (EPS)</strong></td>
<td>$\frac{\text{NP of shareholders}}{\text{No. of shares}}$</td>
<td>—</td>
<td><strong>Profit per individual share</strong></td>
<td><strong>Individual share value</strong></td>
</tr>
<tr>
<td><strong>Price-Earnings (P/E) Ratio</strong></td>
<td>$\frac{\text{Market Price per Share}}{\text{EPS}}$</td>
<td>Market Norm</td>
<td><strong>Value of equity</strong></td>
<td><strong>Investment attractiveness</strong></td>
</tr>
</tbody></table>
<hr>
<h2><strong>Limitations of Ratio Analysis</strong></h2>
<table>
<thead>
<tr>
<th><strong>Limitations</strong></th>
<th><strong>Explanation</strong></th>
<th><strong>Impact on Analysis</strong></th>
</tr>
</thead>
<tbody><tr>
<td><strong>Historical Data</strong></td>
<td><strong>Ratios are based on past reports</strong></td>
<td>May not accurately predict future performance</td>
</tr>
<tr>
<td><strong>No Uniformity</strong></td>
<td>Ideal proportions vary across industries**</td>
<td><strong>cross-industry comparison is difficult.</strong></td>
</tr>
<tr>
<td><strong>Manipulation Scope</strong></td>
<td><strong>&quot;Other Income&quot; can be used to hide losses</strong></td>
<td><strong>Distorts the &quot;Net Profit&quot; picture.</strong></td>
</tr>
<tr>
<td><strong>Ignores Quality</strong></td>
<td><strong>Focuses only on numbers</strong></td>
<td><strong>Managerial capability is not measured by ratios</strong></td>
</tr>
</tbody></table>
<h1>COMMUNICATION SKILLS</h1>
<h3>Introduction to Communication</h3>
<ul>
<li>The word <strong>communication</strong> comes from the Latin word <em><strong>commūnicāre</strong></em>, which means <strong>&quot;to share&quot;</strong> .</li>
<li><strong>Effective communication</strong> is a vital <strong>life skill</strong> required to interact properly with <strong>people and customers</strong> .</li>
<li>The process is only <strong>complete</strong> when the <strong>receiver has understood</strong> the message in its <strong>entirety</strong> .</li>
<li><strong>Reading, writing, speaking, and listening</strong> are the four essential components for <strong>proper communication</strong> .</li>
</ul>
<h3>Session 1: Methods of Communication</h3>
<ul>
<li><strong>Transmitting</strong>, <strong>listening</strong>, and <strong>feedback</strong> are the three primary parts of the <strong>communication process</strong> .</li>
<li>The <strong>sender</strong> initiates the cycle by <strong>transmitting a message</strong> through a chosen <strong>medium</strong> .</li>
<li>The <strong>receiver</strong> completes the cycle by providing <strong>feedback</strong> to show their <strong>understanding</strong> .</li>
<li>Common <strong>methods</strong> include <strong>face-to-face</strong> interaction, <strong>e-mail</strong>, <strong>notices/posters</strong>, and <strong>business meetings</strong> .</li>
<li><strong>Choosing the right method</strong> depends on the <strong>target audience</strong>, <strong>costs</strong>, <strong>type of information</strong>, and <strong>urgency</strong> .</li>
</ul>
<table>
<thead>
<tr>
<th align="left">Element/Method</th>
<th align="left">Detailed Summary</th>
<th align="left">Technical Details / Factors</th>
</tr>
</thead>
<tbody><tr>
<td align="left"><strong>Communication Cycle</strong></td>
<td align="left">Includes <strong>Sender</strong> (source), <strong>Message</strong> (info), <strong>Channel</strong> (medium), <strong>Receiver</strong> (target), and <strong>Feedback</strong> (response) .</td>
<td align="left">The cycle is <strong>broken</strong> if <strong>feedback</strong> is not received or the message is <strong>misunderstood</strong> .</td>
</tr>
<tr>
<td align="left"><strong>Face-to-Face</strong></td>
<td align="left">The <strong>most effective</strong> method as it allows for <strong>immediate feedback</strong> and observation of <strong>body language</strong> .</td>
<td align="left">Best for <strong>informal communication</strong> and building <strong>rapport</strong> .</td>
</tr>
<tr>
<td align="left"><strong>Written Media</strong></td>
<td align="left">Includes <strong>e-mail</strong>, <strong>SMS</strong>, and <strong>notices</strong> for reaching <strong>individuals or large groups</strong> .</td>
<td align="left"><strong>E-mail</strong> provides <strong>flexibility and low-cost</strong>; <strong>Posters</strong> are for <strong>mass messaging</strong> where email fails .</td>
</tr>
</tbody></table>
<h3>Session 2: Verbal Communication</h3>
<ul>
<li><strong>Verbal communication</strong> utilizes <strong>sounds, words, language, and speech</strong> to express <strong>emotions and ideas</strong> .</li>
<li><strong>Interpersonal communication</strong> is a <strong>one-on-one</strong> conversation that can be <strong>formal or informal</strong> .</li>
<li><strong>Written communication</strong> involves <strong>writing words</strong> via <strong>letters, reports, or social media chats</strong> .</li>
<li><strong>Small group communication</strong> occurs when <strong>more than two people</strong> interact, such as in <strong>board meetings</strong> .</li>
<li><strong>Public communication</strong> involves <strong>one individual</strong> addressing a <strong>large gathering</strong>, like <strong>election campaigns</strong> .</li>
</ul>
<table>
<thead>
<tr>
<th align="left">Topic</th>
<th align="left">Detailed Summary</th>
<th align="left">Mastering Verbal Skills</th>
</tr>
</thead>
<tbody><tr>
<td align="left"><strong>Advantages</strong></td>
<td align="left">An <strong>easy mode</strong> allowing for the <strong>quick exchange of ideas</strong> and immediate <strong>responses</strong> .</td>
<td align="left"><strong>Think before you speak</strong>; note down points to be <strong>effective</strong> .</td>
</tr>
<tr>
<td align="left"><strong>Disadvantages</strong></td>
<td align="left">Can be <strong>confusing</strong> if the <strong>wrong words</strong> are used or if the <strong>meaning is unclear</strong> .</td>
<td align="left">Use <strong>concise and clear</strong> language; avoid <strong>repeating sentences</strong> .</td>
</tr>
<tr>
<td align="left"><strong>Confidence</strong></td>
<td align="left">Essential for <strong>speaking in front of groups</strong> or <strong>supervisors</strong> .</td>
<td align="left">Maintain <strong>eye contact</strong>, stand <strong>straight</strong>, and be <strong>friendly</strong> .</td>
</tr>
</tbody></table>
<h3>Session 3: Non-verbal Communication</h3>
<ul>
<li><strong>Non-verbal communication</strong> is the exchange of information <strong>without spoken or written words</strong> .</li>
<li>Approximately <strong>93% of all communication</strong> is <strong>non-verbal</strong> (55% body language + 38% voice tone) .</li>
<li><strong>Gestures</strong> include <strong>body movements</strong> like <strong>pointing</strong> or <strong>handshakes</strong> to express meaning .</li>
<li><strong>Expressions</strong> using the <strong>face</strong> can communicate <strong>happiness, sadness, or anger</strong> .</li>
<li><strong>Postures</strong> show <strong>confidence</strong> (straight body) or <strong>weakness</strong> (slumped body) .</li>
<li><strong>Paralanguage</strong> refers to <strong>how we speak</strong>, including <strong>tone, speed, and volume</strong> .</li>
<li><strong>Visual communication</strong> uses <strong>images or signs</strong> and is <strong>consistent</strong> regardless of <strong>language barriers</strong> .</li>
</ul>
<table>
<thead>
<tr>
<th align="left">Non-verbal Type</th>
<th align="left">Detailed Summary</th>
<th align="left">Professional Use/Dos and Don&#39;ts</th>
</tr>
</thead>
<tbody><tr>
<td align="left"><strong>Body Language</strong></td>
<td align="left">Includes <strong>postures and gestures</strong> that communicate <strong>attitudes and feelings</strong> .</td>
<td align="left"><strong>Sit straight</strong>, keep <strong>hands by sides</strong>, and <strong>tilt head</strong> to show attentiveness .</td>
</tr>
<tr>
<td align="left"><strong>Space &amp; Touch</strong></td>
<td align="left"><strong>Space</strong> is the <strong>physical distance</strong> maintained based on <strong>intimacy</strong>; <strong>Touch</strong> can show <strong>confidence</strong> .</td>
<td align="left">Use a <strong>firm handshake</strong>; avoid <strong>unprofessional touch</strong> in formal settings .</td>
</tr>
<tr>
<td align="left"><strong>Visual Signs</strong></td>
<td align="left"><strong>Exchanging information</strong> through images like <strong>&quot;No Parking&quot;</strong> or <strong>&quot;Danger&quot;</strong> .</td>
<td align="left"><strong>Effective</strong> because it does not require <strong>language knowledge</strong> .</td>
</tr>
</tbody></table>
<h3>Session 4: Communication Cycle and Importance of Feedback</h3>
<ul>
<li><strong>Feedback</strong> is the <strong>final component</strong> of the communication cycle and validates <strong>effective listening</strong> .</li>
<li><strong>Positive feedback</strong> reinforces <strong>strengths</strong> and <strong>dedication</strong> (e.g., &quot;Great job!&quot;) .</li>
<li><strong>Negative feedback</strong> identifies <strong>areas for improvement</strong> (e.g., &quot;You take too long to reply&quot;) .</li>
<li><strong>No feedback</strong> is also a form of response that may indicate <strong>disagreement</strong> .</li>
</ul>
<table>
<thead>
<tr>
<th align="left">Feedback Quality</th>
<th align="left">Detailed Summary</th>
<th align="left">Long-term Impact</th>
</tr>
</thead>
<tbody><tr>
<td align="left"><strong>Specific</strong></td>
<td align="left">Avoid <strong>general comments</strong>; provide <strong>examples and alternatives</strong> .</td>
<td align="left">Helps the recipient <strong>rectify errors</strong> and <strong>achieve goals</strong> .</td>
</tr>
<tr>
<td align="left"><strong>Timely</strong></td>
<td align="left">Feedback should be <strong>prompt</strong> to maintain its <strong>impact</strong> .</td>
<td align="left"><strong>Motivates</strong> people to build better <strong>work relationships</strong> .</td>
</tr>
<tr>
<td align="left"><strong>Polite</strong></td>
<td align="left">Language should be <strong>respectful</strong> so the receiver is <strong>not offended</strong> .</td>
<td align="left">Improves <strong>performance</strong> and aids in <strong>decision-making</strong> .</td>
</tr>
</tbody></table>
<h3>Session 5: Barriers to Effective Communication</h3>
<ul>
<li><strong>Effective communication</strong> must follow the <strong>7 Cs</strong>: <strong>Clear, Concise, Concrete, Correct, Coherent, Complete, and Courteous</strong> .</li>
<li><strong>Physical barriers</strong> involve <strong>environmental conditions</strong> like <strong>not being able to see gestures</strong> .</li>
<li><strong>Linguistic barriers</strong> are caused by <strong>slang, jargon, or regional colloquialisms</strong> .</li>
<li><strong>Interpersonal barriers</strong> occur due to <strong>stage fear</strong>, <strong>lack of will</strong>, or <strong>personal differences</strong> .</li>
<li><strong>Organisational barriers</strong> stem from <strong>formal hierarchies</strong> and <strong>stringent rules</strong> .</li>
<li><strong>Cultural barriers</strong> arise when people <strong>misunderstand customs</strong> or make <strong>stereotypical assumptions</strong> .</li>
</ul>
<table>
<thead>
<tr>
<th align="left">Barrier Category</th>
<th align="left">Detailed Summary</th>
<th align="left">How to Overcome</th>
</tr>
</thead>
<tbody><tr>
<td align="left"><strong>7 Cs Principles</strong></td>
<td align="left">The <strong>basic principles</strong> of professional communication; absence leads to <strong>miscommunication</strong> .</td>
<td align="left">Follow all <strong>7 Cs</strong> to ensure the <strong>message is received</strong> as intended .</td>
</tr>
<tr>
<td align="left"><strong>Environment/Org</strong></td>
<td align="left"><strong>Hierarchical structures</strong> and <strong>physical distance</strong> can block information flow .</td>
<td align="left"><strong>Communicate in person</strong> as much as possible; use <strong>simple language</strong> .</td>
</tr>
<tr>
<td align="left"><strong>Language/Culture</strong></td>
<td align="left"><strong>Inability</strong> to understand different <strong>languages or customs</strong> .</td>
<td align="left">Use <strong>visuals</strong>, take help from a <strong>translator</strong>, and <strong>respect opinions</strong> .</td>
</tr>
</tbody></table>
<h3>Session 6: Writing Skills — Parts of Speech</h3>
<ul>
<li>A <strong>sentence</strong> is a <strong>group of words</strong> communicating a <strong>complete thought</strong> .</li>
<li>A <strong>phrase</strong> is a group of words that <strong>does not make complete sense</strong> .</li>
<li><strong>Capitalisation rules</strong> follow the <strong>TINS</strong> acronym: <strong>Titles, the word ‘I’, Names, and Starting letter of sentences</strong> .</li>
<li><strong>Punctuation marks</strong> like <strong>full stops, commas, and question marks</strong> provide <strong>clarity</strong> to the message .</li>
<li><strong>Parts of speech</strong> include <strong>Nouns</strong> (naming), <strong>Pronouns</strong> (placeholders), <strong>Adjectives</strong> (describing), <strong>Verbs</strong> (action), and <strong>Adverbs</strong> (meaning to verbs) .</li>
<li><strong>Supporting parts of speech</strong> include <strong>Articles</strong> (a, an, the), <strong>Conjunctions</strong> (joining words), <strong>Prepositions</strong> (connectors), and <strong>Interjections</strong> (strong emotions) .</li>
</ul>
<table>
<thead>
<tr>
<th align="left">Part of Speech</th>
<th align="left">Technical Usage / Definition</th>
<th align="left">Examples</th>
</tr>
</thead>
<tbody><tr>
<td align="left"><strong>Noun &amp; Pronoun</strong></td>
<td align="left"><strong>Nouns</strong> name persons/places/things; <strong>Pronouns</strong> are used in place of nouns .</td>
<td align="left"><strong>Noun:</strong> India, January. <strong>Pronoun:</strong> He, She, They .</td>
</tr>
<tr>
<td align="left"><strong>Verb &amp; Adverb</strong></td>
<td align="left"><strong>Verbs</strong> show action; <strong>Adverbs</strong> answer <strong>How? How often? When? and Where?</strong> .</td>
<td align="left"><strong>Verb:</strong> Run, Eat. <strong>Adverb:</strong> Quickly, Always .</td>
</tr>
<tr>
<td align="left"><strong>Supporting Words</strong></td>
<td align="left"><strong>Conjunctions</strong> join sentences; <strong>Prepositions</strong> connect words to show place/time .</td>
<td align="left"><strong>Conjunction:</strong> because, and. <strong>Preposition:</strong> in, on, under .</td>
</tr>
</tbody></table>
<h3>Session 7: Writing Skills — Sentences</h3>
<ul>
<li>Most sentences consist of a <strong>Subject</strong> (performer), <strong>Verb</strong> (action), and <strong>Object</strong> (receiver) .</li>
<li><strong>Direct objects</strong> are <strong>directly acted on</strong> by the verb .</li>
<li><strong>Indirect objects</strong> answer the question <strong>&quot;to/for whom&quot;</strong> .</li>
<li><strong>Active voice</strong> sentences have the <strong>subject performing the action</strong> (e.g., &quot;Radha is reading a book&quot;) .</li>
<li><strong>Passive voice</strong> sentences have the <strong>subject receiving the action</strong> (e.g., &quot;A book is being read by Radha&quot;) .</li>
<li><strong>Sentence types</strong> are categorized by purpose: <strong>Declarative</strong> (statement), <strong>Interrogative</strong> (question), <strong>Exclamatory</strong> (emotion), and <strong>Imperative</strong> (order/request) .</li>
<li>A <strong>paragraph</strong> is a <strong>group of sentences</strong> unified by a <strong>common idea or theme</strong> .</li>
</ul>
<table>
<thead>
<tr>
<th align="left">Sentence/Voice Type</th>
<th align="left">Detailed Summary</th>
<th align="left">Technical Indicators</th>
</tr>
</thead>
<tbody><tr>
<td align="left"><strong>Voice (Active/Passive)</strong></td>
<td align="left"><strong>Active</strong> is direct; <strong>Passive</strong> emphasizes the <strong>receiver</strong> .</td>
<td align="left"><strong>Active:</strong> Subject does action. <strong>Passive:</strong> Subject receives action .</td>
</tr>
<tr>
<td align="left"><strong>Declarative/Interrogative</strong></td>
<td align="left"><strong>Declarative</strong> states facts; <strong>Interrogative</strong> asks questions .</td>
<td align="left"><strong>Declarative</strong> ends with <strong>&#39;.&#39;</strong>; <strong>Interrogative</strong> ends with <strong>&#39;?&#39;</strong> .</td>
</tr>
<tr>
<td align="left"><strong>Exclamatory/Imperative</strong></td>
<td align="left"><strong>Exclamatory</strong> shows emotion; <strong>Imperative</strong> shows commands/requests .</td>
<td align="left"><strong>Exclamatory</strong> ends with <strong>&#39;!&#39;</strong>; <strong>Imperative</strong> ends with <strong>&#39;.&#39; or &#39;!&#39;</strong> .</td>
</tr>
</tbody></table>
<h1>SELF-MANAGEMENT SKILLS</h1>
<h3>Basics of Self-management</h3>
<ul>
<li><strong>Self-management</strong>, also known as <strong>self-control</strong>, is the <strong>ability to control</strong> one&#39;s <strong>emotions, thoughts, and behavior</strong> effectively in <strong>diverse situations</strong> .</li>
<li>It involves <strong>motivating oneself</strong> and <strong>setting personal goals</strong> to perform better than others .</li>
<li><strong>Employers strongly prefer</strong> individuals with <strong>good self-management skills</strong> as they contribute to <strong>workplace efficiency</strong> .</li>
<li>Success in <strong>personal and professional life</strong> depends on mastering <strong>personality development</strong> and <strong>functional abilities</strong> .</li>
</ul>
<table>
<thead>
<tr>
<th align="left">Major Skill</th>
<th align="left">Detailed Summary</th>
<th align="left">Extra Technical Details / Procedures</th>
</tr>
</thead>
<tbody><tr>
<td align="left"><strong>Self-awareness</strong></td>
<td align="left">Involves identifying <strong>inner strengths</strong>, <strong>hidden talents</strong>, and <strong>weaknesses</strong> .</td>
<td align="left">Requires asking for <strong>honest feedback</strong> and reflecting on <strong>daily interactions</strong> to improve future responses .</td>
</tr>
<tr>
<td align="left"><strong>Responsibility</strong></td>
<td align="left">Means taking <strong>ownership</strong> of assigned tasks and <strong>reporting/correcting</strong> errors .</td>
<td align="left">It is considered the <strong>first step</strong> towards <strong>self-development</strong>; avoids <strong>blaming others</strong> for mistakes .</td>
</tr>
<tr>
<td align="left"><strong>Time Management</strong></td>
<td align="left">The ability to <strong>prioritize tasks</strong> and <strong>remove waste/redundancy</strong> from daily work .</td>
<td align="left">Involves creating a <strong>diligent timetable</strong> and making a <strong>good guess</strong> at task duration .</td>
</tr>
<tr>
<td align="left"><strong>Adaptability</strong></td>
<td align="left">Preparing for <strong>new changes</strong> and transitioning <strong>seamlessly</strong> into new practices .</td>
<td align="left">Requires <strong>staying current</strong> by reading <strong>new information</strong> and best practices constantly .</td>
</tr>
</tbody></table>
<h3>Session 1: Stress Management</h3>
<ul>
<li><strong>Stress</strong> is defined as an <strong>emotional, mental, physical, and social reaction</strong> to perceived <strong>demands or threats</strong> .</li>
<li><strong>Stressors</strong> are the <strong>underlying reasons</strong> for stress, such as <strong>exams</strong>, <strong>family pressure</strong>, or <strong>lack of sleep</strong> .</li>
<li>While <strong>short-term stress</strong> can <strong>motivate</strong> one to finish a paper or avoid a fire, <strong>prolonged stress</strong> causes <strong>health and mental troubles</strong> .</li>
<li>The <strong>ultimate goal</strong> of stress management is to find a <strong>balance</strong> between <strong>work, life, and relaxation</strong> .</li>
</ul>
<table>
<thead>
<tr>
<th align="left">Topic</th>
<th align="left">Detailed Summary</th>
<th align="left">Extra Technical Details (ABC Model)</th>
</tr>
</thead>
<tbody><tr>
<td align="left"><strong>The ABC of Stress</strong></td>
<td align="left">A <strong>framework</strong> used to understand and <strong>cope with daily pressures</strong> .</td>
<td align="left"><strong>A: Adversity</strong> (the stressful event); <strong>B: Beliefs</strong> (how you respond); <strong>C: Consequences</strong> (actions and outcomes) .</td>
</tr>
<tr>
<td align="left"><strong>Benefits</strong></td>
<td align="left">Managing stress leads to a <strong>joyful life</strong>, <strong>higher energy</strong>, and <strong>quality time</strong> with family .</td>
<td align="left">Helps individuals remain <strong>focused</strong> to complete tasks <strong>on time</strong> while remaining <strong>happy</strong> .</td>
</tr>
<tr>
<td align="left"><strong>Awareness Steps</strong></td>
<td align="left">A <strong>three-step process</strong> to move from <strong>stress to relaxation</strong> .</td>
<td align="left"><strong>Step 1:</strong> Look for <strong>physical signs</strong> (headache, worrying); <strong>Step 2:</strong> Find the <strong>root cause</strong>; <strong>Step 3:</strong> Apply <strong>management methods</strong> .</td>
</tr>
</tbody></table>
<h3>Stress Management Techniques</h3>
<ul>
<li><strong>Physical exercise</strong> like <strong>yoga and meditation</strong> improves <strong>blood circulation</strong> and <strong>relaxes the body</strong> .</li>
<li><strong>Healthy diet</strong> (balanced meals with fruits and vegetables) provides the <strong>strength</strong> needed for <strong>daily efficiency</strong> .</li>
<li><strong>Positivity</strong> involves focusing on <strong>good aspects</strong> and learning to <strong>improve</strong> rather than feeling <strong>upset over failures</strong> .</li>
<li><strong>Sleep</strong> is critical; at least <strong>7 hours</strong> are required to <strong>recharge the brain and body</strong> for the next day .</li>
<li><strong>Organizing academic life</strong> by finishing <strong>assignments on time</strong> and tracking <strong>deadlines</strong> reduces stress .</li>
<li><strong>Holidays</strong> with friends and family help <strong>break the routine</strong> so you can return to work <strong>afresh</strong> .</li>
</ul>
<table>
<thead>
<tr>
<th align="left">Technique</th>
<th align="left">Detailed Summary</th>
<th align="left">Technical / Procedural Implementation</th>
</tr>
</thead>
<tbody><tr>
<td align="left"><strong>Independent Work</strong></td>
<td align="left">The capacity to be <strong>self-aware, self-monitoring, and self-correcting</strong> .</td>
<td align="left">Requires <strong>taking initiative</strong> rather than waiting for orders and <strong>recognizing mistakes</strong> without blame .</td>
</tr>
<tr>
<td align="left"><strong>Fresh Air &amp; Nature</strong></td>
<td align="left">Getting <strong>fresh oxygen</strong> by walking or playing in a park helps one become <strong>more active</strong> .</td>
<td align="left">Combines <strong>deep breathing exercises</strong> with outdoor movement to <strong>relax the body</strong> .</td>
</tr>
<tr>
<td align="left"><strong>Continuous Learning</strong></td>
<td align="left">The <strong>ability and will</strong> to keep learning even after formal tasks .</td>
<td align="left">Linked to <strong>independent work</strong>; requires a mindset focused on <strong>self-improvement</strong> .</td>
</tr>
</tbody></table>
<h3>Emotional Intelligence (EI)</h3>
<ul>
<li><strong>Emotional Intelligence</strong> is the <strong>ability to identify and manage</strong> one&#39;s own <strong>emotions</strong> and those of <strong>others</strong> .</li>
<li>It is a <strong>critical skill</strong> for keeping the <strong>brain active</strong>, maintaining <strong>open-mindedness</strong>, and <strong>overcoming failures</strong> .</li>
<li>Being <strong>emotionally intelligent</strong> increases the chances of a <strong>balanced life</strong> and <strong>success</strong> in competitions .</li>
</ul>
<table>
<thead>
<tr>
<th align="left">EI Skill</th>
<th align="left">Detailed Summary</th>
<th align="left">Technical Procedure for Management</th>
</tr>
</thead>
<tbody><tr>
<td align="left"><strong>Emotional Awareness</strong></td>
<td align="left">The ability to <strong>identify and name</strong> specific emotions being felt .</td>
<td align="left"><strong>Procedure:</strong> Observe your own <strong>behavior</strong> and note the <strong>specific areas</strong> that need improvement .</td>
</tr>
<tr>
<td align="left"><strong>Harnessing Emotions</strong></td>
<td align="left">Applying emotions to <strong>cognitive tasks</strong> like <strong>thinking and problem solving</strong> .</td>
<td align="left"><strong>Procedure:</strong> Avoid <strong>abrupt decisions</strong>; use <strong>rational thinking</strong> to process emotional states .</td>
</tr>
<tr>
<td align="left"><strong>Managing Emotions</strong></td>
<td align="left">The ability to <strong>regulate emotions</strong> and assist <strong>others</strong> in doing the same .</td>
<td align="left"><strong>Procedure:</strong> Regularly practice <strong>meditation and yoga</strong> to keep yourself <strong>calm</strong> and in control .</td>
</tr>
</tbody></table>
<h1>INFORMATION AND COMMUNICATION TECHNOLOGY SKILLS</h1>
<h3>Session 1: Basic Computer Operations</h3>
<ul>
<li><strong>ICT</strong> stands for <strong>Information and Communication Technology</strong>, covering all <strong>methods and tools</strong> for <strong>storing, recording, and sending digital information</strong> .</li>
<li>A <strong>computer system</strong> is comprised of <strong>hardware</strong> (physical parts like <strong>keyboard and monitor</strong>) and <strong>software</strong> (unseen programs that make <strong>hardware function</strong>) .</li>
<li>The <strong>Operating System (OS)</strong> is the <strong>most important software</strong> that starts immediately upon <strong>switching on</strong> a device .</li>
<li><strong>BIOS (Basic Input/Output System)</strong> is a <strong>basic program</strong> that runs a <strong>self-test</strong> before loading the <strong>Operating System</strong> .</li>
<li><strong>Login-IDs and passwords</strong> act as <strong>keys</strong> to ensure only <strong>authorised persons</strong> can access the <strong>computer applications</strong> .</li>
</ul>
<table>
<thead>
<tr>
<th align="left">Feature</th>
<th align="left">Detailed Summary</th>
<th align="left">Technical Details / Procedures</th>
</tr>
</thead>
<tbody><tr>
<td align="left"><strong>ICT Devices</strong></td>
<td align="left">Hardware used to <strong>manage digital info</strong> including <strong>tablets, smartphones, and laptops</strong>.</td>
<td align="left"><strong>Mobile devices</strong> are smaller systems using <strong>Apple iOS or Google Android</strong> OS .</td>
</tr>
<tr>
<td align="left"><strong>Operating Systems</strong></td>
<td align="left">The <strong>interface</strong> between the user and the <strong>hardware machinery</strong>.</td>
<td align="left">Common desktop examples: <strong>Ubuntu, Microsoft Windows, and Mac OS</strong> .</td>
</tr>
<tr>
<td align="left"><strong>Booting Process</strong></td>
<td align="left">The <strong>automatic routine</strong> performed when the <strong>power button</strong> is pushed.</td>
<td align="left"><strong>Procedure:</strong> 1. BIOS <strong>self-test</strong>; 2. BIOS <strong>loads OS</strong>; 3. <strong>Login screen</strong> appears .</td>
</tr>
</tbody></table>
<h3>Session 2: Performing Basic File Operations</h3>
<ul>
<li>Information is stored in <strong>electronic files</strong> which are organized into <strong>folders</strong> for <strong>easier management</strong> .</li>
<li>Every file has a <strong>file name extension</strong> (separated by a <strong>dot</strong>) that identifies the <strong>file type</strong> .</li>
<li><strong>Navigation keys</strong> like <strong>Home and End</strong> move the <strong>cursor</strong> to the <strong>start or end</strong> of a line .</li>
<li><strong>Command keys</strong> like <strong>Backspace and Delete</strong> are used to <strong>remove text</strong> to the <strong>left and right</strong> of the cursor .</li>
<li><strong>Mouse actions</strong> include <strong>hovering</strong> (showing details), <strong>double-clicking</strong> (opening files), and <strong>drag and drop</strong> (moving items) .</li>
</ul>
<table>
<thead>
<tr>
<th align="left">File/Key Type</th>
<th align="left">Detailed Summary</th>
<th align="left">Technical Details / Shortcuts</th>
</tr>
</thead>
<tbody><tr>
<td align="left"><strong>Common Extensions</strong></td>
<td align="left"><strong>Suffixes</strong> that tell the computer which <strong>application</strong> to use.</td>
<td align="left"><strong>.txt</strong> (Notepad), <strong>.doc</strong> (Document), <strong>.xls</strong> (Spreadsheet), <strong>.jpg</strong> (Image), <strong>.mp3</strong> (Sound) .</td>
</tr>
<tr>
<td align="left"><strong>Keyboard Groups</strong></td>
<td align="left">Buttons categorized by <strong>function</strong>, <strong>control</strong>, <strong>punctuation</strong>, and <strong>navigation</strong>.</td>
<td align="left"><strong>F1-F12</strong> (Function), <strong>Ctrl/Alt/Shift</strong> (Control), <strong>Ins/Del/Backspace</strong> (Command) .</td>
</tr>
<tr>
<td align="left"><strong>Editing Shortcuts</strong></td>
<td align="left"><strong>Key combinations</strong> used to perform <strong>file operations</strong> quickly.</td>
<td align="left"><strong>Ctrl+X</strong> (Cut), <strong>Ctrl+C</strong> (Copy), <strong>Ctrl+V</strong> (Paste), <strong>Ctrl+Z</strong> (Undo), <strong>Ctrl+S</strong> (Save) .</td>
</tr>
</tbody></table>
<h3>Session 3: Computer Care and Maintenance</h3>
<ul>
<li><strong>Maintenance</strong> is essential to keep <strong>moving electronic parts</strong> working <strong>efficiently</strong> and to <strong>save money</strong> on repairs .</li>
<li><strong>Keyboard care</strong> involves not <strong>eating over it</strong> and using a <strong>soft brush</strong> to remove <strong>dust particles</strong> .</li>
<li><strong>Heat management</strong> is critical; computers use <strong>internal fans</strong> to prevent <strong>overheating</strong> the <strong>internal parts</strong> .</li>
<li><strong>Battery health</strong> is maintained by <strong>unplugging the device</strong> once it is <strong>100% charged</strong> .</li>
<li><strong>Backing up data</strong> involves saving info to <strong>external devices</strong> like <strong>CDs, DVDs, or hard disks</strong> to prevent <strong>data loss</strong> .</li>
</ul>
<table>
<thead>
<tr>
<th align="left">Maintenance Level</th>
<th align="left">Detailed Summary</th>
<th align="left">Technical Procedures</th>
</tr>
</thead>
<tbody><tr>
<td align="left"><strong>Daily/Weekly</strong></td>
<td align="left">Focus on <strong>email inbox cleaning</strong> and <strong>physical dusting</strong> of peripherals.</td>
<td align="left"><strong>Weekly:</strong> Clean monitor/keyboard and <strong>backup data</strong> to an external drive .</td>
</tr>
<tr>
<td align="left"><strong>Monthly/Yearly</strong></td>
<td align="left">Focus on <strong>software optimization</strong> and <strong>security updates</strong>.</td>
<td align="left"><strong>Monthly:</strong> Run <strong>disk-cleaner</strong>, <strong>virus scan</strong>, and <strong>uninstall unused apps</strong> .</td>
</tr>
<tr>
<td align="left"><strong>System Performance</strong></td>
<td align="left">Actions taken to <strong>increase speed</strong> by removing <strong>unnecessary files</strong>.</td>
<td align="left">Use <strong>disk cleaner software</strong> to remove <strong>temporary files</strong> and <strong>images</strong> .</td>
</tr>
</tbody></table>
<h3>Session 4: Computer Security and Privacy</h3>
<ul>
<li><strong>Security and privacy</strong> measures are used to <strong>restrict access</strong> to <strong>personal data</strong> and prevent <strong>information leakage</strong> .</li>
<li><strong>Identity theft</strong> occurs when a <strong>hacker</strong> steals personal info to <strong>assume your identity</strong> and access <strong>accounts</strong> .</li>
<li><strong>Software Piracy</strong> involves the <strong>unauthorised distribution</strong> or use of <strong>unlicensed computer programs</strong> .</li>
<li><strong>Viruses</strong> are <strong>computer programs</strong> that can <strong>damage data</strong> or <strong>steal information</strong> .</li>
<li><strong>Worms</strong> are a type of virus that <strong>replicate themselves</strong> to spread through <strong>all files</strong> .</li>
<li><strong>Trojan Horses</strong> disguise themselves as <strong>useful software</strong> while secretly <strong>destroying data</strong> .</li>
</ul>
<table>
<thead>
<tr>
<th align="left">Security Measure</th>
<th align="left">Detailed Summary</th>
<th align="left">Technical Implementation</th>
</tr>
</thead>
<tbody><tr>
<td align="left"><strong>Strong Passwords</strong></td>
<td align="left">A <strong>primary defense</strong> against <strong>unauthorised access</strong>.</td>
<td align="left"><strong>Formula:</strong> Mix of <strong>capital/small letters</strong>, <strong>numbers</strong>, and <strong>special characters</strong> (e.g., % ^ # $) .</td>
</tr>
<tr>
<td align="left"><strong>Network Safety</strong></td>
<td align="left">Tools to <strong>monitor data</strong> entering and leaving a <strong>computer</strong>.</td>
<td align="left">Install <strong>Anti-virus and Firewalls</strong>; only use <strong>secure sites</strong> starting with <strong>https://</strong> .</td>
</tr>
<tr>
<td align="left"><strong>Data Encryption</strong></td>
<td align="left">A method to <strong>scramble data</strong> so it is <strong>unreadable</strong> without a <strong>key</strong>.</td>
<td align="left">Use features like <strong>Bitlocker</strong> in Windows to <strong>encrypt the hard disk</strong> .</td>
</tr>
</tbody></table>
<h1>ENTREPRENEURIAL SKILLS</h1>
<h3>Introduction to Entrepreneurship</h3>
<ul>
<li><strong>Entrepreneurship</strong> is a type of <strong>self-employment</strong> where one runs a <strong>business</strong> to <strong>satisfy needs</strong> of people and makes it better to generate <strong>profits</strong> .</li>
<li>An <strong>entrepreneur</strong> is a <strong>self-employed person</strong> who is always trying to <strong>improve</strong> their business by <strong>taking risks</strong> and trying <strong>new ideas</strong> .</li>
<li>Successful entrepreneurs are <strong>confident</strong>, <strong>creative</strong>, <strong>patient</strong>, and <strong>hard-working</strong> individuals who believe in their <strong>abilities</strong> .</li>
<li>They <strong>take responsibility</strong> for their <strong>actions</strong>, make <strong>decisions</strong> after careful <strong>thinking</strong>, and do <strong>not give up</strong> when facing <strong>difficulties</strong> .</li>
</ul>
<h3>Session 1: Entrepreneurship and Society</h3>
<ul>
<li><strong>Wage employment</strong> involves <strong>working for a person</strong> or organization and getting <strong>paid</strong> for that work .</li>
<li><strong>Self-employed</strong> people start <strong>businesses</strong> to <strong>satisfy the needs</strong> of people in their <strong>market</strong> .</li>
<li>Entrepreneurs <strong>fulfil customer needs</strong> by identifying <strong>demand</strong>, which is defined as a <strong>product or service</strong> people want .</li>
<li>They use <strong>local materials</strong> and <strong>local people</strong> available around them to make <strong>products at low cost</strong> .</li>
<li>Entrepreneurial growth <strong>creates jobs</strong> because as <strong>businesses grow</strong>, they <strong>hire more people</strong> and buy more <strong>material</strong> from others .</li>
<li>They help in <strong>sharing of wealth</strong> as the <strong>people working</strong> for them also <strong>earn money</strong> to live a <strong>better quality life</strong> .</li>
<li>Increased <strong>competition</strong> between entrepreneurs leads to a <strong>lower price of products</strong> for the <strong>customers</strong> .</li>
</ul>
<table>
<thead>
<tr>
<th align="left">Social Role</th>
<th align="left">Detailed Summary</th>
<th align="left">Technical Impact / Factors</th>
</tr>
</thead>
<tbody><tr>
<td align="left"><strong>Need Fulfillment</strong></td>
<td align="left">Finding what people <strong>want</strong> and using <strong>creativity</strong> to meet that <strong>demand</strong> .</td>
<td align="left">Success depends on identifying <strong>specific demands</strong> within the <strong>local market</strong> .</td>
</tr>
<tr>
<td align="left"><strong>Local Resource Use</strong></td>
<td align="left">Utilizing <strong>materials and labor</strong> available in the <strong>immediate area</strong> .</td>
<td align="left">Reduces <strong>production costs</strong> while providing <strong>income</strong> to local <strong>farmers and workers</strong> .</td>
</tr>
<tr>
<td align="left"><strong>Wealth Distribution</strong></td>
<td align="left">As the <strong>entrepreneur grows</strong>, the <strong>employees and vendors</strong> grow with them .</td>
<td align="left"><strong>Wealth</strong> is defined as having <strong>enough money</strong> for a <strong>comfortable life</strong> .</td>
</tr>
</tbody></table>
<h3>Session 2: Qualities and Functions of an Entrepreneur</h3>
<ul>
<li><strong>Quality</strong> is the specific way in which a <strong>person acts or behaves</strong> .</li>
<li>Entrepreneurs must be <strong>patient</strong> because success in a <strong>difficult business</strong> can take <strong>time</strong> to achieve .</li>
<li>Being <strong>creative</strong> allows them to find <strong>different solutions</strong> to <strong>common problems</strong> .</li>
<li>They <strong>take responsibility</strong> for their <strong>mistakes</strong> and work to <strong>make things better</strong> .</li>
<li>A <strong>positive attitude</strong> is essential to <strong>not give up</strong> when facing <strong>many problems</strong> .</li>
<li><strong>Making decisions</strong> is a daily function where they choose <strong>what to produce</strong>, how much, and <strong>where to sell</strong> it .</li>
<li><strong>Managing the business</strong> involves <strong>planning</strong>, <strong>arranging raw material</strong>, and <strong>telling everyone</strong> what to do .</li>
<li>Entrepreneurs <strong>divide income</strong> by spending business money to <strong>buy material</strong>, pay <strong>rent</strong>, and pay <strong>salaries</strong> .</li>
</ul>
<table>
<thead>
<tr>
<th align="left">Entrepreneurial Function</th>
<th align="left">Detailed Summary</th>
<th align="left">Technical Procedure / Action</th>
</tr>
</thead>
<tbody><tr>
<td align="left"><strong>Risk Management</strong></td>
<td align="left">Taking <strong>risks</strong> against potential <strong>losses</strong> like <strong>fires</strong>, <strong>theft</strong>, or <strong>lost items</strong> .</td>
<td align="left"><strong>Risk</strong> is technically the <strong>chance</strong> of something <strong>going wrong</strong> .</td>
</tr>
<tr>
<td align="left"><strong>Innovation</strong></td>
<td align="left">Constantly <strong>trying new things</strong>, <strong>ideas</strong>, or <strong>products</strong> .</td>
<td align="left">Done to increase the <strong>importance</strong> and <strong>income</strong> of the business .</td>
</tr>
<tr>
<td align="left"><strong>Business Oversight</strong></td>
<td align="left">Checking if the <strong>original plan</strong> is being <strong>properly followed</strong> .</td>
<td align="left">Involves <strong>future planning</strong> and <strong>hiring</strong> the right <strong>people for work</strong> .</td>
</tr>
</tbody></table>
<h3>Session 3: Myths about Entrepreneurship</h3>
<ul>
<li>A <strong>myth</strong>, or <strong>misconception</strong>, is a <strong>false belief</strong> or opinion about something .</li>
<li><strong>Myth 1:</strong> Every business idea must be <strong>unique</strong>; <strong>Truth:</strong> You can take an <strong>existing idea</strong> and add a <strong>new approach</strong> .</li>
<li><strong>Myth 2:</strong> You need a <strong>lot of money</strong> to start; <strong>Truth:</strong> You can start with <strong>limited capital</strong> and grow as you <strong>make money</strong> .</li>
<li><strong>Capital</strong> is the <strong>money used</strong> specifically to <strong>start a business</strong> .</li>
<li><strong>Myth 3:</strong> Only <strong>big businesses</strong> are entrepreneurs; <strong>Truth:</strong> Even <strong>small-scale vendors</strong> fulfilling needs are <strong>entrepreneurs</strong> .</li>
<li><strong>Myth 4:</strong> Entrepreneurs are <strong>born</strong>; <strong>Truth:</strong> It is a <strong>way of thinking</strong> that can be <strong>learned and practiced</strong> .</li>
</ul>
<table>
<thead>
<tr>
<th align="left">Common Misconception</th>
<th align="left">Reality of Entrepreneurship</th>
<th align="left">Business Growth Factor</th>
</tr>
</thead>
<tbody><tr>
<td align="left"><strong>Unique Idea Required</strong></td>
<td align="left">Common ideas can succeed if you <strong>do something different</strong> for the <strong>customer</strong> .</td>
<td align="left">Differentiation increases <strong>customer demand</strong> in crowded <strong>markets</strong> .</td>
</tr>
<tr>
<td align="left"><strong>Wealthy Start-up</strong></td>
<td align="left">You can <strong>borrow money</strong> from family or use <strong>personal savings</strong> to start .</td>
<td align="left">Businesses often <strong>start small</strong> and become <strong>big</strong> with <strong>hard work</strong> .</td>
</tr>
<tr>
<td align="left"><strong>Innate Talent Only</strong></td>
<td align="left">Anyone who <strong>does whatever it takes</strong> to succeed can be an <strong>entrepreneur</strong> .</td>
<td align="left">Success starts with <strong>believing anything is possible</strong> and should be <strong>achieved</strong> .</td>
</tr>
</tbody></table>
<h3>Session 4: Entrepreneurship as a Career Option</h3>
<ul>
<li>A <strong>career</strong> is a specific <strong>line of work</strong> that a person <strong>takes for life</strong> .</li>
<li>The <strong>career process</strong> of an entrepreneur has <strong>three main stages</strong>: <strong>Enter</strong>, <strong>Survive</strong>, and <strong>Grow</strong> .</li>
<li><strong>Enter:</strong> This is the stage where the <strong>entrepreneur</strong> is <strong>starting</strong> and just <strong>entering the market</strong> .</li>
<li><strong>Survive:</strong> They must <strong>remain</strong> in the market despite <strong>competition</strong> from many other <strong>entrepreneurs</strong> .</li>
<li><strong>Grow:</strong> Once the business is <strong>stable</strong>, the entrepreneur thinks about <strong>expanding</strong> the business to <strong>new locations</strong> .</li>
<li>Learning <strong>entrepreneurial actions</strong> can be done in <strong>school</strong>, <strong>college</strong>, or by <strong>working for someone</strong> first .</li>
</ul>
<table>
<thead>
<tr>
<th align="left">Career Stage</th>
<th align="left">Detailed Summary</th>
<th align="left">Technical Example / Implementation</th>
</tr>
</thead>
<tbody><tr>
<td align="left"><strong>Stage 1: Enter</strong></td>
<td align="left">The phase of <strong>commencing</strong> operations and <strong>satisfying a need</strong> .</td>
<td align="left">Example: Starting a <strong>small grocery store</strong> in a <strong>specific locality</strong> .</td>
</tr>
<tr>
<td align="left"><strong>Stage 2: Survive</strong></td>
<td align="left">Maintaining <strong>market presence</strong> while facing <strong>competitive pressure</strong> .</td>
<td align="left">Example: Store <strong>stays open</strong> and does well despite <strong>nearby competitors</strong> .</td>
</tr>
<tr>
<td align="left"><strong>Stage 3: Grow</strong></td>
<td align="left">Phase of <strong>expansion</strong> after establishing a <strong>stable foundation</strong> .</td>
<td align="left">Example: Expanding to <strong>more floors</strong> or a <strong>chain of stores</strong> in <strong>other cities</strong> .</td>
</tr>
</tbody></table>
<h1>GREEN SKILLS</h1>
<h3>Introduction to Green Skills</h3>
<ul>
<li>The <strong>environment affects</strong> all <strong>aspects of life</strong>, and <strong>day-to-day activities</strong> likewise <strong>affect the environment</strong> .</li>
<li><strong>Economic development</strong> has led to <strong>increased pollution</strong> and <strong>environmental degradation</strong> through methods like <strong>high-input agriculture</strong> .</li>
<li><strong>Green skills</strong> are the <strong>technical knowledge and values</strong> needed to support <strong>sustainable social, economic, and environmental outcomes</strong> .</li>
<li>We must <strong>plan resource use</strong> in a <strong>sustainable manner</strong> so <strong>future generations</strong> can enjoy a <strong>good environment</strong> .</li>
</ul>
<h3>Session 1: Sustainable Development</h3>
<ul>
<li><strong>Sustainable development</strong> satisfies <strong>present needs</strong> without <strong>compromising</strong> the <strong>capacity of future generations</strong> .</li>
<li>It requires a <strong>balance</strong> between <strong>economic growth</strong>, <strong>environmental care</strong>, and <strong>social well-being</strong> .</li>
<li><strong>Increasing population</strong> and <strong>income</strong> have led to <strong>increased consumption</strong> and <strong>utilization of natural resources</strong> .</li>
<li><strong>Sustainable agriculture</strong> uses <strong>eco-friendly farming</strong> to produce crops <strong>without damaging</strong> human or <strong>natural systems</strong> .</li>
<li>Major <strong>problems</strong> include <strong>depletion of fertile land</strong>, <strong>water pollution</strong> from garbage, and <strong>climate change</strong> due to <strong>fuel wood cutting</strong> .</li>
<li>The <strong>Sustainable Development Goals (SDGs)</strong> are <strong>17 goals</strong> launched by the <strong>United Nations</strong> in <strong>2015</strong> to be achieved by <strong>2030</strong> .</li>
<li><strong>Innovations</strong> include <strong>100% bio-degradable bags</strong> and <strong>edible cutlery</strong> made from <strong>grain</strong> to replace plastics .</li>
</ul>
<table>
<thead>
<tr>
<th align="left">Topic</th>
<th align="left">Detailed Summary</th>
<th align="left">Extra Technical Details / Procedures</th>
</tr>
</thead>
<tbody><tr>
<td align="left"><strong>Resource Management</strong></td>
<td align="left">Includes <strong>reducing excessive use</strong>, <strong>recycling</strong>, and <strong>scientific management</strong> of <strong>bio-resources</strong>.</td>
<td align="left">Use <strong>environment friendly technologies</strong> based on <strong>efficient resource use</strong> .</td>
</tr>
<tr>
<td align="left"><strong>Solar Power</strong></td>
<td align="left">Utilizing <strong>sunlight</strong> for <strong>clean energy</strong> to reduce <strong>fossil fuel dependence</strong>.</td>
<td align="left"><strong>Example:</strong> The <strong>Charanka – Gujarat Solar Park</strong> generates <strong>600 MW</strong> of power on barren land .</td>
</tr>
<tr>
<td align="left"><strong>Sustainable Processes</strong></td>
<td align="left"><strong>Methods</strong> like <strong>organic farming</strong>, <strong>vermi-composting</strong>, and <strong>rainwater harvesting</strong> preserve the earth.</td>
<td align="left"><strong>Organic farming procedure:</strong> Avoid <strong>chemical pesticides/fertilisers</strong>; use <strong>cow dung</strong> to maintain <strong>soil quality</strong> .</td>
</tr>
</tbody></table>
<h3>Session 2: Our Role in Sustainable Development</h3>
<ul>
<li><strong>Increased population</strong> requires more <strong>food, energy, and water</strong>, leading to <strong>nutrient-depleted soil</strong> and <strong>scarce fossil fuels</strong> .</li>
<li>The <strong>Ministry of Railways</strong> introduced <strong>‘Kulhads’ (clay pots)</strong> to <strong>replace plastic/paper cups</strong>, reducing <strong>tree cutting</strong> and <strong>creating jobs</strong> for potters .</li>
<li><strong>Quality education</strong> is essential to help <strong>children get jobs</strong> and become <strong>responsible environment citizens</strong> .</li>
<li>To ensure <strong>clean water</strong>, we must <strong>stop industrial pollution</strong> and make areas <strong>free of open defecation</strong> by <strong>building toilets</strong> .</li>
<li><strong>Sustainable cities</strong> can be created by <strong>switching off lights</strong>, using <strong>natural light</strong>, and installing <strong>energy-efficient LED bulbs</strong> .</li>
<li><strong>Responsible consumption</strong> involves <strong>reusing paper/plastic</strong>, using <strong>cloth bags</strong>, and <strong>sorting garbage</strong> before disposal .</li>
<li><strong>Protecting life</strong> involves <strong>saving oceans from plastic</strong> and <strong>planting trees</strong> to prevent <strong>soil erosion</strong> .</li>
</ul>
<table>
<thead>
<tr>
<th align="left">Sustainable Role</th>
<th align="left">Detailed Summary</th>
<th align="left">Technical Actions / Responsibilities</th>
</tr>
</thead>
<tbody><tr>
<td align="left"><strong>Clean Energy Use</strong></td>
<td align="left">Shifting to <strong>biogas</strong> and <strong>solar power</strong> to meet <strong>electricity needs</strong> without <strong>pollution</strong>.</td>
<td align="left">Focus on <strong>increasing solar generation</strong> to avoid using up <strong>non-renewable resources</strong> .</td>
</tr>
<tr>
<td align="left"><strong>Reducing Inequality</strong></td>
<td align="left">Being <strong>helpful and friendly</strong> to everyone regardless of <strong>class, caste, or gender</strong>.</td>
<td align="left"><strong>Procedure:</strong> Include <strong>everyone</strong> while <strong>working or playing</strong> to build a <strong>fair society</strong> .</td>
</tr>
<tr>
<td align="left"><strong>Waste Management</strong></td>
<td align="left"><strong>Sorting and treating garbage</strong> to become <strong>responsible consumers</strong>.</td>
<td align="left"><strong>Procedures:</strong> <strong>Repair leaking taps</strong>; <strong>donate</strong> unused items; buy <strong>seasonal food</strong> from <strong>local growers</strong> .</td>
</tr>
</tbody></table>

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

         

window.AR_DISCOVERY = AR_DISCOVERY;

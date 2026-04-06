/**
 * data.js — SINGLE SOURCE OF TRUTH for all app data
 * Every page, component, and module reads exclusively from this file.
 */

var InstagramData = {

  /* ═══════════════════════ CURRENT USER ═══════════════════════════ */
  currentUser: {
    id: 'user_0', username: 'yourhandle', fullName: 'Your Name',
    bio: 'Living the moment ✨ | Photography | Travel | Based in NYC',
    avatar: 'https://i.pravatar.cc/150?img=1',
    postsCount: 46, followers: 2847, following: 526,
    isVerified: false, website: 'yourwebsite.com',
  },

  /* ═══════════════════════ USERS ══════════════════════════════════ */
  users: [
    { id:'user_1',  username:'alex.rivera',  fullName:'Alex Rivera',      avatar:'https://i.pravatar.cc/150?img=2',  isVerified:true,  followers:12400, following:892  },
    { id:'user_2',  username:'sofia.chen',   fullName:'Sofia Chen',       avatar:'https://i.pravatar.cc/150?img=5',  isVerified:false, followers:3200,  following:410  },
    { id:'user_3',  username:'marcus.j',     fullName:'Marcus Johnson',   avatar:'https://i.pravatar.cc/150?img=8',  isVerified:true,  followers:89000, following:1200 },
    { id:'user_4',  username:'luna.photo',   fullName:'Luna Photography', avatar:'https://i.pravatar.cc/150?img=11', isVerified:false, followers:5400,  following:320  },
    { id:'user_5',  username:'kai.travels',  fullName:'Kai Travels',      avatar:'https://i.pravatar.cc/150?img=14', isVerified:true,  followers:45000, following:623  },
    { id:'user_6',  username:'mia.style',    fullName:'Mia Style',        avatar:'https://i.pravatar.cc/150?img=16', isVerified:false, followers:8900,  following:912  },
    { id:'user_7',  username:'dom.hill',     fullName:'Dom Hill',         avatar:'https://i.pravatar.cc/150?img=20', isVerified:false, followers:1200,  following:234  },
    { id:'user_8',  username:'john.kelson',  fullName:'John Kelson',      avatar:'https://i.pravatar.cc/150?img=25', isVerified:true,  followers:34000, following:430  },
    { id:'user_9',  username:'priya.k',      fullName:'Priya Kapoor',     avatar:'https://i.pravatar.cc/150?img=29', isVerified:false, followers:7800,  following:560  },
    { id:'user_10', username:'nate.runs',    fullName:'Nate Running',     avatar:'https://i.pravatar.cc/150?img=33', isVerified:false, followers:2100,  following:180  },
  ],

  /* ═══════════════════════ STORIES ════════════════════════════════ */
  stories: [
    { id:'story_1',  userId:'user_1', viewed:false, timestamp:Date.now()-3600000,  media:'https://picsum.photos/400/710?random=1',  type:'image', duration:5000, replies:[{username:'sofia.chen',text:'❤️ Love this!',time:'2h'},{username:'marcus.j',text:'Incredible 🔥',time:'1h'}] },
    { id:'story_2',  userId:'user_2', viewed:false, timestamp:Date.now()-7200000,  media:'https://picsum.photos/400/710?random=2',  type:'image', duration:5000, replies:[{username:'kai.travels',text:'Where is this?',time:'3h'}] },
    { id:'story_3',  userId:'user_3', viewed:true,  timestamp:Date.now()-10800000, media:'https://picsum.photos/400/710?random=3',  type:'image', duration:5000, replies:[] },
    { id:'story_4',  userId:'user_4', viewed:false, timestamp:Date.now()-14400000, media:'https://picsum.photos/400/710?random=4',  type:'image', duration:5000, replies:[{username:'mia.style',text:'The lighting is everything ✨',time:'4h'}] },
    { id:'story_5',  userId:'user_5', viewed:true,  timestamp:Date.now()-18000000, media:'https://picsum.photos/400/710?random=5',  type:'image', duration:5000, replies:[] },
    { id:'story_6',  userId:'user_6', viewed:false, timestamp:Date.now()-21600000, media:'https://picsum.photos/400/710?random=6',  type:'image', duration:5000, replies:[{username:'dom.hill',text:'So stylish 🙌',time:'6h'}] },
    { id:'story_7',  userId:'user_7', viewed:false, timestamp:Date.now()-25200000, media:'https://picsum.photos/400/710?random=7',  type:'image', duration:5000, replies:[] },
    { id:'story_8',  userId:'user_8', viewed:true,  timestamp:Date.now()-28800000, media:'https://picsum.photos/400/710?random=8',  type:'image', duration:5000, replies:[{username:'nate.runs',text:'Goals! 💯',time:'8h'}] },
    { id:'story_9',  userId:'user_9', viewed:false, timestamp:Date.now()-32400000, media:'https://picsum.photos/400/710?random=9',  type:'image', duration:5000, replies:[] },
    { id:'story_10', userId:'user_10',viewed:false, timestamp:Date.now()-36000000, media:'https://picsum.photos/400/710?random=10', type:'image', duration:5000, replies:[] },
  ],

  /* ═══════════════════════ POSTS ══════════════════════════════════ */
  posts: [
    {
      id:'post_1', slug:'golden-hour-santorini', userId:'user_1',
      images:['https://picsum.photos/600/600?random=21'],
      caption:'Golden hour hits different when you\'re in the right place 🌅 Every frame tells a story worth remembering. #photography #travel #goldenhour',
      likes:5247, liked:false, saved:false,
      comments:[
        {id:'c1',userId:'user_2',text:'Absolutely stunning! 😍',timestamp:Date.now()-3600000},
        {id:'c2',userId:'user_3',text:'Where is this? Looks incredible!',timestamp:Date.now()-7200000},
        {id:'c3',userId:'user_4',text:'The colors are everything 🔥',timestamp:Date.now()-9000000},
      ],
      timestamp:Date.now()-3600000, location:'Santorini, Greece',
    },
    {
      id:'post_2', slug:'desert-vibes-arizona', userId:'user_3',
      images:['https://picsum.photos/600/600?random=22','https://picsum.photos/600/600?random=23','https://picsum.photos/600/600?random=24'],
      caption:'Desert vibes 🏜️ There\'s something about the silence of wide open spaces that resets everything. Swipe for more! #desert #wanderlust',
      likes:12834, liked:true, saved:true,
      comments:[
        {id:'c5',userId:'user_5',text:'This is breathtaking 🤩',timestamp:Date.now()-1800000},
        {id:'c6',userId:'user_1',text:'Taking me back to my road trip!',timestamp:Date.now()-5400000},
      ],
      timestamp:Date.now()-7200000, location:'Arizona, USA',
    },
    {
      id:'post_3', slug:'tokyo-street-photography', userId:'user_5',
      images:['https://picsum.photos/600/600?random=25'],
      caption:'New city, new adventures 🌆 Every street has a story to tell. Tokyo never disappoints. #citylife #travel #tokyo',
      likes:3856, liked:false, saved:false,
      comments:[{id:'c8',userId:'user_6',text:'Love the perspective!',timestamp:Date.now()-900000}],
      timestamp:Date.now()-10800000, location:'Tokyo, Japan',
    },
    {
      id:'post_4', slug:'morning-coffee-vibes', userId:'user_2',
      images:['https://picsum.photos/600/600?random=26'],
      caption:'Morning coffee and good vibes ☕ Starting the year right with gratitude and good caffeine.',
      likes:1423, liked:false, saved:false,
      comments:[{id:'c10',userId:'user_7',text:'Same energy every morning! ☕',timestamp:Date.now()-1200000}],
      timestamp:Date.now()-14400000, location:null,
    },
    {
      id:'post_5', slug:'bali-surf-session', userId:'user_8',
      images:['https://picsum.photos/600/600?random=27','https://picsum.photos/600/600?random=28'],
      caption:'Summer is a state of mind 🏄‍♂️ Nothing beats the ocean calling your name. #surf #ocean #bali',
      likes:9234, liked:true, saved:false,
      comments:[
        {id:'c11',userId:'user_1',text:'Living the absolute dream! 🤙',timestamp:Date.now()-2700000},
        {id:'c12',userId:'user_4',text:'Wish I was there rn 😭',timestamp:Date.now()-6300000},
      ],
      timestamp:Date.now()-18000000, location:'Bali, Indonesia',
    },
    {
      id:'post_6', slug:'portrait-light-shadow', userId:'user_4',
      images:['https://picsum.photos/600/600?random=29'],
      caption:'Light and shadow — that\'s where all the magic lives 📷 #photography #portrait #light',
      likes:6712, liked:false, saved:true,
      comments:[{id:'c14',userId:'user_8',text:'The lighting is absolutely 🔥',timestamp:Date.now()-3600000}],
      timestamp:Date.now()-21600000, location:null,
    },
    {
      id:'post_7', slug:'milan-street-style', userId:'user_6',
      images:['https://picsum.photos/600/600?random=30'],
      caption:'Street style never sleeps 🖤 Fashion is art you wear every single day. #fashion #style #ootd',
      likes:4523, liked:false, saved:false, comments:[],
      timestamp:Date.now()-25200000, location:'Milan, Italy',
    },
    {
      id:'post_8', slug:'swiss-alps-peak', userId:'user_7',
      images:['https://picsum.photos/600/600?random=31'],
      caption:'Peak happiness found right here 🏔️ Nothing beats being above the clouds. #mountains #hiking',
      likes:2156, liked:false, saved:false,
      comments:[{id:'c16',userId:'user_9',text:'This view though! 🏔️',timestamp:Date.now()-5400000}],
      timestamp:Date.now()-28800000, location:'Swiss Alps',
    },
    {
      id:'post_9', slug:'brooklyn-street-art', userId:'user_9',
      images:['https://picsum.photos/600/600?random=32'],
      caption:'Color, culture, and community 🎨 This mural stopped me in my tracks today. #streetart #art',
      likes:3401, liked:false, saved:false, comments:[],
      timestamp:Date.now()-32400000, location:'Brooklyn, NY',
    },
    {
      id:'post_10', slug:'sunrise-run', userId:'user_10',
      images:['https://picsum.photos/600/600?random=33'],
      caption:'5K done before sunrise 🌄 Early mornings are a different world. #running #fitness',
      likes:891, liked:false, saved:false, comments:[],
      timestamp:Date.now()-36000000, location:null,
    },
  ],

  /* ═══════════════════════ EXPLORE POSTS ══════════════════════════ */
  explorePosts: Array.from({ length: 30 }, (_, i) => ({
    id:        `explore_${i+1}`,
    userId:    `user_${(i % 10) + 1}`,
    image:     `https://picsum.photos/300/300?random=${50+i}`,
    likes:     Math.floor(Math.random() * 20000) + 100,
    comments:  Math.floor(Math.random() * 500),
    isVideo:   i % 7 === 0,
    isCarousel:i % 5 === 0 && i % 7 !== 0,
  })),

  /* ═══════════════════════ REELS ══════════════════════════════════ */
  reels: (() => {
    const captions = [
      'Golden hour hits different out here 🌅 #vibes #sunset',
      'POV: you actually did the thing 💪 #motivation',
      'This city never stops surprising me ✨ #travel',
      'Small moments, big feelings 🤍 #life',
      'Found paradise and never leaving 🏖️ #wanderlust',
      'When the music drops just right 🎵 #dance',
      'Built different 🔥 #fitness #grind',
      'Slow mornings > everything ☕ #lifestyle',
      'The view was worth every step 🏔️ #hiking',
      'Pure joy, no filter needed 😄 #authentic',
    ];
    return Array.from({ length: 20 }, (_, i) => ({
      id:      `reel_${i+1}`,
      userId:  `user_${(i % 10) + 1}`,
      image:   `https://picsum.photos/420/900?random=${80+i}`,
      thumb:   `https://picsum.photos/300/500?random=${80+i}`,
      views:   Math.floor(Math.random() * 900000) + 10000,
      likes:   Math.floor(Math.random() * 50000) + 500,
      liked:   i % 5 === 0,
      saved:   false,
      caption: captions[i % captions.length],
      comments:[
        { userId:`user_${((i+1)%10)+1}`, text:'Absolutely fire 🔥',      timestamp:Date.now()-1800000 },
        { userId:`user_${((i+2)%10)+1}`, text:'Need more content!',       timestamp:Date.now()-3600000 },
        { userId:`user_${((i+3)%10)+1}`, text:'You dropped this 👑',      timestamp:Date.now()-7200000 },
      ],
    }));
  })(),

  /* ═══════════════════════ NOTIFICATIONS ══════════════════════════ */
  notifications: [
    { id:'n1', type:'follow',  userId:'user_1',                              timestamp:Date.now()-3600000,  read:false },
    { id:'n2', type:'comment', userId:'user_3', postId:'post_1', text:'Great shot!', timestamp:Date.now()-7200000,  read:false },
    { id:'n3', type:'follow',  userId:'user_5',                              timestamp:Date.now()-14400000, read:false },
    { id:'n4', type:'comment', userId:'user_2', postId:'post_2', text:'Love this!',  timestamp:Date.now()-21600000, read:true  },
    { id:'n5', type:'mention', userId:'user_6', postId:'post_2', text:'Check @yourhandle', timestamp:Date.now()-43200000, read:true },
    { id:'n6', type:'follow',  userId:'user_9',                              timestamp:Date.now()-86400000, read:true  },
    { id:'n7', type:'dm',      userId:'user_1',                              timestamp:Date.now()-172800000,read:true  },
  ],

  /* ═══════════════════════ MESSAGES ═══════════════════════════════ */
  messages: [
    {
      id:'thread_1', isGroup:false, participantId:'user_1', unread:1,
      messages:[
        { from:'user_1', text:'That shot is incredible! 🔥',              timestamp:Date.now()-3600000 },
        { from:'user_0', text:'Thanks! Caught it at just the right moment',timestamp:Date.now()-3500000 },
        { from:'user_1', text:'We should collab sometime!',               timestamp:Date.now()-3400000 },
      ],
    },
    {
      id:'thread_2', isGroup:false, participantId:'user_3', unread:0,
      messages:[
        { from:'user_3', text:'Hey! Loved the desert series',             timestamp:Date.now()-86400000 },
        { from:'user_0', text:'Thanks so much! That trip was wild',       timestamp:Date.now()-85000000 },
      ],
    },
    {
      id:'thread_3', isGroup:false, participantId:'user_5', unread:0,
      messages:[
        { from:'user_5', text:'Tokyo recs? 🗾',                            timestamp:Date.now()-172800000 },
      ],
    },
    {
      id:'group_1', isGroup:true, groupName:'Photography Club 📸', memberIds:['user_4','user_8','user_2'], unread:2,
      messages:[
        { from:'user_4', text:'Check out this new lens I got!',           timestamp:Date.now()-7200000 },
        { from:'user_8', text:'Nice! What focal length?',                 timestamp:Date.now()-7100000 },
        { from:'user_0', text:'Looking good! 🔥',                         timestamp:Date.now()-7000000 },
        { from:'user_2', text:'Can we do a shoot this weekend?',          timestamp:Date.now()-3600000 },
      ],
    },
    {
      id:'group_2', isGroup:true, groupName:'Travel Crew 🌍', memberIds:['user_1','user_5','user_9'], unread:0,
      messages:[
        { from:'user_1', text:'Next trip ideas?',                         timestamp:Date.now()-259200000 },
        { from:'user_5', text:'Japan! 🇯🇵',                               timestamp:Date.now()-259000000 },
        { from:'user_9', text:'+1 for Japan!',                           timestamp:Date.now()-258000000 },
      ],
    },
  ],

  /* ═══════════════════════ SUGGESTIONS ════════════════════════════ */
  suggestions: [
    { userId:'user_3', reason:'Followed by alex.rivera' },
    { userId:'user_5', reason:'Popular in Photography' },
    { userId:'user_6', reason:'Suggested for you' },
    { userId:'user_8', reason:'Followed by sofia.chen' },
    { userId:'user_9', reason:'You might know them' },
  ],

  /* ═══════════════════════ HIGHLIGHTS ════════════════════════════ */
  highlights: {
    'user_0': [
      { id:'hl_1', label:'Travel',  cover:'https://picsum.photos/60/60?random=101' },
      { id:'hl_2', label:'Food',    cover:'https://picsum.photos/60/60?random=102' },
      { id:'hl_3', label:'Friends', cover:'https://picsum.photos/60/60?random=103' },
    ],
    'user_1': [
      { id:'hl_4', label:'Porto',   cover:'https://picsum.photos/60/60?random=104' },
      { id:'hl_5', label:'Work',    cover:'https://picsum.photos/60/60?random=105' },
    ],
  },

  /* ═══════════════════════ STATE ══════════════════════════════════ */
  state: {
    currentPage:   'home',
    followedUsers: new Set(['user_1','user_2','user_3','user_4','user_5','user_6','user_7','user_8']),
  },

  /* ═══════════════════════ HELPERS ════════════════════════════════ */

  getUserById(id) {
    if (!id) return null;
    if (id === this.currentUser.id) return this.currentUser;
    return this.users.find(u => u.id === id) || null;
  },

  getUserByUsername(username) {
    if (!username) return null;
    if (username === this.currentUser.username) return this.currentUser;
    return this.users.find(u => u.username === username) || null;
  },

  getPostById(id) { return this.posts.find(p => p.id === id) || null; },

  getPostBySlug(slug) { return this.posts.find(p => p.slug === slug) || null; },

  getReelById(id) { return this.reels.find(r => r.id === id) || null; },

  getExplorePostById(id) { return this.explorePosts.find(p => p.id === id) || null; },

  getUsersWithStories() {
    const seen = new Set();
    return this.stories
      .filter(s => { if (seen.has(s.userId)) return false; seen.add(s.userId); return true; })
      .map(s => ({
        user:      this.getUserById(s.userId),
        stories:   this.stories.filter(st => st.userId === s.userId),
        allViewed: this.stories.filter(st => st.userId === s.userId).every(st => st.viewed),
      }))
      .filter(item => item.user);
  },

  getHighlightsForUser(userId) { return this.highlights[userId] || []; },

  isFollowing(userId) { return this.state.followedUsers.has(userId); },

  toggleFollow(userId) {
    if (this.state.followedUsers.has(userId)) this.state.followedUsers.delete(userId);
    else this.state.followedUsers.add(userId);
  },

  toggleLike(postId) {
    const p = this.getPostById(postId);
    if (!p) return;
    p.liked = !p.liked;
    p.likes += p.liked ? 1 : -1;
  },

  toggleSave(postId) {
    const p = this.getPostById(postId);
    if (p) p.saved = !p.saved;
  },

  addComment(postId, text) {
    const p = this.getPostById(postId);
    if (!p || !text.trim()) return;
    p.comments.push({ id:`c_${Date.now()}`, userId:this.currentUser.id, text:text.trim(), timestamp:Date.now() });
  },

  markStoryViewed(storyId) {
    const s = this.stories.find(st => st.id === storyId);
    if (s) s.viewed = true;
  },

  unreadNotificationsCount() {
    return this.notifications.filter(n => !n.read && n.type !== 'like').length;
  },

  unreadMessagesCount() {
    return this.messages.reduce((acc, t) => acc + (t.unread || 0), 0);
  },

  /* ── Unique URL generators ───────────────────────────────────── */

  genId(prefix = 'id') {
    return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`;
  },

  getPostUrl(postId) {
    const post = this.getPostById(postId);
    return `${window.location.origin}/p/${post?.slug || postId}`;
  },

  getProfileUrl(userId) {
    const user = this.getUserById(userId);
    return `${window.location.origin}/${user?.username || userId}`;
  },

  getReelUrl(reelId) {
    return `${window.location.origin}/reels/${reelId}`;
  },

  getStoryUrl(userId) {
    const user = this.getUserById(userId);
    return `${window.location.origin}/stories/${user?.username || userId}`;
  },

  getNotifUrl(notifId) {
    return `${window.location.origin}/notifications#notif-${notifId}`;
  },

  /* ── Formatting ─────────────────────────────────────────────── */

  formatCount(num) {
    if (!num) return '0';
    if (num >= 1000000) return (num / 1000000).toFixed(1).replace(/\.0$/, '') + 'M';
    if (num >= 1000)    return (num / 1000).toFixed(1).replace(/\.0$/, '') + 'K';
    return String(num);
  },

  timeAgo(timestamp) {
    if (!timestamp) return '';
    const s = Math.floor((Date.now() - timestamp) / 1000);
    if (s < 60)           return 'now';
    if (s < 3600)         return Math.floor(s / 60)   + 'm';
    if (s < 86400)        return Math.floor(s / 3600)  + 'h';
    if (s < 604800)       return Math.floor(s / 86400) + 'd';
    return Math.floor(s / 604800) + 'w';
  },

  formatFullDate(timestamp) {
    if (!timestamp) return '';
    return new Date(timestamp).toLocaleDateString('en-US', { month:'long', day:'numeric', year:'numeric' });
  },
};

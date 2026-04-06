/**
 * postcard.js — Redesigned Post Card + Bottom Sheet (comments & menu)
 */

/* ═══════════════════════════════════════════════════════════════
   BOTTOM SHEET ENGINE
═══════════════════════════════════════════════════════════════ */
var BottomSheet = (() => {
  let backdropEl=null, sheetEl=null, bodyEl=null;
  let startY=0, currentY=0, isDragging=false;

  function _build() {
    if (document.getElementById('bottom-sheet')) return;
    backdropEl = document.createElement('div');
    backdropEl.className = 'bottom-sheet-backdrop';
    backdropEl.id = 'bs-backdrop';
    backdropEl.addEventListener('click', close);

    sheetEl = document.createElement('div');
    sheetEl.className = 'bottom-sheet';
    sheetEl.id = 'bottom-sheet';
    sheetEl.innerHTML = `
      <div class="bottom-sheet-handle" id="bs-handle"></div>
      <div class="bottom-sheet-header" id="bs-header">
        <span class="bottom-sheet-title" id="bs-title"></span>
        <button class="bottom-sheet-close" onclick="BottomSheet.close()">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round">
            <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
          </svg>
        </button>
      </div>
      <div class="bottom-sheet-body" id="bs-body"></div>`;

    document.body.appendChild(backdropEl);
    document.body.appendChild(sheetEl);
    bodyEl = document.getElementById('bs-body');

    const handle = document.getElementById('bs-handle');
    handle.addEventListener('touchstart', e => { isDragging=true; startY=currentY=e.touches[0].clientY; sheetEl.style.transition='none'; }, {passive:true});
    sheetEl.addEventListener('touchmove', e => {
      if (!isDragging) return;
      const y = e.touches[0].clientY, diff = y - startY;
      if (diff > 0) { currentY=y; sheetEl.style.transform=`translateY(${diff}px)`; e.preventDefault(); }
    }, {passive:false});
    sheetEl.addEventListener('touchend', () => {
      if (!isDragging) return; isDragging=false; sheetEl.style.transition='';
      if (currentY - startY > 100) close(); else sheetEl.style.transform='';
    });
    handle.addEventListener('mousedown', e => {
      isDragging=true; startY=currentY=e.clientY; sheetEl.style.transition='none';
      const mm = ev => { if(!isDragging) return; const d=ev.clientY-startY; if(d>0){currentY=ev.clientY; sheetEl.style.transform=`translateY(${d}px)`;} };
      const mu = () => { isDragging=false; sheetEl.style.transition=''; if(currentY-startY>100) close(); else sheetEl.style.transform=''; window.removeEventListener('mousemove',mm); window.removeEventListener('mouseup',mu); };
      window.addEventListener('mousemove',mm); window.addEventListener('mouseup',mu);
    });
  }

  function open(title, content, opts={}) {
    _build();
    document.getElementById('bs-title').textContent = title;
    const hdr = document.getElementById('bs-header');
    if (hdr) hdr.style.display = opts.noHeader ? 'none' : '';
    bodyEl.innerHTML = content;
    backdropEl.classList.add('open'); sheetEl.classList.add('open');
    document.body.classList.add('no-scroll');
    if (opts.onOpen) setTimeout(opts.onOpen, 350);
  }

  function close() {
    if (!sheetEl) return;
    sheetEl.classList.remove('open'); backdropEl?.classList.remove('open');
    sheetEl.style.transform=''; document.body.classList.remove('no-scroll');
    // Remove any sticky input rows appended after body
    sheetEl.querySelectorAll('.sheet-comment-input-row').forEach(el => el.remove());
    setTimeout(() => { if (bodyEl) bodyEl.innerHTML=''; }, 350);
  }

  return { open, close };
})();

/* ═══════════════════════════════════════════════════════════════
   POST CARD
═══════════════════════════════════════════════════════════════ */
var PostCard = (() => {

  const RATIOS = { square:'1/1', portrait:'4/5', landscape:'16/9' };
  function _ratio(postId, imgCount) {
    if (imgCount > 1) return RATIOS.square;
    const h = postId.split('').reduce((a,c)=>a+c.charCodeAt(0),0);
    return RATIOS[['square','portrait','portrait','square','landscape','square','portrait'][h%7]];
  }

  function _esc(s) {
    if(!s) return '';
    return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  }

  function _cap(text) {
    return text.replace(/#(\w+)/g,'<span class="hashtag">#$1</span>').replace(/@(\w+)/g,'<span class="hashtag">@$1</span>');
  }

  /* ── Render ── */
  function render(postId) {
    const post = InstagramData.getPostById(postId);
    if (!post) return '';
    const user = InstagramData.getUserById(post.userId);
    if (!user) return '';
    const isLiked=post.liked, isSaved=post.saved;
    const multi=post.images.length>1;
    const isFollowing=InstagramData.isFollowing(post.userId);
    const userStories=InstagramData.stories.filter(s=>s.userId===post.userId);
    const hasStory=userStories.length>0, allViewed=hasStory&&userStories.every(s=>s.viewed);
    const storyClass=hasStory?(allViewed?'has-story-viewed':'has-story'):'';
    const ar=_ratio(postId,post.images.length);
    const vis=post.comments.slice(-2), hidden=post.comments.length-vis.length;
    const capFull=_esc(post.caption), capShort=capFull.length>125?capFull.substring(0,125)+'…':capFull;
    const needsTrunc=capFull.length>125;

    const followHtml=!isFollowing?`<span class="post-follow-dot"></span><span class="post-follow-btn" onclick="PostCard.handleFollow('${post.userId}',this)">Follow</span>`:'';

    // Comments are hidden in feed - click comment icon to view
    let commentsHtml='';
    if(post.comments.length>0) {
      commentsHtml=`<div class="post-view-comments" onclick="PostCard._commentClick('${postId}')">View all ${post.comments.length} comment${post.comments.length!==1?'s':''}</div>`;
    }

    return `<article class="post-card fade-in" id="post-${postId}" data-post-id="${postId}">
      <div class="post-header">
        <div class="post-header-left" onclick="App.navigateTo('profile','${user.id}')">
          <div class="post-avatar ${storyClass}">
            <img src="${user.avatar}" alt="${user.username}" loading="lazy" onerror="this.src='https://i.pravatar.cc/150?img=2'">
          </div>
          <div class="post-user-info">
            <span class="post-username">${user.username}${user.isVerified?`<span class="verified-icon">${Icons.verified}</span>`:''}</span>
            ${post.location?`<span class="post-location">${post.location}</span>`:''}
          </div>
        </div>
        <div class="post-header-right">
          ${followHtml}
          <div class="post-more-btn" onclick="PostCard.openMenu('${postId}')">${Icons.moreHorizontal}</div>
        </div>
      </div>

      <div class="post-media" id="media-${postId}">
        <div class="post-media-inner" style="aspect-ratio:${ar}" ondblclick="PostCard.doubleTapLike('${postId}',event)">
          <img class="post-media-img" id="img-${postId}-0" src="${post.images[0]}" alt="" loading="lazy" onerror="this.src='https://picsum.photos/600/600?random=99'">
          ${multi?`<span class="post-type-badge">${Icons.carousel}</span>`:''}
          <div class="double-tap-heart" id="dth-${postId}">${Icons.heartFilled}</div>
          ${multi?`<div class="carousel-dots">${post.images.map((_,i)=>`<div class="carousel-dot ${i===0?'active':''}" id="dot-${postId}-${i}"></div>`).join('')}</div><div class="carousel-prev-btn" onclick="PostCard.carouselNav('${postId}',-1)">${Icons.back}</div><div class="carousel-next-btn" onclick="PostCard.carouselNav('${postId}',1)">${Icons.forward}</div>`:''}
        </div>
      </div>

      <div class="post-actions">
        <div class="post-actions-left">
          <button class="post-action-btn post-like-btn ${isLiked?'liked':''}" id="like-btn-${postId}" onclick="PostCard.handleLike('${postId}')" aria-label="${isLiked?'Unlike':'Like'}">${isLiked?Icons.heartFilled:Icons.heart}</button>
          <button class="post-action-btn" onclick="PostCard.openComments('${postId}')" aria-label="Comment">${Icons.comment}</button>
          <button class="post-action-btn" onclick="PostCard.sharePost('${postId}')" aria-label="Share">${Icons.send}</button>
        </div>
        <button class="post-action-btn post-save-btn ${isSaved?'saved':''}" id="save-btn-${postId}" onclick="PostCard.handleSave('${postId}')">${isSaved?Icons.bookmarkFilled:Icons.bookmark}</button>
      </div>

      <div class="post-footer">
        <span class="post-likes-count" id="likes-${postId}">${InstagramData.formatCount(post.likes)} likes</span>
        <div class="post-caption" id="caption-${postId}">
          <span class="caption-username" onclick="App.navigateTo('profile','${user.id}')">${user.username}</span>
          <span class="caption-text"> ${_cap(capShort)}</span>
          ${needsTrunc?`<span class="caption-more" onclick="PostCard.expandCaption('${postId}','${encodeURIComponent(capFull)}')" > more</span>`:''}
        </div>
        ${commentsHtml}
        <span class="post-timestamp">${InstagramData.timeAgo(post.timestamp)}</span>
      </div>

      <div class="post-add-comment">
        <div class="post-comment-avatar"><img src="${InstagramData.currentUser.avatar}" alt="" loading="lazy" onerror="this.src='https://i.pravatar.cc/150?img=1'"></div>
        <div class="post-comment-input-wrap">
          <input class="post-comment-input" id="ci-${postId}" type="text" placeholder="Add a comment…"
                 oninput="PostCard.onCommentInput('${postId}',this)"
                 onkeydown="PostCard.onCommentKey('${postId}',event)"
                 onfocus="PostCard.focusToSheet('${postId}')">
          <button class="post-comment-emoji-btn" onclick="PostCard.insertEmoji('${postId}')">${Icons.emoji}</button>
          <span class="post-comment-post-btn" id="post-btn-${postId}" onclick="PostCard.submitComment('${postId}')">Post</span>
        </div>
      </div>
    </article>`;
  }

  function expandCaption(postId, encoded) {
    const full=decodeURIComponent(encoded);
    const el=document.getElementById(`caption-${postId}`);
    const post=InstagramData.getPostById(postId), user=InstagramData.getUserById(post?.userId);
    if(!el||!user) return;
    el.innerHTML=`<span class="caption-username" onclick="App.navigateTo('profile','${user.id}')">${user.username}</span> <span class="caption-text">${_cap(full)}</span>`;
  }

  /* ── Like/Save ── */
  function handleLike(postId) {
    InstagramData.toggleLike(postId);
    const post=InstagramData.getPostById(postId); if(!post) return;
    const btn=document.getElementById(`like-btn-${postId}`);
    if(btn){btn.classList.toggle('liked',post.liked);btn.innerHTML=post.liked?Icons.heartFilled:Icons.heart;btn.classList.add('heart-burst');btn.addEventListener('animationend',()=>btn.classList.remove('heart-burst'),{once:true});}
    const c=document.getElementById(`likes-${postId}`); if(c) c.textContent=`${InstagramData.formatCount(post.likes)} likes`;
  }

  function doubleTapLike(postId) {
    const h=document.getElementById(`dth-${postId}`);
    if(h){h.classList.remove('animate');void h.offsetWidth;h.classList.add('animate');h.addEventListener('animationend',()=>h.classList.remove('animate'),{once:true});}
    const post=InstagramData.getPostById(postId); if(!post?.liked) handleLike(postId);
  }

  function handleSave(postId) {
    InstagramData.toggleSave(postId);
    const post=InstagramData.getPostById(postId); if(!post) return;
    const btn=document.getElementById(`save-btn-${postId}`);
    if(btn){btn.classList.toggle('saved',post.saved);btn.innerHTML=post.saved?Icons.bookmarkFilled:Icons.bookmark;}
    showToast(post.saved?'Saved to collection':'Removed from saved');
  }

  /* ── Comments sheet ── */
  function openComments(postId, focusInput=false) {
    const post=InstagramData.getPostById(postId); if(!post) return;

    const listHtml = post.comments.length ? post.comments.map(c=>{
      const cu=InstagramData.getUserById(c.userId); if(!cu) return '';
      const isOwn=cu.id===InstagramData.currentUser.id;
      return `<div class="sheet-comment-item ${isOwn?'own':''}">
        <div class="sheet-comment-avatar" onclick="App.navigateTo('profile','${cu.id}');BottomSheet.close()">
          <img src="${cu.avatar}" alt="${cu.username}" loading="lazy" onerror="this.src='https://i.pravatar.cc/150?img=2'">
        </div>
        <div class="sheet-comment-content">
          <div class="sheet-comment-bubble">
            <div class="sheet-comment-username">${cu.username}${cu.isVerified?`<span style="width:12px;height:12px;display:inline-flex">${Icons.verified}</span>`:''}</div>
            <div class="sheet-comment-text">${_esc(c.text)}</div>
          </div>
          <div class="sheet-comment-meta">
            <span class="sheet-comment-time">${InstagramData.timeAgo(c.timestamp)}</span>
            
          </div>
        </div>
      </div>`;
    }).join('')
    : `<div class="sheet-comments-empty">${Icons.comment}<p>No comments yet. Be the first!</p></div>`;

    BottomSheet.open('Comments', `<div class="sheet-comments-list" id="bsc-list-${postId}">${listHtml}</div>`, {
      onOpen: () => { if(focusInput) document.getElementById(`bsc-field-${postId}`)?.focus(); }
    });

    const sheet=document.getElementById('bottom-sheet');
    if(sheet) {
      const row=document.createElement('div');
      row.className='sheet-comment-input-row';
      row.innerHTML=`
        <div class="sheet-comment-my-avatar"><img src="${InstagramData.currentUser.avatar}" alt="" loading="lazy" onerror="this.src='https://i.pravatar.cc/150?img=1'"></div>
        <input class="sheet-comment-field" id="bsc-field-${postId}" type="text" placeholder="Add a comment…"
               oninput="PostCard._bsInput(this,'${postId}')"
               onkeydown="if(event.key==='Enter'){PostCard.submitSheetComment('${postId}');event.preventDefault()}">
        <button class="sheet-comment-send-btn" id="bsc-send-${postId}" onclick="PostCard.submitSheetComment('${postId}')">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="white"><path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/></svg>
        </button>`;
      sheet.appendChild(row);
    }
  }

  function _bsInput(input, postId) {
    const btn=document.getElementById(`bsc-send-${postId}`);
    if(btn) btn.classList.toggle('active', input.value.trim().length>0);
  }

  function submitSheetComment(postId) {
    const input=document.getElementById(`bsc-field-${postId}`); if(!input) return;
    const text=input.value.trim(); if(!text) return;
    InstagramData.addComment(postId, text);
    input.value='';
    const btn=document.getElementById(`bsc-send-${postId}`); if(btn) btn.classList.remove('active');
    const list=document.getElementById(`bsc-list-${postId}`);
    if(list) {
      const cu=InstagramData.currentUser;
      const div=document.createElement('div');
      div.className='sheet-comment-item own fade-in';
      div.innerHTML=`<div class="sheet-comment-avatar"><img src="${cu.avatar}" alt="" loading="lazy"></div>
        <div class="sheet-comment-content">
          <div class="sheet-comment-bubble"><div class="sheet-comment-username">${cu.username}</div><div class="sheet-comment-text">${_esc(text)}</div></div>
          <div class="sheet-comment-meta"><span class="sheet-comment-time">now</span></div>
        </div>`;
      list.querySelector('.sheet-comments-empty')?.remove();
      list.appendChild(div);
      list.parentElement.scrollTop=list.parentElement.scrollHeight;
    }
    _refreshFooter(postId);
  }

  function _refreshFooter(postId) {
    const post=InstagramData.getPostById(postId); if(!post) return;
    const footer=document.querySelector(`#post-${postId} .post-footer`); if(!footer) return;
    const user=InstagramData.getUserById(post.userId);
    const capFull=_esc(post.caption), capShort=capFull.length>125?capFull.substring(0,125)+'…':capFull;
    const vis=post.comments.slice(-2), hidden=post.comments.length-vis.length;
    let h=`<span class="post-likes-count" id="likes-${postId}">${InstagramData.formatCount(post.likes)} likes</span>`;
    h+=`<div class="post-caption" id="caption-${postId}"><span class="caption-username" onclick="App.navigateTo('profile','${user?.id}')">${user?.username}</span> <span class="caption-text">${_cap(capShort)}</span></div>`;
    if(hidden>0) h+=`<div class="post-view-comments" onclick="PostCard.openComments('${postId}')">View all ${post.comments.length} comments</div>`;
    vis.forEach(c=>{const cu=InstagramData.getUserById(c.userId);if(!cu)return;h+=`<div class="post-comment-row"><span class="comment-username">${cu.username}</span> <span>${_esc(c.text)}</span></div>`;});
    h+=`<span class="post-timestamp">${InstagramData.timeAgo(post.timestamp)}</span>`;
    footer.innerHTML=h;
  }

  /* ── Inline comment box ── */
  function onCommentInput(postId, input) {
    const btn=document.getElementById(`post-btn-${postId}`);
    if(btn) btn.classList.toggle('visible', input.value.trim().length>0);
  }
  function onCommentKey(postId, event) {
    if(event.key==='Enter'&&!event.shiftKey){event.preventDefault();submitComment(postId);}
  }
  function focusToSheet(postId) {
    if(window.innerWidth<769){
      document.getElementById(`ci-${postId}`)?.blur();
      openComments(postId, true);
    }
  }
  function submitComment(postId) {
    const input=document.getElementById(`ci-${postId}`); if(!input) return;
    const text=input.value.trim(); if(!text) return;
    InstagramData.addComment(postId, text); input.value='';
    document.getElementById(`post-btn-${postId}`)?.classList.remove('visible');
    _refreshFooter(postId); showToast('Comment posted!');
  }
  function insertEmoji(postId) {
    const input=document.getElementById(`ci-${postId}`); if(!input) return;
    input.value+=['❤️','🔥','😍','🙌','✨','💯'][Math.floor(Math.random()*6)];
    input.focus(); onCommentInput(postId, input);
  }

  /* ── Menu sheet ── */
  function openMenu(postId) {
    const post=InstagramData.getPostById(postId); if(!post) return;
    const isFollowing=InstagramData.isFollowing(post.userId);
    const isOwn=post.userId===InstagramData.currentUser.id||post.userId==='user_0';

    const items=isOwn?[
      {icon:Icons.bookmark,label:'Archive',fn:`showToast('Archived');BottomSheet.close()`},
      {icon:Icons.settings,label:'Edit post',fn:`showToast('Edit coming soon');BottomSheet.close()`},
      {divider:true},
      {icon:Icons.close,label:'Delete post',fn:`PostCard.deletePost('${postId}');BottomSheet.close()`,danger:true},
      {divider:true},{icon:Icons.close,label:'Cancel',fn:`BottomSheet.close()`},
    ]:[
      {icon:Icons.bookmark,label:post.saved?'Unsave':'Save',fn:`PostCard.handleSave('${postId}');BottomSheet.close()`},
      {icon:Icons.send,label:'Share to…',fn:`PostCard.sharePost('${postId}');BottomSheet.close()`},
      {icon:Icons.link,label:'Copy link',fn:`PostCard.copyLink('${postId}');BottomSheet.close()`},
      {icon:Icons.moreHorizontal,label:'Go to post',fn:`PostCard.openModal('${postId}');BottomSheet.close()`},
      {divider:true},
      {icon:Icons.profile,label:isFollowing?'Unfollow':'Follow',fn:`PostCard.handleFollow('${post.userId}',null);BottomSheet.close()`},
      {divider:true},
      {icon:Icons.close,label:'Report',fn:`showToast('Reported. Thanks.');BottomSheet.close()`,danger:true},
      {divider:true},{icon:Icons.close,label:'Cancel',fn:`BottomSheet.close()`},
    ];

    const html=`<div class="sheet-menu-list">${items.map(item=>{
      if(item.divider) return '<div class="sheet-menu-divider"></div>';
      return `<div class="sheet-menu-item ${item.danger?'danger':''}" onclick="${item.fn}"><span class="sheet-menu-icon">${item.icon}</span><span class="sheet-menu-label">${item.label}</span></div>`;
    }).join('')}</div>`;

    BottomSheet.open('',html,{noHeader:true});
  }

  /* ── Follow ── */
  function handleFollow(userId) {
    InstagramData.toggleFollow(userId);
    const isF=InstagramData.isFollowing(userId);
    document.querySelectorAll('.post-follow-btn').forEach(btn=>{
      if(btn.getAttribute('onclick')?.includes(userId)){btn.textContent=isF?'Following':'Follow';btn.style.color=isF?'var(--text-secondary)':'var(--accent)';}
    });
    showToast(isF?'Following!':'Unfollowed');
  }

  /* ── Carousel ── */
  const _ci={};
  function carouselNav(postId, dir) {
    const post=InstagramData.getPostById(postId); if(!post) return;
    _ci[postId]=Math.max(0,Math.min(post.images.length-1,(_ci[postId]||0)+dir));
    const idx=_ci[postId];
    const img=document.getElementById(`img-${postId}-0`);
    if(img){img.style.opacity='0';img.style.transition='opacity 0.18s';img.src=post.images[idx];img.onload=()=>img.style.opacity='1';}
    post.images.forEach((_,i)=>{const d=document.getElementById(`dot-${postId}-${i}`);if(d)d.classList.toggle('active',i===idx);});
  }

  /* ── Share/Delete ── */
  function sharePost(postId) {
    if(navigator.share) navigator.share({title:'Instagram Post',url:window.location.href}).catch(()=>{});
    else copyLink(postId);
  }
  function copyLink(postId) {
    navigator.clipboard?.writeText(`${window.location.origin}/?p=${postId}`).then(()=>showToast('Link copied!'))||showToast('Link copied!');
  }
  function deletePost(postId) {
    const el=document.getElementById(`post-${postId}`);
    if(el){el.style.transition='0.25s ease';el.style.opacity='0';el.style.transform='scale(0.96)';setTimeout(()=>el.remove(),250);}
    showToast('Post deleted');
  }

  /* ── Modal ── */
  function openModal(postId) {
    const post=InstagramData.getPostById(postId), user=InstagramData.getUserById(post?.userId);
    if(!post||!user) return;
    const overlay=document.getElementById('post-modal-overlay'); if(!overlay) return;
    // Set hash URL for post: #post#slug
    if(post.slug) { if(typeof _setHash==='function') _setHash('#post#'+post.slug); else window.location.hash='#post#'+post.slug; }

    const cHtml=post.comments.map(c=>{
      const cu=InstagramData.getUserById(c.userId); if(!cu) return '';
      return `<div class="modal-comment-item fade-in">
        <div class="avatar avatar-sm"><img src="${cu.avatar}" alt="" onerror="this.src='https://i.pravatar.cc/150?img=2'"></div>
        <div class="modal-comment-content">
          <div class="modal-comment-text"><span class="comment-username">${cu.username}</span>${_esc(c.text)}</div>
          <div class="modal-comment-meta"><span class="modal-comment-time">${InstagramData.timeAgo(c.timestamp)}</span></div>
        </div>
      </div>`;
    }).join('');

    overlay.querySelector('.modal-content').innerHTML=`<div class="post-modal">
      <div class="post-modal-media">
        <button class="modal-close-btn" onclick="PostCard.closeModal()">${Icons.close}</button>
        <img src="${post.images[0]}" alt="" loading="lazy" onerror="this.src='https://picsum.photos/600/600?random=99'">
      </div>
      <div class="post-modal-sidebar">
        <div class="post-modal-header">
          <div class="avatar avatar-sm" style="cursor:pointer" onclick="App.navigateTo('profile','${user.id}');PostCard.closeModal()"><img src="${user.avatar}" alt="${user.username}" onerror="this.src='https://i.pravatar.cc/150?img=2'"></div>
          <div style="flex:1;min-width:0;cursor:pointer" onclick="App.navigateTo('profile','${user.id}');PostCard.closeModal()">
            <div style="font-size:14px;font-weight:700;display:flex;align-items:center;gap:4px">${user.username}${user.isVerified?`<span style="width:14px;height:14px;display:inline-flex">${Icons.verified}</span>`:''}</div>
            ${post.location?`<div style="font-size:12px;color:var(--text-secondary)">${post.location}</div>`:''}
          </div>
          <button class="post-action-btn" onclick="PostCard.openMenu('${postId}')">${Icons.moreHorizontal}</button>
        </div>
        <div class="post-modal-comments" id="modal-comments-${postId}">
          <div class="modal-comment-item">
            <div class="avatar avatar-sm"><img src="${user.avatar}" alt="" onerror="this.src='https://i.pravatar.cc/150?img=2'"></div>
            <div class="modal-comment-content"><div class="modal-comment-text"><span class="comment-username">${user.username}</span>${_esc(post.caption)}</div><div class="modal-comment-meta"><span class="modal-comment-time">${InstagramData.timeAgo(post.timestamp)}</span></div></div>
          </div>
          ${cHtml}
        </div>
        <div class="post-modal-actions">
          <div class="post-actions" style="padding:6px 4px 4px">
            <div class="post-actions-left">
              <button class="post-action-btn post-like-btn ${post.liked?'liked':''}" id="modal-like-${postId}" onclick="PostCard.handleLike('${postId}');this.classList.toggle('liked',InstagramData.getPostById('${postId}').liked);this.innerHTML=InstagramData.getPostById('${postId}').liked?Icons.heartFilled:Icons.heart">${post.liked?Icons.heartFilled:Icons.heart}</button>
              <button class="post-action-btn">${Icons.comment}</button>
              <button class="post-action-btn" onclick="PostCard.sharePost('${postId}')">${Icons.send}</button>
            </div>
            <button class="post-action-btn post-save-btn ${post.saved?'saved':''}" onclick="PostCard.handleSave('${postId}')">${post.saved?Icons.bookmarkFilled:Icons.bookmark}</button>
          </div>
        </div>
        <div class="post-modal-likes">${InstagramData.formatCount(post.likes)} likes</div>
        <div class="post-modal-timestamp">${InstagramData.formatFullDate(post.timestamp)}</div>
        <div class="post-modal-add-comment">
          <span class="modal-emoji-btn">${Icons.emoji}</span>
          <input type="text" placeholder="Add a comment…" id="modal-ci-${postId}" onkeydown="if(event.key==='Enter'){PostCard._mci('${postId}');event.preventDefault()}">
          <span class="modal-post-btn" onclick="PostCard._mci('${postId}')">Post</span>
        </div>
      </div>
    </div>`;

    overlay.classList.add('open'); document.body.classList.add('no-scroll');
  }

  function _mci(postId) {
    const input=document.getElementById(`modal-ci-${postId}`); if(!input) return;
    const text=input.value.trim(); if(!text) return;
    InstagramData.addComment(postId,text); input.value='';
    const container=document.getElementById(`modal-comments-${postId}`);
    if(container){
      const cu=InstagramData.currentUser;
      const div=document.createElement('div'); div.className='modal-comment-item fade-in';
      div.innerHTML=`<div class="avatar avatar-sm"><img src="${cu.avatar}" alt="" onerror="this.src='https://i.pravatar.cc/150?img=1'"></div><div class="modal-comment-content"><div class="modal-comment-text"><span class="comment-username">${cu.username}</span>${_esc(text)}</div><div class="modal-comment-meta"><span class="modal-comment-time">now</span></div></div>`;
      container.appendChild(div); container.scrollTop=container.scrollHeight;
    }
    _refreshFooter(postId);
  }

  function closeModal() {
    const overlay=document.getElementById('post-modal-overlay');
    if(overlay) overlay.classList.remove('open');
    document.body.classList.remove('no-scroll');
    // Restore URL
    if(window.location.hash.startsWith('#post#')) window.location.hash = '#home';
  }

  /* ── Comment click: sheet on mobile, modal on desktop ── */
  function _commentClick(postId) {
    if (window.innerWidth < 769) {
      openComments(postId, true);
    } else {
      openModal(postId);
      // After modal opens, focus comment input
      setTimeout(() => {
        const inp = document.getElementById(`modal-ci-${postId}`);
        if (inp) inp.focus();
      }, 300);
    }
  }

  return {
    render, expandCaption,
    handleLike, doubleTapLike, handleSave, handleFollow,
    openComments, openMenu, openModal, closeModal,
    _bsInput, submitSheetComment,
    onCommentInput, onCommentKey, focusToSheet, _commentClick,
    submitComment, insertEmoji,
    carouselNav, sharePost, copyLink, deletePost,
    _mci,
  };
})();

/* ═══════════════════════════════════════════════════════════════════════════
   MOBILE POST OVERLAY — Standardised full-screen post view for mobile
   Accessible from home, explore, profile pages
   ═══════════════════════════════════════════════════════════════════════════ */

var MobilePostOverlay = (() => {

  let _postId = null;

  function _ensure() {
    if (document.getElementById('mobile-post-overlay')) return;
    const el = document.createElement('div');
    el.id = 'mobile-post-overlay';
    el.innerHTML = '<div id="mpo-inner" style="display:flex;flex-direction:column;height:100%;overflow:hidden"></div>';
    document.body.appendChild(el);
  }

  function open(postId) {
    _ensure();
    _postId = postId;

    const post = InstagramData.getPostById(postId);
    const user = InstagramData.getUserById(post?.userId);
    if (!post || !user) return;

    const cu    = InstagramData.currentUser;
    const inner = document.getElementById('mpo-inner');
    if (!inner) return;

    // Build comments HTML
    const commentsHtml = post.comments.map(c => {
      const cu2 = InstagramData.getUserById(c.userId);
      if (!cu2) return '';
      return `
        <div class="mpo-comment-item">
          <div class="mpo-comment-avatar" onclick="App.navigateTo('profile','${cu2.id}');MobilePostOverlay.close()">
            <img src="${cu2.avatar}" alt="${cu2.username}" loading="lazy" onerror="this.src='https://i.pravatar.cc/150?img=2'">
          </div>
          <div class="mpo-comment-content">
            <div class="mpo-comment-text">
              <span class="cmt-user">${cu2.username}</span>${_e(c.text)}
            </div>
            <div class="mpo-comment-meta">
              <span class="mpo-comment-time">${InstagramData.timeAgo(c.timestamp)}</span>
              
            </div>
          </div>
          
        </div>`;
    }).join('');

    const hasCarousel = post.images.length > 1;
    const capFull = _e(post.caption);
    const capShort = capFull.length > 140 ? capFull.substring(0, 140) + '…' : capFull;

    inner.innerHTML = `
      <!-- Top bar -->
      <div class="mpo-topbar">
        <div class="mpo-back-btn" onclick="MobilePostOverlay.close()">
          <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><polyline points="15 18 9 12 15 6"/></svg>
        </div>
        <div class="mpo-user-info" onclick="App.navigateTo('profile','${user.id}');MobilePostOverlay.close()">
          <div class="mpo-avatar">
            <img src="${user.avatar}" alt="${user.username}" loading="lazy" onerror="this.src='https://i.pravatar.cc/150?img=2'">
          </div>
          <div>
            <div class="mpo-username">
              ${user.username}
              ${user.isVerified ? `<span style="width:13px;height:13px;display:inline-flex">${Icons.verified}</span>` : ''}
            </div>
            ${post.location ? `<div class="mpo-location">${post.location}</div>` : ''}
          </div>
        </div>
        <div class="mpo-more-btn" onclick="PostCard.openMenu('${postId}')">${Icons.moreHorizontal}</div>
      </div>

      <!-- Image -->
      <div class="mpo-image-wrap" ondblclick="MobilePostOverlay.doubleTapLike(event)">
        <img class="mpo-image" id="mpo-img" src="${post.images[0]}" alt=""
             loading="lazy" onerror="this.src='https://picsum.photos/600/600?random=99'">
        ${hasCarousel ? `<div class="mpo-carousel-dots" id="mpo-dots">${post.images.map((_,i)=>`<div class="carousel-dot ${i===0?'active':''}" id="mpo-dot-${i}"></div>`).join('')}</div>` : ''}
        <div class="mpo-dth" id="mpo-dth">${Icons.heartFilled}</div>
      </div>

      <!-- Actions -->
      <div class="mpo-actions">
        <div class="mpo-actions-left">
          <div class="mpo-action-btn ${post.liked?'liked':''}" id="mpo-like-btn" onclick="MobilePostOverlay.handleLike()" aria-label="Like">
            ${post.liked ? Icons.heartFilled : Icons.heart}
          </div>
          <div class="mpo-action-btn" onclick="MobilePostOverlay.focusComment()" aria-label="Comment">
            ${Icons.comment}
          </div>
          <div class="mpo-action-btn" onclick="PostCard.sharePost('${postId}')" aria-label="Share">
            ${Icons.send}
          </div>
        </div>
        <div class="mpo-action-btn ${post.saved?'saved':''}" id="mpo-save-btn" onclick="MobilePostOverlay.handleSave()" aria-label="Save">
          ${post.saved ? Icons.bookmarkFilled : Icons.bookmark}
        </div>
      </div>

      <!-- Likes -->
      <div class="mpo-likes" id="mpo-likes">${InstagramData.formatCount(post.likes)} likes</div>

      <!-- Caption -->
      <div class="mpo-caption">
        <span class="cap-user" onclick="App.navigateTo('profile','${user.id}');MobilePostOverlay.close()">${user.username}</span>
        <span>${_capFmt(capShort)}</span>
      </div>

      <!-- Scrollable comments -->
      <div class="mpo-comments-scroll" id="mpo-comments">
        ${commentsHtml || `<div style="padding:20px 14px;color:var(--text-muted);font-size:14px;text-align:center">No comments yet. Be the first!</div>`}
      </div>

      <!-- Timestamp -->
      <div class="mpo-timestamp">${InstagramData.formatFullDate(post.timestamp)}</div>

      <!-- Fixed comment bar -->
      <div class="mpo-comment-bar">
        <div class="mpo-my-avatar">
          <img src="${cu.avatar}" alt="" loading="lazy" onerror="this.src='https://i.pravatar.cc/150?img=1'">
        </div>
        <input class="mpo-comment-input" id="mpo-input" type="text"
               placeholder="Add a comment…"
               oninput="MobilePostOverlay.onInput(this)"
               onkeydown="if(event.key==='Enter'){MobilePostOverlay.submit();event.preventDefault()}">
        <div class="mpo-emoji-btn" onclick="MobilePostOverlay.addEmoji()">${Icons.emoji}</div>
        <span class="mpo-post-btn" id="mpo-post-btn" onclick="MobilePostOverlay.submit()">Post</span>
      </div>`;

    const overlay = document.getElementById('mobile-post-overlay');
    overlay.classList.add('open');
    document.body.classList.add('no-scroll');

    // Swipe down to close
    _attachSwipeClose(overlay);
  }

  function close() {
    const overlay = document.getElementById('mobile-post-overlay');
    if (overlay) overlay.classList.remove('open');
    document.body.classList.remove('no-scroll');
    _postId = null;
  }

  function handleLike() {
    if (!_postId) return;
    PostCard.handleLike(_postId);
    const post = InstagramData.getPostById(_postId);
    if (!post) return;
    const btn = document.getElementById('mpo-like-btn');
    if (btn) {
      btn.classList.toggle('liked', post.liked);
      btn.innerHTML = post.liked ? Icons.heartFilled : Icons.heart;
    }
    const likes = document.getElementById('mpo-likes');
    if (likes) likes.textContent = InstagramData.formatCount(post.likes) + ' likes';
  }

  function handleSave() {
    if (!_postId) return;
    PostCard.handleSave(_postId);
    const post = InstagramData.getPostById(_postId);
    if (!post) return;
    const btn = document.getElementById('mpo-save-btn');
    if (btn) {
      btn.classList.toggle('saved', post.saved);
      btn.innerHTML = post.saved ? Icons.bookmarkFilled : Icons.bookmark;
    }
  }

  function doubleTapLike(e) {
    const heart = document.getElementById('mpo-dth');
    if (heart) {
      heart.style.top = e.offsetY + 'px';
      heart.style.left = e.offsetX + 'px';
      heart.classList.remove('animate');
      void heart.offsetWidth;
      heart.classList.add('animate');
      heart.addEventListener('animationend', () => heart.classList.remove('animate'), { once: true });
    }
    const post = InstagramData.getPostById(_postId);
    if (!post?.liked) handleLike();
  }

  function focusComment() {
    document.getElementById('mpo-input')?.focus();
    document.getElementById('mpo-comments')?.scrollTo({ top: 999999, behavior: 'smooth' });
  }

  function onInput(input) {
    const btn = document.getElementById('mpo-post-btn');
    if (btn) btn.classList.toggle('visible', input.value.trim().length > 0);
  }

  let _carouselIdx = 0;

  function showCarouselImage(postId, idx) {
    _carouselIdx = idx;
    const post = InstagramData.getPostById(postId);
    if (!post) return;
    const img = document.getElementById('mpo-img');
    if (img) {
      img.style.opacity = '0';
      img.style.transition = 'opacity 0.18s';
      img.src = post.images[idx];
      img.onload = () => { img.style.opacity = '1'; };
    }
    // Update dots
    const dots = document.querySelectorAll('#mobile-post-overlay .mpo-carousel-dots .carousel-dot');
    dots.forEach((d, i) => d.classList.toggle('active', i === idx));
  }

  function submit() {
    const input = document.getElementById('mpo-input');
    if (!input) return;
    const text = input.value.trim();
    if (!text || !_postId) return;
    InstagramData.addComment(_postId, text);
    input.value = '';
    const btn = document.getElementById('mpo-post-btn');
    if (btn) btn.classList.remove('visible');

    const container = document.getElementById('mpo-comments');
    if (container) {
      const cu = InstagramData.currentUser;
      const div = document.createElement('div');
      div.className = 'mpo-comment-item fade-in';
      div.innerHTML = `
        <div class="mpo-comment-avatar"><img src="${cu.avatar}" alt="" loading="lazy"></div>
        <div class="mpo-comment-content">
          <div class="mpo-comment-text"><span class="cmt-user">${cu.username}</span>${_e(text)}</div>
          <div class="mpo-comment-meta"><span class="mpo-comment-time">now</span></div>
        </div>`;
      container.appendChild(div);
      container.scrollTop = container.scrollHeight;
    }
    showToast('Comment posted!');
  }

  function addEmoji() {
    const input = document.getElementById('mpo-input');
    if (!input) return;
    const emojis = ['❤️','🔥','😍','🙌','✨','💯'];
    input.value += emojis[Math.floor(Math.random() * emojis.length)];
    input.focus();
    onInput(input);
  }

  // Swipe down gesture to close
  function _attachSwipeClose(overlay) {
    let startY = 0;
    overlay.addEventListener('touchstart', e => {
      // Only allow swipe from topbar area to dismiss
      if (e.target.closest('.mpo-topbar')) startY = e.touches[0].clientY;
    }, { passive: true });
    overlay.addEventListener('touchend', e => {
      if (!startY) return;
      const dy = e.changedTouches[0].clientY - startY;
      if (dy > 60) close();
      startY = 0;
    }, { passive: true });
  }

  function _attachImageSwipe(postId) {
    const imgWrap = document.querySelector('.mpo-image-wrap');
    if (!imgWrap) return;
    const post = InstagramData.getPostById(postId);
    if (!post || post.images.length <= 1) return;

    let touchStartX = 0, touchStartY = 0;
    imgWrap.addEventListener('touchstart', e => {
      touchStartX = e.touches[0].clientX;
      touchStartY = e.touches[0].clientY;
    }, { passive: true });

    imgWrap.addEventListener('touchend', e => {
      const dx = e.changedTouches[0].clientX - touchStartX;
      const dy = Math.abs(e.changedTouches[0].clientY - touchStartY);
      if (Math.abs(dx) > 50 && dy < 40) {
        const post = InstagramData.getPostById(postId);
        if (!post) return;
        // Get current displayed image index from _mpoCarouselIdx
        const curIdx = MobilePostOverlay._carouselIdx || 0;
        if (dx < 0 && curIdx < post.images.length - 1) {
          MobilePostOverlay.showCarouselImage(postId, curIdx + 1);
        } else if (dx > 0 && curIdx > 0) {
          MobilePostOverlay.showCarouselImage(postId, curIdx - 1);
        }
      }
    }, { passive: true });
  }

  function _e(s) {
    if (!s) return '';
    return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  }

  function _capFmt(text) {
    return text
      .replace(/#(\w+)/g, '<span class="hashtag">#$1</span>')
      .replace(/@(\w+)/g, '<span class="hashtag">@$1</span>');
  }

  return { open, close, handleLike, handleSave, doubleTapLike, focusComment, onInput, submit, addEmoji, showCarouselImage, get _carouselIdx() { return _carouselIdx; } };
})();

// ── Override PostCard.openModal to use MobilePostOverlay on mobile ─────────
var _originalOpenModal = PostCard.openModal.bind(PostCard);
PostCard.openModal = function(postId) {
  if (window.innerWidth < 769) {
    MobilePostOverlay.open(postId);
  } else {
    _originalOpenModal(postId);
  }
};

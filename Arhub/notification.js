/**
 * notification.js — Notifications: follows, comments, DM requests (no likes)
 * DMs show as message requests with Accept button
 */

var NotificationManager = (() => {

  var activeFilter = 'all';

  function render() {
    var page = document.getElementById('page-notifications');
    if (!page) return;

    var notifs   = InstagramData.notifications;
    var now      = Date.now();
    var oneDay   = 86400000;
    var filtered = _applyFilter(notifs);

    var today    = filtered.filter(function(n){ return (now - n.timestamp) < oneDay; });
    var thisWeek = filtered.filter(function(n){ return (now - n.timestamp) >= oneDay && (now - n.timestamp) < 7 * oneDay; });
    var older    = filtered.filter(function(n){ return (now - n.timestamp) >= 7 * oneDay; });

    var chips = ['all','follows','comments','requests'].map(function(f) {
      var labels = { all:'All', follows:'Follows', comments:'Comments', requests:'Message Requests' };
      return '<div class="notif-filter-chip ' + (activeFilter === f ? 'active' : '') + '" onclick="NotificationManager.setFilter(\'' + f + '\')">' + labels[f] + '</div>';
    }).join('');

    var body = '';
    if (!filtered.length) {
      body = _renderEmpty();
    } else {
      if (today.length)    body += '<div class="notif-section"><div class="notif-section-title">Today</div>'    + today.map(_renderNotif).join('') + '</div>';
      if (thisWeek.length) body += '<div class="notif-section"><div class="notif-section-title">This week</div>' + thisWeek.map(_renderNotif).join('') + '</div>';
      if (older.length)    body += '<div class="notif-section"><div class="notif-section-title">Earlier</div>'   + older.map(_renderNotif).join('') + '</div>';
    }

    page.innerHTML =
      '<div class="notif-root">' +
        '<div class="notif-mobile-topbar">' +
          '<span class="notif-page-title">Notifications</span>' +
          '<span class="notif-mark-all" onclick="NotificationManager.markAllRead()">Mark all read</span>' +
        '</div>' +
        '<div class="notif-desktop-header">' +
          '<div style="display:flex;align-items:center;justify-content:space-between">' +
            '<h2>Notifications</h2>' +
            '<span class="notif-mark-all" onclick="NotificationManager.markAllRead()">Mark all as read</span>' +
          '</div>' +
        '</div>' +
        '<div class="notif-filter-bar">' + chips + '</div>' +
        body +
      '</div>';
  }

  function _renderNotif(n) {
    var user = InstagramData.getUserById(n.userId);
    if (!user) return '';

    var uName = '<span class="notif-username" onclick="App.navigateTo(\'profile\',\'' + user.id + '\')">' + user.username + '</span>';
    var timeStr = '<span class="notif-time">' + InstagramData.timeAgo(n.timestamp) + '</span>';

    var text = '';
    if (n.type === 'comment')   text = uName + ' commented: <em>"' + (n.text || '') + '"</em>';
    if (n.type === 'follow')    text = uName + ' started following you.';
    if (n.type === 'mention')   text = uName + ' mentioned you in a comment.';
    if (n.type === 'tag')       text = uName + ' tagged you in a photo.';
    if (n.type === 'dm')        text = uName + ' sent you a message request.';
    if (n.type === 'dm_accept') text = uName + ' accepted your message request.';

    var badgeClass = { comment:'comment', follow:'follow', mention:'comment', tag:'follow', dm:'comment', dm_accept:'follow' }[n.type] || 'follow';
    var badgeIcons = { comment: Icons.comment, follow: Icons.profile, dm: Icons.messenger, dm_accept: Icons.messenger };
    var badgeIcon  = badgeIcons[n.type] || badgeIcons[badgeClass] || Icons.notification;

    // Right side action
    var rightHtml = '';

    if (n.type === 'dm' || n.type === 'dm_request') {
      // DM request — show Accept + Decline buttons
      var accepted = n.accepted || false;
      if (accepted) {
        rightHtml =
          '<div style="display:flex;flex-direction:column;gap:6px;flex-shrink:0">' +
            '<button class="notif-follow-btn following" style="font-size:12px;padding:5px 12px">Accepted</button>' +
          '</div>';
      } else {
        rightHtml =
          '<div style="display:flex;flex-direction:column;gap:6px;flex-shrink:0">' +
            '<button class="notif-follow-btn" style="font-size:12px;padding:5px 12px" onclick="event.stopPropagation();NotificationManager.acceptDM(\'' + n.id + '\',\'' + n.userId + '\',this)">Accept</button>' +
            '<button class="notif-follow-btn following" style="font-size:12px;padding:5px 12px" onclick="event.stopPropagation();NotificationManager.declineDM(\'' + n.id + '\',this)">Decline</button>' +
          '</div>';
      }
    } else if (n.postId) {
      var post = InstagramData.getPostById(n.postId);
      if (post) {
        rightHtml =
          '<div class="notif-post-thumb" onclick="PostCard.openModal(\'' + n.postId + '\')">' +
            '<img src="' + post.images[0] + '" alt="" loading="lazy" onerror="this.src=\'https://picsum.photos/46/46?random=1\'">' +
          '</div>';
      }
    } else if (n.type === 'follow') {
      var isF = InstagramData.isFollowing(n.userId);
      rightHtml =
        '<button class="notif-follow-btn ' + (isF ? 'following' : '') + '" id="nf-' + n.id + '" onclick="event.stopPropagation();NotificationManager.handleFollow(\'' + n.userId + '\',\'' + n.id + '\')">' +
          (isF ? 'Following' : 'Follow') +
        '</button>';
    }

    return (
      '<div class="notif-item ' + (n.read ? '' : 'unread') + '" id="notif-' + n.id + '" onclick="NotificationManager.handleClick(\'' + n.id + '\',this)">' +
        '<div class="notif-avatar-wrap">' +
          '<img class="notif-avatar" src="' + user.avatar + '" alt="' + user.username + '" loading="lazy" onerror="this.src=\'https://i.pravatar.cc/150?img=2\'" onclick="event.stopPropagation();App.navigateTo(\'profile\',\'' + user.id + '\')">' +
          '<div class="notif-type-badge ' + badgeClass + '">' + badgeIcon + '</div>' +
        '</div>' +
        '<div class="notif-body">' +
          '<div class="notif-text">' + text + '</div>' +
          timeStr +
        '</div>' +
        rightHtml +
      '</div>'
    );
  }

  function _renderEmpty() {
    return (
      '<div class="notif-empty">' +
        '<div class="notif-empty-icon">' + Icons.notification + '</div>' +
        '<div class="notif-empty-title">No Notifications Yet</div>' +
        '<div class="notif-empty-sub">When people follow you or comment on your posts, you\'ll see it here.</div>' +
      '</div>'
    );
  }

  function _applyFilter(notifs) {
    var relevant = notifs.filter(function(n){ return n.type !== 'like'; });
    if (activeFilter === 'all')      return relevant;
    if (activeFilter === 'follows')  return relevant.filter(function(n){ return n.type === 'follow'; });
    if (activeFilter === 'comments') return relevant.filter(function(n){ return n.type === 'comment' || n.type === 'mention' || n.type === 'tag'; });
    if (activeFilter === 'requests') return relevant.filter(function(n){ return n.type === 'dm' || n.type === 'dm_request' || n.type === 'dm_accept'; });
    return relevant;
  }

  function setFilter(filter) {
    activeFilter = filter;
    render();
  }

  function handleClick(notifId, el) {
    var notif = InstagramData.notifications.find(function(n){ return n.id === notifId; });
    if (notif) notif.read = true;
    if (el) el.classList.remove('unread');
    if (notif && notif.postId) PostCard.openModal(notif.postId);
    else if (notif && notif.type === 'follow') App.navigateTo('profile', notif.userId);
    else if (notif && (notif.type === 'dm' || notif.type === 'dm_accept')) App.navigateTo('messages');
    App.updateBadges();
  }

  function handleFollow(userId, notifId) {
    InstagramData.toggleFollow(userId);
    var isF = InstagramData.isFollowing(userId);
    var btn = document.getElementById('nf-' + notifId);
    if (btn) { btn.textContent = isF ? 'Following' : 'Follow'; btn.classList.toggle('following', isF); }
    showToast(isF ? 'Following!' : 'Unfollowed');
  }

  function acceptDM(notifId, userId, btn) {
    var notif = InstagramData.notifications.find(function(n){ return n.id === notifId; });
    if (notif) { notif.accepted = true; notif.read = true; }
    // Open or create thread
    var thread = InstagramData.messages.find(function(t){ return !t.isGroup && t.participantId === userId; });
    if (!thread) {
      thread = { id: 'thread_' + Date.now(), isGroup: false, participantId: userId, messages: [], unread: 0 };
      InstagramData.messages.unshift(thread);
    }
    // Update button
    var wrap = btn.parentElement;
    if (wrap) wrap.innerHTML = '<button class="notif-follow-btn following" style="font-size:12px;padding:5px 12px">Accepted</button>';
    showToast('Message request accepted');
    App.updateBadges();
    setTimeout(function(){ App.navigateTo('messages'); }, 800);
  }

  function declineDM(notifId, btn) {
    var notif = InstagramData.notifications.find(function(n){ return n.id === notifId; });
    if (notif) { notif.read = true; InstagramData.notifications = InstagramData.notifications.filter(function(n){ return n.id !== notifId; }); }
    var row = btn.closest('.notif-item');
    if (row) { row.style.opacity = '0'; row.style.transition = '0.2s'; setTimeout(function(){ row.remove(); }, 200); }
    showToast('Request declined');
    App.updateBadges();
  }

  function markAllRead() {
    InstagramData.notifications.forEach(function(n){ n.read = true; });
    document.querySelectorAll('.notif-item.unread').forEach(function(el){ el.classList.remove('unread'); });
    App.updateBadges();
    showToast('All notifications marked as read');
  }

  function markRead(notifId) {
    var notif = InstagramData.notifications.find(function(n){ return n.id === notifId; });
    if (notif) notif.read = true;
    var el = document.getElementById('notif-' + notifId);
    if (el) el.classList.remove('unread');
    App.updateBadges();
  }

  function add(notification) {
    var newNotif = Object.assign({ id: 'n_' + Date.now(), read: false, timestamp: Date.now() }, notification);
    InstagramData.notifications.unshift(newNotif);
    App.updateBadges();
    return newNotif.id;
  }

  function scrollToNotif(notifId) {
    var el = document.getElementById('notif-' + notifId);
    if (el) { el.scrollIntoView({ behavior: 'smooth', block: 'center' }); }
  }

  return { render, setFilter, handleClick, handleFollow, acceptDM, declineDM, markAllRead, markRead, add, scrollToNotif };

})();

/**
 * server.js — Parqra SDK Wrapper for Spark v5
 * Unchanged from v4 except: getChats is already present (needed by updates.js)
 */

const Server = (() => {

  const _auth = new ParqraAuth();
  let _currentUser    = null;
  let _currentProfile = null;

  let _cvPool = [];
  const _getCanvas = () => _cvPool.pop() || document.createElement('canvas');
  const _retCanvas = (cv) => { cv.width = 1; cv.height = 1; if (_cvPool.length < 4) _cvPool.push(cv); };

  const db      = (t) => new ParqraDB(t);
  const storage = (b) => new ParqraStorage(b);

  const compressImage = async (file) => {
    const MAX_DIM = 1920;
    const bitmap = await createImageBitmap(file);
    let w = bitmap.width, h = bitmap.height;
    if (w > MAX_DIM || h > MAX_DIM) { const r = Math.min(MAX_DIM/w, MAX_DIM/h); w = Math.floor(w*r); h = Math.floor(h*r); }
    const canvas = _getCanvas(); canvas.width = w; canvas.height = h;
    const ctx = canvas.getContext('2d', { alpha: false, willReadFrequently: false });
    ctx.filter = 'contrast(1.04) saturate(1.05) brightness(1.02)';
    ctx.imageSmoothingEnabled = true; ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(bitmap, 0, 0, w, h); bitmap.close();
    let blob = await new Promise(res => canvas.toBlob(res, 'image/webp', 0.65));
    if (blob && blob.size > 200*1024) blob = await new Promise(res => canvas.toBlob(res, 'image/webp', 0.45));
    _retCanvas(canvas); return blob;
  };

  const uploadCompressedImage = async (file, bucket = 'spark_chat_imgs') => {
    try { const compressed = await compressImage(file); const res = await storage(bucket).upload(compressed); return res?.data?.url || null; }
    catch (e) { console.error('uploadCompressedImage:', e); return null; }
  };

  const uploadFile = async (file, bucket = 'spark_files') => {
    try { const res = await storage(bucket).upload(file); if (!res?.data?.url) return null; return { url: res.data.url, name: file.name, size: file.size, mime_type: file.type }; }
    catch (e) { console.error('uploadFile:', e); return null; }
  };

  // Auth
  const signUp = async (email, password, displayName, username, securityQuestions) => {
    const res = await _auth.signup(email, password, displayName, securityQuestions);
    if (res?.user) {
      await db('spark_profiles').create({ user_id: res.user.id, username: username.toLowerCase().trim(), display_name: displayName, email, bio: '', avatar_url: '', is_private: false, status_restricted_from: [], created_at: new Date().toISOString() });
      _currentUser = res.user;
    }
    return res;
  };
  const login         = async (email, password) => { const res = await _auth.login(email, password); if (res?.user) _currentUser = res.user; return res; };
  const logout        = async () => { try { await _auth.logout(); } catch (_) {} _currentUser = _currentProfile = null; };
  const validate      = ()          => _auth.validate();
  const getMe         = ()          => _auth.getUser();
  const isLoggedIn    = ()          => _auth.isLoggedIn();
  const forgotPassword = (e)        => _auth.forgotPassword(e);
  const verifyAnswer  = (e, q, a)   => _auth.verifySecurityAnswer(e, q, a);
  const resetPassword = (t, p)      => _auth.resetPassword(t, p);
  const changePassword = (o, n)     => _auth.changePassword(o, n);

  // Profiles
  const getProfile = async (userId) => {
    if (!userId) return null;
    try { const res = await db('spark_profiles').list({ search: userId, limit: '200' }); return (res.data||[]).find(r => r.data?.user_id === userId) || null; }
    catch { return null; }
  };
  const getProfileByUsername = async (username) => {
    if (!username) return null;
    const u = username.toLowerCase().trim();
    try { const res = await db('spark_profiles').list({ search: u, limit: '200' }); return (res.data||[]).find(r => r.data?.username === u) || null; }
    catch { return null; }
  };
  const isUsernameTaken = async (u) => !!(await getProfileByUsername(u));
  const updateProfile   = (recordId, data) => { if (!recordId) throw new Error('No record ID'); return db('spark_profiles').patch(recordId, data); };
  const uploadAvatar    = async (file) => { try { return await uploadCompressedImage(file, 'spark_avatars'); } catch { return null; } };

  // Chats
  const getChats = async (userId) => {
    if (!userId) return [];
    try { const res = await db('spark_chats').list({ search: userId, limit: '300', sort_by: 'updated_at', sort_order: 'desc' }); return (res.data||[]).filter(r => r.data?.participants?.includes(userId)); }
    catch { return []; }
  };
  const getDirectChats  = async (userId) => (await getChats(userId)).filter(r => r.data?.type === 'direct');
  const findDirectChat  = async (uid1, uid2) => {
    if (!uid1 || !uid2) return null;
    try { const res = await db('spark_chats').list({ search: uid1, limit: '300' }); return (res.data||[]).find(r => r.data?.type === 'direct' && r.data.participants?.includes(uid1) && r.data.participants?.includes(uid2)) || null; }
    catch { return null; }
  };
  const createDirectChat = async (pA, pB) => {
    const now = new Date().toISOString();
    const res = await db('spark_chats').create({ type: 'direct', participants: [pA.user_id, pB.user_id], participant_meta: { [pA.user_id]: { display_name: pA.display_name, username: pA.username, avatar_url: pA.avatar_url||'' }, [pB.user_id]: { display_name: pB.display_name, username: pB.username, avatar_url: pB.avatar_url||'' } }, messages: [], last_message: '', last_message_at: now, last_sender_id: pA.user_id, created_by: pA.user_id, created_at: now });
    return res?.data || null;
  };
  const getChatById = async (id) => { if (!id || id === 'undefined') return null; try { return (await db('spark_chats').get(id))?.data || null; } catch { return null; } };
  const sendChatMessage = async (chatId, msg) => {
    if (!chatId || chatId === 'undefined') throw new Error('Invalid chat ID');
    const rec = await getChatById(chatId); if (!rec) throw new Error('Chat not found');
    const messages = [...(rec.data?.messages||[]), msg];
    const now = new Date().toISOString();
    const preview = msg.msg_type === 'text' ? msg.message : msg.msg_type === 'image' ? '📷 Image' : msg.msg_type === 'video' ? '🎥 Video' : msg.msg_type === 'audio' ? '🎤 Audio' : msg.msg_type === 'poll' ? '📊 Poll' : msg.msg_type === 'file' ? `📎 File` : msg.message;
    await db('spark_chats').patch(chatId, { messages, last_message: preview, last_message_at: now, last_sender_id: msg.sender_id });
    return messages;
  };
  const addReaction   = async (chatId, msgTime, emoji, userId) => {
    if (!chatId || !msgTime || !emoji || !userId) return null;
    const rec = await getChatById(chatId); if (!rec) return null;
    const messages = (rec.data?.messages||[]).map(m => { if (m.time !== msgTime) return m; const r = {...(m.reactions||{})}; const u = r[emoji]||[]; r[emoji] = u.includes(userId) ? u.filter(id=>id!==userId) : [...u, userId]; if (!r[emoji].length) delete r[emoji]; return {...m, reactions: r}; });
    await db('spark_chats').patch(chatId, { messages }); return messages;
  };
  const editMessage   = async (chatId, msgTime, newText) => { if (!chatId||!msgTime) return null; const rec = await getChatById(chatId); if (!rec) return null; const messages = (rec.data?.messages||[]).map(m => m.time === msgTime ? {...m, message: newText, edited: true, edited_at: new Date().toISOString()} : m); await db('spark_chats').patch(chatId, { messages }); return messages; };
  const deleteMessage = async (chatId, msgTime) => { if (!chatId||!msgTime) return null; const rec = await getChatById(chatId); if (!rec) return null; const messages = (rec.data?.messages||[]).map(m => m.time === msgTime ? {...m, message: '', deleted: true, msg_type: 'deleted'} : m); await db('spark_chats').patch(chatId, { messages }); return messages; };
  const convertToGroup = async (chatId, groupName, newMembers) => { const rec = await getChatById(chatId); if (!rec) throw new Error('Chat not found'); const participants = [...(rec.data.participants||[])]; const participant_meta = {...(rec.data.participant_meta||{})}; for (const p of (newMembers||[])) { if (!participants.includes(p.user_id)) { participants.push(p.user_id); participant_meta[p.user_id] = {display_name: p.display_name, username: p.username, avatar_url: p.avatar_url||''}; } } await db('spark_chats').patch(chatId, {type:'group', name: groupName, description:'', avatar_url:'', color:'#0095f6', is_public: false, participants, participant_meta, member_count: participants.length}); return getChatById(chatId); };
  const addMember    = async (chatId, userId, meta) => { const rec = await getChatById(chatId); if (!rec||(rec.data.participants||[]).includes(userId)) return; const pm = {...(rec.data.participant_meta||{}), [userId]: meta}; return db('spark_chats').patch(chatId, { participants: [...rec.data.participants, userId], participant_meta: pm, member_count: rec.data.participants.length+1}); };
  const removeMember = async (chatId, userId) => { const rec = await getChatById(chatId); if (!rec) return; const p = (rec.data.participants||[]).filter(id=>id!==userId); const pm = {...(rec.data.participant_meta||{})}; delete pm[userId]; return db('spark_chats').patch(chatId, {participants: p, participant_meta: pm, member_count: p.length}); };

  // Communities
  const getCommunities   = async () => { try { const res = await db('spark_chats').list({ search: 'group', limit: '100', sort_by: 'created_at', sort_order: 'desc' }); return (res.data||[]).filter(r => r.data?.type === 'group'); } catch { return []; } };
  const createCommunity  = async (data) => { const now = new Date().toISOString(); const res = await db('spark_chats').create({ type: 'group', name: data.name, description: data.description||'', avatar_url: data.avatar_url||'', color: data.color||'#0095f6', is_public: data.is_public!==false, participants: data.participants||[data.created_by], participant_meta: data.participant_meta||{}, messages: [], last_message: '', last_message_at: now, member_count: (data.participants||[data.created_by]).length, created_by: data.created_by, created_at: now }); return res?.data || null; };
  const updateCommunity  = (chatId, data) => db('spark_chats').patch(chatId, data);
  const joinCommunity    = (id, uid, meta) => addMember(id, uid, meta);
  const leaveCommunity   = (id, uid)       => removeMember(id, uid);

  // Statuses
  const getStatuses  = async () => { try { const res = await db('spark_statuses').list({ limit: '500', sort_by: 'created_at', sort_order: 'desc' }); const now = Date.now(); return (res.data||[]).filter(r => r.data?.expires_at && new Date(r.data.expires_at) > now); } catch { return []; } };
  const createStatus = (d)    => db('spark_statuses').create(d);
  const deleteStatus = (id)   => id ? db('spark_statuses').delete(id) : Promise.resolve();
  const updateStatus = (id,d) => db('spark_statuses').patch(id, d);
  const viewStatus   = async (statusId, userId) => { if (!statusId||!userId) return; try { const rec = await db('spark_statuses').get(statusId); const data = rec?.data?.data||rec?.data; if (!data) return; const views = data.views||[]; if (views.includes(userId)) return; const u = [...views, userId]; await db('spark_statuses').patch(statusId, { views: u, view_count: u.length }); } catch {} };
  const likeStatus   = async (statusId, userId) => { if (!statusId||!userId) return null; try { const rec = await db('spark_statuses').get(statusId); const data = rec?.data?.data||rec?.data; if (!data) return null; const likes = data.likes||[]; const already = likes.includes(userId); const u = already ? likes.filter(id=>id!==userId) : [...likes, userId]; await db('spark_statuses').patch(statusId, { likes: u, like_count: u.length }); return { liked: !already, count: u.length }; } catch { return null; } };

  return {
    get currentUser()     { return _currentUser; },
    set currentUser(u)    { _currentUser = u; },
    get currentProfile()  { return _currentProfile; },
    set currentProfile(p) { _currentProfile = p; },
    compressImage, uploadCompressedImage, uploadFile,
    signUp, login, logout, validate, getMe, isLoggedIn, forgotPassword, verifyAnswer, resetPassword, changePassword,
    getProfile, getProfileByUsername, isUsernameTaken, updateProfile, uploadAvatar,
    getChats, getDirectChats, findDirectChat, createDirectChat, getChatById, sendChatMessage,
    addReaction, editMessage, deleteMessage, convertToGroup, addMember, removeMember,
    getCommunities, createCommunity, updateCommunity, joinCommunity, leaveCommunity,
    getStatuses, createStatus, deleteStatus, updateStatus, viewStatus, likeStatus,
    db, storage
  };
})();

import { CATEGORIES, nextReply, seedState } from "./seed.mjs";

export const STORAGE_KEY = "p5-showroom:v1";

export function createDemoStore(storage, clock = () => Date.now()) {
  let state;
  try {
    const saved = JSON.parse(storage?.getItem(STORAGE_KEY));
    if (saved?.version === 1 && [saved.users, saved.posts, saved.comments, saved.messages].every(Array.isArray)) state = saved;
  } catch { /* Private browsing can disable storage. The demo still works in memory. */ }
  state ||= seedState(clock());
  const save = () => { try { storage?.setItem(STORAGE_KEY, JSON.stringify(state)); } catch { /* In-memory fallback. */ } };
  const now = () => new Date(clock()).toISOString();
  const idFor = list => Math.max(0, ...list.map(item => item.id)) + 1;
  const member = id => state.users.find(user => user.id === Number(id));
  const current = () => member(state.currentUserID);
  const publicUser = user => user && { id: user.id, nickname: user.nickname, pfp: user.pfp };
  const reactionKey = (type, id) => `${state.currentUserID}:${type}:${id}`;
  const postDetails = post => ({ ...post, author: member(post.user_id)?.nickname || "Unknown", avatar: member(post.user_id)?.pfp || 1,
    comment_count: state.comments.filter(comment => comment.post_id === post.id).length,
    user_reaction: state.reactions[reactionKey("post", post.id)] || 0 });
  const commentDetails = comment => ({ ...comment, author: member(comment.user_id)?.nickname || "Unknown", avatar: member(comment.user_id)?.pfp || 1,
    user_reaction: state.reactions[reactionKey("comment", comment.id)] || 0 });
  const messageDetails = message => ({ ...message, sender_name: member(message.sender_id)?.nickname || "Unknown", sender_avatar: member(message.sender_id)?.pfp || 1 });
  const result = (body, status = 200) => ({ status, body });
  const error = (message, status = 400) => result({ status: "error", error: message }, status);
  const ok = data => result({ status: "ok", ...data });

  function appendMessage(senderID, receiverID, content) {
    const message = { id: idFor(state.messages), sender_id: senderID, receiver_id: receiverID, content, created_at: now(), is_read: false };
    state.messages.push(message);
    save();
    return messageDetails(message);
  }

  function request(method, path, data = {}, params = new URLSearchParams()) {
    if (path === "/api/current-user" && method === "GET") return ok({ user: publicUser(current()) });
    if (path === "/api/login" && method === "POST") {
      const identifier = String(data.identifier || "").trim().toLowerCase();
      const user = state.users.find(user => user.nickname.toLowerCase() === identifier || `${user.nickname.toLowerCase()}@demo.invalid` === identifier);
      if (!user || !data.password) return error("Try XMo, Futaba or Joker with any demo password.", 401);
      state.currentUserID = user.id;
      save();
      return ok({ user: publicUser(user) });
    }
    if (path === "/api/register" && method === "POST") {
      const nickname = String(data.nickname || "").trim();
      if (!nickname || nickname.length > 12) return error("Choose a nickname with 1–12 characters.");
      if (state.users.some(user => user.nickname.toLowerCase() === nickname.toLowerCase())) return error("That nickname is already taken.", 409);
      const pfp = Number(data.pfp);
      if (!Number.isInteger(pfp) || pfp < 1 || pfp > 9) return error("Choose one of the nine portraits.");
      // Real names, age, gender, email, and passwords are never stored in this demo.
      const user = { id: idFor(state.users), nickname, pfp };
      state.users.push(user);
      state.currentUserID = user.id;
      save();
      return result({ status: "ok", user: publicUser(user) }, 201);
    }
    if (path === "/api/logout" && method === "POST") {
      state.currentUserID = null;
      save();
      return ok({});
    }
    if (path === "/api/posts" && method === "GET") {
      return ok({ posts: [...state.posts].sort((a, b) => b.created_at.localeCompare(a.created_at) || b.id - a.id).map(postDetails) });
    }
    if (path === "/api/posts/" && method === "GET") {
      const post = state.posts.find(post => post.id === Number(params.get("id")));
      return post ? ok({ post: postDetails(post) }) : error("Calling card not found.", 404);
    }
    if (path === "/api/comments" && method === "GET") return ok({ comments: state.comments.filter(comment => comment.post_id === Number(params.get("post_id"))).map(commentDetails) });
    if (!current()) return result({ status: "session_expired", error: "Enter the demo to continue." }, 401);
    if (path === "/api/posts/create" && method === "POST") {
      const title = String(data.title || "").trim();
      const content = String(data.content || "").trim();
      const categories = [...new Set(Array.isArray(data.categories) ? data.categories : [])];
      if (!title || !content) return error("A headline and message are required.");
      if (new TextEncoder().encode(title).length > 256 || new TextEncoder().encode(content).length > 3000) return error("Your calling card is a little too long.");
      if (!categories.length || categories.some(category => !CATEGORIES.includes(category))) return error("Choose at least one valid category.");
      const post = { id: idFor(state.posts), user_id: current().id, title, content, categories, created_at: now(), like_count: 0, dislike_count: 0 };
      state.posts.push(post);
      save();
      return result({ status: "ok", post: postDetails(post) }, 201);
    }
    if (path === "/api/comments/create" && method === "POST") {
      const content = String(data.content || "").trim();
      const postID = Number(data.post_id);
      if (!state.posts.some(post => post.id === postID)) return error("Calling card not found.", 404);
      if (!content || new TextEncoder().encode(content).length > 3000) return error("Write a reply of up to 3000 characters.");
      const comment = { id: idFor(state.comments), user_id: current().id, post_id: postID, content, like_count: 0, dislike_count: 0 };
      state.comments.push(comment);
      save();
      return result({ status: "ok", comment: commentDetails(comment) }, 201);
    }
    if ((path === "/api/likes/post" || path === "/api/likes/comment") && method === "POST") {
      const type = path.endsWith("/post") ? "post" : "comment";
      const itemID = Number(data[`${type}_id`]);
      const item = (type === "post" ? state.posts : state.comments).find(item => item.id === itemID);
      const desired = Number(data.reaction_type);
      if (!item) return error("That item no longer exists.", 404);
      if (![1, -1].includes(desired)) return error("Invalid reaction.");
      const key = reactionKey(type, itemID);
      const previous = state.reactions[key] || 0;
      const next = previous === desired ? 0 : desired;
      if (previous === 1) item.like_count--;
      if (previous === -1) item.dislike_count--;
      if (next === 1) item.like_count++;
      if (next === -1) item.dislike_count++;
      state.reactions[key] = next;
      save();
      return ok({ like_count: item.like_count, dislike_count: item.dislike_count, user_reaction: next });
    }
    if (path === "/api/users" && method === "GET") {
      return ok({ users: state.users.filter(user => user.id !== current().id).map(user => ({ ...publicUser(user), online: user.id <= 3 })) });
    }
    if (path === "/api/users/online" && method === "GET") return ok({ online: Boolean(member(params.get("user_id"))) && Number(params.get("user_id")) <= 3 });
    if (path.startsWith("/api/members/") && method === "GET") {
      const user = member(path.slice("/api/members/".length));
      if (!user) return error("Member not found.", 404);
      const posts = state.posts.filter(post => post.user_id === user.id).sort((a, b) => b.created_at.localeCompare(a.created_at));
      return ok({ member: { id: user.id, nickname: user.nickname, avatar: user.pfp, online: user.id <= 3 || user.id === current().id,
        post_count: posts.length, comment_count: state.comments.filter(comment => comment.user_id === user.id).length,
        posts: posts.slice(0, 5).map(({ id, title }) => ({ id, title })) } });
    }
    if (path === "/api/messages/paginated" && method === "GET") {
      const peerID = Number(params.get("user_id"));
      const limit = Math.min(50, Math.max(1, Number(params.get("limit")) || 10));
      const offset = Math.max(0, Number(params.get("offset")) || 0);
      const messages = state.messages.filter(message => (message.sender_id === current().id && message.receiver_id === peerID) || (message.sender_id === peerID && message.receiver_id === current().id));
      messages.forEach(message => { if (message.receiver_id === current().id) message.is_read = true; });
      save();
      const end = Math.max(0, messages.length - offset);
      return ok({ messages: messages.slice(Math.max(0, end - limit), end).map(messageDetails), total: messages.length });
    }
    if (path === "/api/messages/send" && method === "POST") {
      const sent = send(Number(data.receiver_id), data.content);
      return sent ? ok({ message: sent }) : error("Choose a recipient and write a message.");
    }
    return error("Demo endpoint not found.", 404);
  }

  function send(receiverID, text) {
    const content = String(text || "").trim();
    if (!current() || !member(receiverID) || receiverID === current().id || !content || content.length > 500) return null;
    return appendMessage(current().id, receiverID, content);
  }
  function reply(senderID, receiverID = current()?.id) {
    if (!member(senderID) || !member(receiverID) || senderID === receiverID) return null;
    return appendMessage(senderID, receiverID, nextReply(state, senderID));
  }
  function enterAsXMo() { state.currentUserID = 1; save(); }
  function reset() { state = seedState(clock()); save(); }
  save();
  return { request, send, reply, current: () => publicUser(current()), enterAsXMo, reset };
}

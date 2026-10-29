import { el } from "../ui/dom.js";
import { renderInPostView } from "./inPostView.js";
import { renderCreatePostView } from "./createPostView.js";
import { wsManager, throttle } from "../utils/websocket.js";
import { CATEGORIES } from "../ui/categories.js";
import { notify } from "../ui/feedback.js";
import { openMemberDossier } from "./memberView.js";

export function renderForumView({ onLogout } = {}) {
	const wrap = el("div", "p5-forum-wrap p5-view p5-fade-in", { "data-view": "forum" });
	const lifecycle = new AbortController();
	const subscriptions = [];
	function listen(event, callback) {
		wsManager.on(event, callback);
		subscriptions.push(() => wsManager.off(event, callback));
	}

	// State for users and chat
	let users = [];
	let currentChatUser = null;
	let chatOffset = 0;
	let chatTotal = 0;
	let isLoadingMessages = false;
	let notificationCounts = {}; // Track unread messages per user

	// Top navigation bar
	const nav = el("header", "p5-nav-bar");
	const navLeft = el("div", "p5-nav-left");
	const navBrand = el("button", "p5-nav-brand", { type: "button", "aria-label": "Return to forum" });
	const phantomLogo = el("img", "p5-nav-phantom-logo", {
		src: "./assets/Phantom-Logo.png",
		alt: "Phantom Thieves logo",
	});
	const navTitle = el("div", "p5-nav-title-text", { text: "Forum" });
	navBrand.appendChild(phantomLogo);
	navBrand.appendChild(navTitle);
	navLeft.appendChild(navBrand);

	
	// Make brand clickable to return to feed
    navBrand.style.cursor = "pointer";
    navBrand.addEventListener("click", () => {
        showFeedView();
    });

	// Welcome User Box (Placeholder)
	const welcomeBox = el("div", "p5-nav-btn p5-welcome-box", {
		style: "cursor: default;"
	});
	// Get nickname from sessionStorage
	const userNickname = sessionStorage.getItem("p5-demo-userNickname") || 'User';
	const welcomeText = el("span", "p5-nav-btn-text", { text: `Welcome ${userNickname}` });
	welcomeBox.appendChild(welcomeText);

	// Notifications button
	const notificationsBtn = el("button", "p5-nav-btn p5-nav-btn--notifications", {
		type: "button",
	});
	const notificationBadge = el("span", "p5-notification-badge", { text: "0" });
	const notificationsIcon = el("img", "p5-nav-btn-icon", {
		src: "./assets/dmLogo.png",
		alt: "Notifications icon",
	});
	const notificationsText = el("span", "p5-nav-btn-text", { text: "Notifications" });
	notificationsBtn.appendChild(notificationBadge);
	notificationsBtn.appendChild(notificationsText);
	notificationsBtn.appendChild(notificationsIcon);

	navLeft.appendChild(welcomeBox);
	navLeft.appendChild(notificationsBtn);

	const navRight = el("div", "p5-nav-right");
	const logoutBtn = el("button", "p5-nav-logout", {
		type: "button",
		text: "Logout",
	});
	logoutBtn.addEventListener("click", async () => {
		// Disconnect WebSocket first
		wsManager.disconnect();
		
		try {
			// Call logout endpoint to clear server session
			await fetch('/api/logout', { method: 'POST' });
		} catch (error) {
			console.error('Error logging out:', error);
		}
		
		// Clear client-side session storage
		sessionStorage.removeItem("p5-demo-userId");
		sessionStorage.removeItem("p5-demo-userNickname");
		
		// Call parent logout handler to return to login page
		if (onLogout) onLogout();
	});
	navRight.appendChild(logoutBtn);

	nav.appendChild(navLeft);
	nav.appendChild(navRight);

	// Private messages sidebar (always visible on the left)
	const dmSidebar = el("aside", "p5-dm-sidebar");
	const dmHeader = el("div", "p5-dm-header");
	dmHeader.appendChild(el("div", "p5-dm-title", { text: "Private Messages" }));

	const dmList = el("div", "p5-dm-list");

	// Phone DM Modal (hidden by default)
	const phoneModal = el("div", "p5-phone-modal", { role: "dialog", "aria-modal": "true", "aria-labelledby": "phone-chat-name" });
	const phoneContent = el("div", "p5-phone-content");
	
	const phoneImg = el("img", "p5-phone-img", { 
		src: "./assets/phone-dm-tab.png", 
		alt: "Phone interface" 
	});

	// Chat overlay container (positioned on top of phone image)
	const chatOverlay = el("div", "p5-chat-overlay");
	
	// Chat header
	const chatHeader = el("div", "p5-chat-header");
	const chatUserName = el("span", "p5-chat-username", { id: "phone-chat-name", text: "" });
	const chatUserStatus = el("span", "p5-chat-status", { text: "" });
	chatHeader.appendChild(chatUserName);
	chatHeader.appendChild(chatUserStatus);
	
	// Chat messages container
	const chatMessagesContainer = el("div", "p5-chat-messages");
	
	// Chat input area
	const chatInputArea = el("div", "p5-chat-input-area");
	const chatInputWrapper = el("div", "p5-chat-input-wrapper");
	const chatInput = el("input", "p5-chat-input", {
		type: "text",
		placeholder: "Type a message...",
		maxlength: "500"
	});
	chatInput.setAttribute("aria-label", "Type a message");
	chatInputWrapper.appendChild(chatInput);
	const chatSendBtn = el("button", "p5-chat-send-btn");
	const chatSendImg = el("img", null, {
		src: "./assets/okButton.png",
		alt: "Send"
	});
	chatSendBtn.appendChild(chatSendImg);
	chatInputArea.appendChild(chatInputWrapper);
	chatInputArea.appendChild(chatSendBtn);
	
	// Offline warning
	const offlineWarning = el("div", "p5-chat-offline-warning", { 
		text: "Offline" 
	});
	offlineWarning.style.display = "none";
	
	chatOverlay.appendChild(chatHeader);
	chatOverlay.appendChild(chatMessagesContainer);
	chatOverlay.appendChild(offlineWarning);
	chatOverlay.appendChild(chatInputArea);

	// Close Button (X)
	const closeBtn = el("button", "p5-dm-close-btn", { type: "button", text: "X", "aria-label": "Close conversation" });
	const chatTools = el("div", "p5-chat-tools");
	chatTools.appendChild(closeBtn);
	let phonePreviousFocus;
	
	const closePhoneModal = () => {
		const chatUserID = currentChatUser?.id;
		phoneModal.classList.remove("is-active");
		currentChatUser = null;
		chatOffset = 0;
		nav.inert = dmSidebar.inert = main.inert = false;
		const restoreFocus = phonePreviousFocus?.isConnected ? phonePreviousFocus : dmList.querySelector(`[data-user-id="${chatUserID}"] .p5-dm-open`) || navBrand;
		restoreFocus.focus({ preventScroll: true });
		// Wait for transition then remove from DOM
		setTimeout(() => {
			if (!phoneModal.classList.contains("is-active") && phoneModal.parentNode) {
				phoneModal.parentNode.removeChild(phoneModal);
			}
		}, 600);
	};

	const openPhoneModal = async (user) => {
		phonePreviousFocus = document.activeElement;
		dmSidebar.classList.remove("is-mobile-open");
		user = users.find(candidate => candidate.id === user.id) || user;
		currentChatUser = user;
		chatOffset = 0;
		
		// Update chat header
		chatUserName.textContent = user.nickname;
		chatUserStatus.textContent = user.online ? "Online" : "Offline";
		chatUserStatus.className = `p5-chat-status ${user.online ? "online" : "offline"}`;
		
		offlineWarning.style.display = user.online ? "none" : "block";
		chatInputArea.style.display = user.online ? "flex" : "none";
		
		// Clear messages and load initial batch
		chatMessagesContainer.innerHTML = "";
		await loadMessages();
		
		// Clear notification count for this user
		notificationCounts[user.id] = 0;
		updateNotificationBadge();
		renderUserList(); // Re-render to update the badge visibility
		
		wrap.appendChild(phoneModal);
		phoneModal.getBoundingClientRect();
		phoneModal.classList.add("is-active");
		nav.inert = dmSidebar.inert = main.inert = true;
		(user.online ? chatInput : closeBtn).focus({ preventScroll: true });
		
		// Scroll to bottom
		chatMessagesContainer.scrollTop = chatMessagesContainer.scrollHeight;
	};

	// Load messages with pagination
	async function loadMessages(prepend = false) {
		if (!currentChatUser || isLoadingMessages) return;
		
		isLoadingMessages = true;
		
		try {
			const response = await fetch(
				`/api/messages/paginated?user_id=${currentChatUser.id}&limit=10&offset=${chatOffset}`
			);
			const data = await response.json();
			
			if (data.status === "ok" && data.messages) {
				chatTotal = data.total;
				
				if (prepend && data.messages.length > 0) {
					// Prepend older messages
					const oldScrollHeight = chatMessagesContainer.scrollHeight;
					
					data.messages.forEach((msg, index) => {
						const msgEl = createMessageElement(msg);
						if (chatMessagesContainer.firstChild) {
							chatMessagesContainer.insertBefore(msgEl, chatMessagesContainer.firstChild);
						} else {
							chatMessagesContainer.appendChild(msgEl);
						}
					});
					
					// Maintain scroll position
					chatMessagesContainer.scrollTop = chatMessagesContainer.scrollHeight - oldScrollHeight;
				} else {
					// Initial load - append messages
					data.messages.forEach(msg => {
						chatMessagesContainer.appendChild(createMessageElement(msg));
					});
				}
				
				chatOffset += data.messages.length;
			}
		} catch (error) {
			console.error("Error loading messages:", error);
		}
		
		isLoadingMessages = false;
	}

	// Create message element
	function createMessageElement(msg) {
		const currentUserId = parseInt(sessionStorage.getItem("p5-demo-userId"));
		const isMine = msg.sender_id === currentUserId;
		
		const msgWrapper = el("div", `p5-chat-message-wrapper ${isMine ? "mine" : "theirs"}`);
		msgWrapper.dataset.msgId = msg.id;
		
		// Get avatar from message data (from database)
		const pfpNum = msg.sender_avatar || 1;
		const avatarSrc = `./assets/pfp/pfp${pfpNum}.png`;
		
		const avatar = el("img", "p5-chat-message-avatar", {
			src: avatarSrc,
			alt: `${msg.sender_name} avatar`
		});
		
		// Outer wrapper with white background
		const msgBoxWrapper = el("div", "p5-chat-message-box-wrapper");
		
		const msgEl = el("div", `p5-chat-message ${isMine ? "mine" : "theirs"}`);
		
		const msgHeader = el("div", "p5-chat-message-header");
		const msgSender = el("span", "p5-chat-message-sender", { text: msg.sender_name });
		const msgTime = el("span", "p5-chat-message-time", { text: formatMessageTime(msg.created_at) });
		msgHeader.appendChild(msgSender);
		msgHeader.appendChild(msgTime);
		
		const msgContent = el("div", "p5-chat-message-content", { text: msg.content });
		
		msgEl.appendChild(msgHeader);
		msgEl.appendChild(msgContent);
		
		msgBoxWrapper.appendChild(msgEl);
		
		if (isMine) {
			msgWrapper.appendChild(msgBoxWrapper);
			msgWrapper.appendChild(avatar);
		} else {
			msgWrapper.appendChild(avatar);
			msgWrapper.appendChild(msgBoxWrapper);
		}
		
		return msgWrapper;
	}

	// Format message time
	function formatMessageTime(dateStr) {
		const date = new Date(dateStr);
		const now = new Date();
		const isToday = date.toDateString() === now.toDateString();
		
		if (isToday) {
			return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
		} else {
			return date.toLocaleDateString([], { month: "short", day: "numeric" }) + 
				" " + date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
		}
	}

	// Throttled scroll handler for loading more messages
	const handleScroll = throttle(() => {
		// Trigger when near top (within 150px) or at exact top
		if (chatMessagesContainer.scrollTop <= 150 && chatOffset < chatTotal && !isLoadingMessages) {
			loadMessages(true);
		}
	}, 50);

	// Also add a direct check for when scrollTop hits 0 (immediate load)
	chatMessagesContainer.addEventListener("scroll", handleScroll);

	// Send message handler
	async function sendMessage() {
		const content = chatInput.value.trim();
		if (!content || !currentChatUser) return;
		
		// Check if user has valid session
		const currentUserId = parseInt(sessionStorage.getItem("p5-demo-userId"));
		if (!currentUserId) {
			if (window.handleSessionExpired) {
				window.handleSessionExpired();
			}
			return;
		}
		
		// Send via WebSocket
		const success = wsManager.sendChatMessage(currentChatUser.id, content);
		if (success) {
			chatInput.value = "";
			// Re-fetch users to update sorting by latest message
			fetchUsers();
		}
	}

	chatSendBtn.addEventListener("click", sendMessage);
	chatInput.addEventListener("keypress", (e) => {
		if (e.key === "Enter") {
			sendMessage();
		}
	});

	closeBtn.addEventListener("click", closePhoneModal);
	
	phoneModal.addEventListener("click", (event) => {
		if (event.target === phoneModal) {
			closePhoneModal();
		}
	});
	phoneModal.addEventListener("keydown", event => {
		if (event.key === "Escape") { event.preventDefault(); closePhoneModal(); }
		if (event.key !== "Tab") return;
		const focusable = [...phoneModal.querySelectorAll("button, input")].filter(node => node.getClientRects().length && !node.disabled);
		const first = focusable[0];
		const last = focusable.at(-1);
		if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
		else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
	});
	
	phoneContent.appendChild(phoneImg);
	phoneContent.appendChild(chatOverlay);
	phoneContent.appendChild(chatTools);
	phoneModal.appendChild(phoneContent);

	// Function to render user list
	function renderUserList() {
		dmList.innerHTML = "";
		
		// Sort users: online first, then offline
		const sortedUsers = [...users].sort((a, b) => {
			if (a.online === b.online) return 0;
			return a.online ? -1 : 1;
		});
		
		sortedUsers.forEach((user) => {
			const status = user.online ? "online" : "offline";
			const row = el("div", `p5-dm-user p5-dm-user--${status}`, {
				"data-user-id": user.id
			});

			const statusDot = el("span", "p5-dm-status-dot", {
				"aria-label": status,
				role: "status",
			});
			
			const pfpNum = user.pfp || 1;
			const avatar = el("img", "p5-dm-avatar", {
				src: `./assets/pfp/pfp${pfpNum}.png`,
				alt: `${user.nickname} avatar`,
			});
			
			const name = el("button", "p5-dm-name p5-member-link", { type: "button", text: user.nickname, title: `View ${user.nickname}'s dossier` });
			name.addEventListener("click", () => showMember(user.id));
			const portraitButton = el("button", "p5-dm-portrait-button", { type: "button", "aria-label": `View ${user.nickname}'s dossier` });
			portraitButton.appendChild(avatar);
			portraitButton.addEventListener("click", () => showMember(user.id));
			
			// Notification badge for unread messages
			const unreadCount = notificationCounts[user.id] || 0;
			const unreadBadge = el("span", "p5-dm-unread-badge", { 
				text: unreadCount.toString() 
			});
			if (unreadCount === 0) {
				unreadBadge.style.display = "none";
			}

			const dmButton = el("button", "p5-dm-open", {
				type: "button",
				"aria-label": `Open DM with ${user.nickname}`,
			});
			
			dmButton.addEventListener("click", () => {
				openPhoneModal(user);
			});

			const dmIcon = el("img", "p5-dm-icon", {
				src: "./assets/dmLogo.png",
				alt: "Direct message",
			});
			dmButton.appendChild(dmIcon);

			row.appendChild(statusDot);
			row.appendChild(portraitButton);
			row.appendChild(name);
			row.appendChild(unreadBadge);
			row.appendChild(dmButton);
			dmList.appendChild(row);
		});
	}

	// Fetch users from API
	async function fetchUsers() {
		try {
			const response = await fetch("/api/users");
			if (response.status === 401) {
				if (window.handleSessionExpired) {
					window.handleSessionExpired();
				}
				return;
			}
			const data = await response.json();
			
			if (data.status === "ok" && data.users) {
				users = data.users;
				renderUserList();
			}
		} catch (error) {
			console.error("Error fetching users:", error);
		}
	}

	// Update notification badge in nav
	function updateNotificationBadge() {
		const totalUnread = Object.values(notificationCounts).reduce((a, b) => a + b, 0);
		notificationBadge.textContent = totalUnread.toString();
		notificationBadge.style.display = totalUnread > 0 ? "flex" : "none";
	}

	// All Morgana notices share the same component, size, and dismissal behaviour.
	let dismissMessageNotice;
	function showP5Notification(senderName) {
		dismissMessageNotice = notify(`You have received a message from ${senderName}.`, "message");
	}

	// WebSocket event handlers
	function setupWebSocket() {
		// Register all event handlers BEFORE connecting
		listen("chat", (msg) => {
			const currentUserId = parseInt(sessionStorage.getItem("p5-demo-userId"));
			
			// If chat is open with this user, add message
			if (currentChatUser && 
				(msg.sender_id === currentChatUser.id || msg.receiver_id === currentChatUser.id)) {
				
				// Check if message already exists (avoid duplicates)
				const existingMsg = chatMessagesContainer.querySelector(`[data-msg-id="${msg.id}"]`);
				if (!existingMsg) {
					const msgEl = createMessageElement(msg);
					msgEl.setAttribute("data-msg-id", msg.id);
					chatMessagesContainer.appendChild(msgEl);
					chatMessagesContainer.scrollTop = chatMessagesContainer.scrollHeight;
				}
				// Re-fetch users to update sorting by latest message
				fetchUsers();
			} else if (msg.sender_id !== currentUserId) {
				// Message from someone else when chat not open - increment notification
				notificationCounts[msg.sender_id] = (notificationCounts[msg.sender_id] || 0) + 1;
				updateNotificationBadge();
				// Re-fetch users to update sorting by latest message
				fetchUsers();
				
				// Show Persona 5 notification popup
				showP5Notification(msg.sender_name);
			}
		});
		
		listen("online_status", (data) => {
			const dossierStatus = document.querySelector(`[data-member-status="${data.user_id}"]`);
			if (dossierStatus) {
				dossierStatus.textContent = data.online ? "ONLINE NOW" : "OFFLINE";
				dossierStatus.classList.toggle("is-online", data.online);
			}
			// Update user status
			const user = users.find(u => u.id === data.user_id);
			if (user) {
				user.online = data.online;
				renderUserList();
				
				// Update chat header if this is the current chat user
				if (currentChatUser && currentChatUser.id === data.user_id) {
					currentChatUser.online = data.online;
					chatUserStatus.textContent = data.online ? "Online" : "Offline";
					chatUserStatus.className = `p5-chat-status ${data.online ? "online" : "offline"}`;
					offlineWarning.style.display = data.online ? "none" : "block";
					chatInputArea.style.display = data.online ? "flex" : "none";
				}
			} else if (data.online) {
				// New user came online, refresh user list
				fetchUsers();
			}
		});
		
		listen("notification", (data) => {
			if (data.notification_type === "new_message") {
				// Already handled by chat event
			}
		});
		
		listen("error", (data) => {
			if (data.error) {
				notify(data.error, "error");
			}
		});
		
		// Now connect after all handlers are registered
		wsManager.connect();
	}

	// Initialize - setup WebSocket (registers handlers then connects)
	// Register the connected listener first
	listen("connected", () => {
		setTimeout(() => {
			fetchUsers();
		}, 200);
	});
	
	// Now setup WebSocket (which calls connect)
	setupWebSocket();
	
	if (wsManager.isConnected) {
		fetchUsers();
	}

	dmSidebar.appendChild(dmHeader);
	dmSidebar.appendChild(dmList);

	// The artwork stays fixed while only the reading surface changes.
	const main = el("main", "p5-main-area");
	const fadeOverlay = el("div", "p5-page-cut", { "aria-hidden": "true" });
	const wipePanel = el("div", "p5-page-cut-panel");
	fadeOverlay.appendChild(wipePanel);
	const stage = el("div", "p5-content-stage");
	const feedContainer = el("div", "p5-feed-container");
	const board = el("section", "p5-request-board", { "aria-label": "Filter calling cards" });
	const boardHeading = el("div", "p5-request-heading");
	const boardTitle = el("h1", null, { text: "Request board" });
	const boardCount = el("span", "p5-request-count", { "aria-live": "polite" });
	boardHeading.append(boardTitle, boardCount);
	const tabs = el("div", "p5-request-tabs", { role: "group", "aria-label": "Post category" });
	const feedList = el("div", "p5-feed-list");
	let currentPosts = [];
	let currentCategory = "All";
	let currentView = "feed";
	let navigationVersion = 0;
	let cutAnimation;
	let cutVersion = 0;
	let feedScroll = 0;
	const createBtnWrap = el("div", "p5-create-btn-wrap");
	const createBtn = el("button", "p5-create-btn", { type: "button" });
	createBtn.appendChild(el("span", null, { text: "Create Post" }));
	createBtn.addEventListener("click", showCreatePostView);
	createBtnWrap.appendChild(createBtn);
	for (const category of ["All", ...CATEGORIES]) {
		const tab = el("button", "p5-request-tab", { type: "button", text: category === "All" ? "All cards" : category, "aria-pressed": String(category === "All") });
		tab.dataset.category = category;
		tab.addEventListener("click", () => setCategory(category));
		tabs.appendChild(tab);
	}
	board.append(boardHeading, tabs);
	feedContainer.append(board, feedList);
	stage.appendChild(feedContainer);
	main.append(stage, createBtnWrap);

	function setCategory(category) {
		++navigationVersion;
		currentCategory = category;
		for (const tab of tabs.children) tab.setAttribute("aria-pressed", String(tab.dataset.category === category));
		refreshFeed();
		main.scrollTop = 0;
	}
	function mapPost(post) {
		return {
			id: post.id, userID: post.user_id, author: post.author,
			avatar: `./assets/pfp/pfp${post.avatar || 1}.png`,
			categories: post.categories || [], title: post.title, desc: post.content,
			likes: post.like_count || 0, dislikes: post.dislike_count || 0,
			commentCount: post.comment_count || 0, comments: [], user_reaction: post.user_reaction || 0,
		};
	}
	async function loadPosts() {
		try {
			const response = await fetch("/api/posts");
			const data = await response.json();
			if (!response.ok || data.status !== "ok") throw new Error(data.error || "Couldn't fetch the calling cards.");
			currentPosts = (data.posts || []).map(mapPost);
			refreshFeed();
			return true;
		} catch (error) {
			notify(error.message || "We lost the connection to the board.", "error");
			return false;
		}
	}

	function showMember(userID) {
		if (!userID) return;
		dmSidebar.classList.remove("is-mobile-open");
		openMemberDossier(userID, {
			host: wrap,
			onMessage: openPhoneModal,
			onPost: async id => {
				let post = currentPosts.find(candidate => candidate.id === id);
				if (!post) {
					try {
						const response = await fetch(`/api/posts/?id=${id}`);
						const data = await response.json();
						if (!response.ok || !data.post) throw new Error(data.error || "This calling card is unavailable.");
						post = mapPost(data.post);
					} catch (error) { notify(error.message, "error"); return; }
				}
				showInPostView(post);
			},
		});
	}
	function memberButton(className, author, userID, child) {
		const button = el("button", `${className} p5-member-link`, { type: "button", "aria-label": `View ${author}'s dossier` });
		if (child) button.appendChild(child); else button.textContent = author;
		button.addEventListener("click", event => { event.stopPropagation(); showMember(userID); });
		return button;
	}
	function buildFeedContent(posts) {
		return posts.map(post => {
			const card = el("article", "p5-feed-post", { tabindex: "0", "aria-label": `Open post: ${post.title}` });
			card.dataset.postId = post.id;
			card.addEventListener("click", () => showInPostView(post));
			card.addEventListener("keydown", event => {
				if (event.target === card && (event.key === "Enter" || event.key === " ")) { event.preventDefault(); showInPostView(post); }
			});
			const inner = el("div", "p5-feed-post-inner");
			const avatarWrap = memberButton("p5-feed-avatar-wrap", post.author, post.userID,
				el("img", "p5-feed-avatar", { src: post.avatar, alt: `${post.author} avatar` }));
			const content = el("div", "p5-feed-content");
			const categories = el("div", "p5-feed-toggle-group");
			for (const category of post.categories) {
				const badge = el("button", "p5-post-category-badge", { type: "button", text: category, "aria-label": `Filter by ${category}` });
				badge.addEventListener("click", event => { event.stopPropagation(); setCategory(category); });
				categories.appendChild(badge);
			}
			const header = el("div", "p5-feed-post-header");
			header.append(memberButton("p5-feed-author", post.author, post.userID), el("h3", "p5-feed-title", { text: post.title }));
			const footer = el("div", "p5-feed-post-footer");
			for (const [className, count, path] of [
				["like", post.likes, "M2 9h3v12H2V9zm18.386-2h-5.643l.864-4.057c.127-.596-.088-1.213-.547-1.574a1.5 1.5 0 0 0-1.636-.164L12 2l-5.29 6H7v12h11.065a1.5 1.5 0 0 0 1.47-1.2l1.851-9A1.5 1.5 0 0 0 20.386 7z"],
				["dislike", post.dislikes, "M22 15h-3V3h3v12zM3.614 17h5.643l-.864 4.057c-.127.596.088 1.213.547 1.574.236.186.531.285.834.285.201 0 .403-.049.586-.145L12 22l5.29-6H17V4H5.935a1.5 1.5 0 0 0-1.47 1.2l-1.851 9A1.5 1.5 0 0 0 3.614 17z"],
			]) {
				const stat = el("span", `p5-feed-stat p5-feed-stat--${className}`, { "aria-label": `${count} ${className}s` });
				stat.innerHTML = `<svg class="p5-feed-stat-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="${path}"/></svg>`;
				stat.appendChild(el("span", null, { text: count }));
				footer.appendChild(stat);
			}
			footer.appendChild(el("span", "p5-feed-replies", { text: `${post.commentCount} ${post.commentCount === 1 ? "reply" : "replies"} ↗` }));
			content.append(categories, header, el("p", "p5-feed-desc", { text: post.desc }), footer);
			inner.append(avatarWrap, content);
			card.append(el("div", "p5-feed-post-corner"), inner);
			return card;
		});
	}
	function refreshFeed() {
		const posts = currentPosts.filter(post => currentCategory === "All" || post.categories.includes(currentCategory));
		boardCount.textContent = `${String(posts.length).padStart(2, "0")} ${posts.length === 1 ? "CARD" : "CARDS"}`;
		feedList.replaceChildren(...buildFeedContent(posts));
		if (!posts.length) {
			const empty = el("div", "p5-board-empty");
			empty.append(el("strong", null, { text: "Nothing on the radar." }), el("p", null, { text: "Be the first to leave a calling card here." }));
			feedList.appendChild(empty);
		}
	}
	async function switchContent(build, view, token = ++navigationVersion) {
		const version = ++cutVersion;
		cutAnimation?.cancel();
		const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
		if (currentView === "feed") feedScroll = main.scrollTop;
		const isCurrent = () => token === navigationVersion && version === cutVersion && wrap.isConnected;
		positionWipe();
		fadeOverlay.classList.toggle("is-cutting", !reduced);
		try {
			if (!reduced) {
				cutAnimation = wipePanel.animate([
					{ transform: "translateX(-110%) skewX(-12deg)" },
					{ transform: "translateX(0) skewX(-12deg)" },
				], { duration: 240, easing: "cubic-bezier(.22,.61,.36,1)", fill: "forwards" });
				await cutAnimation.finished;
			}
			if (!isCurrent()) return;
			currentView = view;
			main.dataset.view = view;
			main.classList.toggle("in-post-bg", view === "post");
			createBtnWrap.hidden = view !== "feed";
			const content = build();
			content.classList.add("is-visible");
			stage.replaceChildren(content);
			main.scrollTop = view === "feed" ? feedScroll : 0;
			if (view !== "feed") {
				const target = content.querySelector("h1, #post-title, .p5-back-btn");
				target?.setAttribute("tabindex", "-1");
				target?.focus({ preventScroll: true });
			} else {
				tabs.querySelector('[aria-pressed="true"]')?.focus({ preventScroll: true });
			}
			if (!reduced) {
				// Paint the destination under the opaque panel before revealing it.
				await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
				if (!isCurrent()) return;
				const covering = cutAnimation;
				cutAnimation = wipePanel.animate([
					{ transform: "translateX(0) skewX(-12deg)" },
					{ transform: "translateX(110%) skewX(-12deg)" },
				], { duration: 260, easing: "cubic-bezier(.55,0,.78,.35)", fill: "forwards" });
				covering.cancel();
				await cutAnimation.finished;
			}
		} catch (error) {
			if (error.name !== "AbortError") notify("That page couldn't be opened. Try again.", "error");
		} finally {
			if (version === cutVersion) {
				fadeOverlay.classList.remove("is-cutting");
				cutAnimation?.cancel();
				cutAnimation = null;
			}
		}
	}
	function positionWipe() {
		// This sibling never moves when the reading area restores its scroll position.
		Object.assign(fadeOverlay.style, {
			top: `${main.offsetTop}px`, left: `${main.offsetLeft}px`,
			width: `${main.offsetWidth}px`, height: `${main.offsetHeight}px`,
		});
	}
	async function showInPostView(post) {
		const token = ++navigationVersion;
		try {
			const response = await fetch(`/api/comments?post_id=${post.id}`);
			const data = await response.json();
			if (!response.ok || data.status !== "ok") throw new Error(data.error || "Couldn't load the replies.");
			post.comments = (data.comments || []).map(comment => ({
				id: comment.id, userID: comment.user_id, author: comment.author,
				avatar: `./assets/pfp/pfp${comment.avatar || 1}.png`,
				text: comment.content, likes: comment.like_count || 0, dislikes: comment.dislike_count || 0, user_reaction: comment.user_reaction || 0,
			}));
		} catch (error) { if (token === navigationVersion) notify(error.message, "error"); return; }
		if (token !== navigationVersion) return;
		switchContent(() => renderInPostView(post, showFeedView, showMember), "post", token);
	}
	function showCreatePostView() {
		const token = ++navigationVersion;
		switchContent(() => renderCreatePostView(showFeedView, async created => {
			await loadPosts();
			const post = currentPosts.find(candidate => candidate.id === created.id) || mapPost(created);
			notify("Calling card delivered. You've left your mark.");
			if (token !== navigationVersion || !wrap.isConnected) return;
			await showInPostView(post);
		}, { category: currentCategory }), "compose", token);
	}
	function showFeedView() {
		if (currentView === "feed") { ++navigationVersion; return; }
		switchContent(() => { refreshFeed(); return feedContainer; }, "feed");
	}
	loadPosts();



	wrap.appendChild(nav);
	wrap.appendChild(dmSidebar);
	wrap.appendChild(main);
	wrap.appendChild(fadeOverlay);

	// Function to check if sidebar is hidden by CSS
	function isSidebarHidden() {
		const leftPos = parseInt(window.getComputedStyle(dmSidebar).left);
		return leftPos < 0;
	}

	// Setup notifications button to toggle DM sidebar when it's hidden
	notificationsBtn.addEventListener('click', (e) => {
		e.stopPropagation();
		// Only toggle if sidebar is in hidden state
		if (isSidebarHidden() || dmSidebar.classList.contains('is-mobile-open')) {
			dmSidebar.classList.toggle('is-mobile-open');
		}
	});

	// Close sidebar when clicking outside
	document.addEventListener('click', (e) => {
		if (dmSidebar.classList.contains('is-mobile-open')) {
			if (!dmSidebar.contains(e.target) && !notificationsBtn.contains(e.target)) {
				dmSidebar.classList.remove('is-mobile-open');
			}
		}
	}, { signal: lifecycle.signal });

	// Close sidebar when window is resized to desktop (sidebar no longer hidden)
	window.addEventListener('resize', () => {
		if (fadeOverlay.classList.contains("is-cutting")) positionWipe();
		if (!isSidebarHidden()) {
			dmSidebar.classList.remove('is-mobile-open');
		}
	}, { signal: lifecycle.signal });

	wrap.dispose = () => {
		lifecycle.abort();
		subscriptions.forEach(unsubscribe => unsubscribe());
		++cutVersion;
		cutAnimation?.cancel();
		dismissMessageNotice?.();
		wrap.querySelectorAll("dialog").forEach(dialog => dialog.close());
		wsManager.disconnect();
	};

	return wrap;
}

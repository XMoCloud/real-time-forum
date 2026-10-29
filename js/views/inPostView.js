import { el } from "../ui/dom.js";
import { createFeedback, notify } from "../ui/feedback.js";

export function renderInPostView(post, onBackClick, onMemberClick) {
	const container = el("div", "p5-inpost-container");

	// Get current user ID
	const currentUserId = parseInt(sessionStorage.getItem("p5-demo-userId") || '0');

	// Back Button
	if (onBackClick) {
		const backBtn = el("button", "p5-back-btn");
		backBtn.innerHTML = "<span>BACK</span>";
		backBtn.addEventListener("click", onBackClick);
		container.appendChild(backBtn);
	}

	// Main post card
	const card = el("div", "p5-inpost-card");
	
	// Arrow decoration
	const arrow = el("div", "p5-inpost-arrow");
	card.appendChild(arrow);

	const inner = el("div", "p5-inpost-inner");

	// Header with avatar and author
	const header = el("div", "p5-inpost-header");
	const avatar = el("img", "p5-inpost-avatar", {
		src: post.avatar,
		alt: `${post.author} avatar`,
	});
	const authorInfo = el("div", "p5-inpost-author-info");
	const authorName = el("button", "p5-inpost-author p5-member-link", { type: "button", text: post.author, "aria-label": `View ${post.author}'s dossier` });
	authorName.addEventListener("click", () => onMemberClick?.(post.userID));
	const avatarButton = el("button", "p5-member-link", { type: "button", "aria-label": `View ${post.author}'s dossier` });
	avatarButton.appendChild(avatar);
	avatarButton.addEventListener("click", () => onMemberClick?.(post.userID));
	const title = el("h1", "p5-inpost-title", { text: post.title });
	authorInfo.appendChild(authorName);
	authorInfo.appendChild(title);
	if (post.categories && post.categories.length > 0) {
		const cats = el("div", "p5-post-meta");
		post.categories.forEach((cat) => {
			cats.appendChild(el("span", "p5-post-category-badge", { text: cat }));
		});
		authorInfo.appendChild(cats);
	}
	header.appendChild(avatarButton);
	header.appendChild(authorInfo);

	// Full description
	const body = el("p", "p5-inpost-body", { text: post.desc });

	// Action buttons
	const actions = el("div", "p5-inpost-actions");
	
	const likeBtn = el("button", "p5-inpost-btn p5-inpost-btn--like", { type: "button" });
	const likesSpan = el("span", null, { text: `${post.likes} Likes` });
	
	const dislikeBtn = el("button", "p5-inpost-btn p5-inpost-btn--dislike", { type: "button" });
	const dislikesSpan = el("span", null, { text: `${post.dislikes} Dislikes` });
	
	// Build like button
	likeBtn.innerHTML = `<svg class="p5-inpost-btn-icon" viewBox="0 0 24 24"><path d="M2 9h3v12H2V9zm18.386-2h-5.643l.864-4.057c.127-.596-.088-1.213-.547-1.574a1.5 1.5 0 0 0-1.636-.164L12 2l-5.29 6H7v12h11.065a1.5 1.5 0 0 0 1.47-1.2l1.851-9A1.5 1.5 0 0 0 20.386 7z"/></svg>`;
	likeBtn.appendChild(likesSpan);

	// Apply active class if user has already liked this post
	if (post.user_reaction === 1) {
		likeBtn.classList.add('is-active');
	}

	// Like post handler
	likeBtn.addEventListener('click', async (e) => {
		e.stopPropagation();
		try {
			const response = await fetch('/api/likes/post', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ post_id: post.id, user_id: currentUserId, reaction_type: 1 })
			});
			const data = await response.json();
			
			// Check for session expired
			if (data.status === 'session_expired') {
				if (window.handleSessionExpired) {
					window.handleSessionExpired();
				}
				return;
			}
			
			if (data.status === 'ok') {
				// Update UI with response
				post.likes = data.like_count;
				post.dislikes = data.dislike_count;
				post.user_reaction = data.user_reaction;
				
				// Update button states
				if (data.user_reaction === 1) {
					likeBtn.classList.add('is-active');
					dislikeBtn.classList.remove('is-active');
				} else {
					likeBtn.classList.remove('is-active');
				}
				
				likesSpan.textContent = `${post.likes} Likes`;
				dislikesSpan.textContent = `${post.dislikes} Dislikes`;
			}
		} catch (error) {
			console.error('Error liking post:', error);
		}
	});
	
	// Build dislike button
	dislikeBtn.innerHTML = `<svg class="p5-inpost-btn-icon" viewBox="0 0 24 24"><path d="M22 15h-3V3h3v12zM3.614 17h5.643l-.864 4.057c-.127.596.088 1.213.547 1.574.236.186.531.285.834.285.201 0 .403-.049.586-.145L12 22l5.29-6H17V4H5.935a1.5 1.5 0 0 0-1.47 1.2l-1.851 9A1.5 1.5 0 0 0 3.614 17z"/></svg>`;
	dislikeBtn.appendChild(dislikesSpan);

	// Apply active class if user has already disliked this post
	if (post.user_reaction === -1) {
		dislikeBtn.classList.add('is-active');
	}

	// Dislike post handler
	dislikeBtn.addEventListener('click', async (e) => {
		e.stopPropagation();
		try {
			const response = await fetch('/api/likes/post', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ post_id: post.id, user_id: currentUserId, reaction_type: -1 })
			});
			const data = await response.json();
			
			// Check for session expired
			if (data.status === 'session_expired') {
				if (window.handleSessionExpired) {
					window.handleSessionExpired();
				}
				return;
			}
			
			if (data.status === 'ok') {
				// Update UI with response
				post.likes = data.like_count;
				post.dislikes = data.dislike_count;
				post.user_reaction = data.user_reaction;
				
				// Update button states
				if (data.user_reaction === -1) {
					dislikeBtn.classList.add('is-active');
					likeBtn.classList.remove('is-active');
				} else {
					dislikeBtn.classList.remove('is-active');
				}
				
				likesSpan.textContent = `${post.likes} Likes`;
				dislikesSpan.textContent = `${post.dislikes} Dislikes`;
			}
		} catch (error) {
			console.error('Error disliking post:', error);
		}
	});

	actions.appendChild(likeBtn);
	actions.appendChild(dislikeBtn);

	inner.appendChild(header);
	inner.appendChild(body);
	inner.appendChild(actions);
	card.appendChild(inner);

	// Comments section
	const commentsSection = el("div", "p5-comments-section");
	const commentsTitle = el("h2", "p5-comments-title", { text: "Comments" });
	commentsSection.appendChild(commentsTitle);

	// Function to create comment element
	function createCommentElement(comment) {
		const commentEl = el("div", "p5-comment");
		
		const speaker = el("button", "p5-comment-speaker p5-member-link", { type: "button", text: comment.author, "aria-label": `View ${comment.author}'s dossier` });
		speaker.addEventListener("click", () => onMemberClick?.(comment.userID));
		const topRow = el("div", "p5-comment-top");
		
		const avatarCol = el("div", "p5-comment-avatar-col");
		const commentAvatar = el("img", "p5-comment-avatar", {
			src: comment.avatar,
			alt: `${comment.author} avatar`,
		});
		avatarCol.appendChild(commentAvatar);

		const dialogWrap = el("div", "p5-comment-dialog-wrap");
		const zigzag = el("div", "p5-comment-zigzag");
		const dialog = el("div", "p5-comment-dialog");
		const text = el("p", "p5-comment-text", { text: comment.text });
		dialog.appendChild(text);
		
		const arrowComment = el("div", "p5-comment-arrow");
		dialog.appendChild(arrowComment);
		
		dialogWrap.appendChild(zigzag);
		dialogWrap.appendChild(dialog);
		
		topRow.appendChild(avatarCol);
		topRow.appendChild(dialogWrap);
		
		const footer = el("div", "p5-comment-footer");
		
		const commentLikeBtn = el("div", "p5-comment-stat p5-comment-stat--like");
		const commentLikeSpan = el("span", null, { text: comment.likes.toString() });
	
	const commentDislikeBtn = el("div", "p5-comment-stat p5-comment-stat--dislike");
	const commentDislikeSpan = el("span", null, { text: comment.dislikes.toString() });
	
	// Build like button
	commentLikeBtn.innerHTML = `<svg class="p5-comment-stat-icon" viewBox="0 0 24 24"><path d="M2 9h3v12H2V9zm18.386-2h-5.643l.864-4.057c.127-.596-.088-1.213-.547-1.574a1.5 1.5 0 0 0-1.636-.164L12 2l-5.29 6H7v12h11.065a1.5 1.5 0 0 0 1.47-1.2l1.851-9A1.5 1.5 0 0 0 20.386 7z"/></svg>`;
	commentLikeBtn.appendChild(commentLikeSpan);
	
	if (comment.user_reaction === 1) {
		commentLikeBtn.classList.add('is-active');
	}
		
		commentLikeBtn.style.cursor = 'pointer';
		commentLikeBtn.addEventListener('click', async (e) => {
			e.stopPropagation();
			try {
				const response = await fetch('/api/likes/comment', {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({ comment_id: comment.id, user_id: currentUserId, reaction_type: 1 })
				});
				const data = await response.json();
				
				// Check for session expired
				if (data.status === 'session_expired') {
					if (window.handleSessionExpired) {
						window.handleSessionExpired();
					}
					return;
				}
				
				if (data.status === 'ok') {
					// Update UI with response
					comment.likes = data.like_count;
					comment.dislikes = data.dislike_count;
					comment.user_reaction = data.user_reaction;
					
					// Update button states
					if (data.user_reaction === 1) {
						commentLikeBtn.classList.add('is-active');
						commentDislikeBtn.classList.remove('is-active');
					} else {
						commentLikeBtn.classList.remove('is-active');
					}
					
					commentLikeSpan.textContent = comment.likes.toString();
					commentDislikeSpan.textContent = comment.dislikes.toString();
				}
			} catch (error) {
				console.error('Error liking comment:', error);
			}
		});
		
		commentDislikeBtn.innerHTML = `<svg class="p5-comment-stat-icon" viewBox="0 0 24 24"><path d="M22 15h-3V3h3v12zM3.614 17h5.643l-.864 4.057c-.127.596.088 1.213.547 1.574.236.186.531.285.834.285.201 0 .403-.049.586-.145L12 22l5.29-6H17V4H5.935a1.5 1.5 0 0 0-1.47 1.2l-1.851 9A1.5 1.5 0 0 0 3.614 17z"/></svg>`;
		commentDislikeBtn.appendChild(commentDislikeSpan);
		
		// Apply active class if user has already disliked this comment
		if (comment.user_reaction === -1) {
			commentDislikeBtn.classList.add('is-active');
		}
		
		commentDislikeBtn.style.cursor = 'pointer';
		commentDislikeBtn.addEventListener('click', async (e) => {
			e.stopPropagation();
			try {
				const response = await fetch('/api/likes/comment', {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({ comment_id: comment.id, user_id: currentUserId, reaction_type: -1 })
				});
				const data = await response.json();
				
				// Check for session expired
				if (data.status === 'session_expired') {
					if (window.handleSessionExpired) {
						window.handleSessionExpired();
					}
					return;
				}
				
				if (data.status === 'ok') {
					// Update UI with response
					comment.likes = data.like_count;
					comment.dislikes = data.dislike_count;
					comment.user_reaction = data.user_reaction;
					
					// Update button states
					if (data.user_reaction === -1) {
						commentDislikeBtn.classList.add('is-active');
						commentLikeBtn.classList.remove('is-active');
					} else {
						commentDislikeBtn.classList.remove('is-active');
					}
					
					commentLikeSpan.textContent = comment.likes.toString();
					commentDislikeSpan.textContent = comment.dislikes.toString();
				}
			} catch (error) {
				console.error('Error disliking comment:', error);
			}
		});
		
		footer.appendChild(commentLikeBtn);
		footer.appendChild(commentDislikeBtn);

		commentEl.appendChild(speaker);
		commentEl.appendChild(topRow);
		commentEl.appendChild(footer);
		
		return commentEl;
	}

	// Render existing comments
	post.comments.forEach((comment) => {
		commentsSection.appendChild(createCommentElement(comment));
	});

	// Add comment input
	const inputWrap = el("div", "p5-comment-input-wrap");
	const input = el("input", "p5-comment-input", {
		type: "text",
		placeholder: "Write a comment...",
		maxlength: "3000",
		"aria-label": "Write a comment",
	});
	const submitBtn = el("button", "p5-comment-submit", {
		type: "button",
		text: "Send",
	});

	// Submit comment handler
	const feedback = createFeedback();
	let sendingComment = false;
	const submitComment = async () => {
		if (sendingComment) return;
		const content = input.value.trim();
		if (!content) return feedback.show("Got something to say? Write a reply first.", input);
		feedback.clear();
		sendingComment = true;
		submitBtn.disabled = true;
		
		try {
			const response = await fetch('/api/comments/create', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					post_id: post.id,
					user_id: currentUserId,
					content: content
				})
			});
			const data = await response.json();
			
			// Check for session expired
			if (data.status === 'session_expired') {
				if (window.handleSessionExpired) {
					window.handleSessionExpired();
				}
				return;
			}
			
			if (data.status === 'ok' && data.comment) {
				input.value = '';
				
				const newComment = {
					id: data.comment.id,
					userID: data.comment.user_id,
					author: data.comment.author,
					avatar: `./assets/pfp/pfp${data.comment.avatar}.png`,
					text: data.comment.content,
					likes: 0,
					dislikes: 0,
					user_reaction: 0 // 0 = none, 1 = like, -1 = dislike
				};
				post.comments.push(newComment);
				
				const commentEl = createCommentElement(newComment);
				commentEl.classList.add("p5-comment-arrival");
				commentsSection.insertBefore(commentEl, inputWrap);
				post.commentCount = post.comments.length;
				notify("Your reply is on the board.");
			} else {
				feedback.show(data.error || "Your reply couldn't be sent. Try again.");
			}
		} catch (error) {
			console.error('Error posting comment:', error);
			feedback.show("We lost the connection. Your reply is still here.");
		} finally {
			sendingComment = false;
			submitBtn.disabled = false;
		}
	};
	submitBtn.addEventListener("click", submitComment);
	input.addEventListener("keydown", event => { if (event.key === "Enter" && !event.isComposing) { event.preventDefault(); submitComment(); } });

	inputWrap.appendChild(input);
	inputWrap.appendChild(submitBtn);
	commentsSection.appendChild(inputWrap);
	commentsSection.appendChild(feedback.node);

	container.appendChild(card);
	container.appendChild(commentsSection);

	return container;
}

import { el } from "./ui/dom.js";
import { fadeOut, fadeIn } from "./ui/anim.js";
import { renderLoginView } from "./views/loginView.js";
import { renderRegisterView } from "./views/registerView.js";
import { renderForumView } from "./views/forumView.js";

// A project-hosted static demo can live under /repository-name/ instead of /.
const appBasePath = new URL("../", import.meta.url).pathname;

// Global session expired handler - can be called from anywhere
window.handleSessionExpired = null;

function createBackgroundLayers(root) {
	const loginBg = el("div", "p5-bg-layer p5-bg-login is-active");
	const registerBg = el("div", "p5-bg-layer p5-bg-register");
	root.appendChild(loginBg);
	root.appendChild(registerBg);
	return { loginBg, registerBg };
}

function setBackground({ loginBg, registerBg }, target) {
	if (target === "register" || target === "forum" || target === "404") {
		registerBg.classList.add("is-active");
		loginBg.classList.remove("is-active");
	} else {
		loginBg.classList.add("is-active");
		registerBg.classList.remove("is-active");
	}
}

// 404 Page View
function render404View({ onNavigate } = {}) {
	const wrap = el("div", "p5-404-wrap p5-view p5-fade-in", { "data-view": "404" });
	
	const content = el("div", "p5-404-content");
	
	const title = el("h1", "p5-404-title", { text: "404" });
	const subtitle = el("p", "p5-404-subtitle", { text: "NOT FOUND" });
	const description = el("p", "p5-404-description", { text: "The page you're looking for doesn't exist in the Metaverse." });
	
	const btnWrap = el("div", "p5-404-btn-wrap");
	const returnBtn = el("button", "p5-404-btn", { type: "button", text: "RETURN" });
	returnBtn.addEventListener("click", () => onNavigate && onNavigate());
	btnWrap.appendChild(returnBtn);
	
	content.appendChild(title);
	content.appendChild(subtitle);
	content.appendChild(description);
	content.appendChild(btnWrap);
	wrap.appendChild(content);
	
	return wrap;
}

export function startApp() {
	if (document.getElementById("app")) return;

	const root = el("div", "app-root", { id: "app" });
	document.body.appendChild(root);

	const bg = createBackgroundLayers(root);

	const logo = el("img", "p5-logo", {
		src: "./assets/logoP5R.png",
		alt: "P5R Logo",
	});
	root.appendChild(logo);

	const appOverlay = el("div", "p5-app-overlay");
	root.appendChild(appOverlay);

	let loginView = null;
	let registerView = null;
	let forumView = null;
	let notFoundView = null;

	const removeIfAttached = (node) => {
		if (node && node.parentNode === root) {
			node.dispose?.();
			root.removeChild(node);
		}
	};

	const removeAllViews = () => {
		removeIfAttached(loginView);
		removeIfAttached(registerView);
		removeIfAttached(forumView);
		removeIfAttached(notFoundView);
	};

	const transitionTo = (callback) => {
		appOverlay.classList.add("is-visible");
		
		setTimeout(() => {
			callback();
			
			setTimeout(() => {
				appOverlay.classList.remove("is-visible");
			}, 50);
		}, 300);
	};

	const showForum = () => {
		transitionTo(() => {
			setBackground(bg, "forum");

			if (forumView && forumView.parentNode === root) {
				removeIfAttached(forumView);
			}
			
			forumView = renderForumView({
				onLogout: () => {
					removeIfAttached(forumView);
					forumView = null;
					showLogin();
				},
			});

			root.appendChild(forumView);

			removeIfAttached(loginView);
			removeIfAttached(registerView);
			removeIfAttached(notFoundView);
			removeIfAttached(logo);
		});
	};

	const showLogin = () => {
		transitionTo(() => {
			logo.classList.remove("is-compact");
			setBackground(bg, "login");

			if (logo.parentNode !== root) {
				root.appendChild(logo);
			 	root.insertBefore(logo, appOverlay);
			}

			if (!loginView) {
				loginView = renderLoginView({
					onCreateAccount: () => void showRegister(),
					onLogin: () => void showForum(),
				});
			}

			if (loginView.parentNode !== root) {
				root.appendChild(loginView);
				root.insertBefore(loginView, appOverlay);
			}

			removeIfAttached(registerView);
			removeIfAttached(forumView);
			removeIfAttached(notFoundView);
		});
	};

	const showRegister = () => {
		logo.classList.add("is-compact");
		setBackground(bg, "register");

		if (!registerView) {
			registerView = renderRegisterView({
				onBackToLogin: () => void showLoginNoFade(),
				onRegistered: () => void showForum(),
			});
		}

		if (registerView.parentNode !== root) {
			root.appendChild(registerView);
			root.insertBefore(registerView, appOverlay);
		}
		fadeIn(registerView);

		if (loginView && loginView.parentNode === root) {
			void fadeOut(loginView).then(() => {
				removeIfAttached(loginView);
			});
		}
	};
	
	const showLoginNoFade = () => {
		logo.classList.remove("is-compact");
		setBackground(bg, "login");
		
		if (!loginView) {
			loginView = renderLoginView({
				onCreateAccount: () => void showRegister(),
				onLogin: () => void showForum(),
			});
		}
		
		if (loginView.parentNode !== root) {
			root.appendChild(loginView);
			root.insertBefore(loginView, appOverlay);
		}
		fadeIn(loginView);

		if (registerView && registerView.parentNode === root) {
			void fadeOut(registerView).then(() => {
				removeIfAttached(registerView);
			});
		}
	};

	const show404 = () => {
		transitionTo(() => {
			setBackground(bg, "404");
			
			// Check if user has active session
			const hasSession = sessionStorage.getItem("p5-demo-userId");
			
			notFoundView = render404View({
				onNavigate: () => {
					// Update URL to root
					window.history.pushState({}, '', appBasePath);
					if (hasSession) {
						showForum();
					} else {
						showLogin();
					}
				}
			});
			
			removeAllViews();
			removeIfAttached(logo);
			root.appendChild(notFoundView);
		});
	};

	// Handle session expired - logout and redirect to login
	const handleSessionExpired = () => {
		// Clear session data
		sessionStorage.removeItem("p5-demo-userId");
		sessionStorage.removeItem("p5-demo-userNickname");
		
		// Update URL to root
		window.history.pushState({}, '', appBasePath);
		
		// Remove forum view
		removeIfAttached(forumView);
		forumView = null;
		
		// Show login page
		showLogin();
	};
	
	// Set global handler for session expired
	window.handleSessionExpired = handleSessionExpired;

	async function checkSession() {
		try {
			const response = await fetch('/api/current-user');
			const data = await response.json();
			if (data.status === 'ok' && data.user) {
				sessionStorage.setItem("p5-demo-userId", data.user.id.toString());
				sessionStorage.setItem("p5-demo-userNickname", data.user.nickname);
				showForum();
				return true;
			}
		} catch (error) {
		}
		return false;
	}

	// Check if current path is a valid route
	function isValidRoute(path) {
		const validRoutes = [appBasePath, appBasePath.replace(/\/$/, ""), `${appBasePath}index.html`];
		return validRoutes.includes(path);
	}

	// Handle routing
	const currentPath = window.location.pathname;
	
	checkSession().then(isLoggedIn => {
		// If path is not root and not logged in, or path is invalid, show 404
		if (!isValidRoute(currentPath)) {
			show404();
		} else if (!isLoggedIn) {
			showLoginNoFade();
		}
	});
}

if (document.readyState === "loading") {
	document.addEventListener("DOMContentLoaded", () => startApp(), { once: true });
} else {
	startApp();
}

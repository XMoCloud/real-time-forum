import { el } from "../ui/dom.js";
import { createFeedback } from "../ui/feedback.js";

export function renderLoginView({ onCreateAccount, onLogin } = {}) {
	const wrap = el("div", "p5-login-wrap p5-view", { "data-view": "login" });
	const title = el("div", "p5-login-title", { text: "Login" });

	const loginBadge = el("img", "p5-login-badge", {
		src: "./assets/login.png",
		alt: "Login",
	});

	const card = el("section", "p5-login-card");
	const content = el("div", "p5-login-content");

	const usernameId = "login-identifier";
	const passwordId = "login-password";

	const usernameField = el("div", "p5-field");
	usernameField.appendChild(el("label", "p5-label", { for: usernameId, text: "USERNAME OR EMAIL" }));
	const usernameInput = el("input", "p5-input", {
		id: usernameId,
		type: "text",
		autocomplete: "username",
		placeholder: "nickname or email",
	});
	usernameField.appendChild(usernameInput);

	const passwordField = el("div", "p5-field");
	passwordField.appendChild(el("label", "p5-label", { for: passwordId, text: "PASSWORD" }));
	const passwordInput = el("input", "p5-input", {
		id: passwordId,
		type: "password",
		autocomplete: "current-password",
		placeholder: "password",
	});
	passwordField.appendChild(passwordInput);

	const actions = el("div", "p5-actions");
	const createAccountBtn = el("button", "p5-link-btn", {
		type: "button",
		text: "Create new account",
	});
	createAccountBtn.addEventListener("click", () => onCreateAccount && onCreateAccount());
	actions.appendChild(createAccountBtn);

	content.appendChild(usernameField);
	content.appendChild(passwordField);
	content.appendChild(actions);
	card.appendChild(content);

	// Error message display
	const feedback = createFeedback();
	content.appendChild(feedback.node);

	const okWrap = el("div", "p5-ok-wrap", {
		role: "button",
		tabindex: "0",
		"aria-label": "Login",
	});
	const okImg = el("img", "p5-ok-img", {
		src: "./assets/okButton.png",
		alt: "OK",
	});
	okWrap.appendChild(okImg);

	let loggingIn = false;
	const attemptLogin = async () => {
		if (loggingIn) return;
		const identifier = usernameInput.value.trim();
		const password = passwordInput.value;

		feedback.clear();

		// Validate
		if (!identifier) {
			feedback.show("Username or email is required", usernameInput);
			return;
		}
		if (!password) {
			feedback.show("Password is required", passwordInput);
			return;
		}

		// Send to backend
		loggingIn = true;
		okWrap.setAttribute("aria-disabled", "true");
		try {
			const response = await fetch("/api/login", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ identifier, password }),
			});

			const data = await response.json();

			if (!response.ok || data.status === "error") {
				feedback.show(data.error || "Login failed");
				return;
			}

			if (data.user && data.user.id) {
				sessionStorage.setItem("p5-demo-userId", data.user.id.toString());
				sessionStorage.setItem("p5-demo-userNickname", data.user.nickname);
			}
			if (onLogin) onLogin(data.user);
		} catch (err) {
			feedback.show("We couldn't connect. Give it another try.");
		} finally {
			loggingIn = false;
			okWrap.removeAttribute("aria-disabled");
		}
	};

	okWrap.addEventListener("click", attemptLogin);
	okWrap.addEventListener("keydown", (event) => {
		if (event.key === "Enter" || event.key === " ") {
			event.preventDefault();
			attemptLogin();
		}
	});

	const onEnterToLogin = (event) => {
		if (event.key === "Enter") attemptLogin();
	};
	usernameInput.addEventListener("keydown", onEnterToLogin);
	passwordInput.addEventListener("keydown", onEnterToLogin);

	wrap.appendChild(title);
	wrap.appendChild(loginBadge);
	wrap.appendChild(card);
	wrap.appendChild(okWrap);

	setTimeout(() => usernameInput.focus(), 0);
	return wrap;
}

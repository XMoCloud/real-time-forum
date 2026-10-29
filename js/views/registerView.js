import { el } from "../ui/dom.js";
import { createFeedback, notify } from "../ui/feedback.js";

function buildGenderToggle() {
	const field = el("div", "p5-field");
	field.appendChild(el("div", "p5-label", { text: "GENDER" }));

	const toggle = el("div", "p5-gender-toggle", { role: "switch", tabindex: "0", "aria-checked": "false" });
	const track = el("div", "p5-gender-track");
	const m = el("div", "p5-gender-letter m", { text: "M" });
	const f = el("div", "p5-gender-letter f", { text: "F" });
	const knob = el("div", "p5-gender-knob");
	track.appendChild(m);
	track.appendChild(f);
	track.appendChild(knob);

	toggle.appendChild(track);

	let value = "M";
	const apply = () => {
		toggle.dataset.value = value;
		toggle.setAttribute("aria-checked", value === "F" ? "true" : "false");
	};
	apply();

	const flip = () => {
		value = value === "M" ? "F" : "M";
		apply();
	};

	toggle.addEventListener("click", flip);
	toggle.addEventListener("keydown", (e) => {
		if (e.key === "Enter" || e.key === " ") {
			e.preventDefault();
			flip();
		}
	});

	field.appendChild(toggle);
	return { field, getValue: () => value };
}

function buildPfpPicker(registerWrap) {
	const field = el("div", "p5-field p5-field--accent");

	const row = el("div", "p5-pfp-row");
	row.appendChild(el("div", "p5-label p5-label--accent", { text: "PFP" }));

	const current = el("button", "p5-pfp-current", { type: "button", "aria-label": "Choose profile picture" });
	const currentImg = el("img", "p5-pfp-img", { src: "./assets/pfp/pfp1.png", alt: "Selected PFP" });
	current.appendChild(currentImg);
	row.appendChild(current);
	field.appendChild(row);

	const panel = el("div", "p5-pfp-panel", { role: "dialog", "aria-modal": "true" });
	const panelBox = el("div", "p5-pfp-panel-box");
	const panelTitle = el("div", "p5-pfp-panel-title", { text: "choose your PFP" });
	const grid = el("div", "p5-pfp-panel-grid");

	let selected = "./assets/pfp/pfp1.png";
	let openState = false;

	const close = () => {
		openState = false;
		panel.classList.remove("is-open");
		registerWrap.classList.remove("is-shifted");
	};

	const open = () => {
		openState = true;
		registerWrap.classList.add("is-shifted");
		panel.classList.add("is-open");
	};

	for (let i = 1; i <= 9; i++) {
		const src = `./assets/pfp/pfp${i}.png`;
		const btn = el("button", "p5-pfp-choice", { type: "button" });
		const img = el("img", "p5-pfp-choice-img", { src, alt: `pfp${i}` });
		btn.appendChild(img);
		btn.addEventListener("click", () => {
			selected = src;
			currentImg.src = src;
			close();
		});
		grid.appendChild(btn);
	}

	panel.addEventListener("click", (e) => {
		if (e.target === panel) close();
	});

	window.addEventListener("keydown", (e) => {
		if (e.key === "Escape" && openState) close();
	});

	panelBox.appendChild(panelTitle);
	panelBox.appendChild(grid);
	panel.appendChild(panelBox);

	current.addEventListener("click", () => (openState ? close() : open()));

	return { field, panel, getValue: () => selected };
}

function inputField(label, id, type, placeholder, autocomplete) {
	const field = el("div", "p5-field");
	field.appendChild(el("label", "p5-label", { for: id, text: label }));
	const input = el("input", "p5-input", {
		id,
		type,
		placeholder,
		autocomplete: autocomplete || "off",
	});
	field.appendChild(input);
	return { field, input };
}

export function renderRegisterView({ onBackToLogin, onRegistered } = {}) {
	const wrap = el("div", "p5-register-wrap p5-view p5-fade-out", { "data-view": "register" });
	const title = el("div", "p5-register-title", { text: "Register" });

	const card = el("section", "p5-register-card");

	const backBtn = el("button", "p5-back-btn");
	backBtn.innerHTML = "<span>BACK</span>";
	if (onBackToLogin) {
		backBtn.addEventListener("click", onBackToLogin);
	}
	card.appendChild(backBtn);

	const content = el("div", "p5-register-content");

	const nick = inputField("NICKNAME", "reg-nickname", "text", "nickname", "username");
	nick.input.maxLength = 12;
	const pfp = buildPfpPicker(wrap);
	const age = inputField("AGE", "reg-age", "number", "age", "off");
	age.input.min = "1";
	age.input.max = "130";
	const gender = buildGenderToggle();
	const first = inputField("FIRST NAME", "reg-first", "text", "first name", "given-name");
	first.input.maxLength = 12;
	const last = inputField("LAST NAME", "reg-last", "text", "last name", "family-name");
	last.input.maxLength = 12;
	const email = inputField("E-MAIL", "reg-email", "email", "email", "email");
	email.input.maxLength = 64;
	const pass = inputField("PASSWORD", "reg-password", "password", "password", "new-password");
	pass.input.maxLength = 64;

	const grid = el("div", "p5-form-grid");
	const col1 = el("div", "p5-form-col");
	const col2 = el("div", "p5-form-col");

	col1.appendChild(nick.field);
	col1.appendChild(pfp.field);
	col1.appendChild(age.field);
	col1.appendChild(gender.field);

	col2.appendChild(first.field);
	col2.appendChild(last.field);
	col2.appendChild(email.field);
	col2.appendChild(pass.field);

	grid.appendChild(col1);
	grid.appendChild(col2);

	// Error message display
	const feedback = createFeedback();
	content.appendChild(grid);
	content.appendChild(feedback.node);
	card.appendChild(content);

	const okWrap = el("div", "p5-ok-wrap p5-ok-wrap-register", {
		role: "button",
		tabindex: "0",
		"aria-label": "Register",
	});
	const okImg = el("img", "p5-ok-img", {
		src: "./assets/okButton.png",
		alt: "OK",
	});
	okWrap.appendChild(okImg);

	let registering = false;
	const submit = async () => {
		if (registering) return;
		// Get values
		const nickname = nick.input.value.trim();
		const pfpVal = pfp.getValue();
		const rawAge = age.input.value.trim();
		const genderVal = gender.getValue();
		const firstName = first.input.value.trim();
		const lastName = last.input.value.trim();
		const emailVal = email.input.value.trim();
		const passwordVal = pass.input.value;

		feedback.clear();

		// Validate
		if (!nickname) {
			feedback.show("Nickname is required", nick.input);
			return;
		}
		if (nickname.length > 12) {
			feedback.show("Nickname must be 12 characters or less", nick.input);
			return;
		}
		if (!emailVal || !emailVal.includes("@")) {
			feedback.show("Valid email is required", email.input);
			return;
		}
		if (emailVal.length > 64) {
			feedback.show("Email must be 64 characters or less", email.input);
			return;
		}
		if (!passwordVal || passwordVal.length < 6) {
			feedback.show("Password must be at least 6 characters", pass.input);
			return;
		}
		if (passwordVal.length > 64) {
			feedback.show("Password must be 64 characters or less", pass.input);
			return;
		}
		if (!firstName || !lastName) {
			feedback.show("First and last name are required", first.input);
			return;
		}
		if (firstName.length > 12) {
			feedback.show("First name must be 12 characters or less", first.input);
			return;
		}
		if (lastName.length > 12) {
			feedback.show("Last name must be 12 characters or less", last.input);
			return;
		}

		// Age must be provided and be a whole number between 1 and 130
		if (!rawAge) {
			feedback.show("Age is required", age.input);
			return;
		}
		const parsedAge = Number(rawAge);
		if (!Number.isInteger(parsedAge) || parsedAge < 1 || parsedAge > 130) {
			feedback.show("Age must be a number between 1 and 130", age.input);
			return;
		}

		// Extract pfp ID from path and validate range 1-9
		const pfpMatch = pfpVal.match(/pfp(\d+)\.png/);
		let pfpId = pfpMatch ? parseInt(pfpMatch[1]) : 1;
		if (!Number.isInteger(pfpId) || pfpId < 1 || pfpId > 9) {
			// This should normally never happen unless HTML/JS is tampered with.
			// Show a safe error instead of sending invalid data.
			feedback.show("Profile picture selection is invalid", pfp.field.querySelector("button"));
			return;
		}

		// Send to backend
		registering = true;
		okWrap.setAttribute("aria-disabled", "true");
		try {
			const response = await fetch("/api/register", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					nickname,
					email: emailVal,
					password: passwordVal,
					first_name: firstName,
					last_name: lastName,
					age: parsedAge,
					gender: genderVal,
					pfp: pfpId,
				}),
			});

			const data = await response.json();

			if (!response.ok || data.status !== "ok") {
				feedback.show(data.error || "Registration failed");
				return;
			}

			// Success - store user ID in session storage
			if (data.user && data.user.id) {
				sessionStorage.setItem("p5-demo-userId", data.user.id.toString());
				sessionStorage.setItem("p5-demo-userNickname", data.user.nickname);
			}
			notify("You are in. Welcome to the Phantom Thieves!");
			if (onRegistered) onRegistered();
			else if (onBackToLogin) onBackToLogin();
		} catch (err) {
			feedback.show("We couldn't connect. Your details are still here.");
		} finally {
			registering = false;
			okWrap.removeAttribute("aria-disabled");
		}
	};

	okWrap.addEventListener("click", submit);
	okWrap.addEventListener("keydown", (e) => {
		if (e.key === "Enter" || e.key === " ") {
			e.preventDefault();
			submit();
		}
	});

	wrap.appendChild(title);
	wrap.appendChild(card);
	wrap.appendChild(okWrap);
	wrap.appendChild(pfp.panel);

	return wrap;
}

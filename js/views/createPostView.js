import { el } from "../ui/dom.js";
import { CATEGORIES } from "../ui/categories.js";
import { createFeedback } from "../ui/feedback.js";

export function renderCreatePostView(onBackClick, onPostCreated, { category = "All" } = {}) {
	const container = el("div", "p5-inpost-container p5-composer");
	const back = el("button", "p5-back-btn", { type: "button", text: "BACK" });
	back.addEventListener("click", onBackClick);
	const masthead = el("div", "p5-composer-masthead");
	masthead.append(el("span", null, { text: "THE PHANTOM THIEVES" }), el("span", null, { text: "A MESSAGE TO THE WORLD" }));
	const form = el("form", "p5-calling-card", { "aria-label": "Write a calling card", novalidate: "" });
	const head = el("div", "p5-card-heading");
	const headline = el("div", "p5-card-headline", { "aria-hidden": "true" });
	headline.append(el("span", null, { text: "Take your" }), el("strong", null, { text: "HEART." }));
	head.append(headline, el("img", "p5-card-seal", { src: "./assets/Phantom-Logo.png", alt: "Phantom Thieves" }));
	const titleLabel = el("label", "p5-card-label", { for: "post-title", text: "01 / THE HEADLINE" });
	const title = el("textarea", "p5-card-title-input", { id: "post-title", placeholder: "Make a statement.", rows: "2", maxlength: "256", required: "" });
	const bodyLabel = el("label", "p5-card-label", { for: "post-content", text: "02 / YOUR MESSAGE" });
	const body = el("textarea", "p5-card-body-input", { id: "post-content", placeholder: "Every change starts with a few words…", maxlength: "3000", rows: "6", required: "" });
	const counter = el("span", "p5-card-counter", { text: "0 / 3000" });
	const categories = el("fieldset", "p5-card-categories");
	categories.appendChild(el("legend", "p5-card-label", { text: "03 / FILE UNDER" }));
	const stamps = el("div", "p5-card-stamps");
	for (const [index, name] of CATEGORIES.entries()) {
		const label = el("label", "p5-category-stamp");
		const input = el("input", "p5-stamp-check", { type: "checkbox", value: name, name: "category" });
		input.checked = name === category;
		label.style.setProperty("--stamp-angle", `${index % 2 ? 2 : -2}deg`);
		label.append(input, el("span", null, { text: name }));
		stamps.appendChild(label);
	}
	categories.appendChild(stamps);
	const signature = el("div", "p5-card-signature");
	signature.append(el("span", null, { text: "SIGNED," }), el("strong", null, { text: sessionStorage.getItem("p5-demo-userNickname") || "A Phantom Thief" }));
	const footer = el("div", "p5-card-footer");
	const hint = el("span", "p5-card-hint", { text: "Your words. Your calling card." });
	const submit = el("button", "p5-card-send", { type: "submit", text: "SEND CALLING CARD ↗" });
	footer.append(hint, submit);
	const feedback = createFeedback();
	const sent = el("div", "p5-card-sent", { "aria-hidden": "true", text: "SENT!" });
	form.append(head, feedback.node, titleLabel, title, bodyLabel, body, counter, categories, signature, footer, sent);
	container.append(back, masthead, form);

	const draftKey = `p5-demo-card-draft-${sessionStorage.getItem("p5-demo-userId")}`;
	try {
		const draft = JSON.parse(sessionStorage.getItem(draftKey));
		if (draft) {
			title.value = draft.title || "";
			body.value = draft.content || "";
			stamps.querySelectorAll("input").forEach(input => { input.checked = draft.categories?.includes(input.value) || false; });
		}
	} catch { /* A draft is optional when browser storage is unavailable. */ }
	const selected = () => Array.from(stamps.querySelectorAll("input:checked"), input => input.value);
	function saveDraft() {
		counter.textContent = `${body.value.length} / 3000`;
		try { sessionStorage.setItem(draftKey, JSON.stringify({ title: title.value, content: body.value, categories: selected() })); } catch { /* Keep writing without storage. */ }
	}
	form.addEventListener("input", saveDraft);
	saveDraft();
	let submitting = false;
	form.addEventListener("submit", async event => {
		event.preventDefault();
		if (submitting) return;
		feedback.clear();
		if (!title.value.trim()) return feedback.show("A calling card needs a headline. What do you want to say?", title);
		if (!body.value.trim()) return feedback.show("Don't leave them guessing. Write your message first!", body);
		if (!selected().length) return feedback.show("Pick at least one category stamp before we send this.", stamps.querySelector("input"));
		submitting = true;
		submit.disabled = true;
		submit.textContent = "SENDING…";
		form.setAttribute("aria-busy", "true");
		try {
			const response = await fetch("/api/posts/create", {
				method: "POST", headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ title: title.value.trim(), content: body.value.trim(), categories: selected() }),
			});
			const data = await response.json();
			if (data.status === "session_expired") return window.handleSessionExpired?.();
			if (!response.ok || data.status !== "ok") throw new Error(data.error || "The card couldn't be sent. Try again.");
			try { sessionStorage.removeItem(draftKey); } catch { /* Optional draft storage. */ }
			form.classList.add("is-sent");
			submit.textContent = "DELIVERED ✓";
			feedback.show("Calling card delivered. Let's see what they have to say!", null, "success");
			await new Promise(resolve => setTimeout(resolve, matchMedia("(prefers-reduced-motion: reduce)").matches ? 0 : 650));
			await onPostCreated?.(data.post);
		} catch (error) {
			feedback.show(error.message || "We lost the connection. Your words are still here.");
		} finally {
			form.removeAttribute("aria-busy");
			if (!form.classList.contains("is-sent")) {
				submitting = false;
				submit.disabled = false;
				submit.textContent = "SEND CALLING CARD ↗";
			}
		}
	});
	return container;
}

import { el } from "./dom.js";
let feedbackSequence = 0;

// A real text layer keeps Morgana's dialogue readable and accessible at any size.
export function createFeedback() {
	const node = el("div", "p5-feedback", { role: "status", "aria-live": "polite" });
	node.hidden = true;
	const portrait = el("div", "p5-feedback-portrait", { "aria-hidden": "true" });
	portrait.appendChild(el("img", null, { src: "./assets/noti/server-msg-noti.png", alt: "" }));
	const dialogue = el("div", "p5-feedback-dialogue");
	dialogue.appendChild(el("span", "p5-feedback-speaker", { text: "Morgana" }));
	const message = el("p", "p5-feedback-message", { id: `p5-feedback-${++feedbackSequence}` });
	dialogue.appendChild(message);
	node.append(portrait, dialogue);
	let invalidField;
	let previousDescription;
	function clear() {
		node.hidden = true;
		invalidField?.removeAttribute("aria-invalid");
		invalidField?.classList.remove("p5-invalid");
		invalidField?.removeEventListener("input", clear);
		if (invalidField) {
			if (previousDescription) invalidField.setAttribute("aria-describedby", previousDescription);
			else invalidField.removeAttribute("aria-describedby");
		}
		invalidField = null;
	}
	function show(text, field, kind = "error") {
		clear();
		message.textContent = text;
		node.dataset.kind = kind;
		node.hidden = false;
		if (field) {
			invalidField = field;
			previousDescription = field.getAttribute("aria-describedby");
			field.setAttribute("aria-describedby", [previousDescription, message.id].filter(Boolean).join(" "));
			field.setAttribute("aria-invalid", "true");
			field.classList.add("p5-invalid");
			field.focus();
			field.addEventListener("input", clear, { once: true });
		}
		if (node.isConnected && !node.classList.contains("p5-feedback-notice")) node.scrollIntoView({ block: "nearest" });
	}
	return { node, show, clear };
}

let noticeTimer;
let activeNotice;

function dismissNotice(notice) {
	if (activeNotice === notice) {
		clearTimeout(noticeTimer);
		activeNotice = null;
	}
	notice.node.remove();
}

export function notify(text, kind = "success") {
	clearTimeout(noticeTimer);
	// Update a visible notice in place so a burst of messages doesn't replay its entrance.
	if (!activeNotice?.node.isConnected) {
		const feedback = createFeedback();
		feedback.node.classList.add("p5-feedback-notice");
		const dismiss = el("button", "p5-feedback-dismiss", { type: "button", text: "\u00d7", "aria-label": "Dismiss message" });
		dismiss.addEventListener("click", () => dismissNotice(feedback));
		feedback.node.appendChild(dismiss);
		document.body.appendChild(feedback.node);
		activeNotice = feedback;
	}
	const feedback = activeNotice;
	feedback.show(text, null, kind);
	noticeTimer = setTimeout(() => dismissNotice(feedback), 4500);
	return () => dismissNotice(feedback);
}

import { el } from "../ui/dom.js";
import { createFeedback } from "../ui/feedback.js";

export function openMemberDossier(userID, { onMessage, onPost, host = document.body } = {}) {
	const previousFocus = document.activeElement;
	const controller = new AbortController();
	const modal = el("dialog", "p5-dossier", { "aria-labelledby": "dossier-title" });
	const sheet = el("div", "p5-dossier-sheet");
	const close = el("button", "p5-dossier-close", { type: "button", text: "×", "aria-label": "Close dossier" });
	const eyebrow = el("p", "p5-dossier-eyebrow", { text: "PHAN-SITE / MEMBER FILE" });
	const heading = el("h2", "p5-dossier-title", { id: "dossier-title", text: "Confidant" });
	const content = el("div", "p5-dossier-content", { "aria-busy": "true" });
	content.appendChild(el("p", "p5-dossier-loading", { text: "Opening the file…" }));
	sheet.append(close, eyebrow, heading, content);
	modal.appendChild(sheet);
	host.appendChild(modal);
	function dismiss() { modal.close(); }
	close.addEventListener("click", dismiss);
	modal.addEventListener("click", event => { if (event.target === modal) dismiss(); });
	modal.addEventListener("close", () => {
		controller.abort();
		modal.remove();
		if (previousFocus?.isConnected) previousFocus.focus({ preventScroll: true });
	}, { once: true });
	modal.showModal();
	fetch(`/api/members/${encodeURIComponent(userID)}`, { signal: controller.signal })
		.then(async response => {
			const data = await response.json();
			if (data.status === "session_expired") { dismiss(); window.handleSessionExpired?.(); return; }
			if (!response.ok || !data.member) throw new Error(data.error || "This file couldn't be opened.");
			const member = data.member;
			content.replaceChildren();
			const portrait = el("div", "p5-dossier-portrait");
			portrait.append(el("span", "p5-dossier-watermark", { text: "PHANTOM", "aria-hidden": "true" }), el("img", null, { src: `./assets/pfp/pfp${member.avatar}.png`, alt: `${member.nickname}'s portrait` }));
			portrait.appendChild(el("span", "p5-dossier-file-number", { text: `MEMBER / ${String(member.id).padStart(3, "0")}` }));
			const info = el("div", "p5-dossier-info");
			info.append(el("span", "p5-dossier-label", { text: "CODENAME" }), el("h3", "p5-dossier-name", { text: member.nickname }));
			const status = el("span", `p5-dossier-status ${member.online ? "is-online" : ""}`, { text: member.online ? "ONLINE NOW" : "OFFLINE" });
			status.dataset.memberStatus = member.id;
			const stats = el("dl", "p5-dossier-stats");
			for (const [label, value] of [["Calling cards", member.post_count], ["Replies", member.comment_count]]) {
				const stat = el("div");
				stat.append(el("dd", null, { text: String(value).padStart(2, "0") }), el("dt", null, { text: label }));
				stats.appendChild(stat);
			}
			info.append(status, stats);
			if (member.id !== Number(sessionStorage.getItem("p5-demo-userId"))) {
				const message = el("button", "p5-dossier-message", { type: "button", text: "SEND A MESSAGE ↗" });
				message.addEventListener("click", () => { dismiss(); onMessage?.({ id: member.id, nickname: member.nickname, pfp: member.avatar, online: member.online }); });
				info.appendChild(message);
			} else info.appendChild(el("p", "p5-dossier-own", { text: "This is your calling card history." }));
			const history = el("section", "p5-dossier-history");
			history.appendChild(el("h4", null, { text: "LEFT THEIR MARK" }));
			if (!member.posts.length) history.appendChild(el("p", null, { text: "The first calling card is still unwritten." }));
			for (const [index, post] of member.posts.entries()) {
				const item = el("button", "p5-dossier-post", { type: "button" });
				item.append(el("span", null, { text: String(index + 1).padStart(2, "0") }), el("span", null, { text: post.title }), el("span", null, { text: "↗", "aria-hidden": "true" }));
				item.addEventListener("click", () => { dismiss(); onPost?.(post.id); });
				history.appendChild(item);
			}
			content.append(portrait, info, history);
		})
		.catch(error => {
			if (error.name === "AbortError") return;
			const feedback = createFeedback();
			feedback.show(error.message);
			content.replaceChildren(feedback.node);
		})
		.finally(() => content.removeAttribute("aria-busy"));
	return modal;
}

function once(node, eventName) {
	return new Promise((resolve) => {
		let done = false;
		const handler = () => {
			if (done) return;
			done = true;
			node.removeEventListener(eventName, handler);
			resolve();
		};
		node.addEventListener(eventName, handler);
		// Fallback: ensure we never hang if transition doesn't fire.
		setTimeout(handler, 420);
	});
}

export async function fadeOut(node) {
	if (!node) return;
	node.classList.add("p5-fade-out");
	await once(node, "transitionend");
}

export function fadeIn(node) {
	if (!node) return;
	node.classList.remove("p5-fade-out");
	// Ensure transition applies.
	requestAnimationFrame(() => node.classList.add("p5-fade-in"));
}

export async function crossfadeBackground(bgLogin, bgRegister, target) {
	if (!bgLogin || !bgRegister) return;
	if (target === "register") {
		bgRegister.classList.add("is-active");
		bgLogin.classList.remove("is-active");
	} else {
		bgLogin.classList.add("is-active");
		bgRegister.classList.remove("is-active");
	}
	await Promise.resolve();
}

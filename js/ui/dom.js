export function el(tag, className, attrs) {
	const node = document.createElement(tag);
	if (className) node.className = className;
	if (attrs) {
		for (const [key, value] of Object.entries(attrs)) {
			if (key === "text") node.textContent = String(value);
			else if (key === "html") node.innerHTML = String(value);
			else node.setAttribute(key, String(value));
		}
	}
	return node;
}


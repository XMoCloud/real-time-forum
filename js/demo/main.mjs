import { installDemo } from "./runtime.mjs";

installDemo();
await import("../app.js");

const loginHint = () => {
  for (const view of document.querySelectorAll('[data-view="login"], [data-view="register"]')) {
    if (view.querySelector(".p5-demo-auth-note")) continue;
    const note = document.createElement("p");
    note.className = "p5-demo-auth-note";
    note.textContent = view.dataset.view === "login"
      ? "Demo: XMo, Futaba or Joker • any password. Use fictional details only."
      : "Demo account • use fictional details. Personal details and passwords are not saved.";
    view.querySelector('.p5-login-content, .p5-register-content')?.prepend(note);
  }
};
new MutationObserver(loginHint).observe(document.getElementById("app"), { childList: true, subtree: true });
loginHint();

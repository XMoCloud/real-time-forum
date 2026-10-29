import { createDemoStore } from "./model.mjs";

export function installDemo() {
  let storage;
  try { storage = window.localStorage; } catch { /* Storage is optional. */ }
  const store = createDemoStore(storage);
  const originalFetch = window.fetch.bind(window);
  const sockets = new Set();
  const scheduled = new Set();
  const emit = (type, payload) => {
    for (const socket of sockets) {
      if (socket.readyState === 1) {
        const event = new MessageEvent("message", { data: JSON.stringify({ type, payload }) });
        socket.dispatchEvent(event);
        socket.onmessage?.(event);
      }
    }
  };
  const schedule = callback => {
    const timer = setTimeout(() => { scheduled.delete(timer); callback(); }, 1400);
    scheduled.add(timer);
  };
  const clearScheduled = () => { scheduled.forEach(clearTimeout); scheduled.clear(); };

  window.fetch = async (input, init = {}) => {
    const url = new URL(typeof input === "string" || input instanceof URL ? input : input.url, location.href);
    const apiStart = url.pathname.indexOf("/api/");
    if (url.origin !== location.origin || apiStart < 0) return originalFetch(input, init);
    const signal = init.signal || (input instanceof Request ? input.signal : undefined);
    if (signal?.aborted) throw new DOMException("Request aborted", "AbortError");
    const method = (init.method || (input instanceof Request ? input.method : "GET")).toUpperCase();
    let data = {};
    try {
      const raw = init.body || (input instanceof Request && method !== "GET" ? await input.clone().text() : "");
      if (raw) data = JSON.parse(raw);
    } catch {
      return Response.json({ status: "error", error: "Invalid demo request." }, { status: 400 });
    }
    const path = url.pathname.slice(apiStart);
    if (path === "/api/logout") clearScheduled();
    const response = store.request(method, path, data, url.searchParams);
    return Response.json(response.body, { status: response.status });
  };

  class DemoWebSocket extends EventTarget {
    static CONNECTING = 0;
    static OPEN = 1;
    static CLOSING = 2;
    static CLOSED = 3;
    CONNECTING = 0;
    OPEN = 1;
    CLOSING = 2;
    CLOSED = 3;
    readyState = 0;
    bufferedAmount = 0;
    protocol = "";
    extensions = "";
    binaryType = "blob";
    constructor(url) {
      super();
      this.url = String(url);
      sockets.add(this);
      queueMicrotask(() => {
        if (this.readyState !== 0) return;
        this.readyState = 1;
        const event = new Event("open");
        this.dispatchEvent(event);
        this.onopen?.(event);
      });
    }
    send(raw) {
      if (this.readyState !== 1) throw new DOMException("Demo connection is closed", "InvalidStateError");
      const packet = JSON.parse(raw);
      if (packet.type !== "chat") return;
      const message = store.send(Number(packet.payload?.receiver_id), packet.payload?.content);
      if (!message) { emit("error", { error: "Write a message and choose one of the demo characters." }); return; }
      queueMicrotask(() => emit("chat", message));
      schedule(() => {
        if (store.current()?.id !== message.sender_id || this.readyState !== 1) return;
        const reply = store.reply(message.receiver_id, message.sender_id);
        if (reply) emit("chat", reply);
      });
    }
    close(code = 1000, reason = "") {
      if (this.readyState === 3) return;
      this.readyState = 3;
      sockets.delete(this);
      if (!sockets.size) clearScheduled();
      queueMicrotask(() => {
        const event = new CloseEvent("close", { code, reason, wasClean: true });
        this.dispatchEvent(event);
        this.onclose?.(event);
      });
    }
  }
  window.WebSocket = DemoWebSocket;
  return {
    store,
    ping() {
      if (!store.current()) return;
      const sender = store.current().id === 2 ? 3 : 2;
      const message = store.reply(sender);
      if (message) emit("chat", message);
    },
  };
}

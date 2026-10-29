class WebSocketManager {
    constructor() {
        this.ws = null;
        this.listeners = new Map();
        this.isConnected = false;
        this.intentionalDisconnect = false;

        this.reconnectAttempts = 0;
        this.maxReconnectAttempts = 5;
        this.baseReconnectDelay = 800;
        this.reconnectTimer = null;
    }

    getWsUrl() {
        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        return `${protocol}//${window.location.host}/ws`;
    }

    connect() {
        if (this.ws && (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING)) {
            return;
        }

        this.intentionalDisconnect = false;

        if (this.reconnectTimer) {
            clearTimeout(this.reconnectTimer);
            this.reconnectTimer = null;
        }

        this.ws = new WebSocket(this.getWsUrl());

        this.ws.onopen = () => {
            this.isConnected = true;
            this.reconnectAttempts = 0;
            this.emit('connected', {});
        };

        this.ws.onmessage = (event) => {
            let message;
            try {
                message = JSON.parse(event.data);
            } catch (e) {
                return;
            }
            if (!message || typeof message.type !== 'string') {
                return;
            }
            this.emit(message.type, message.payload);
        };

        this.ws.onclose = (event) => {
            this.isConnected = false;
            this.emit('disconnected', { code: event.code, reason: event.reason });

            if (this.intentionalDisconnect) {
                return;
            }

            // If session is invalidated, do not keep reconnecting.
            this.checkSessionThenReconnect();
        };

        this.ws.onerror = () => {
            // onclose will handle reconnect
        };
    }

    disconnect() {
        this.intentionalDisconnect = true;
        this.reconnectAttempts = 0;

        if (this.reconnectTimer) {
            clearTimeout(this.reconnectTimer);
            this.reconnectTimer = null;
        }

        if (this.ws) {
            try {
                this.ws.close(1000, 'Intentional disconnect');
            } catch (e) {
            }
            this.ws = null;
        }

        this.isConnected = false;
    }

    async checkSessionThenReconnect() {
        let loggedIn = false;
        try {
            const res = await fetch('/api/current-user');
            const data = await res.json();
            loggedIn = !!(data && data.status === 'ok' && data.user && data.user.id);
        } catch (e) {
            // network error - treat as temporary
            loggedIn = true;
        }

        if (!loggedIn) {
            this.intentionalDisconnect = true;
            if (window.handleSessionExpired) {
                window.handleSessionExpired();
            }
            return;
        }

        this.scheduleReconnect();
    }

    scheduleReconnect() {
        if (this.reconnectAttempts >= this.maxReconnectAttempts) {
            return;
        }

        this.reconnectAttempts++;
        const delay = this.baseReconnectDelay * Math.pow(2, this.reconnectAttempts - 1);

        this.reconnectTimer = setTimeout(() => {
            this.connect();
        }, delay);
    }

    send(type, payload) {
        if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
            return false;
        }
        const sessionId = (() => {
            const m = document.cookie.match(/(?:^|;\s*)session_id=([^;]+)/);
            return m ? decodeURIComponent(m[1]) : "";
        })();
        this.ws.send(JSON.stringify({ type: type, session_id: sessionId, payload: payload }));
        return true;
    }

    sendChatMessage(receiverId, content) {
        return this.send('chat', {
            receiver_id: receiverId,
            content: content
        });
    }

    sendTypingIndicator(receiverId, isTyping) {
        return this.send('typing', {
            receiver_id: receiverId,
            is_typing: isTyping
        });
    }

    on(event, callback) {
        if (!this.listeners.has(event)) {
            this.listeners.set(event, []);
        }
        this.listeners.get(event).push(callback);
    }

    off(event, callback) {
        if (!this.listeners.has(event)) return;
        const arr = this.listeners.get(event);
        const i = arr.indexOf(callback);
        if (i >= 0) arr.splice(i, 1);
    }

    emit(event, data) {
        if (!this.listeners.has(event)) return;
        const arr = this.listeners.get(event);
        for (let i = 0; i < arr.length; i++) {
            try {
                arr[i](data);
            } catch (e) {
            }
        }
    }
}

// Throttle utility - prevents function from being called more than once per interval
export function throttle(func, limit) {
    let inThrottle;
    return function(...args) {
        if (!inThrottle) {
            func.apply(this, args);
            inThrottle = true;
            setTimeout(() => inThrottle = false, limit);
        }
    };
}

// Debounce utility - delays function call until after delay has passed since last call
export function debounce(func, delay) {
    let timeoutId;
    return function(...args) {
        clearTimeout(timeoutId);
        timeoutId = setTimeout(() => func.apply(this, args), delay);
    };
}

// Singleton instance
export const wsManager = new WebSocketManager();

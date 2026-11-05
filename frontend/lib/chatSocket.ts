import type { ChatEvent } from "@/lib/chat";

export type SocketStatus = "idle" | "connecting" | "open" | "closed";

const PING_MS = 25_000;
const PONG_TIMEOUT_MS = 10_000;
const BACKOFF_MS = [1_000, 2_000, 4_000, 8_000, 15_000];
const POLICY_VIOLATION = 1008;

let socket: WebSocket | null = null;
let status: SocketStatus = "idle";
let wanted = false;
let attempt = 0;
let retryTimer: ReturnType<typeof setTimeout> | undefined;
let pingTimer: ReturnType<typeof setInterval> | undefined;
let pongTimer: ReturnType<typeof setTimeout> | undefined;
const eventListeners = new Set<(event: ChatEvent) => void>();
const statusListeners = new Set<(status: SocketStatus) => void>();

function setStatus(next: SocketStatus) {
  if (status === next) return;
  status = next;
  statusListeners.forEach((listener) => listener(next));
}

function emit(event: ChatEvent) {
  eventListeners.forEach((listener) => listener(event));
}

function socketUrl() {
  const scheme = window.location.protocol === "https:" ? "wss" : "ws";
  return `${scheme}://${window.location.host}/api/chat/socket`;
}

function stopTimers() {
  clearInterval(pingTimer);
  clearTimeout(pongTimer);
}

function ping() {
  if (!socket || socket.readyState !== WebSocket.OPEN) return;
  socket.send('{"type":"ping"}');
  clearTimeout(pongTimer);
  const current = socket;
  pongTimer = setTimeout(() => current.close(4000, "no pong"), PONG_TIMEOUT_MS);
}

function scheduleRetry() {
  if (!wanted) return;
  clearTimeout(retryTimer);
  const base = BACKOFF_MS[Math.min(attempt, BACKOFF_MS.length - 1)];
  attempt += 1;
  retryTimer = setTimeout(open, base * (0.8 + Math.random() * 0.4));
}

function open() {
  if (!wanted || socket) return;
  setStatus("connecting");
  let opened = false;
  const ws = new WebSocket(socketUrl());
  socket = ws;
  ws.onopen = () => {
    opened = true;
    attempt = 0;
    setStatus("open");
    emit({ type: "connected" });
    stopTimers();
    pingTimer = setInterval(ping, PING_MS);
  };
  ws.onmessage = (message) => {
    let event: { type?: string };
    try {
      event = JSON.parse(String(message.data));
    } catch {
      return;
    }
    if (event.type === "pong") {
      clearTimeout(pongTimer);
      return;
    }
    emit(event as ChatEvent);
  };
  ws.onclose = (closed) => {
    if (socket === ws) socket = null;
    stopTimers();
    if (!wanted) {
      setStatus("idle");
      return;
    }
    setStatus("closed");
    // Kicked by the server, or the handshake keeps failing: the session may be gone, let the app re-check it.
    if (closed.code === POLICY_VIOLATION || (!opened && attempt >= 2)) emit({ type: "kicked" });
    scheduleRetry();
  };
}

function wake() {
  if (!wanted || document.visibilityState === "hidden") return;
  if (!socket) {
    clearTimeout(retryTimer);
    attempt = 0;
    open();
  } else {
    ping();
  }
}

export function startChat() {
  if (wanted || typeof window === "undefined") return;
  wanted = true;
  attempt = 0;
  window.addEventListener("online", wake);
  document.addEventListener("visibilitychange", wake);
  open();
}

export function stopChat() {
  if (!wanted) return;
  wanted = false;
  clearTimeout(retryTimer);
  stopTimers();
  window.removeEventListener("online", wake);
  document.removeEventListener("visibilitychange", wake);
  const current = socket;
  socket = null;
  current?.close(1000, "bye");
  setStatus("idle");
}

export function onChatEvent(listener: (event: ChatEvent) => void) {
  eventListeners.add(listener);
  return () => {
    eventListeners.delete(listener);
  };
}

export function onSocketStatus(listener: (status: SocketStatus) => void) {
  statusListeners.add(listener);
  return () => {
    statusListeners.delete(listener);
  };
}

export function socketStatus() {
  return status;
}

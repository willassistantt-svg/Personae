export type Toast = { id: number; tone: "success" | "error" | "info"; key: string; text?: string; href?: string };
export type ActivitySnapshot = { blocking: number; loading: number; toasts: Toast[] };

const TOAST_MS = 3500;

let snapshot: ActivitySnapshot = { blocking: 0, loading: 0, toasts: [] };
let nextId = 1;
const listeners = new Set<() => void>();

function update(change: Partial<ActivitySnapshot>) {
  snapshot = { ...snapshot, ...change };
  listeners.forEach((listener) => listener());
}

export function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function getSnapshot() {
  return snapshot;
}

/** Marks a request as running. Blocking requests (writes) cover the screen at once; reads only when slow. */
export function begin(blocking: boolean): () => void {
  update(blocking ? { blocking: snapshot.blocking + 1 } : { loading: snapshot.loading + 1 });
  let done = false;
  return () => {
    if (done) return;
    done = true;
    update(blocking ? { blocking: Math.max(0, snapshot.blocking - 1) } : { loading: Math.max(0, snapshot.loading - 1) });
  };
}

export function notify(tone: Toast["tone"], key: string, extra: { text?: string; href?: string } = {}) {
  const id = nextId++;
  const same = (toast: Toast) => toast.key === key && toast.text === extra.text;
  update({ toasts: [...snapshot.toasts.filter((toast) => !same(toast)), { id, tone, key, ...extra }].slice(-3) });
  setTimeout(() => dismiss(id), extra.href ? TOAST_MS * 2 : TOAST_MS);
}

export function dismiss(id: number) {
  if (snapshot.toasts.some((toast) => toast.id === id)) {
    update({ toasts: snapshot.toasts.filter((toast) => toast.id !== id) });
  }
}

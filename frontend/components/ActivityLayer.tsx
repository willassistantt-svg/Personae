import { useEffect, useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { ChatCircleDots, CheckCircle, WarningCircle, X } from "@phosphor-icons/react";
import { dismiss, getSnapshot, subscribe } from "@/lib/activity";
import { useI18n } from "@/lib/i18n";

const READ_DELAY_MS = 300;

export function ActivityLayer() {
  const { t } = useI18n();
  const state = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
  const [slowRead, setSlowRead] = useState(false);

  useEffect(() => {
    if (state.loading === 0) {
      setSlowRead(false);
      return;
    }
    const timer = setTimeout(() => setSlowRead(true), READ_DELAY_MS);
    return () => clearTimeout(timer);
  }, [state.loading]);

  const covering = state.blocking > 0 || slowRead;

  return (
    <>
      {covering ? (
        <div
          role="status"
          aria-live="polite"
          aria-busy="true"
          className="fixed inset-0 z-[200] flex items-center justify-center bg-ink/50 backdrop-blur-sm"
          data-testid="activity-overlay"
        >
          <div className="flex flex-col items-center gap-4 rounded-[2rem] border border-hairline bg-charcoal/90 px-10 py-8 shadow-2xl">
            <span className="h-10 w-10 animate-spin rounded-full border-2 border-champagne/20 border-t-champagne" />
            <span className="text-[10px] font-bold uppercase tracking-[0.3em] text-zincMuted">
              {t(state.blocking > 0 ? "feedback.working" : "feedback.loading")}
            </span>
          </div>
        </div>
      ) : null}
      <div className="pointer-events-none fixed inset-x-0 top-0 z-[210] flex flex-col items-center gap-2 p-3 pt-[max(0.75rem,env(safe-area-inset-top))] sm:items-end sm:p-6">
        {state.toasts.map((toast) => (
          <div
            key={toast.id}
            role={toast.tone === "error" ? "alert" : "status"}
            data-testid="toast"
            className={`pointer-events-auto flex w-full max-w-sm items-center gap-3 rounded-2xl border bg-charcoal px-4 py-3 text-sm shadow-2xl ${
              toast.tone === "error" ? "border-rose/40 text-rose" : "border-champagne/40 text-zincBright"
            }`}
          >
            {toast.tone === "error" ? (
              <WarningCircle size={20} className="shrink-0" />
            ) : toast.tone === "info" ? (
              <ChatCircleDots size={20} weight="fill" className="shrink-0 text-champagne" />
            ) : (
              <CheckCircle size={20} weight="fill" className="shrink-0 text-champagne" />
            )}
            {toast.href ? (
              <Link href={toast.href} onClick={() => dismiss(toast.id)} className="min-w-0 flex-1 break-words hover:text-champagne">
                {toast.text ?? t(toast.key)}
              </Link>
            ) : (
              <span className="min-w-0 flex-1 break-words">{toast.text ?? t(toast.key)}</span>
            )}
            <button
              type="button"
              onClick={() => dismiss(toast.id)}
              aria-label={t("feedback.close")}
              className="rounded-full p-1 text-zincMuted transition hover:text-zincBright"
            >
              <X size={14} />
            </button>
          </div>
        ))}
      </div>
    </>
  );
}

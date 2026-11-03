import { LanguageButton, Wordmark } from "@/components/ui";
import { useI18n } from "@/lib/i18n";
import type { ReactNode } from "react";

export function AuthFrame({ children }: { children: ReactNode }) {
  const { t } = useI18n();
  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-ink px-4 py-16">
      <div className="fixed inset-0 z-0">
        <img src="/auth-bg.jpg" alt="" className="h-full w-full object-cover opacity-30 grayscale" />
        <div className="absolute inset-0 bg-gradient-to-b from-ink/90 via-ink/60 to-ink" />
      </div>
      <div className="absolute right-4 top-4 z-20 md:right-8 md:top-8">
        <LanguageButton />
      </div>
      <main className="relative z-10 flex w-full max-w-md flex-col items-center">
        <div className="mb-10 text-center">
          <Wordmark />
          <p className="mt-3 text-[10px] font-bold uppercase tracking-[0.4em] text-zincMuted">{t("brand.exclusive")}</p>
        </div>
        <div className="w-full rounded-[2.5rem] border border-hairline bg-charcoal/80 p-8 shadow-2xl backdrop-blur-2xl md:p-10">{children}</div>
        <p className="mt-10 text-center text-[10px] uppercase leading-loose tracking-widest text-zincMuted">
          {t("login.footer")}
          <br />© {new Date().getFullYear()} The Personae
        </p>
      </main>
    </div>
  );
}

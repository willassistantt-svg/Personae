import Link from "next/link";
import type { ButtonHTMLAttributes, InputHTMLAttributes, ReactNode, TextareaHTMLAttributes } from "react";
import { useI18n } from "@/lib/i18n";

export function Wordmark({ compact = false }: { compact?: boolean }) {
  return (
    <div className="leading-none">
      <h1 className={`font-serif uppercase italic font-bold text-champagne ${compact ? "text-xl tracking-[0.14em] sm:text-2xl sm:tracking-[0.22em]" : "text-3xl tracking-[0.14em] sm:text-4xl sm:tracking-[0.22em]"}`}>
        Personae
      </h1>
    </div>
  );
}

export function Field({
  label,
  hint,
  ...props
}: InputHTMLAttributes<HTMLInputElement> & { label: string; hint?: string }) {
  return (
    <label className="block">
      <span className="mb-2 ml-1 block text-[10px] font-bold uppercase tracking-widest text-zincMuted">{label}</span>
      <input
        {...props}
        className="w-full rounded-2xl border border-hairline bg-graphite px-4 py-3.5 text-base text-white outline-none transition-colors placeholder:text-zincMuted/50 focus:border-champagne/50 sm:px-5 sm:py-4"
      />
      {hint ? <span className="mt-2 block text-[11px] text-zincMuted">{hint}</span> : null}
    </label>
  );
}

export function Area({
  label,
  ...props
}: TextareaHTMLAttributes<HTMLTextAreaElement> & { label: string }) {
  return (
    <label className="block">
      <span className="mb-2 ml-1 block text-[10px] font-bold uppercase tracking-widest text-zincMuted">{label}</span>
      <textarea
        {...props}
        className="min-h-32 w-full rounded-2xl border border-hairline bg-graphite px-4 py-3.5 text-base text-white outline-none transition-colors placeholder:text-zincMuted/50 focus:border-champagne/50 sm:px-5 sm:py-4"
      />
    </label>
  );
}

export function SelectField({
  label,
  children,
  ...props
}: InputHTMLAttributes<HTMLSelectElement> & { label: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="mb-2 ml-1 block text-[10px] font-bold uppercase tracking-widest text-zincMuted">{label}</span>
      <select
        {...props}
        className="w-full rounded-2xl border border-hairline bg-graphite px-4 py-3.5 text-base text-white outline-none focus:border-champagne/50 sm:px-5 sm:py-4"
      >
        {children}
      </select>
    </label>
  );
}

export function GoldButton({ children, className = "", ...props }: ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      {...props}
      className={`gold-gradient min-h-12 rounded-2xl px-6 py-3.5 text-xs font-bold uppercase tracking-widest text-ink shadow-xl shadow-champagne/10 transition-all hover:brightness-110 disabled:opacity-50 sm:px-8 sm:py-4 ${className}`}
    >
      {children}
    </button>
  );
}

export function QuietButton({ children, className = "", ...props }: ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      {...props}
      className={`min-h-11 rounded-2xl border border-hairline px-4 py-3 text-[10px] font-bold uppercase tracking-widest text-zincBright transition-colors hover:border-champagne hover:text-champagne disabled:opacity-50 ${className}`}
    >
      {children}
    </button>
  );
}

export function Notice({ children }: { children: ReactNode }) {
  return <p className="rounded-2xl border border-rose/40 bg-rose/10 px-4 py-3 text-sm text-rose">{children}</p>;
}

export function LanguageButton({ className = "" }: { className?: string }) {
  const { locale, setLocale, t } = useI18n();
  const next = locale === "pt" ? "en" : "pt";
  return (
    <button
      type="button"
      onClick={() => setLocale(next)}
      className={`inline-flex min-h-11 items-center rounded-full border border-hairline px-3 py-2 text-[10px] font-bold uppercase tracking-[0.2em] text-zincMuted transition-colors hover:border-champagne hover:text-champagne ${className}`}
      aria-label={t("common.language")}
    >
      {locale === "pt" ? "EN" : "PT"}
    </button>
  );
}

export function Panel({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={`rounded-[2rem] border border-hairline bg-charcoal ${className}`}>{children}</div>;
}

export function StatusPill({ children, tone = "gold" }: { children: ReactNode; tone?: "gold" | "green" | "rose" | "muted" }) {
  const tones = {
    gold: "border-champagne/40 bg-champagne/10 text-champagne",
    green: "border-emerald/30 bg-emerald/10 text-emerald",
    rose: "border-rose/40 bg-rose/10 text-rose",
    muted: "border-hairline bg-graphite text-zincMuted",
  };
  return (
    <span className={`inline-flex items-center rounded-full border px-3 py-1 text-[10px] font-bold uppercase tracking-widest ${tones[tone]}`}>
      {children}
    </span>
  );
}

export function LoadingBlock({ label }: { label: string }) {
  return (
    <div className="flex min-h-[40vh] items-center justify-center text-xs uppercase tracking-[0.3em] text-zincMuted">{label}</div>
  );
}

export function Footer() {
  const { t } = useI18n();
  return (
    <footer className="mt-16 border-t border-hairline p-6 pb-[max(1.5rem,env(safe-area-inset-bottom))] sm:p-8 md:mt-20 md:p-12">
      <div className="mx-auto flex max-w-[1600px] flex-col items-start justify-between gap-8 md:flex-row md:items-center">
        <div>
          <Wordmark compact />
          <p className="mt-4 max-w-xs text-xs text-zincMuted">{t("footer.blurb")}</p>
        </div>
        <div className="flex flex-wrap gap-x-6 gap-y-4">
          <TextLink href="/privacy">{t("footer.privacy")}</TextLink>
          <TextLink href="/terms">{t("footer.terms")}</TextLink>
          <TextLink href="/confidentiality">{t("footer.confidentiality")}</TextLink>
          <TextLink href="/contact">{t("footer.contact")}</TextLink>
        </div>
      </div>
    </footer>
  );
}

export function TextLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <Link href={href} className="text-[10px] uppercase tracking-[0.2em] text-zincMuted transition-colors hover:text-zincBright">
      {children}
    </Link>
  );
}

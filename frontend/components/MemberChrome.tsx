import Link from "next/link";
import { useRouter } from "next/router";
import { useState } from "react";
import { Bell, MagnifyingGlass, SignOut, List, X } from "@phosphor-icons/react";
import { useQueryClient } from "@tanstack/react-query";
import { LanguageButton, Wordmark } from "@/components/ui";
import { api } from "@/lib/api";
import { useI18n } from "@/lib/i18n";
import type { SessionUser } from "@/lib/types";

export function MemberChrome({
  user,
  query,
  onQuery,
  children,
}: {
  user: SessionUser;
  query?: string;
  onQuery?: (value: string) => void;
  children: React.ReactNode;
}) {
  const { t } = useI18n();
  const router = useRouter();
  const client = useQueryClient();
  const [open, setOpen] = useState(false);
  const [menu, setMenu] = useState(false);

  async function signOut() {
    await api("/api/auth/logout", { method: "POST" });
    await client.invalidateQueries({ queryKey: ["me"] });
    router.push("/");
  }

  return (
    <div className="min-h-screen bg-ink">
      <header className="sticky top-0 z-40 border-b border-hairline/60 bg-ink/90 pt-[env(safe-area-inset-top)] backdrop-blur-xl">
        <div className="flex h-16 items-center justify-between gap-3 px-4 md:h-24 md:px-8">
          <div className="flex min-w-0 items-center gap-6 lg:gap-12">
            <Link href="/catalog" aria-label="Personae" className="min-w-0">
              <Wordmark compact />
            </Link>
            <nav className="hidden items-center gap-8 lg:flex">
              <Link href="/catalog" className="text-xs font-medium uppercase tracking-[0.2em] text-champagne">
                {t("header.directory")}
              </Link>
              {user.role === "ADMIN" ? (
                <Link href="/admin" className="text-xs font-medium uppercase tracking-[0.2em] text-zincMuted transition-colors hover:text-zincBright">
                  {t("header.house")}
                </Link>
              ) : null}
            </nav>
          </div>
          <div className="flex shrink-0 items-center gap-2 sm:gap-3 md:gap-5">
            {onQuery ? (
              <label className="hidden items-center gap-3 rounded-full border border-hairline bg-graphite px-4 py-2 md:flex">
                <MagnifyingGlass className="text-zincMuted" />
                <input
                  value={query}
                  onChange={(event) => onQuery(event.target.value)}
                  placeholder={t("catalog.search")}
                  className="w-40 bg-transparent text-base text-zincBright outline-none placeholder:text-zincMuted lg:w-52"
                />
              </label>
            ) : null}
            <span className="hidden md:inline-flex">
              <LanguageButton />
            </span>
            <button
              type="button"
              onClick={() => setOpen((value) => !value)}
              className="relative hidden h-11 w-11 items-center justify-center rounded-full border border-hairline transition-colors hover:border-champagne sm:flex"
              aria-label={t("header.notices")}
            >
              <Bell />
              <span className="absolute right-0 top-0 h-2 w-2 rounded-full bg-champagne" />
            </button>
            <button type="button" onClick={() => setMenu((value) => !value)} className="hidden items-center gap-3 border-l border-hairline pl-5 lg:flex">
              <span className="hidden text-right md:block">
                <span className="block text-[10px] font-bold uppercase tracking-wider">{user.firstName}</span>
                <span className="block text-[9px] text-zincMuted">{user.memberCode}</span>
              </span>
              <span className="flex h-11 w-11 items-center justify-center rounded-full border border-hairline bg-graphite font-serif text-champagne">
                {user.firstName.slice(0, 1)}
              </span>
            </button>
            <button type="button" className="flex h-11 w-11 items-center justify-center rounded-full border border-hairline lg:hidden" onClick={() => setMenu((value) => !value)} aria-label="Menu">
              <List size={20} />
            </button>
          </div>
        </div>
      </header>
      {open ? (
        <div className="mx-auto max-w-[1600px] px-4 pt-4 md:px-8">
          <div className="rounded-3xl border border-hairline bg-charcoal p-5 sm:p-6">
            <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-champagne">{t("header.notices")}</p>
            <p className="mt-3 max-w-xl text-sm leading-relaxed text-zincMuted">{t("header.noticeBody")}</p>
          </div>
        </div>
      ) : null}
      {menu ? (
        <div className="fixed inset-0 z-50 bg-ink/70 lg:hidden" onClick={() => setMenu(false)}>
          <div
            className="ml-auto flex h-full w-[min(100%,20rem)] flex-col border-l border-hairline bg-charcoal px-4 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-[max(1rem,env(safe-area-inset-top))]"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-3 pb-4">
              <div className="min-w-0">
                <p className="px-2 pt-2 font-serif text-2xl italic">{user.firstName}</p>
                <p className="px-2 text-[10px] uppercase tracking-widest text-zincMuted">{user.memberCode}</p>
              </div>
              <button
                type="button"
                onClick={() => setMenu(false)}
                className="mt-1 flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-hairline text-zincBright"
                aria-label={t("header.close")}
              >
                <X size={18} />
              </button>
            </div>
            <Link href="/catalog" onClick={() => setMenu(false)} className="rounded-2xl px-4 py-4 text-sm text-zincBright">
              {t("header.directory")}
            </Link>
            {user.role === "ADMIN" ? (
              <Link href="/admin" onClick={() => setMenu(false)} className="rounded-2xl px-4 py-4 text-sm text-zincBright">
                {t("header.house")}
              </Link>
            ) : null}
            <button type="button" onClick={() => { setMenu(false); setOpen(true); }} className="flex items-center gap-2 rounded-2xl px-4 py-4 text-left text-sm text-zincBright sm:hidden">
              <Bell /> {t("header.notices")}
            </button>
            <div className="px-4 py-3 md:hidden">
              <LanguageButton />
            </div>
            <button type="button" onClick={signOut} className="mt-auto flex w-full items-center gap-2 rounded-2xl px-4 py-4 text-left text-sm text-rose">
              <SignOut /> {t("header.signOut")}
            </button>
          </div>
        </div>
      ) : null}
      {menu ? (
        <div className="mx-auto hidden max-w-[1600px] justify-end px-8 pt-3 lg:flex">
          <div className="w-56 rounded-3xl border border-hairline bg-charcoal p-3">
            <button type="button" onClick={signOut} className="flex w-full items-center gap-2 rounded-2xl px-4 py-3 text-left text-sm text-rose">
              <SignOut /> {t("header.signOut")}
            </button>
          </div>
        </div>
      ) : null}
      {children}
    </div>
  );
}

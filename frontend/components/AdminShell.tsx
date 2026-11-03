import Link from "next/link";
import { useRouter } from "next/router";
import {
  ChartLineUp,
  Gear,
  IdentificationCard,
  LinkSimple,
  ShieldCheck,
  SignOut,
  UsersThree,
} from "@phosphor-icons/react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { LanguageButton, Wordmark } from "@/components/ui";
import { api } from "@/lib/api";
import { useI18n } from "@/lib/i18n";
import type { SessionUser } from "@/lib/types";

const links = [
  { href: "/admin", key: "admin.overview", icon: ChartLineUp },
  { href: "/admin/members", key: "admin.members", icon: UsersThree },
  { href: "/admin/profiles", key: "admin.profiles", icon: IdentificationCard },
  { href: "/admin/links", key: "admin.links", icon: LinkSimple },
  { href: "/admin/activity", key: "admin.activity", icon: ShieldCheck },
  { href: "/admin/settings", key: "admin.settings", icon: Gear },
];

export function AdminShell({ user, title, children }: { user: SessionUser; title: string; children: React.ReactNode }) {
  const { t } = useI18n();
  const router = useRouter();
  const client = useQueryClient();
  const health = useQuery({
    queryKey: ["health"],
    queryFn: () => api<{ status: string }>("/api/health"),
    retry: false,
  });

  async function signOut() {
    await api("/api/auth/logout", { method: "POST" });
    await client.invalidateQueries({ queryKey: ["me"] });
    router.push("/");
  }

  const nav = (
    <nav className="space-y-2 p-4">
      {links.map((item) => {
        const active = item.href === "/admin" ? router.pathname === "/admin" : router.pathname.startsWith(item.href);
        const Icon = item.icon;
        return (
          <Link
            key={item.href}
            href={item.href}
            className={`flex items-center gap-3 rounded-xl px-4 py-3 text-sm transition-all ${
              active ? "border border-hairline bg-graphite text-champagne" : "text-zincMuted hover:bg-graphite/40 hover:text-white"
            }`}
          >
            <Icon className="text-lg" />
            {t(item.key)}
          </Link>
        );
      })}
    </nav>
  );

  return (
    <div className="min-h-screen bg-ink text-zincBright md:flex">
      <aside className="hidden h-screen w-[280px] shrink-0 flex-col border-r border-hairline bg-charcoal md:flex">
        <div className="border-b border-hairline/60 p-8">
          <Link href="/catalog">
            <Wordmark compact />
          </Link>
          <p className="mt-2 text-[9px] font-bold uppercase tracking-[0.3em] text-zincMuted">{t("admin.suite")}</p>
        </div>
        <div className="flex-1 overflow-y-auto">{nav}</div>
        <div className="border-t border-hairline/60 p-6">
          <p className="text-xs font-bold">{user.firstName}</p>
          <p className="text-[10px] text-zincMuted">{t("admin.super")}</p>
        </div>
      </aside>
      <div className="flex min-h-screen min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 border-b border-hairline/60 bg-charcoal/90 pt-[env(safe-area-inset-top)] backdrop-blur-md">
          <div className="flex h-16 items-center justify-between gap-3 px-4 md:h-20 md:px-8">
          <div className="flex min-w-0 items-center gap-3">
            <h2 className="truncate text-[10px] font-bold uppercase tracking-[0.22em] text-zincMuted md:text-xs md:tracking-[0.4em]">{title}</h2>
          </div>
          <div className="flex shrink-0 items-center gap-2 sm:gap-4">
            <LanguageButton />
            <div className="hidden items-center gap-2 rounded-full border border-hairline px-4 py-2 text-xs text-zincMuted sm:flex">
              <span className={`h-2 w-2 rounded-full ${health.isSuccess ? "animate-pulse bg-emerald" : "bg-rose"}`} />
              {health.isSuccess ? t("admin.healthy") : t("admin.offline")}
            </div>
            <button type="button" onClick={signOut} className="flex h-11 w-11 items-center justify-center text-rose md:w-auto md:text-xs md:font-bold md:uppercase md:tracking-widest" aria-label={t("admin.signOut")}>
              <SignOut className="md:hidden" />
              <span className="hidden md:inline">{t("admin.signOut")}</span>
            </button>
          </div>
          </div>
        </header>
        <div className="flex gap-2 overflow-x-auto border-b border-hairline bg-charcoal px-3 py-2 md:hidden">
          {links.map((item) => {
            const active = item.href === "/admin" ? router.pathname === "/admin" : router.pathname.startsWith(item.href);
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex shrink-0 items-center gap-2 rounded-full border px-3 py-2 text-[10px] font-bold uppercase tracking-widest ${
                  active ? "border-champagne text-champagne" : "border-hairline text-zincMuted"
                }`}
              >
                <Icon />
                {t(item.key)}
              </Link>
            );
          })}
        </div>
        <div className="flex-1 overflow-y-auto bg-ink p-4 pb-[max(1rem,env(safe-area-inset-bottom))] md:p-8">{children}</div>
      </div>
    </div>
  );
}

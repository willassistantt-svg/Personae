import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { Footer, Wordmark } from "@/components/ui";
import { LanguageButton } from "@/components/ui";
import { api } from "@/lib/api";
import { useI18n } from "@/lib/i18n";
import type { House } from "@/lib/types";

export function LegalContainer({ page }: { page: "privacy" | "terms" | "confidentiality" | "contact" }) {
  const { t } = useI18n();
  const house = useQuery({
    queryKey: ["public-house"],
    queryFn: () => api<House>("/api/public/house"),
    enabled: page === "contact",
  });
  const title = t(`legal.${page === "confidentiality" ? "conf" : page}Title`);
  const body = t(`legal.${page === "confidentiality" ? "conf" : page}`);
  return (
    <div className="min-h-screen bg-ink">
      <header className="flex items-center justify-between border-b border-hairline px-4 py-4 pt-[max(1rem,env(safe-area-inset-top))] sm:px-6 sm:py-6">
        <Link href="/">
          <Wordmark compact />
        </Link>
        <LanguageButton />
      </header>
      <main className="mx-auto max-w-3xl px-4 py-12 sm:px-6 sm:py-16">
        <h2 className="font-serif text-4xl italic sm:text-5xl">{title}</h2>
        <p className="mt-8 text-base leading-relaxed text-zincMuted sm:text-lg">{body}</p>
        {page === "contact" && house.data ? (
          <div className="mt-10 space-y-3 text-base text-champagne">
            <p><a className="break-all" href={`tel:${house.data.sitePhone}`}>{house.data.sitePhone}</a></p>
            <p><a className="break-all" href={`mailto:${house.data.siteEmail}`}>{house.data.siteEmail}</a></p>
          </div>
        ) : null}
      </main>
      <Footer />
    </div>
  );
}

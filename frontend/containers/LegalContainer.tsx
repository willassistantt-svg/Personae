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
      <header className="flex items-center justify-between border-b border-hairline px-6 py-6">
        <Link href="/">
          <Wordmark compact />
        </Link>
        <LanguageButton />
      </header>
      <main className="mx-auto max-w-3xl px-6 py-16">
        <h2 className="font-serif text-5xl italic">{title}</h2>
        <p className="mt-8 text-lg leading-relaxed text-zincMuted">{body}</p>
        {page === "contact" && house.data ? (
          <div className="mt-10 space-y-3 text-champagne">
            <p>{house.data.sitePhone}</p>
            <p>{house.data.siteEmail}</p>
          </div>
        ) : null}
      </main>
      <Footer />
    </div>
  );
}
